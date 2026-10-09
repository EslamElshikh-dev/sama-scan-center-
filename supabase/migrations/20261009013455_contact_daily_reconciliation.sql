-- A reception total is a reconciliation checkpoint, never a fabricated lead.
-- Counts include all acquisition sources; attribution remains on individual inquiries.
create table samascan_crm.contact_daily_totals (
 day date primary key,
 calls integer not null check(calls between 0 and 10000),
 whatsapp integer not null check(whatsapp between 0 and 10000),
 note text not null default '' check(char_length(note)<=300),
 report_origin text not null check(report_origin in ('reception','user_report')),
 recorded_by text references samascan_auth.admins(username),
 version integer not null default 1 check(version>0),
 updated_at timestamptz not null default now()
);
alter table samascan_crm.contact_daily_totals enable row level security;
revoke all on samascan_crm.contact_daily_totals from public,anon,authenticated;
grant select,insert,update,delete on samascan_crm.contact_daily_totals to service_role;

create function public.samascan_contact_daily_api(session_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor text; actor_role text; today date:=(now() at time zone 'Asia/Riyadh')::date;
 start_day date; end_day date; rows jsonb; report_day date; phone_total integer; whatsapp_total integer;
 expected_version integer; existing_version integer; new_version integer; report_note text;
begin
 if session_token is null or session_token!~'^[a-f0-9]{64}$' then
  return jsonb_build_object('ok',false,'code','credentials');end if;
 select u.username,u.role into actor,actor_role from samascan_auth.sessions s
 join samascan_auth.admins u on u.username=s.username
 where s.token_hash=extensions.digest(session_token,'sha256') and s.expires_at>now() and u.active;
 if not found then return jsonb_build_object('ok',false,'code','credentials');end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>2500 then
  return jsonb_build_object('ok',false,'code','invalid');end if;
 if action='contact_daily_report' then
  start_day:=coalesce(nullif(payload->>'from','')::date,today);
  end_day:=coalesce(nullif(payload->>'to','')::date,start_day);
  if end_day<start_day or end_day>today or start_day<today-90 or end_day-start_day>90 then
   return jsonb_build_object('ok',false,'code','invalid');end if;
  with days as (
   select start_day+offset_day as day from generate_series(0,end_day-start_day) offset_day
  ), recorded as (
   select (i.created_at at time zone 'Asia/Riyadh')::date as day,
    count(*) filter(where i.contact_method='phone') as calls,
    count(*) filter(where i.contact_method='whatsapp') as whatsapp
   from samascan_crm.inquiries i
   where i.created_at>=start_day::timestamp at time zone 'Asia/Riyadh'
    and i.created_at<(end_day+1)::timestamp at time zone 'Asia/Riyadh'
   group by 1
  ) select coalesce(jsonb_agg(jsonb_build_object(
   'day',d.day,'reported_calls',t.calls,'reported_whatsapp',t.whatsapp,
   'recorded_calls',coalesce(r.calls,0),'recorded_whatsapp',coalesce(r.whatsapp,0),
   'report_origin',t.report_origin,'note',case when actor_role in ('admin','reception') then t.note else null end,
   'updated_at',t.updated_at,'version',coalesce(t.version,0)) order by d.day desc),'[]'::jsonb)
   into rows from days d left join recorded r on r.day=d.day
   left join samascan_crm.contact_daily_totals t on t.day=d.day;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('from',start_day,'to',end_day,'days',rows));
 end if;
 if action<>'contact_daily_save' then return jsonb_build_object('ok',false,'code','invalid');end if;
 if actor_role not in ('admin','reception') then return jsonb_build_object('ok',false,'code','forbidden');end if;
 if coalesce(payload->>'day','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or jsonb_typeof(payload->'calls') is distinct from 'number'
  or jsonb_typeof(payload->'whatsapp') is distinct from 'number'
  or coalesce(payload->>'calls','')!~'^[0-9]{1,5}$'
  or coalesce(payload->>'whatsapp','')!~'^[0-9]{1,5}$'
  or coalesce(payload->>'version','')!~'^[0-9]{1,9}$'
  then return jsonb_build_object('ok',false,'code','invalid');end if;
 report_day:=(payload->>'day')::date;phone_total:=(payload->>'calls')::integer;
 whatsapp_total:=(payload->>'whatsapp')::integer;expected_version:=(payload->>'version')::integer;
 report_note:=trim(coalesce(payload->>'note',''));
 if report_day>today or report_day<today-90 or phone_total>10000 or whatsapp_total>10000 or char_length(report_note)>300 then
  return jsonb_build_object('ok',false,'code','invalid');end if;
 perform pg_advisory_xact_lock(hashtext('samascan-contact-total:'||report_day::text));
 select version into existing_version from samascan_crm.contact_daily_totals where day=report_day;
 if expected_version<>coalesce(existing_version,0) then
  return jsonb_build_object('ok',false,'code','conflict');end if;
 insert into samascan_crm.contact_daily_totals(day,calls,whatsapp,note,report_origin,recorded_by)
 values(report_day,phone_total,whatsapp_total,report_note,'reception',actor)
 on conflict(day) do update set calls=excluded.calls,whatsapp=excluded.whatsapp,note=excluded.note,
  report_origin='reception',recorded_by=actor,version=samascan_crm.contact_daily_totals.version+1,updated_at=now()
 returning version into new_version;
 return jsonb_build_object('ok',true,'version',new_version);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
 or numeric_value_out_of_range or check_violation then
 return jsonb_build_object('ok',false,'code','invalid');
end;$$;
revoke all on function public.samascan_contact_daily_api(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_contact_daily_api(text,text,jsonb) to service_role;
