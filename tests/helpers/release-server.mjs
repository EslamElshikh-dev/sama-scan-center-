// Test-only server: real Next routes + original Edge handlers + disposable Postgres.
// No live account, secret, database connection or outbound service request is used.
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import next from 'next';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { createHandler as adminHandler } from '../../backend/samascan-admin/index.mjs';
import { createHandler as crmHandler } from '../../backend/samascan-crm/index.mjs';
import { createHandler as bookingHandler } from '../../backend/samascan-booking/index.mjs';
import { createHandler as contactHandler } from '../../backend/samascan-contact-events/index.mjs';

export async function startIsolatedReleaseServer() {
  if (process.env.SAMA_RELEASE_TEST !== 'isolated') throw new Error('Explicit isolated-test guard required');
  const db = new PGlite({ extensions: { pgcrypto } });
  const password = randomBytes(24).toString('hex');
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema extensions; create extension pgcrypto with schema extensions; grant usage on schema extensions to service_role; grant execute on all functions in schema extensions to service_role;');
  await db.exec(readFileSync('docs/supabase-auth.sql', 'utf8'));
  await db.query("insert into samascan_auth.admins(username,password_hash) values('admin',extensions.crypt($1,extensions.gen_salt('bf',4)))", [password]);
  await db.exec(readFileSync('docs/supabase-crm.sql', 'utf8'));
  for (const migration of readdirSync('supabase/migrations').filter(p => p.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'));
  }
  for (const [username, role] of [['release_reception', 'reception'], ['release_marketing', 'marketing']]) {
    await db.query('insert into samascan_auth.admins(username,password_hash,display_name,role) values($1,extensions.crypt($2,extensions.gen_salt(\'bf\',4)),$3,$4)', [username, password, `اختبار ${role}`, role]);
  }
  const key = readFileSync('lib/dashboard/session.ts', 'utf8').match(/const PUBLISHABLE_KEY = "([^"]+)"/)[1];
  const env = { get: name => ({ SUPABASE_URL: 'https://isolated.invalid', SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: key }), SUPABASE_SECRET_KEYS: '{"default":"isolated-test-only"}' })[name] };
  const crmRPCs = new Set(['samascan_crm_api', 'samascan_booking_cost_api', 'samascan_contact_daily_api', 'samascan_contact_api', 'samascan_growth_api', 'samascan_referral_api', 'samascan_outcome_report', 'samascan_followup_api', 'samascan_conversion_api']);
  let rpcCount = 0;
  let blockedOutbound = 0;
  const rpc = async (url, options) => {
    if (!url.startsWith('https://isolated.invalid/rest/v1/rpc/') || options.headers.apikey !== 'isolated-test-only') throw new Error('Unexpected RPC boundary');
    const name = new URL(url).pathname.split('/').pop();
    const args = JSON.parse(options.body);
    let sql, values;
    if (name === 'samascan_admin_auth') {
      sql = 'select public.samascan_admin_auth($1,$2,$3,$4) as result';
      values = [args.action, args.candidate_username ?? null, args.candidate_password ?? null, args.session_token ?? null];
    } else if (['samascan_booking_intake', 'samascan_contact_event_intake'].includes(name)) {
      sql = `select public.${name}($1::jsonb) as result`;
      values = [JSON.stringify(args.payload)];
    } else if (crmRPCs.has(name)) {
      sql = `select public.${name}($1,$2,$3::jsonb) as result`;
      values = [args.session_token, args.action, JSON.stringify(args.payload)];
    } else throw new Error('Unlisted RPC');
    rpcCount++;
    const result = await db.transaction(async tx => {
      await tx.exec('set local role service_role');
      return (await tx.query(sql, values)).rows[0].result;
    });
    return Response.json(result);
  };
  const handlers = new Map([
    ['samascan-admin', adminHandler(env, rpc)], ['samascan-crm', crmHandler(env, rpc)],
    ['samascan-booking', bookingHandler(env, rpc)], ['samascan-contact-events', contactHandler(env, rpc)],
  ]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const handler = handlers.get(url.pathname.split('/').pop());
    if (url.origin === 'https://vddoeiggfcwllfxpirep.supabase.co' && url.pathname.startsWith('/functions/v1/') && handler) {
      return handler(new Request(input, options));
    }
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return originalFetch(input, options);
    blockedOutbound++;
    throw new Error('External network is disabled in isolated release tests');
  };
  let handle;
  const server = createServer((req, res) => handle(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const app = next({ dev: false, hostname: 'localhost', port });
  await app.prepare();
  handle = app.getRequestHandler();
  return {
    url: `http://localhost:${port}`, password, db,
    stats: () => ({ rpcCount, blockedOutbound }),
    async expire(username) { await db.query("update samascan_auth.sessions set expires_at=now()-interval '1 second' where username=$1", [username]); },
    async close() {
      await new Promise(resolve => server.close(resolve));
      await app.close();
      globalThis.fetch = originalFetch;
      await db.close();
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixture = await startIsolatedReleaseServer();
  process.send({ ready: true, url: fixture.url, password: fixture.password });
  process.on('message', async message => {
    if (message.action === 'expire') await fixture.expire(message.username);
    if (message.action === 'session') {
      const rows = await fixture.db.query('select expires_at from samascan_auth.sessions where username=$1 order by created_at desc limit 1', [message.username]);
      process.send({ id: message.id, data: rows.rows[0] });
      return;
    }
    if (message.action === 'stats') { process.send({ id: message.id, data: fixture.stats() }); return; }
    if (message.action === 'stop') { await fixture.close(); process.exit(0); }
    process.send({ id: message.id, data: true });
  });
}
