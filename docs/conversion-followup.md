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
# نتيجة التواصل والقياس قبل التوسع

زر «تسجيل نتيجة» في قائمة الحالات يفتح نموذجًا يسجل ما حدث فعليًا، ثم يحفظ النتيجة والمتابعة القادمة معًا. زر إكمال المهمة المرتبطة بطلب في صفحة مهام الاستقبال يفتح النموذج نفسه. المهام الداخلية غير المرتبطة بطلب تحتفظ بالإكمال المعتاد.

- لم يرد أو طلب وقتًا: متابعة مستقبلية ومسؤول نشط من الاستقبال أو الإدارة، خلال السبت–الخميس 09:00–21:00 بتوقيت الرياض. لا تسجّل المكالمة حجزًا أو حضورًا.
- تم التواصل: وصف مختصر للنتيجة. الطلب المفتوح يحتاج متابعة قادمة، أو متابعة أخرى مستقبلية بمسؤول نشط، أو موعدًا قائمًا قبل إنهاء هذه المتابعة.
- رفض الاستكمال: وصف مختصر وإلغاء صريح للطلب الذي ليس له موعد قائم. الطلب ذو الموعد يُراجع من إدارة الموعد أولًا.
- إذا توجد متابعة أخرى مفتوحة، يمنع النموذج إضافة متابعة أخرى ويطلب مراجعتها. فشل التحقق لا يغلق المهمة الحالية ولا يسجل نتيجة جزئية.
- لا يعاد فتح محاولة مسجّلة بنتيجة، ولا تنقل إلى طلب آخر. أي تواصل لاحق يُسجّل كمهمة جديدة. نتيجة المتابعة ووصفها وتوقيتها محفوظة مستقلة عن ملاحظة المهمة الأصلية.

تقرير المصادر يعرض حالة واحدة لكل طلب من طلبات الفترة: بلا موعد، موعد مستقبلي، نتيجة موعد معلقة، حضور دون تسجيل فحص، فحص منفذ، آخر موعد لم يحضر، أو ملغي. عند إعادة الحجز يعرض الموعد المستقبلي في الحالة الحالية، وتبقى أعداد مواعيد عدم الحضور والإلغاء التاريخية في أعمدتها الأصلية. المواعيد غير المرتبطة لا تنسب لمصدر افتراضي.

نسبة تحويل «طلبات 7+ أيام» تخص طلبات الفترة التي مضى على تسجيلها سبعة أيام كاملة؛ الحد إرشادي واضح في الشاشة، وبعضها قد يكون موعده مستقبليًا. لا تثبت هذه النسبة وحدها استحقاق زيادة الإنفاق، ولا توفر تكلفة الفحص المكتسب أو إيراده. تصدير المقارنة يشمل كل صفوف البعد المختار، الفترة وتوقيت القياس، وأعداد الطلبات الأقدم والمواعيد المستقبلية والنتائج المعلقة. يحمي القيم النصية من تفسيرها كصيغ في برامج الجداول.

ملف الطبيب وتقرير الإحالات يعرضان الحضور وإجراء الفحص منفصلين. التسويق يرى نتائج الإحالات الإجمالية، ولا يملك سياق العملاء أو تسجيل نتائج التواصل معهم.

تُختبر الصلاحيات، التوقيت، اختلاف الطلب أو النسخة، إعادة الإرسال، بقاء أثر المحاولة، الفرق بين الحضور والفحص، تجزئة الطلبات دون تكرار وإعادة الحجز، في قاعدة اختبار معزولة تتراجع عن بياناتها. لا تُنشأ حالات تجريبية في قاعدة التشغيل.
