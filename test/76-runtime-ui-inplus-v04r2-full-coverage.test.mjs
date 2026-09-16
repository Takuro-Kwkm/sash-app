import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT_ID = 'SER-LIXIL-INPLUS';
const SELECTOR_KEYS = ['window_type','sash_configuration','size_class','upper_frame_spec','joint_layout'];
const BASE_WINDOW_COUNT = 8;
const EXPECTED_SIZE_GLASS_CASE_COUNT = 995;

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

async function resolveCase(caseId, phase, selection) {
  try {
    return await resolveRuntimeAppProduct(PRODUCT_ID, selection);
  } catch (error) {
    const detail = `${caseId} [${phase}]: resolver threw ${error.code ?? error.name}: ${error.message}; selection=${JSON.stringify(selection)}`;
    throw new Error(detail, { cause:error });
  }
}

function assertCustomUi(result, caseId) {
  const mode = result.fields.find((field) => field.key === 'size_mode');
  assert.ok(mode, `${caseId}: size_mode missing`);
  assert.deepEqual(mode.values.map((row) => row.value), ['CUSTOM'], `${caseId}: STANDARD must not be offered`);
  const width = result.fields.find((field) => field.key === 'order_width');
  const height = result.fields.find((field) => field.key === 'order_height');
  assert.ok(width, `${caseId}: CUSTOM W missing`);
  assert.ok(height, `${caseId}: CUSTOM H missing`);
  assert.equal(width.required, true, `${caseId}: W must be required`);
  assert.equal(height.required, true, `${caseId}: H must be required`);
  assert.equal(width.step, 1, `${caseId}: W step`);
  assert.equal(height.step, 1, `${caseId}: H step`);
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
        cases.push({
          id:`SEL${selector._source_row}-GL${glass.glass_config_id}-PAT${formalPattern}`,
          selector,
          glass,
          family,
          formalPattern,
          expectedJoin: selector.base_range_id ? expectedGlassJoin(master, selector.base_range_id, family.limit_family_id, formalPattern) : null,
        });
      }
    }
  }
  return cases;
}

test('Inplus Full Coverage inventory is derived from all 8 Formal window rows and all effective selector/glass branches', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL','インプラス');
  const master = runtime.master;
  assert.equal(master.windowTypes.filter((row) => row['状態'] === 'VERIFIED').length, BASE_WINDOW_COUNT);
  assert.equal(master.fabricationSelector.filter((row) => present(row.window_type)).length, 20);
  assert.equal(master.fabricationSelector.filter((row) => present(row.window_type) && row.evaluation_policy === 'AUTO').length, 11);
  assert.equal(master.fabricationSelector.filter((row) => present(row.window_type) && row.evaluation_policy === 'MANUAL_CHECK').length, 9);
  assert.equal(master.glassConfigurations.filter((row) => row['状態'] === 'VERIFIED').length, 45);
  assert.equal(master.glassLimitFamily.length, 142);

  const cases = buildSizeGlassCases(master);
  assert.equal(cases.length, EXPECTED_SIZE_GLASS_CASE_COUNT);
  const coveredWindowRows = new Set(cases.map((row) => `${row.selector.window_type}::${row.selector.sash_configuration ?? ''}`));
  for (const windowRow of master.windowTypes.filter((row) => row['状態'] === 'VERIFIED')) {
    assert.ok(coveredWindowRows.has(`${windowRow['窓種']}::${present(windowRow['障子構成']) ? windowRow['障子構成'] : ''}`), `uncovered Formal window row ${windowRow.window_id}`);
  }
});

test('Inplus Full Coverage executes all 995 size/glass selector cases fail-closed', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL','インプラス');
  const master = runtime.master;
  const cases = buildSizeGlassCases(master);
  const summary = { pass:0, review:0, manualSelector:0, blockedChecks:0 };

  for (const row of cases) {
    const { selector, glass, family, formalPattern, expectedJoin, id } = row;
    let selection = {
      ...selectorSelection(selector),
      glass_detail:glass.glass_config_id,
    };
    if (family.decorative_pattern_domain === '荒間|横繁') selection.decorative_pattern = formalPattern;

    if (selector.evaluation_policy !== 'AUTO' || !selector.base_range_id) {
      selection = { ...selection, order_width:1000, order_height:1000 };
      const result = await resolveCase(id, 'manual-selector', selection);
      assertCustomUi(result, id);
      assert.ok(
        result.dimensionResult?.status === 'REVIEW_REQUIRED' || result.validation.status === 'MANUAL_CHECK',
        `${id}: formal manual selector must not auto-PASS (${result.dimensionResult?.status}/${result.validation.status})`,
      );
      summary.manualSelector += 1;
      continue;
    }

    selection = { ...selection, ...nominalDimensions(master, selector, expectedJoin) };
    const result = await resolveCase(id, 'nominal', selection);
    assertCustomUi(result, id);

    if (expectedJoin) {
      assert.equal(result.dimensionResult?.status, 'PASS', `${id}: explicit Formal glass join must PASS at nominal in-range point`);
      assert.notEqual(result.validation.status, 'INVALID', `${id}: explicit Formal glass join must not be invalid`);
      summary.pass += 1;
    } else {
      assert.ok(
        result.dimensionResult?.status === 'REVIEW_REQUIRED' || result.validation.status === 'MANUAL_CHECK',
        `${id}: missing Formal glass join must fail closed to review/manual`,
      );
      summary.review += 1;
    }

    const base = master.baseRangeById.get(selector.base_range_id);
    const outsideSelection = {
      ...selection,
      order_width:Number(base.W_max) + 1,
      order_height:Number(base.H_min),
    };
    const outside = await resolveCase(id, 'outside', outsideSelection);
    assert.equal(outside.dimensionResult?.status, 'BLOCKED', `${id}: out-of-range CUSTOM must BLOCK`);
    assert.equal(outside.validation.status, 'INVALID', `${id}: out-of-range CUSTOM must be INVALID`);
    summary.blockedChecks += 1;
  }

  assert.equal(summary.pass + summary.review + summary.manualSelector, EXPECTED_SIZE_GLASS_CASE_COUNT);
  assert.ok(summary.pass > 0);
  assert.ok(summary.review > 0, 'formal missing/ambiguous joins must remain visible in coverage evidence');
  assert.equal(summary.manualSelector, 468);
  assert.equal(summary.blockedChecks, 527);
});
