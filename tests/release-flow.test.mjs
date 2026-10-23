import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

let child, origin, password;
let sequence = 0;
const pending = new Map();
const control = (action, values = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error('Fixture control timeout')); }, 15000);
  pending.set(id, data => { clearTimeout(timeout); resolve(data); });
  child.send({ id, action, ...values });
});
before(async () => {
  child = fork(new URL('./helpers/release-server.mjs', import.meta.url), [], {
    env: { ...process.env, SAMA_RELEASE_TEST: 'isolated', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  // Output can contain implementation errors, but never request bodies or tokens.
  child.stdout.on('data', () => {});
  child.stderr.on('data', data => process.stderr.write(data));
  child.on('message', message => { if (message.id) { pending.get(message.id)?.(message.data); pending.delete(message.id); } });
  const [ready] = await Promise.race([
    once(child, 'message'),
    once(child, 'exit').then(() => { throw new Error('Isolated server exited before readiness'); }),
    new Promise((_, reject) => { const timeout = setTimeout(() => reject(new Error('Isolated server startup timeout')), 60000); timeout.unref(); }),
  ]);
  assert.equal(ready.ready, true);
  origin = ready.url;
  password = ready.password;
});
after(async () => {
  if (child?.connected) { child.send({ action: 'stop' }); await once(child, 'exit'); }
});

async function post(path, body, cookie, options = {}) {
  return fetch(origin + path, { method: 'POST', redirect: 'manual', headers: {
    Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...options.headers,
  }, body: JSON.stringify(body) });
}
async function login(username = 'admin', candidate = password) {
  const response = await fetch(origin + '/api/dashboard/login', { method: 'POST', redirect: 'manual',
    headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password: candidate }),
  });
  assert.equal(response.status, 303);
  return { response, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const crm = (cookie, action, payload = {}) => post('/api/dashboard/crm', { action, payload }, cookie);

test('real login sets a private eight-hour cookie; reload preserves identity without extending expiry', async () => {
  const invalid = await login('admin', 'incorrect-isolated-password');
  assert.equal(invalid.cookie, undefined);
  assert.match(invalid.response.headers.get('location'), /error=credentials/);
  const { response, cookie } = await login();
  assert.ok(cookie);
  for (const flag of [/HttpOnly/i, /Secure/i, /SameSite=lax/i, /Path=\//i, /Max-Age=28800/i]) assert.match(response.headers.get('set-cookie'), flag);
  assert.match(cookie, /^__Host-sama_admin=[a-f0-9]{64}$/);
  const beforeExpiry = await control('session', { username: 'admin' });
  for (let i = 0; i < 2; i++) {
    const page = await fetch(origin + '/dashboard', { headers: { Cookie: cookie } });
    assert.equal(page.status, 200);
    assert.doesNotMatch(await page.text(), /id="admin-password"/);
    const summary = await crm(cookie, 'summary');
    assert.equal(summary.status, 200); assert.equal((await summary.json()).ok, true);
  }
  assert.deepEqual(await control('session', { username: 'admin' }), beforeExpiry);
});

test('expired sessions fail closed; signing in again issues a fresh session and logout revokes it', async () => {
  const first = await login('release_reception');
  await control('expire', { username: 'release_reception' });
  assert.equal((await crm(first.cookie, 'summary')).status, 401);
  const page = await fetch(origin + '/dashboard', { headers: { Cookie: first.cookie } });
  assert.match(await page.text(), /id="admin-password"/);
  const second = await login('release_reception');
  assert.notEqual(second.cookie, first.cookie);
  assert.equal((await crm(second.cookie, 'summary')).status, 200);
  const logout = await post('/api/dashboard/logout', {}, second.cookie);
  assert.equal(logout.status, 303);
  assert.match(logout.headers.get('set-cookie'), /(?:Max-Age=0|Expires=Thu, 01 Jan 1970)/i);
  assert.equal((await crm(second.cookie, 'summary')).status, 401);
});

test('admin, reception and marketing permissions are enforced by the database through Next routes', async () => {
  const admin = (await login()).cookie;
  const reception = (await login('release_reception')).cookie;
  const marketing = (await login('release_marketing')).cookie;
  assert.equal((await crm(admin, 'list', { entity: 'team' })).status, 200);
  assert.equal((await crm(reception, 'summary')).status, 200);
  for (const entity of ['team', 'audit']) assert.equal((await crm(reception, 'list', { entity })).status, 403);
  assert.equal((await crm(reception, 'save_user')).status, 403);
  for (const action of ['summary', 'source_report', 'contact_record', 'booking_cost_save']) assert.equal((await crm(marketing, action)).status, 403, action);
  for (const action of ['contact_metrics', 'booking_cost_report']) {
    const aggregate = await crm(marketing, action);
    assert.equal(aggregate.status, 200, action);
    assert.doesNotMatch(await aggregate.text(), /"(?:password_hash|token_hash|name|note)"|"phone":\s*"[+0-9]/);
  }
  assert.equal((await crm(marketing, 'list', { entity: 'contacts' })).status, 403);
  const team = await (await crm(admin, 'list', { entity: 'team' })).json();
  const staff = team.rows.find(row => row.username === 'release_marketing');
  assert.equal((await crm(admin, 'save_user', { ...staff, active: false })).status, 200);
  assert.equal((await crm(marketing, 'summary')).status, 401);
});

test('booking travels from public Next API to Edge handler and Postgres; retry is idempotent and reception can confirm', async () => {
  const preferred = new Date(Date.now() + 86400000);
  if (preferred.getUTCDay() === 5) preferred.setUTCDate(preferred.getUTCDate() + 1);
  const payload = { request_id: randomUUID(), name: 'طلب اختبار معزول', phone: '0500000078', exam: 'سونار',
    requested_date: preferred.toISOString().slice(0, 10), requested_period: 'evening', consent: true, company: '',
    attribution: { channel: 'google_business_profile', source: 'google', medium: 'organic', campaign: 'gbp', content: 'appointment', landingPage: '/contact', referrerHost: '' },
  };
  const response = await post('/api/booking', payload);
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert.deepEqual(Object.keys(receipt).sort(), ['ok', 'reference']);
  assert.match(receipt.reference, /^SS-[A-F0-9]{12}$/);
  assert.deepEqual(await (await post('/api/booking', payload)).json(), receipt);
  const reception = (await login('release_reception')).cookie;
  const inquiries = await (await crm(reception, 'list', { entity: 'inquiries' })).json();
  assert.equal(inquiries.total, 1);
  const inquiry = inquiries.rows[0];
  assert.equal(inquiry.booking_reference, receipt.reference);
  assert.equal(inquiry.stage, 'new');
  const appointments = await (await crm(reception, 'list', { entity: 'appointments' })).json();
  assert.equal(appointments.total, 0, 'Public intake does not reserve a slot');
  const start = new Date(preferred.toISOString().slice(0, 10) + 'T12:00:00+03:00');
  const appointment = { entity: 'appointments', id: randomUUID(), version: 0, contact_id: inquiry.contact_id, inquiry_id: inquiry.id,
    exam: 'سونار', resource: 'US', starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 1800000).toISOString(), status: 'confirmed' };
  const saved = await crm(reception, 'save', appointment);
  assert.equal(saved.status, 200); assert.equal((await saved.json()).ok, true);
  assert.equal((await crm(reception, 'save', { ...appointment, id: randomUUID(), inquiry_id: undefined })).status, 409);
  const updated = await (await crm(reception, 'list', { entity: 'inquiries' })).json();
  assert.equal(updated.rows[0].stage, 'booked');
  assert.equal((await post('/api/booking', { ...payload, consent: false })).status, 400);
});

test('anonymous, forged, cross-origin and malformed writes are rejected before privileged RPC', async () => {
  const beforeStats = await control('stats');
  assert.equal((await crm(undefined, 'summary')).status, 401);
  assert.equal((await crm('__Host-sama_admin=forged', 'summary')).status, 401);
  assert.equal((await post('/api/dashboard/crm', { action: 'summary' }, undefined, { headers: { Origin: 'https://untrusted.invalid' } })).status, 403);
  assert.equal((await post('/api/booking', {}, undefined, { headers: { Origin: 'https://untrusted.invalid' } })).status, 403);
  assert.equal((await post('/api/booking', {})).status, 400);
  assert.equal((await post('/api/booking', { note: 'x'.repeat(6500) })).status, 400);
  const afterStats = await control('stats');
  assert.equal(afterStats.rpcCount, beforeStats.rpcCount);
  assert.equal(afterStats.blockedOutbound, 0);
});

test('all sitemap URLs render with canonical, structured data and live contact targets', async () => {
  const sitemapResponse = await fetch(origin + '/sitemap.xml');
  assert.equal(sitemapResponse.status, 200);
  const xml = await sitemapResponse.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]));
  assert.ok(urls.length >= 30);
  assert.equal(new Set(urls.map(url => url.href)).size, urls.length);
  for (const url of urls) {
    assert.equal(url.origin, 'https://samascan.vercel.app');
    assert.doesNotMatch(url.pathname, /dashboard|admin|api/);
    const response = await fetch(origin + url.pathname);
    assert.equal(response.status, 200, url.pathname);
    const html = await response.text();
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(canonical, url.pathname);
    assert.equal(new URL(canonical[1]).href, url.href, url.pathname);
    assert.match(html, /href="tel:\+966559617558"/);
    assert.match(html, /href="https:\/\/wa.me\/966559617558/);
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
    assert.ok(schemas.length > 0, url.pathname);
    for (const match of schemas) assert.equal(typeof JSON.parse(match[1]), 'object');
  }
  const dashboard = await (await fetch(origin + '/dashboard')).text();
  assert.match(dashboard, /noindex/);
  const image = await fetch(origin + '/sama-scan-share-v2.png');
  assert.equal(image.status, 200); assert.match(image.headers.get('content-type'), /image\/png/);
  const sharp = (await import('sharp')).default;
  const metadata = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
  assert.equal(metadata.width, 1200); assert.equal(metadata.height, 630);
});
