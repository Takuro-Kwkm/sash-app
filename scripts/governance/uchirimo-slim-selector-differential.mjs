import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { getRuntimeMasterEntry } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { adaptUchirimoTabularV1 } from '../../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import { compareUchirimoGlassSemantics } from '../../src/catalog/runtime-master/uchirimo-slim-canonical.mjs';

// Migration-only differential. This does not certify every reachable selector
// state of a V12 parent and cannot itself import a historical parent PASS.
const candidatePath = process.env.UCHIRIMO_SLIM_INPUT ?? 'data/uchirimo-slim/working-candidate.json';
const output = process.env.UCHIRIMO_SLIM_DIFFERENTIAL_OUT ?? 'artifacts/uchirimo-slim/selector-differential.json';
const bytes = readFileSync(candidatePath);
const candidateHash = createHash('sha256').update(bytes).digest('hex');
const candidate = JSON.parse(bytes);
assert.equal(candidate.lifecycle, 'WORKING_CANDIDATE_NOT_FORMAL');
const pkg = await loadCanonicalWorkbookRuntimePackage(getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓'));
assert.equal(pkg.integrity.match, true);
assert.equal(pkg.integrity.actual, candidate.source_formal.runtime_manifest_sha256);
const role = Object.keys(pkg.documents).find((key) => pkg.documents[key]?.glass_node_matrix);
assert.ok(role);
const legacy = pkg.documents[role];
const slim = candidate.canonical;
const matrix = compareUchirimoGlassSemantics(legacy, slim);
assert.equal(matrix.status, 'PASS');
const before = adaptUchirimoTabularV1(pkg);
const after = adaptUchirimoTabularV1({ ...pkg, documents: { ...pkg.documents, [role]: slim } });
const start = performance.now();
const modelKeys = ['fields', 'values', 'fieldByName', 'valuesByField',
  'detailMatrixByNodeId', 'sizeRuleByNodeId', 'sortedDependencyRules', 'glassScopeRules',
  'manualRouteByGsc', 'judgment', 'vacuum', 'capabilities'];
const json = (value) => JSON.stringify(value, (_, part) => part instanceof Map ? [...part] : part);
const hash = (value) => createHash('sha256').update(json(value)).digest('hex');
for (const key of modelKeys) if (hash(after.master[key]) !== hash(before.master[key])) throw new Error(`MODEL_${key}_MISMATCH`);
for (const node of legacy.product_nodes) {
  const rows = (model) => model.glassSpecsByNodeId.get(node.node_id).map(({ compatibility_profile_id, ...glass }) => glass);
  if (hash(rows(after.master)) !== hash(rows(before.master))) throw new Error(`MODEL_GLASS_INDEX_${node.node_id}_MISMATCH`);
}
const axes = ['glass_family', 'glass_structure', 'low_e_type', 'glass_coating_color',
  'glass_surface_type', 'safety_treatment', 'grille_type', 'grille_material',
  'muntin_type', 'vacuum_glass_product', 'spacer_type', 'gas_fill'];
const digest = createHash('sha256');
let fullCases = 0, prefixCases = 0, invalidCases = 0, peakHeapMb = 0;
const compare = (selection, label) => {
  const old = before.resolver(selection);
  const current = after.resolver(selection);
  if (json(current) !== json(old)) throw new Error(`SELECTOR_DIFFERENTIAL_MISMATCH:${label}`);
  digest.update(JSON.stringify(current)); digest.update('\n');
  if ((fullCases + prefixCases + invalidCases) % 1000 === 0) peakHeapMb = Math.max(peakHeapMb, Math.round(process.memoryUsage().heapUsed / 1048576));
};
for (const node of legacy.product_nodes) {
  const base = { room_specification: node.room, window_type: node.window_type,
    frame_color: 'white', size_w: 1000, size_h: 1000 };
  if (node.window_type === 'sliding_window') {
    base.sash_configuration = node.sash_configuration;
    base.size_class = node.size_class;
  }
  for (const glass of legacy.glass_specs) {
    const selection = { ...base };
    for (const axis of axes) if (glass[axis] && glass[axis] !== 'NOT_APPLICABLE') selection[axis] = glass[axis];
    compare(selection, `${node.node_id}/${glass.glass_spec_id}/full`);
    fullCases++;
    // All declared glass prefixes, including unset axes, exercise the indexed
    // candidate path with the same input used by the FORMAL resolver.
    for (let index = axes.length - 1; index >= 0; index--) {
      delete selection[axes[index]];
      compare(selection, `${node.node_id}/${glass.glass_spec_id}/prefix-${index}`);
      prefixCases++;
    }
  }
  const representatives = new Map();
  for (const glass of slim.glass_specs) if (!representatives.has(glass.compatibility_profile_id)) {
    representatives.set(glass.compatibility_profile_id, glass);
  }
  for (const glass of representatives.values()) {
    for (const field of ['glass_structure', 'low_e_type']) {
      const invalid = { ...base, glass_family: glass.glass_family, [field]: '__INVALID__' };
      compare(invalid, `${node.node_id}/${glass.compatibility_profile_id}/invalid-${field}`);
      invalidCases++;
    }
  }
}
const report = { schema_version: 'UCHIRIMO_SLIM_SELECTOR_DIFFERENTIAL_V1', status: 'PASS',
  evidence_scope: 'MIGRATION_DIFFERENTIAL_NOT_PARENT_LEVEL_V12_PASS',
  candidate_sha256: candidateHash, source_runtime_sha256: pkg.integrity.actual,
  matched_model_components: modelKeys, matrix_dispositions: matrix.match_count,
  node_count: legacy.product_nodes.length, glass_count: legacy.glass_specs.length,
  full_selection_cases: fullCases, prefix_selection_cases: prefixCases, invalid_selection_cases: invalidCases,
  total_matched_resolver_cases: fullCases + prefixCases + invalidCases,
  response_stream_sha256: digest.digest('hex'),
  duration_ms: Math.round((performance.now() - start) * 1000) / 1000,
  observed_peak_heap_mb: peakHeapMb,
  candidate_facet_cache_size: after.master.glassFacetCache.size,
  candidate_scope_cache_size: after.master.glassScopeCache.size,
  parent_selector_pass_imported: 0 };
mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
