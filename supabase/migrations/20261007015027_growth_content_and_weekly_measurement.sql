-- Sama Scan only: verified public content, measured Maps observations and aggregate GBP imports.
create schema samascan_growth;
revoke all on schema samascan_growth from public,anon,authenticated;
grant usage on schema samascan_growth to service_role;
create table samascan_growth.content (
 id text primary key check(id ~ '^[a-z0-9-]{2,100}$'),
 kind text not null check(kind in ('service','clinician','review')),
 data jsonb not null default '{}'::jsonb,
 status text not null default 'draft' check(status in ('draft','approved')),
 evidence text not null default '', confirmed_by text not null default '', confirmed_at date,
 version integer not null default 1, updated_by text not null, updated_at timestamptz not null default now()
);
create table samascan_growth.maps_observations (
 id uuid primary key default extensions.gen_random_uuid(), neighborhood text not null,
 point_label text not null, latitude numeric not null, longitude numeric not null,
 query text not null, device text not null check(device in ('mobile','desktop')), language text not null default 'ar',
 measured_at timestamptz not null, rank integer, depth integer not null,
 evidence_url text not null, method text not null, created_by text not null, created_at timestamptz not null default now(),
 check(neighborhood in ('المربع','الملز','العليا','السليمانية')),
 check(latitude between 24.3 and 25 and longitude between 46.3 and 47.2),
 check(depth between 3 and 100 and (rank is null or rank between 1 and depth))
);
create index samascan_maps_history on samascan_growth.maps_observations(neighborhood,measured_at desc);
create table samascan_growth.gbp_periods (
 date_from date primary key, date_to date not null check(date_to=date_from+6),
 calls integer not null check(calls>=0), website integer not null check(website>=0), directions integer not null check(directions>=0),
 source text not null, imported_at timestamptz not null default now(), version integer not null default 1
);
alter table samascan_growth.content enable row level security;
alter table samascan_growth.maps_observations enable row level security;
alter table samascan_growth.gbp_periods enable row level security;
revoke all on all tables in schema samascan_growth from public,anon,authenticated;
grant select,insert,update on all tables in schema samascan_growth to service_role;

alter table samascan_crm.inquiries add column contact_method text not null default 'unknown'
 check(contact_method in ('phone','whatsapp','website_form','walk_in','other','unknown'));
-- Historic records remain unknown. Only an actual form submission has a known method.
create function samascan_growth.website_method() returns trigger language plpgsql set search_path='' as $$
begin if new.booking_reference is not null then new.contact_method:='website_form';end if;return new;end;$$;
revoke all on function samascan_growth.website_method() from public,anon,authenticated;
grant execute on function samascan_growth.website_method() to service_role;
create trigger samascan_website_method before insert or update on samascan_crm.inquiries for each row execute function samascan_growth.website_method();

-- Preserve the tested CRM and its locking/version rules, extending save atomically.
alter function public.samascan_crm_api(text,text,jsonb) rename to samascan_crm_api_core;
create function public.samascan_crm_api(session_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; extended_result jsonb; method text; channel text; key uuid;
begin
 if action='save' and payload->>'entity'='inquiries' then
  method:=payload->>'contact_method';channel:=payload->>'manual_channel';
  if (method is not null and method not in ('phone','whatsapp','website_form','walk_in','other','unknown')) or
   (channel is not null and channel not in ('google_business_profile','google_ads','google_organic','social','referral','campaign','direct','unknown')) then
   return jsonb_build_object('ok',false,'code','invalid');end if;
 end if;
 result:=public.samascan_crm_api_core(session_token,action,payload);
 if result->>'ok'='true' and action='save' and payload->>'entity'='inquiries' and (method is not null or channel is not null) then
  key:=(result->'record'->>'id')::uuid;
  update samascan_crm.inquiries set contact_method=coalesce(method,contact_method),
   attribution=case when channel is null then attribution else jsonb_build_object('channel',channel,'recordedByReception',true) end
   where id=key and booking_reference is null returning to_jsonb(inquiries) into extended_result;
  if found then return jsonb_build_object('ok',true,'record',extended_result);end if;
 end if;
 return result;
end;$$;
revoke all on function public.samascan_crm_api(text,text,jsonb),public.samascan_crm_api_core(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_crm_api(text,text,jsonb),public.samascan_crm_api_core(text,text,jsonb) to service_role;

create function public.samascan_growth_api(session_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor text; actor_role text; key text; kind_name text; state text; body jsonb; v integer; existing samascan_growth.content%rowtype;
 start_day date; end_day date; result jsonb; evidence text; confirmer text; confirmed date; rank_value integer; measured timestamptz;
begin
 if session_token is null or session_token!~'^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'code','credentials');end if;
 select u.username,u.role into actor,actor_role from samascan_auth.sessions s join samascan_auth.admins u on u.username=s.username
 where s.token_hash=extensions.digest(session_token,'sha256') and s.expires_at>now() and u.active;
 if not found then return jsonb_build_object('ok',false,'code','credentials');end if;
 if action='growth_weekly' then
  if actor_role not in ('admin','reception') then return jsonb_build_object('ok',false,'code','forbidden');end if;
  start_day:=coalesce(nullif(payload->>'from','')::date,(select max(date_from) from samascan_growth.gbp_periods));end_day:=start_day+6;
  if start_day is null then return jsonb_build_object('ok',true,'data',jsonb_build_object('periods','[]'::jsonb));end if;
  select jsonb_agg(x order by x.date_from desc) into result from (
   select d::date as date_from,(d::date+6) as date_to,
    (select to_jsonb(p) from samascan_growth.gbp_periods p where p.date_from=d::date) as google,
    (select jsonb_agg(y) from (
     select coalesce(nullif(i.attribution->>'channel',''),'unknown') as channel,i.source,i.contact_method,
      count(*) as requests,
      count(*) filter(where exists(select 1 from samascan_crm.tasks t where t.inquiry_id=i.id and t.followup_outcome='reached')) as reached,
      count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=i.id and a.status not in ('cancelled','no_show'))) as booked,
      count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=i.id and a.status in ('confirmed','attended','completed'))) as confirmed,
      count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=i.id and a.starts_at<=now() and a.status in ('attended','completed'))) as attended,
      count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=i.id and a.starts_at<=now() and a.status='completed')) as completed
     from samascan_crm.inquiries i where (i.created_at at time zone 'Asia/Riyadh')::date between d::date and d::date+6
     group by 1,2,3 order by count(*) desc
    )y) as rows,
    (select count(*) from samascan_crm.appointments a where a.inquiry_id is null and (a.created_at at time zone 'Asia/Riyadh')::date between d::date and d::date+6) as unlinked
   from generate_series(start_day-7,start_day,interval '7 days') d
  )x;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('periods',result,'updatedAt',now()));
 end if;
 if actor_role<>'admin' then return jsonb_build_object('ok',false,'code','forbidden');end if;
 if action='growth_list' then
  return jsonb_build_object('ok',true,'content',coalesce((select jsonb_agg(c order by kind,id) from samascan_growth.content c),'[]'::jsonb),
   'maps',coalesce((select jsonb_agg(x) from (select * from samascan_growth.maps_observations order by measured_at desc limit 200)x),'[]'::jsonb),
   'periods',coalesce((select jsonb_agg(p order by date_from desc) from samascan_growth.gbp_periods p),'[]'::jsonb));
 elsif action='growth_content_save' then
  key:=payload->>'id';kind_name:=payload->>'kind';state:=payload->>'status';v:=(payload->>'version')::integer;
  evidence:=trim(coalesce(payload->>'evidence',''));confirmer:=trim(coalesce(payload->>'confirmed_by',''));confirmed:=nullif(payload->>'confirmed_at','')::date;
  if key is null or key!~'^[a-z0-9-]{2,100}$' or kind_name is null or kind_name not in ('service','clinician','review') or state is null or state not in ('draft','approved') or v is null or v<0 or
   char_length(evidence)>1000 or char_length(confirmer)>100 or jsonb_typeof(payload->'data') is distinct from 'object' then return jsonb_build_object('ok',false,'code','invalid');end if;
  perform pg_advisory_xact_lock(hashtext('samascan_content:'||key));
  select * into existing from samascan_growth.content where id=key for update;
  if (found and (existing.version<>v or existing.kind<>kind_name)) or (not found and v<>0) then return jsonb_build_object('ok',false,'code','conflict');end if;
  if kind_name='service' then
   if key not in ('mri-riyadh','ultrasound-riyadh','doppler-duplex-riyadh','3d-4d-ultrasound-riyadh') then return jsonb_build_object('ok',false,'code','invalid');end if;
   body:=jsonb_build_object('supportedExams',left(coalesce(payload->'data'->>'supportedExams',''),2000),'preparation',left(coalesce(payload->'data'->>'preparation',''),2000),
    'reportProcess',left(coalesce(payload->'data'->>'reportProcess',''),1500),'duration',left(coalesce(payload->'data'->>'duration',''),300),'devicePhoto',coalesce(payload->'data'->>'devicePhoto',''));
   if body->>'devicePhoto' not in ('','/mri-room-sama-scan-riyadh.webp','/mri-suite-sama-scan-riyadh.webp','/ultrasound-room-sama-scan-riyadh.webp','/ultrasound-exam-room-riyadh.webp') then return jsonb_build_object('ok',false,'code','invalid');end if;
   if state='approved' and (char_length(body->>'supportedExams')<3 or char_length(body->>'preparation')<3 or char_length(body->>'reportProcess')<3) then return jsonb_build_object('ok',false,'code','invalid');end if;
  elsif kind_name='clinician' then
   body:=jsonb_build_object('name',left(coalesce(payload->'data'->>'name',''),100),'specialty',left(coalesce(payload->'data'->>'specialty',''),150),'qualification',left(coalesce(payload->'data'->>'qualification',''),200));
   if state='approved' and (char_length(body->>'name')<3 or char_length(body->>'specialty')<3 or char_length(body->>'qualification')<3) then return jsonb_build_object('ok',false,'code','invalid');end if;
  else
   body:=jsonb_build_object('reviewerId',coalesce(payload->'data'->>'reviewerId',''),'reviewedAt',coalesce(payload->'data'->>'reviewedAt',''),'contentVersion',coalesce(payload->'data'->>'contentVersion',''));
   if state='approved' and (not exists(select 1 from samascan_growth.content where id=body->>'reviewerId' and kind='clinician' and status='approved') or
    nullif(body->>'reviewedAt','')::date is null or (body->>'reviewedAt')::date>(now() at time zone 'Asia/Riyadh')::date or body->>'contentVersion' !~ '^\d{4}-\d{2}-\d{2}$' or (body->>'reviewedAt')::date<(body->>'contentVersion')::date) then return jsonb_build_object('ok',false,'code','invalid');end if;
  end if;
  if state='approved' and (payload->'attested' is distinct from 'true'::jsonb or char_length(evidence)<5 or char_length(confirmer)<2 or confirmed is null or confirmed>(now() at time zone 'Asia/Riyadh')::date) then return jsonb_build_object('ok',false,'code','invalid');end if;
  insert into samascan_growth.content(id,kind,data,status,evidence,confirmed_by,confirmed_at,updated_by)
   values(key,kind_name,body,state,evidence,confirmer,confirmed,actor)
   on conflict(id) do update set data=excluded.data,status=excluded.status,evidence=excluded.evidence,confirmed_by=excluded.confirmed_by,confirmed_at=excluded.confirmed_at,updated_by=actor,updated_at=now(),version=existing.version+1 returning to_jsonb(content) into result;
  insert into samascan_crm.audit(actor,action,entity,record_id) values(actor,'content_'||state,'medical_content',key);
  return jsonb_build_object('ok',true,'data',result);
 elsif action='growth_maps_save' then
  measured:=(payload->>'measured_at')::timestamptz;rank_value:=nullif(payload->>'rank','')::integer;
  if measured is null or not isfinite(measured) or measured>now()+interval '5 minutes' or char_length(trim(coalesce(payload->>'query','')))<3 or char_length(payload->>'query')>200 or
   char_length(trim(coalesce(payload->>'point_label','')))<2 or char_length(payload->>'point_label')>150 or char_length(trim(coalesce(payload->>'method','')))<3 or char_length(payload->>'method')>200 or
   coalesce(payload->>'evidence_url','') !~ '^https://[^[:space:]]+$' or char_length(payload->>'evidence_url')>1000 or payload->>'language' is distinct from 'ar' then return jsonb_build_object('ok',false,'code','invalid');end if;
  insert into samascan_growth.maps_observations(neighborhood,point_label,latitude,longitude,query,device,measured_at,rank,depth,evidence_url,method,created_by)
   values(payload->>'neighborhood',trim(payload->>'point_label'),(payload->>'latitude')::numeric,(payload->>'longitude')::numeric,trim(payload->>'query'),payload->>'device',measured,rank_value,(payload->>'depth')::integer,payload->>'evidence_url',trim(payload->>'method'),actor) returning to_jsonb(maps_observations) into result;
  return jsonb_build_object('ok',true,'data',result);
 elsif action='growth_gbp_save' then
  start_day:=(payload->>'date_from')::date;end_day:=(payload->>'date_to')::date;
  if start_day is null or end_day is null or end_day<>start_day+6 or end_day>=(now() at time zone 'Asia/Riyadh')::date or char_length(trim(coalesce(payload->>'source','')))<5 or char_length(payload->>'source')>500 then return jsonb_build_object('ok',false,'code','invalid');end if;
  perform pg_advisory_xact_lock(hashtext('samascan_gbp:'||start_day::text));
  select version into v from samascan_growth.gbp_periods where date_from=start_day;
  if coalesce(v,0) is distinct from (payload->>'version')::integer then return jsonb_build_object('ok',false,'code','conflict');end if;
  insert into samascan_growth.gbp_periods(date_from,date_to,calls,website,directions,source) values(start_day,end_day,(payload->>'calls')::integer,(payload->>'website')::integer,(payload->>'directions')::integer,trim(payload->>'source'))
  on conflict(date_from) do update set calls=excluded.calls,website=excluded.website,directions=excluded.directions,source=excluded.source,imported_at=now(),version=gbp_periods.version+1;
  return jsonb_build_object('ok',true);
 end if;
 return jsonb_build_object('ok',false,'code','invalid');
exception when check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then return jsonb_build_object('ok',false,'code','invalid');
end;$$;
revoke all on function public.samascan_growth_api(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_growth_api(text,text,jsonb) to service_role;

-- This is the sole public reader: no evidence, audit, Maps or CRM data is returned.
create function public.samascan_public_content() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'data',data,'confirmedAt',confirmed_at)),'[]'::jsonb)
 from samascan_growth.content where status='approved';
$$;
revoke all on function public.samascan_public_content() from public,anon,authenticated;
grant execute on function public.samascan_public_content() to anon,authenticated,service_role;

-- Verified aggregate imports, read from the connected profile on 7 October 2026.
insert into samascan_growth.gbp_periods(date_from,date_to,calls,website,directions,source) values
 ('2026-09-20','2026-09-26',36,7,91,'Google Business Profile / Windsor.ai · locations/12265962119006335138 · استخراج 2026-10-07'),
 ('2026-09-27','2026-10-03',32,9,85,'Google Business Profile / Windsor.ai · locations/12265962119006335138 · استخراج 2026-10-07');

-- Four private worksheets, with no unverified operational claims or publication.
insert into samascan_growth.content(id,kind,data,updated_by) values
 ('mri-riyadh','service','{}','admin'),
 ('ultrasound-riyadh','service','{}','admin'),
 ('doppler-duplex-riyadh','service','{}','admin'),
 ('3d-4d-ultrasound-riyadh','service','{}','admin');
