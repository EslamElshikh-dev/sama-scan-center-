"""Adapted from al-osairat-directory PR #144, commit 4ed47e3.

Disposable PostgreSQL 17.6/PostgREST acceptance helpers. No managed credentials,
projects or production connections. These applications use custom opaque
sessions, so GoTrue would test a different login mechanism and is not started.
"""
import base64
import hashlib
import hmac
import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMPOSE = ["docker", "compose", "-f", str(Path(__file__).with_name("compose.yml"))]
JWT_SECRET = b"isolated-permissions-acceptance-never-production-20261026"
RESULTS = []


def sql(query):
    return subprocess.run([*COMPOSE, "exec", "-T", "db", "psql", "-U", "postgres", "-d", "postgres",
        "-v", "ON_ERROR_STOP=1", "-At"], input=query, text=True, capture_output=True, check=True).stdout.strip()


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    RESULTS.append(name)
    print("PASS " + name, flush=True)


def jwt(role):
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).rstrip(b"=")
    claims = {"role": role, "iss": "supabase", "iat": int(time.time()), "exp": int(time.time()) + 3600}
    if role == "authenticated":
        claims.update(sub="00000000-0000-4000-8000-000000000001", user_metadata={"role": "admin", "is_admin": True})
    unsigned = encode({"alg": "HS256", "typ": "JWT"}) + b"." + encode(claims)
    sig = base64.urlsafe_b64encode(hmac.new(JWT_SECRET, unsigned, hashlib.sha256).digest()).rstrip(b"=")
    return (unsigned + b"." + sig).decode()


def request(path, data=None, token=None, expected=(200,), headers=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
    if headers:
        h.update(headers)
    req = urllib.request.Request("http://127.0.0.1:13000/" + path,
        method="GET" if data is None else "POST", headers=h,
        data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    body = json.loads(raw) if raw else None
    if status not in expected:
        code = body.get("code") if isinstance(body, dict) else None
        raise AssertionError(f"{path}: HTTP {status}, code {code}; expected {expected}")
    return body


def ready(path, data, token=None):
    for _ in range(60):
        try:
            request(path, data, token)
            return
        except (OSError, AssertionError):
            time.sleep(1)
    raise RuntimeError("PostgREST did not become ready")


def start():
    subprocess.run([*COMPOSE, "up", "-d", "--wait", "db"], check=True)
    check("real PostgreSQL 17.6", sql("show server_version;").startswith("17.6"))
    sql((Path(__file__).with_name("bootstrap.sql")).read_text())
    check("empty application schema", sql("select count(*) from pg_tables where schemaname='public';") == "0")


def replay(path):
    try:
        sql((ROOT / path).read_text())
    except subprocess.CalledProcessError as error:
        raise RuntimeError(f"{path}: {error.stderr}") from error
    check("replay " + str(path), True)


def start_rest(path, data, token=None):
    subprocess.run([*COMPOSE, "up", "-d", "rest"], check=True)
    ready(path, data, token)


def guard_self_tests(table):
    contract = Path(__file__).with_name("permissions.sql").read_text()
    for name, change in [
        ("missing server grant", f"revoke select on {table} from service_role;"),
        ("unneeded browser grant", f"grant select on {table} to anon;"),
        ("disabled RLS", f"alter table {table} disable row level security;"),
        ("unclassified future table", "create table public.unclassified_future_table(id bigint);"),
    ]:
        # psql exits on the expected assertion; disconnect rolls the transaction
        # back. Even a broken assertion that unexpectedly passes reaches ROLLBACK.
        try:
            sql("\\set VERBOSITY verbose\nbegin;\n" + change + "\n" + contract + "\nrollback;")
        except subprocess.CalledProcessError as error:
            check("contract rejects " + name, "P0004" in error.stderr)
        else:
            raise AssertionError("Permission contract failed to detect " + name)
    sql(contract)


def finish():
    print(json.dumps({"passed": len(RESULTS), "checks": RESULTS}), flush=True)
