begin;
set local role service_role;
do $$
declare token text:=encode(extensions.gen_random_bytes(32),'hex'); marketing_token text:=encode(extensions.gen_random_bytes(32),'hex');
 event_key uuid:=extensions.gen_random_uuid(); second_key uuid:=extensions.gen_random_uuid(); visitor uuid:=extensions.gen_random_uuid();
 request_key uuid:=extensions.gen_random_uuid(); reference_code text; p jsonb; r jsonb; iid uuid; cid uuid; aid uuid:=extensions.gen_random_uuid();
 today text:=(now() at time zone 'Asia/Riyadh')::date::text; metrics jsonb;
begin
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(token,'sha256'),'admin',now()+interval '10 minutes');
 insert into samascan_auth.admins(username,password_hash,role,display_name) values('contact_marketing',extensions.crypt('isolated-test-password',extensions.gen_salt('bf',4)),'marketing','اختبار التسويق');
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(marketing_token,'sha256'),'contact_marketing',now()+interval '10 minutes');
 assert not has_table_privilege('anon','samascan_crm.contact_events','select'),'anonymous event reads forbidden';
 assert not has_function_privilege('authenticated','public.samascan_contact_event_intake(jsonb)','execute'),'generic auth cannot invoke private intake';
 p:=jsonb_build_object('event_id',event_key,'session_id',visitor,'kind','whatsapp','cta','hero_mri_whatsapp','page_path','/services/mri-riyadh',
  'attribution',jsonb_build_object('channel','google_ads','source','google','campaign','sama_search_riyadh_202610',
   'landingPage','/services/mri-riyadh?gclid=private-click','patient_name','never-store','gclid','never-store'));
 r:=public.samascan_contact_event_intake(p);assert r->>'ok'='true','site event stored';
 r:=public.samascan_contact_event_intake(p);assert r->>'ok'='true','event retry idempotent';
 assert (select count(*) from samascan_crm.contact_events)=1,'one event after retry';
 assert (select count(*) from samascan_crm.contacts)=0,'a click never creates a patient or actual contact';
 assert (select attribution->>'landingPage'='/services/mri-riyadh' and not attribution?'gclid' and not attribution?'patient_name' from samascan_crm.contact_events where event_id=event_key),'only bounded attribution stored';
 r:=public.samascan_contact_event_intake(p||jsonb_build_object('event_id',second_key));assert r->>'ok'='true','second intent can be stored';
 r:=public.samascan_contact_api(marketing_token,'contact_metrics',jsonb_build_object('from',today,'to',today));
 assert r->>'ok'='true','marketing can see aggregate measurement';metrics:=r->'data'->'metrics';
 assert metrics->>'whatsapp_clicks'='2' and metrics->>'whatsapp_sessions'='1' and metrics->>'confirmed_whatsapp'='0','clicks, sessions and actual contact differ';
 assert position('never-store' in r::text)=0 and position('phone' in (r->'data'->'recent')::text)=0,'aggregate event output contains no patient details';
 assert public.samascan_contact_api(repeat('0',64),'contact_metrics','{}')->>'code'='credentials','invalid sessions rejected';
 assert public.samascan_contact_api(marketing_token,'contact_record','{}')->>'code'='forbidden','marketing cannot confirm actual contacts';
 reference_code:='SC-'||upper(left(replace(event_key::text,'-',''),12));
 p:=jsonb_build_object('request_id',request_key,'name','عميل اختبار التواصل','phone','0500000079','exam','رنين مغناطيسي','kind','phone','channel','unknown','reference',reference_code);
 assert public.samascan_contact_api(token,'contact_record',p)->>'code'='invalid','reference must match actual contact method';
 assert (select count(*) from samascan_crm.contacts)=0,'invalid linkage has no side effects';
 p:=p||jsonb_build_object('kind','whatsapp');r:=public.samascan_contact_api(token,'contact_record',p);
 assert r->>'ok'='true','actual received contact creates CRM journey';iid:=(r->>'inquiry_id')::uuid;
 select contact_id into cid from samascan_crm.inquiries where id=iid;
 assert (select contact_method='whatsapp' and attribution->>'channel'='google_ads' and attribution->>'campaign'='sama_search_riyadh_202610' from samascan_crm.inquiries where id=iid),'reference preserves exact attribution';
 assert (select inquiry_id=iid and confirmed_at is not null from samascan_crm.contact_events where event_id=event_key),'click linked only after staff confirmation';
 assert (select count(*) from samascan_crm.tasks where inquiry_id=iid and status='open')=1,'one linked followup task';
 r:=public.samascan_contact_api(token,'contact_record',p);assert (r->>'inquiry_id')::uuid=iid,'received contact retry is idempotent';
 assert (select count(*) from samascan_crm.inquiries)=1,'no duplicate request after retry';
 assert public.samascan_contact_api(token,'contact_record',p||jsonb_build_object('request_id',extensions.gen_random_uuid()))->>'code'='duplicate','same reference cannot create duplicate contact';
 r:=public.samascan_contact_api(token,'contact_metrics',jsonb_build_object('from',today,'to',today));
 assert r->'data'->'metrics'->>'confirmed_whatsapp'='1' and r->'data'->'metrics'->>'booked'='0','received contact is not a confirmed appointment';
 r:=public.samascan_crm_api(token,'save',jsonb_build_object('entity','appointments','id',aid,'version',0,'contact_id',cid,'inquiry_id',iid,'exam','رنين مغناطيسي','resource','MRI',
  'starts_at',now()+interval '1 day','ends_at',now()+interval '1 day 30 minutes','status','scheduled'));
 assert r->>'ok'='true','scheduled booking saved';
 r:=public.samascan_contact_api(token,'contact_metrics',jsonb_build_object('from',today,'to',today));assert r->'data'->'metrics'->>'booked'='0','scheduled is not yet confirmed';
 update samascan_crm.appointments set status='confirmed' where id=aid;
 r:=public.samascan_contact_api(marketing_token,'contact_metrics',jsonb_build_object('from',today,'to',today));
 assert r->'data'->'metrics'->>'booked'='1','confirmed appointment visible in live funnel';
 assert position('عميل اختبار' in r::text)=0 and position('+966500000079' in r::text)=0,'marketing receives no contact identity';
end;$$;
rollback;
