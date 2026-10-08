import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../backend/samascan-contact-events/index.mjs';
const env = { get: key => ({ SUPABASE_URL: 'https://crm.example', SUPABASE_PUBLISHABLE_KEYS: '{"default":"public-test"}', SUPABASE_SECRET_KEYS: '{"default":"private-test"}' })[key] };
const req = body => new Request('https://crm.example', { method: 'POST', headers: { apikey: 'public-test' }, body: JSON.stringify(body) });
test('contact gateway rejects unauthenticated and malformed input without database access', async () => {
  let calls = 0; const handler = createHandler(env, async () => { calls++; return Response.json({ ok: true }); });
  assert.equal((await handler(new Request('https://crm.example', { method: 'POST', body: '{}' }))).status, 403);
  for (const payload of [[], null, { cta: 'x'.repeat(3501) }]) assert.equal((await handler(req(payload))).status, 400);
  assert.equal(calls, 0);
});
test('event intake returns only acknowledgement; retries and rate limits remain explicit', async () => {
  const payload = { event_id: 'event' };
  const handler = createHandler(env, async (url, options) => {
    assert.equal(url, 'https://crm.example/rest/v1/rpc/samascan_contact_event_intake');
    assert.deepEqual(JSON.parse(options.body), { payload });
    return Response.json({ ok: true, private_data: 'never-return' });
  });
  assert.deepEqual(await (await handler(req(payload))).json(), { ok: true });
  const limited = createHandler(env, async () => Response.json({ ok: false, code: 'rate_limit' }));
  assert.equal((await limited(req(payload))).status, 429);
  const unavailable = createHandler(env, async () => new Response('private database error', { status: 500 }));
  assert.deepEqual(await (await unavailable(req(payload))).json(), { ok: false, code: 'unavailable' });
});
