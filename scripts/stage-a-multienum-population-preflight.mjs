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
  const candidateCount = enabled.length;
  const rawSubsetCount = 1n << BigInt(candidateCount);
  const exceedsExplicitLimit = candidateCount > MAX_EXPLICIT_MULTI_ENUM_VALUES;
  if (exceedsExplicitLimit) blockerCount += 1;
  witnesses.push({
    manufacturer:witness.manufacturer,
    series:witness.series,
    product_id:witness.product_id,
    window_type:witness.window_type,
    field:witness.field,
    data_type:field.dataType,
    candidate_count:candidateCount,
    raw_subset_count:rawSubsetCount.toString(),
    max_explicit_multi_enum_values:MAX_EXPLICIT_MULTI_ENUM_VALUES,
    exceeds_explicit_limit:exceedsExplicitLimit,
    candidate_values:enabled.map((choice) => choice.value),
    current_selection:result.selection,
    evidence_head_sha:witness.evidence_head_sha,
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
    ? 'Sampling is prohibited. This preflight does not prune valid subsets; it fails closed before spending CI on an explicit power-set traversal that exceeds the configured safe enumeration bound.'
    : 'No configured explicit-enumeration blocker was found by the current witnesses.',
};
await writeFile(`${OUT}/report.json`, `${JSON.stringify(report,null,2)}\n`, 'utf8');

for (const row of witnesses) {
  console.log(`MULTI_ENUM_WITNESS product=${row.product_id} window=${row.window_type} field=${row.field} candidates=${row.candidate_count} raw_subsets=${row.raw_subset_count}`);
}
console.log(`MULTI_ENUM_BLOCKER_COUNT=${blockerCount}`);
console.log(`EXHAUSTIVE_STATE_GRAPH_GATE=${report.exhaustive_state_graph_gate}`);
console.log(`QA_POPULATION_GATE=${report.qa_population_gate}`);
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');

if (blockerCount > 0) process.exitCode = 2;
