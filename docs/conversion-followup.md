# Conversion and followup operations

The reception queue is available in `/dashboard?view=today` and `/dashboard?view=crmreports`. It uses the existing authenticated CRM gateway. Admin and reception can read it and act on records; marketing cannot access patient data.

## Queue rules

- One row per inquiry or appointment; category counts overlap when a record has several flags. Pagination has eight records and a deterministic order. Overdue followups and unresolved appointment outcomes come first.
- Website intake remains pending until its existing intake task is closed. A scheduled appointment alone does not close the intake task; confirmation, attendance or completion does.
- Open inquiries without a linked open task have a missing-followup flag. An absent, inactive or unsuitable owner has a separate responsibility flag.
- An overdue task uses its recorded due time. A suggested new inquiry followup is 15 minutes later during the existing Saturday–Thursday 09:00–21:00 reception hours. Outside hours and on Fridays, it moves to the next opening. These are suggested deadlines, not a promise to patients.
- A past scheduled/confirmed appointment needs its outcome recorded by reception. The queue never infers attendance from time passing.
- Appointments without an inquiry are shown separately, including future bookings, so reception can review attribution before the appointment.
- Recovery reviews apply to cancellation/no-show records updated within the last 30 days, without an active rebooking or a completed linked review since the cancellation. A rebooked appointment is not a lost lead. The queue sends no messages and makes no outcome changes.

## Explicit appointment attachment

Reception can attach an appointment without an inquiry to a documented request for the same contact and exact exam name. The selector shows matching exams among the contact's latest 50 requests. The RPC validates both records, checks the appointment version, locks concurrent changes, preserves one active booking per inquiry, and rejects reassignment of an already linked appointment. Only the association, record versions and synchronized request stage change; the appointment's recorded outcome and time are preserved. The audit records both attachment and stage synchronization.

Do not create an invented historic request or select an unrelated inquiry to fill a reporting gap. If there is no documented originating request, leave the appointment outside source-cohort measurement.

## Physician outcomes

The existing physician report and CSV now include completed examinations separately from attendance. Both require a recorded appointment outcome and a start time that has passed. Each originating inquiry is counted at most once, including no-shows and rebookings. Report totals respect filters and all matching records, not only the displayed page. Completed examinations sort first. Marketing receives the existing aggregate physician report, with no patient identities or contact data.

## Release and verification

Apply the `conversion_followup_queue` migration, deploy the updated existing `samascan-crm` Edge Function with its existing custom-auth configuration, then deploy the Next.js application. No new credentials or third-party permissions are introduced.

`npm run test:crm` includes rolled-back Postgres fixtures for queue categories, recovery after rebooking, explicit attachment, authorization, optimistic concurrency, aggregate examination counts and pagination. Run typecheck, lint and production build before release. The fixture suite runs locally; no live patient record is edited by testing.
