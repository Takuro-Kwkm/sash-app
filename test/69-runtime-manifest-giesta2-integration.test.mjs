import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { DOOR_UI_STANDARD_ORDER } from '../src/catalog/runtime-master/door-runtime-ui-contract.mjs';

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
  assert.deepEqual(runtime.master.fields.map((row) => row.field_name), [
    'thermal_spec', 'configuration', 'design', 'child_door_type', 'child_door', 'glass', 'door_color', 'frame_color',
    'door_closer', 'handle', 'handle_color', 'lock_type', 'lock_system', 'lock_plan',
    'credential_type', 'remote_count', 'credential_package', 'option',
  ]);
  assert.equal(runtime.master.fields.find((row) => row.field_name === 'configuration').display_label, '開き形式');
  assert.equal(runtime.master.fields.find((row) => row.field_name === 'handle').display_label, 'ハンドル種類');
  const labels = Object.fromEntries(runtime.master.values.filter((row) => row.field_name === 'configuration').map((row) => [row.canonical_value, row.display_label]));
  assert.deepEqual(labels, { double_door: '両開き', double_sidelight: '両袖', parent_child: '親子', parent_child_corner: '親子入隅', single: '片開き', single_sidelight: '片袖' });
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

const example = {
  thermal_spec: 'k2', configuration: 'single', design: 'GST2_G11', door_color: 'ED',
  frame_color: 'GST2_FRAME_COLOR_NATURAL_SILVER', door_closer: 'GST2_OPT_CLOSER_STANDARD',
  handle: 'GST2_HANDLE_S', handle_color: 'GST2_HCOL_SMB', lock_type: 'electric',
  lock_system: 'GST2_LOCK_FAMILOCK', lock_plan: 'GST2_PLAN_FAM_BASIC_BATTERY',
  credential_type: 'tag', remote_count: 0,
};
test('formal Runtime fields follow the common door UI order', async () => {
  assert.deepEqual(DOOR_UI_STANDARD_ORDER.slice(0, 5), ['manufacturer', 'product', 'thermal_spec', 'configuration', 'design']);
  const result = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', example);
  assert.equal(result.validation.status, 'VALID');
  const keys = result.fields.map((field) => field.key);
  assert.ok(keys.indexOf('thermal_spec') < keys.indexOf('configuration'));
  assert.ok(keys.indexOf('configuration') < keys.indexOf('design'));
  assert.ok(keys.indexOf('door_color') < keys.indexOf('door_closer'));
  assert.ok(keys.indexOf('door_closer') < keys.indexOf('handle'));
  assert.ok(keys.indexOf('handle') < keys.indexOf('handle_color'));
  assert.ok(keys.indexOf('handle_color') < keys.indexOf('lock_type'));
  assert.equal(result.selection.lock_system, 'GST2_LOCK_FAMILOCK');
  assert.ok(keys.indexOf('lock_type') < keys.indexOf('lock_plan'));
  assert.ok(keys.indexOf('lock_plan') < keys.indexOf('credential_type'));
  assert.ok(keys.indexOf('credential_type') < keys.indexOf('remote_count'));
  assert.equal(keys.at(-1), 'option');
  assert.deepEqual(result.fields.find((field) => field.key === 'handle_color').values.map((row) => row.value), ['GST2_HCOL_BS', 'GST2_HCOL_SMB', 'GST2_HCOL_DBR']);
  assert.equal(result.selection.credential_package, 'GST2_PKG_FAM_TAG_R0');
});

test('card and tag keys each resolve remote counts 0, 1 and 2 to the formal package IDs', async () => {
  for (const type of ['card', 'tag']) for (const count of [0, 1, 2]) {
    const result = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', { ...example, credential_type: type, remote_count: count });
    assert.equal(result.validation.status, 'VALID');
    assert.equal(result.selection.credential_package, `GST2_PKG_FAM_${type.toUpperCase()}_R${count}`);
  }
});

test('changing electric/manual lock type clears only downstream electric-lock fields', async () => {
  const { evaluateRelationalRuntime, applyRelationalSelection } = await import('../src/catalog/runtime-master/relational-runtime-engine.mjs');
  const runtime = await loadRegisteredRuntime('LIXIL', 'ジエスタ2');
  const state = evaluateRelationalRuntime(runtime.master, example);
  const changed = applyRelationalSelection(runtime.master, state, 'lock_type', 'manual');
  assert.equal(changed.fields.lock_system.visibility, 'HIDE');
  assert.equal(changed.fields.lock_plan.visibility, 'HIDE');
  assert.equal(changed.fields.credential_package.visibility, 'HIDE');
  assert.equal(changed.fields.credential_type.value, null);
  assert.equal(changed.fields.remote_count.value, null);
  assert.equal(changed.fields.lock_system.value, 'GST2_LOCK_MANUAL');
  assert.equal(changed.fields.lock_plan.value, 'GST2_PLAN_MANUAL_STANDARD');
  assert.equal(changed.fields.credential_package.value, 'GST2_PKG_MANUAL_STANDARD');
  assert.equal(changed.fields.handle.value, example.handle);
  assert.equal(changed.fields.handle_color.value, example.handle_color);
});

test('child door is Runtime-driven and visible only for parent-child configurations', async () => {
  const single = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', example);
  assert.equal(single.fields.some((field) => field.key === 'child_door_type'), false);
  assert.equal(single.fields.some((field) => field.key === 'child_door'), false);
  const parent = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', { thermal_spec: 'k2', configuration: 'parent_child', design: 'GST2_G11' });
  const type = parent.fields.find((field) => field.key === 'child_door_type');
  assert.deepEqual(type.values.map((row) => row.displayLabel), ['採光部あり', '採光部なし', '採光部なし（ポスト付）', '採光部あり（ポスト付）']);
  assert.ok(parent.validation.missingRequiredFields.includes('child_door_type'));
  const typed = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', { thermal_spec: 'k2', configuration: 'parent_child', design: 'GST2_G11', child_door_type: 'glazed' });
  const child = typed.fields.find((field) => field.key === 'child_door');
  assert.ok(child.values.some((row) => row.value === 'GST2_CHILD_K11'));
  assert.ok(typed.validation.missingRequiredFields.includes('child_door'));
});
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

test('door closer is separated without removing the remaining option field or Runtime mapping', async () => {
  const result = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', example);
  const closer = result.fields.find((field) => field.key === 'door_closer');
  const options = result.fields.find((field) => field.key === 'option');
  assert.equal(closer.required, false);
  assert.deepEqual(closer.values.map((row) => row.value), ['GST2_OPT_CLOSER_STANDARD', 'GST2_OPT_CLOSER_FREESTOP']);
  assert.ok(options.values.length > 0);
  assert.equal(options.values.some((row) => row.value.startsWith('GST2_OPT_CLOSER_')), false);
  const selected = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', { ...example, option: ['GST2_OPT_ELOCK_BUTTON'] });
  assert.ok(selected.selection.option.includes('GST2_OPT_ELOCK_BUTTON'));
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
  assert.equal(changed.fields.configuration.value, example.configuration);
  assert.equal(changed.fields.door_color.value, null);
  assert.equal(changed.fields.option.value, null);
  assert.notEqual(changed.status, 'VALID');
  for (const status of ['UNKNOWN', 'PENDING', 'BLOCKED', 'MANUAL_CHECK']) {
    const master = structuredClone(r.master);
    master.values.find(v => v.field_name === 'design' && v.canonical_value === example.design).status = status;
    assert.notEqual(evaluateRelationalRuntime(master, example).status, 'VALID');
  }
});
