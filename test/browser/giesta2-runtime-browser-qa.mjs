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

async function choose(page, key, value) {
  const response = page.waitForResponse(r => r.url().includes('/api/runtime-master/resolve') && r.status() === 200);
  await page.locator(`[data-spec-key="${key}"]`).selectOption(value);
  const result = await (await response).json();
  await page.waitForFunction(({key, value}) => {
    const el = document.querySelector(`[data-spec-key="${key}"]`);
    return el && (Array.isArray(value) ? JSON.stringify([...el.selectedOptions].map(o => o.value)) === JSON.stringify(value) : el.value === value);
  }, {key, value});
  return result;
}

async function exercise(page) {
  await choose(page, 'design', 'GST2_G11');
  await choose(page, 'configuration', 'single');
  await choose(page, 'thermal_spec', 'k2');
  await choose(page, 'door_color', 'ED');
  await choose(page, 'frame_color', 'GST2_FRAME_COLOR_NATURAL_SILVER');
  await choose(page, 'handle', 'GST2_HANDLE_S');
  let result = await choose(page, 'lock_system', 'GST2_LOCK_FAMILOCK');
  assert.equal(result.selection.glass, 'GST2_GLASS_STD_K2');
  assert.equal(result.validation.status, 'VALID');
  result = await choose(page, 'option', ['GST2_OPT_ELOCK_BUTTON', 'GST2_OPT_SECRET_SWITCH']);
  assert.ok(result.derivedOptions.includes('GST2_OPT_CONTROLLER'));
  assert.ok(result.derivedEntities.some(row => row.relationship === 'FIXES'));
  assert.ok(result.derivedEntities.some(row => row.relationship === 'ENABLES'));
  assert.equal(await page.locator('[data-spec-key="size"]').count(), 0);
  assert.deepEqual(result.derivedComponents, []);
  const invalid = await page.request.get(`${BASE}/api/runtime-master/resolve?${new URLSearchParams({productId: PRODUCT_ID, selection: JSON.stringify({...result.selection, design:'__INVALID__'})})}`);
  assert.equal((await invalid.json()).validation.status, 'INVALID');
  for (const configuration of ['single_sidelight', 'double_sidelight']) {
    result = await choose(page, 'configuration', configuration);
    assert.equal(result.selection.option, undefined);
    assert.equal(result.selection.thermal_spec, undefined);
    result = await choose(page, 'thermal_spec', 'k2');
    const glass = result.fields.find(f => f.key === 'glass');
    assert.ok(glass.values.length > 1 && glass.values.every(v => v.value.startsWith('GST2_GLASS_SIDE_')));
    await choose(page, 'glass', glass.values[0].value);
  }
  result = await choose(page, 'design', 'GST2_C11');
  assert.equal(result.selection.configuration, undefined);
  assert.equal(result.selection.glass, undefined);
  assert.notEqual(result.validation.status, 'VALID');
  // Leave a complete representative configuration in the screenshots.
  await choose(page, 'design', 'GST2_G11');
  await choose(page, 'configuration', 'single');
  await choose(page, 'thermal_spec', 'k2');
  await choose(page, 'door_color', 'ED');
  await choose(page, 'frame_color', 'GST2_FRAME_COLOR_NATURAL_SILVER');
  await choose(page, 'handle', 'GST2_HANDLE_S');
  await choose(page, 'lock_system', 'GST2_LOCK_FAMILOCK');
  result = await choose(page, 'option', ['GST2_OPT_ELOCK_BUTTON']);
  assert.equal(result.validation.status, 'VALID');
  return {selectionFlow:'PASS', glassBranches:'PASS', optionDependency:'PASS', downstreamClear:'PASS', invalidFailClosed:'PASS', noSyntheticSizeBOM:'PASS'};
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
  const desktopChecks = await exercise(desktop);
  const desktopFieldCount = await desktop.locator('#dynamicForm [data-spec-key]').count();
  assert.ok(desktopFieldCount > 0);
  const desktopOverflow = await desktop.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(desktopOverflow <= 1, `desktop overflow: ${desktopOverflow}`);
  const summary = await desktop.locator('#selectionSummary').innerText();
  assert.ok(summary.length > 0);
  report.desktop = { ...desktopChecks, fieldCount: desktopFieldCount, overflow: desktopOverflow, status: 'PASS' };
  await desktop.screenshot({ path: `${OUT}/desktop-1440x1000.png`, fullPage: true });
  await desktopContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  track(mobile);
  await openGiesta2(mobile);
  const mobileChecks = await exercise(mobile);
  const mobileFieldCount = await mobile.locator('#dynamicForm [data-spec-key]').count();
  assert.ok(mobileFieldCount > 0);
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(mobileOverflow <= 1, `mobile overflow: ${mobileOverflow}`);
  report.mobile = { ...mobileChecks, fieldCount: mobileFieldCount, overflow: mobileOverflow, status: 'PASS' };
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
