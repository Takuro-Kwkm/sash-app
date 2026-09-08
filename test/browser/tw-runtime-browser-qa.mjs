import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const extraHTTPHeaders = process.env.VERCEL_TRUSTED_OIDC_TOKEN
  ? { 'x-vercel-trusted-oidc-idp-token': process.env.VERCEL_TRUSTED_OIDC_TOKEN }
  : {};
const PRODUCT_ID = 'SER-LIXIL-TW';
const OUT = 'artifacts/tw-runtime-browser-qa';
await mkdir(OUT, { recursive:true });
const report = { status:'RUNNING', desktop:{}, mobile:{}, consoleErrors:[], pageErrors:[], failedResponses:[] };
const browser = await chromium.launch({ headless:true });

function track(page) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) report.failedResponses.push({ status:response.status(), url:response.url() }); });
}
async function openTw(page) {
  await page.goto(BASE, { waitUntil:'networkidle' });
  await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'CATALOG CONNECTED');
  await page.selectOption('#manufacturer', 'LIXIL');
  await page.waitForFunction((id) => [...document.querySelectorAll('#product option')].some((option) => option.value === id && !option.disabled), PRODUCT_ID);
  const response = page.waitForResponse((r) => r.url().includes('/api/runtime-master/resolve') && r.status() === 200);
  await page.selectOption('#product', PRODUCT_ID);
  await response;
  await page.waitForSelector('[data-spec-key="window_type"]');
}
async function choose(page, key, value) {
  const response = page.waitForResponse((r) => r.url().includes('/api/runtime-master/resolve') && r.status() === 200);
  await page.locator(`[data-spec-key="${key}"]`).selectOption(value);
  return (await response).json();
}
async function exercise(page) {
  let result = await choose(page, 'window_type', 'SWT-LIX-TW-SHUT-HIKI-FLAT');
  assert.deepEqual(result.fields.find((field) => field.key === 'shutter_type').values.map((row) => row.value), ['SP-TW-SHUT-MAN-STD','SP-TW-SHUT-ELE-STD']);
  assert.ok(!result.fields.some((field) => field.key === 'handing'));
  result = await choose(page, 'shutter_type', 'SP-TW-SHUT-MAN-STD');
  assert.equal(result.selection.size_mode, 'STANDARD');
  await choose(page, 'panel_count', '2枚建');
  await choose(page, 'size', 'SZ-LIX-TW-SHUT-FLAT-Z-11918');
  await choose(page, 'exterior_color', 'EXT-LIX-H');
  await choose(page, 'interior_color', 'INT-LIX-M');
  await choose(page, 'screen_presence', 'YES');
  result = await choose(page, 'screen_type', 'SCR-002');
  const ordered = result.fields.map((field) => field.key);
  assert.ok(ordered.indexOf('screen_type') < ordered.indexOf('glass_base'));
  if (result.fields.some((field) => field.key === 'screen_midrail')) result = await choose(page, 'screen_midrail', result.fields.find((field) => field.key === 'screen_midrail').values[0].value);
  if (result.fields.some((field) => field.key === 'screen_net')) result = await choose(page, 'screen_net', result.fields.find((field) => field.key === 'screen_net').values[0].value);
  result = await choose(page, 'glass_base', 'Low-E複層ガラス');
  for (const key of ['glass_type','glass_detail','glass_function','glass_spacer','glass_air_layer']) {
    const field = result.fields.find((row) => row.key === key);
    result = await choose(page, key, field.values[0].value);
  }
  result = await choose(page, 'option', ['OP-LIX-TW-CAT-28303','OP-LIX-TW-CAT-28509']);
  assert.equal(result.optionCodeLinkageCount, 196);
  assert.equal(result.optionCodeResults.find((row) => row.optionId === 'OP-LIX-TW-CAT-28303').status, 'SPECIAL_ORDER_NO_STANDARD_SKU');
  assert.equal(await page.locator('#productCodeCard').isVisible(), true);

  result = await choose(page, 'window_type', 'SWT-LIX-TW-FIX-IN-MADO');
  assert.equal(result.selection.size, undefined);
  assert.equal(result.selection.option, undefined);
  assert.ok(!result.fields.some((field) => field.key.startsWith('screen_')));
  assert.ok(!result.fields.some((field) => ['construction','configuration'].includes(field.key)));
  await page.reload({ waitUntil:'networkidle' });
  await openTw(page);
  return { formalRuntime:'PASS', fieldOrder:'PASS', conditionalFields:'PASS', screenBeforeGlass:'PASS', productCodes:'PASS', downstreamReset:'PASS', reloadReset:'PASS' };
}

try {
  for (const config of [
    { key:'desktop', viewport:{ width:1440, height:1000 }, mobile:false },
    { key:'mobile', viewport:{ width:390, height:844 }, mobile:true },
  ]) {
    const context = await browser.newContext({ viewport:config.viewport, isMobile:config.mobile, hasTouch:config.mobile, extraHTTPHeaders });
    const page = await context.newPage(); track(page); await openTw(page);
    const checks = await exercise(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${config.key} overflow: ${overflow}`);
    report[config.key] = { ...checks, overflow, status:'PASS' };
    await page.screenshot({ path:`${OUT}/${config.key}-${config.viewport.width}x${config.viewport.height}.png`, fullPage:true });
    await context.close();
  }
  assert.deepEqual(report.consoleErrors, []); assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.failedResponses, []);
  report.status = 'PASS';
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack ?? String(error);
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally { await browser.close(); }
