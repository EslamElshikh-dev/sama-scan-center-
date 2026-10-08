-- Site intent is separate from an actual received contact and confirmed booking.
-- No patient details, IP addresses, query strings or Google click IDs in events.
create table samascan_crm.contact_events (
 event_id uuid primary key, session_id uuid not null,
 reference text not null unique check(reference ~ '^SC-[A-F0-9]{12}$'),
 kind text not null check(kind in ('phone','whatsapp')),
 cta text not null check(cta ~ '^[a-zA-Z0-9_-]{1,100}$'),
 page_path text not null check(page_path ~ '^/[a-zA-Z0-9/_-]*$' and length(page_path)<=200),
 attribution jsonb not null, created_at timestamptz not null default now(),
 inquiry_id uuid references samascan_crm.inquiries(id), confirmed_at timestamptz
);
create index contact_event_time on samascan_crm.contact_events(created_at desc);
create index contact_event_session on samascan_crm.contact_events(session_id,created_at desc);
create index contact_event_inquiry on samascan_crm.contact_events(inquiry_id) where inquiry_id is not null;
create table samascan_crm.contact_receipts (
 request_id uuid primary key, inquiry_id uuid not null references samascan_crm.inquiries(id),
 created_at timestamptz not null default now()
);
create index contact_receipt_inquiry on samascan_crm.contact_receipts(inquiry_id);
alter table samascan_crm.contact_events enable row level security;
alter table samascan_crm.contact_receipts enable row level security;
revoke all on samascan_crm.contact_events,samascan_crm.contact_receipts from public,anon,authenticated;
grant select,insert,update,delete on samascan_crm.contact_events,samascan_crm.contact_receipts to service_role;

create function public.samascan_contact_event_intake(payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare key uuid; visitor uuid; method text; path text; cta_name text; data jsonb; channel text;
 bucket_name text; hit_count integer; code text;
begin
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>3500 then
  return jsonb_build_object('ok',false,'code','invalid');end if;
 key:=(payload->>'event_id')::uuid; visitor:=(payload->>'session_id')::uuid;
 method:=payload->>'kind';path:=payload->>'page_path';cta_name:=payload->>'cta';
 data:=payload->'attribution';channel:=data->>'channel';
 if key is null or visitor is null or method is null or method not in ('phone','whatsapp')
  or path is null or path!~'^/[a-zA-Z0-9/_-]*$' or length(path)>200
  or cta_name is null or cta_name!~'^[a-zA-Z0-9_-]{1,100}$'
  or data is null or jsonb_typeof(data)<>'object' or channel is null
  or channel not in ('google_business_profile','google_ads','google_organic','social','referral','campaign','direct')
  then return jsonb_build_object('ok',false,'code','invalid');end if;
 perform pg_advisory_xact_lock(hashtext('samascan-event:'||key::text));
 if exists(select 1 from samascan_crm.contact_events where event_id=key) then return jsonb_build_object('ok',true);end if;
 -- Bound both one session and the public ingestion volume. These are not people counts.
 bucket_name:='contact-session:'||visitor::text;
 insert into samascan_crm.booking_limits(bucket,started_at,hits) values(bucket_name,now(),1)
 on conflict(bucket) do update set hits=case when samascan_crm.booking_limits.started_at<now()-interval '1 hour' then 1 else samascan_crm.booking_limits.hits+1 end,
 started_at=case when samascan_crm.booking_limits.started_at<now()-interval '1 hour' then now() else samascan_crm.booking_limits.started_at end returning hits into hit_count;
 if hit_count>30 then return jsonb_build_object('ok',false,'code','rate_limit');end if;
 insert into samascan_crm.booking_limits(bucket,started_at,hits) values('contact-global',now(),1)
 on conflict(bucket) do update set hits=case when samascan_crm.booking_limits.started_at<now()-interval '1 day' then 1 else samascan_crm.booking_limits.hits+1 end,
 started_at=case when samascan_crm.booking_limits.started_at<now()-interval '1 day' then now() else samascan_crm.booking_limits.started_at end returning hits into hit_count;
 if hit_count>5000 then return jsonb_build_object('ok',false,'code','rate_limit');end if;
 code:='SC-'||upper(left(replace(key::text,'-',''),12));
 data:=jsonb_build_object('channel',channel,'source',left(coalesce(data->>'source',''),128),
  'medium',left(coalesce(data->>'medium',''),128),'campaign',left(coalesce(data->>'campaign',''),128),
  'content',left(coalesce(data->>'content',''),128),
  'landingPage',left(split_part(coalesce(data->>'landingPage',''), '?',1),200),
  'referrerHost',left(coalesce(data->>'referrerHost',''),200));
 insert into samascan_crm.contact_events(event_id,session_id,reference,kind,cta,page_path,attribution)
 values(key,visitor,code,method,cta_name,path,data);
 delete from samascan_crm.contact_events where created_at<now()-interval '90 days' and inquiry_id is null;
 delete from samascan_crm.booking_limits where bucket like 'contact-session:%' and started_at<now()-interval '1 day';
 return jsonb_build_object('ok',true);
exception when invalid_text_representation or check_violation or unique_violation then
 return jsonb_build_object('ok',false,'code','invalid');
end;$$;
revoke all on function public.samascan_contact_event_intake(jsonb) from public,anon,authenticated;
grant execute on function public.samascan_contact_event_intake(jsonb) to service_role;

create function public.samascan_contact_api(session_token text,action text,payload jsonb default '{}'::jsonb)
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
 else attribution_data:=jsonb_build_object('channel',channel,'recordedByReception',true);end if;
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
revoke all on function public.samascan_contact_api(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_contact_api(text,text,jsonb) to service_role;
