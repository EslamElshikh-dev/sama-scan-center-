"""Replay the existing auth/CRM foundation and every ordered migration.

The existing transactional SQL cases run at their original checkpoints. This
adds real PostgreSQL 17/PostgREST boundaries without rewriting the application.
"""
import json
import secrets
import uuid
from pathlib import Path
from support import ROOT, check, finish, guard_self_tests, jwt, quote, replay, request, sql, start, start_rest


def main():
    start()
    replay("docs/supabase-auth.sql")
    password = secrets.token_urlsafe(24)
    sql("insert into samascan_auth.admins(username,password_hash) values('admin',"
        f"extensions.crypt({quote(password)},extensions.gen_salt('bf',4)));")
    replay("tests/supabase-auth.integration.sql")
    replay("docs/supabase-crm.sql")
    checkpoints = json.loads(Path(__file__).with_name("checkpoints.json").read_text())
    migrations = sorted((ROOT / "supabase/migrations").glob("*.sql"))
    check("every SQL checkpoint still names an existing migration", set(checkpoints) <= {p.name for p in migrations})
    for migration in migrations:
        replay(migration.relative_to(ROOT))
        for case in checkpoints.get(migration.name, []):
            replay(case)
    replay("tests/integration/supabase17/permissions.sql")
    guard_self_tests("samascan_crm.contacts")
    check("19 private tables rebuilt with RLS and exact per-role grants", sql(
        "select count(*)=19 and bool_and(rowsecurity) from pg_tables where schemaname like 'samascan_%';") == "t")
    check("SQL fixtures leave no customers or contact clicks", sql(
        "select (select count(*) from samascan_crm.contacts)=0 and (select count(*) from samascan_crm.contact_events)=0;") == "t")
    start_rest("rpc/samascan_public_content", {})
    service, member = jwt("service_role"), jwt("authenticated")
    for label, token in [("visitor", None), ("member with forged admin metadata", member)]:
        for name, args in [("samascan_admin_auth", {"action": "login", "candidate_username": "admin", "candidate_password": password}),
                           ("samascan_crm_api", {"session_token": "0" * 64, "action": "summary"}),
                           ("samascan_contact_event_intake", {"payload": {}})]:
            denied = request("rpc/" + name, args, token, (401, 403))
            check(label + " denied private RPC " + name, denied.get("code") == "42501")
        data = request("rpc/samascan_public_content", {}, token)
        check(label + " gets only approved public display fields", isinstance(data, list)
              and all(set(item) <= {"id", "kind", "data"} for item in data))
        hidden = request("contacts?select=id", token=token, expected=(406,), headers={"Accept-Profile": "samascan_crm"})
        check(label + " cannot expose private schema", hidden.get("code") == "PGRST106")

    auth_args = {"action": "login", "candidate_username": "admin", "candidate_password": password}
    login = request("rpc/samascan_admin_auth", auth_args, service)
    check("custom administrator login over real PostgREST", login.get("ok") is True and len(login.get("token", "")) == 64)
    session = login["token"]
    identity = request("rpc/samascan_admin_auth", {"action": "verify", "session_token": session}, service)
    check("opaque session identity verified by database", identity.get("ok") is True and identity.get("role") == "admin")
    forged = request("rpc/samascan_crm_api", {"session_token": "0" * 64, "action": "summary"}, service)
    check("service transport cannot substitute for application login", forged.get("code") == "credentials")
    contact_id = str(uuid.uuid4())
    contact = request("rpc/samascan_crm_api", {"session_token": session, "action": "save", "payload": {
        "entity": "contacts", "id": contact_id, "version": 0, "name": "Isolated acceptance", "phone": "0500000888", "source": "phone"}}, service)
    check("CRM save over actual HTTP with explicit grants", contact.get("ok") is True and contact["record"]["id"] == contact_id)
    summary = request("rpc/samascan_crm_api", {"session_token": session, "action": "summary"}, service)
    check("CRM summary over actual HTTP", summary.get("ok") is True)
    event = {"event_id": str(uuid.uuid4()), "session_id": str(uuid.uuid4()), "kind": "whatsapp", "cta": "acceptance",
             "page_path": "/services/mri-riyadh", "attribution": {"channel": "google_ads", "source": "google"}}
    check("contact analytics ingestion over actual HTTP", request("rpc/samascan_contact_event_intake", {"payload": event}, service).get("ok") is True)
    metrics = request("rpc/samascan_contact_api", {"session_token": session, "action": "contact_metrics"}, service)
    check("analytics distinguishes click from actual contact", metrics.get("ok") is True
          and metrics["data"]["metrics"]["whatsapp_clicks"] == 1 and metrics["data"]["metrics"]["confirmed_whatsapp"] == 0)
    request("rpc/samascan_admin_auth", {"action": "logout", "session_token": session}, service)
    revoked = request("rpc/samascan_crm_api", {"session_token": session, "action": "summary"}, service)
    check("logout revokes application access", revoked.get("code") == "credentials")
    finish()


if __name__ == "__main__":
    main()
