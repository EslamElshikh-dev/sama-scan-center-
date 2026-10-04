begin;
set local role service_role;
do $$
declare
 token text:=encode(extensions.gen_random_bytes(32),'hex'); marketing_token text:=encode(extensions.gen_random_bytes(32),'hex');
 person uuid; other_person uuid; fresh uuid; late uuid; intake uuid; unresolved uuid; legacy uuid; recovery uuid; failed uuid;
 linked_request uuid; wrong_exam uuid; physician uuid; referral_one uuid; referral_two uuid; duplicate_legacy uuid;
 r jsonb; row_data jsonb; before_count integer; original_start timestamptz; first_page jsonb;
 today date:=(now() at time zone 'Asia/Riyadh')::date;
begin
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(token,'sha256'),'admin',now()+interval '10 minutes');
 insert into samascan_auth.admins(username,password_hash,display_name,role) values('queue_marketing','unused-test-hash','اختبار التسويق','marketing');
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(marketing_token,'sha256'),'queue_marketing',now()+interval '10 minutes');
 r:=public.samascan_conversion_api(token,'conversion_queue','{}');
 assert r->>'ok'='true' and (r->'data'->'counts'->>'all')::int=0,'empty queue has actual zero counts';
 assert public.samascan_conversion_api('bad','conversion_queue','{}')->>'code'='credentials','session required';
 assert public.samascan_conversion_api(marketing_token,'conversion_queue','{}')->>'code'='forbidden','marketing cannot see patient queue';
 assert public.samascan_conversion_api(marketing_token,'link_appointment','{}')->>'code'='forbidden','marketing cannot attach patient records';
 assert public.samascan_conversion_api(token,'conversion_queue','{"bucket":"unknown"}')->>'code'='invalid','unknown bucket rejected';
 assert not has_function_privilege('anon','public.samascan_conversion_api(text,text,jsonb)','EXECUTE'),'anon cannot execute';
 assert not has_function_privilege('authenticated','public.samascan_conversion_api(text,text,jsonb)','EXECUTE'),'authenticated cannot bypass custom session';
 insert into samascan_crm.contacts(name,phone,source) values('عميل اختبار','+966500000081','phone') returning id into person;
 insert into samascan_crm.contacts(name,phone,source) values('عميل آخر','+966500000082','whatsapp') returning id into other_person;
 insert into samascan_crm.inquiries(contact_id,exam,source) values(person,'سونار','phone') returning id into fresh;
 insert into samascan_crm.inquiries(contact_id,exam,source,owner) values(person,'دوبلر','phone','admin') returning id into late;
 insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner) values
  (person,late,'متابعة متأخرة',now()-interval '1 hour','admin'),(person,late,'متابعة قادمة',now()+interval '1 day','admin');
 insert into samascan_crm.inquiries(contact_id,exam,source,owner,booking_reference) values(person,'سونار','google','admin','SS-000000000081') returning id into intake;
 insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner,kind) values(person,intake,'طلب الموقع',now()+interval '15 minutes','admin','website_intake');
 insert into samascan_crm.inquiries(contact_id,exam,source,stage,owner) values(person,'رنين مغناطيسي','phone','booked','admin') returning id into unresolved;
 insert into samascan_crm.appointments(contact_id,inquiry_id,exam,resource,starts_at,ends_at) values(person,unresolved,'رنين مغناطيسي','MRI',now()-interval '2 hours',now()-interval '90 minutes');
 insert into samascan_crm.appointments(contact_id,exam,resource,starts_at,ends_at,status) values(person,'سونار','US',now()-interval '4 hours',now()-interval '210 minutes','completed') returning id,starts_at into legacy,original_start;
 insert into samascan_crm.inquiries(contact_id,exam,source,stage,owner) values(person,'سونار','phone','cancelled','admin') returning id into recovery;
 insert into samascan_crm.appointments(contact_id,inquiry_id,exam,resource,starts_at,ends_at,status) values(person,recovery,'سونار','US',now()-interval '5 hours',now()-interval '270 minutes','cancelled') returning id into failed;
 r:=public.samascan_conversion_api(token,'conversion_queue','{}');
 assert (r->'data'->>'total')::int=6,'one row per record despite overlapping flags and two tasks';
 assert (r->'data'->'counts'->>'all')::int=6 and (r->'data'->'counts'->>'no_followup')::int=1 and (r->'data'->'counts'->>'unassigned')::int=1,'distinct queue counts';
 assert (r->'data'->'counts'->>'overdue')::int=1 and (r->'data'->'counts'->>'intake')::int=1,'overdue follows due time, not patient request age';
 assert (r->'data'->'counts'->>'unresolved')::int=1 and (r->'data'->'counts'->>'unlinked')::int=1 and (r->'data'->'counts'->>'recovery')::int=1,'outcome, attribution and recovery gaps separate';
 assert r->'data'->'rows'->0->'flags' ? 'overdue','overdue followup takes first priority';
 r:=public.samascan_conversion_api(token,'conversion_queue','{"bucket":"overdue"}');
 assert (r->'data'->>'total')::int=1 and r->'data'->'rows'->0->'nextTask'->>'title'='متابعة متأخرة','nearest overdue task carries its editable version';
 -- Scheduled website bookings still need their existing intake task until confirmed.
 insert into samascan_crm.appointments(contact_id,inquiry_id,exam,resource,starts_at,ends_at) values(person,intake,'سونار','US',now()+interval '1 day',now()+interval '1 day 30 minutes');
 update samascan_crm.inquiries set stage='booked' where id=intake;
 r:=public.samascan_conversion_api(token,'conversion_queue','{"bucket":"intake"}'); assert (r->'data'->>'total')::int=1,'scheduled is not confirmed intake';
 update samascan_crm.appointments set status='confirmed' where inquiry_id=intake;
 r:=public.samascan_conversion_api(token,'conversion_queue','{"bucket":"intake"}'); assert (r->'data'->>'total')::int=0,'confirmation closes intake followup';
 -- A completed review and an actual rebooking clear recovery independently.
 insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner,status,completed_at) values(person,recovery,'مراجعة الإلغاء',now(),'admin','done',now());
 r:=public.samascan_conversion_api(token,'conversion_queue','{"bucket":"recovery"}');assert (r->'data'->>'total')::int=0,'completed review removes recovery flag';
 update samascan_crm.tasks set completed_at=now()-interval '1 day' where inquiry_id=recovery;
 insert into samascan_crm.appointments(contact_id,inquiry_id,exam,resource,starts_at,ends_at) values(person,recovery,'سونار','US',now()+interval '2 days',now()+interval '2 days 30 minutes');
 update samascan_crm.inquiries set stage='booked' where id=recovery;
 insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner) values(person,recovery,'تأكيد الموعد الجديد',now()+interval '1 day','admin');
 r:=public.samascan_conversion_api(token,'conversion_queue','{"bucket":"recovery"}');assert (r->'data'->>'total')::int=0,'rebooking removes old cancellation from recovery';
 -- Explicit attribution rejects a different patient/exam and stale versions.
 insert into samascan_crm.inquiries(contact_id,exam,source,owner) values(other_person,'سونار','whatsapp','admin') returning id into linked_request;
 r:=public.samascan_conversion_api(token,'link_appointment',jsonb_build_object('id',legacy,'version',1,'inquiry_id',linked_request));assert r->>'code'='invalid','cannot attach another patient';
 insert into samascan_crm.inquiries(contact_id,exam,source,owner) values(person,'دوبلر','phone','admin') returning id into wrong_exam;
 r:=public.samascan_conversion_api(token,'link_appointment',jsonb_build_object('id',legacy,'version',1,'inquiry_id',wrong_exam));assert r->>'code'='invalid','cannot attach another exam';
 r:=public.samascan_conversion_api(token,'link_appointment',jsonb_build_object('id',legacy,'version',99,'inquiry_id',fresh));assert r->>'code'='conflict','stale attachment rejected';
 select count(*) into before_count from samascan_crm.audit;
 r:=public.samascan_conversion_api(token,'link_appointment',jsonb_build_object('id',legacy,'version',1,'inquiry_id',fresh));assert r->>'ok'='true','matching documented inquiry attached';
 assert (select inquiry_id=fresh and status='completed' and starts_at=original_start and version=2 from samascan_crm.appointments where id=legacy),'only attribution and version change';
 assert (select stage='completed' from samascan_crm.inquiries where id=fresh),'request outcome synchronized';
 assert (select count(*) from samascan_crm.audit)=before_count+2,'attachment and request sync audited';
 r:=public.samascan_conversion_api(token,'link_appointment',jsonb_build_object('id',legacy,'version',2,'inquiry_id',fresh));assert r->>'code'='invalid','linked attribution cannot be reassigned';
 insert into samascan_crm.appointments(contact_id,exam,resource,starts_at,ends_at,status) values(person,'سونار','US',now()-interval '6 hours',now()-interval '330 minutes','completed') returning id into duplicate_legacy;
 r:=public.samascan_conversion_api(token,'link_appointment',jsonb_build_object('id',duplicate_legacy,'version',1,'inquiry_id',fresh));assert r->>'code'='duplicate','one active booking per request still enforced';
 assert (select inquiry_id is null and version=1 from samascan_crm.appointments where id=duplicate_legacy),'failed attachment atomic';
 -- Referral attendance is not a completed scan; rescheduling does not double count.
 insert into samascan_referrals.physicians(name,specialty,institution,institution_kind,owner) values('طبيب اختبار','عظام','عيادة اختبار','clinic','admin') returning id into physician;
 insert into samascan_crm.inquiries(contact_id,exam,source,stage,owner,referring_physician_id) values(person,'سونار','referral','attended','admin',physician) returning id into referral_one;
 insert into samascan_crm.inquiries(contact_id,exam,source,stage,owner,referring_physician_id) values(person,'سونار','referral','completed','admin',physician) returning id into referral_two;
 insert into samascan_crm.appointments(contact_id,inquiry_id,exam,resource,starts_at,ends_at,status) values
  (person,referral_one,'سونار','US',now()-interval '7 hours',now()-interval '390 minutes','attended'),
  (person,referral_two,'سونار','US',now()-interval '8 hours',now()-interval '450 minutes','no_show'),
  (person,referral_two,'سونار','US',now()-interval '9 hours',now()-interval '510 minutes','completed');
 r:=public.samascan_referral_api(token,'physician_report',jsonb_build_object('from',today,'to',today));row_data:=r->'data'->'rows'->0;
 assert (row_data->>'referrals')::int=2 and (row_data->>'attended')::int=2 and (row_data->>'completed')::int=1,'referral reports separate attendance and completed scans';
 assert (r->'data'->'totals'->>'completed')::int=1,'report aggregate matches completion';
 r:=public.samascan_referral_api(marketing_token,'physician_report',jsonb_build_object('from',today,'to',today));assert r->>'ok'='true' and not (r->'data'->'rows'->0 ? 'phone'),'marketing receives aggregate outcomes only';
 -- Pagination is bounded and does not repeat rows between pages.
 for i in 1..10 loop insert into samascan_crm.inquiries(contact_id,exam,source,owner) values(person,'سونار','phone','admin');end loop;
 first_page:=public.samascan_conversion_api(token,'conversion_queue','{"bucket":"no_followup"}')->'data'->'rows';
 r:=public.samascan_conversion_api(token,'conversion_queue','{"bucket":"no_followup","page":2}');
 assert jsonb_array_length(first_page)=8 and jsonb_array_length(r->'data'->'rows')>0,'bounded operational pages';
 assert not exists(select 1 from jsonb_array_elements(first_page)a join jsonb_array_elements(r->'data'->'rows')b on a->'record'->>'id'=b->'record'->>'id'),'no repeated rows on next page';
end $$;
rollback;
