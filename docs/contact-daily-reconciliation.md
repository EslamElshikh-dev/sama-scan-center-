# Daily received contacts

The Ads view in `/dashboard?view=ads` opens on the current Riyadh day. Quick filters select today, yesterday, the day before yesterday, or the last two completed days.

The daily report keeps three measurements separate:

- Website phone/WhatsApp button events measure clicks, not answered calls or received messages.
- Reception totals are an all-source daily checkpoint, entered after checking the phone and WhatsApp logs. A missing checkpoint is unknown, while an explicitly reviewed zero is zero.
- Individual CRM inquiries carry customer, acquisition-source, follow-up and booking details. They are compared with the checkpoint; the two counts are never added together.

Totals supplied by Islam are marked `user_report`. Reception revisions are marked `reception`. Recording a daily total never creates a customer or an inquiry, and unmatched totals have no confirmed Google Ads attribution. The first reported checkpoints are 2026-10-07 (5 calls, 7 WhatsApp) and 2026-10-08 (3 calls, 3 WhatsApp); these are seeded separately from the schema migration.

Only admin/reception users can save checkpoints. Marketing can read aggregate counts but cannot read reception notes or change the totals. The private table has RLS enabled and no anon/authenticated access. The service-only RPC validates the existing CRM session and limits reports and revisions to the last 90 days. Versions prevent concurrent edits from silently overwriting one another.

Actual incoming WhatsApp messages and calls are not automatically imported. That requires a connected WhatsApp Business Platform account and a compatible phone provider. Until those integrations exist, reception records each received contact through the existing contact form; a `SC-` reference can link a website event to an inquiry, and appointments remain linked through the existing booking flow.

## Initial contact versus booking follow-up

The `booking_receipt_whatsapp` button follows up an already saved request. It keeps its request reference, website event and WhatsApp destination, but does not send another Google Ads WhatsApp acquisition event. Initial WhatsApp buttons still use the existing conversion action. Phone links and their existing conversion action are unchanged.

The GA4 `cta_click` event includes `contact_purpose`: `booking_followup` for either receipt button and `initial_contact` for other CTAs. Website contact-event totals still include follow-ups; inspect the existing `cta` field when separating acquisition from request follow-up. A follow-up click is not evidence of an extra inquiry or completed appointment.

In the reception view, record actual received conversations and calls after checking their logs, then link each inquiry to its appointment. Keep unreviewed daily totals unknown. Imported Ads costs are dated `ads_snapshot` observations, not a billing statement or a live feed; a complete cost period does not resolve missing inquiry/appointment attribution.

When connector reporting is unavailable, `docs/scripts/samascan-ads-readonly-audit.js` can be run inside the correct Google Ads account. It only reads that campaign and writes CSV text to the execution log. It does not create spreadsheets, send data to another service, or alter campaign settings. Review its selected dates and any truncation/error notice before using the output.

Deploy the additive SQL migration before deploying `backend/samascan-crm/index.mjs`; the frontend uses that existing gateway. Validate with `npm run test:crm`, `npm run typecheck`, `npm run lint`, and `npm run build`.
