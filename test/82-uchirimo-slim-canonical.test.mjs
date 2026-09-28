import test from 'node:test';
import assert from 'node:assert/strict';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { adaptUchirimoTabularV1 } from '../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import { getRuntimeAppIntegration, normalizeRuntimeSelection, toRuntimeUiResult } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { normalizeUchirimoGlassMatrix, projectUchirimoGlassMatrix, compareUchirimoGlassSemantics } from '../src/catalog/runtime-master/uchirimo-slim-canonical.mjs';

const entry = getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓');
const packagePromise = loadCanonicalWorkbookRuntimePackage(entry);

function candidates(pkg) {
  const role = Object.keys(pkg.documents).find((name) => pkg.documents[name]?.glass_node_matrix);
  const legacy = pkg.documents[role];
  const slim = normalizeUchirimoGlassMatrix(legacy);
  return { legacy, slim, slimPackage: { ...pkg, documents: { ...pkg.documents, [role]: slim } } };
}

test('FORMAL v1.0-P7R1-R2 projects all 8,490 dispositions and retains each fact/evidence reference', async () => {
  const { legacy, slim } = candidates(await packagePromise);
  const comparison = compareUchirimoGlassSemantics(legacy, slim);
  assert.deepEqual({ ...comparison, samples: undefined }, {
    legacy_count: 8490, projection_count: 8490, match_count: 8490,
    missing_count: 0, extra_count: 0, status_or_fact_mismatch_count: 0,
    evidence_mismatch_count: 0, evidence_orphan_count: 0, unchanged_fact_mismatch_count: 0,
    status: 'PASS', samples: undefined,
  });
  assert.equal(slim.glass_compatibility_profiles.length, 7);
  assert.equal(slim.glass_specs.length, 566);
  assert.equal(slim.glass_node_matrix, undefined);
  assert.equal(projectUchirimoGlassMatrix(slim).length, 8490);
  assert.equal(JSON.stringify(normalizeUchirimoGlassMatrix(legacy)), JSON.stringify(slim));
});

test('Slim adapter preserves eligible glass IDs and representative runtime decisions for every node/profile', async () => {
  const pkg = await packagePromise;
  const { legacy, slim, slimPackage } = candidates(pkg);
  const before = adaptUchirimoTabularV1(pkg);
  const after = adaptUchirimoTabularV1(slimPackage);
  const representative = new Map();
  for (const glass of slim.glass_specs) if (!representative.has(glass.compatibility_profile_id)) representative.set(glass.compatibility_profile_id, glass);
  for (const node of legacy.product_nodes) {
    assert.deepEqual(after.master.glassSpecsByNodeId.get(node.node_id).map((row) => row.glass_spec_id),
      before.master.glassSpecsByNodeId.get(node.node_id).map((row) => row.glass_spec_id), node.node_id);
    for (const glass of representative.values()) {
      const seed = { room_specification: node.room, window_type: node.window_type,
        frame_color: 'white', size_w: 1000, size_h: 1000 };
      if (node.window_type === 'sliding_window') Object.assign(seed, { sash_configuration: node.sash_configuration, size_class: node.size_class });
      for (const axis of ['glass_family', 'glass_structure', 'low_e_type', 'glass_coating_color',
        'glass_surface_type', 'safety_treatment', 'grille_type', 'grille_material',
        'muntin_type', 'vacuum_glass_product', 'spacer_type', 'gas_fill']) {
        if (glass[axis] && glass[axis] !== 'NOT_APPLICABLE') seed[axis] = glass[axis];
      }
      assert.deepEqual(after.resolver(seed), before.resolver(seed), `${node.node_id}/${glass.compatibility_profile_id}`);
    }
  }
});

test('Slim rejects lost disposition, unmapped glass, and status drift', async () => {
  const pkg = await packagePromise;
  const { legacy, slim, slimPackage } = candidates(pkg);
  const missing = structuredClone(slim);
  missing.glass_compatibility_profiles[0].node_statuses.pop();
  assert.throws(() => projectUchirimoGlassMatrix(missing), /SLIM_PROFILE_NODE_COVERAGE/);
  const orphan = structuredClone(slimPackage);
  const role = Object.keys(orphan.documents).find((name) => orphan.documents[name]?.glass_compatibility_profiles);
  orphan.documents[role].glass_specs[0].compatibility_profile_id = 'missing';
  assert.throws(() => adaptUchirimoTabularV1(orphan), { code: 'RUNTIME_REFERENCE_BROKEN' });
  const drift = structuredClone(slim);
  const target = drift.glass_compatibility_profiles.find((profile) => profile.node_statuses.some((row) => row.status === 'SPECIAL_CHECK_REQUIRED'));
  target.node_statuses.find((row) => row.status === 'SPECIAL_CHECK_REQUIRED').status = 'AVAILABLE';
  assert.equal(compareUchirimoGlassSemantics(legacy, drift).status, 'BLOCKED');
  const factDrift = structuredClone(slim);
  factDrift.dependency_rules[0].priority += 1;
  assert.equal(compareUchirimoGlassSemantics(legacy, factDrift).unchanged_fact_mismatch_count, 1);
});

test('Slim glass prefix cache preserves resolved states, invalid clears, and stays bounded', async () => {
  const pkg = await packagePromise;
  const { legacy, slimPackage } = candidates(pkg);
  const before = adaptUchirimoTabularV1(pkg);
  const after = adaptUchirimoTabularV1(slimPackage);
  const axes = ['glass_family', 'glass_structure', 'low_e_type', 'glass_coating_color',
    'glass_surface_type', 'safety_treatment', 'grille_type', 'grille_material',
    'muntin_type', 'vacuum_glass_product', 'spacer_type', 'gas_fill'];
  const seeds = [];
  for (let index = 0; index < 255; index += 1) {
    const node = legacy.product_nodes[index % legacy.product_nodes.length];
    const glass = legacy.glass_specs[(index * 97) % legacy.glass_specs.length];
    const seed = { room_specification: node.room, window_type: node.window_type,
      frame_color: index % 2 ? 'white' : 'calm_black', size_w: 600, size_h: 700 };
    if (node.window_type === 'sliding_window') Object.assign(seed,
      { sash_configuration: node.sash_configuration, size_class: node.size_class });
    for (const axis of axes) if (glass[axis] && glass[axis] !== 'NOT_APPLICABLE') seed[axis] = glass[axis];
    if (index % 9 === 0) seed.glass_structure = '__INVALID__';
    if (index % 11 === 0) seed.low_e_type = '__INVALID__';
    seeds.push(seed);
  }
  for (const seed of [...seeds, ...seeds]) assert.deepEqual(after.resolver(seed), before.resolver(seed));
  assert.ok(after.master.glassFacetCache.size > 0);
  assert.ok(after.master.glassFacetCache.size <= 8192);
});

test('Slim indexed value rows preserve full UI output for representative glass paths', async () => {
  const pkg = await packagePromise;
  const { legacy, slimPackage } = candidates(pkg);
  const old = adaptUchirimoTabularV1(pkg);
  const slim = adaptUchirimoTabularV1(slimPackage);
  const integration = getRuntimeAppIntegration('SER-YKKAP-UCHIRIMO');
  assert.ok(slim.master.valueRowsByField instanceof Map);
  for (const field of slim.master.fields) {
    assert.deepEqual(slim.master.valueRowsByField.get(field.field_name) ?? [],
      old.master.values.filter((row) => row.field_name === field.field_name &&
        row.status === 'CURRENT' && row.runtime_selectable !== false));
  }
  for (let index = 0; index < 105; index += 1) {
    const node = legacy.product_nodes[index % legacy.product_nodes.length];
    const glass = legacy.glass_specs[(index * 17) % legacy.glass_specs.length];
    const seed = { room_specification: node.room, window_type: node.window_type,
      glass_family: glass.glass_family, glass_structure: glass.glass_structure,
      frame_color: index % 2 ? 'white' : 'calm_black', size_w: 600, size_h: 700 };
    if (node.window_type === 'sliding_window') Object.assign(seed,
      { sash_configuration: node.sash_configuration, size_class: node.size_class });
    const resolve = (adapted) => {
      const normalized = normalizeRuntimeSelection(adapted.master, seed);
      return toRuntimeUiResult(adapted.master, adapted.resolver(normalized), integration, pkg.integrity);
    };
    assert.deepEqual(resolve(slim), resolve(old));
  }
});
