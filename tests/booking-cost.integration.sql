begin;
set local role service_role;
do $$
declare token text:=encode(extensions.gen_random_bytes(32),'hex'); marketing_token text:=encode(extensions.gen_random_bytes(32),'hex');
 today date:=(now() at time zone 'Asia/Riyadh')::date; r jsonb; p jsonb; person uuid:=extensions.gen_random_uuid();
 ids uuid[]:=array[extensions.gen_random_uuid(),extensions.gen_random_uuid(),extensions.gen_random_uuid(),extensions.gen_random_uuid(),extensions.gen_random_uuid(),extensions.gen_random_uuid(),extensions.gen_random_uuid()];
 i integer;
begin
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(token,'sha256'),'admin',now()+interval '10 minutes');
 insert into samascan_auth.admins(username,password_hash,role,display_name) values('cost_marketing',extensions.crypt('isolated-test-password',extensions.gen_salt('bf',4)),'marketing','اختبار التسويق');
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(marketing_token,'sha256'),'cost_marketing',now()+interval '10 minutes');
 assert not has_table_privilege('anon','samascan_crm.ad_spend_daily','select'),'spend stays private';
 assert not has_function_privilege('authenticated','public.samascan_booking_cost_api(text,text,jsonb)','execute'),'no public RPC execution';
 assert public.samascan_booking_cost_api(repeat('0',64),'booking_cost_report','{}')->>'code'='credentials','forged session rejected';
 assert public.samascan_booking_cost_api(marketing_token,'booking_cost_save','{}')->>'code'='forbidden','marketing cannot alter financial checkpoints';
 p:=jsonb_build_object('from',today-2,'to',today-1);
 r:=public.samascan_booking_cost_api(marketing_token,'booking_cost_report',p);
 assert r->>'ok'='true' and r->'data'->'spend'='null'::jsonb,'unrecorded spend is unknown';
 assert r->'data'->'costPerConfirmed'='null'::jsonb and r->'data'->>'coveredDays'='0','missing days cannot fabricate a cost';
 assert jsonb_array_length(r->'data'->'days')=2,'Riyadh calendar includes every day';
 assert public.samascan_booking_cost_api(token,'booking_cost_report',jsonb_build_object('from',today-90,'to',today))->>'code'='invalid','reports bounded to 90 days';
 assert public.samascan_booking_cost_api(token,'booking_cost_report',jsonb_build_object('from',today,'to',today+1))->>'code'='invalid','future range rejected';
 assert public.samascan_booking_cost_api(token,'booking_cost_report',jsonb_build_object('from',today,'to',today-1))->>'code'='invalid','reversed range rejected';
 insert into samascan_crm.contacts(id,name,phone,source) values(person,'اختبار التكلفة المعزول','+966500000222','website');
 for i in 1..7 loop
  insert into samascan_crm.inquiries(id,contact_id,exam,source,contact_method,booking_reference,attribution,created_at)
  values(ids[i],person,case when i=3 then 'سونار' else 'رنين مغناطيسي' end,'website',case when i=3 then 'whatsapp' when i=4 then null else 'phone' end,
   case when i=4 then 'SC-TEST-COST-1' else null end,
   jsonb_build_object('channel','google_ads','campaign',case when i=5 then '' when i=6 then 'another_campaign' else 'sama_search_riyadh_202610' end),
   ((today-case when i=7 then 3 else 2 end)::timestamp+time '12:00') at time zone 'Asia/Riyadh');
 end loop;
 insert into samascan_crm.appointments(contact_id,inquiry_id,exam,resource,starts_at,ends_at,status)
 values(person,ids[1],'رنين مغناطيسي','MRI',now()+interval '1 day',now()+interval '1 day 1 hour','confirmed'),
 (person,ids[2],'رنين مغناطيسي','MRI',now()-interval '2 days',now()-interval '2 days'+interval '1 hour','cancelled'),
 (person,ids[3],'سونار','US',now()+interval '2 days',now()+interval '2 days 1 hour','scheduled'),
 (person,ids[4],'رنين مغناطيسي','MRI',now()-interval '1 day',now()-interval '1 day'+interval '1 hour','completed'),
 (person,ids[4],'رنين مغناطيسي','MRI',now()-interval '3 days',now()-interval '3 days'+interval '1 hour','cancelled'),
 (person,ids[5],'رنين مغناطيسي','MRI',now()+interval '3 days',now()+interval '3 days 1 hour','confirmed'),
 (person,ids[6],'رنين مغناطيسي','MRI',now()+interval '4 days',now()+interval '4 days 1 hour','confirmed'),
 (person,ids[7],'رنين مغناطيسي','MRI',now()+interval '5 days',now()+interval '5 days 1 hour','confirmed');
 r:=public.samascan_booking_cost_api(token,'booking_cost_report',p);
 assert r->'data'->'metrics'->>'inquiries'='4' and r->'data'->'metrics'->>'confirmed'='2','only campaign cohort, confirmed or completed, once per inquiry';
 assert r->'data'->'metrics'->>'attended'='1' and r->'data'->'metrics'->>'completed'='1','completion includes attendance';
 assert r->'data'->'gaps'->>'unassignedAds'='1' and r->'data'->'gaps'->>'otherCampaigns'='1','unknown and other campaigns excluded and disclosed';
 assert r->'data'->'metrics'->>'calls'='2' and r->'data'->'metrics'->>'whatsapp'='1' and r->'data'->'metrics'->>'forms'='1','received methods remain separate';
 insert into samascan_crm.ad_spend_daily(day,amount,evidence,record_origin) values(today-2,70,'isolated snapshot','ads_snapshot');
 r:=public.samascan_booking_cost_api(token,'booking_cost_report',p);
 assert r->'data'->'costPerConfirmed'='null'::jsonb,'partial spend never divided by a full cohort';
 assert public.samascan_booking_cost_api(token,'booking_cost_save',jsonb_build_object('day',today-1,'amount',0,'evidence','verified zero','version',0))->>'ok'='true','reviewed zero counts as covered';
 r:=public.samascan_booking_cost_api(token,'booking_cost_report',p);
 assert (r->'data'->>'spend')::numeric=70 and (r->'data'->>'costPerConfirmed')::numeric=35,'spend divided by deduplicated confirmed bookings';
 assert r->'data'->>'coveredDays'='2' and r->'data'->>'snapshotDays'='1','coverage and cached source disclosed';
 assert public.samascan_booking_cost_api(token,'booking_cost_save',jsonb_build_object('day',today-1,'amount',99,'evidence','stale revision','version',0))->>'code'='conflict','concurrent update protected';
 assert public.samascan_booking_cost_api(token,'booking_cost_save',jsonb_build_object('day',today,'amount',70,'evidence','unfinished day','version',0))->>'code'='invalid','unfinished day cannot be finalized';
 assert public.samascan_booking_cost_api(token,'booking_cost_save',jsonb_build_object('day',today-3,'amount','NaN','evidence','invalid amount','version',0))->>'code'='invalid','NaN rejected';
 assert public.samascan_booking_cost_api(token,'booking_cost_save',jsonb_build_object('day',today-3,'amount',1.005,'evidence','invalid amount','version',0))->>'code'='invalid','sub-cent precision rejected';
 assert public.samascan_booking_cost_api(token,'booking_cost_save',jsonb_build_object('day',today-3,'amount',-1,'evidence','invalid amount','version',0))->>'code'='invalid','negative expense rejected';
 r:=public.samascan_booking_cost_api(token,'booking_cost_report',jsonb_build_object('from',today-1,'to',today-1));
 assert r->'data'->'costPerConfirmed'='null'::jsonb,'zero bookings does not become zero cost';
 r:=public.samascan_contact_api(token,'contact_record',jsonb_build_object('request_id',extensions.gen_random_uuid(),'name','اختبار مصدر الحملة','phone','0500000333','exam','سونار','kind','whatsapp','channel','google_ads','campaign','sama_search_riyadh_202610'));
 assert r->>'ok'='true','explicit reception campaign retained';
 assert (select attribution->>'campaign' from samascan_crm.inquiries where id=(r->>'inquiry_id')::uuid)='sama_search_riyadh_202610','campaign saved for future booking measurement';
 r:=public.samascan_contact_api(token,'contact_record',jsonb_build_object('request_id',extensions.gen_random_uuid(),'name','اختبار مصدر الحملة','phone','0500000444','exam','سونار','kind','phone','channel','google_ads','campaign','invented_campaign'));
 assert r->>'code'='invalid','unrecognized manual campaign rejected';
end;$$;
rollback;
