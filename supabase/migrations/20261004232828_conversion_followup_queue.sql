-- Read-only operational queue plus explicit, audited attribution of an unlinked appointment.
-- Existing patient outcomes are never inferred or changed by the queue.
create or replace function public.samascan_conversion_api(session_token text, action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $conversion$
declare
 actor text; actor_role text; bucket text; page_no integer;
 rec_id uuid; inquiry_key uuid; expected integer; synced_stage text;
 appointment_row samascan_crm.appointments%rowtype;
 inquiry_row samascan_crm.inquiries%rowtype;
 result_data jsonb;
begin
 if session_token is null or session_token !~ '^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'code','credentials'); end if;
 select u.username,u.role into actor,actor_role from samascan_auth.sessions s join samascan_auth.admins u on u.username=s.username
 where s.token_hash=extensions.digest(session_token,'sha256') and s.expires_at>now() and u.active;
 if actor_role is null then return jsonb_build_object('ok',false,'code','credentials'); end if;
 if actor_role not in ('admin','reception') then return jsonb_build_object('ok',false,'code','forbidden'); end if;
 if payload is null or jsonb_typeof(payload)<>'object' then return jsonb_build_object('ok',false,'code','invalid'); end if;

 if action='link_appointment' then
  rec_id:=(payload->>'id')::uuid; inquiry_key:=(payload->>'inquiry_id')::uuid; expected:=(payload->>'version')::integer;
  if rec_id is null or inquiry_key is null or expected is null or expected<1 then return jsonb_build_object('ok',false,'code','invalid'); end if;
  perform pg_advisory_xact_lock(hashtext(rec_id::text));
  select * into appointment_row from samascan_crm.appointments where id=rec_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  if appointment_row.version<>expected then return jsonb_build_object('ok',false,'code','conflict'); end if;
  if appointment_row.inquiry_id is not null then return jsonb_build_object('ok',false,'code','invalid'); end if;
  perform pg_advisory_xact_lock(hashtext(inquiry_key::text));
  select * into inquiry_row from samascan_crm.inquiries where id=inquiry_key for update;
  if not found or inquiry_row.contact_id<>appointment_row.contact_id or trim(inquiry_row.exam)<>trim(appointment_row.exam) then
   return jsonb_build_object('ok',false,'code','invalid'); end if;
  update samascan_crm.appointments set inquiry_id=inquiry_key,version=version+1,updated_at=now() where id=rec_id returning * into appointment_row;
  -- Use the same request-stage rule as the existing booking save operation.
  select case when b.status in ('attended','completed') then b.status when b.status='cancelled' then 'cancelled' when b.status='no_show' then 'waiting' else 'booked' end into synced_stage
   from samascan_crm.appointments b where b.inquiry_id=inquiry_key
   order by (b.status not in ('cancelled','no_show')) desc,b.created_at desc,b.id desc limit 1;
  update samascan_crm.inquiries set stage=synced_stage,version=version+1,updated_at=now() where id=inquiry_key;
  insert into samascan_crm.audit(actor,action,entity,record_id) values(actor,'appointment_link','appointments',rec_id::text),(actor,'booking_sync','inquiries',inquiry_key::text);
  return jsonb_build_object('ok',true,'record',to_jsonb(appointment_row));
 end if;
 if action is distinct from 'conversion_queue' then return jsonb_build_object('ok',false,'code','invalid'); end if;
 bucket:=coalesce(payload->>'bucket','all');page_no:=greatest(1,least(coalesce((payload->>'page')::integer,1),100000));
 if bucket not in ('all','intake','overdue','no_followup','unassigned','unresolved','unlinked','recovery') then return jsonb_build_object('ok',false,'code','invalid'); end if;
 with inquiry_items as (
  select 'inquiries'::text as entity,
   to_jsonb(n)||jsonb_build_object('contact_name',p.name,'phone',p.phone,'physician_name',d.name) as record,
   case when t.id is not null then to_jsonb(t)||jsonb_build_object('contact_name',p.name,'phone',p.phone,'inquiry_exam',n.exam) end as next_task,
   array_remove(array[
    case when n.booking_reference is not null and (n.stage='new' or (n.stage='booked' and t.kind='website_intake')) then 'intake' end,
    case when n.stage in ('new','contacting','waiting') and t.id is null then 'no_followup' end,
    case when n.stage in ('new','contacting','waiting') and (u.username is null or not u.active or u.role not in ('admin','reception')) then 'unassigned' end,
    case when t.due_at<now() then 'overdue' end,
    case when failed.id is not null and not exists(select 1 from samascan_crm.appointments active where active.inquiry_id=n.id and active.status not in ('cancelled','no_show')) and not exists(select 1 from samascan_crm.tasks done where done.inquiry_id=n.id and done.status='done' and done.completed_at>=failed.updated_at) then 'recovery' end
   ]::text[],null) as flags,
   coalesce(t.due_at,failed.updated_at,n.created_at) as sort_at
  from samascan_crm.inquiries n join samascan_crm.contacts p on p.id=n.contact_id
  left join samascan_auth.admins u on u.username=n.owner
  left join samascan_referrals.physicians d on d.id=n.referring_physician_id
  left join lateral (select task.* from samascan_crm.tasks task where task.inquiry_id=n.id and task.status='open' order by task.due_at,task.id limit 1)t on true
  left join lateral (select a.* from samascan_crm.appointments a where a.inquiry_id=n.id and a.status in ('cancelled','no_show') and a.updated_at>=now()-interval '30 days' order by a.updated_at desc,a.id limit 1)failed on true
  where n.stage in ('new','contacting','waiting','cancelled','booked')
   and (not exists(select 1 from samascan_crm.appointments a where a.inquiry_id=n.id and a.status not in ('cancelled','no_show')) or (n.stage='booked' and t.id is not null))
 ), appointment_items as (
  select 'appointments'::text as entity,to_jsonb(a)||jsonb_build_object('contact_name',p.name,'phone',p.phone) as record,null::jsonb as next_task,
   array_remove(array[case when a.status in ('scheduled','confirmed') and a.starts_at<=now() then 'unresolved' end,case when a.inquiry_id is null then 'unlinked' end]::text[],null) as flags,
   a.starts_at as sort_at
  from samascan_crm.appointments a join samascan_crm.contacts p on p.id=a.contact_id
  where a.status not in ('cancelled','no_show') and ((a.status in ('scheduled','confirmed') and a.starts_at<=now()) or a.inquiry_id is null)
 ), items as (
  select * from inquiry_items where cardinality(flags)>0 union all select * from appointment_items
 ), selected as (
  select * from items where bucket='all' or bucket=any(flags)
 ) select jsonb_build_object(
  'counts',(select jsonb_build_object('all',count(*),'intake',count(*) filter(where 'intake'=any(flags)),
   'overdue',count(*) filter(where 'overdue'=any(flags)),'no_followup',count(*) filter(where 'no_followup'=any(flags)),
   'unassigned',count(*) filter(where 'unassigned'=any(flags)),'unresolved',count(*) filter(where 'unresolved'=any(flags)),
   'unlinked',count(*) filter(where 'unlinked'=any(flags)),'recovery',count(*) filter(where 'recovery'=any(flags))) from items),
  'rows',coalesce((select jsonb_agg(jsonb_build_object('entity',x.entity,'record',x.record,'flags',x.flags,'nextTask',x.next_task) order by x.urgency,x.sort_at,x.entity,x.record->>'id') from (
   select *,case when 'overdue'=any(flags) then 0 when 'unresolved'=any(flags) then 1 when 'no_followup'=any(flags) then 2 when 'recovery'=any(flags) then 3 else 4 end as urgency
   from selected order by urgency,sort_at,entity,record->>'id' limit 8 offset (page_no-1)*8
  )x),'[]'::jsonb),
  'total',(select count(*) from selected),'page',page_no,'pageSize',8,'updatedAt',now()) into result_data;
 return jsonb_build_object('ok',true,'data',result_data);
exception
 when unique_violation then return jsonb_build_object('ok',false,'code','duplicate');
 when check_violation or not_null_violation or foreign_key_violation or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
  return jsonb_build_object('ok',false,'code','invalid');
end;$conversion$;
revoke all on function public.samascan_conversion_api(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_conversion_api(text,text,jsonb) to service_role;

-- Add completed examinations to the existing physician report; preserve all authorization and write paths.
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
