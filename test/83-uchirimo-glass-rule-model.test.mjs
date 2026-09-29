import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getRuntimeMasterEntry } from '../scripts/governance/uchirimo-frozen-migration-entry.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { adaptUchirimoTabularV1 } from '../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import { normalizeUchirimoGlassMatrix, compareUchirimoGlassSemantics } from '../src/catalog/runtime-master/uchirimo-slim-canonical.mjs';
import { normalizeGlassSpecifications, projectGlassCanonical, compileGlassRuleModel } from '../src/catalog/runtime-master/uchirimo-glass-rule-model.mjs';

const pkg = await loadCanonicalWorkbookRuntimePackage(getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓'));
const role = Object.keys(pkg.documents).find((k) => pkg.documents[k]?.glass_node_matrix);
const formal = pkg.documents[role];
const v1 = normalizeUchirimoGlassMatrix(formal);
const v2 = normalizeGlassSpecifications(v1);
const model = v2.glass_rule_model;

test('566 original identities, all facts/metadata/size joins/allowed values and 8490 dispositions survive', () => {
  assert.deepEqual(projectGlassCanonical(v2), v1);
  assert.equal(compareUchirimoGlassSemantics(formal, v2).status, 'PASS');
  assert.deepEqual(normalizeGlassSpecifications(v2), v2);
  assert.deepEqual(normalizeGlassSpecifications(v1), v2);
  assert.deepEqual([model.base.length, model.decoration.length, model.cavity.length, model.assessment.length, model.rules.length], [52, 14, 5, 29, 29]);
  assert.equal(compileGlassRuleModel(v2).logical_count, 566);
  assert.equal(v2.glass_specs, undefined);
  assert.equal(v2.glass_size_mapping, undefined);
  assert.equal(v2.allowed_values.some((r) => r.field_name === 'glass_spec_id'), false);
  const checkedIn = JSON.parse(readFileSync('data/uchirimo-slim/working-candidate.json'));
  assert.deepEqual(checkedIn.canonical, v2);
});

test('holes are preserved; same axes with different evidence/status remain separate rule assessments', () => {
  const holeId = v1.glass_specs.find((r) => r.scope_class === 'grid').glass_spec_id;
  const hole = structuredClone(v1);
  hole.glass_specs = hole.glass_specs.filter((r) => r.glass_spec_id !== holeId);
  hole.glass_size_mapping = hole.glass_size_mapping.filter((r) => r.glass_spec_id !== holeId);
  hole.allowed_values = hole.allowed_values.filter((r) => r.allowed_value !== holeId);
  const special = hole.glass_specs.find((r) => r.scope_class === 'grid');
  special.variant_evidence_status = 'MANUAL_CHECK';
  special.notes = 'Exceptional row retained, not generalized';
  const normalized = normalizeGlassSpecifications(hole);
  assert.deepEqual(projectGlassCanonical(normalized), hole);
  assert.equal(compileGlassRuleModel(normalized).logical_count, 565);
  assert.ok(normalized.glass_rule_model.rules.length > model.rules.length);
});

test('duplicate IDs, duplicate semantic tuples, missing/extra tuples and evidence/profile orphans fail closed', () => {
  const mutations = [
    (m) => m.identities.push(structuredClone(m.identities[0])),
    (m) => m.identities.push({ ...m.identities[0], glass_spec_id: 'fake-new-id' }),
    (m) => m.identities.pop(),
    (m) => m.rules.pop(),
    (m) => m.rules.push({ ...m.rules[0], id: 'extra-rule' }),
    (m) => { m.assessment[0].facts.source_ids = ['missing']; },
    (m) => { m.assessment[0].facts.compatibility_profile_id = 'missing'; },
    (m) => { m.assessment[0].facts.glass_size_constraint_group = 'missing'; },
  ];
  for (const mutate of mutations) {
    const corrupt = structuredClone(v2); mutate(corrupt.glass_rule_model);
    assert.throws(() => compileGlassRuleModel(corrupt), /GLASS_RULE_MODEL_/);
  }
});

test('runtime uses normalized index without invoking full glass-row projection', () => {
  const before = adaptUchirimoTabularV1(pkg);
  const after = adaptUchirimoTabularV1({ ...pkg, documents: { ...pkg.documents, [role]: v2 } });
  after.master.glassSpecsByNodeId.get = () => { throw new Error('FULL_PROJECTION_FORBIDDEN_IN_RESOLVER'); };
  const axes = ['glass_family', 'glass_structure', 'low_e_type', 'glass_coating_color', 'glass_surface_type',
    'safety_treatment', 'grille_type', 'grille_material', 'muntin_type', 'vacuum_glass_product', 'spacer_type', 'gas_fill'];
  // All 566 configurations through a common node, including non-applicable
  // paths, then invalid upstream changes to exercise clear/reselection.
  for (const glass of formal.glass_specs) {
    const seed = { room_specification: 'residential', window_type: 'sliding_window', sash_configuration: 'two_panel', size_class: 'window', frame_color: 'white', size_w: 1000, size_h: 1000 };
    for (const axis of axes) if (glass[axis] !== 'NOT_APPLICABLE') seed[axis] = glass[axis];
    assert.deepEqual(after.resolver(seed), before.resolver(seed), glass.glass_spec_id);
    seed.glass_structure = '__INVALID__';
    assert.deepEqual(after.resolver(seed), before.resolver(seed), `${glass.glass_spec_id}/clear`);
  }
});
