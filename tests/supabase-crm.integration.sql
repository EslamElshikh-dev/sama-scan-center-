-- Run through a privileged management connection. All fixtures roll back.
begin;
set local role service_role;
do $$
declare
 admin_token text:=encode(extensions.gen_random_bytes(32),'hex'); reception_token text:=encode(extensions.gen_random_bytes(32),'hex'); marketing_token text:=encode(extensions.gen_random_bytes(32),'hex');
 c uuid:=gen_random_uuid(); inquiry uuid:=gen_random_uuid(); booking uuid:=gen_random_uuid(); task uuid:=gen_random_uuid(); rebooking uuid:=gen_random_uuid(); r jsonb; draft jsonb; p text:=encode(extensions.gen_random_bytes(12),'hex');
 begin_at timestamptz:=date_trunc('day',now())+interval '50 days 10 hours';
begin
 insert into samascan_auth.admins(username,password_hash,display_name,role) values ('crm_test_reception',extensions.crypt(p,extensions.gen_salt('bf',4)),'اختبار الاستقبال','reception'),('crm_test_marketing',extensions.crypt(p,extensions.gen_salt('bf',4)),'اختبار التسويق','marketing');
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(admin_token,'sha256'),'admin',now()+interval '10 minutes'),(extensions.digest(reception_token,'sha256'),'crm_test_reception',now()+interval '10 minutes'),(extensions.digest(marketing_token,'sha256'),'crm_test_marketing',now()+interval '10 minutes');
 r:=public.samascan_admin_auth('login','crm_test_reception',p); assert r->>'role'='reception' and r->>'ok'='true','staff login';
 r:=public.samascan_admin_auth('verify',session_token=>reception_token); assert r->>'role'='reception','role is server verified';
 r:=public.samascan_crm_api(repeat('a',64),'summary'); assert r->>'code'='credentials','forged session rejected';
 r:=public.samascan_crm_api(marketing_token,'summary'); assert r->>'code'='forbidden','marketing cannot read CRM';
 r:=public.samascan_crm_api(reception_token,'list','{"entity":"team"}'); assert r->>'code'='forbidden','reception cannot read team';
 r:=public.samascan_crm_api(reception_token,'save_user','{}'); assert r->>'code'='forbidden','reception cannot create users';
 draft:=jsonb_build_object('entity','contacts','id',c,'version',0,'name','سجل اختبار آلي','phone','0500000001','source','phone');
 r:=public.samascan_crm_api(reception_token,'save',draft); assert r->>'ok'='true','contact create: '||r; assert r->'record'->>'phone'='+966500000001','phone normalization';
 r:=public.samascan_crm_api(reception_token,'save',draft); assert r->>'code'='conflict','duplicate retry conflicts';
 r:=public.samascan_crm_api(reception_token,'save',draft||jsonb_build_object('id',gen_random_uuid(),'phone','+966500000001')); assert r->>'code'='duplicate','duplicate phone rejected';
 r:=public.samascan_crm_api(reception_token,'save',draft||'{"version":1,"name":"تحديث الاختبار"}'); assert r->'record'->>'version'='2','contact update';
 r:=public.samascan_crm_api(reception_token,'save',draft||'{"version":1}'); assert r->>'code'='conflict','stale edit rejected';
 r:=public.samascan_crm_api(reception_token,'save',jsonb_build_object('entity','inquiries','id',inquiry,'version',0,'contact_id',c,'exam','سونار','source','phone','stage','new','owner','crm_test_reception')); assert r->>'ok'='true','inquiry create: '||r;
 draft:=jsonb_build_object('entity','appointments','id',booking,'version',0,'contact_id',c,'inquiry_id',inquiry,'exam','سونار','resource','US','starts_at',begin_at,'ends_at',begin_at+interval '30 minutes','status','confirmed');
 r:=public.samascan_crm_api(reception_token,'save',draft); assert r->>'ok'='true','appointment create: '||r;
 assert (select stage='booked' from samascan_crm.inquiries where id=inquiry),'stage synced after booking';
 r:=public.samascan_crm_api(reception_token,'save',(draft-'inquiry_id')||jsonb_build_object('id',gen_random_uuid())); assert r->>'code'='overlap','overlap rejected';
 r:=public.samascan_crm_api(reception_token,'save',draft||'{"version":1,"status":"attended"}'); assert r->>'ok'='true','attendance update';
 assert (select stage='attended' from samascan_crm.inquiries where id=inquiry),'attendance synced';
 -- A cancelled historic appointment must not undo a newer active booking.
 r:=public.samascan_crm_api(reception_token,'save',draft||'{"version":2,"status":"cancelled"}');assert r->>'ok'='true','cancel appointment';
 r:=public.samascan_crm_api(reception_token,'save',draft||jsonb_build_object('id',rebooking,'starts_at',begin_at+interval '1 day','ends_at',begin_at+interval '1 day 30 minutes'));assert r->>'ok'='true','rebook';
 r:=public.samascan_crm_api(reception_token,'save',draft||'{"version":3,"status":"cancelled","note":"historical edit"}');assert r->>'ok'='true','edit historic cancelled booking';
 assert (select stage='booked' from samascan_crm.inquiries where id=inquiry),'newer booking retained';
 r:=public.samascan_crm_api(reception_token,'save',jsonb_build_object('entity','tasks','id',task,'version',0,'contact_id',c,'title','تأكيد الموعد','due_at',now()-interval '1 day','status','open','priority','high','owner','crm_test_reception')); assert r->>'ok'='true','task create: '||r;
 r:=public.samascan_crm_api(reception_token,'summary'); assert r->>'ok'='true' and (r->'data'->>'overdueTasks')::integer>=1,'summary: '||r;
 r:=public.samascan_crm_api(reception_token,'list','{"entity":"contacts","search":"تحديث الاختبار"}'); assert (r->>'total')::integer=1 and jsonb_array_length(r->'rows')=1,'contact search';
 r:=public.samascan_crm_api(reception_token,'list','{"entity":"inquiries","status":"booked"}'); assert (r->>'total')::integer>=1,'stage filter';
 r:=public.samascan_crm_api(reception_token,'list',jsonb_build_object('entity','appointments','from',(begin_at at time zone 'Asia/Riyadh')::date)); assert jsonb_array_length(r->'rows')>=1,'calendar date';
 r:=public.samascan_crm_api(reception_token,'list','{"entity":"tasks","status":"overdue"}'); assert jsonb_array_length(r->'rows')>=1,'overdue tasks';
 r:=public.samascan_crm_api(reception_token,'contact_detail',jsonb_build_object('id',c)); assert jsonb_array_length(r->'inquiries')=1 and jsonb_array_length(r->'appointments')=2 and jsonb_array_length(r->'tasks')=1,'contact timeline';
 r:=public.samascan_crm_api(admin_token,'list','{"entity":"audit"}'); assert (r->>'total')::integer>=6,'audit captured';
 r:=public.samascan_crm_api(admin_token,'save_user',jsonb_build_object('username','crm_test_reception','display_name','اختبار الاستقبال','role','reception','active',false,'updated_at',(select updated_at from samascan_auth.admins where username='crm_test_reception')));assert r->>'ok'='true','disable staff: '||r;
 r:=public.samascan_crm_api(reception_token,'summary');assert r->>'code'='credentials','disabled account sessions revoked';
 assert not has_function_privilege('anon','public.samascan_crm_api(text,text,jsonb)','execute'),'anon RPC blocked';
 assert not has_function_privilege('authenticated','public.samascan_crm_api(text,text,jsonb)','execute'),'generic auth RPC blocked';
 assert not has_schema_privilege('anon','samascan_crm','usage'),'private schema';
end $$;
rollback;
select 'CRM integration assertions passed; all fixtures rolled back' as result;
