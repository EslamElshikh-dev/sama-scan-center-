-- Human-recorded followup outcomes. Existing completed tasks keep their original meaning.
alter table samascan_crm.tasks
 add column followup_outcome text check(followup_outcome in ('reached','no_answer','needs_time','declined')),
 add column outcome_note text not null default '' check(char_length(outcome_note)<=500),
 add constraint samascan_followup_result_completed check(followup_outcome is null or (status='done' and completed_at is not null));

create function samascan_crm.followup_result_guard() returns trigger
language plpgsql security invoker set search_path='' as $guard$
begin
 if old.followup_outcome is not null and (new.followup_outcome is distinct from old.followup_outcome or
  new.outcome_note is distinct from old.outcome_note or new.completed_at is distinct from old.completed_at or
  new.contact_id is distinct from old.contact_id or new.inquiry_id is distinct from old.inquiry_id) then
  raise check_violation using message='A recorded followup attempt cannot be reassigned or rewritten';
 end if;
 return new;
end;$guard$;
revoke all on function samascan_crm.followup_result_guard() from public,anon,authenticated;
grant execute on function samascan_crm.followup_result_guard() to service_role;
create trigger samascan_followup_result_guard before update on samascan_crm.tasks
 for each row execute function samascan_crm.followup_result_guard();

create function public.samascan_followup_api(session_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $followup$
declare
 actor text; actor_role text; inquiry_key uuid; task_key uuid; inquiry_expected integer; task_expected integer;
 i samascan_crm.inquiries%rowtype; t samascan_crm.tasks%rowtype;
 result_row jsonb; next_row jsonb; outcome text; result_note text; next_step text; next_time timestamptz;
 local_time timestamp; owner_name text; has_booking boolean; next_stage text;
begin
 if session_token is null or session_token!~'^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'code','credentials');end if;
 select u.username,u.role into actor,actor_role from samascan_auth.sessions s join samascan_auth.admins u on u.username=s.username
 where s.token_hash=extensions.digest(session_token,'sha256') and s.expires_at>now() and u.active;
 if not found then return jsonb_build_object('ok',false,'code','credentials');end if;
 if actor_role not in ('admin','reception') then return jsonb_build_object('ok',false,'code','forbidden');end if;
 if payload is null or jsonb_typeof(payload)<>'object' then return jsonb_build_object('ok',false,'code','invalid');end if;

 if action='followup_context' then
  select * into t from samascan_crm.tasks where id=(payload->>'task_id')::uuid;
  if not found then return jsonb_build_object('ok',false,'code','not_found');end if;
  if t.status<>'open' or t.inquiry_id is null then return jsonb_build_object('ok',false,'code','conflict');end if;
  select * into i from samascan_crm.inquiries where id=t.inquiry_id;
  select to_jsonb(i)||jsonb_build_object('contact_name',c.name,'phone',c.phone) into result_row from samascan_crm.contacts c where c.id=i.contact_id;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('inquiry',result_row,'task',to_jsonb(t)));
 end if;
 if action is distinct from 'record_followup' then return jsonb_build_object('ok',false,'code','invalid');end if;
 inquiry_key:=(payload->>'inquiry_id')::uuid;inquiry_expected:=(payload->>'inquiry_version')::integer;
 task_key:=nullif(payload->>'task_id','')::uuid;task_expected:=(payload->>'task_version')::integer;
 outcome:=payload->>'outcome';result_note:=trim(coalesce(payload->>'outcome_note',''));next_step:=payload->>'next_step';
 if inquiry_key is null or inquiry_expected is null or inquiry_expected<1 or outcome is null or
  outcome not in ('reached','no_answer','needs_time','declined') or next_step is null or next_step not in ('followup','done') or
  char_length(result_note)>500 or (outcome in ('reached','declined') and char_length(result_note)<2) or
  (task_key is not null and (task_expected is null or task_expected<1)) or
  (outcome in ('no_answer','needs_time') and next_step<>'followup') or
  (outcome='declined' and next_step<>'done') then return jsonb_build_object('ok',false,'code','invalid');end if;

 -- Match the booking/link lock order and check every version before making changes.
 perform pg_advisory_xact_lock(hashtext(inquiry_key::text));
 select * into i from samascan_crm.inquiries where id=inquiry_key for update;
 if not found then return jsonb_build_object('ok',false,'code','not_found');end if;
 if i.version<>inquiry_expected then return jsonb_build_object('ok',false,'code','conflict');end if;
 if task_key is not null then
  select * into t from samascan_crm.tasks where id=task_key for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found');end if;
  if t.version<>task_expected or t.status<>'open' then return jsonb_build_object('ok',false,'code','conflict');end if;
  if t.inquiry_id is distinct from inquiry_key or t.contact_id is distinct from i.contact_id then
   return jsonb_build_object('ok',false,'code','invalid');end if;
 elsif exists(select 1 from samascan_crm.tasks where inquiry_id=inquiry_key and status='open') then
  return jsonb_build_object('ok',false,'code','followup_exists');
 end if;
 select exists(select 1 from samascan_crm.appointments where inquiry_id=inquiry_key and status not in ('cancelled','no_show')) into has_booking;
 if outcome='declined' and has_booking then return jsonb_build_object('ok',false,'code','linked_booking');end if;
 if next_step='followup' then
  next_time:=(payload->>'next_due_at')::timestamptz;local_time:=next_time at time zone 'Asia/Riyadh';
  if next_time is null or not isfinite(next_time) or next_time<=now() or next_time>now()+interval '90 days' or
   extract(dow from local_time)=5 or local_time::time<time '09:00' or local_time::time>=time '21:00' then
   return jsonb_build_object('ok',false,'code','followup_time');end if;
  owner_name:=nullif(payload->>'owner','');
  if owner_name is null then return jsonb_build_object('ok',false,'code','invalid');end if;
  perform 1 from samascan_auth.admins where username=owner_name and active and role in ('admin','reception') for share;
  if not found then return jsonb_build_object('ok',false,'code','invalid');end if;
  if exists(select 1 from samascan_crm.tasks where inquiry_id=inquiry_key and status='open' and id is distinct from task_key) then
   return jsonb_build_object('ok',false,'code','followup_exists');end if;
 elsif outcome<>'declined' and i.stage in ('new','contacting','waiting') and not has_booking and
  not exists(select 1 from samascan_crm.tasks x join samascan_auth.admins u on u.username=x.owner
   where x.inquiry_id=inquiry_key and x.id is distinct from task_key and x.status='open' and x.due_at>now() and u.active and u.role in ('admin','reception')) then
  return jsonb_build_object('ok',false,'code','next_required');
 end if;

 if task_key is null then
  insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner,status,completed_at,followup_outcome,outcome_note)
  values(i.contact_id,i.id,'نتيجة متابعة طلب '||left(i.exam,100),now(),actor,'done',now(),outcome,result_note) returning to_jsonb(tasks) into result_row;
 else
  update samascan_crm.tasks set status='done',completed_at=now(),followup_outcome=outcome,outcome_note=result_note,
   updated_at=now(),version=version+1 where id=task_key returning to_jsonb(tasks) into result_row;
 end if;
 if next_step='followup' then
  insert into samascan_crm.tasks(contact_id,inquiry_id,title,due_at,owner,priority,kind)
  values(i.contact_id,i.id,'متابعة طلب '||left(i.exam,100),next_time,owner_name,'high',coalesce(t.kind,'manual')) returning to_jsonb(tasks) into next_row;
  insert into samascan_crm.audit(actor,action,entity,record_id) values(actor,'followup_next','tasks',next_row->>'id');
 end if;
 next_stage:=case when outcome='declined' then 'cancelled' when i.stage in ('new','contacting','waiting') and not has_booking then
  case when outcome in ('no_answer','needs_time') then 'waiting' when i.stage='new' then 'contacting' else i.stage end else i.stage end;
 update samascan_crm.inquiries set stage=next_stage,owner=case when next_step='followup' then owner_name else owner end,
  updated_at=now(),version=version+1 where id=inquiry_key;
 insert into samascan_crm.audit(actor,action,entity,record_id) values
  (actor,'followup_result','tasks',result_row->>'id'),(actor,'followup_result','inquiries',inquiry_key::text);
 return jsonb_build_object('ok',true,'data',jsonb_build_object('task',result_row,'next_task',next_row,'inquiry_id',inquiry_key,'inquiry_version',i.version+1));
exception
 when unique_violation then return jsonb_build_object('ok',false,'code','duplicate');
 when check_violation or not_null_violation or foreign_key_violation or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
  return jsonb_build_object('ok',false,'code','invalid');
end;$followup$;
revoke all on function public.samascan_followup_api(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_followup_api(text,text,jsonb) to service_role;

-- Outcomes are a request cohort; current pipeline states form a disjoint partition.
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
  select d.dimension,d.label,d.source,d.exam,d.channel,count(*) as inquiries,
   count(*) filter(where booked) as booked,count(*) filter(where attended) as attended,
   count(*) filter(where completed) as completed,count(*) filter(where due) as due,
   count(*) filter(where stage in ('new','contacting','waiting')) as open,sum(no_show) as no_show,sum(cancelled) as cancelled,
   count(*) filter(where older) as older,count(*) filter(where older and completed) as "olderCompleted",
   count(*) filter(where pipeline_state='future_booking') as future,
   count(*) filter(where pipeline_state='awaiting_exam') as "awaitingExam",
   count(*) filter(where pipeline_state='needs_outcome') as unresolved
  from classified m cross join lateral (values
   ('source',m.source,m.source,null::text,null::text),
   ('service',m.exam,null::text,m.exam,null::text),
   ('channel_service',m.channel||':'||m.source||':'||m.exam,m.source,m.exam,m.channel)
  )d(dimension,label,source,exam,channel) group by d.dimension,d.label,d.source,d.exam,d.channel
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
  'unlinkedAppointments',(select count(*) from samascan_crm.appointments where inquiry_id is null and starts_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and starts_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh')),
  'unresolvedDue',(select count(*) from samascan_crm.appointments where status in ('scheduled','confirmed') and starts_at<=now() and starts_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and starts_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh'))));
exception when invalid_text_representation or datetime_field_overflow then return jsonb_build_object('ok',false,'code','invalid');
end;$report$;
revoke all on function public.samascan_outcome_report(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_outcome_report(text,text,jsonb) to service_role;

-- Match the physician profile with the completed examinations in its report.
create or replace function public.samascan_referral_api(session_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $referral$
declare
 actor text; actor_role text; rec_id uuid; expected integer; physician_id_filter uuid;
 owner_name text; status_filter text:=nullif(payload->>'status','');
 q text:='%'||left(trim(coalesce(payload->>'search','')),100)||'%';
 page_no integer:=greatest(1,least(coalesce((payload->>'page')::integer,1),10000));
 rows jsonb; result_row jsonb; staff jsonb; totals jsonb; total bigint;
 start_day date; end_day date; cutoff_days integer; cutoff_at timestamptz;
 today date:=(now() at time zone 'Asia/Riyadh')::date;
 p samascan_referrals.physicians%rowtype;
 v samascan_referrals.visits%rowtype;
begin
 if session_token is null or session_token!~'^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'code','credentials'); end if;
 select u.username,u.role into actor,actor_role from samascan_auth.sessions s join samascan_auth.admins u on u.username=s.username
 where s.token_hash=extensions.digest(session_token,'sha256') and s.expires_at>now() and u.active;
 if actor is null then return jsonb_build_object('ok',false,'code','credentials'); end if;
 if payload is null or jsonb_typeof(payload)<>'object' then return jsonb_build_object('ok',false,'code','invalid'); end if;

 -- Reception needs only identifiers and labels to attribute an inquiry. No visits or marketing notes.
 if action='physician_options' then
  rec_id:=nullif(payload->>'id','')::uuid;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (
   select d.id,d.name,d.specialty,d.institution,d.active from samascan_referrals.physicians d
   where (rec_id is not null and d.id=rec_id) or (rec_id is null and d.active and (d.name ilike q or d.institution ilike q or d.specialty ilike q))
   order by d.name,d.id limit 50
  )x;
  return jsonb_build_object('ok',true,'rows',rows);
 end if;
 if actor_role not in ('admin','marketing') then return jsonb_build_object('ok',false,'code','forbidden'); end if;
 select coalesce(jsonb_agg(x),'[]'::jsonb) into staff from (
  select username,display_name,role from samascan_auth.admins where active and role in ('admin','marketing') order by display_name,username
 )x;

 if action='physician_list' then
  if status_filter is not null and status_filter not in ('active','archived','overdue') then return jsonb_build_object('ok',false,'code','invalid'); end if;
  select count(*) into total from samascan_referrals.physicians d
  where (d.name ilike q or d.institution ilike q or d.specialty ilike q or d.district ilike q)
   and (status_filter is null or (status_filter='active' and d.active) or (status_filter='archived' and not d.active) or
    (status_filter='overdue' and exists(select 1 from samascan_referrals.visits x where x.physician_id=d.id and x.followup_status='open' and x.next_followup_at<now())));
  select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (
   select d.*,(select max(x.visited_at) from samascan_referrals.visits x where x.physician_id=d.id) as last_visit_at,
    (select min(x.next_followup_at) from samascan_referrals.visits x where x.physician_id=d.id and x.followup_status='open') as next_followup_at,
    (select count(*) from samascan_referrals.visits x where x.physician_id=d.id and x.followup_status='open') as open_followups
   from samascan_referrals.physicians d
   where (d.name ilike q or d.institution ilike q or d.specialty ilike q or d.district ilike q)
    and (status_filter is null or (status_filter='active' and d.active) or (status_filter='archived' and not d.active) or
     (status_filter='overdue' and exists(select 1 from samascan_referrals.visits z where z.physician_id=d.id and z.followup_status='open' and z.next_followup_at<now())))
   order by d.created_at desc,d.id limit 50 offset (page_no-1)*50
  )x;
  return jsonb_build_object('ok',true,'rows',rows,'total',total,'page',page_no,'staff',staff);
 end if;

 if action='visit_list' then
  physician_id_filter:=nullif(payload->>'physician_id','')::uuid;
  if status_filter is not null and status_filter not in ('open','overdue','done','mine') then return jsonb_build_object('ok',false,'code','invalid'); end if;
  select count(*) into total from samascan_referrals.visits x join samascan_referrals.physicians d on d.id=x.physician_id
  where (physician_id_filter is null or x.physician_id=physician_id_filter)
   and (d.name ilike q or d.institution ilike q)
   and (status_filter is null or (status_filter='open' and x.followup_status='open') or (status_filter='done' and x.followup_status='done') or
    (status_filter='overdue' and x.followup_status='open' and x.next_followup_at<now()) or (status_filter='mine' and x.owner=actor));
  select coalesce(jsonb_agg(z),'[]'::jsonb) into rows from (
   select x.*,d.name as physician_name,d.institution from samascan_referrals.visits x join samascan_referrals.physicians d on d.id=x.physician_id
   where (physician_id_filter is null or x.physician_id=physician_id_filter)
    and (d.name ilike q or d.institution ilike q)
    and (status_filter is null or (status_filter='open' and x.followup_status='open') or (status_filter='done' and x.followup_status='done') or
     (status_filter='overdue' and x.followup_status='open' and x.next_followup_at<now()) or (status_filter='mine' and x.owner=actor))
   order by case when status_filter in ('open','overdue') then x.next_followup_at end,x.visited_at desc,x.id limit 50 offset (page_no-1)*50
  )z;
  return jsonb_build_object('ok',true,'rows',rows,'total',total,'page',page_no,'staff',staff);
 end if;

 if action='physician_detail' then
  rec_id:=(payload->>'id')::uuid;
  select * into p from samascan_referrals.physicians where id=rec_id;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  -- Explicit aggregate projection: never return patients, inquiries, exams, appointment rows or patient notes.
  select jsonb_build_object('referrals',count(*),
   'booked',count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=n.id and a.status not in ('cancelled','no_show'))),
   'attended',count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=n.id and a.status in ('attended','completed') and a.starts_at<=now())),
   'completed',count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=n.id and a.status='completed' and a.starts_at<=now())),
   'last_referral_at',max(n.created_at)) into totals from samascan_crm.inquiries n where n.referring_physician_id=rec_id;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (
   select * from samascan_referrals.visits where physician_id=rec_id order by visited_at desc,id limit 50
  )x;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('physician',to_jsonb(p),'visits',rows,'stats',totals),'staff',staff);
 end if;

 if action='physician_report' then
  start_day:=coalesce(nullif(payload->>'from','')::date,today-29);end_day:=coalesce(nullif(payload->>'to','')::date,today);
  cutoff_days:=coalesce((payload->>'dormant_days')::integer,60);
  if end_day<start_day or end_day>today or end_day-start_day>365 or cutoff_days not in (30,60,90) or
   (status_filter is not null and status_filter not in ('dormant','never','recent','archived')) then return jsonb_build_object('ok',false,'code','invalid'); end if;
  cutoff_at:=(today-cutoff_days)::timestamp at time zone 'Asia/Riyadh';
  with cohort as (
   select n.* from samascan_crm.inquiries n where n.created_at>=(start_day::timestamp at time zone 'Asia/Riyadh')
    and n.created_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh') and n.referring_physician_id is not null
  ), outcomes as (
   select n.referring_physician_id,count(*) as referrals,
    count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=n.id and a.status not in ('cancelled','no_show'))) as booked,
    count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=n.id and a.status in ('attended','completed') and a.starts_at<=now())) as attended,
    count(*) filter(where exists(select 1 from samascan_crm.appointments a where a.inquiry_id=n.id and a.status='completed' and a.starts_at<=now())) as completed
   from cohort n group by n.referring_physician_id
  ), history as (
   select n.referring_physician_id,max(n.created_at) as last_referral_at from samascan_crm.inquiries n
   where n.referring_physician_id is not null group by n.referring_physician_id
  ), visit_counts as (
   select x.physician_id,count(*) as visits from samascan_referrals.visits x
   where x.visited_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and x.visited_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh') group by x.physician_id
  ), report as (
   select d.id,d.name,d.specialty,d.institution,d.district,d.active,coalesce(o.referrals,0) as referrals,coalesce(o.booked,0) as booked,
    coalesce(o.attended,0) as attended,coalesce(o.completed,0) as completed,coalesce(vc.visits,0) as visits,h.last_referral_at,
    case when not d.active then 'archived' when h.last_referral_at is null then 'never' when h.last_referral_at<cutoff_at then 'dormant' else 'recent' end as relationship_status
   from samascan_referrals.physicians d left join outcomes o on o.referring_physician_id=d.id
    left join history h on h.referring_physician_id=d.id left join visit_counts vc on vc.physician_id=d.id
  ), filtered as (
   select * from report r where (r.name ilike q or r.institution ilike q or r.specialty ilike q)
    and (status_filter is null or r.relationship_status=status_filter)
  )
  select count(*),coalesce((select jsonb_agg(x) from (select * from filtered order by completed desc,referrals desc,attended desc,name,id limit 50 offset (page_no-1)*50)x),'[]'::jsonb),
   jsonb_build_object('physicians',count(*),'referrals',coalesce(sum(referrals),0),'booked',coalesce(sum(booked),0),'attended',coalesce(sum(attended),0),'completed',coalesce(sum(completed),0),'visits',coalesce(sum(visits),0),
    'dormant',count(*) filter(where relationship_status='dormant'),'never',count(*) filter(where relationship_status='never'))
  into total,rows,totals from filtered;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('from',start_day,'to',end_day,'dormant_days',cutoff_days,'rows',rows,'total',total,'page',page_no,
   'totals',totals,'updatedAt',now(),'unlinkedReferrals',(select count(*) from samascan_crm.inquiries n where n.source='referral' and n.referring_physician_id is null
    and n.created_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and n.created_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh'))));
 end if;

 if action not in ('physician_save','visit_save') then return jsonb_build_object('ok',false,'code','invalid'); end if;
 rec_id:=(payload->>'id')::uuid;expected:=(payload->>'version')::integer;
 if rec_id is null or expected is null or expected<0 then return jsonb_build_object('ok',false,'code','invalid'); end if;
 owner_name:=nullif(payload->>'owner','');
 if owner_name is not null and not exists(select 1 from samascan_auth.admins u where u.username=owner_name and u.active and u.role in ('admin','marketing')) then
  return jsonb_build_object('ok',false,'code','invalid'); end if;
 perform pg_advisory_xact_lock(hashtext('referral:'||rec_id::text));
 if action='physician_save' then
  select * into p from samascan_referrals.physicians where id=rec_id;
  if (found and p.version<>expected) or (not found and expected<>0) then return jsonb_build_object('ok',false,'code','conflict'); end if;
  if actor_role='marketing' and ((expected>0 and p.owner is not null and p.owner<>actor) or owner_name is distinct from actor) then
   return jsonb_build_object('ok',false,'code','forbidden'); end if;
  p.id:=rec_id;p.name:=trim(payload->>'name');p.specialty:=trim(payload->>'specialty');p.institution:=trim(payload->>'institution');
  p.institution_kind:=payload->>'institution_kind';p.district:=trim(coalesce(payload->>'district',''));
  p.phone:=nullif(regexp_replace(translate(payload->>'phone','٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[\s()-]','','g'),'');
  if p.phone like '05%' and length(p.phone)=10 then p.phone:='+966'||substr(p.phone,2);elsif p.phone like '966%' then p.phone:='+'||p.phone;elsif p.phone like '00%' then p.phone:='+'||substr(p.phone,3);end if;
  p.owner:=owner_name;p.active:=coalesce((payload->>'active')::boolean,true);p.note:=coalesce(payload->>'note','');
  if expected=0 then insert into samascan_referrals.physicians(id,name,specialty,institution,institution_kind,district,phone,owner,active,note)
   values(p.id,p.name,p.specialty,p.institution,p.institution_kind,p.district,p.phone,p.owner,p.active,p.note) returning to_jsonb(physicians) into result_row;
  else update samascan_referrals.physicians set name=p.name,specialty=p.specialty,institution=p.institution,institution_kind=p.institution_kind,
   district=p.district,phone=p.phone,owner=p.owner,active=p.active,note=p.note,version=version+1,updated_at=now() where id=rec_id returning to_jsonb(physicians) into result_row;end if;
 else
  select * into v from samascan_referrals.visits where id=rec_id;
  if (found and v.version<>expected) or (not found and expected<>0) then return jsonb_build_object('ok',false,'code','conflict'); end if;
  if actor_role='marketing' and ((expected>0 and v.owner<>actor) or owner_name is distinct from actor) then return jsonb_build_object('ok',false,'code','forbidden');end if;
  if owner_name is null then return jsonb_build_object('ok',false,'code','invalid');end if;
  if expected>0 and v.physician_id::text is distinct from payload->>'physician_id' then return jsonb_build_object('ok',false,'code','invalid');end if;
  if not exists(select 1 from samascan_referrals.physicians d where d.id=(payload->>'physician_id')::uuid and (d.active or expected>0)) then
   return jsonb_build_object('ok',false,'code','invalid');end if;
  v.id:=rec_id;v.physician_id:=(payload->>'physician_id')::uuid;v.visited_at:=(payload->>'visited_at')::timestamptz;v.owner:=owner_name;
  if v.visited_at>now() then return jsonb_build_object('ok',false,'code','invalid');end if;
  v.outcome:=payload->>'outcome';v.note:=coalesce(payload->>'note','');v.next_followup_at:=nullif(payload->>'next_followup_at','')::timestamptz;
  v.followup_status:=case when v.next_followup_at is null then 'not_needed' else coalesce(payload->>'followup_status','open') end;
  v.completed_at:=case when v.followup_status='done' then coalesce(v.completed_at,now()) else null end;
  if expected=0 then insert into samascan_referrals.visits(id,physician_id,visited_at,owner,outcome,note,next_followup_at,followup_status,completed_at)
   values(v.id,v.physician_id,v.visited_at,v.owner,v.outcome,v.note,v.next_followup_at,v.followup_status,v.completed_at) returning to_jsonb(visits) into result_row;
  else update samascan_referrals.visits set visited_at=v.visited_at,owner=v.owner,outcome=v.outcome,note=v.note,next_followup_at=v.next_followup_at,
   followup_status=v.followup_status,completed_at=v.completed_at,version=version+1,updated_at=now() where id=rec_id returning to_jsonb(visits) into result_row;end if;
 end if;
 insert into samascan_crm.audit(actor,action,entity,record_id)
 values(actor,case when expected=0 then 'create' else 'update' end,case when action='physician_save' then 'physicians' else 'physician_visits' end,rec_id::text);
 return jsonb_build_object('ok',true,'record',result_row);
exception
 when unique_violation then return jsonb_build_object('ok',false,'code','duplicate');
 when check_violation or not_null_violation or foreign_key_violation or invalid_text_representation or datetime_field_overflow then
  return jsonb_build_object('ok',false,'code','invalid');
end;$referral$;
revoke all on function public.samascan_referral_api(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_referral_api(text,text,jsonb) to service_role;
