-- Tested on PostgreSQL 17 and PGlite; no production changes.
-- Table names and the existing service DELETE capability are intentionally explicit.
do $contract$
declare item record; r text; p text; actual text[]; expected text[];
begin
  select array_agg(name order by name) into expected from (values
      ('samascan_auth.admins', true),
      ('samascan_auth.attempts', true),
      ('samascan_auth.sessions', true),
      ('samascan_crm.ad_spend_daily', false),
      ('samascan_crm.appointments', true),
      ('samascan_crm.audit', true),
      ('samascan_crm.booking_limits', true),
      ('samascan_crm.booking_submissions', true),
      ('samascan_crm.contact_daily_totals', true),
      ('samascan_crm.contact_events', true),
      ('samascan_crm.contact_receipts', true),
      ('samascan_crm.contacts', true),
      ('samascan_crm.inquiries', true),
      ('samascan_crm.tasks', true),
      ('samascan_growth.content', false),
      ('samascan_growth.gbp_periods', false),
      ('samascan_growth.maps_observations', false),
      ('samascan_referrals.physicians', false),
      ('samascan_referrals.visits', false)
  ) as manifest(name, can_delete);
  select array_agg(n.nspname||'.'||c.relname order by n.nspname||'.'||c.relname)
    into actual from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p') and n.nspname !~ '^pg_'
      and n.nspname not in ('information_schema','extensions');
  assert actual is not distinct from expected, 'Unclassified or missing application table: update the least-privilege contract';
  for item in select * from (values
      ('samascan_auth.admins', true),
      ('samascan_auth.attempts', true),
      ('samascan_auth.sessions', true),
      ('samascan_crm.ad_spend_daily', false),
      ('samascan_crm.appointments', true),
      ('samascan_crm.audit', true),
      ('samascan_crm.booking_limits', true),
      ('samascan_crm.booking_submissions', true),
      ('samascan_crm.contact_daily_totals', true),
      ('samascan_crm.contact_events', true),
      ('samascan_crm.contact_receipts', true),
      ('samascan_crm.contacts', true),
      ('samascan_crm.inquiries', true),
      ('samascan_crm.tasks', true),
      ('samascan_growth.content', false),
      ('samascan_growth.gbp_periods', false),
      ('samascan_growth.maps_observations', false),
      ('samascan_referrals.physicians', false),
      ('samascan_referrals.visits', false)
  ) as manifest(name, can_delete) loop
    assert (select relrowsecurity from pg_class where oid=item.name::regclass), 'RLS required: '||item.name;
    foreach r in array array['anon','authenticated'] loop
      foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] loop
        assert not has_table_privilege(r,item.name,p), 'Browser table privilege: '||r||' '||p||' '||item.name;
      end loop;
      assert not has_schema_privilege(r,split_part(item.name,'.',1),'USAGE'), 'Private schema exposed';
    end loop;
    assert has_schema_privilege('service_role',split_part(item.name,'.',1),'USAGE'), 'Missing server schema usage';
    foreach p in array array['SELECT','INSERT','UPDATE'] loop
      assert has_table_privilege('service_role',item.name,p), 'Missing explicit server '||p||': '||item.name;
    end loop;
    assert has_table_privilege('service_role',item.name,'DELETE')=item.can_delete, 'Unexpected server DELETE capability: '||item.name;
    foreach p in array array['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] loop
      assert not has_table_privilege('service_role',item.name,p), 'Unneeded server privilege';
    end loop;
  end loop;
  for item in select c.oid,n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='S' and n.nspname like 'samascan_%' loop
    assert has_sequence_privilege('service_role',item.oid,'USAGE') and has_sequence_privilege('service_role',item.oid,'SELECT'), 'Missing explicit sequence privilege';
    assert not has_sequence_privilege('service_role',item.oid,'UPDATE'), 'Unneeded sequence UPDATE';
    foreach r in array array['anon','authenticated'] loop
      assert not has_sequence_privilege(r,item.oid,'USAGE,SELECT,UPDATE'), 'Private sequence exposed';
    end loop;
  end loop;
  for item in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'samascan_%' loop
    assert has_function_privilege('service_role',item.oid,'EXECUTE'), 'Missing server RPC EXECUTE';
    foreach r in array array['anon','authenticated'] loop
      assert has_function_privilege(r,item.oid,'EXECUTE') = (item.proname='samascan_public_content'), 'Unexpected browser RPC privilege: '||item.proname;
    end loop;
  end loop;
end $contract$;
