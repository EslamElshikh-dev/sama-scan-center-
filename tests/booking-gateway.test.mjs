import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../backend/samascan-booking/index.mjs';
const env = { get: key => ({ SUPABASE_URL: 'https://crm.example', SUPABASE_PUBLISHABLE_KEYS: '{"default":"public-test"}', SUPABASE_SECRET_KEYS: '{"default":"private-test"}' })[key] };
const req = body => new Request('https://crm.example', { method: 'POST', headers: { apikey: 'public-test' }, body: JSON.stringify(body) });

test('anonymous intake rejects missing key, oversized bodies, arrays and honeypot submissions before RPC', async () => {
  let calls = 0; const handler = createHandler(env, async () => { calls++; return Response.json({ ok: true }); });
  assert.equal((await handler(new Request('https://crm.example', { method: 'POST', body: '{}' }))).status, 403);
  for (const body of [[], { company: 'spam' }, { name: 'x'.repeat(6001) }]) assert.equal((await handler(req(body))).status, 400);
  assert.equal(calls, 0);
});
test('booking receipt excludes database identifiers, patient data and upstream fields', async () => {
  const payload = { name: 'Test', request_id: 'test' };
  const handler = createHandler(env, async (url, options) => {
    assert.equal(url, 'https://crm.example/rest/v1/rpc/samascan_booking_intake');
    assert.equal(options.headers.apikey, 'private-test');
    assert.deepEqual(JSON.parse(options.body), { payload });
    return Response.json({ ok: true, reference: 'SS-123456789ABC', inquiry_id: 'private-id', phone: 'private-phone' });
  });
  assert.deepEqual(await (await handler(req(payload))).json(), { ok: true, reference: 'SS-123456789ABC' });
});
test('intake preserves throttling and fails closed on invalid receipts or upstream errors', async () => {
  for (const [result, status] of [[{ ok: false, code: 'rate_limit' }, 429], [{ ok: false, code: 'invalid' }, 400], [{ ok: true, reference: 'not-a-receipt' }, 503], [{ error: 'private database detail' }, 503]]) {
    const response = await createHandler(env, async () => Response.json(result))(req({}));
    assert.equal(response.status, status); assert.equal((await response.text()).includes('private'), false);
  }
  const response = await createHandler(env, async () => new Response('secret', { status: 500 }))(req({}));
  assert.equal(response.status, 503); assert.equal((await response.text()).includes('secret'), false);
});
