-- Public intake writes only through a service gateway; patient data stays private.
alter table samascan_crm.inquiries
 add column booking_reference text unique,
 add column requested_date date,
 add column requested_period text check(requested_period in ('morning','afternoon','evening')),
 add column attribution jsonb not null default '{}'::jsonb;
alter table samascan_crm.tasks add column kind text not null default 'manual' check(kind in ('manual','website_intake'));
create table samascan_crm.booking_submissions (
 request_id uuid primary key,
 inquiry_id uuid not null references samascan_crm.inquiries(id),
 input_hash text not null,
 created_at timestamptz not null default now()
);
create index booking_submission_input on samascan_crm.booking_submissions(input_hash,created_at desc);
create index booking_submission_inquiry on samascan_crm.booking_submissions(inquiry_id);
create table samascan_crm.booking_limits (
 bucket text primary key, started_at timestamptz not null, hits integer not null
);
alter table samascan_crm.booking_submissions enable row level security;
alter table samascan_crm.booking_limits enable row level security;
revoke all on samascan_crm.booking_submissions,samascan_crm.booking_limits from public,anon,authenticated;
grant select,insert,update,delete on samascan_crm.booking_submissions,samascan_crm.booking_limits to service_role;

create function public.samascan_booking_intake(payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $intake$
declare
 request_key uuid; person_name text; normalized_phone text; exam_name text;
 preferred_day date; preferred_period text; attribution_data jsonb; channel text; acquisition text;
 fingerprint text; phone_digest text; bucket_name text; hit_count integer;
 person_id uuid; inquiry_key uuid; reference_code text; owner_name text;
 followup_time timestamp; today date:=(now() at time zone 'Asia/Riyadh')::date;
 existing samascan_crm.booking_submissions%rowtype;
begin
 if payload is null or jsonb_typeof(payload)<>'object' or payload->'consent' is distinct from 'true'::jsonb
  or coalesce(payload->>'company','')<>'' then return jsonb_build_object('ok',false,'code','invalid'); end if;
 request_key:=(payload->>'request_id')::uuid;
 person_name:=trim(payload->>'name'); exam_name:=payload->>'exam';
 normalized_phone:=regexp_replace(translate(payload->>'phone','٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[\s()-]','','g');
 if normalized_phone like '05%' then normalized_phone:='+966'||substr(normalized_phone,2);
 elsif normalized_phone like '00966%' then normalized_phone:='+'||substr(normalized_phone,3);
 elsif normalized_phone like '966%' then normalized_phone:='+'||normalized_phone; end if;
 preferred_day:=(payload->>'requested_date')::date; preferred_period:=payload->>'requested_period';
 attribution_data:=payload->'attribution'; channel:=attribution_data->>'channel';
 if request_key is null or person_name is null or char_length(person_name) not between 2 and 100
  or normalized_phone is null or normalized_phone !~ '^\+9665[0-9]{8}$'
  or exam_name is null or exam_name not in ('رنين مغناطيسي','سونار','دوبلر','سونار 3D / 4D')
  or preferred_day is null or preferred_day<today or preferred_day>today+60 or extract(dow from preferred_day)=5
  or preferred_period is null or preferred_period not in ('morning','afternoon','evening')
  or attribution_data is null or jsonb_typeof(attribution_data)<>'object'
  or channel is null or channel not in ('google_business_profile','google_ads','google_organic','social','referral','campaign','direct')
  or octet_length(attribution_data::text)>1800 then return jsonb_build_object('ok',false,'code','invalid'); end if;
 -- Store only bounded attribution fields; no query strings or Google click identifiers.
 attribution_data:=jsonb_build_object('channel',channel,'source',left(coalesce(attribution_data->>'source',''),128),
  'medium',left(coalesce(attribution_data->>'medium',''),128),'campaign',left(coalesce(attribution_data->>'campaign',''),128),
  'content',left(coalesce(attribution_data->>'content',''),128),'landingPage',left(split_part(coalesce(attribution_data->>'landingPage',''), '?',1),200),
  'referrerHost',left(coalesce(attribution_data->>'referrerHost',''),200));
 acquisition:=case when channel in ('google_business_profile','google_ads','google_organic') then 'google' when channel='social' then 'social' else 'website' end;
 fingerprint:=encode(extensions.digest(jsonb_build_array(person_name,normalized_phone,exam_name,preferred_day,preferred_period)::text,'sha256'),'hex');
 phone_digest:=encode(extensions.digest(normalized_phone,'sha256'),'hex');
 -- Serializes retries, duplicate detection and the small public rate-limit bucket.
 perform pg_advisory_xact_lock(hashtext('samascan-public-intake'));
 select * into existing from samascan_crm.booking_submissions where request_id=request_key;
 if found then
  if existing.input_hash<>fingerprint then return jsonb_build_object('ok',false,'code','invalid'); end if;
  select booking_reference into reference_code from samascan_crm.inquiries where id=existing.inquiry_id;
  return jsonb_build_object('ok',true,'reference',reference_code);
 end if;
 foreach bucket_name in array array['global','phone:'||phone_digest] loop
  insert into samascan_crm.booking_limits(bucket,started_at,hits) values(bucket_name,now(),1)
  on conflict(bucket) do update set
   hits=case when booking_limits.started_at<now()-interval '1 hour' then 1 else booking_limits.hits+1 end,
   started_at=case when booking_limits.started_at<now()-interval '1 hour' then now() else booking_limits.started_at end
  returning hits into hit_count;
  if hit_count>(case when bucket_name='global' then 120 else 4 end) then return jsonb_build_object('ok',false,'code','rate_limit'); end if;
 end loop;
 delete from samascan_crm.booking_limits where started_at<now()-interval '1 day';
 select s.inquiry_id into inquiry_key from samascan_crm.booking_submissions s join samascan_crm.inquiries n on n.id=s.inquiry_id
 where s.input_hash=fingerprint and s.created_at>now()-interval '30 minutes' and n.stage in ('new','contacting','waiting')
 order by s.created_at desc limit 1;
 if inquiry_key is not null then
  insert into samascan_crm.booking_submissions(request_id,inquiry_id,input_hash) values(request_key,inquiry_key,fingerprint);
  select booking_reference into reference_code from samascan_crm.inquiries where id=inquiry_key;
  return jsonb_build_object('ok',true,'reference',reference_code);
 end if;
 -- Existing contact identity and original source are preserved.
 insert into samascan_crm.contacts(name,phone,source) values(person_name,normalized_phone,acquisition)
 on conflict(phone) do update set active=true,updated_at=now(),version=contacts.version+1 returning id into person_id;
 select u.username into owner_name from samascan_auth.admins u where u.active and u.role in ('reception','admin')
 order by (u.role='reception') desc,(select count(*) from samascan_crm.tasks t where t.owner=u.username and t.status='open'),u.username limit 1;
 if owner_name is null then raise check_violation; end if;
 reference_code:='SS-'||upper(encode(extensions.gen_random_bytes(6),'hex'));
 insert into samascan_crm.inquiries(contact_id,exam,source,owner,booking_reference,requested_date,requested_period,attribution,note)
 values(person_id,exam_name,acquisition,owner_name,reference_code,preferred_day,preferred_period,attribution_data,'اسم مقدم طلب الموقع: '||person_name) returning id into inquiry_key;
 followup_time:=(now() at time zone 'Asia/Riyadh')+interval '15 minutes';
 loop
  if extract(dow from followup_time)=5 or followup_time::time>=time '21:00' then followup_time:=date_trunc('day',followup_time)+interval '1 day 9 hours';
  elsif followup_time::time<time '09:00' then followup_time:=date_trunc('day',followup_time)+interval '9 hours';
  else exit; end if;
 end loop;
 insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner,priority,kind)
 values(person_id,inquiry_key,'تأكيد طلب الموقع · '||reference_code,followup_time at time zone 'Asia/Riyadh',owner_name,'high','website_intake');
 insert into samascan_crm.booking_submissions(request_id,inquiry_id,input_hash) values(request_key,inquiry_key,fingerprint);
 insert into samascan_crm.audit(actor,action,entity,record_id) values('website','create','inquiries',inquiry_key::text);
 return jsonb_build_object('ok',true,'reference',reference_code);
exception when check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow then
 return jsonb_build_object('ok',false,'code','invalid');
end; $intake$;
revoke all on function public.samascan_booking_intake(jsonb) from public,anon,authenticated;
grant execute on function public.samascan_booking_intake(jsonb) to service_role;

create function samascan_crm.booking_outcome_guard() returns trigger
language plpgsql security invoker set search_path='' as $guard$
begin
 if new.status in ('attended','completed','no_show') and new.starts_at>now() then
  raise check_violation using message='A future appointment cannot have an attendance outcome';
 end if;
 if new.status in ('confirmed','attended','completed') and new.inquiry_id is not null then
  update samascan_crm.tasks set status='done',completed_at=now(),updated_at=now(),version=version+1
  where inquiry_id=new.inquiry_id and kind='website_intake' and status='open';
 end if;
 return new;
end; $guard$;
revoke all on function samascan_crm.booking_outcome_guard() from public,anon,authenticated;
grant execute on function samascan_crm.booking_outcome_guard() to service_role;
create trigger samascan_booking_outcome_guard before insert or update on samascan_crm.appointments
 for each row execute function samascan_crm.booking_outcome_guard();

create function public.samascan_outcome_report(session_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $report$
declare
 actor_role text; start_day date; end_day date; today date:=(now() at time zone 'Asia/Riyadh')::date; report_rows jsonb;
begin
 if session_token is null or session_token!~'^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'code','credentials'); end if;
 select u.role into actor_role from samascan_auth.sessions s join samascan_auth.admins u on u.username=s.username
 where s.token_hash=extensions.digest(session_token,'sha256') and s.expires_at>now() and u.active;
 if actor_role is null then return jsonb_build_object('ok',false,'code','credentials'); end if;
 if actor_role not in ('admin','reception') then return jsonb_build_object('ok',false,'code','forbidden'); end if;
 if action<>'source_report' or payload is null or jsonb_typeof(payload)<>'object' then return jsonb_build_object('ok',false,'code','invalid'); end if;
 start_day:=coalesce((payload->>'from')::date,today-29);end_day:=coalesce((payload->>'to')::date,today);
 if end_day<start_day or end_day-start_day>365 or end_day>today then return jsonb_build_object('ok',false,'code','invalid'); end if;
 with measured as (
  select n.id,n.source,n.exam,n.stage,coalesce(nullif(n.attribution->>'channel',''),'recorded') as channel,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status not in ('cancelled','no_show')) as booked,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status in ('attended','completed') and b.starts_at<=now()) as attended,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status='completed' and b.starts_at<=now()) as completed,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status<>'cancelled' and b.starts_at<=now()) as due,
   (select count(*) from samascan_crm.appointments b where b.inquiry_id=n.id and b.status='no_show' and b.starts_at<=now()) as no_show,
   (select count(*) from samascan_crm.appointments b where b.inquiry_id=n.id and b.status='cancelled') as cancelled
  from samascan_crm.inquiries n where n.created_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and n.created_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh')
 ), grouped as (
  select d.dimension,d.label,d.source,d.exam,d.channel,count(*) as inquiries,
   count(*) filter(where booked) as booked,count(*) filter(where attended) as attended,
   count(*) filter(where completed) as completed,count(*) filter(where due) as due,
   count(*) filter(where stage in ('new','contacting','waiting')) as open,sum(no_show) as no_show,sum(cancelled) as cancelled
  from measured m cross join lateral (values
   ('source',m.source,m.source,null::text,null::text),
   ('service',m.exam,null::text,m.exam,null::text),
   ('channel_service',m.channel||':'||m.source||':'||m.exam,m.source,m.exam,m.channel)
  )d(dimension,label,source,exam,channel) group by d.dimension,d.label,d.source,d.exam,d.channel
 ) select coalesce(jsonb_agg(to_jsonb(g) order by g.completed desc,g.inquiries desc,g.label),'[]'::jsonb) into report_rows from grouped g;
 return jsonb_build_object('ok',true,'data',jsonb_build_object('from',start_day,'to',end_day,'updatedAt',now(),
  'sources',(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(report_rows)x where x->>'dimension'='source'),
  'services',(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(report_rows)x where x->>'dimension'='service'),
  'channelServices',(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(report_rows)x where x->>'dimension'='channel_service'),
  'unlinkedAppointments',(select count(*) from samascan_crm.appointments where inquiry_id is null and starts_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and starts_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh')),
  'unresolvedDue',(select count(*) from samascan_crm.appointments where status in ('scheduled','confirmed') and starts_at<=now() and starts_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and starts_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh'))));
exception when invalid_text_representation or datetime_field_overflow then return jsonb_build_object('ok',false,'code','invalid');
end; $report$;
revoke all on function public.samascan_outcome_report(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_outcome_report(text,text,jsonb) to service_role;
