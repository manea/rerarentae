import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

async function assertNoHorizontalOverflow(page: Page) {
  const dims = await page.evaluate(() => {
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const mainRect = main?.getBoundingClientRect();
    const headerRect = header?.getBoundingClientRect();
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      mainWidth: mainRect ? Math.ceil(mainRect.width) : 0,
      headerWidth: headerRect ? Math.ceil(headerRect.width) : 0,
    };
  });
  expect(dims.scrollWidth).toBeLessThanOrEqual(dims.innerWidth);
  expect(dims.mainWidth).toBeLessThanOrEqual(dims.innerWidth);
  expect(dims.headerWidth).toBeLessThanOrEqual(dims.innerWidth);
}

function buildCleanPortfolioCsv(): string {
  return [
    'unit_code,tenant_name,emirate,property_type,current_rent_aed,index_rent_aed,proposed_rent_aed,notice_days_served,notice_channel,registered',
    'BBAY-1805,Khalid Al Mazrouei,dubai_rera,residential,90000,105000,94500,105,notary_or_registered_mail,true',
    'AUH-REEM-1102,Mariam Al Dhaheri,abudhabi_adrec,residential,110000,120000,110000,90,notary_or_registered_mail,true',
  ].join('\n');
}

test.describe('ReraRentAE — UAE Rental Cap, Notice SLA & Eviction Readiness E2E', () => {
  test('defaults to AR RTL Alabaster DLD, toggles EN LTR Slate Night, and persists across reload', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.locator('header')).toContainText('SQLite WAL');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'alabaster-dld');
    await expect(page.locator('svg[role="img"]').first()).toBeVisible();
    await expect(page.getByTestId('status-badge')).toContainText('100/100');
    await expect(page.getByTestId('legal-disclaimer-banner')).toContainText('ليست تابعة أو معتمدة');
    await assertNoHorizontalOverflow(page);

    await page.screenshot({
      path: 'test-results/qa-screenshots/01-workspace-ar-alabaster-dld.png',
      fullPage: true,
      animations: 'disabled',
    });

    await page.getByTestId('lang-toggle-btn').click();
    await page.getByTestId('theme-toggle-btn').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'slate-night');
    await expect(page.getByTestId('legal-disclaimer-banner')).toContainText('NOT affiliated');
    await assertNoHorizontalOverflow(page);

    await page.screenshot({
      path: 'test-results/qa-screenshots/02-workspace-en-slate-night.png',
      fullPage: true,
      animations: 'disabled',
    });

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'slate-night');

    expect(errors).toEqual([]);
  });

  test('evaluates Preset 1/2/3 & remediates Preset 3 into sealed RNT-2026-0001 with BOM CSV & /r/:code', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const expectedCode = 'RNT-2026-0001';

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByTestId('lang-toggle-btn').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Preset 1: Dubai Ejari Compliant 0% Renewal (Ready 100/100)
    await page.getByTestId('preset-btn-dubai-ejari-compliant-renewal-ready').click();
    await expect(page.getByTestId('status-badge')).toContainText('Ready / Compliant');
    await expect(page.getByTestId('status-badge')).toContainText('100/100');

    // Preset 2: Dubai Marina 10% Decree-43 Conditional (90/100)
    await page.getByTestId('preset-btn-dubai-marina-decree43-conditional').click();
    await expect(page.getByTestId('status-badge')).toContainText('Conditional');
    await expect(page.getByTestId('status-badge')).toContainText('90/100');
    await assertNoHorizontalOverflow(page);

    await page.screenshot({
      path: 'test-results/qa-screenshots/03-dubai-marina-conditional-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });

    // Preset 3: Illegal Hike, Late WhatsApp, Unnotarized Eviction (Blocked 0/100)
    await page.getByTestId('preset-btn-dubai-illegal-hike-and-unnotarized-eviction-blocked').click();
    await expect(page.getByTestId('status-badge')).toContainText('Blocked / Breach');
    await expect(page.getByTestId('status-badge')).toContainText('0/100');

    // Remediate Preset 3: register in Ejari, clear re-rent ban breach, use notary mail + 105d notice, cap rent at +5% (94,500 AED), drop unlawful eviction
    await page.getByTestId('registry-checkbox').check();
    await page.getByTestId('rerent-ban-checkbox').uncheck();
    await page.getByTestId('channel-select').selectOption('notary_or_registered_mail');
    await page.getByTestId('rent-notice-days-input').fill('105');
    await page.getByTestId('proposed-rent-input').fill('94500');
    await page.getByTestId('eviction-select').selectOption('none');

    // Check all 6 controls on Controls tab
    await page.getByTestId('tab-controls').click();
    await page.getByTestId('select-all-controls-btn').click();

    // Replace invalid/malicious CSV rows with clean unit portfolio CSV
    await page.getByTestId('tab-csv').click();
    await page.getByTestId('csv-textarea').fill(buildCleanPortfolioCsv());

    await expect(page.getByTestId('status-badge')).toContainText('Ready / Compliant');
    await expect(page.getByTestId('status-badge')).toContainText('100/100');

    // Vault tab: save -> finalize -> download raw UTF-8 BOM CSV -> screenshot
    await page.getByTestId('tab-vault').click();
    await page.getByTestId('save-draft-btn').click();
    await expect(page.locator('main')).toContainText(expectedCode);

    await page.getByTestId(`finalize-${expectedCode}`).click();
    await expect(page.getByTestId(`finalize-${expectedCode}`)).toHaveCount(0);
    await expect(page.getByTestId(`open-public-${expectedCode}`)).toBeVisible();

    const dlPromise = page.waitForEvent('download');
    await page.getByTestId(`csv-${expectedCode}`).click();
    const dl = await dlPromise;
    expect(dl.suggestedFilename()).toContain('.csv');
    const dlPath = await dl.path();
    expect(dlPath).toBeTruthy();
    if (dlPath) {
      const bytes = fs.readFileSync(dlPath);
      expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    }

    await page.screenshot({
      path: 'test-results/qa-screenshots/04-sealed-dossier-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });

    // Public report route /r/:code & persistent view counter across reload
    await page.getByTestId(`open-public-${expectedCode}`).click();
    await expect(page.locator('body')).toContainText(expectedCode);
    await expect(page.locator('body')).toContainText('Deira Commercial Portfolio');
    await expect(page.getByTestId('public-view-count')).toContainText('1');

    await page.reload();
    await expect(page.locator('body')).toContainText(expectedCode);
    await expect(page.getByTestId('public-view-count')).toContainText('2');

    expect(errors).toEqual([]);
  });

  test('verifies mobile 390x844 responsiveness in AR Alabaster DLD and EN Slate Night with zero overflow', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('svg[role="img"]').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.screenshot({
      path: 'test-results/qa-screenshots/05-mobile-ar-alabaster-dld.png',
      fullPage: true,
      animations: 'disabled',
    });

    await page.getByTestId('lang-toggle-btn').click();
    await page.getByTestId('theme-toggle-btn').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'slate-night');
    await assertNoHorizontalOverflow(page);

    await page.screenshot({
      path: 'test-results/qa-screenshots/06-mobile-en-slate-night.png',
      fullPage: true,
      animations: 'disabled',
    });

    expect(errors).toEqual([]);
  });
});
