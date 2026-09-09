import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const SHARE_TOKEN = process.env.VERCEL_SHARE_TOKEN;
const PRODUCT_ID = 'SER-YKKAP-UCHIRIMO';
const OUT = 'artifacts/uchirimo-runtime-browser-qa';
await mkdir(OUT, { recursive:true });
const report = { status:'RUNNING', desktop:{}, mobile:{}, consoleErrors:[], pageErrors:[], failedResponses:[] };
const browser = await chromium.launch({ headless:true });

function track(page) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) report.failedResponses.push({ status:response.status(), url:response.url() }); });
}

async function openUchirimo(page) {
  const entry = SHARE_TOKEN ? `${BASE}/?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}` : BASE;
  await page.goto(entry, { waitUntil:'networkidle' });
  await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'CATALOG CONNECTED');
  await page.selectOption('#manufacturer', 'YKK AP');
  await page.waitForFunction((id) => [...document.querySelectorAll('#product option')].some((option) => option.value === id && !option.disabled), PRODUCT_ID);
  const response = page.waitForResponse((row) => row.url().includes('/api/runtime-master/resolve') && row.status() === 200);
  await page.selectOption('#product', PRODUCT_ID);
  const result = await (await response).json();
  await page.waitForSelector('[data-spec-key="room_specification"]');
  return result;
}

async function choose(page, key, value) {
  const locator = page.locator(`[data-spec-key="${key}"]`);
  await locator.waitFor();
  const response = page.waitForResponse((row) => row.url().includes('/api/runtime-master/resolve') && row.status() === 200);
  if (typeof value === 'number') {
    await locator.fill(String(value));
    await locator.dispatchEvent('change');
  } else await locator.selectOption(String(value));
  return (await response).json();
}

async function chooseIfAvailable(page, result, key, preferred) {
  const field = result.fields.find((row) => row.key === key);
  if (!field || result.selection[key] !== undefined) return result;
  const value = field.values.some((row) => String(row.value) === String(preferred)) ? preferred : field.values[0]?.value;
  if (value === undefined) return result;
  return choose(page, key, value);
}

async function completeRequired(page, result) {
  for (let pass = 0; pass < 60; pass += 1) {
    const field = result.fields.find((row) => row.required && result.selection[row.key] === undefined);
    if (!field) return result;
    const value = field.dataType === 'NUMBER' ? 500 : field.values[0]?.value;
    assert.notEqual(value, undefined, `${field.key} must expose a formal input`);
    result = await choose(page, field.key, value);
  }
  throw new Error('Uchirimo browser form did not converge');
}

const keys = (page) => page.locator('#dynamicForm [data-spec-key]').evaluateAll((elements) => elements.map((element) => element.dataset.specKey));

async function exercise(page) {
  let result = await openUchirimo(page);
  assert.deepEqual(await keys(page), ['room_specification','window_type','size_mode']);
  assert.equal(await page.locator('[data-spec-key="size_mode"]').isDisabled(), true);
  assert.equal(await page.locator('[data-spec-key="size_mode"]').inputValue(), 'custom');

  result = await choose(page, 'room_specification', 'residential');
  result = await choose(page, 'window_type', 'fix_window');
  result = await choose(page, 'glass_family', 'insulating_glass');
  assert.equal(await page.locator('[data-spec-key="low_e_type"]').count(), 1);
  result = await choose(page, 'glass_structure', 'P3P3');
  assert.equal(await page.locator('[data-spec-key="spacer_type"]').count(), 1);
  assert.equal(await page.locator('[data-spec-key="gas_fill"]').count(), 1);
  result = await choose(page, 'spacer_type', 'aluminum');
  assert.equal(result.selection.gas_fill, undefined, 'spacer alone must not determine cavity gas');

  result = await choose(page, 'glass_family', 'single_glazing');
  assert.equal(await page.locator('[data-spec-key="low_e_type"]').count(), 0);
  assert.equal(await page.locator('[data-spec-key="spacer_type"]').count(), 0);
  assert.equal(await page.locator('[data-spec-key="gas_fill"]').count(), 0);
  result = await chooseIfAvailable(page, result, 'glass_structure', 'W3');
  result = await chooseIfAvailable(page, result, 'glass_surface_type', 'washi');
  result = await chooseIfAvailable(page, result, 'safety_treatment', 'standard');
  result = await chooseIfAvailable(page, result, 'grille_type', 'none');
  result = await chooseIfAvailable(page, result, 'muntin_type', 'none');

  const ordered = await keys(page);
  for (const [before, after] of [['window_type','glass_family'],['glass_family','frame_color'],['frame_color','frame_installation_mode'],['frame_installation_mode','size_mode']]) {
    assert.ok(ordered.indexOf(before) < ordered.indexOf(after), `${before} must precede ${after}`);
  }
  assert.equal(ordered.includes('glass_spec_id'), false);

  result = await choose(page, 'frame_color', 'greige');
  result = await choose(page, 'frame_installation_mode', 'frame_projection');
  assert.equal(await page.locator('[data-spec-key="frame_projection"]').count(), 1);
  result = await choose(page, 'room_specification', 'bathroom');
  assert.equal(result.selection.frame_color, undefined);
  assert.ok(result.clearedFields.some((row) => row.field === 'frame_color'));

  result = await choose(page, 'room_specification', 'residential');
  result = await choose(page, 'window_type', 'fix_window');
  result = await chooseIfAvailable(page, result, 'glass_family', 'single_glazing');
  result = await chooseIfAvailable(page, result, 'glass_structure', 'W3');
  result = await chooseIfAvailable(page, result, 'glass_surface_type', 'washi');
  result = await chooseIfAvailable(page, result, 'safety_treatment', 'standard');
  result = await chooseIfAvailable(page, result, 'grille_type', 'none');
  result = await chooseIfAvailable(page, result, 'muntin_type', 'none');
  result = await completeRequired(page, result);
  assert.equal(result.validation.status, 'MANUAL_CHECK');
  assert.equal(result.orderReady, false);
  assert.ok(result.manualWarnings.some((message) => message.includes('メーカー見積')));
  assert.equal(result.dimensionResult.status, 'PASS');
  assert.ok((await page.locator('#warnings').innerText()).includes('ORDER_READY = false'));
  assert.ok((await page.locator('#selectionSummary').innerText()).includes('和紙調'));

  result = await choose(page, 'size_w', 100);
  assert.equal(result.dimensionResult.status, 'BLOCK');
  assert.equal(result.validation.status, 'BLOCKED');
  result = await choose(page, 'size_w', 500);
  assert.equal(result.dimensionResult.status, 'PASS');

  result = await choose(page, 'window_type', 'inward_opening_window');
  assert.equal(result.selection.glass_spec_id, undefined);
  assert.equal(await page.locator('[data-spec-key="arm_stopper_option"]').count(), 1);
  assert.equal(await page.locator('[data-spec-key="outside_handle_option"]').count(), 0);

  const outOfViewport = await page.locator('input,select').evaluateAll((elements) => elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left < -1 || rect.right > window.innerWidth + 1;
  }).length);
  assert.equal(outOfViewport, 0);
  return { manufacturerSelection:'PASS', seriesSelection:'PASS', dynamicFields:'PASS', dependency:'PASS', downstreamClear:'PASS', customSize:'PASS', options:'PASS', manualConfirmation:'PASS', invalidConfiguration:'PASS', summary:'PASS', inputOverflow:outOfViewport };
}

try {
  const preflight = await browser.newContext();
  const response = await preflight.request.get(`${BASE}/api/runtime-master/integrations`);
  assert.equal(response.status(), 200);
  const integration = (await response.json()).find((row) => row.id === PRODUCT_ID);
  assert.ok(integration);
  assert.equal(integration.packageVersion, 'v1.0-P7R1-R2');
  assert.equal(integration.schemaVersion, '2.0');
  assert.equal(integration.sourceHash, 'be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d');
  await preflight.close();

  for (const config of [
    { key:'desktop', viewport:{ width:1440, height:1000 }, mobile:false },
    { key:'mobile', viewport:{ width:390, height:844 }, mobile:true },
  ]) {
    const context = await browser.newContext({ viewport:config.viewport, isMobile:config.mobile, hasTouch:config.mobile });
    const page = await context.newPage(); track(page);
    const checks = await exercise(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${config.key} overflow: ${overflow}`);
    report[config.key] = { ...checks, overflow, status:'PASS' };
    await page.screenshot({ path:`${OUT}/${config.key}-${config.viewport.width}x${config.viewport.height}.png`, fullPage:true });
    await context.close();
  }
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.failedResponses, []);
  report.status = 'PASS';
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack ?? String(error);
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally { await browser.close(); }
