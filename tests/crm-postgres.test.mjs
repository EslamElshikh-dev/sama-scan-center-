import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

test('private CRM: request links, completed followups, customer timeline and source outcomes',async(t)=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema extensions;create extension pgcrypto with schema extensions;grant usage on schema extensions to service_role;grant execute on all functions in schema extensions to service_role;`);
  // Auth bootstrap contains no live credentials; a disposable administrator is used.
  await db.exec(fs.readFileSync('docs/supabase-auth.sql','utf8'));
  await db.exec(`insert into samascan_auth.admins(username,password_hash) values('admin',extensions.crypt('isolated-test-password',extensions.gen_salt('bf',4)));`);
  await db.exec(fs.readFileSync('docs/supabase-crm.sql','utf8'));
  const checkpoints=JSON.parse(fs.readFileSync('tests/integration/supabase17/checkpoints.json','utf8'));
  const migrations=fs.readdirSync('supabase/migrations').filter(name=>name.endsWith('.sql')).sort();
  assert.ok(Object.keys(checkpoints).every(name=>migrations.includes(name)),'SQL checkpoints must still name existing migrations');
  for(const name of migrations){
   await db.exec(fs.readFileSync(`supabase/migrations/${name}`,'utf8'));
   for(const checkpoint of checkpoints[name]??[]) await db.exec(fs.readFileSync(checkpoint,'utf8'));
  }
  const permissions=fs.readFileSync('tests/integration/supabase17/permissions.sql','utf8');
  await db.exec(permissions);
  for(const [name,breakSql,restoreSql] of [
   ['missing server grant','revoke select on samascan_crm.contacts from service_role','grant select on samascan_crm.contacts to service_role'],
   ['unneeded browser grant','grant select on samascan_crm.contacts to anon','revoke select on samascan_crm.contacts from anon'],
   ['RLS disabled','alter table samascan_crm.contacts disable row level security','alter table samascan_crm.contacts enable row level security'],
   ['future table absent from permission manifest','create table public.unclassified_future_table(id bigint)','drop table public.unclassified_future_table'],
  ]) await t.test(`permission guard rejects ${name}`,async()=>{
   await db.exec(breakSql);
   try { await assert.rejects(()=>db.exec(permissions),error=>error.code==='P0004'); }
   finally { await db.exec(restoreSql); }
   await db.exec(permissions);
  });
  assert.equal((await db.query('select count(*)::int as count from samascan_crm.contacts')).rows[0].count,0,'fixtures roll back');
 }finally{await db.close();}
});
