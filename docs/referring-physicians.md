# Referring physicians and marketing visits

Three operational views are available in the dashboard:

- `/dashboard?view=physicians`: professional contacts, specialty, institution, district, business phone, assigned owner, archive status, last visit and next open followup.
- `/dashboard?view=physicianvisits`: actual visits, outcome, notes and followup date/status. Planned future work is a followup, not a completed visit.
- `/dashboard?view=physicianreports`: date-bounded inquiry cohort, unique bookings/attendance, visits, dormant relationships and CSV export of the displayed page.

Reception links a doctor when creating or editing an inquiry with source **إحالة**. Unknown or archived doctors cannot receive new attributions. Existing links and visit histories survive archive. Referrals without a doctor are reported separately. A doctor identity is name + institution + specialty; several doctors may share a clinic phone number.

## Authorization

| Role | Patient CRM | Physician labels for inquiries | Physician directory and aggregate reports | Write permissions |
| --- | --- | --- | --- | --- |
| Admin | Full | Yes | Full | Assign owners, maintain any doctor and visit |
| Reception | Contacts, inquiries, appointments, tasks and source reports | ID, name, specialty, institution, active status only | No | Attribute inquiries; cannot read marketing notes or visits |
| Marketing | No | Yes | Business contacts, visits and aggregate outcomes | Create records owned by self, edit own/unassigned doctor, edit own visits |

Marketing may read professional visit history across the team. Editing another owner's records is denied by the database, even if the client submits a forged owner. Management can reassign physician relationships and visits. Marketing cannot archive or edit a doctor owned by another employee. The admin audit includes physician and visit operations.

## Counting rules

- Referral, booked and attended counts use the inquiry's creation date in Asia/Riyadh. Every inquiry is counted at most once per metric, including cancelled and rescheduled appointments.
- A booked inquiry has an appointment whose status is neither cancelled nor no-show.
- Attendance requires an attended/completed appointment whose scheduled start has passed.
- Visits use the actual visit date, independently of the inquiry cohort. Reports do not claim that a visit caused a referral.
- Dormant means the doctor previously had a recorded referral, but none since the selected 30/60/90-day cutoff. Never-referring doctors and archived records have separate statuses. Relationship status uses all-time history as of now, not only the selected report period.
- Report totals follow search and status filters. CSV includes the displayed page (50 rows maximum), Arabic UTF-8 BOM, quoted cells and spreadsheet formula neutralization. It can be opened in Excel; it is not a native XLSX workbook.

## Installation and release

Apply migrations in order after the existing auth and CRM bootstraps:

1. `20260930161859_samascan_customer_journey.sql`
2. `20260930170549_customer_task_link_index.sql`
3. `20261001180612_physician_referrals.sql`

Deploy `backend/samascan-crm/index.mjs` to the existing `samascan-crm` Edge Function, then deploy the Next.js app. Existing custom session authentication remains enabled, with publishable-key validation in the Edge Function and active-user authorization in both SQL RPCs. The existing `verify_jwt=false` setting is preserved for this custom auth path.

Patient and physician tables have RLS enabled, with schema/table access revoked from PUBLIC, anon and authenticated. The invoker RPCs can execute only as service_role, which is held exclusively by the Edge runtime. The HTTP gateway sends safe codes, uses bounded inputs and private/no-store caching, and never logs tokens or database errors.

Run `npm run test:crm`, `npm run typecheck`, `npm run lint` and `npm run build`. SQL tests use an isolated PGlite/Postgres instance with rolled-back fixtures. No live patient data or login credentials are present in the fixtures.

This release does not enable Google live synchronization, automatic SMS/WhatsApp sends, new paid backup services or physical separation from the existing shared Supabase project. Those require independently configured accounts, providers and infrastructure.
