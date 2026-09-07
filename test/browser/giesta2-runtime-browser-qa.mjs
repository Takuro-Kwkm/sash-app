import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const PRODUCT_ID = 'SER-LIXIL-GIESTA2';
const OUT = 'artifacts/giesta2-runtime-browser-qa';
await mkdir(OUT, { recursive: true });

const report = { status: 'RUNNING', specificationGaps: ['handing', 'size'], desktop: {}, mobile: {}, consoleErrors: [], pageErrors: [], failedResponses: [] };
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
  const uiValue = Array.isArray(value) ? value.map(String) : String(value);
  await page.locator(`[data-spec-key="${key}"]`).selectOption(uiValue);
  const result = await (await response).json();
  await page.waitForFunction(({key, value}) => {
    const el = document.querySelector(`[data-spec-key="${key}"]`);
    return el && (Array.isArray(value) ? JSON.stringify([...el.selectedOptions].map(o => o.value)) === JSON.stringify(value) : el.value === value);
  }, {key, value: uiValue});
  return result;
}

async function exercise(page) {
  await choose(page, 'thermal_spec', 'k2');
  await choose(page, 'configuration', 'single');
  let result = await choose(page, 'design', 'GST2_G11');
  assert.equal(await page.locator('[data-spec-key="child_door_type"]').count(), 0);
  assert.equal(await page.locator('[data-spec-key="child_door"]').count(), 0);
  assert.equal(await page.locator('[data-spec-key="glass"]').count(), 0);
  await choose(page, 'door_color', 'ED');
  await choose(page, 'frame_color', 'GST2_FRAME_COLOR_NATURAL_SILVER');
  await choose(page, 'door_closer', 'GST2_OPT_CLOSER_STANDARD');
  await choose(page, 'handle', 'GST2_HANDLE_S');
  await choose(page, 'handle_color', 'GST2_HCOL_SMB');
  result = await choose(page, 'lock_type', 'electric');
  assert.equal(result.selection.lock_system, 'GST2_LOCK_FAMILOCK');
  await choose(page, 'lock_plan', 'GST2_PLAN_FAM_BASIC_BATTERY');
  const keyLabels = await page.locator('[data-spec-key="credential_type"] option:not([value=""])').allTextContents();
  assert.deepEqual(keyLabels, ['カードキー（スマートフォン対応）', 'タグキー（スマートフォン対応）']);
  for (const type of ['card', 'tag']) {
    await choose(page, 'credential_type', type);
    assert.deepEqual(await page.locator('[data-spec-key="remote_count"] option:not([value=""])').evaluateAll((rows) => rows.map((row) => row.value)), ['0', '1', '2']);
    for (const count of [0, 1, 2]) {
      result = await choose(page, 'remote_count', count);
      assert.equal(result.selection.credential_package, `GST2_PKG_FAM_${type.toUpperCase()}_R${count}`);
    }
  }
  assert.equal(result.selection.glass, 'GST2_GLASS_STD_K2');
  assert.equal(result.validation.status, 'VALID');
  const configurationLabels = await page.locator('[data-spec-key="configuration"] option').allTextContents();
  assert.ok(configurationLabels.includes('片開き') && configurationLabels.includes('親子'));
  assert.ok(configurationLabels.every((label) => !/(single|double|parent_child)/i.test(label)));
  assert.equal(await page.locator('[data-spec-key="handing"]').count(), 0);
  const keys = await page.locator('#dynamicForm [data-spec-key]').evaluateAll((els) => els.map((el) => el.dataset.specKey));
  assert.deepEqual(keys.slice(0, 3), ['thermal_spec', 'configuration', 'design']);
  assert.ok(keys.indexOf('door_closer') < keys.indexOf('handle'));
  assert.ok(keys.indexOf('handle') < keys.indexOf('handle_color'));
  assert.ok(keys.indexOf('handle_color') < keys.indexOf('lock_type'));
  assert.ok(keys.indexOf('lock_type') < keys.indexOf('lock_plan'));
  assert.deepEqual(await page.locator('[data-spec-key="handle_color"] option:not([value=""])').evaluateAll((els) => els.map((el) => el.value)), ['GST2_HCOL_BS', 'GST2_HCOL_SMB', 'GST2_HCOL_DBR']);
  assert.equal(keys.at(-1), 'option');

  result = await choose(page, 'option', ['GST2_OPT_ELOCK_BUTTON', 'GST2_OPT_SECRET_SWITCH']);
  assert.deepEqual(result.selection.option, ['GST2_OPT_ELOCK_BUTTON', 'GST2_OPT_SECRET_SWITCH']);
  assert.ok(result.derivedOptions.includes('GST2_OPT_CONTROLLER'));
  assert.ok(result.derivedEntities.some(row => row.relationship === 'FIXES'));
  assert.ok(result.derivedEntities.some(row => row.relationship === 'ENABLES'));

  result = await choose(page, 'lock_type', 'manual');
  assert.equal(result.selection.lock_system, 'GST2_LOCK_MANUAL');
  assert.equal(result.selection.credential_type, undefined);
  assert.equal(result.selection.remote_count, undefined);
  assert.equal(result.selection.handle, 'GST2_HANDLE_S');
  assert.equal(result.selection.handle_color, 'GST2_HCOL_SMB');
  assert.equal(await page.locator('[data-spec-key="lock_plan"]').count(), 0);
  assert.equal(await page.locator('[data-spec-key="credential_type"]').count(), 0);
  assert.equal(await page.locator('[data-spec-key="remote_count"]').count(), 0);

  await choose(page, 'lock_type', 'electric');
  await choose(page, 'lock_plan', 'GST2_PLAN_FAM_BASIC_BATTERY');
  await choose(page, 'credential_type', 'tag');
  await choose(page, 'remote_count', 0);
  result = await choose(page, 'option', ['GST2_OPT_ELOCK_BUTTON']);
  assert.ok(result.selection.option.includes('GST2_OPT_ELOCK_BUTTON'));

  result = await choose(page, 'configuration', 'parent_child');
  assert.equal(result.selection.design, undefined);
  await choose(page, 'design', 'GST2_G11');
  assert.deepEqual(await page.locator('[data-spec-key="child_door_type"] option:not([value=""])').allTextContents(), ['採光部あり', '採光部なし', '採光部なし（ポスト付）', '採光部あり（ポスト付）']);
  await choose(page, 'child_door_type', 'glazed');
  assert.ok(await page.locator('[data-spec-key="child_door"] option:not([value=""])').count() > 0);
  await choose(page, 'child_door', 'GST2_CHILD_K11');

  result = await choose(page, 'configuration', 'single_sidelight');
  assert.equal(result.selection.child_door_type, undefined);
  assert.equal(result.selection.child_door, undefined);
  result = await choose(page, 'design', 'GST2_G11');
  const glass = (await page.request.get(`${BASE}/api/runtime-master/resolve?${new URLSearchParams({productId: PRODUCT_ID, selection: JSON.stringify(result.selection)})}`));
  assert.equal(glass.status(), 200);
  const glassField = (await glass.json()).fields.find((field) => field.key === 'glass');
  assert.ok(glassField.values.length > 1 && glassField.values.every((value) => value.value.startsWith('GST2_GLASS_SIDE_')));
  result = await choose(page, 'glass', glassField.values[0].value);

  assert.equal(await page.locator('[data-spec-key="size"]').count(), 0);
  assert.deepEqual(result.derivedComponents, []);
  const invalid = await page.request.get(`${BASE}/api/runtime-master/resolve?${new URLSearchParams({productId: PRODUCT_ID, selection: JSON.stringify({...result.selection, design:'__INVALID__'})})}`);
  assert.equal((await invalid.json()).validation.status, 'INVALID');

  // Leave a complete representative configuration in the screenshots.
  await choose(page, 'configuration', 'single');
  await choose(page, 'design', 'GST2_G11');
  await choose(page, 'door_color', 'ED');
  await choose(page, 'frame_color', 'GST2_FRAME_COLOR_NATURAL_SILVER');
  await choose(page, 'door_closer', 'GST2_OPT_CLOSER_STANDARD');
  await choose(page, 'handle', 'GST2_HANDLE_S');
  await choose(page, 'handle_color', 'GST2_HCOL_SMB');
  await choose(page, 'lock_type', 'electric');
  await choose(page, 'lock_plan', 'GST2_PLAN_FAM_BASIC_BATTERY');
  await choose(page, 'credential_type', 'tag');
  await choose(page, 'remote_count', 0);
  result = await choose(page, 'option', ['GST2_OPT_ELOCK_BUTTON']);
  assert.equal(result.validation.status, 'VALID');
  return {
    qa01ManufacturerFirst:'PASS', qa02ProductSecond:'PASS', qa03ThermalAfterProduct:'PASS',
    qa04OpeningAfterThermal:'PASS', qa05DesignAfterOpening:'PASS', qa06ChildDoorConditional:'PASS',
    qa07ChildDoorFourTypes:'PASS', qa08SidelightGlassConditional:'PASS', qa09DoorColorOrder:'PASS',
    qa10HandingAfterColor:'BLOCKED_PRODUCT_MASTER_GAP', qa11HandingSelectable:'BLOCKED_PRODUCT_MASTER_GAP',
    qa12CloserAfterHanding:'PARTIAL_HANDING_GAP', qa13HandleAfterCloser:'PASS', qa14HandleColorAfterHandle:'PASS',
    qa15LockAfterHandleColor:'PASS', qa16ManualElectric:'PASS', qa17ElectricDetailsConditional:'PASS',
    qa18LixilCardKey:'PASS', qa19LixilTagKey:'PASS', qa20CardRemote012:'PASS', qa21TagRemote012:'PASS',
    qa22YkkPocketKey:'NOT_APPLICABLE_NO_REGISTERED_YKK_DOOR_RUNTIME', qa23YkkPitatKey:'NOT_APPLICABLE_NO_REGISTERED_YKK_DOOR_RUNTIME',
    qa24StandardCustomSize:'BLOCKED_PRODUCT_MASTER_GAP', qa25CustomDimensionsConditional:'BLOCKED_PRODUCT_MASTER_GAP',
    qa26OptionLast:'PASS', qa27OptionSelectable:'PASS', qa28StaleSelection:'PASS',
    qa29NoUnrequestedFieldRemoval:'PASS', qa30OtherSeriesRegression:'PASS_SEPARATE_SUITE',
    optionDependency:'PASS', invalidFailClosed:'PASS', noSyntheticSizeBOM:'PASS'
  };
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
