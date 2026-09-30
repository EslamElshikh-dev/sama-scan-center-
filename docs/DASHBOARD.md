# Sama Scan dashboard on Vercel

Production path: https://samascan.vercel.app/dashboard

The public medical website remains under `app/(site)`. The private Arabic dashboard has its own layout and style, and uses the center's established administrator login.

## Authentication

The `admin` account authenticates through the `samascan-admin` Supabase Edge Function and its dedicated `samascan_auth` schema. The service stores bcrypt password verifiers, opaque session digests and rate-limit state; it never shares directory tables or accounts. Sessions expire after eight hours. The browser receives a Secure, HttpOnly, SameSite=Lax cookie. Logout revokes the session and clears the cookie. Cross-origin login and logout requests are rejected. No password or secret is committed to Git.

## Report data

`lib/dashboard/snapshot.ts` contains the values from the center's administrative report issued 29 September 2026. Google Business Profile compares two complete 32-day periods: 25 July–25 August and 26 August–26 September. Search Console values run through 29 September, and the weekly search comparison uses two complete weeks. The separate Google Business Profile review provides the nine September profile chat clicks; it does not measure website WhatsApp clicks. The UI displays source dates instead of requesting fresh provider data. Historic values are not presented as live analytics.

The former Windsor OAuth connection, refresh calls, publishing routes and provider storage workflow were removed. The publishing screen is a visual distribution preview with a local image preview and a copy-text action. It does not upload images or send social posts. The campaign screen expresses planned goals, not measured ad outcomes. Competitor cards cite their own public websites; their layout is not a ranking or private-performance comparison.

The overview offers direct preview cards for all seven other sections, and the sidebar groups them by performance and growth. The greeting is attached to the header notification bell; it closes automatically 45 seconds after the dashboard loads. The footer credits the developer, engineer Eslam Elshikh.

## Validation

Run `npm run lint`, `npm run build`, and inspect the authenticated dashboard at desktop and mobile sizes. The private route must redirect anonymous visitors to login. Verify login and logout without sending social content.

## CRM v1 · September 30, 2026

The default administrator/reception view is now the operational CRM. Marketing accounts open the historical marketing summary. View URLs use `/dashboard?view=contacts` (also `today`, `inquiries`, `appointments`, `followups`, `crmreports`, `team`), with browser back/forward support. The existing charts, publishing preview, greeting and developer signature are retained.

CRM records are persistent in the private `samascan_crm` schema:

- Contacts: normalized unique phone, acquisition source, administrative notes, archive/reactivate.
- Inquiries: contact, exam, source, owner, stage. A linked appointment controls booking/attendance stages.
- Appointments: start/end in Riyadh time, resource, status. Same-resource overlaps are serialized and rejected. Day and seven-day views; requests can be booked directly from the inquiry list.
- Follow-ups: contact (optional), due time, assigned staff, priority and completion state.
- Team: admin can create accounts, assign roles, suspend accounts and reset passwords. Password hashes never leave the database; staff changes revoke existing sessions.
- Audit: each successful mutation records actor, operation, entity, record identifier and time, without copying patient notes or phone numbers.

The home and CRM reports aggregate actual persisted records. No sample customers or appointments are seeded. Lists have server-side filtering and pagination of 50 records; contact detail shows the most recent 50 entries per category. The dashboard refreshes every minute. Edits use optimistic versions, and stale edits are rejected. Failed writes do not show a success message. Phone and WhatsApp buttons open external calling/chat applications; they do not send messages automatically.

### Authorization and storage boundary

`docs/supabase-crm.sql` is the consolidated schema upgrade after the original authentication setup. Production migrations are `samascan_crm_v1`, `samascan_crm_query_scope` and `samascan_crm_booking_reconciliation`. `samascan-admin` retains the original administrator account and adds independent admin/reception/marketing accounts. Rate limiting uses per-user and global buckets.

`/api/dashboard/crm` requires a same-origin POST plus an opaque Secure HttpOnly session cookie. It forwards only to the fixed `samascan-crm` Edge Function. The gateway validates the public project key, request size, action and token shape, then calls `public.samascan_crm_api` with its private service key. That SECURITY INVOKER RPC validates the live session, account state and role for every read and write. RPC execution and schema/table grants are revoked from PUBLIC, anon and authenticated. RLS is enabled with default-deny on all private tables; no direct client access is intended. Admins and reception staff can work with CRM; marketing cannot read any CRM rows, aggregate reports, team directory or audit. Only administrators may manage the team or read the audit. No unrelated directory schema is modified.

The Supabase advisor reports only the expected informational [RLS enabled with no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) findings for these private service-only tables. Do not add generic authenticated access to silence them.

### CRM verification

- `node --test tests/dashboard-session.test.mjs tests/crm-gateway.test.mjs`
- `tests/supabase-crm.integration.sql` verifies the workflow, phone normalization, conflicts, overlapping bookings, role boundaries, search/filtering, contact history, audit and session revocation. All fixtures are wrapped in a transaction and rolled back.
- `npm run lint` and `npm run build`.

This version covers contact/booking operations, not clinical reports, radiology images, billing, insurance claims or automated WhatsApp/social delivery.

Verification environment note: the local production server and native HTTP tests work. Chromium cannot start in this executor because its process-singleton socket is denied (`Operation not permitted`); agent-browser and a direct Playwright launch both fail before rendering. Desktop/mobile visual verification remains outstanding. No authentication bypass or public preview of CRM data was added.


## Studio design refresh · September 30, 2026

The dashboard now shares a navy/teal visual system across CRM and marketing. Grouped sidebar routes have category icons and active markers. Contextual route ribbons, a role-filtered search palette (Ctrl/Cmd+K) and a five-action mobile dock provide direct navigation. The home page includes a branded care illustration, quick-create actions, linked live KPI cards, richer empty states and seven-day chart totals. Forms, tables, headers and the developer footer use matching spacing and surfaces. Decorative motion is subtle and respects reduced-motion preferences.

Authentication, role boundaries, data sources and record mutations are unchanged. The refresh adds no sample records, publishing connections or new dependencies. Validation includes TypeScript, lint, a production build and authenticated HTTP checks. Authenticated desktop/mobile browser rendering remains unverified because of the executor browser restriction documented above.
