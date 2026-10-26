# Explicit-permission acceptance

Run `python3 tests/integration/supabase17/run.py` on a Docker Compose host.
Always clean up with `docker compose -f tests/integration/supabase17/compose.yml down --volumes --remove-orphans`.
The GitHub workflow does this even after failure. It has read-only repository
permissions and uses no repository secrets, managed projects or production keys.

This adapts the already accepted PostgreSQL 17.6/PostgREST v14.18 stack and HTTP
helpers from `EslamElshikh-dev/al-osairat-directory`, PR #144, commit
`4ed47e3a024b12b2848207469390cf7a576353aa`. The no-implicit-table/sequence-grant
model also matches the Naqada and Tawod acceptance tests. Sama Scan uses its own
opaque-session authentication; starting GoTrue would not verify its login flow.

The empty database installs the existing foundations `docs/supabase-auth.sql`
and `docs/supabase-crm.sql`, then every sorted `supabase/migrations/*.sql` file.
It preserves the existing SQL integration assertions at their original
checkpoints (`checkpoints.json`), including login, session expiry/revocation,
CRM, bookings, followups, referrals, approved content and contact/spend metrics.
New migrations are discovered automatically rather than silently skipped.

`permissions.sql` classifies all 19 application tables. It checks RLS, exact
server DML, private-schema boundaries, identity-sequence usage and public RPC
execution. `anon` and `authenticated` have no private-table access. The existing
`samascan_public_content()` RPC is the sole browser-readable exception, returning
approved display fields. A new table fails until explicitly classified. Missing
server grants, a browser grant, disabled RLS and an unclassified new table are
deliberately introduced inside rolled-back tests to prove the guard fails.

The HTTP checks exercise actual PostgREST with visitor/member/server JWTs and
custom application login, CRM writes, analytics ingestion, click-versus-contact
counts and logout. The existing `npm run test:crm` now replays every migration,
uses the same SQL contract, and independently verifies four failing mutations.

No application SQL, production privileges or historical migration timestamps
are changed. The two foundation scripts remain explicit prerequisites; this is
not a claim that the migrations directory alone is a complete `supabase db reset`.
Do not replay foundation/history against an existing production database.
Hosted gateways, hosted mail, actual production sign-in and browser UI remain
separate from this isolated PostgreSQL/PostgREST acceptance.
