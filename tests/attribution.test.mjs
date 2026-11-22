import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSessionAttribution, clearAttributionParametersFromAddressBar, sendAnalyticsEvent } from '../lib/attribution.ts';
import { recordContactClick } from '../lib/contact-events.ts';

test('ad auto-tagging replaces a direct session; attribution survives clean URLs and service navigation', () => {
  const stored = new Map();
  globalThis.document = { referrer: '' };
  globalThis.window = {
    location: new URL('https://samascan.vercel.app/'),
    sessionStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) },
    history: { state: {}, replaceState: (_state, _title, address) => { window.location = new URL(address, window.location); } },
  };
  assert.equal(getSessionAttribution().channel, 'direct');
  window.location = new URL('https://samascan.vercel.app/services/mri-riyadh?gclid=test-click');
  assert.equal(getSessionAttribution().channel, 'google_ads');
  window.location = new URL('https://samascan.vercel.app/services/mri-riyadh?gclid=test-click&utm_source=google&utm_medium=cpc&utm_campaign=sama_search_riyadh_202610&utm_content=mri');
  assert.equal(getSessionAttribution().campaign, 'sama_search_riyadh_202610');
  clearAttributionParametersFromAddressBar();
  assert.equal(window.location.search, '?gclid=test-click');
  assert.equal(getSessionAttribution().campaign, 'sama_search_riyadh_202610');
  window.location = new URL('https://samascan.vercel.app/contact');
  assert.equal(getSessionAttribution().channel, 'google_ads');
  assert.equal(getSessionAttribution().landingPage, '/services/mri-riyadh');
  window.location = new URL('https://samascan.vercel.app/contact?utm_source=google&utm_medium=organic&utm_campaign=gbp');
  assert.equal(getSessionAttribution().channel, 'google_business_profile');
  delete globalThis.document; delete globalThis.window;
});

test('GA4 events queued before the tag loads use the gtag command format', t => {
  globalThis.window = {};
  t.after(() => { delete globalThis.window; });
  sendAnalyticsEvent('cta_click', { cta_destination: 'phone' });
  sendAnalyticsEvent('booking_request_saved', { lead_channel: 'website_form' });
  assert.equal(Object.prototype.toString.call(window.dataLayer[0]), '[object Arguments]');
  assert.deepEqual(window.dataLayer.map(command => Array.from(command)), [
    ['event', 'cta_click', { cta_destination: 'phone', send_to: 'analytics' }],
    ['event', 'booking_request_saved', { lead_channel: 'website_form', send_to: 'analytics' }],
  ]);
});

test('contact events fall back to one keepalive request when the beacon cannot be queued', async t => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  globalThis.window = { location: { pathname: '/contact' } };
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {} };
  t.after(() => {
    Object.defineProperty(globalThis, 'navigator', originalNavigator);
    delete globalThis.window;
    delete globalThis.sessionStorage;
  });
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  const attribution = {
    channel: 'google_ads', source: 'google', medium: 'cpc', campaign: 'isolated',
    content: 'ultrasound', landingPage: '/services/ultrasound-riyadh', referrerHost: '',
  };

  for (const [sendBeacon, expectedRequests] of [
    [undefined, 1],
    [() => false, 1],
    [() => { throw new Error('beacon unavailable'); }, 1],
    [() => true, 0],
  ]) {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { sendBeacon } });
    fetch.mock.resetCalls();
    const reference = recordContactClick('whatsapp', 'test_whatsapp', attribution);
    assert.match(reference, /^SC-[A-F0-9]{12}$/);
    assert.equal(fetch.mock.callCount(), expectedRequests);
    if (expectedRequests) {
      const [path, request] = fetch.mock.calls[0].arguments;
      assert.equal(path, '/api/contact-events');
      assert.equal(request.method, 'POST');
      assert.equal(request.keepalive, true);
      const { event_id, kind, attribution: recordedAttribution } = JSON.parse(request.body);
      assert.equal(reference, 'SC-' + event_id.replaceAll('-', '').slice(0, 12).toUpperCase());
      assert.equal(kind, 'whatsapp');
      assert.deepEqual(recordedAttribution, attribution);
    }
  }
});
