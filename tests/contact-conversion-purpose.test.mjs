import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const compile = path => ts.transpileModule(
  readFileSync(new URL(path, import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const conversionCode = compile('../lib/google-ads.ts');
const trackerCode = compile('../components/click-tracker.tsx');

function tracker() {
  const conversions = [], analytics = [], recorded = [];
  const handlers = new Map();
  let cleanup;
  const attribution = { channel: 'google_ads', campaign: 'sama_search_riyadh_202610' };
  const attributionModule = {
    getSessionAttribution: () => attribution,
    clearAttributionParametersFromAddressBar: () => {},
    getAttributionLabel: () => 'إعلانات Google',
    getAnalyticsAttribution: () => ({ traffic_channel: 'google_ads' }),
    sendAnalyticsEvent: (name, data) => analytics.push([name, JSON.parse(JSON.stringify(data))]),
    sendGoogleTagEvent: (name, data) => conversions.push([name, JSON.parse(JSON.stringify(data))]),
  };
  class Element {
    closest() { return this; }
  }
  class Anchor extends Element {
    constructor(cta, href) { super(); this.dataset = { cta }; this.href = href; }
    getAttribute(name) { return name === 'href' ? this.href : null; }
  }
  const document = {
    addEventListener: (name, handler) => handlers.set(name, handler),
    removeEventListener: name => handlers.delete(name),
  };
  const conversionExports = {};
  runInNewContext(conversionCode, {
    exports: conversionExports,
    require: id => {
      assert.equal(id, '@/lib/attribution');
      return attributionModule;
    },
  });
  const exports = {};
  runInNewContext(trackerCode, {
    exports, document, URL, Date, Element, HTMLAnchorElement: Anchor,
    window: { location: { pathname: '/contact' } },
    require: id => {
      if (id === 'react') return { useEffect: effect => { cleanup = effect(); } };
      if (id === '@/lib/google-ads') return conversionExports;
      if (id === '@/lib/attribution') return attributionModule;
      if (id === '@/lib/contact-events') return {
        recordContactClick: (kind, cta, source) => {
          recorded.push({ kind, cta, source });
          return 'SC-ABCDEF123456';
        },
      };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  exports.ClickTracker();
  return {
    conversions, analytics, recorded,
    click(cta, href) {
      const anchor = new Anchor(cta, href);
      handlers.get('click')({ target: anchor });
      return anchor;
    },
    close: () => cleanup(),
  };
}

test('booking WhatsApp follow-up keeps its receipt and internal measurement without another acquisition conversion', () => {
  const t = tracker();
  const originalMessage = 'مرحبًا، أتابع طلب الحجز رقم SS-ABCDEF123456';
  const link = t.click('booking_receipt_whatsapp', `https://wa.me/966555000000?text=${encodeURIComponent(originalMessage)}`);
  assert.equal(t.conversions.length, 0);
  assert.equal(t.recorded.length, 1);
  assert.equal(t.recorded[0].cta, 'booking_receipt_whatsapp');
  assert.equal(t.analytics[0][0], 'cta_click');
  assert.equal(t.analytics[0][1].contact_purpose, 'booking_followup');
  const message = new URL(link.href).searchParams.get('text');
  assert.ok(message.startsWith(originalMessage));
  assert.ok(message.includes('مرجع التواصل: SC-ABCDEF123456'));
  assert.equal(new URL(link.href).pathname, '/966555000000');
  t.close();
});

test('initial WhatsApp contact still sends exactly one existing Ads conversion', () => {
  const t = tracker();
  t.click('hero_mri-riyadh_whatsapp', 'https://wa.me/966555000000?text=hello');
  assert.deepEqual(t.conversions, [['conversion', {
    send_to: 'AW-18360481022/LWtYCKTlgJQdEP7p-rJE', value: 0, currency: 'SAR',
  }]]);
  assert.equal(t.analytics[0][1].contact_purpose, 'initial_contact');
  t.close();
});

test('phone contact, including receipt follow-up, preserves the phone link and existing conversion', () => {
  for (const cta of ['hero_mri-riyadh_call', 'booking_receipt_call']) {
    const t = tracker();
    const link = t.click(cta, 'tel:+966555000000');
    assert.equal(link.href, 'tel:+966555000000');
    assert.deepEqual(t.conversions, [['conversion', {
      send_to: 'AW-18360481022/5YNFCKHlgJQdEP7p-rJE', value: 0, currency: 'SAR',
    }]]);
    assert.equal(t.analytics[0][1].contact_purpose,
      cta === 'booking_receipt_call' ? 'booking_followup' : 'initial_contact');
    t.close();
  }
});

test('non-contact navigation does not emit an Ads conversion', () => {
  const t = tracker();
  t.click('hero_center_booking', '/contact#booking-form');
  assert.equal(t.conversions.length, 0);
  assert.equal(t.recorded.length, 0);
  t.close();
});
