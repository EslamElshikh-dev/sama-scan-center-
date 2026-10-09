begin;
set local role service_role;
do $$
declare token text:=encode(extensions.gen_random_bytes(32),'hex');
 marketing_token text:=encode(extensions.gen_random_bytes(32),'hex');
 today date:=(now() at time zone 'Asia/Riyadh')::date; p jsonb; r jsonb; row jsonb;
begin
 insert into samascan_auth.sessions(token_hash,username,expires_at)
 values(extensions.digest(token,'sha256'),'admin',now()+interval '10 minutes');
 insert into samascan_auth.admins(username,password_hash,role,display_name)
 values('daily_marketing',extensions.crypt('isolated-test-password',extensions.gen_salt('bf',4)),'marketing','اختبار التسويق');
 insert into samascan_auth.sessions(token_hash,username,expires_at)
 values(extensions.digest(marketing_token,'sha256'),'daily_marketing',now()+interval '10 minutes');
 assert not has_table_privilege('anon','samascan_crm.contact_daily_totals','select'),'totals remain private';
 assert not has_function_privilege('authenticated','public.samascan_contact_daily_api(text,text,jsonb)','execute'),'auth is enforced via the session gateway';
 assert public.samascan_contact_daily_api(repeat('0',64),'contact_daily_report','{}')->>'code'='credentials','invalid session rejected';
 assert public.samascan_contact_daily_api(marketing_token,'contact_daily_save','{}')->>'code'='forbidden','marketing cannot edit received totals';
 r:=public.samascan_contact_daily_api(marketing_token,'contact_daily_report',jsonb_build_object('from',today-1,'to',today));
 assert r->>'ok'='true' and jsonb_array_length(r->'data'->'days')=2,'one row per Riyadh day';
 row:=r->'data'->'days'->0;
 assert row->>'day'=today::text and row->'reported_calls'='null'::jsonb,'an unverified day is unknown, not zero';
 p:=jsonb_build_object('day',today-1,'calls',5,'whatsapp',7,'note','Totals only; no invented contact identity','version',0);
 r:=public.samascan_contact_daily_api(token,'contact_daily_save',p);
 assert r->>'ok'='true' and r->>'version'='1','verified total saved';
 assert (select count(*) from samascan_crm.contacts)=0 and (select count(*) from samascan_crm.inquiries)=0,'saving an aggregate creates no fabricated lead';
 assert public.samascan_contact_daily_api(token,'contact_daily_save',p)->>'code'='conflict','stale edits cannot overwrite the total';
 p:=jsonb_build_object('day',today,'calls',0,'whatsapp',0,'version',0);
 assert public.samascan_contact_daily_api(token,'contact_daily_save',p)->>'ok'='true','explicit verified zero is accepted';
 assert public.samascan_contact_daily_api(token,'contact_daily_save',p||jsonb_build_object('day',today+1))->>'code'='invalid','future totals rejected';
 assert public.samascan_contact_daily_api(token,'contact_daily_save',p||jsonb_build_object('calls',1.5))->>'code'='invalid','fractional contact counts rejected';
 assert public.samascan_contact_daily_api(token,'contact_daily_save',p||jsonb_build_object('whatsapp',10001))->>'code'='invalid','counts are bounded';
 assert public.samascan_contact_daily_api(token,'contact_daily_report',jsonb_build_object('from',today-91,'to',today))->>'code'='invalid','report window is bounded';
 assert public.samascan_contact_daily_api(token,'contact_daily_report',jsonb_build_object('from',today,'to',today-1))->>'code'='invalid','reversed windows rejected';
 r:=public.samascan_contact_daily_api(marketing_token,'contact_daily_report',jsonb_build_object('from',today-1,'to',today));
 assert r->'data'->'days'->0->>'reported_calls'='0','explicit zero remains distinguishable from unknown';
 row:=r->'data'->'days'->1;
 assert row->>'reported_calls'='5' and row->>'reported_whatsapp'='7' and row->>'recorded_calls'='0','reported totals do not inflate individual CRM counts';
 assert row->'note'='null'::jsonb and position('Totals only' in r::text)=0,'marketing sees aggregates without reception notes';
 r:=public.samascan_contact_daily_api(token,'contact_daily_save',jsonb_build_object('day',today-1,'calls',3,'whatsapp',3,'version',1));
 assert r->>'ok'='true' and r->>'version'='2','authorized revision increments its version';
end;$$;
rollback;
