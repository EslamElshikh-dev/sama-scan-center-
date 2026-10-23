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
    await context.route('**/*', route => new URL(route.request().url()).origin === fixture.url
      ? route.continue() : route.abort());
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
          for (const [selector, href] of [['.floating-call', 'tel:+966559617558'], ['.floating-whatsapp', 'https://wa.me/966559617558']]) {
            const action = page.locator(selector);
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

    // Real browser form -> Next -> original Edge handler -> disposable SQL.
    await page.goto(fixture.url + '/contact');
    await page.locator('#booking-form [name="name"]').fill('طلب متصفح معزول');
    await page.locator('#booking-form [name="phone"]').fill('0500000079');
    await page.locator('#booking-form [name="service"]').selectOption('سونار');
    const preferred = new Date(Date.now() + 86400000);
    if (preferred.getUTCDay() === 5) preferred.setUTCDate(preferred.getUTCDate() + 1);
    await page.locator('#booking-form [name="date"]').fill(preferred.toISOString().slice(0, 10));
    await page.locator('#booking-form [name="period"]').selectOption('evening');
    await page.locator('#booking-form [name="consent"]').check();
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
