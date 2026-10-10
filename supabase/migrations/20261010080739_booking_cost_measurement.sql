-- Campaign-scoped spend, separate from budget and contact-click conversions.
-- Unknown spend is NULL. Only fully documented periods get a booking cost.
create table samascan_crm.ad_spend_daily (
 day date primary key,
 amount numeric(12,2) not null check(amount>=0 and amount<=1000000),
 currency text not null default 'SAR' check(currency='SAR'),
 campaign_id text not null default '24332875672' check(campaign_id='24332875672'),
 evidence text not null check(char_length(evidence) between 3 and 300),
 record_origin text not null check(record_origin in ('ads_snapshot','reviewed')),
 recorded_by text references samascan_auth.admins(username),
 version integer not null default 1 check(version>0),
 updated_at timestamptz not null default now()
);
alter table samascan_crm.ad_spend_daily enable row level security;
revoke all on samascan_crm.ad_spend_daily from public,anon,authenticated;
grant select,insert,update on samascan_crm.ad_spend_daily to service_role;

create function public.samascan_booking_cost_api(session_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor text; actor_role text; today date:=(now() at time zone 'Asia/Riyadh')::date;
 start_day date; end_day date; report_day date; amount_value numeric; report_evidence text;
 expected_version integer; existing_version integer; rows jsonb; service_rows jsonb; metrics jsonb;
 covered integer; snapshot_days integer; spend numeric; booked_count integer; extra jsonb;
begin
 if session_token is null or session_token!~'^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'code','credentials');end if;
 select u.username,u.role into actor,actor_role from samascan_auth.sessions s
 join samascan_auth.admins u on u.username=s.username
 where s.token_hash=extensions.digest(session_token,'sha256') and s.expires_at>now() and u.active;
 if not found then return jsonb_build_object('ok',false,'code','credentials');end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>2500 then
  return jsonb_build_object('ok',false,'code','invalid');end if;
 if action='booking_cost_report' then
  start_day:=coalesce(nullif(payload->>'from','')::date,today-7);
  end_day:=coalesce(nullif(payload->>'to','')::date,today-1);
  if end_day<start_day or end_day>today or start_day<today-365 or end_day-start_day>89 then
   return jsonb_build_object('ok',false,'code','invalid');end if;
  with measured as (
   select i.exam,i.contact_method,i.booking_reference,
    exists(select 1 from samascan_crm.appointments a where a.inquiry_id=i.id
     and (a.status='confirmed' or (a.status in ('attended','completed') and a.starts_at<=now()))) as booked,
    exists(select 1 from samascan_crm.appointments a where a.inquiry_id=i.id and a.status in ('attended','completed') and a.starts_at<=now()) as attended,
    exists(select 1 from samascan_crm.appointments a where a.inquiry_id=i.id and a.status='completed' and a.starts_at<=now()) as completed
   from samascan_crm.inquiries i
   where i.created_at>=start_day::timestamp at time zone 'Asia/Riyadh'
    and i.created_at<(end_day+1)::timestamp at time zone 'Asia/Riyadh'
    and i.attribution->>'channel'='google_ads'
    and i.attribution->>'campaign' in ('sama_search_riyadh_202610','24332875672')
  ), grouped as (
   select exam,count(*) as inquiries,count(*) filter(where contact_method='phone') as calls,
    count(*) filter(where contact_method='whatsapp') as whatsapp,
    count(*) filter(where booking_reference is not null) as forms,
    count(*) filter(where booked) as confirmed,count(*) filter(where attended) as attended,
    count(*) filter(where completed) as completed from measured group by exam
  ) select (select jsonb_build_object('inquiries',count(*),'calls',count(*) filter(where contact_method='phone'),
   'whatsapp',count(*) filter(where contact_method='whatsapp'),'forms',count(*) filter(where booking_reference is not null),
   'confirmed',count(*) filter(where booked),'attended',count(*) filter(where attended),'completed',count(*) filter(where completed)) from measured),
   (select coalesce(jsonb_agg(to_jsonb(g) order by confirmed desc,inquiries desc,exam),'[]'::jsonb) from grouped g)
  into metrics,service_rows;
  select count(*),count(*) filter(where record_origin='ads_snapshot'),sum(amount)
   into covered,snapshot_days,spend from samascan_crm.ad_spend_daily where day between start_day and end_day;
  booked_count:=(metrics->>'confirmed')::integer;
  select jsonb_build_object(
   'unassignedAds',count(*) filter(where i.attribution->>'channel'='google_ads' and coalesce(i.attribution->>'campaign','')=''),
   'otherCampaigns',count(*) filter(where i.attribution->>'channel'='google_ads' and coalesce(i.attribution->>'campaign','')<>'' and i.attribution->>'campaign' not in ('sama_search_riyadh_202610','24332875672')),
   'unknownReceived',count(*) filter(where i.contact_method in ('phone','whatsapp') and coalesce(i.attribution->>'channel','') in ('','unknown'))
  ) into extra from samascan_crm.inquiries i
  where i.created_at>=start_day::timestamp at time zone 'Asia/Riyadh'
   and i.created_at<(end_day+1)::timestamp at time zone 'Asia/Riyadh';
  with days as (select start_day+n as day from generate_series(0,end_day-start_day)n)
  select jsonb_agg(jsonb_build_object('day',d.day,'amount',s.amount,'evidence',s.evidence,
   'origin',s.record_origin,'version',coalesce(s.version,0),'updatedAt',s.updated_at) order by d.day desc)
  into rows from days d left join samascan_crm.ad_spend_daily s on s.day=d.day;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('from',start_day,'to',end_day,'updatedAt',now(),
   'campaignId','24332875672','campaignKey','sama_search_riyadh_202610','currency','SAR',
   'days',rows,'services',service_rows,'metrics',metrics,'gaps',extra,
   'coveredDays',covered,'totalDays',end_day-start_day+1,'snapshotDays',snapshot_days,'spend',spend,
   'costPerConfirmed',case when covered=end_day-start_day+1 and end_day<today and booked_count>0 then round(spend/booked_count,2) else null end));
 end if;
 if action is distinct from 'booking_cost_save' then return jsonb_build_object('ok',false,'code','invalid');end if;
 if actor_role<>'admin' then return jsonb_build_object('ok',false,'code','forbidden');end if;
 report_day:=(payload->>'day')::date; amount_value:=(payload->>'amount')::numeric;
 expected_version:=(payload->>'version')::integer; report_evidence:=trim(payload->>'evidence');
 if report_day is null or report_day>=today or report_day<today-365 or amount_value is null
  or amount_value<0 or amount_value>1000000 or amount_value<>round(amount_value,2)
  or amount_value::text in ('NaN','Infinity','-Infinity') or expected_version is null or expected_version<0
  or report_evidence is null or char_length(report_evidence) not between 3 and 300 then
  return jsonb_build_object('ok',false,'code','invalid');end if;
 perform pg_advisory_xact_lock(hashtext('samascan-spend:'||report_day::text));
 select version into existing_version from samascan_crm.ad_spend_daily where day=report_day;
 if expected_version<>coalesce(existing_version,0) then return jsonb_build_object('ok',false,'code','conflict');end if;
 insert into samascan_crm.ad_spend_daily(day,amount,evidence,record_origin,recorded_by)
 values(report_day,amount_value,report_evidence,'reviewed',actor)
 on conflict(day) do update set amount=excluded.amount,evidence=excluded.evidence,record_origin='reviewed',
  recorded_by=actor,version=samascan_crm.ad_spend_daily.version+1,updated_at=now();
 insert into samascan_crm.audit(actor,action,entity,record_id) values(actor,'save','ad_spend_daily',report_day::text);
 return jsonb_build_object('ok',true);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
 or numeric_value_out_of_range or check_violation then return jsonb_build_object('ok',false,'code','invalid');
end;$$;
revoke all on function public.samascan_booking_cost_api(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_booking_cost_api(text,text,jsonb) to service_role;

-- Reception records an explicitly confirmed campaign; event attribution stays authoritative.
create or replace function public.samascan_contact_api(session_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor text; actor_role text; start_day date; end_day date; start_time timestamptz; end_time timestamptz;
 metrics jsonb; rows jsonb; recent jsonb; request_key uuid; person_id uuid; inquiry_key uuid;
 person_name text; normalized_phone text; exam_name text; method text; channel text; reference_code text;
 event samascan_crm.contact_events%rowtype; result jsonb; attribution_data jsonb; followup_time timestamp;
begin
 if session_token is null or session_token!~'^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'code','credentials');end if;
 select u.username,u.role into actor,actor_role from samascan_auth.sessions s join samascan_auth.admins u on u.username=s.username
 where s.token_hash=extensions.digest(session_token,'sha256') and s.expires_at>now() and u.active;
 if not found then return jsonb_build_object('ok',false,'code','credentials');end if;
 if payload is null or jsonb_typeof(payload)<>'object' then return jsonb_build_object('ok',false,'code','invalid');end if;
 if action='contact_metrics' then
  start_day:=coalesce(nullif(payload->>'from','')::date,(now() at time zone 'Asia/Riyadh')::date);
  end_day:=coalesce(nullif(payload->>'to','')::date,start_day);
  if end_day<start_day or end_day-start_day>90 then return jsonb_build_object('ok',false,'code','invalid');end if;
  start_time:=start_day::timestamp at time zone 'Asia/Riyadh';end_time:=(end_day+1)::timestamp at time zone 'Asia/Riyadh';
  with clicks as (
   select attribution->>'channel' as channel,count(*) filter(where kind='phone') as phone_clicks,
    count(*) filter(where kind='whatsapp') as whatsapp_clicks,
    count(distinct session_id) filter(where kind='phone') as phone_sessions,
    count(distinct session_id) filter(where kind='whatsapp') as whatsapp_sessions
   from samascan_crm.contact_events where created_at>=start_time and created_at<end_time group by 1
  ), outcomes as (
   select coalesce(nullif(i.attribution->>'channel',''),'unknown') as channel,
    count(*) filter(where i.contact_method='phone') as confirmed_calls,
    count(*) filter(where i.contact_method='whatsapp') as confirmed_whatsapp,
    count(*) filter(where i.booking_reference is not null) as booking_requests,
    count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=i.id and a.status in ('confirmed','attended','completed'))) as booked,
    count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=i.id and a.status in ('attended','completed'))) as attended
   from samascan_crm.inquiries i where i.created_at>=start_time and i.created_at<end_time group by 1
  ) select coalesce(jsonb_agg(jsonb_build_object('channel',coalesce(c.channel,o.channel),
   'phone_clicks',coalesce(c.phone_clicks,0),'whatsapp_clicks',coalesce(c.whatsapp_clicks,0),
   'phone_sessions',coalesce(c.phone_sessions,0),'whatsapp_sessions',coalesce(c.whatsapp_sessions,0),
   'confirmed_calls',coalesce(o.confirmed_calls,0),'confirmed_whatsapp',coalesce(o.confirmed_whatsapp,0),
   'booking_requests',coalesce(o.booking_requests,0),'booked',coalesce(o.booked,0),'attended',coalesce(o.attended,0)) order by coalesce(c.channel,o.channel)),'[]'::jsonb)
   into rows from clicks c full join outcomes o on c.channel=o.channel;
  select jsonb_build_object('phone_clicks',coalesce(sum((x->>'phone_clicks')::integer),0),
   'whatsapp_clicks',coalesce(sum((x->>'whatsapp_clicks')::integer),0),
   'phone_sessions',coalesce(sum((x->>'phone_sessions')::integer),0),'whatsapp_sessions',coalesce(sum((x->>'whatsapp_sessions')::integer),0),
   'confirmed_calls',coalesce(sum((x->>'confirmed_calls')::integer),0),'confirmed_whatsapp',coalesce(sum((x->>'confirmed_whatsapp')::integer),0),
   'booking_requests',coalesce(sum((x->>'booking_requests')::integer),0),'booked',coalesce(sum((x->>'booked')::integer),0),
   'attended',coalesce(sum((x->>'attended')::integer),0)) into metrics from jsonb_array_elements(rows)x;
  metrics:=metrics||jsonb_build_object(
   'phone_sessions',(select count(distinct session_id) from samascan_crm.contact_events where kind='phone' and created_at>=start_time and created_at<end_time),
   'whatsapp_sessions',(select count(distinct session_id) from samascan_crm.contact_events where kind='whatsapp' and created_at>=start_time and created_at<end_time));
  select coalesce(jsonb_agg(x order by x.created_at desc),'[]'::jsonb) into recent from (
   select created_at,kind,reference,page_path,attribution->>'channel' as channel,attribution->>'campaign' as campaign,
    (inquiry_id is not null) as confirmed from samascan_crm.contact_events
   where created_at>=start_time and created_at<end_time order by created_at desc limit 20
  )x;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('from',start_day,'to',end_day,'updatedAt',now(),
   'metrics',metrics,'sources',rows,'recent',recent,'channels',jsonb_build_object('website','connected','whatsapp','manual','phone','manual')));
 end if;
 if action<>'contact_record' then return jsonb_build_object('ok',false,'code','invalid');end if;
 if actor_role not in ('admin','reception') then return jsonb_build_object('ok',false,'code','forbidden');end if;
 request_key:=(payload->>'request_id')::uuid;
 person_name:=trim(payload->>'name');exam_name:=payload->>'exam';method:=payload->>'kind';
 channel:=coalesce(nullif(payload->>'channel',''),'unknown');reference_code:=upper(nullif(trim(payload->>'reference'),''));
 normalized_phone:=regexp_replace(translate(payload->>'phone','٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[\s()-]','','g');
 if normalized_phone like '05%' then normalized_phone:='+966'||substr(normalized_phone,2);
 elsif normalized_phone like '00966%' then normalized_phone:='+'||substr(normalized_phone,3);
 elsif normalized_phone like '966%' then normalized_phone:='+'||normalized_phone;end if;
 if request_key is null or person_name is null or char_length(person_name) not between 2 and 100
  or normalized_phone is null or normalized_phone!~'^\+9665[0-9]{8}$' or exam_name is null
  or exam_name not in ('رنين مغناطيسي','سونار','دوبلر','سونار 3D / 4D')
  or method is null or method not in ('phone','whatsapp')
  or channel not in ('google_business_profile','google_ads','google_organic','social','referral','campaign','direct','unknown')
  or (reference_code is not null and reference_code!~'^SC-[A-F0-9]{12}$')
  then return jsonb_build_object('ok',false,'code','invalid');end if;
 perform pg_advisory_xact_lock(hashtext('samascan-receipt:'||request_key::text));
 select inquiry_id into inquiry_key from samascan_crm.contact_receipts where request_id=request_key;
 if found then return jsonb_build_object('ok',true,'inquiry_id',inquiry_key);end if;
 if reference_code is not null then
  select * into event from samascan_crm.contact_events where reference=reference_code for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found');end if;
  if event.inquiry_id is not null then return jsonb_build_object('ok',false,'code','duplicate');end if;
  if event.kind<>method then return jsonb_build_object('ok',false,'code','invalid');end if;
  attribution_data:=event.attribution;
 else
  if coalesce(payload->>'campaign','') not in ('','sama_search_riyadh_202610') then
   return jsonb_build_object('ok',false,'code','invalid');end if;
  attribution_data:=jsonb_build_object('channel',channel,'recordedByReception',true,
   'campaign',case when channel='google_ads' then coalesce(payload->>'campaign','') else '' end);
 end if;
 perform pg_advisory_xact_lock(hashtext('samascan-contact-phone:'||normalized_phone));
 select id into person_id from samascan_crm.contacts where phone=normalized_phone;
 if not found then
  person_id:=extensions.gen_random_uuid();
  result:=public.samascan_crm_api(session_token,'save',jsonb_build_object('entity','contacts','id',person_id,'version',0,'name',person_name,'phone',normalized_phone,'source',method));
  if result->>'ok' is distinct from 'true' then raise exception 'invalid_contact' using errcode='22023';end if;
 end if;
 inquiry_key:=extensions.gen_random_uuid();
 result:=public.samascan_crm_api(session_token,'save',jsonb_build_object('entity','inquiries','id',inquiry_key,'version',0,
  'contact_id',person_id,'exam',exam_name,'source',method,'stage','new','owner',actor,'contact_method',method,
  'manual_channel',channel,'note','تواصل فعلي سجله الاستقبال'||case when reference_code is null then '' else ' · '||reference_code end));
 if result->>'ok' is distinct from 'true' then raise exception 'invalid_inquiry' using errcode='22023';end if;
 update samascan_crm.inquiries set attribution=attribution_data where id=inquiry_key;
 followup_time:=(now() at time zone 'Asia/Riyadh')+interval '15 minutes';
 if followup_time::time<time '09:00' then followup_time:=followup_time::date+time '09:00';
 elsif followup_time::time>=time '21:00' then followup_time:=(followup_time::date+1)+time '09:00';end if;
 if extract(dow from followup_time)=5 then followup_time:=(followup_time::date+1)+time '09:00';end if;
 result:=public.samascan_crm_api(session_token,'save',jsonb_build_object('entity','tasks','id',extensions.gen_random_uuid(),'version',0,
  'contact_id',person_id,'inquiry_id',inquiry_key,'title','متابعة التواصل وتأكيد موعد الفحص','due_at',followup_time at time zone 'Asia/Riyadh',
  'owner',actor,'priority','high','status','open'));
 if result->>'ok' is distinct from 'true' then raise exception 'invalid_task' using errcode='22023';end if;
 insert into samascan_crm.contact_receipts(request_id,inquiry_id) values(request_key,inquiry_key);
 if reference_code is not null then update samascan_crm.contact_events set inquiry_id=inquiry_key,confirmed_at=now() where event_id=event.event_id;end if;
 return jsonb_build_object('ok',true,'inquiry_id',inquiry_key);
exception when invalid_text_representation or datetime_field_overflow or invalid_parameter_value or check_violation then
 return jsonb_build_object('ok',false,'code','invalid');
end;$$;
