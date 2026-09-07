import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const PRODUCT_ID = 'SER-LIXIL-GIESTA2';
const OUT = 'artifacts/giesta2-runtime-browser-qa';
await mkdir(OUT, { recursive: true });

const report = { status: 'RUNNING', desktop: {}, mobile: {}, consoleErrors: [], pageErrors: [], failedResponses: [] };
const browser = await chromium.launch({ headless: true });

function track(page) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) report.failedResponses.push({ status: response.status(), url: response.url() });
  });
}

async function openGiesta2(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'CATALOG CONNECTED');
  await page.selectOption('#manufacturer', 'LIXIL');
  await page.waitForFunction((id) => [...document.querySelectorAll('#product option')].some((option) => option.value === id && !option.disabled), PRODUCT_ID);
  const response = page.waitForResponse((r) => r.url().includes('/api/runtime-master/resolve') && r.status() === 200);
  await page.selectOption('#product', PRODUCT_ID);
  await response;
  await page.waitForFunction(() => document.querySelectorAll('#dynamicForm [data-spec-key]').length > 0);
}

try {
  const preflightContext = await browser.newContext();
  const preflightPage = await preflightContext.newPage();
  const integrationsResponse = await preflightPage.request.get(`${BASE}/api/runtime-master/integrations`);
  assert.equal(integrationsResponse.status(), 200);
  const integrations = await integrationsResponse.json();
  await preflightContext.close();
  const giesta2 = integrations.find((row) => row.id === PRODUCT_ID);
  assert.ok(giesta2, 'Giesta2 Runtime integration must be listed');
  assert.equal(giesta2.status, 'READY');
  assert.equal(giesta2.selectable, true);
  assert.equal(giesta2.packageVersion, 'v0.8-R1');
  assert.equal(giesta2.schemaVersion, '1.0');

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const desktop = await desktopContext.newPage();
  track(desktop);
  await openGiesta2(desktop);
  const desktopFieldCount = await desktop.locator('#dynamicForm [data-spec-key]').count();
  assert.ok(desktopFieldCount > 0);
  const desktopOverflow = await desktop.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(desktopOverflow <= 1, `desktop overflow: ${desktopOverflow}`);
  const summary = await desktop.locator('#selectionSummary').innerText();
  assert.match(summary, /項目を選択してください|選択/);
  report.desktop = { fieldCount: desktopFieldCount, overflow: desktopOverflow, status: 'PASS' };
  await desktop.screenshot({ path: `${OUT}/desktop-1440x1000.png`, fullPage: true });
  await desktopContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  track(mobile);
  await openGiesta2(mobile);
  const mobileFieldCount = await mobile.locator('#dynamicForm [data-spec-key]').count();
  assert.ok(mobileFieldCount > 0);
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(mobileOverflow <= 1, `mobile overflow: ${mobileOverflow}`);
  report.mobile = { fieldCount: mobileFieldCount, overflow: mobileOverflow, status: 'PASS' };
  await mobile.screenshot({ path: `${OUT}/mobile-390x844.png`, fullPage: true });
  await mobileContext.close();

  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.failedResponses, []);
  report.status = 'PASS';
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'FAIL';
  report.failure = error.stack ?? String(error);
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
