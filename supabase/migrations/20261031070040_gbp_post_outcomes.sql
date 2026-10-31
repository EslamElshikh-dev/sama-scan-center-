-- Aggregate existing request attribution; no new tables, patient fields or permissions.
create or replace function public.samascan_outcome_report(session_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $report$
declare
 actor_role text; start_day date; end_day date; today date:=(now() at time zone 'Asia/Riyadh')::date;
 report_rows jsonb; pipeline jsonb;
begin
 if session_token is null or session_token!~'^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'code','credentials');end if;
 select u.role into actor_role from samascan_auth.sessions s join samascan_auth.admins u on u.username=s.username
 where s.token_hash=extensions.digest(session_token,'sha256') and s.expires_at>now() and u.active;
 if actor_role is null then return jsonb_build_object('ok',false,'code','credentials');end if;
 if actor_role not in ('admin','reception') then return jsonb_build_object('ok',false,'code','forbidden');end if;
 if action is distinct from 'source_report' or payload is null or jsonb_typeof(payload)<>'object' then return jsonb_build_object('ok',false,'code','invalid');end if;
 start_day:=coalesce(nullif(payload->>'from','')::date,today-29);end_day:=coalesce(nullif(payload->>'to','')::date,today);
 if end_day<start_day or end_day-start_day>365 or end_day>today then return jsonb_build_object('ok',false,'code','invalid');end if;
 with measured as (
  select n.id,n.source,n.exam,n.stage,n.created_at<=now()-interval '7 days' as older,
   coalesce(nullif(n.attribution->>'channel',''),'recorded') as channel,
   coalesce(n.attribution->>'campaign','') as campaign,coalesce(n.attribution->>'content','') as content,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and (b.status='confirmed' or b.status in ('attended','completed') and b.starts_at<=now())) as confirmed,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status not in ('cancelled','no_show')) as booked,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status in ('attended','completed') and b.starts_at<=now()) as attended,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status='completed' and b.starts_at<=now()) as completed,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status<>'cancelled' and b.starts_at<=now()) as due,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status in ('scheduled','confirmed') and b.starts_at>now()) as future_booking,
   exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status in ('scheduled','confirmed') and b.starts_at<=now()) as needs_outcome,
   (select b.status from samascan_crm.appointments b where b.inquiry_id=n.id order by b.created_at desc,b.id desc limit 1) as last_booking_status,
   (select count(*) from samascan_crm.appointments b where b.inquiry_id=n.id and b.status='no_show' and b.starts_at<=now()) as no_show,
   (select count(*) from samascan_crm.appointments b where b.inquiry_id=n.id and b.status='cancelled') as cancelled
  from samascan_crm.inquiries n where n.created_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and n.created_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh')
 ), classified as (
  select m.*,case when completed then 'completed' when attended then 'awaiting_exam' when future_booking then 'future_booking'
   when needs_outcome then 'needs_outcome' when last_booking_status='no_show' then 'no_show'
   when last_booking_status='cancelled' or stage='cancelled' then 'cancelled' else 'needs_booking' end as pipeline_state from measured m
 ), grouped as (
  select d.dimension,d.label,d.source,d.exam,d.channel,d.campaign,d.content,count(*) as inquiries,
   count(*) filter(where confirmed) as confirmed,
   count(*) filter(where booked) as booked,count(*) filter(where attended) as attended,
   count(*) filter(where completed) as completed,count(*) filter(where due) as due,
   count(*) filter(where stage in ('new','contacting','waiting')) as open,sum(no_show) as no_show,sum(cancelled) as cancelled,
   count(*) filter(where older) as older,count(*) filter(where older and completed) as "olderCompleted",
   count(*) filter(where pipeline_state='future_booking') as future,
   count(*) filter(where pipeline_state='awaiting_exam') as "awaitingExam",
   count(*) filter(where pipeline_state='needs_outcome') as unresolved
  from classified m cross join lateral (
   select * from (values
    ('source',m.source,m.source,null::text,null::text,null::text,null::text),
    ('service',m.exam,null::text,m.exam,null::text,null::text,null::text),
    ('channel_service',m.channel||':'||m.source||':'||m.exam,m.source,m.exam,m.channel,null::text,null::text)
   )base(dimension,label,source,exam,channel,campaign,content)
   union all
   select 'google_business_content',jsonb_build_array(m.campaign,m.content)::text,null::text,null::text,m.channel,m.campaign,m.content
   where m.channel='google_business_profile'
  )d(dimension,label,source,exam,channel,campaign,content) group by d.dimension,d.label,d.source,d.exam,d.channel,d.campaign,d.content
 ) select (select coalesce(jsonb_agg(to_jsonb(g) order by g.completed desc,g.inquiries desc,g.label),'[]'::jsonb) from grouped g),
  (select jsonb_build_object('completed',count(*) filter(where pipeline_state='completed'),
   'awaiting_exam',count(*) filter(where pipeline_state='awaiting_exam'),'future_booking',count(*) filter(where pipeline_state='future_booking'),
   'needs_outcome',count(*) filter(where pipeline_state='needs_outcome'),'no_show',count(*) filter(where pipeline_state='no_show'),
   'cancelled',count(*) filter(where pipeline_state='cancelled'),'needs_booking',count(*) filter(where pipeline_state='needs_booking')) from classified)
 into report_rows,pipeline;
 return jsonb_build_object('ok',true,'data',jsonb_build_object('from',start_day,'to',end_day,'updatedAt',now(),'olderDays',7,'pipeline',pipeline,
  'sources',(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(report_rows)x where x->>'dimension'='source'),
  'services',(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(report_rows)x where x->>'dimension'='service'),
  'channelServices',(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(report_rows)x where x->>'dimension'='channel_service'),
  'googleBusinessContent',(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(report_rows)x where x->>'dimension'='google_business_content'),
  'unlinkedAppointments',(select count(*) from samascan_crm.appointments where inquiry_id is null and starts_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and starts_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh')),
  'unresolvedDue',(select count(*) from samascan_crm.appointments where status in ('scheduled','confirmed') and starts_at<=now() and starts_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and starts_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh'))));
exception when invalid_text_representation or datetime_field_overflow then return jsonb_build_object('ok',false,'code','invalid');
end;$report$;
revoke all on function public.samascan_outcome_report(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_outcome_report(text,text,jsonb) to service_role;

