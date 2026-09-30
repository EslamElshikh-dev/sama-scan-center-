begin;
set local role service_role;
do $$
declare
 token text:=encode(extensions.gen_random_bytes(32),'hex');
 cid uuid:=gen_random_uuid();other_cid uuid:=gen_random_uuid();iid uuid:=gen_random_uuid();tid uuid:=gen_random_uuid();aid uuid:=gen_random_uuid();
 r jsonb;draft jsonb;source_row jsonb;today date:=(now() at time zone 'Asia/Riyadh')::date;
begin
 insert into samascan_auth.sessions(token_hash,username,expires_at) values(extensions.digest(token,'sha256'),'admin',now()+interval '10 minutes');
 r:=public.samascan_crm_api(token,'save',jsonb_build_object('entity','contacts','id',cid,'version',0,'name','اختبار الرحلة','phone','0500000003','source','referral'));assert r->>'ok'='true','contact';
 r:=public.samascan_crm_api(token,'save',jsonb_build_object('entity','contacts','id',other_cid,'version',0,'name','اختبار جهة أخرى','phone','0500000004','source','phone'));assert r->>'ok'='true','second contact';
 r:=public.samascan_crm_api(token,'save',jsonb_build_object('entity','inquiries','id',iid,'version',0,'contact_id',cid,'source','referral','exam','سونار','stage','new'));assert r->>'ok'='true','request';
 r:=public.samascan_crm_api(token,'list',jsonb_build_object('entity','inquiries','contact_id',cid,'status','needs_followup'));assert (r->>'total')::int=1,'request without next action';
 draft:=jsonb_build_object('entity','tasks','id',tid,'version',0,'contact_id',cid,'inquiry_id',iid,'title','متابعة الطلب','due_at',now()-interval '1 hour','owner','admin','priority','high','status','open');
 r:=public.samascan_crm_api(token,'save',draft||jsonb_build_object('contact_id',other_cid));assert r->>'code'='invalid','cross-customer task rejected';
 r:=public.samascan_crm_api(token,'save',draft-'contact_id');assert r->>'code'='invalid','linked task needs its customer';
 r:=public.samascan_crm_api(token,'save',draft-'owner');assert r->>'code'='invalid','linked task needs a responsible employee';
 r:=public.samascan_crm_api(token,'save',draft);assert r->>'ok'='true','linked task create';
 r:=public.samascan_crm_api(token,'list',jsonb_build_object('entity','inquiries','contact_id',cid));assert r->'rows'->0->'next_task'->>'id'=tid::text,'next action is visible';
 r:=public.samascan_crm_api(token,'list',jsonb_build_object('entity','inquiries','contact_id',cid,'status','needs_followup'));assert (r->>'total')::int=0,'linked open task fills gap';
 r:=public.samascan_crm_api(token,'save',draft||'{"version":1,"status":"done"}');assert r->'record'->>'completed_at' is not null,'completion time recorded';
 r:=public.samascan_crm_api(token,'save',draft||'{"version":1,"status":"done"}');assert r->>'code'='conflict','double completion rejects stale version';
 draft:=jsonb_build_object('entity','appointments','id',aid,'version',0,'contact_id',cid,'inquiry_id',iid,'exam','سونار','resource','US','starts_at',now()-interval '2 hours','ends_at',now()-interval '90 minutes','status','no_show');
 r:=public.samascan_crm_api(token,'save',draft);assert r->>'ok'='true','no show';
 r:=public.samascan_crm_api(token,'save',draft||jsonb_build_object('id',gen_random_uuid(),'starts_at',now()-interval '1 hour','ends_at',now()-interval '30 minutes','status','completed'));assert r->>'ok'='true','successful rebooking';
 r:=public.samascan_crm_api(token,'source_report',jsonb_build_object('from',today,'to',today));
 select x into source_row from jsonb_array_elements(r->'data'->'sources')x where x->>'source'='referral';
 assert (source_row->>'inquiries')::int=1 and (source_row->>'booked')::int=1 and (source_row->>'attended')::int=1 and (source_row->>'no_show')::int=1,'one request counted once despite rebooking';
 r:=public.samascan_crm_api(token,'source_report',jsonb_build_object('from',today,'to',today-1));assert r->>'code'='invalid','invalid reporting dates';
 r:=public.samascan_crm_api(token,'contact_detail',jsonb_build_object('id',cid));assert (r->'stats'->>'inquiries')::int=1 and (r->'stats'->>'attended')::int=1 and jsonb_array_length(r->'timeline')>=6,'profile counts and actual history';
 assert not has_function_privilege('anon','public.samascan_crm_api(text,text,jsonb)','execute'),'report remains private';
end $$;
rollback;
