begin;
set local role service_role;
do $$
declare token text:=encode(extensions.gen_random_bytes(32),'hex'); marketing text:=encode(extensions.gen_random_bytes(32),'hex');
 r jsonb; data jsonb; person uuid; inquiry uuid:=extensions.gen_random_uuid(); c jsonb;
begin
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(token,'sha256'),'admin',now()+interval '10 minutes');
 insert into samascan_auth.admins(username,password_hash,role) values('growth_marketing','test-only','marketing');
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(marketing,'sha256'),'growth_marketing',now()+interval '10 minutes');
 assert public.samascan_growth_api(null,'growth_list')->>'code'='credentials','session required';
 assert public.samascan_growth_api(marketing,'growth_list')->>'code'='forbidden','marketing cannot approve content or read CRM';
 assert public.samascan_growth_api(marketing,'growth_weekly')->>'code'='forbidden','CRM cohort stays private';
 assert not has_function_privilege('anon','public.samascan_growth_api(text,text,jsonb)','EXECUTE'),'anonymous cannot modify or measure private data';
 assert not has_table_privilege('anon','samascan_growth.content','SELECT'),'no direct public table read';
 c:=jsonb_build_object('id','mri-riyadh','kind','service','version',1,'status','draft','data',jsonb_build_object('supportedExams','test service'));
 r:=public.samascan_growth_api(token,'growth_content_save',c);assert r->>'ok'='true','draft saved';
 assert public.samascan_public_content()='[]'::jsonb,'draft not public';
 c:=c||jsonb_build_object('version',2,'status','approved','attested',true,'evidence','test-only evidence','confirmed_by','test clinician','confirmed_at',current_date,
 'data',jsonb_build_object('supportedExams','test service','preparation','test preparation','reportProcess','test report','devicePhoto','https://untrusted.invalid/device.png'));
 assert public.samascan_growth_api(token,'growth_content_save',c)->>'code'='invalid','remote image not accepted';
 c:=jsonb_set(c,'{data,devicePhoto}','"/mri-room-sama-scan-riyadh.webp"');
 assert public.samascan_growth_api(token,'growth_content_save',c||'{"attested":false}')->>'code'='invalid','human confirmation required';
 assert public.samascan_growth_api(token,'growth_content_save',c)->>'ok'='true','approved content saved';
 assert not (public.samascan_public_content()->0 ? 'evidence'),'private evidence not exposed';
 assert public.samascan_public_content()->0->'data'->>'reportProcess'='test report','only approved display fields returned';
 assert public.samascan_growth_api(token,'growth_content_save',c)->>'code'='conflict','concurrent approval protected';
 c:=jsonb_build_object('id','review-test-article','kind','review','version',0,'status','approved','attested',true,'evidence','review proof','confirmed_by','test clinician','confirmed_at',current_date,'data',jsonb_build_object('reviewerId','unapproved-doctor','reviewedAt',current_date,'contentVersion',current_date));
 assert public.samascan_growth_api(token,'growth_content_save',c)->>'code'='invalid','review requires an approved named clinician';
 c:=jsonb_build_object('neighborhood','المربع','point_label','isolated test point','latitude',24.66,'longitude',46.70,'query','مركز أشعة بالرياض','device','mobile','language','ar','measured_at',now(),'depth',20,'rank',21,'evidence_url','https://example.com/test-proof','method','isolated test');
 assert public.samascan_growth_api(token,'growth_maps_save',c)->>'code'='invalid','rank beyond measured depth rejected';
 assert public.samascan_growth_api(token,'growth_maps_save',c||jsonb_build_object('rank',null,'measured_at',now()+interval '1 day'))->>'code'='invalid','future measurement rejected';
 assert public.samascan_growth_api(token,'growth_maps_save',c||jsonb_build_object('rank',null))->>'ok'='true','outside cutoff differs from missing measurement';
 assert public.samascan_growth_api(token,'growth_gbp_save',jsonb_build_object('date_from','2026-09-27','date_to','2026-10-03','calls',99,'website',9,'directions',85,'source','test export','version',0))->>'code'='conflict','aggregate import uses a version lease';
 insert into samascan_crm.contacts(name,phone,source) values('isolated growth fixture','+966500000096','phone') returning id into person;
 c:=jsonb_build_object('entity','inquiries','id',inquiry,'version',0,'contact_id',person,'exam','رنين مغناطيسي','source','google','stage','new','contact_method','phone','manual_channel','google_business_profile');
 r:=public.samascan_crm_api(token,'save',c);assert r->>'ok'='true','source and contact method saved atomically';
 assert r->'record'->>'contact_method'='phone' and r->'record'->'attribution'->>'channel'='google_business_profile','Maps source distinct from telephone method';
 assert public.samascan_crm_api(token,'save',c)->>'code'='conflict','CRM version guard retained';
 update samascan_crm.inquiries set created_at='2026-09-28T12:00:00+03:00' where id=inquiry;
 insert into samascan_crm.appointments(contact_id,inquiry_id,exam,resource,starts_at,ends_at,status) values
 (person,inquiry,'رنين مغناطيسي','MRI','2026-09-29T10:00:00+03:00','2026-09-29T10:30:00+03:00','cancelled'),
 (person,inquiry,'رنين مغناطيسي','MRI','2026-09-30T10:00:00+03:00','2026-09-30T10:30:00+03:00','completed');
 data:=public.samascan_growth_api(token,'growth_weekly',jsonb_build_object('from','2026-09-27'))->'data';
 assert data->'periods'->0->'google'->>'calls'='32','matching GBP interval used';
 assert data->'periods'->1->'google'->>'calls'='36','equal preceding week';
 assert data->'periods'->0->'rows'->0->>'requests'='1' and data->'periods'->0->'rows'->0->>'completed'='1','rebooked inquiry counted once';
 assert data->'periods'->0->'rows'->0->>'confirmed'='1','completion proves a confirmed appointment outcome';
 assert not (data::text like '%+966500000096%'),'weekly report contains no phone';
end;$$;
rollback;
