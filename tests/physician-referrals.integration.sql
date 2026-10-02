-- Disposable fixtures, including tokens, are always rolled back.
begin;
set local role service_role;
do $test$
declare
 atoken text:=encode(extensions.gen_random_bytes(32),'hex');
 mtoken text:=encode(extensions.gen_random_bytes(32),'hex');
 otoken text:=encode(extensions.gen_random_bytes(32),'hex');
 rtoken text:=encode(extensions.gen_random_bytes(32),'hex');
 pword text:=encode(extensions.gen_random_bytes(16),'hex');
 doctor uuid:=gen_random_uuid(); dormant uuid:=gen_random_uuid(); never_doctor uuid:=gen_random_uuid();
 visit_id uuid:=gen_random_uuid(); contact uuid:=gen_random_uuid(); inquiry uuid:=gen_random_uuid(); old_inquiry uuid:=gen_random_uuid();
 booking uuid:=gen_random_uuid(); rebooking uuid:=gen_random_uuid();
 r jsonb; draft jsonb; vdraft jsonb; idraft jsonb; metrics jsonb; rec jsonb; act text;
 today date:=(now() at time zone 'Asia/Riyadh')::date;
begin
 insert into samascan_auth.admins(username,password_hash,display_name,role) values
 ('referral_marketer',extensions.crypt(pword,extensions.gen_salt('bf',4)),'تسويق التجربة','marketing'),
 ('referral_other',extensions.crypt(pword,extensions.gen_salt('bf',4)),'تسويق آخر','marketing'),
 ('referral_reception',extensions.crypt(pword,extensions.gen_salt('bf',4)),'استقبال التجربة','reception');
 insert into samascan_auth.sessions(token_hash,username,expires_at) values
 (extensions.digest(atoken,'sha256'),'admin',now()+interval '10 minutes'),
 (extensions.digest(mtoken,'sha256'),'referral_marketer',now()+interval '10 minutes'),
 (extensions.digest(otoken,'sha256'),'referral_other',now()+interval '10 minutes'),
 (extensions.digest(rtoken,'sha256'),'referral_reception',now()+interval '10 minutes');
 assert not has_schema_privilege('anon','samascan_referrals','usage'),'anonymous schema blocked';
 assert not has_function_privilege('authenticated','public.samascan_referral_api(text,text,jsonb)','execute'),'direct authenticated RPC blocked';
 assert has_function_privilege('service_role','public.samascan_referral_api(text,text,jsonb)','execute'),'gateway invocation allowed';
 assert (select bool_and(relrowsecurity) from pg_class where relnamespace='samascan_referrals'::regnamespace and relkind='r'),'all referral tables have RLS';
 r:=public.samascan_referral_api(repeat('f',64),'physician_report');assert r->>'code'='credentials','forged session blocked';
 foreach act in array array['physician_list','physician_detail','physician_save','visit_list','visit_save','physician_report'] loop
  r:=public.samascan_referral_api(rtoken,act);assert r->>'code'='forbidden','reception cannot access marketing records: '||act;
 end loop;
 foreach act in array array['summary','list','contact_detail','source_report','save','save_user'] loop
  r:=public.samascan_crm_api(mtoken,act,'{"entity":"contacts"}');assert r->>'code'='forbidden','marketing still denied patient action: '||act;
 end loop;

 draft:=jsonb_build_object('id',doctor,'version',0,'name','طبيب تجربة','specialty','العظام','institution','عيادة تجربة','institution_kind','clinic','district','العليا','phone','٠٥٠٠٠٠٠٠٠٩','owner','referral_marketer','note','ملاحظة زيارة مهنية');
 r:=public.samascan_referral_api(mtoken,'physician_save',draft);assert r->>'ok'='true','physician create: '||r;
 assert r->'record'->>'phone'='+966500000009','doctor phone normalization';
 r:=public.samascan_referral_api(mtoken,'physician_save',draft);assert r->>'code'='conflict','replayed physician create conflicts';
 r:=public.samascan_referral_api(mtoken,'physician_save',draft||jsonb_build_object('id',gen_random_uuid()));assert r->>'code'='duplicate','duplicate business identity rejected';
 r:=public.samascan_referral_api(mtoken,'physician_save',draft||jsonb_build_object('version',1,'owner','referral_other'));assert r->>'code'='forbidden','marketing cannot reassign doctors';
 r:=public.samascan_referral_api(otoken,'physician_save',draft||jsonb_build_object('version',1,'owner','referral_other'));assert r->>'code'='forbidden','marketing cannot overwrite another owner';
 r:=public.samascan_referral_api(atoken,'physician_save',draft||jsonb_build_object('id',dormant,'name','طبيب متوقف','owner','admin'));assert r->>'ok'='true','shared clinic phone is allowed';
 r:=public.samascan_referral_api(atoken,'physician_save',draft||jsonb_build_object('id',never_doctor,'name','طبيب بلا إحالات','owner','admin'));assert r->>'ok'='true','never referring doctor';

 r:=public.samascan_referral_api(rtoken,'physician_options',jsonb_build_object('id',doctor));
 assert jsonb_array_length(r->'rows')=1,'reception can choose doctor';
 rec:=r->'rows'->0;
 assert rec ? 'name' and not (rec ? 'note' or rec ? 'phone' or rec ? 'owner'),'picker returns minimal business labels';

 vdraft:=jsonb_build_object('id',visit_id,'version',0,'physician_id',doctor,'visited_at',now()-interval '2 days','owner','referral_marketer','outcome','followup','note','تسليم تعريف بالخدمات','next_followup_at',now()-interval '1 day','followup_status','open');
 r:=public.samascan_referral_api(mtoken,'visit_save',vdraft);assert r->>'ok'='true','actual marketing visit: '||r;
 r:=public.samascan_referral_api(mtoken,'visit_save',vdraft||jsonb_build_object('id',gen_random_uuid(),'visited_at',now()+interval '1 hour'));assert r->>'code'='invalid','future actual visit rejected';
 r:=public.samascan_referral_api(otoken,'visit_save',vdraft||jsonb_build_object('version',1,'owner','referral_other'));assert r->>'code'='forbidden','another marketer cannot edit visit';
 r:=public.samascan_referral_api(mtoken,'visit_save',vdraft||jsonb_build_object('version',1,'physician_id',dormant));assert r->>'code'='invalid','visit identity cannot be reassigned';
 r:=public.samascan_referral_api(mtoken,'visit_list','{"status":"overdue"}');assert (r->>'total')::int=1,'overdue queue contains actual followup';
 r:=public.samascan_referral_api(mtoken,'visit_save',vdraft||jsonb_build_object('version',1,'followup_status','done'));assert r->>'ok'='true' and r->'record'->>'completed_at' is not null,'followup completed at actual time';
 r:=public.samascan_referral_api(mtoken,'visit_save',vdraft||jsonb_build_object('version',1));assert r->>'code'='conflict','stale visit version blocked';
 r:=public.samascan_referral_api(mtoken,'visit_list','{"status":"overdue"}');assert (r->>'total')::int=0,'completed followup leaves overdue queue';

 r:=public.samascan_crm_api(rtoken,'save',jsonb_build_object('entity','contacts','id',contact,'version',0,'name','PATIENT_PRIVATE_SENTINEL','phone','0500000008','source','referral','note','PATIENT_NOTE_SENTINEL'));assert r->>'ok'='true','contact fixture';
 idraft:=jsonb_build_object('entity','inquiries','id',inquiry,'version',0,'contact_id',contact,'exam','PRIVATE_EXAM_SENTINEL','source','referral','stage','new','referring_physician_id',doctor);
 r:=public.samascan_crm_api(rtoken,'save',idraft||'{"source":"phone"}');assert r->>'code'='invalid','doctor cannot link to another source';
 r:=public.samascan_crm_api(rtoken,'save',idraft||jsonb_build_object('referring_physician_id',gen_random_uuid()));assert r->>'code'='invalid','unknown physician rejected';
 r:=public.samascan_crm_api(rtoken,'save',idraft);assert r->>'ok'='true','booking inquiry attributed: '||r;
 r:=public.samascan_crm_api(rtoken,'list','{"entity":"inquiries"}');assert r->'rows'->0->>'physician_name'='طبيب تجربة','inquiry list label';
 r:=public.samascan_crm_api(rtoken,'contact_detail',jsonb_build_object('id',contact));assert r->'inquiries'->0->>'physician_name'='طبيب تجربة','contact history label';
 insert into samascan_crm.inquiries(id,contact_id,exam,source,referring_physician_id,created_at) values
 (old_inquiry,contact,'فحص تجربة','referral',dormant,now()-interval '100 days'),
 (gen_random_uuid(),contact,'فحص تجربة','referral',null,now());

 r:=public.samascan_crm_api(rtoken,'save',jsonb_build_object('entity','appointments','id',booking,'version',0,'contact_id',contact,'inquiry_id',inquiry,'exam','PRIVATE_EXAM_SENTINEL','resource','MRI','starts_at',now()-interval '3 hours','ends_at',now()-interval '2 hours','status','cancelled'));assert r->>'ok'='true','cancelled booking';
 r:=public.samascan_crm_api(rtoken,'save',jsonb_build_object('entity','appointments','id',rebooking,'version',0,'contact_id',contact,'inquiry_id',inquiry,'exam','PRIVATE_EXAM_SENTINEL','resource','MRI','starts_at',now()-interval '1 hour','ends_at',now()-interval '30 minutes','status','attended'));assert r->>'ok'='true','attended rebooking';
 r:=public.samascan_referral_api(mtoken,'physician_report',jsonb_build_object('from',today-29,'to',today));
 metrics:=r->'data'->'totals';
 assert (metrics->>'referrals')::int=1 and (metrics->>'booked')::int=1 and (metrics->>'attended')::int=1,'rebooking counted once within inquiry cohort: '||r;
 assert (metrics->>'visits')::int=1,'visit count within visit period';
 assert (metrics->>'dormant')::int=1 and (metrics->>'never')::int=1,'no prior referral distinct from dormant';
 assert (r->'data'->>'unlinkedReferrals')::int=1,'missing physician attribution reported separately';
 assert r::text not like '%PATIENT_%' and r::text not like '%PRIVATE_EXAM%' and r::text not like '%'||contact::text||'%' and r::text not like '%'||inquiry::text||'%','report contains no patient-level data';
 r:=public.samascan_referral_api(mtoken,'physician_detail',jsonb_build_object('id',doctor));
 assert (r->'data'->'stats'->>'referrals')::int=1,'doctor profile aggregation';
 assert r::text not like '%PATIENT_%' and r::text not like '%PRIVATE_EXAM%' and not(r->'data' ? 'inquiries' or r->'data' ? 'appointments'),'profile contains business visits and aggregates only';
 r:=public.samascan_referral_api(mtoken,'physician_report',jsonb_build_object('from',today-29,'to',today,'status','dormant'));assert (r->'data'->>'total')::int=1 and (r->'data'->'totals'->>'referrals')::int=0,'dormancy uses all-time last referral rather than selected period';
 r:=public.samascan_referral_api(mtoken,'physician_report',jsonb_build_object('from',today-29,'to',today,'dormant_days',5));assert r->>'code'='invalid','bounded dormancy threshold';
 r:=public.samascan_referral_api(mtoken,'physician_report',jsonb_build_object('from',today,'to',today-1));assert r->>'code'='invalid','invalid date range';

 r:=public.samascan_referral_api(mtoken,'physician_save',draft||jsonb_build_object('version',1,'active',false));assert r->>'ok'='true','archive preserves doctor history';
 r:=public.samascan_crm_api(rtoken,'save',idraft||jsonb_build_object('id',gen_random_uuid()));assert r->>'code'='invalid','archived doctor cannot receive new attributions';
 r:=public.samascan_crm_api(rtoken,'save',idraft||jsonb_build_object('version',3,'stage','attended','note','تحديث إداري'));assert r->>'ok'='true','existing attribution to archived physician preserved: '||r;
 r:=public.samascan_referral_api(mtoken,'visit_save',vdraft||jsonb_build_object('id',gen_random_uuid()));assert r->>'code'='invalid','new visit to archived doctor blocked';
 r:=public.samascan_referral_api(mtoken,'visit_save',vdraft||jsonb_build_object('version',2,'followup_status','done'));assert r->>'ok'='true','existing archived physician visit can be maintained';
 r:=public.samascan_referral_api(mtoken,'physician_options',jsonb_build_object('search','طبيب تجربة'));assert jsonb_array_length(r->'rows')=0,'default picker excludes archive';
 r:=public.samascan_referral_api(rtoken,'physician_options',jsonb_build_object('id',doctor));assert r->'rows'->0->>'active'='false','old label can still be resolved';
 update samascan_auth.admins set active=false where username='referral_marketer';
 r:=public.samascan_referral_api(mtoken,'physician_report');assert r->>'code'='credentials','disabled accounts blocked immediately';
end;$test$;
rollback;
