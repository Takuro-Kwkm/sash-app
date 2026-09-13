import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const SHARE_TOKEN = process.env.VERCEL_SHARE_TOKEN;
const PRODUCT_ID = 'SER-LIXIL-INPLUS';
const OUT = 'artifacts/inplus-v04r2-runtime-browser-qa';
const UI_SECTIONS = [
  'manufacturer','product','window_type','glass_spec','lowe_performance','spacer',
  'cavity','body_color','frame_install','custom_size','options',
];
const FORBIDDEN_FIELDS = [
  'screen','screen_type','screen_midrail','screen_net','exterior_color','interior_color',
  'manufacturer','series','product_category','evidence','glass_config_id',
];

await mkdir(OUT, { recursive:true });
const report = {
  status:'RUNNING',
  desktop:{},
  mobile:{},
  consoleErrors:[],
  pageErrors:[],
  failedResponses:[],
};
const browser = await chromium.launch({ headless:true });

function track(page) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('favicon')) report.failedResponses.push({ status:response.status(), url:response.url() });
  });
}

function runtimeSelectionFromUrl(url) {
  try { return JSON.parse(new URL(url).searchParams.get('selection') ?? '{}'); }
  catch { return {}; }
}
function matchesSelection(response, key, value) {
  if (response.status() !== 200 || !response.url().includes('/api/runtime-master/resolve')) return false;
  const selection = runtimeSelectionFromUrl(response.url());
  const actual = selection[key];
  if (Array.isArray(actual)) return actual.some((one) => String(one) === String(value));
  return typeof value === 'number' ? Number(actual) === value : String(actual) === String(value);
}

async function apiResolve(page, selection) {
  const response = await page.request.get(`${BASE}/api/runtime-master/resolve?${new URLSearchParams({
    productId:PRODUCT_ID,
    selection:JSON.stringify(selection),
  })}`);
  assert.equal(response.status(), 200);
  return response.json();
}

async function openInplus(page) {
  const entry = SHARE_TOKEN ? `${BASE}/runtime-lab?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}` : `${BASE}/runtime-lab`;
  await page.goto(entry, { waitUntil:'networkidle' });
  await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'CATALOG CONNECTED');
  assert.equal((await page.locator('label[for="manufacturer"]').textContent())?.trim(), 'メーカー');
  assert.equal((await page.locator('label[for="product"]').textContent())?.trim(), '商品');
  await page.selectOption('#manufacturer', 'LIXIL');
  await page.waitForFunction((id) => [...document.querySelectorAll('#product option')].some((option) => option.value === id && !option.disabled), PRODUCT_ID);
  const response = page.waitForResponse((row) => row.url().includes('/api/runtime-master/resolve') && row.status() === 200);
  await page.selectOption('#product', PRODUCT_ID);
  const result = await (await response).json();
  await page.waitForSelector('[data-spec-key="size_mode"]');
  return result;
}

async function choose(page, key, value) {
  const locator = page.locator(`[data-spec-key="${key}"]`);
  await locator.waitFor({ state:'visible' });
  const tag = await locator.evaluate((element) => element.tagName);
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = page.waitForResponse((row) => matchesSelection(row, key, value), { timeout:15000 });
    if (tag === 'INPUT') {
      await locator.fill(String(value));
      await locator.dispatchEvent('change');
    } else {
      await locator.selectOption(String(value));
    }
    try { return await (await response).json(); }
    catch (error) {
      if (attempt === 2) throw new Error(`runtime response timeout for ${key}=${String(value)}`, { cause:error });
      await page.waitForTimeout(100);
    }
  }
  throw new Error(`unreachable choose failure for ${key}`);
}

async function chooseIfVisible(page, result, key, preferred = null) {
  const locator = page.locator(`[data-spec-key="${key}"]`);
  if (await locator.count() === 0) return result;
  const field = result.fields.find((row) => row.key === key);
  if (!field || result.selection[key] !== undefined) return result;
  const value = preferred !== null && field.values?.some((row) => String(row.value) === String(preferred))
    ? preferred
    : field.values?.[0]?.value;
  if (value === undefined) return result;
  return choose(page, key, value);
}

async function assertUiContract(page, result) {
  assert.equal(result.uiTemplate, 'INPLUS_V04R2');
  assert.equal(result.uiStandardRuntimeGap.status, 'NONE');
  assert.equal(result.uiGroupingAudit.status, 'PASS');
  assert.deepEqual(result.uiSections.map((section) => section.id), UI_SECTIONS);

  const domSections = await page.locator('[data-ui-section]').evaluateAll((nodes) => nodes.map((node) => node.dataset.uiSection));
  const positions = domSections.map((id) => UI_SECTIONS.indexOf(id));
  assert.ok(positions.every((position) => position >= 0), `unknown UI section: ${domSections.join(', ')}`);
  for (let i = 1; i < positions.length; i += 1) assert.ok(positions[i - 1] < positions[i], `section order violated: ${domSections.join(' > ')}`);
  assert.deepEqual(domSections.slice(0,2), ['manufacturer','product']);

  const fieldKeys = await page.locator('#dynamicForm [data-spec-key]').evaluateAll((nodes) => nodes.map((node) => node.dataset.specKey));
  for (const key of FORBIDDEN_FIELDS) assert.equal(fieldKeys.includes(key), false, `${key} must not render`);

  const mode = result.fields.find((field) => field.key === 'size_mode');
  assert.ok(mode);
  assert.deepEqual(mode.values.map((row) => row.value), ['CUSTOM']);
  assert.deepEqual(mode.values.map((row) => row.displayLabel), ['特注']);
  const modeOptions = (await page.locator('[data-spec-key="size_mode"] option').allTextContents()).filter((text) => text !== '選択してください');
  assert.deepEqual(modeOptions, ['特注']);
  assert.equal(modeOptions.includes('規格'), false);
  return { domSections, fieldKeys };
}

async function configureBase(page) {
  let result = await openInplus(page);
  await assertUiContract(page, result);
  assert.equal(await page.locator('[data-spec-key="order_width"]').count(), 0, 'W must be hidden before CUSTOM');
  assert.equal(await page.locator('[data-spec-key="order_height"]').count(), 0, 'H must be hidden before CUSTOM');

  result = await choose(page, 'window_type', '引違い窓');
  result = await choose(page, 'sash_configuration', '2枚建');
  result = await choose(page, 'size_class', '窓タイプ');
  result = await choose(page, 'size_mode', 'CUSTOM');
  const width = page.locator('[data-spec-key="order_width"]');
  const height = page.locator('[data-spec-key="order_height"]');
  await width.waitFor({ state:'visible' });
  await height.waitFor({ state:'visible' });
  assert.equal(await width.getAttribute('step'), '1');
  assert.equal(await height.getAttribute('step'), '1');
  result = await choose(page, 'order_width', 1000);
  result = await choose(page, 'order_height', 1000);
  result = await chooseIfVisible(page, result, 'upper_frame_spec', '標準');
  return result;
}

async function exercise(page) {
  let result = await configureBase(page);
  assert.equal(result.dimensionResult.status, 'PASS');

  result = await chooseIfVisible(page, result, 'body_color', 'COL-S');
  result = await chooseIfVisible(page, result, 'glass_family', 'Low-E複層');
  result = await chooseIfVisible(page, result, 'glass_type', '透明');
  result = await chooseIfVisible(page, result, 'lowe_color', 'グリーン');
  result = await chooseIfVisible(page, result, 'cavity_fill', '乾燥空気 A12');
  result = await chooseIfVisible(page, result, 'supply_form', '完成品障子（枠はノックダウン）');
  result = await chooseIfVisible(page, result, 'glass_detail', 'LE-A-G-CLR');
  assert.notEqual(result.validation.status, 'INVALID');
  assert.equal(result.runtimeMaster.packageVersion, 'v0.4-R2');
  assert.equal(result.runtimeMaster.sourcePackageIntegrity.match, true);
  await assertUiContract(page, result);

  const invalid = await apiResolve(page, {
    size_mode:'CUSTOM', window_type:'引違い窓', sash_configuration:'2枚建', size_class:'窓タイプ',
    upper_frame_spec:'標準', order_width:99999, order_height:99999,
  });
  assert.equal(invalid.dimensionResult.status, 'BLOCKED');
  assert.equal(invalid.validation.status, 'INVALID');

  const manual = await apiResolve(page, {
    size_mode:'CUSTOM', window_type:'引違い窓', sash_configuration:'2枚建（障子W指定）', size_class:'窓タイプ',
    upper_frame_spec:'標準', order_width:1000, order_height:1000,
  });
  assert.ok(manual.validation.status === 'MANUAL_CHECK' || manual.dimensionResult?.status === 'REVIEW_REQUIRED');

  // UI clear contract: a dimension-affecting upstream selector change clears stale W/H before reevaluation.
  const beforeChange = await page.locator('[data-spec-key="order_width"]').inputValue();
  assert.equal(beforeChange, '1000');
  result = await choose(page, 'window_type', 'FIX窓');
  assert.equal(result.selection.order_width, undefined);
  assert.equal(result.selection.order_height, undefined);
  assert.equal(await page.locator('[data-spec-key="order_width"]').inputValue(), '');
  assert.equal(await page.locator('[data-spec-key="order_height"]').inputValue(), '');

  const sectionResult = await assertUiContract(page, result);
  return {
    sectionOrder:'PASS',
    visibleSections:sectionResult.domSections,
    sizeModeCustomOnly:'PASS',
    customDimensionsConditional:'PASS',
    customStep1mm:'PASS',
    inRange:'PASS',
    outOfRangeBlocked:'PASS',
    manualReviewPreserved:'PASS',
    upstreamDimensionClear:'PASS',
    runtimeIntegrity:'PASS',
  };
}

async function runViewport(name, contextOptions, screenshotName) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  track(page);
  const checks = await exercise(page);
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  assert.ok(overflow <= 1, `${name} horizontal overflow: ${overflow}`);
  await page.screenshot({ path:`${OUT}/${screenshotName}`, fullPage:true });
  await context.close();
  return { ...checks, overflow, status:'PASS' };
}

try {
  const preflight = await browser.newContext();
  const page = await preflight.newPage();
  const integrationsResponse = await page.request.get(`${BASE}/api/runtime-master/integrations`);
  assert.equal(integrationsResponse.status(), 200);
  const integrations = await integrationsResponse.json();
  const inplus = integrations.find((row) => row.id === PRODUCT_ID);
  assert.ok(inplus);
  assert.equal(inplus.status, 'READY');
  assert.equal(inplus.selectable, true);
  assert.equal(inplus.packageVersion, 'v0.4-R2');
  assert.equal(inplus.uiTemplate, 'INPLUS_V04R2');
  await preflight.close();

  report.desktop = await runViewport('desktop', { viewport:{ width:1440, height:1000 } }, 'desktop-1440x1000.png');
  report.mobile = await runViewport('mobile', { viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true }, 'mobile-390x844.png');

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
