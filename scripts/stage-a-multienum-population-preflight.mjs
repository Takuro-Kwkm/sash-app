import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const OUT = process.env.STAGE_A_MULTI_ENUM_OUT ?? 'artifacts/stage-a-multienum-preflight';
const EXACT_HEAD_SHA = process.env.HEAD_SHA ?? null;
const MAX_EXPLICIT_MULTI_ENUM_VALUES = Number(process.env.STAGE_A_MAX_EXPLICIT_MULTI_ENUM_VALUES ?? 18);

const WITNESSES = [
  {
    evidence_head_sha: '3f61b8d29eaff1560f5d8249293a1931ca678ead',
    product_id: 'SER-LIXIL-TW',
    manufacturer: 'LIXIL',
    series: 'TW',
    window_type: 'SWT-LIX-TW-UNIT-HIKI-FLAT',
    field: 'option',
    selection: {
      window_type: 'SWT-LIX-TW-UNIT-HIKI-FLAT',
      size_mode: 'STANDARD',
      panel_count: '2枚建',
      size: 'SZ-LIX-TW-FLAT-Z-119-18',
      exterior_color: 'EXT-LIX-H',
      interior_color: 'INT-LIX-M',
      glass_base: 'トリプルガラス',
    },
  },
];

const present = (value) => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
const same = (actual, expected) => Array.isArray(expected)
  ? Array.isArray(actual) && expected.every((value) => actual.map(String).includes(String(value)))
  : String(actual) === String(expected);
const subsetCount = (count) => (1n << BigInt(count)).toString();

await mkdir(OUT, { recursive:true });
const witnesses = [];
let blockerCount = 0;

for (const witness of WITNESSES) {
  const result = await resolveRuntimeAppProduct(witness.product_id, witness.selection);
  assert.equal(String(result.selection?.window_type), witness.window_type, `${witness.product_id}: witness window did not survive`);
  for (const [key, value] of Object.entries(witness.selection)) {
    if (!present(value)) continue;
    assert.ok(same(result.selection?.[key], value), `${witness.product_id}/${witness.window_type}: witness selection did not survive: ${key}`);
  }
  const field = (result.fields ?? []).find((row) => row.key === witness.field);
  assert.ok(field, `${witness.product_id}/${witness.window_type}: ${witness.field} field missing`);
  assert.equal(field.dataType, 'MULTI_ENUM', `${witness.product_id}/${witness.window_type}: ${witness.field} must be MULTI_ENUM`);
  const enabled = (field.values ?? []).filter((choice) => choice.disabled !== true);
  const candidateValues = enabled.map((choice) => choice.value);
  const candidateCount = candidateValues.length;

  const allSelectedResult = await resolveRuntimeAppProduct(witness.product_id, {
    ...witness.selection,
    [witness.field]: candidateValues,
  });
  const jointlySurvivingValues = Array.isArray(allSelectedResult.selection?.[witness.field])
    ? allSelectedResult.selection[witness.field].filter((value) => candidateValues.map(String).includes(String(value)))
    : [];
  const jointlySurvivingCount = jointlySurvivingValues.length;
  assert.ok(jointlySurvivingCount > 0, `${witness.product_id}/${witness.window_type}: no jointly surviving ${witness.field} values`);
  const jointResult = await resolveRuntimeAppProduct(witness.product_id, {
    ...witness.selection,
    [witness.field]: jointlySurvivingValues,
  });
  assert.ok(same(jointResult.selection?.[witness.field], jointlySurvivingValues), `${witness.product_id}/${witness.window_type}: jointly surviving set is not stable`);

  const rawSubsetCount = subsetCount(candidateCount);
  const compatibleSubsetLowerBound = subsetCount(jointlySurvivingCount);
  const exceedsExplicitLimit = candidateCount > MAX_EXPLICIT_MULTI_ENUM_VALUES || jointlySurvivingCount > MAX_EXPLICIT_MULTI_ENUM_VALUES;
  if (exceedsExplicitLimit) blockerCount += 1;
  witnesses.push({
    manufacturer:witness.manufacturer,
    series:witness.series,
    product_id:witness.product_id,
    window_type:witness.window_type,
    field:witness.field,
    data_type:field.dataType,
    candidate_count:candidateCount,
    raw_subset_count:rawSubsetCount,
    jointly_surviving_count:jointlySurvivingCount,
    compatible_subset_lower_bound:compatibleSubsetLowerBound,
    max_explicit_multi_enum_values:MAX_EXPLICIT_MULTI_ENUM_VALUES,
    exceeds_explicit_limit:exceedsExplicitLimit,
    candidate_values:candidateValues,
    jointly_surviving_values:jointlySurvivingValues,
    current_selection:result.selection,
    all_selected_cleared_fields:allSelectedResult.clearedFields ?? [],
    evidence_head_sha:witness.evidence_head_sha,
    monotonicity_basis:'TW canonical Runtime option availability only adds deny conditions when selected trigger options are present; removing options from a stable jointly-surviving set cannot create a new trigger-based deny for another survivor.',
  });
}

const report = {
  exact_head_sha:EXACT_HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  witness_count:witnesses.length,
  blocker_count:blockerCount,
  max_explicit_multi_enum_values:MAX_EXPLICIT_MULTI_ENUM_VALUES,
  witnesses,
  exhaustive_state_graph_gate:blockerCount ? 'BLOCKED_BY_COMBINATORIAL_POPULATION' : 'PENDING',
  qa_population_gate:blockerCount ? 'BLOCKED_BY_COMBINATORIAL_POPULATION' : 'PENDING',
  full_browser_qa_gate:'NOT_STARTED',
  app_integration_ready:false,
  release_input_gate:'BLOCKED',
  note:blockerCount
    ? 'Sampling is prohibited. The witness contains a stable jointly-surviving MULTI_ENUM set whose subset population alone exceeds the configured explicit-enumeration bound. Heavy exhaustive shards are therefore fail-closed.'
    : 'No configured explicit-enumeration blocker was found by the current witnesses.',
};
await writeFile(`${OUT}/report.json`, `${JSON.stringify(report,null,2)}\n`, 'utf8');

for (const row of witnesses) {
  console.log(`MULTI_ENUM_WITNESS product=${row.product_id} window=${row.window_type} field=${row.field} candidates=${row.candidate_count} raw_subsets=${row.raw_subset_count} jointly_surviving=${row.jointly_surviving_count} compatible_subset_lower_bound=${row.compatible_subset_lower_bound}`);
}
console.log(`MULTI_ENUM_BLOCKER_COUNT=${blockerCount}`);
console.log(`EXHAUSTIVE_STATE_GRAPH_GATE=${report.exhaustive_state_graph_gate}`);
console.log(`QA_POPULATION_GATE=${report.qa_population_gate}`);
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');

if (blockerCount > 0) process.exitCode = 2;
