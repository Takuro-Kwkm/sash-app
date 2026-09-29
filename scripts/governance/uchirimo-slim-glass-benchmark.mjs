import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { getRuntimeMasterEntry } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { adaptUchirimoTabularV1 } from '../../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import { normalizeUchirimoGlassMatrix } from '../../src/catalog/runtime-master/uchirimo-slim-canonical.mjs';
import { normalizeGlassSpecifications, stableJson } from '../../src/catalog/runtime-master/uchirimo-glass-rule-model.mjs';

const pkg = await loadCanonicalWorkbookRuntimePackage(getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓'));
assert.equal(pkg.integrity.match, true);
const role = Object.keys(pkg.documents).find((k) => pkg.documents[k]?.glass_node_matrix);
const formal = pkg.documents[role], before = normalizeUchirimoGlassMatrix(formal), after = normalizeGlassSpecifications(before);
const bytes = readFileSync('data/uchirimo-slim/working-candidate.json');
assert.equal(stableJson(JSON.parse(bytes).canonical), stableJson(after));
const models = Object.fromEntries(Object.entries({ before, after }).map(([name, c]) =>
  [name, adaptUchirimoTabularV1({ ...pkg, documents: { ...pkg.documents, [role]: c } })]));
const axes = ['glass_family', 'glass_structure', 'low_e_type', 'glass_coating_color', 'glass_surface_type',
  'safety_treatment', 'grille_type', 'grille_material', 'muntin_type', 'vacuum_glass_product', 'spacer_type', 'gas_fill'];
const seeds = Array.from({ length: 1200 }, (_, index) => {
  const node = formal.product_nodes[index % 15], glass = formal.glass_specs[(index * 97) % 566];
  const seed = { room_specification: node.room, window_type: node.window_type, frame_color: 'white', size_w: 700, size_h: 900 };
  if (node.window_type === 'sliding_window') Object.assign(seed, { sash_configuration: node.sash_configuration, size_class: node.size_class });
  for (const axis of axes.slice(0, index % 13)) if (glass[axis] !== 'NOT_APPLICABLE') seed[axis] = glass[axis];
  return seed;
});
for (const seed of seeds) assert.deepEqual(models.after.resolver(seed), models.before.resolver(seed));
const measure = (name) => {
  models[name].master.glassFacetCache.clear(); models[name].master.glassScopeCache.clear();
  const start = performance.now();
  for (const seed of seeds) models[name].resolver(seed);
  return Math.round((performance.now() - start) * 1000) / 1000;
};
const timings = { before: [], after: [] };
for (let r = 0; r < 5; r++) for (const name of r % 2 ? ['after', 'before'] : ['before', 'after']) timings[name].push(measure(name));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const rowCount = (c) => Object.values(c).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0)
  + c.glass_compatibility_profiles.reduce((n, p) => n + p.node_statuses.length, 0)
  + (c.glass_rule_model ? ['base', 'decoration', 'cavity', 'assessment', 'rules', 'identities'].reduce((n, k) => n + c.glass_rule_model[k].length, 0) : 0);
const report = {
  schema_version: 'UCHIRIMO_GLASS_NORMALIZATION_BENCHMARK_V1', status: 'PASS',
  scope: 'PAIRED_LOCAL_RESOLVER_BENCHMARK_NOT_FULL_SELECTOR_LANE_CLOSURE',
  candidate_sha256: createHash('sha256').update(bytes).digest('hex'),
  runtime: process.version, samples_per_round: seeds.length, matched_samples: seeds.length, rounds: 5,
  cache_policy: 'clear before each timed round; alternating order; same process and inputs',
  canonical_physical_records: { before: rowCount(before), after: rowCount(after), projection_descriptors_after: 1 },
  canonical_utf8_bytes: { before: Buffer.byteLength(JSON.stringify(before)), after: Buffer.byteLength(JSON.stringify(after)) },
  resolver_duration_ms: { ...timings, median_before: median(timings.before), median_after: median(timings.after) },
  duration_reduction_percent: Math.round((1 - median(timings.after) / median(timings.before)) * 10000) / 100,
  shard_count_before: 0, shard_count_after: 0, timeouts_before: 0, timeouts_after: 0, retries: 0,
  caveat: 'Zero shards/timeouts refers only to this bounded benchmark. Global heavy shard closure remains unverified. Identity validation still scans 566 aliases.',
};
mkdirSync('artifacts/uchirimo-slim', { recursive: true });
writeFileSync('artifacts/uchirimo-slim/glass-normalization-benchmark.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
