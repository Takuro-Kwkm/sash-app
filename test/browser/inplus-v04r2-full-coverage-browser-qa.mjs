import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const SHARE_TOKEN = process.env.VERCEL_SHARE_TOKEN;
const PRODUCT_ID = 'SER-LIXIL-INPLUS';
const OUT = 'artifacts/inplus-v04r2-full-coverage-browser-qa';
const SELECTOR_KEYS = ['window_type','sash_configuration','size_class','upper_frame_spec','joint_layout'];
const UI_SECTIONS = [
  'manufacturer','product','window_type','glass_spec','lowe_performance','spacer',
  'cavity','body_color','frame_install','custom_size','options',
];
const FORBIDDEN_FIELDS = [
  'screen','screen_type','screen_midrail','screen_net','exterior_color','interior_color',
  'manufacturer','series','product_category','evidence','glass_config_id',
];
const BASE_WINDOW_COUNT = 8;
const SIZE_GLASS_CASE_COUNT = 995;
const INSTALLABILITY_CASE_COUNT = 153;
const LOGICAL_QA_CASE_COUNT = SIZE_GLASS_CASE_COUNT + INSTALLABILITY_CASE_COUNT;
const AUTO_OUTSIDE_STATE_COUNT = 527;
const BROWSER_STATE_COUNT_PER_VIEWPORT = LOGICAL_QA_CASE_COUNT + AUTO_OUTSIDE_STATE_COUNT;
const CHUNK_SIZE = 75;

const present = (value) => value !== null && value !== undefined && value !== '' && value !== '—';

function patternsFor(domain) {
  if (domain === '荒間|横繁') return ['荒間','横繁'];
  if (domain === 'なし') return ['なし'];
  return ['非適用'];
}
function selectorSelection(row) {
  const selection = { size_mode:'CUSTOM' };
  for (const key of SELECTOR_KEYS) if (present(row[key])) selection[key] = row[key];
  return selection;
}
function glassApplicable(row, windowType) {
  const token = row?.[windowType];
  return token === undefined || token === null || token === '' || token === '可';
}
function expectedGlassJoin(master, baseRangeId, familyId, formalPattern) {
  const exact = master.glassLimitFamily.filter((row) =>
    row.base_range_id === baseRangeId
      && row.limit_family_id === familyId
      && row.decorative_pattern === formalPattern
  );
  if (exact.length === 1) return exact[0];
  const any = master.glassLimitFamily.filter((row) =>
    row.base_range_id === baseRangeId
      && row.limit_family_id === familyId
      && row.decorative_pattern === 'ANY'
  );
  if (any.length === 1) return any[0];
  const special = master.glassLimitFamily.filter((row) =>
    row.base_range_id === baseRangeId
      && row.decorative_pattern === 'SPECIAL'
      && String(row.special_allowed_families ?? '').split('|').includes(familyId)
  );
  return special.length === 1 ? special[0] : null;
}
function nominalDimensions(master, selector, join) {
  const base = master.baseRangeById.get(selector.base_range_id);
  assert.ok(base, `missing base range ${selector.base_range_id}`);
  const limit = join ? master.glassLimitById.get(`${join.base_range_id}::${join.limit_id}`) : null;
  const width = Number(base.W_min);
  const overrideMinH = limit && present(limit['H_min上書']) ? Number(limit['H_min上書']) : Number(base.H_min);
  return { order_width:width, order_height:Math.max(Number(base.H_min), overrideMinH) };
}
function buildSizeGlassCases(master) {
  const windowSelectors = master.fabricationSelector.filter((row) => present(row.window_type));
  const familyById = master.glassConfigFamilyById;
  const cases = [];
  for (const selector of windowSelectors) {
    const configs = master.glassConfigurations.filter((glass) => glass['状態'] === 'VERIFIED' && glassApplicable(glass, selector.window_type));
    for (const glass of configs) {
      const family = familyById.get(glass.glass_config_id);
      assert.ok(family, `missing glass family join ${glass.glass_config_id}`);
      for (const formalPattern of patternsFor(family.decorative_pattern_domain)) {
        const id = `SEL${selector._source_row}-GL${glass.glass_config_id}-PAT${formalPattern}`;
        cases.push({
          id,
          logicalCaseId:`SIZE:${id}`,
          selector,
          glass,
          family,
          formalPattern,
          expectedJoin:selector.base_range_id ? expectedGlassJoin(master, selector.base_range_id, family.limit_family_id, formalPattern) : null,
        });
      }
    }
  }
  return cases;
}
function windowApplicable(row, windowType) {
  const token = row?.[windowType];
  return token === undefined || token === null || token === '' || token === '可';
}
function cellStatus(cell) {
  if (cell === null || cell === undefined || cell === '' || cell === '-') return 'MANUAL_CHECK';
  const token = String(cell).trim();
  if (token.startsWith('×')) return 'DENY';
  if (token.startsWith('△') || /注\d+/.test(token)) return 'MANUAL_CHECK';
  if (token.startsWith('○')) return 'ALLOW';
  return 'MANUAL_CHECK';
}
function wildcardGlassFamily(master, windowType) {
  const families = [...new Set(master.glassConfigurations
    .filter((row) => row['状態'] === 'VERIFIED' && windowApplicable(row, windowType))
    .map((row) => row['大分類'])
    .filter(Boolean))];
  assert.ok(families.length, `no Formal glass family for ${windowType}`);
  return families[0];
}
function compatibleItemJoins(master, windowType) {
  return master.installabilityIdJoin.filter((row) =>
    ['frame_install_spec','option_items'].includes(row.selection_field)
      && (!row.context_window_type || row.context_window_type === windowType)
  );
}
function expectedFromMatrix(master, scope, itemJoin, jointJoin = null) {
  if (itemJoin.evaluation_policy === 'NOT_APPLICABLE') return 'CLEARED';
  if (itemJoin.evaluation_policy === 'MANUAL_CHECK') return 'MANUAL_CHECK';
  let matrixKey = itemJoin.matrix_key;
  if (itemJoin.evaluation_policy === 'DELEGATE') {
    assert.ok(jointJoin, `${itemJoin.canonical_id_or_value}: delegated joint missing`);
    assert.equal(jointJoin.evaluation_policy, 'AUTO');
    matrixKey = jointJoin.matrix_key;
  } else {
    assert.equal(itemJoin.evaluation_policy, 'AUTO');
  }
  const matrix = master.installabilityMatrix.find((row) => row['対象'] === scope.matrix_scope_key);
  assert.ok(matrix, `matrix scope missing ${scope.matrix_scope_key}`);
  const status = cellStatus(matrix[matrixKey]);
  if (status === 'DENY') return 'CLEARED';
  if (status === 'MANUAL_CHECK') return 'MANUAL_CHECK';
  return 'ALLOW';
}
function buildInstallabilityCases(master) {
  const jointJoins = master.installabilityIdJoin.filter((row) => row.selection_field === 'joint_layout');
  assert.equal(jointJoins.length, 3);
  const cases = [];
  for (const scope of master.installabilityScopeJoin) {
    assert.equal(scope.evaluation_policy, 'AUTO');
    const glassFamily = scope.glass_family === '*' ? wildcardGlassFamily(master, scope.window_type) : scope.glass_family;
    for (const itemJoin of compatibleItemJoins(master, scope.window_type)) {
      const additions = itemJoin.evaluation_policy === 'DELEGATE' ? jointJoins : [null];
      for (const jointJoin of additions) {
        const id = `${scope.matrix_scope_key}::${itemJoin.selection_field}=${itemJoin.canonical_id_or_value}${jointJoin ? `::joint=${jointJoin.canonical_id_or_value}` : ''}`;
        cases.push({
          id,
          logicalCaseId:`INSTALL:${id}`,
          scope,
          glassFamily,
          itemJoin,
          jointJoin,
          expected:expectedFromMatrix(master, scope, itemJoin, jointJoin),
        });
      }
    }
  }
  return cases;
}
function buildBrowserStates(master, sizeCases, installCases) {
  const states = [];
  for (const row of sizeCases) {
    const { selector, glass, family, formalPattern, expectedJoin } = row;
    let selection = { ...selectorSelection(selector), glass_detail:glass.glass_config_id };
    if (family.decorative_pattern_domain === '荒間|横繁') selection.decorative_pattern = formalPattern;
    if (selector.evaluation_policy !== 'AUTO' || !selector.base_range_id) {
      selection = { ...selection, order_width:1000, order_height:1000 };
      states.push({
        stateId:`${row.logicalCaseId}:nominal`, logicalCaseId:row.logicalCaseId, kind:'SIZE_MANUAL', selection,
      });
      continue;
    }
    selection = { ...selection, ...nominalDimensions(master, selector, expectedJoin) };
    states.push({
      stateId:`${row.logicalCaseId}:nominal`, logicalCaseId:row.logicalCaseId,
      kind:expectedJoin ? 'SIZE_PASS' : 'SIZE_REVIEW', selection,
    });
    const base = master.baseRangeById.get(selector.base_range_id);
    states.push({
      stateId:`${row.logicalCaseId}:outside`, logicalCaseId:row.logicalCaseId, kind:'SIZE_BLOCK',
      selection:{ ...selection, order_width:Number(base.W_max) + 1, order_height:Number(base.H_min) },
    });
  }
  for (const row of installCases) {
    const field = row.itemJoin.selection_field;
    const id = row.itemJoin.canonical_id_or_value;
    const selection = { window_type:row.scope.window_type, glass_family:row.glassFamily };
    if (field === 'option_items') selection.option_items = [id];
    else selection[field] = id;
    if (row.jointJoin) selection.joint_layout = row.jointJoin.canonical_id_or_value;
    states.push({
      stateId:`${row.logicalCaseId}:dependency`, logicalCaseId:row.logicalCaseId, kind:`INSTALL_${row.expected}`,
      selection, targetField:field, targetValue:id, jointValue:row.jointJoin?.canonical_id_or_value ?? null,
    });
  }
  return states;
}

await mkdir(OUT, { recursive:true });
const runtime = await loadRegisteredRuntime('LIXIL','インプラス');
const master = runtime.master;
const sizeCases = buildSizeGlassCases(master);
const installCases = buildInstallabilityCases(master);
assert.equal(master.windowTypes.filter((row) => row['状態'] === 'VERIFIED').length, BASE_WINDOW_COUNT);
assert.equal(sizeCases.length, SIZE_GLASS_CASE_COUNT);
assert.equal(installCases.length, INSTALLABILITY_CASE_COUNT);
const states = buildBrowserStates(master, sizeCases, installCases);
assert.equal(states.length, BROWSER_STATE_COUNT_PER_VIEWPORT);
assert.equal(states.filter((row) => row.kind === 'SIZE_BLOCK').length, AUTO_OUTSIDE_STATE_COUNT);
const logicalCaseIds = [...new Set(states.map((row) => row.logicalCaseId))];
assert.equal(logicalCaseIds.length, LOGICAL_QA_CASE_COUNT);

await writeFile(`${OUT}/case-index.json`, JSON.stringify({
  baseWindowCount:BASE_WINDOW_COUNT,
  logicalQaCaseCount:LOGICAL_QA_CASE_COUNT,
  sizeGlassCaseCount:SIZE_GLASS_CASE_COUNT,
  installabilityCaseCount:INSTALLABILITY_CASE_COUNT,
  additionalOutsideBoundaryStateCount:AUTO_OUTSIDE_STATE_COUNT,
  browserStateCountPerViewport:BROWSER_STATE_COUNT_PER_VIEWPORT,
  browserStateChecksTotal:BROWSER_STATE_COUNT_PER_VIEWPORT * 2,
  windowRows:master.windowTypes.filter((row) => row['状態'] === 'VERIFIED').map((row) => ({ windowId:row.window_id, windowType:row['窓種'], sashConfiguration:row['障子構成'] ?? null })),
  logicalCaseIds,
  browserStateIds:states.map((row) => row.stateId),
}, null, 2));

const report = {
  status:'RUNNING',
  baseWindowCount:BASE_WINDOW_COUNT,
  logicalQaCaseCount:LOGICAL_QA_CASE_COUNT,
  sizeGlassCaseCount:SIZE_GLASS_CASE_COUNT,
  installabilityCaseCount:INSTALLABILITY_CASE_COUNT,
  additionalOutsideBoundaryStateCount:AUTO_OUTSIDE_STATE_COUNT,
  browserStateCountPerViewport:BROWSER_STATE_COUNT_PER_VIEWPORT,
  browserStateChecksTotal:BROWSER_STATE_COUNT_PER_VIEWPORT * 2,
  verifiedQaCaseCount:0,
  unverifiedQaCaseCount:LOGICAL_QA_CASE_COUNT,
  desktop:{}, mobile:{}, consoleErrors:[], pageErrors:[], failedResponses:[],
};
const browser = await chromium.launch({ headless:true });

function track(page, viewportName) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push({ viewport:viewportName, text:message.text() }); });
  page.on('pageerror', (error) => report.pageErrors.push({ viewport:viewportName, text:error.message }));
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('favicon')) report.failedResponses.push({ viewport:viewportName, status:response.status(), url:response.url() });
  });
}

async function installHarness(page) {
  const entry = SHARE_TOKEN ? `${BASE}/?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}` : `${BASE}/`;
  await page.goto(entry, { waitUntil:'networkidle' });
  await page.evaluate(async (productId) => {
    const { ProductConfigurationEditor } = await import('/product-configuration-editor.mjs');
    const appMain = document.querySelector('#appMain');
    if (!appMain) throw new Error('appMain not found');
    appMain.innerHTML = '<div id="__inplusFullCoverageQa"></div>';
    const root = appMain.querySelector('#__inplusFullCoverageQa');
    const editor = new ProductConfigurationEditor(root, { showInventory:false });
    await editor.mount();
    const product = editor.state.products.find((row) => row.id === productId);
    if (!product) throw new Error(`Product not found: ${productId}`);
    editor.selectManufacturer(product.manufacturer);
    root.querySelector('#product').value = product.id;
    editor.state.productId = product.id;
    editor.state.productSource = product.sourceType;
    editor.state.selection = {};
    await editor.resolve({ notify:false });
    window.__inplusFullCoverageQa = { editor, root };
  }, PRODUCT_ID);
}

async function runStateChunk(page, chunk) {
  return page.evaluate(async ({ rows, uiSections, forbiddenFields }) => {
    const qa = window.__inplusFullCoverageQa;
    if (!qa?.editor || !qa?.root) throw new Error('Full Coverage QA harness missing');
    const failures = [];
    const results = [];
    const selectedValue = (result, field, value) => {
      const actual = result.selection?.[field];
      return Array.isArray(actual) ? actual.some((one) => String(one) === String(value)) : String(actual) === String(value);
    };
    const add = (issues, ok, message) => { if (!ok) issues.push(message); };
    for (const row of rows) {
      const issues = [];
      let result;
      try {
        qa.editor.state.selection = structuredClone(row.selection);
        await qa.editor.resolve({ notify:false });
        result = qa.editor.state.resolved;
      } catch (error) {
        failures.push({ stateId:row.stateId, logicalCaseId:row.logicalCaseId, issues:[`resolver/render threw: ${error?.stack ?? error}`] });
        results.push({ stateId:row.stateId, logicalCaseId:row.logicalCaseId, pass:false, kind:row.kind, failure:'resolver/render threw' });
        continue;
      }

      add(issues, result?.runtimeMaster?.packageVersion === 'v0.4-R2', 'packageVersion mismatch');
      add(issues, result?.runtimeMaster?.sourcePackageIntegrity?.match === true, 'sourcePackageIntegrity mismatch');
      add(issues, result?.uiTemplate === 'INPLUS_V04R2', 'uiTemplate mismatch');
      add(issues, result?.uiStandardRuntimeGap?.status === 'NONE', 'uiStandardRuntimeGap not NONE');
      add(issues, result?.uiGroupingAudit?.status === 'PASS', 'uiGroupingAudit not PASS');
      add(issues, JSON.stringify(result?.uiSections?.map((section) => section.id)) === JSON.stringify(uiSections), '11-section Runtime contract mismatch');

      const domSections = [...qa.root.querySelectorAll('[data-ui-section]')].map((node) => node.dataset.uiSection);
      const positions = domSections.map((id) => uiSections.indexOf(id));
      add(issues, positions.every((position) => position >= 0), `unknown DOM section ${domSections.join(',')}`);
      for (let i = 1; i < positions.length; i += 1) add(issues, positions[i - 1] < positions[i], `section order violation ${domSections.join(' > ')}`);
      add(issues, JSON.stringify(domSections.slice(0,2)) === JSON.stringify(['manufacturer','product']), 'manufacturer/product anchor mismatch');

      const fieldKeys = [...qa.root.querySelectorAll('#dynamicForm [data-spec-key]')].map((node) => node.dataset.specKey);
      for (const key of forbiddenFields) add(issues, !fieldKeys.includes(key), `forbidden field rendered: ${key}`);
      const mode = result.fields?.find((field) => field.key === 'size_mode');
      add(issues, Boolean(mode), 'size_mode missing');
      add(issues, JSON.stringify(mode?.values?.map((value) => value.value)) === JSON.stringify(['CUSTOM']), 'STANDARD offered or CUSTOM-only contract broken');
      const modeDom = qa.root.querySelector('[data-spec-key="size_mode"]');
      add(issues, Boolean(modeDom), 'size_mode DOM missing');
      if (modeDom) {
        const optionTexts = [...modeDom.querySelectorAll('option')].map((option) => option.textContent).filter((text) => text !== '選択してください');
        add(issues, JSON.stringify(optionTexts) === JSON.stringify(['特注']), `size mode labels mismatch: ${optionTexts.join(',')}`);
        add(issues, !optionTexts.includes('規格'), '規格 must not render');
      }

      if (row.kind.startsWith('SIZE_')) {
        const widthField = result.fields?.find((field) => field.key === 'order_width');
        const heightField = result.fields?.find((field) => field.key === 'order_height');
        const widthDom = qa.root.querySelector('[data-spec-key="order_width"]');
        const heightDom = qa.root.querySelector('[data-spec-key="order_height"]');
        add(issues, Boolean(widthField && heightField && widthDom && heightDom), 'CUSTOM W/H missing from rendered UI');
        add(issues, widthField?.required === true && heightField?.required === true, 'CUSTOM W/H must be required');
        add(issues, String(widthDom?.getAttribute('step')) === '1' && String(heightDom?.getAttribute('step')) === '1', 'CUSTOM W/H step must be 1mm');
        add(issues, result.selection?.size_mode === 'CUSTOM', 'size_mode CUSTOM did not survive');
        if (row.kind === 'SIZE_PASS') {
          add(issues, result.dimensionResult?.status === 'PASS', `expected PASS got ${result.dimensionResult?.status}`);
          add(issues, result.validation?.status !== 'INVALID', 'PASS case became INVALID');
        } else if (row.kind === 'SIZE_REVIEW' || row.kind === 'SIZE_MANUAL') {
          add(issues, result.dimensionResult?.status === 'REVIEW_REQUIRED' || result.validation?.status === 'MANUAL_CHECK', `expected REVIEW/MANUAL got ${result.dimensionResult?.status}/${result.validation?.status}`);
        } else if (row.kind === 'SIZE_BLOCK') {
          add(issues, result.dimensionResult?.status === 'BLOCKED', `expected BLOCKED got ${result.dimensionResult?.status}`);
          add(issues, result.validation?.status === 'INVALID', `outside range must be INVALID, got ${result.validation?.status}`);
        }
      } else if (row.kind.startsWith('INSTALL_')) {
        const targetSelected = selectedValue(result, row.targetField, row.targetValue);
        if (row.kind === 'INSTALL_CLEARED') {
          add(issues, result.clearedFields?.includes(row.targetField), 'denied/not-applicable field not cleared');
          add(issues, !targetSelected, 'cleared dependency selection survived');
        } else if (row.kind === 'INSTALL_MANUAL_CHECK') {
          add(issues, targetSelected, 'manual dependency selection did not survive');
          add(issues, result.manualWarnings?.some((warning) => String(warning).includes(row.targetValue)), 'manual dependency warning missing');
          add(issues, result.validation?.status !== 'INVALID', 'manual dependency became INVALID');
        } else if (row.kind === 'INSTALL_ALLOW') {
          add(issues, targetSelected, 'allowed dependency selection did not survive');
          add(issues, !result.manualWarnings?.some((warning) => String(warning).includes(row.targetValue)), 'allowed dependency became manual');
          add(issues, result.validation?.status !== 'INVALID', 'allowed dependency became INVALID');
        }
        if (row.jointValue) {
          const jointField = result.fields?.find((field) => field.key === 'joint_layout');
          add(issues, Boolean(jointField), 'DELEGATE joint_layout field missing');
          add(issues, jointField?.required === true, 'DELEGATE joint_layout must be required');
          add(issues, jointField?.values?.some((value) => String(value.value) === String(row.jointValue)), 'DELEGATE joint_layout candidate missing');
          if (row.kind !== 'INSTALL_CLEARED') add(issues, selectedValue(result, 'joint_layout', row.jointValue), 'DELEGATE joint_layout selection did not survive');
        }
      }

      const overflow = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
      add(issues, overflow <= 1, `horizontal overflow ${overflow}`);
      const resultRow = {
        stateId:row.stateId, logicalCaseId:row.logicalCaseId, kind:row.kind, pass:issues.length === 0,
        dimensionStatus:result.dimensionResult?.status ?? null,
        validationStatus:result.validation?.status ?? null,
        overflow,
      };
      results.push(resultRow);
      if (issues.length) failures.push({ stateId:row.stateId, logicalCaseId:row.logicalCaseId, issues });
    }
    return { failures, results };
  }, { rows:chunk, uiSections:UI_SECTIONS, forbiddenFields:FORBIDDEN_FIELDS });
}

async function runViewport(name, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  track(page, name);
  await installHarness(page);
  const failures = [];
  const results = [];
  for (let start = 0; start < states.length; start += CHUNK_SIZE) {
    const chunk = states.slice(start, start + CHUNK_SIZE);
    const chunkResult = await runStateChunk(page, chunk);
    failures.push(...chunkResult.failures);
    results.push(...chunkResult.results);
    if ((start + chunk.length) % 300 < CHUNK_SIZE || start + chunk.length === states.length) {
      console.log(`[${name}] ${start + chunk.length}/${states.length} browser states verified`);
    }
  }
  assert.equal(results.length, BROWSER_STATE_COUNT_PER_VIEWPORT);
  await page.screenshot({ path:`${OUT}/${name}-final.png`, fullPage:true });
  await context.close();
  await writeFile(`${OUT}/${name}-results.jsonl`, results.map((row) => JSON.stringify(row)).join('\n') + '\n');
  return { status:failures.length ? 'FAIL' : 'PASS', logicalQaCaseCount:LOGICAL_QA_CASE_COUNT, browserStateCount:results.length, failureCount:failures.length, failures };
}

try {
  report.desktop = await runViewport('desktop', { viewport:{ width:1440, height:1000 } });
  report.mobile = await runViewport('mobile', { viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });

  const failedLogicalCases = new Set([
    ...(report.desktop.failures ?? []).map((row) => row.logicalCaseId),
    ...(report.mobile.failures ?? []).map((row) => row.logicalCaseId),
  ]);
  report.unverifiedQaCaseCount = failedLogicalCases.size;
  report.verifiedQaCaseCount = LOGICAL_QA_CASE_COUNT - failedLogicalCases.size;
  report.failedLogicalCaseIds = [...failedLogicalCases].sort();
  report.status = report.unverifiedQaCaseCount === 0
    && report.desktop.status === 'PASS'
    && report.mobile.status === 'PASS'
    && report.consoleErrors.length === 0
    && report.pageErrors.length === 0
    && report.failedResponses.length === 0
    ? 'PASS' : 'FAIL';

  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    status:report.status,
    baseWindowCount:report.baseWindowCount,
    logicalQaCaseCount:report.logicalQaCaseCount,
    browserStateChecksTotal:report.browserStateChecksTotal,
    verifiedQaCaseCount:report.verifiedQaCaseCount,
    unverifiedQaCaseCount:report.unverifiedQaCaseCount,
    desktop:report.desktop.status,
    mobile:report.mobile.status,
    consoleErrors:report.consoleErrors.length,
    pageErrors:report.pageErrors.length,
    failedResponses:report.failedResponses.length,
  }, null, 2));
  assert.equal(report.status, 'PASS', `Full Browser QA failed; see ${OUT}/report.json`);
} catch (error) {
  report.status = 'FAIL';
  report.failure = error.stack ?? String(error);
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
