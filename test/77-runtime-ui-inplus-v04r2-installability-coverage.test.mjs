import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT_ID = 'SER-LIXIL-INPLUS';
const EXPECTED_INSTALLABILITY_CASE_COUNT = 153;

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
function buildCases(master) {
  const jointJoins = master.installabilityIdJoin.filter((row) => row.selection_field === 'joint_layout');
  assert.equal(jointJoins.length, 3);
  const cases = [];
  for (const scope of master.installabilityScopeJoin) {
    assert.equal(scope.evaluation_policy, 'AUTO');
    const glassFamily = scope.glass_family === '*' ? wildcardGlassFamily(master, scope.window_type) : scope.glass_family;
    for (const itemJoin of compatibleItemJoins(master, scope.window_type)) {
      if (itemJoin.evaluation_policy === 'DELEGATE') {
        for (const jointJoin of jointJoins) {
          cases.push({ scope, glassFamily, itemJoin, jointJoin, expected:expectedFromMatrix(master, scope, itemJoin, jointJoin) });
        }
      } else {
        cases.push({ scope, glassFamily, itemJoin, jointJoin:null, expected:expectedFromMatrix(master, scope, itemJoin) });
      }
    }
  }
  return cases;
}
async function resolveCase(caseId, selection) {
  try { return await resolveRuntimeAppProduct(PRODUCT_ID, selection); }
  catch (error) { throw new Error(`${caseId}: resolver threw ${error.code ?? error.name}: ${error.message}; selection=${JSON.stringify(selection)}`, { cause:error }); }
}
function selectedValue(result, field, id) {
  const value = result.selection[field];
  return Array.isArray(value) ? value.includes(id) : value === id;
}
function dependencyDebug(result, field) {
  const uiField = result.fields.find((row) => row.key === field);
  const jointField = result.fields.find((row) => row.key === 'joint_layout');
  return JSON.stringify({
    selection:result.selection,
    clearedFields:result.clearedFields,
    manualWarnings:result.manualWarnings,
    validation:result.validation,
    field:{ key:field, values:uiField?.values?.map((row) => row.value), runtimeState:uiField?.runtimeState, required:uiField?.required },
    joint:{ values:jointField?.values?.map((row) => row.value), runtimeState:jointField?.runtimeState, required:jointField?.required },
  });
}

test('Inplus installability coverage expands all Formal scope/item/delegate branches to 153 cases', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL','インプラス');
  const master = runtime.master;
  assert.equal(master.installabilityScopeJoin.length, 6);
  assert.equal(master.installabilityIdJoin.length, 29);
  const cases = buildCases(master);
  assert.equal(cases.length, EXPECTED_INSTALLABILITY_CASE_COUNT);
  assert.equal(cases.filter((row) => row.itemJoin.selection_field === 'frame_install_spec').length, 102);
  assert.equal(cases.filter((row) => row.itemJoin.selection_field === 'option_items').length, 51);
  assert.equal(cases.filter((row) => row.jointJoin).length, 18);
});

test('Inplus installability executes all 153 Formal dependency cases fail-closed', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL','インプラス');
  const master = runtime.master;
  const cases = buildCases(master);
  const summary = { allow:0, manual:0, cleared:0 };

  for (const row of cases) {
    const { scope, glassFamily, itemJoin, jointJoin, expected } = row;
    const field = itemJoin.selection_field;
    const id = itemJoin.canonical_id_or_value;
    const caseId = `${scope.matrix_scope_key}::${field}=${id}${jointJoin ? `::joint=${jointJoin.canonical_id_or_value}` : ''}`;
    const selection = { window_type:scope.window_type, glass_family:glassFamily };
    if (field === 'option_items') selection.option_items = [id];
    else selection[field] = id;
    if (jointJoin) selection.joint_layout = jointJoin.canonical_id_or_value;

    const result = await resolveCase(caseId, selection);
    const debug = dependencyDebug(result, field);
    assert.equal(result.runtimeMaster.packageVersion, 'v0.4-R2', `${caseId}: package identity`);
    assert.equal(result.runtimeMaster.sourcePackageIntegrity.match, true, `${caseId}: runtime integrity`);

    if (expected === 'CLEARED') {
      assert.ok(result.clearedFields.includes(field), `${caseId}: denied/not-applicable selection must clear; ${debug}`);
      assert.equal(selectedValue(result, field, id), false, `${caseId}: cleared selection must not survive; ${debug}`);
      summary.cleared += 1;
      continue;
    }

    assert.equal(selectedValue(result, field, id), true, `${caseId}: allowed/manual selection must survive; ${debug}`);
    if (expected === 'MANUAL_CHECK') {
      assert.ok(result.manualWarnings.some((warning) => warning.includes(id)), `${caseId}: manual state must remain explicit; ${debug}`);
      assert.equal(result.validation.status === 'INVALID', false, `${caseId}: manual is not invalid; ${debug}`);
      summary.manual += 1;
    } else {
      assert.equal(result.manualWarnings.some((warning) => warning.includes(id)), false, `${caseId}: explicit allow must not become manual; ${debug}`);
      assert.equal(result.validation.status === 'INVALID', false, `${caseId}: explicit allow must not be invalid; ${debug}`);
      summary.allow += 1;
    }
  }

  assert.equal(summary.allow + summary.manual + summary.cleared, EXPECTED_INSTALLABILITY_CASE_COUNT);
  assert.ok(summary.allow > 0);
  assert.ok(summary.manual > 0);
  assert.ok(summary.cleared > 0);
});
