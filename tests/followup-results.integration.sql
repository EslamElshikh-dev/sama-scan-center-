begin;
set local role service_role;
do $$
declare
 token text:=encode(extensions.gen_random_bytes(32),'hex'); marketing_token text:=encode(extensions.gen_random_bytes(32),'hex');
 person uuid; request_id uuid; task_id uuid; wrong_request uuid; wrong_task uuid; planned_task uuid; booking_request uuid; booking_task uuid; fresh_request uuid;
 r jsonb; payload jsonb; next_task uuid; task_count int; audit_count int; due_local timestamp; due_time timestamptz; friday_time timestamptz;
begin
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(token,'sha256'),'admin',now()+interval '10 minutes');
 insert into samascan_auth.admins(username,password_hash,role) values('result_marketing','unused-test-hash','marketing');
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(marketing_token,'sha256'),'result_marketing',now()+interval '10 minutes');
 due_local:=date_trunc('day',now() at time zone 'Asia/Riyadh')+interval '1 day 9 hours';
 if extract(dow from due_local)=5 then due_local:=due_local+interval '1 day';end if;
 due_time:=due_local at time zone 'Asia/Riyadh';
 friday_time:=(due_local+((5-extract(dow from due_local)::int+7)%7)*interval '1 day') at time zone 'Asia/Riyadh';
 insert into samascan_crm.contacts(name,phone,source) values('تجربة متابعة','+966500000091','phone') returning id into person;
 insert into samascan_crm.inquiries(contact_id,exam,source,owner) values(person,'سونار','phone','admin') returning id into request_id;
 insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner,kind,note) values(person,request_id,'تأكيد طلب الموقع',now()-interval '1 hour','admin','website_intake','ملاحظة المهمة الأصلية') returning id into task_id;
 payload:=jsonb_build_object('inquiry_id',request_id,'inquiry_version',1,'task_id',task_id,'task_version',1,'outcome','no_answer','next_step','followup','next_due_at',due_time,'owner','admin');
 assert public.samascan_followup_api(null,'record_followup',payload)->>'code'='credentials','authentication required';
 assert public.samascan_followup_api(marketing_token,'record_followup',payload)->>'code'='forbidden','marketing cannot record patient calls';
 assert public.samascan_followup_api(marketing_token,'followup_context',jsonb_build_object('task_id',task_id))->>'code'='forbidden','marketing cannot fetch patient context';
 assert not has_function_privilege('anon','public.samascan_followup_api(text,text,jsonb)','EXECUTE'),'anonymous cannot execute';
 assert not has_function_privilege('authenticated','public.samascan_followup_api(text,text,jsonb)','EXECUTE'),'authenticated cannot bypass application session';
 r:=public.samascan_followup_api(token,'followup_context',jsonb_build_object('task_id',task_id));
 assert r->>'ok'='true' and r->'data'->'inquiry'->>'contact_name'='تجربة متابعة' and r->'data'->'task'->>'id'=task_id::text,'context is the linked request and current task';
 assert public.samascan_followup_api(token,'record_followup',payload||'{"inquiry_version":99}')->>'code'='conflict','request version checked';
 assert public.samascan_followup_api(token,'record_followup',payload||'{"task_version":99}')->>'code'='conflict','task version checked';
 assert public.samascan_followup_api(token,'record_followup',payload||jsonb_build_object('next_due_at',friday_time))->>'code'='followup_time','Friday is closed';
 assert public.samascan_followup_api(token,'record_followup',payload||jsonb_build_object('next_due_at',due_time-interval '1 hour'))->>'code'='followup_time','before opening rejected';
 assert public.samascan_followup_api(token,'record_followup',payload||jsonb_build_object('next_due_at',now()-interval '1 hour'))->>'code'='followup_time','past followup rejected';
 assert public.samascan_followup_api(token,'record_followup',payload||'{"owner":"result_marketing"}')->>'code'='invalid','followup owner must be active reception or administration';
 assert public.samascan_followup_api(token,'record_followup',payload||'{"outcome":"reached","outcome_note":"تم التواصل","next_step":"done"}')->>'code'='next_required','open request cannot lose its next step';
 insert into samascan_crm.inquiries(contact_id,exam,source,owner) values(person,'دوبلر','phone','admin') returning id into wrong_request;
 insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner) values(person,wrong_request,'متابعة أخرى',due_time,'admin') returning id into wrong_task;
 assert public.samascan_followup_api(token,'record_followup',payload||jsonb_build_object('task_id',wrong_task))->>'code'='invalid','another request task rejected';
 select count(*) into audit_count from samascan_crm.audit;
 r:=public.samascan_followup_api(token,'record_followup',payload);
 assert r->>'ok'='true','no answer and next step committed together';next_task:=(r->'data'->'next_task'->>'id')::uuid;
 assert (select status='done' and followup_outcome='no_answer' and completed_at=now() and note='ملاحظة المهمة الأصلية' and version=2 from samascan_crm.tasks where id=task_id),'result retains original context and completion timestamp';
 assert (select status='open' and due_at=due_time and owner='admin' and kind='website_intake' from samascan_crm.tasks where id=next_task),'next task keeps website confirmation behavior';
 assert (select stage='waiting' and version=2 from samascan_crm.inquiries where id=request_id),'waiting state recorded without inventing a booking';
 assert (select count(*) from samascan_crm.audit)=audit_count+3,'both tasks and the request are audited';
 select count(*) into task_count from samascan_crm.tasks;
 assert public.samascan_followup_api(token,'record_followup',payload)->>'code'='conflict','repeat submission does not make a second attempt';
 assert (select count(*) from samascan_crm.tasks)=task_count,'repeat submission does not duplicate next tasks';
 r:=public.samascan_crm_api(token,'save',(select to_jsonb(t)||jsonb_build_object('entity','tasks','status','open') from samascan_crm.tasks t where id=task_id));
 assert r->>'code'='invalid' and (select status='done' from samascan_crm.tasks where id=task_id),'recorded attempt cannot be reopened';
 r:=public.samascan_crm_api(token,'save',(select to_jsonb(t)||jsonb_build_object('entity','tasks','inquiry_id',wrong_request) from samascan_crm.tasks t where id=task_id));
 assert r->>'code'='invalid' and (select inquiry_id=request_id from samascan_crm.tasks where id=task_id),'recorded attempt cannot be attributed to another request';
 insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner) values(person,request_id,'متابعة متفق عليها',due_time+interval '1 hour','admin') returning id into planned_task;
 payload:=jsonb_build_object('inquiry_id',request_id,'inquiry_version',2,'task_id',next_task,'task_version',1,'outcome','needs_time','next_step','followup','next_due_at',due_time,'owner','admin');
 assert public.samascan_followup_api(token,'record_followup',payload)->>'code'='followup_exists','a second open task must be reviewed before adding another';
 assert (select status='open' and followup_outcome is null from samascan_crm.tasks where id=next_task),'failed next step leaves current attempt unchanged';
 r:=public.samascan_followup_api(token,'record_followup',payload||'{"outcome":"reached","outcome_note":"المتابعة الأخرى محددة مسبقًا","next_step":"done"}');
 assert r->>'ok'='true' and r->'data'->'next_task'='null'::jsonb,'existing future followup permits completing this attempt';
 payload:=jsonb_build_object('inquiry_id',request_id,'inquiry_version',3,'task_id',planned_task,'task_version',1,'outcome','declined','outcome_note','العميل طلب إلغاء الاستكمال','next_step','done');
 r:=public.samascan_followup_api(token,'record_followup',payload);
 assert r->>'ok'='true' and (select stage='cancelled' and version=4 from samascan_crm.inquiries where id=request_id),'explicit refusal cancels an unbooked request';
 insert into samascan_crm.inquiries(contact_id,exam,source,stage,owner) values(person,'سونار','phone','booked','admin') returning id into booking_request;
 insert into samascan_crm.appointments(contact_id,inquiry_id,exam,resource,starts_at,ends_at) values(person,booking_request,'سونار','US',due_time,due_time+interval '30 minutes');
 insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner) values(person,booking_request,'تواصل للموعد',due_time,'admin') returning id into booking_task;
 payload:=jsonb_build_object('inquiry_id',booking_request,'inquiry_version',1,'task_id',booking_task,'task_version',1,'outcome','declined','outcome_note','العميل لا يريد الاستكمال','next_step','done');
 assert public.samascan_followup_api(token,'record_followup',payload)->>'code'='linked_booking','refusal cannot cancel an existing appointment indirectly';
 r:=public.samascan_followup_api(token,'record_followup',payload||'{"outcome":"reached","outcome_note":"تم التواصل عن موقع المركز"}');
 assert r->>'ok'='true' and (select status='scheduled' from samascan_crm.appointments where inquiry_id=booking_request),'reached does not confirm or complete a scan';
 assert (select stage='booked' from samascan_crm.inquiries where id=booking_request),'appointment-derived stage preserved';
 insert into samascan_crm.inquiries(contact_id,exam,source) values(person,'سونار','whatsapp') returning id into fresh_request;
 payload:=jsonb_build_object('inquiry_id',fresh_request,'inquiry_version',1,'outcome','needs_time','next_step','followup','next_due_at',due_time,'owner','admin');
 r:=public.samascan_followup_api(token,'record_followup',payload);
 assert r->>'ok'='true' and r->'data'->'task'->>'followup_outcome'='needs_time' and r->'data'->'next_task'->>'kind'='manual','request without a task records one attempt and one actual next step';
 assert (select count(*) from samascan_crm.tasks where inquiry_id=fresh_request)=2,'new attempt is distinct from upcoming task';
 assert (select stage='waiting' and owner='admin' from samascan_crm.inquiries where id=fresh_request),'unassigned request gets the explicitly selected owner';
 assert public.samascan_followup_api(token,'record_followup',payload)->>'code'='conflict','new-task retry cannot duplicate attempts';
end $$;
rollback;

begin;
set local role service_role;
do $$
declare
 token text:=encode(extensions.gen_random_bytes(32),'hex'); marketing_token text:=encode(extensions.gen_random_bytes(32),'hex');
 person uuid; doctor uuid; complete_request uuid; attended_request uuid; future_request uuid; late_request uuid; no_show_request uuid; cancelled_request uuid; open_request uuid; rebook_request uuid; old_request uuid;
 r jsonb; row_data jsonb; pipeline_sum int; today date:=(now() at time zone 'Asia/Riyadh')::date;
begin
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(token,'sha256'),'admin',now()+interval '10 minutes');
 insert into samascan_auth.admins(username,password_hash,role) values('pipeline_marketing','unused-test-hash','marketing');
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(marketing_token,'sha256'),'pipeline_marketing',now()+interval '10 minutes');
 r:=public.samascan_outcome_report(token,'source_report','{}');
 assert (select sum(value::int) from jsonb_each_text(r->'data'->'pipeline'))=0,'empty pipeline uses actual zeros';
 insert into samascan_crm.contacts(name,phone,source) values('تجربة القياس','+966500000092','phone') returning id into person;
 insert into samascan_crm.inquiries(contact_id,exam,source,created_at) values(person,'سونار','phone',now()-interval '8 days') returning id into complete_request;
 insert into samascan_crm.inquiries(contact_id,exam,source) values(person,'سونار','phone') returning id into attended_request;
 insert into samascan_crm.inquiries(contact_id,exam,source,created_at) values(person,'سونار','phone',now()-interval '8 days') returning id into future_request;
 insert into samascan_crm.inquiries(contact_id,exam,source,created_at) values(person,'سونار','phone',now()-interval '8 days') returning id into late_request;
 insert into samascan_crm.inquiries(contact_id,exam,source,created_at) values(person,'سونار','phone',now()-interval '8 days') returning id into no_show_request;
 insert into samascan_crm.inquiries(contact_id,exam,source) values(person,'سونار','phone') returning id into cancelled_request;
 insert into samascan_crm.inquiries(contact_id,exam,source) values(person,'سونار','phone') returning id into open_request;
 insert into samascan_crm.inquiries(contact_id,exam,source,created_at) values(person,'سونار','phone',now()-interval '8 days') returning id into rebook_request;
 insert into samascan_crm.inquiries(contact_id,exam,source,created_at) values(person,'سونار','phone',now()-interval '40 days') returning id into old_request;
 insert into samascan_crm.appointments(contact_id,inquiry_id,exam,resource,starts_at,ends_at,status) values
  (person,complete_request,'سونار','US',now()-interval '5 hours',now()-interval '270 minutes','completed'),
  (person,attended_request,'سونار','US',now()-interval '4 hours',now()-interval '210 minutes','attended'),
  (person,future_request,'سونار','US',now()+interval '1 day',now()+interval '1 day 30 minutes','confirmed'),
  (person,late_request,'سونار','US',now()-interval '3 hours',now()-interval '150 minutes','scheduled'),
  (person,no_show_request,'سونار','US',now()-interval '2 hours',now()-interval '90 minutes','no_show'),
  (person,cancelled_request,'سونار','US',now()-interval '1 hour',now()-interval '30 minutes','cancelled'),
  (person,rebook_request,'سونار','US',now()-interval '7 hours',now()-interval '390 minutes','no_show'),
  (person,rebook_request,'سونار','US',now()+interval '2 days',now()+interval '2 days 30 minutes','scheduled'),
  (person,old_request,'سونار','US',now()-interval '6 hours',now()-interval '330 minutes','completed');
 insert into samascan_crm.appointments(contact_id,exam,resource,starts_at,ends_at,status) values(person,'سونار','US',now()-interval '8 hours',now()-interval '450 minutes','completed');
 r:=public.samascan_outcome_report(token,'source_report',jsonb_build_object('from',today-29,'to',today));row_data:=r->'data'->'sources'->0;
 assert (row_data->>'inquiries')::int=8 and (row_data->>'completed')::int=1 and (row_data->>'attended')::int=2,'cohort and attendance/completion remain distinct';
 assert (row_data->>'older')::int=5 and (row_data->>'olderCompleted')::int=1,'only requests at least seven days old enter older conversion';
 assert r->'data'->>'olderDays'='7','age threshold is explicit';
 assert (r->'data'->'pipeline'->>'future_booking')::int=2 and (r->'data'->'pipeline'->>'no_show')::int=1,'actual rebooking replaces current failure state without erasing history';
 assert (row_data->>'no_show')::int=2,'historical no-show appointment count retains its original meaning';
 assert (r->'data'->'pipeline'->>'completed')::int=1 and (r->'data'->'pipeline'->>'awaiting_exam')::int=1 and
  (r->'data'->'pipeline'->>'needs_outcome')::int=1 and (r->'data'->'pipeline'->>'needs_booking')::int=1 and (r->'data'->'pipeline'->>'cancelled')::int=1,'every pipeline state follows actual records';
 select sum(value::int) into pipeline_sum from jsonb_each_text(r->'data'->'pipeline');assert pipeline_sum=8,'each request occupies exactly one current state';
 assert (r->'data'->>'unlinkedAppointments')::int=1,'unlinked appointments are not attributed to sources';
 assert public.samascan_outcome_report(marketing_token,'source_report','{}')->>'code'='forbidden','patient source report role gate unchanged';
 insert into samascan_referrals.physicians(name,specialty,institution,institution_kind) values('طبيب القياس','عظام','عيادة التجربة','clinic') returning id into doctor;
 update samascan_crm.inquiries set source='referral',referring_physician_id=doctor where id in (complete_request,attended_request);
 r:=public.samascan_referral_api(marketing_token,'physician_detail',jsonb_build_object('id',doctor));
 assert r->>'ok'='true' and r->'data'->'stats'->>'attended'='2' and r->'data'->'stats'->>'completed'='1','physician profile separates attended and performed examinations';
 assert position(person::text in r::text)=0 and position('+966500000092' in r::text)=0 and position('تجربة القياس' in r::text)=0,'professional profile does not disclose patient data';
end $$;
rollback;
