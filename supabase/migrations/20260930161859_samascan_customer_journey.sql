-- Explicit request links; existing generic tasks retain their original meaning.
alter table samascan_crm.inquiries add constraint samascan_inquiry_contact_pair unique(id,contact_id);
alter table samascan_crm.tasks add column inquiry_id uuid,add column completed_at timestamptz;
alter table samascan_crm.tasks add constraint samascan_task_contact_required check(inquiry_id is null or contact_id is not null),
 add constraint samascan_task_inquiry_contact foreign key(inquiry_id,contact_id) references samascan_crm.inquiries(id,contact_id);
create index samascan_tasks_inquiry_open on samascan_crm.tasks(inquiry_id,due_at) where status='open';
CREATE OR REPLACE FUNCTION public.samascan_crm_api(session_token text, action text, payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 actor text; actor_role text; entity text:=payload->>'entity'; rec_id uuid; expected integer;
 rows jsonb; total integer; q text:='%'||replace(replace(coalesce(payload->>'search',''),'%', '\%'),'_', '\_')||'%';
 page_no integer:=greatest(1,least(100000,coalesce((payload->>'page')::integer,1))); start_day date; end_day date;
 today date:=(now() at time zone 'Asia/Riyadh')::date; result_row jsonb;
 c samascan_crm.contacts%rowtype; i samascan_crm.inquiries%rowtype; a samascan_crm.appointments%rowtype; task_row samascan_crm.tasks%rowtype;
 owner_name text; status_filter text:=nullif(payload->>'status',''); user_name text; new_role text; new_active boolean; synced_stage text;
begin
 if coalesce(payload->>'search','') ~ '^[+0-9٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹ ()-]+$' then
  q:=regexp_replace(translate(payload->>'search','٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[\s()-]','','g');
  if q like '05%' then q:='+966'||substr(q,2); elsif q like '966%' then q:='+'||q; elsif q like '00%' then q:='+'||substr(q,3); end if;
  q:='%'||q||'%';
 end if;
 if session_token is null or session_token !~ '^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'code','credentials'); end if;
 select u.username,u.role into actor,actor_role from samascan_auth.sessions s join samascan_auth.admins u on u.username=s.username
 where s.token_hash=extensions.digest(session_token,'sha256') and s.expires_at>now() and u.active;
 if not found then return jsonb_build_object('ok',false,'code','credentials'); end if;
 if actor_role='marketing' then return jsonb_build_object('ok',false,'code','forbidden'); end if;
 if action='source_report' then
  start_day:=coalesce((payload->>'from')::date,today-29); end_day:=coalesce((payload->>'to')::date,today);
  if end_day<start_day or end_day-start_day>365 or end_day>today then return jsonb_build_object('ok',false,'code','invalid'); end if;
  with cohort as (
   select n.* from samascan_crm.inquiries n where n.created_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and n.created_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh')
  ), measured as (
   select n.source,n.id,n.stage,
    exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status not in ('cancelled','no_show')) as booked,
    exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status in ('attended','completed') and b.starts_at<=now()) as attended,
    (select count(*) from samascan_crm.appointments b where b.inquiry_id=n.id and b.status='no_show' and b.starts_at<=now()) as no_show,
    (select count(*) from samascan_crm.appointments b where b.inquiry_id=n.id and b.status='cancelled') as cancelled
   from cohort n
  ) select coalesce(jsonb_agg(x order by x.inquiries desc,x.source),'[]'::jsonb) into rows from (
   select source,count(*) as inquiries,count(*) filter(where booked) as booked,count(*) filter(where attended) as attended,
    count(*) filter(where stage in ('new','contacting','waiting')) as open,sum(no_show) as no_show,sum(cancelled) as cancelled
   from measured group by source
  )x;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('from',start_day,'to',end_day,'sources',rows,'updatedAt',now(),
   'unlinkedAppointments',(select count(*) from samascan_crm.appointments where inquiry_id is null and starts_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and starts_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh'))));
 end if;
 if action='summary' then
  return jsonb_build_object('ok',true,'data',jsonb_build_object(
   'contacts',(select count(*) from samascan_crm.contacts where active),
   'openInquiries',(select count(*) from samascan_crm.inquiries where stage in ('new','contacting','waiting')),
   'newToday',(select count(*) from samascan_crm.inquiries where (created_at at time zone 'Asia/Riyadh')::date=today),
   'appointmentsToday',(select count(*) from samascan_crm.appointments where (starts_at at time zone 'Asia/Riyadh')::date=today and status not in ('cancelled','no_show')),
   'overdueTasks',(select count(*) from samascan_crm.tasks where status='open' and due_at<now()),
   'openTasks',(select count(*) from samascan_crm.tasks where status='open'),
   'needsFollowup',(select count(*) from samascan_crm.inquiries n where stage in ('new','contacting','waiting') and not exists(select 1 from samascan_crm.tasks t where t.inquiry_id=n.id and t.status='open')),
   'totalInquiries',(select count(*) from samascan_crm.inquiries),
   'bookedInquiries',(select count(*) from samascan_crm.inquiries x where exists(select 1 from samascan_crm.appointments b where b.inquiry_id=x.id and b.status not in ('cancelled','no_show'))),
   'totalAppointments',(select count(*) from samascan_crm.appointments),
   'attended',(select count(*) from samascan_crm.appointments where status in ('attended','completed')),
   'dueAppointments',(select count(*) from samascan_crm.appointments where starts_at<=now() and status<>'cancelled'),
   'attendedDue',(select count(*) from samascan_crm.appointments where starts_at<=now() and status in ('attended','completed')),
   'stages',coalesce((select jsonb_agg(x) from (select stage,count(*) as count from samascan_crm.inquiries group by stage)x),'[]'::jsonb),
   'sources',coalesce((select jsonb_agg(x) from (select source,count(*) as count,count(*) filter(where exists(select 1 from samascan_crm.appointments b where b.inquiry_id=n.id and b.status not in ('cancelled','no_show'))) as booked from samascan_crm.inquiries n group by source)x),'[]'::jsonb),
   'week',coalesce((select jsonb_agg(x order by x.day) from (select d::date as day,
    (select count(*) from samascan_crm.inquiries where (created_at at time zone 'Asia/Riyadh')::date=d::date) as inquiries,
    (select count(*) from samascan_crm.appointments where (starts_at at time zone 'Asia/Riyadh')::date=d::date and status<>'cancelled') as appointments
    from generate_series(today-6,today,interval '1 day') d)x),'[]'::jsonb),
   'upcoming',coalesce((select jsonb_agg(x) from (select b.*,p.name as contact_name,p.phone from samascan_crm.appointments b join samascan_crm.contacts p on p.id=b.contact_id where b.starts_at>=now() and b.status in ('scheduled','confirmed') order by b.starts_at limit 5)x),'[]'::jsonb),
   'urgentTasks',coalesce((select jsonb_agg(x) from (select t.*,p.name as contact_name from samascan_crm.tasks t left join samascan_crm.contacts p on p.id=t.contact_id where t.status='open' order by t.due_at limit 5)x),'[]'::jsonb),
   'staff',coalesce((select jsonb_agg(x) from (select username,display_name,role from samascan_auth.admins where active and role in ('admin','reception') order by display_name)x),'[]'::jsonb),
   'updatedAt',now()
  ));
 end if;
 if action='list' then
  if entity='contacts' then
   select count(*) into total from samascan_crm.contacts where (name ilike q or phone ilike q) and (status_filter is null or active=(status_filter='active'));
   select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (select * from samascan_crm.contacts where (name ilike q or phone ilike q) and (status_filter is null or active=(status_filter='active')) order by created_at desc,id limit 50 offset (page_no-1)*50)x;
  elsif entity='inquiries' then
   select count(*) into total from samascan_crm.inquiries n join samascan_crm.contacts p on p.id=n.contact_id where (p.name ilike q or p.phone ilike q or n.exam ilike q) and (status_filter is null or n.stage=status_filter or (status_filter='needs_followup' and n.stage in ('new','contacting','waiting') and not exists(select 1 from samascan_crm.tasks t where t.inquiry_id=n.id and t.status='open'))) and (nullif(payload->>'contact_id','') is null or n.contact_id=nullif(payload->>'contact_id','')::uuid);
   select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (select n.*,p.name as contact_name,p.phone,(select to_jsonb(nt) from (select t.id,t.title,t.due_at,t.owner from samascan_crm.tasks t where t.inquiry_id=n.id and t.status='open' order by t.due_at,t.id limit 1)nt) as next_task from samascan_crm.inquiries n join samascan_crm.contacts p on p.id=n.contact_id where (p.name ilike q or p.phone ilike q or n.exam ilike q) and (status_filter is null or n.stage=status_filter or (status_filter='needs_followup' and n.stage in ('new','contacting','waiting') and not exists(select 1 from samascan_crm.tasks t where t.inquiry_id=n.id and t.status='open'))) and (nullif(payload->>'contact_id','') is null or n.contact_id=nullif(payload->>'contact_id','')::uuid) order by n.created_at desc,n.id limit 50 offset (page_no-1)*50)x;
  elsif entity='appointments' then
   start_day:=coalesce((payload->>'from')::date,today); end_day:=coalesce((payload->>'to')::date,start_day);
   select count(*) into total from samascan_crm.appointments b join samascan_crm.contacts p on p.id=b.contact_id where b.starts_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and b.starts_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh') and (p.name ilike q or p.phone ilike q or b.exam ilike q) and (status_filter is null or b.status=status_filter);
   select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (select b.*,p.name as contact_name,p.phone from samascan_crm.appointments b join samascan_crm.contacts p on p.id=b.contact_id where b.starts_at>=(start_day::timestamp at time zone 'Asia/Riyadh') and b.starts_at<((end_day+1)::timestamp at time zone 'Asia/Riyadh') and (p.name ilike q or p.phone ilike q or b.exam ilike q) and (status_filter is null or b.status=status_filter) order by b.starts_at,b.id limit 50 offset (page_no-1)*50)x;
  elsif entity='tasks' then
   select count(*) into total from samascan_crm.tasks t left join samascan_crm.contacts p on p.id=t.contact_id where (t.title ilike q or p.name ilike q) and (status_filter is null or t.status=status_filter or (status_filter='overdue' and t.status='open' and t.due_at<now()));
   select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (select t.*,p.name as contact_name,p.phone,(select n.exam from samascan_crm.inquiries n where n.id=t.inquiry_id) as inquiry_exam from samascan_crm.tasks t left join samascan_crm.contacts p on p.id=t.contact_id where (t.title ilike q or p.name ilike q) and (status_filter is null or t.status=status_filter or (status_filter='overdue' and t.status='open' and t.due_at<now())) order by t.status desc,t.due_at,t.id limit 50 offset (page_no-1)*50)x;
  elsif entity='team' and actor_role='admin' then
   select count(*) into total from samascan_auth.admins;
   select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (select username,display_name,role,active,updated_at from samascan_auth.admins order by username limit 50 offset (page_no-1)*50)x;
  elsif entity='audit' and actor_role='admin' then
   select count(*) into total from samascan_crm.audit;
   select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (select * from samascan_crm.audit order by id desc limit 50 offset (page_no-1)*50)x;
  else return jsonb_build_object('ok',false,'code','forbidden'); end if;
  return jsonb_build_object('ok',true,'rows',rows,'total',total,'page',page_no);
 end if;
 if action='contact_detail' then
  rec_id:=(payload->>'id')::uuid;
  select * into c from samascan_crm.contacts where id=rec_id;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  return jsonb_build_object('ok',true,'contact',to_jsonb(c),
   'inquiries',coalesce((select jsonb_agg(x) from (select * from samascan_crm.inquiries where contact_id=rec_id order by created_at desc limit 50)x),'[]'::jsonb),
   'appointments',coalesce((select jsonb_agg(x) from (select * from samascan_crm.appointments where contact_id=rec_id order by starts_at desc limit 50)x),'[]'::jsonb),
   'tasks',coalesce((select jsonb_agg(x) from (select t.*,(select n.exam from samascan_crm.inquiries n where n.id=t.inquiry_id) as inquiry_exam from samascan_crm.tasks t where contact_id=rec_id order by due_at desc limit 50)x),'[]'::jsonb),
   'stats',jsonb_build_object('inquiries',(select count(*) from samascan_crm.inquiries where contact_id=rec_id),'appointments',(select count(*) from samascan_crm.appointments where contact_id=rec_id),
    'attended',(select count(*) from samascan_crm.appointments where contact_id=rec_id and status in ('attended','completed') and starts_at<=now()),'openTasks',(select count(*) from samascan_crm.tasks where contact_id=rec_id and status='open')),
   'nextTask',(select to_jsonb(x) from (select * from samascan_crm.tasks where contact_id=rec_id and status='open' order by due_at,id limit 1)x),
   'timeline',coalesce((select jsonb_agg(x order by x.id desc) from (select * from samascan_crm.audit history where
    (history.entity='contacts' and history.record_id=rec_id::text) or (history.entity='inquiries' and history.record_id in (select id::text from samascan_crm.inquiries where contact_id=rec_id)) or
    (history.entity='appointments' and history.record_id in (select id::text from samascan_crm.appointments where contact_id=rec_id)) or
    (history.entity='tasks' and history.record_id in (select id::text from samascan_crm.tasks where contact_id=rec_id)) order by id desc limit 100)x),'[]'::jsonb));
 end if;
 if action='save_user' then
  if actor_role<>'admin' then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  user_name:=payload->>'username'; new_role:=payload->>'role'; new_active:=coalesce((payload->>'active')::boolean,true);
  if user_name is null or user_name !~ '^[a-zA-Z0-9_.-]{3,40}$' or new_role is null or new_role not in ('admin','reception','marketing') then return jsonb_build_object('ok',false,'code','invalid'); end if;
  if (user_name=actor or user_name='admin') and (new_role<>'admin' or not new_active) then return jsonb_build_object('ok',false,'code','own_account'); end if;
  if payload->>'password' is not null and (char_length(payload->>'password')<10 or octet_length(payload->>'password')>72) then return jsonb_build_object('ok',false,'code','password'); end if;
  if coalesce((payload->>'creating')::boolean,false) then
   if payload->>'password' is null then return jsonb_build_object('ok',false,'code','password'); end if;
   insert into samascan_auth.admins(username,password_hash,display_name,role,active) values(user_name,extensions.crypt(payload->>'password',extensions.gen_salt('bf',12)),trim(payload->>'display_name'),new_role,new_active);
  else
   update samascan_auth.admins set display_name=trim(payload->>'display_name'),role=new_role,active=new_active,
    password_hash=case when payload->>'password' is null then password_hash else extensions.crypt(payload->>'password',extensions.gen_salt('bf',12)) end,updated_at=now()
   where username=user_name and updated_at=(payload->>'updated_at')::timestamptz;
   if not found then return jsonb_build_object('ok',false,'code','conflict'); end if;
   delete from samascan_auth.sessions where username=user_name;
  end if;
  insert into samascan_crm.audit(actor,action,entity,record_id) values(actor,'save','team',user_name);
  return jsonb_build_object('ok',true);
 end if;
 if action is distinct from 'save' then return jsonb_build_object('ok',false,'code','invalid'); end if;
 rec_id:=(payload->>'id')::uuid; expected:=(payload->>'version')::integer;
 if rec_id is null or expected is null or expected<0 then return jsonb_build_object('ok',false,'code','invalid'); end if;
 owner_name:=nullif(payload->>'owner','');
 if owner_name is not null and not exists(select 1 from samascan_auth.admins where username=owner_name and active and role in ('admin','reception')) then return jsonb_build_object('ok',false,'code','invalid'); end if;
 -- Serialize concurrent edits to each record. Optimistic versions reject stale browser tabs.
 perform pg_advisory_xact_lock(hashtext(rec_id::text));
 if entity='contacts' then
  select * into c from samascan_crm.contacts where id=rec_id;
  if (found and c.version<>expected) or (not found and expected<>0) then return jsonb_build_object('ok',false,'code','conflict'); end if;
  c.id:=rec_id;c.name:=trim(payload->>'name');c.phone:=regexp_replace(translate(payload->>'phone','٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[\s()-]','','g');
  if c.phone like '05%' and length(c.phone)=10 then c.phone:='+966'||substr(c.phone,2); elsif c.phone like '966%' then c.phone:='+'||c.phone; elsif c.phone like '00%' then c.phone:='+'||substr(c.phone,3); end if;
  c.source:=payload->>'source';c.note:=coalesce(payload->>'note','');c.active:=coalesce((payload->>'active')::boolean,true);
  if expected=0 then insert into samascan_crm.contacts(id,name,phone,source,note,active) values(c.id,c.name,c.phone,c.source,c.note,c.active) returning to_jsonb(contacts) into result_row;
  else update samascan_crm.contacts set name=c.name,phone=c.phone,source=c.source,note=c.note,active=c.active,updated_at=now(),version=version+1 where id=rec_id returning to_jsonb(contacts) into result_row; end if;
 elsif entity='inquiries' then
  select * into i from samascan_crm.inquiries where id=rec_id;
  if (found and i.version<>expected) or (not found and expected<>0) then return jsonb_build_object('ok',false,'code','conflict'); end if;
  -- Linked appointments control booking/attendance stages to keep funnel counts coherent.
  if expected>0 and exists(select 1 from samascan_crm.appointments where inquiry_id=rec_id and status not in ('cancelled','no_show')) and (i.contact_id::text is distinct from payload->>'contact_id' or i.stage is distinct from payload->>'stage') then return jsonb_build_object('ok',false,'code','linked_booking'); end if;
  if (expected=0 or i.stage is distinct from payload->>'stage') and payload->>'stage' in ('booked','attended','completed') then return jsonb_build_object('ok',false,'code','use_booking'); end if;
  if expected=0 then insert into samascan_crm.inquiries(id,contact_id,exam,source,stage,owner,note) values(rec_id,(payload->>'contact_id')::uuid,trim(payload->>'exam'),payload->>'source',payload->>'stage',owner_name,coalesce(payload->>'note','')) returning to_jsonb(inquiries) into result_row;
  else update samascan_crm.inquiries set contact_id=(payload->>'contact_id')::uuid,exam=trim(payload->>'exam'),source=payload->>'source',stage=payload->>'stage',owner=owner_name,note=coalesce(payload->>'note',''),updated_at=now(),version=version+1 where id=rec_id returning to_jsonb(inquiries) into result_row; end if;
 elsif entity='appointments' then
  select * into a from samascan_crm.appointments where id=rec_id;
  if (found and a.version<>expected) or (not found and expected<>0) then return jsonb_build_object('ok',false,'code','conflict'); end if;
  if expected>0 and (a.inquiry_id::text is distinct from nullif(payload->>'inquiry_id','') or a.contact_id::text is distinct from payload->>'contact_id') then return jsonb_build_object('ok',false,'code','invalid'); end if;
  a.id:=rec_id;a.contact_id:=(payload->>'contact_id')::uuid;a.inquiry_id:=nullif(payload->>'inquiry_id','')::uuid;a.exam:=trim(payload->>'exam');a.resource:=payload->>'resource';a.starts_at:=(payload->>'starts_at')::timestamptz;a.ends_at:=(payload->>'ends_at')::timestamptz;a.status:=payload->>'status';a.note:=coalesce(payload->>'note','');
  if a.inquiry_id is not null and not exists(select 1 from samascan_crm.inquiries where id=a.inquiry_id and contact_id=a.contact_id) then return jsonb_build_object('ok',false,'code','invalid'); end if;
  if a.inquiry_id is not null then perform pg_advisory_xact_lock(hashtext(a.inquiry_id::text)); end if;
  perform pg_advisory_xact_lock(hashtext('samascan-device:'||a.resource));
  if a.status not in ('cancelled','no_show') and exists(select 1 from samascan_crm.appointments b where b.id<>rec_id and b.resource=a.resource and b.status not in ('cancelled','no_show') and b.starts_at<a.ends_at and b.ends_at>a.starts_at) then return jsonb_build_object('ok',false,'code','overlap'); end if;
  if expected=0 then insert into samascan_crm.appointments(id,contact_id,inquiry_id,exam,resource,starts_at,ends_at,status,note) values(a.id,a.contact_id,a.inquiry_id,a.exam,a.resource,a.starts_at,a.ends_at,a.status,a.note) returning to_jsonb(appointments) into result_row;
  else update samascan_crm.appointments set exam=a.exam,resource=a.resource,starts_at=a.starts_at,ends_at=a.ends_at,status=a.status,note=a.note,updated_at=now(),version=version+1 where id=rec_id returning to_jsonb(appointments) into result_row; end if;
  if a.inquiry_id is not null then
   select case when b.status in ('attended','completed') then b.status when b.status='cancelled' then 'cancelled' when b.status='no_show' then 'waiting' else 'booked' end into synced_stage
    from samascan_crm.appointments b where b.inquiry_id=a.inquiry_id
    order by (b.status not in ('cancelled','no_show')) desc,b.created_at desc,b.id desc limit 1;
   update samascan_crm.inquiries set stage=synced_stage,version=version+1,updated_at=now() where id=a.inquiry_id;
   insert into samascan_crm.audit(actor,action,entity,record_id) values(actor,'booking_sync','inquiries',a.inquiry_id::text);
  end if;
 elsif entity='tasks' then
  if nullif(payload->>'inquiry_id','') is not null and owner_name is null then return jsonb_build_object('ok',false,'code','invalid'); end if;
  select * into task_row from samascan_crm.tasks where id=rec_id;
  if (found and task_row.version<>expected) or (not found and expected<>0) then return jsonb_build_object('ok',false,'code','conflict'); end if;
  if expected=0 then insert into samascan_crm.tasks(id,contact_id,inquiry_id,title,due_at,owner,priority,status,note,completed_at) values(rec_id,nullif(payload->>'contact_id','')::uuid,nullif(payload->>'inquiry_id','')::uuid,trim(payload->>'title'),(payload->>'due_at')::timestamptz,owner_name,payload->>'priority',payload->>'status',coalesce(payload->>'note',''),case when payload->>'status'='done' then now() end) returning to_jsonb(tasks) into result_row;
  else update samascan_crm.tasks set contact_id=nullif(payload->>'contact_id','')::uuid,inquiry_id=nullif(payload->>'inquiry_id','')::uuid,completed_at=case when payload->>'status'='done' then coalesce(completed_at,now()) else null end,title=trim(payload->>'title'),due_at=(payload->>'due_at')::timestamptz,owner=owner_name,priority=payload->>'priority',status=payload->>'status',note=coalesce(payload->>'note',''),updated_at=now(),version=version+1 where id=rec_id returning to_jsonb(tasks) into result_row; end if;
 else return jsonb_build_object('ok',false,'code','invalid'); end if;
 insert into samascan_crm.audit(actor,action,entity,record_id) values(actor,case when expected=0 then 'create' else 'update' end,entity,rec_id::text);
 return jsonb_build_object('ok',true,'record',result_row);
exception
 when unique_violation then return jsonb_build_object('ok',false,'code','duplicate');
 when check_violation or not_null_violation or foreign_key_violation or invalid_text_representation or datetime_field_overflow then return jsonb_build_object('ok',false,'code','invalid');
end; $function$;


revoke all on function public.samascan_crm_api(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.samascan_crm_api(text,text,jsonb) to service_role;
