import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';

const OUT = process.env.STAGE_A_SYMBOLIC_OUT ?? 'artifacts/stage-a-multienum-symbolic-candidate';
const EXACT_HEAD_SHA = process.env.HEAD_SHA ?? null;
const ENGINE_PATH = new URL('../src/catalog/runtime-master/canonical-workbook-runtime-engine.mjs', import.meta.url);

const WITNESS = Object.freeze({
  product_id: 'SER-LIXIL-TW',
  manufacturer: 'LIXIL',
  series: 'TW',
  window_type: 'SWT-LIX-TW-UNIT-HIKI-FLAT',
  field: 'option',
  selection: Object.freeze({
    window_type: 'SWT-LIX-TW-UNIT-HIKI-FLAT',
    size_mode: 'STANDARD',
    panel_count: '2枚建',
    size: 'SZ-LIX-TW-FLAT-Z-119-18',
    exterior_color: 'EXT-LIX-H',
    interior_color: 'INT-LIX-M',
    glass_base: 'トリプルガラス',
  }),
});

const present = (value) => value !== undefined && value !== null && value !== '';
const optionSet = (result, field = 'option') => new Set(Array.isArray(result.selection?.[field]) ? result.selection[field].map(String) : []);
const bitCount = (mask) => {
  let n = 0;
  for (let x = mask; x; x >>= 1n) n += Number(x & 1n);
  return n;
};

function connectedComponents(adjacency) {
  const seen = new Set();
  const components = [];
  for (const vertex of adjacency.keys()) {
    if (seen.has(vertex)) continue;
    const stack = [vertex];
    const component = [];
    seen.add(vertex);
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      for (const next of adjacency.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    components.push(component.sort());
  }
  return components.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

function independentSetCount(component, adjacency) {
  if (component.length === 0) return 1n;
  if (component.length === 1) return 2n;
  const index = new Map(component.map((value, i) => [value, i]));
  const neighborMasks = component.map((value) => {
    let mask = 0n;
    for (const neighbor of adjacency.get(value) ?? []) {
      const i = index.get(neighbor);
      if (i !== undefined) mask |= 1n << BigInt(i);
    }
    return mask;
  });
  const memo = new Map();
  const solve = (mask) => {
    if (mask === 0n) return 1n;
    const key = mask.toString();
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let hasEdge = false;
    for (let i = 0; i < component.length; i++) {
      const bit = 1n << BigInt(i);
      if ((mask & bit) && (neighborMasks[i] & mask)) { hasEdge = true; break; }
    }
    if (!hasEdge) {
      const result = 1n << BigInt(bitCount(mask));
      memo.set(key, result);
      return result;
    }

    let chosen = -1;
    let bestDegree = -1;
    for (let i = 0; i < component.length; i++) {
      const bit = 1n << BigInt(i);
      if (!(mask & bit)) continue;
      const degree = bitCount(neighborMasks[i] & mask);
      if (degree > bestDegree) { bestDegree = degree; chosen = i; }
    }
    const chosenBit = 1n << BigInt(chosen);
    const withoutChosen = mask & ~chosenBit;
    const exclude = solve(withoutChosen);
    const include = solve(withoutChosen & ~neighborMasks[chosen]);
    const result = exclude + include;
    memo.set(key, result);
    return result;
  };
  return solve((1n << BigInt(component.length)) - 1n);
}

await mkdir(OUT, { recursive: true });

// Static proof obligation: in the TW canonical engine, selected option values influence
// option availability only through one single-trigger membership check. This makes the
// option interaction monotone and pairwise for a fixed non-option selector frontier.
const engineSource = await readFile(ENGINE_PATH, 'utf8');
const selectionOptionOccurrences = [...engineSource.matchAll(/selection\.option/g)].length;
assert.equal(selectionOptionOccurrences, 1, `Expected exactly one selection.option read in canonical engine, found ${selectionOptionOccurrences}`);
assert.match(engineSource, /const trigger = rule\['トリガーoption_id'\]/);
assert.match(engineSource, /\(selection\.option \?\? \[\]\)\.includes\(trigger\)/);
assert.match(engineSource, /rule\['アクション'\] !== '選択不可'/);

const runtime = await loadRegisteredRuntime(WITNESS.manufacturer, WITNESS.series);
assert.ok(runtime?.master, 'TW canonical Runtime master did not load');
const dependencies = runtime.master.sourceRows?.optionDependencies ?? [];
const triggerRows = dependencies.filter((row) => present(row['トリガーoption_id']) && row['トリガーoption_id'] !== '-');
for (const row of triggerRows) {
  assert.equal(row['アクション'], '選択不可', `Unsupported trigger action: ${row['アクション']}`);
  const trigger = String(row['トリガーoption_id']);
  assert.ok(!/[|,;]/.test(trigger), `Trigger must reference exactly one option id: ${trigger}`);
}

const base = await resolveRuntimeAppProduct(WITNESS.product_id, WITNESS.selection);
assert.equal(String(base.selection?.window_type), WITNESS.window_type, 'Witness window did not survive');
const field = (base.fields ?? []).find((row) => row.key === WITNESS.field);
assert.ok(field, 'MULTI_ENUM field missing');
assert.equal(field.dataType, 'MULTI_ENUM', 'Witness field must be MULTI_ENUM');
const candidates = (field.values ?? []).filter((choice) => choice.disabled !== true).map((choice) => String(choice.value));
assert.ok(candidates.length > 0, 'No enabled MULTI_ENUM candidates');

// Exact pair oracle. Every pair is checked; nothing is sampled.
const adjacency = new Map(candidates.map((value) => [value, new Set()]));
const pairChecks = [];
for (let i = 0; i < candidates.length; i++) {
  const singleton = await resolveRuntimeAppProduct(WITNESS.product_id, { ...WITNESS.selection, [WITNESS.field]: [candidates[i]] });
  assert.ok(optionSet(singleton, WITNESS.field).has(candidates[i]), `Candidate does not survive singleton selection: ${candidates[i]}`);
  for (let j = i + 1; j < candidates.length; j++) {
    const a = candidates[i], b = candidates[j];
    const result = await resolveRuntimeAppProduct(WITNESS.product_id, { ...WITNESS.selection, [WITNESS.field]: [a, b] });
    const survived = optionSet(result, WITNESS.field);
    const compatible = survived.has(a) && survived.has(b);
    if (!compatible) {
      adjacency.get(a).add(b);
      adjacency.get(b).add(a);
    }
    pairChecks.push({ a, b, compatible, surviving: [...survived].sort() });
  }
}

const components = connectedComponents(adjacency);
let exactCompatibleSubsetCount = 1n;
const componentProofs = [];
for (const component of components) {
  const edgeCount = component.reduce((sum, value) => sum + (adjacency.get(value)?.size ?? 0), 0) / 2;
  const count = independentSetCount(component, adjacency);
  exactCompatibleSubsetCount *= count;
  componentProofs.push({
    vertices: component,
    vertex_count: component.length,
    edge_count: edgeCount,
    exact_independent_set_count: count.toString(),
  });
}

const conflicts = [];
for (let i = 0; i < candidates.length; i++) {
  for (let j = i + 1; j < candidates.length; j++) {
    const a = candidates[i], b = candidates[j];
    if (adjacency.get(a).has(b)) conflicts.push([a, b]);
  }
}

// Sanity-check the graph model against the current Runtime on the maximally compatible
// set obtained by greedily selecting every candidate that has no conflict with the set.
const greedy = [];
for (const value of candidates) {
  if (greedy.every((selected) => !adjacency.get(value).has(selected))) greedy.push(value);
}
const greedyResult = await resolveRuntimeAppProduct(WITNESS.product_id, { ...WITNESS.selection, [WITNESS.field]: greedy });
const greedySurvived = optionSet(greedyResult, WITNESS.field);
assert.ok(greedy.every((value) => greedySurvived.has(value)), 'Pairwise-compatible greedy set was not stable in Runtime');

const report = {
  exact_head_sha: EXACT_HEAD_SHA,
  task_classification: 'NON-PRODUCT-MASTER',
  product_master_mutation: 0,
  status: 'CANDIDATE_PROOF_NOT_GOVERNING',
  witness: {
    manufacturer: WITNESS.manufacturer,
    series: WITNESS.series,
    product_id: WITNESS.product_id,
    window_type: WITNESS.window_type,
    field: WITNESS.field,
    fixed_non_option_selection: WITNESS.selection,
  },
  proof_obligations: {
    selection_option_reads_in_engine: selectionOptionOccurrences,
    trigger_dependency_row_count: triggerRows.length,
    all_trigger_rows_single_option: true,
    all_trigger_actions_selection_deny: true,
    pair_checks_required: (candidates.length * (candidates.length - 1)) / 2,
    pair_checks_completed: pairChecks.length,
    pair_oracle_sampling: false,
  },
  candidate_count: candidates.length,
  raw_subset_count: (1n << BigInt(candidates.length)).toString(),
  conflict_edge_count: conflicts.length,
  connected_component_count: components.length,
  components: componentProofs,
  exact_compatible_subset_count: exactCompatibleSubsetCount.toString(),
  conflicts,
  greedy_stable_set_size: greedy.length,
  greedy_stable_set: greedy,
  qa_semantics: {
    current_governing_specs_accept_symbolic_substitution: false,
    exhaustive_state_graph_gate: 'BLOCKED_PENDING_GOVERNANCE_ADOPTION',
    qa_population_gate: 'BLOCKED_PENDING_GOVERNANCE_ADOPTION',
    full_browser_qa_gate: 'NOT_STARTED',
    app_integration_ready: false,
    release_input_gate: 'BLOCKED',
  },
  note: 'This is an exact, non-sampling symbolic count for the fixed TW MULTI_ENUM frontier. It does not itself change the governing Full Coverage rule and cannot be used to mark Stage A PASS until the governing QA specification explicitly accepts symbolic/constraint-equivalence proof as a substitute for materializing every compatible subset and browser case.',
};

await writeFile(`${OUT}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(`${OUT}/pair-checks.json`, `${JSON.stringify(pairChecks, null, 2)}\n`, 'utf8');
console.log(`SYMBOLIC_CANDIDATE_STATUS=${report.status}`);
console.log(`CANDIDATES=${report.candidate_count}`);
console.log(`PAIR_CHECKS=${report.proof_obligations.pair_checks_completed}`);
console.log(`CONFLICT_EDGES=${report.conflict_edge_count}`);
console.log(`EXACT_COMPATIBLE_SUBSET_COUNT=${report.exact_compatible_subset_count}`);
console.log('QA_POPULATION_GATE=BLOCKED_PENDING_GOVERNANCE_ADOPTION');
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
