import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

test('private CRM: request links, completed followups, customer timeline and source outcomes',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema extensions;create extension pgcrypto with schema extensions;grant usage on schema extensions to service_role;grant execute on all functions in schema extensions to service_role;`);
  // Auth bootstrap contains no live credentials; a disposable administrator is used.
  await db.exec(fs.readFileSync('docs/supabase-auth.sql','utf8'));
  await db.exec(`insert into samascan_auth.admins(username,password_hash) values('admin',extensions.crypt('isolated-test-password',extensions.gen_salt('bf',4)));`);
  await db.exec(fs.readFileSync('docs/supabase-crm.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20260930161859_samascan_customer_journey.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20260930170549_customer_task_link_index.sql','utf8'));
  await db.exec(fs.readFileSync('tests/supabase-crm.integration.sql','utf8'));
  await db.exec(fs.readFileSync('tests/customer-journey.integration.sql','utf8'));
  assert.equal((await db.query('select count(*)::int as count from samascan_crm.contacts')).rows[0].count,0,'fixtures roll back');
 }finally{await db.close();}
});
