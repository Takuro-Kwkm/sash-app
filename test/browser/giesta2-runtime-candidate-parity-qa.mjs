import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const PRODUCT_ID = 'SER-LIXIL-GIESTA2';
const OUT = 'artifacts/giesta2-runtime-browser-qa';
await mkdir(OUT, { recursive: true });

const report = { status: 'RUNNING', desktop: {}, mobile: {} };
const browser = await chromium.launch({ headless: true });

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
  const response = page.waitForResponse((r) => r.url().includes('/api/runtime-master/resolve') && r.status() === 200);
  await page.locator(`[data-spec-key="${key}"]`).selectOption(String(value));
  const result = await (await response).json();
  await page.waitForFunction(({ key, value }) => document.querySelector(`[data-spec-key="${key}"]`)?.value === value, { key, value: String(value) });
  return result;
}

async function assertFieldParity(page, result, key, expectedCount) {
  const field = result.fields.find((row) => row.key === key);
  assert.ok(field, `${key} must exist in Runtime API response`);
  const apiValues = field.values.map((row) => String(row.value));
  assert.equal(apiValues.length, expectedCount, `${key} Runtime candidate count`);

  await page.waitForFunction(({ key, count }) => {
    const select = document.querySelector(`[data-spec-key="${key}"]`);
    if (!select) return false;
    return [...select.options].filter((option) => option.value !== '').length === count;
  }, { key, count: apiValues.length });

  const browserValues = await page.locator(`[data-spec-key="${key}"] option:not([value=""])`).evaluateAll((options) => options.map((option) => option.value));
  assert.deepEqual(browserValues, apiValues, `${key} Browser options must exactly match Runtime API allowed values`);
  return apiValues;
}

async function exercise(page) {
  await openGiesta2(page);
  await choose(page, 'thermal_spec', 'k2');
  let result = await choose(page, 'configuration', 'single');
  const designValues = await assertFieldParity(page, result, 'design', 81);
  assert.ok(designValues.includes('GST2_G11') && designValues.includes('GST2_C11'));
  assert.ok(designValues.length > 2, 'representative two-design Stub must not pass acceptance');

  await choose(page, 'design', 'GST2_G11');
  result = await choose(page, 'door_color', 'ED');
  const handleValues = await assertFieldParity(page, result, 'handle', 5);
  assert.ok(handleValues.includes('GST2_HANDLE_S'));
  assert.ok(handleValues.length > 1, 'S-handle-only Stub must not pass acceptance');

  return {
    designCandidateCount: designValues.length,
    handleCandidateCount: handleValues.length,
    runtimeApiParity: 'PASS',
    acceptanceSurface: 'ACTUAL_RUNTIME_API',
  };
}

try {
  for (const [name, viewport] of Object.entries({
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 390, height: 844 },
  })) {
    const context = await browser.newContext({ viewport, ...(name === 'mobile' ? { isMobile: true, hasTouch: true } : {}) });
    const page = await context.newPage();
    report[name] = await exercise(page);
    await context.close();
  }
  report.status = 'PASS';
  await writeFile(`${OUT}/candidate-parity.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'FAIL';
  report.failure = error.stack ?? String(error);
  await writeFile(`${OUT}/candidate-parity.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
