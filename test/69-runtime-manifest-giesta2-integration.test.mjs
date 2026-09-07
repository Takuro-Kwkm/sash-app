import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

test('Giesta2 manifest loader reconstructs canonical Runtime files and verifies every manifest SHA', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL', 'ジエスタ2');
  assert.ok(runtime);
  assert.equal(runtime.normalizedManifest.manufacturer, 'LIXIL');
  assert.equal(runtime.normalizedManifest.series, 'ジエスタ2');
  assert.equal(runtime.normalizedManifest.packageVersion, 'v0.8-R1');
  assert.equal(runtime.normalizedManifest.runtimeStatus, 'READY');
  assert.equal(runtime.sourcePackageIntegrity.match, true);
  assert.equal(runtime.sourcePackageIntegrity.manifestDriveFileId, '1AEMf7ay34L5iIxFBT9fLh655yta2nWbC');

  const files = runtime.sourcePackageIntegrity.files;
  assert.equal(files.length, 3);
  assert.ok(files.every((row) => row.match === true && row.expected === row.actual));
  assert.equal(files.find((row) => row.role === 'RUNTIME_MAPS')?.bytes, 7002381);
  assert.equal(files.find((row) => row.role === 'RUNTIME_MAPS')?.codec, 'brotli');
  assert.equal(files.find((row) => row.role === 'RUNTIME_CORE')?.codec, 'gzip');
  assert.equal(files.find((row) => row.role === 'RUNTIME_SCHEMA')?.codec, 'gzip');
});

test('Giesta2 normalized Runtime contains generic fields, values and relations', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL', 'ジエスタ2');
  assert.ok(runtime.master.fields.length > 0);
  assert.ok(runtime.master.values.length > 0);
  assert.ok(Array.isArray(runtime.master.relations));
  assert.ok(Array.isArray(runtime.master.optionDependencies));
  assert.ok(runtime.master.fields.every((row) => row.field_name));
});

test('Giesta2 Runtime resolution is deterministic for the same selection', async () => {
  const first = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', {});
  const second = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', {});
  assert.deepEqual(second.selection, first.selection);
  assert.deepEqual(second.validation, first.validation);
  assert.deepEqual(second.fields, first.fields);
});

test('Giesta2 invalid explicit selection fails closed instead of inventing a value', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL', 'ジエスタ2');
  const target = runtime.master.fields.find((row) => ['enum', 'string'].includes(row.data_type) && row.runtime_included !== false);
  assert.ok(target);
  const result = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', { [target.field_name]: '__INVALID_RUNTIME_VALUE__' });
  assert.equal(result.validation.status, 'INVALID');
  assert.ok(result.validation.errors.some((row) => row.errorCode === 'SELECTION_NOT_ALLOWED' && row.field === target.field_name));
});

const example = { design: 'GST2_G11', configuration: 'single', thermal_spec: 'k2', door_color: 'ED', frame_color: 'GST2_FRAME_COLOR_NATURAL_SILVER', handle: 'GST2_HANDLE_S', lock_system: 'GST2_LOCK_FAMILOCK' };
test('formal glass branches resolve main glass and offer only sidelight glass in both sidelight configurations', async () => {
  const main = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', example);
  assert.equal(main.selection.glass, 'GST2_GLASS_STD_K2');
  assert.equal(main.validation.status, 'VALID');
  for (const configuration of ['single_sidelight', 'double_sidelight']) {
    const side = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', { ...example, configuration });
    const glass = side.fields.find(f => f.key === 'glass');
    assert.ok(glass.values.length > 1);
    assert.ok(glass.values.every(v => v.value.startsWith('GST2_GLASS_SIDE_')));
    assert.equal(side.selection.glass, undefined);
    assert.ok(side.validation.missingRequiredFields.includes('glass'));
  }
});
test('formal option relations require controller, fix plan, enable credential and clear after source removal', async () => {
  const result = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', { ...example, option: ['GST2_OPT_ELOCK_BUTTON', 'GST2_OPT_SECRET_SWITCH'] });
  assert.equal(result.validation.status, 'VALID');
  assert.ok(result.derivedOptions.includes('GST2_OPT_CONTROLLER'));
  assert.ok(result.derivedEntities.some(row => row.relationship === 'FIXES' && row.targetEntity === 'GST2_PLAN_FAM_OPTION_AC'));
  assert.ok(result.derivedEntities.some(row => row.relationship === 'ENABLES' && row.targetEntity === 'GST2_CRED_PIN'));
  const cleared = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', example);
  assert.deepEqual(cleared.derivedOptions, []);
  assert.deepEqual(cleared.derivedEntities, []);
  const invalid = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', { ...example, lock_system: 'GST2_LOCK_MANUAL', option: ['GST2_OPT_ELOCK_BUTTON'] });
  assert.equal(invalid.validation.status, 'INVALID');
});
test('sales selection exposes no synthetic size or BOM and preserves escalation', async () => {
  const r = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', example);
  assert.equal(r.runtimeCapabilities.target, 'SALES_PRODUCT_SELECTION');
  assert.equal(r.runtimeCapabilities.size, 'NOT_PROVIDED_BY_RUNTIME');
  assert.equal(r.runtimeCapabilities.bom, 'NOT_PROVIDED_BY_RUNTIME');
  assert.deepEqual(r.derivedComponents, []);
  assert.ok(!r.fields.some(f => /size|width|height|dimension|bom/i.test(f.key)));
  assert.ok(r.notices.some(n => n.includes('正式発注コード・特殊寸法・例外条件')));
});
test('generic relational engine clears descendants and never promotes unresolved status to valid', async () => {
  const { evaluateRelationalRuntime, applyRelationalSelection } = await import('../src/catalog/runtime-master/relational-runtime-engine.mjs');
  const r = await loadRegisteredRuntime('LIXIL', 'ジエスタ2');
  const state = evaluateRelationalRuntime(r.master, { ...example, option: ['GST2_OPT_ELOCK_BUTTON'] });
  const changed = applyRelationalSelection(r.master, state, 'design', 'GST2_C11');
  assert.equal(changed.fields.configuration.value, null);
  assert.equal(changed.fields.option.value, null);
  assert.notEqual(changed.status, 'VALID');
  for (const status of ['UNKNOWN', 'PENDING', 'BLOCKED', 'MANUAL_CHECK']) {
    const master = structuredClone(r.master);
    master.values.find(v => v.field_name === 'design' && v.canonical_value === example.design).status = status;
    assert.notEqual(evaluateRelationalRuntime(master, example).status, 'VALID');
  }
});
