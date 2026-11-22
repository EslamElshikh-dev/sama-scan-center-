import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startIsolatedReleaseServer } from './helpers/release-server.mjs';

test('mobile/desktop services, contact actions, real browser login and booking stay isolated', { timeout: 120000 }, async t => {
  process.env.SAMA_RELEASE_TEST = 'isolated';
  const fixture = await startIsolatedReleaseServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    // Even browser analytics, maps and external links cannot contact live systems.
    const isolateNetwork = route => new URL(route.request().url()).origin === fixture.url
      ? route.continue() : route.abort();
    await context.route('**/*', isolateNetwork);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const paths = ['/', '/services', '/services/mri-riyadh', '/services/ultrasound-riyadh', '/services/doppler-duplex-riyadh', '/services/3d-4d-ultrasound-riyadh', '/contact'];
    for (const width of [320, 390, 768, 1440]) {
      await t.test(`service and booking pages at ${width}px`, async () => {
        await page.setViewportSize({ width, height: 900 });
        for (const path of paths) {
          const response = await page.goto(fixture.url + path, { waitUntil: 'networkidle' });
          assert.equal(response.status(), 200, path);
          assert.equal(await page.locator('h1').count(), 1, path);
          assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
          const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
          assert.ok(layout.scroll <= layout.width + 1, `${path} overflows at ${width}px: ${layout.scroll}`);
          // MRI/ultrasound mobile layouts intentionally use a fixed bottom bar.
          for (const [selector, href] of [['.floating-call, [data-cta$="_mobile_call"]', 'tel:+966559617558'], ['.floating-whatsapp, [data-cta$="_mobile_whatsapp"]', 'https://wa.me/966559617558']]) {
            const action = page.locator(selector).filter({ visible: true });
            assert.equal(await action.count(), 1, `${path}: one persistent contact action per channel`);
            assert.equal(await action.isVisible(), true, `${path}: ${selector}`);
            assert.ok((await action.getAttribute('href')).startsWith(href));
            const rect = await action.boundingBox();
            assert.ok(rect.width >= 44 && rect.height >= 44 && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width + 1 && rect.y + rect.height <= 901, `${path}: contact target is clipped`);
          }
          const brokenImages = await page.locator('img').evaluateAll(images => images.filter(img => img.complete && img.naturalWidth === 0).map(img => img.getAttribute('src')));
          assert.deepEqual(brokenImages, [], path);
        }
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(fixture.url);
    await page.locator('.mobile-nav summary').click();
    assert.equal(await page.locator('.mobile-nav').getAttribute('open'), '');
    await page.locator('.mobile-nav nav a[href="/services"]').click();
    await page.waitForURL(fixture.url + '/services');

    await t.test('tagged landing is sent once before the browser address is cleaned', async () => {
      const landing = fixture.url + '/services/ultrasound-riyadh?utm_source=google&utm_medium=cpc&utm_campaign=isolated&gclid=test-click';
      await page.goto(landing, { waitUntil: 'networkidle' });
      assert.equal(new URL(page.url()).search, '?gclid=test-click');
      assert.equal(await page.locator('main img[fetchpriority="high"]').getAttribute('loading'), 'eager');

      const commands = await page.evaluate(() => window.dataLayer.map(command => Array.from(command)));
      assert.ok(commands.some(([command, id, settings]) =>
        command === 'config' && id.startsWith('AW-') && settings.send_page_view === false));
      const ga4 = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
      if (ga4) {
        assert.ok(commands.some(([command, id, settings]) =>
          command === 'config' && id === ga4 && settings.send_page_view === false));
        assert.deepEqual(commands.filter(([command, name]) => command === 'event' && name === 'page_view'), [
          ['event', 'page_view', { page_location: landing, send_to: 'analytics' }],
        ]);
      }
    });

    await t.test('booking has usable contact links without JavaScript', async () => {
      const offlineContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      try {
        await offlineContext.route('**/*', isolateNetwork);
        const offlinePage = await offlineContext.newPage();
        await offlinePage.goto(fixture.url + '/contact?service=ultrasound-riyadh');
        const fallback = offlinePage.locator('.booking-fallback');
        assert.equal(await offlinePage.locator('#booking-form button[type="submit"]').isDisabled(), true);
        assert.equal(await fallback.getByRole('link', { name: 'اتصل بالاستقبال' }).getAttribute('href'), 'tel:+966559617558');
        assert.ok((await fallback.getByRole('link', { name: 'تواصل عبر واتساب' }).getAttribute('href')).startsWith('https://wa.me/966559617558'));
      } finally {
        await offlineContext.close();
      }
    });

    // Real browser form -> Next -> original Edge handler -> disposable SQL.
    await page.goto(fixture.url + '/contact');
    const footer = page.locator('.site-footer');
    const showMap = footer.getByRole('button', { name: 'عرض الخريطة' });
    assert.equal(await footer.locator('iframe').count(), 0);
    assert.ok((await footer.getByRole('link', { name: 'افتح الاتجاهات' }).getAttribute('href')).startsWith('https://www.google.com/maps/'));
    await showMap.click();
    await footer.locator('iframe').waitFor({ state: 'attached' });
    assert.equal(await footer.getByRole('button', { name: 'إخفاء الخريطة' }).getAttribute('aria-expanded'), 'true');

    await page.locator('#booking-form [name="name"]').fill('طلب متصفح معزول');
    await page.locator('#booking-form [name="phone"]').fill('0500000079');
    await page.locator('#booking-form [name="service"]').selectOption('سونار');
    const preferred = new Date(Date.now() + 86400000);
    if (preferred.getUTCDay() === 5) preferred.setUTCDate(preferred.getUTCDate() + 1);
    await page.locator('#booking-form [name="date"]').fill(preferred.toISOString().slice(0, 10));
    await page.locator('#booking-form [name="period"]').selectOption('evening');
    await page.locator('#booking-form [name="consent"]').check();
    await page.route('**/api/booking', route => route.fulfill({ status: 503, json: { ok: false, code: 'unavailable' } }), { times: 1 });
    await page.getByRole('button', { name: 'إرسال طلب الحجز', exact: true }).click();
    await page.locator('.booking-error').waitFor();
    await page.locator('.booking-fallback [data-cta="booking_error_call"]').waitFor();
    await page.locator('.booking-fallback [data-cta="booking_fallback_whatsapp"]').waitFor();
    await page.getByRole('button', { name: 'إرسال طلب الحجز', exact: true }).click();
    await page.getByRole('heading', { name: 'وصل طلبك إلى الاستقبال' }).waitFor();
    const records = await fixture.db.query('select count(*)::int as count from samascan_crm.inquiries');
    assert.equal(records.rows[0].count, 1);

    await page.goto(fixture.url + '/dashboard');
    await page.locator('#admin-username').fill('release_reception');
    await page.locator('#admin-password').fill(fixture.password);
    await page.locator('.admin-login button').click();
    await page.waitForURL(fixture.url + '/dashboard');
    await page.locator('.admin-login').waitFor({ state: 'hidden' });
    const session = (await context.cookies()).find(cookie => cookie.name === '__Host-sama_admin');
    assert.ok(session?.httpOnly && session.secure && session.sameSite === 'Lax');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.admin-login').count(), 0);
    await fixture.expire('release_reception');
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#admin-password').waitFor();
    assert.deepEqual(errors, []);
    assert.equal(fixture.stats().blockedOutbound, 0);
    await context.close();
  } finally {
    await browser?.close();
    await fixture.close();
  }
});
