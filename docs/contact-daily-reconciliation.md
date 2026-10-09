# Daily received contacts

The Ads view in `/dashboard?view=ads` opens on the current Riyadh day. Quick filters select today, yesterday, the day before yesterday, or the last two completed days.

The daily report keeps three measurements separate:

- Website phone/WhatsApp button events measure clicks, not answered calls or received messages.
- Reception totals are an all-source daily checkpoint, entered after checking the phone and WhatsApp logs. A missing checkpoint is unknown, while an explicitly reviewed zero is zero.
- Individual CRM inquiries carry customer, acquisition-source, follow-up and booking details. They are compared with the checkpoint; the two counts are never added together.

Totals supplied by Islam are marked `user_report`. Reception revisions are marked `reception`. Recording a daily total never creates a customer or an inquiry, and unmatched totals have no confirmed Google Ads attribution. The first reported checkpoints are 2026-10-07 (5 calls, 7 WhatsApp) and 2026-10-08 (3 calls, 3 WhatsApp); these are seeded separately from the schema migration.

Only admin/reception users can save checkpoints. Marketing can read aggregate counts but cannot read reception notes or change the totals. The private table has RLS enabled and no anon/authenticated access. The service-only RPC validates the existing CRM session and limits reports and revisions to the last 90 days. Versions prevent concurrent edits from silently overwriting one another.

Actual incoming WhatsApp messages and calls are not automatically imported. That requires a connected WhatsApp Business Platform account and a compatible phone provider. Until those integrations exist, reception records each received contact through the existing contact form; a `SC-` reference can link a website event to an inquiry, and appointments remain linked through the existing booking flow.

Deploy the additive SQL migration before deploying `backend/samascan-crm/index.mjs`; the frontend uses that existing gateway. Validate with `npm run test:crm`, `npm run typecheck`, `npm run lint`, and `npm run build`.
