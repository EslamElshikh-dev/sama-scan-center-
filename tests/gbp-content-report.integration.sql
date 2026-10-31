-- Disposable local fixtures only; the transaction always rolls back.
begin;
set local role service_role;
do $test$
declare
 token text:=encode(extensions.gen_random_bytes(32),'hex');
 other_token text:=encode(extensions.gen_random_bytes(32),'hex');
 today date:=(now() at time zone 'Asia/Riyadh')::date;
 cid uuid; ids uuid[]:='{}'; iid uuid; attr jsonb; r jsonb; row_data jsonb; n integer;
begin
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(token,'sha256'),'admin',now()+interval '10 minutes');
 insert into samascan_auth.admins(username,password_hash,role) values('gbp_marketing_fixture',extensions.crypt('local-only',extensions.gen_salt('bf',4)),'marketing');
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(other_token,'sha256'),'gbp_marketing_fixture',now()+interval '10 minutes');
 insert into samascan_crm.contacts(name,phone,source) values('LOCAL GBP FIXTURE','+966500001997','website') returning id into cid;
 for n in 1..9 loop
  attr:=case n
   when 1 then '{"channel":"google_business_profile","campaign":"gbp","content":"post-a"}'::jsonb
   when 2 then '{"channel":"google_business_profile","campaign":"gbp","content":"post-a"}'::jsonb
   when 3 then '{"channel":"google_business_profile","campaign":"other","content":"post-a"}'::jsonb
   when 4 then '{"channel":"google_business_profile","campaign":"gbp"}'::jsonb
   when 5 then '{"channel":"google_ads","campaign":"gbp","content":"post-a"}'::jsonb
   when 6 then '{}'::jsonb
   when 7 then '{"channel":"google_business_profile","campaign":"ab:cd","content":"ef"}'::jsonb
   when 8 then '{"channel":"google_business_profile","campaign":"ab","content":"cd:ef"}'::jsonb
   else '{"channel":"google_business_profile","campaign":"gbp","content":"outside-period"}'::jsonb end;
  insert into samascan_crm.inquiries(contact_id,exam,source,stage,attribution,created_at)
   values(cid,'سونار',case when n=6 then 'google' else 'website' end,case when n=1 then 'completed' else 'new' end,attr,
    case when n=9 then now()-interval '20 days' when n=1 then now()-interval '9 days' else now()-interval '1 day' end) returning id into iid;
  ids:=array_append(ids,iid);
 end loop;
 insert into samascan_crm.appointments(contact_id,inquiry_id,exam,resource,starts_at,ends_at,status) values
  (cid,ids[1],'سونار','US',now()-interval '3 hours',now()-interval '150 minutes','no_show'),
  (cid,ids[1],'سونار','US',now()-interval '2 hours',now()-interval '90 minutes','cancelled'),
  (cid,ids[1],'سونار','US',now()-interval '1 hour',now()-interval '30 minutes','completed'),
  (cid,ids[2],'سونار','US',now()+interval '1 day',now()+interval '1 day 30 minutes','confirmed'),
  (cid,ids[3],'سونار','US',now()+interval '2 days',now()+interval '2 days 30 minutes','scheduled');
 r:=public.samascan_outcome_report(token,'source_report',jsonb_build_object('from',today-14,'to',today));
 assert r->>'ok'='true','authorized report succeeds';
 assert (select sum((x->>'inquiries')::int)=8 from jsonb_array_elements(r->'data'->'sources') x),'existing source totals are unchanged';
 assert (select sum((x->>'inquiries')::int)=6 from jsonb_array_elements(r->'data'->'googleBusinessContent') x),'only explicitly attributed GBP requests included';
 assert jsonb_array_length(r->'data'->'googleBusinessContent')=5,'campaign and content pairs remain separate';
 select x into row_data from jsonb_array_elements(r->'data'->'googleBusinessContent') x where x->>'campaign'='gbp' and x->>'content'='post-a';
 assert (row_data->>'inquiries')::int=2 and (row_data->>'booked')::int=2 and (row_data->>'confirmed')::int=2,'future confirmation counted separately from attendance';
 assert (row_data->>'attended')::int=1 and (row_data->>'completed')::int=1 and (row_data->>'no_show')::int=1,'rebooking never duplicates completed requests';
 assert (row_data->>'older')::int=1 and (row_data->>'olderCompleted')::int=1,'existing mature request denominator retained';
 assert exists(select 1 from jsonb_array_elements(r->'data'->'googleBusinessContent') x where x->>'content'='' and (x->>'inquiries')::int=1),'missing content remains an explicit untagged bucket';
 assert (select count(*)=2 from jsonb_array_elements(r->'data'->'googleBusinessContent') x where x->>'campaign' in ('ab:cd','ab')),'colon-containing tags do not collide';
 assert not exists(select 1 from jsonb_array_elements(r->'data'->'googleBusinessContent') x where x->>'content'='outside-period'),'request cohort date filter respected';
 assert r::text !~ '"(phone|contact_id|booking_reference|password_hash|token_hash)"','aggregate report contains no patient identity or credentials';
 r:=public.samascan_outcome_report(other_token,'source_report','{}');assert r->>'code'='forbidden','marketing cannot read private CRM outcomes';
 r:=public.samascan_outcome_report('bad','source_report','{}');assert r->>'code'='credentials','invalid sessions rejected';
 r:=public.samascan_outcome_report(token,'source_report',jsonb_build_object('from',today,'to',today+1));assert r->>'code'='invalid','future report dates rejected';
 assert not has_function_privilege('anon','public.samascan_outcome_report(text,text,jsonb)','EXECUTE'),'public RPC access remains denied';
 assert not has_function_privilege('authenticated','public.samascan_outcome_report(text,text,jsonb)','EXECUTE'),'browser cannot bypass private CRM gate';
end $test$;
rollback;
