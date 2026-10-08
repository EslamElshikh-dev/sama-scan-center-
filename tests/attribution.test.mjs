import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSessionAttribution, clearAttributionParametersFromAddressBar } from '../lib/attribution.ts';

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
