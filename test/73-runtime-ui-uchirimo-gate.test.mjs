import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT = 'SER-YKKAP-UCHIRIMO';
const field = (result, key) => result.fields.find((row) => row.key === key);
const values = (result, key) => field(result, key)?.values.map((row) => row.value) ?? [];
const baseNode = { room_specification: 'residential', window_type: 'fix_window' };

async function complete(seed, preferences = {}) {
  let selection = { ...seed };
  for (let pass = 0; pass < 40; pass += 1) {
    const result = await resolveRuntimeAppProduct(PRODUCT, selection);
    selection = { ...result.selection };
    const missing = result.fields.find((row) => row.required && selection[row.key] === undefined && row.values.length);
    if (!missing) return result;
    selection[missing.key] = preferences[missing.key] ?? missing.values[0].value;
  }
  throw new Error('Uchirimo representative configuration did not converge');
}

test('initial inner-window flow starts with semantic fields and fixed custom-size state', async () => {
  const result = await resolveRuntimeAppProduct(PRODUCT, {});
  assert.deepEqual(result.fields.map((row) => row.key), ['room_specification', 'window_type', 'size_mode']);
  assert.deepEqual(values(result, 'room_specification'), ['residential', 'bathroom']);
  assert.deepEqual(values(result, 'window_type'), ['sliding_window', 'fix_window', 'inward_opening_window', 'opening_window_terrace']);
  assert.deepEqual(values(result, 'size_mode'), ['custom']);
  assert.equal(field(result, 'size_mode').readOnly, true);
});

test('glass_spec_id resolves internally and never appears as a giant dropdown', async () => {
  const result = await complete({ ...baseNode, glass_family: 'insulating_glass', size_w: 500, size_h: 500 }, {
    glass_structure: 'P3P3', low_e_type: 'none', glass_surface_type: 'clear', safety_treatment: 'standard', grille_type: 'none', muntin_type: 'none', spacer_type: 'aluminum', gas_fill: 'air', frame_color: 'white',
  });
  assert.equal(result.fields.some((row) => row.key === 'glass_spec_id'), false);
  assert.match(result.selection.glass_spec_id, /^UCH-GLS-/);
  assert.equal(result.validation.status, 'VALID');
});

test('Low-E block, spacer and cavity are separate Runtime dependencies', async () => {
  let result = await resolveRuntimeAppProduct(PRODUCT, { ...baseNode, glass_family: 'insulating_glass' });
  assert.ok(field(result, 'low_e_type'));
  assert.ok(field(result, 'glass_structure'));
  result = await resolveRuntimeAppProduct(PRODUCT, { ...baseNode, glass_family: 'insulating_glass', glass_structure: 'P3P3' });
  assert.ok(field(result, 'spacer_type'));
  assert.ok(field(result, 'gas_fill'));
  assert.equal(result.selection.gas_fill, undefined, 'spacer/structure must not independently force cavity gas');
  result = await resolveRuntimeAppProduct(PRODUCT, { ...baseNode, glass_family: 'single_glazing' });
  assert.equal(field(result, 'low_e_type'), undefined);
  assert.equal(field(result, 'spacer_type'), undefined);
  assert.equal(field(result, 'gas_fill'), undefined);
});

test('v1.6 anchor order remains glass, Low-E, spacer, cavity, color, frame and custom size', async () => {
  const result = await resolveRuntimeAppProduct(PRODUCT, { ...baseNode, glass_family: 'insulating_glass', glass_structure: 'P3P3', low_e_type: 'insulating' });
  const order = result.fields.map((row) => row.key);
  for (const [a, b] of [['window_type','glass_family'],['glass_family','low_e_type'],['low_e_type','spacer_type'],['spacer_type','gas_fill'],['gas_fill','frame_color'],['frame_color','frame_installation_mode'],['frame_installation_mode','size_mode']]) assert.ok(order.indexOf(a) < order.indexOf(b), `${a} before ${b}`);
});

test('bathroom dependency exposes only formal colors and clears stale residential color', async () => {
  let result = await resolveRuntimeAppProduct(PRODUCT, { room_specification: 'bathroom', window_type: 'sliding_window', sash_configuration: 'two_panel', size_class: 'window' });
  assert.deepEqual(values(result, 'frame_color'), ['white', 'calm_black']);
  result = await resolveRuntimeAppProduct(PRODUCT, { room_specification: 'bathroom', window_type: 'sliding_window', sash_configuration: 'two_panel', size_class: 'window', frame_color: 'greige' });
  assert.equal(result.selection.frame_color, undefined);
  assert.ok(result.clearedFields.some((row) => row.field === 'frame_color'));
});

test('custom size exposes no standard records or synthetic W×H combinations', async () => {
  const result = await resolveRuntimeAppProduct(PRODUCT, baseNode);
  assert.equal(field(result, 'size_mode').readOnly, true);
  assert.deepEqual(values(result, 'size_mode'), ['custom']);
  assert.ok(field(result, 'size_w')); assert.ok(field(result, 'size_h'));
  assert.equal(result.fields.some((row) => row.key === 'size'), false);
  assert.equal(result.runtimeCapabilities.standardSizeRecords, 0);
});

test('CUSTOM dimension states preserve PASS, BLOCK, PENDING and REVIEW_REQUIRED', async () => {
  const node = { room_specification: 'residential', window_type: 'sliding_window', sash_configuration: 'two_panel', size_class: 'window' };
  assert.equal((await resolveRuntimeAppProduct(PRODUCT, { ...node, size_w: 550, size_h: 250 })).dimensionResult.status, 'PASS');
  assert.equal((await resolveRuntimeAppProduct(PRODUCT, { ...node, size_w: 549, size_h: 250 })).dimensionResult.status, 'BLOCK');
  assert.equal((await resolveRuntimeAppProduct(PRODUCT, node)).dimensionResult.status, 'PENDING');
  assert.equal((await resolveRuntimeAppProduct(PRODUCT, { ...node, size_class: 'terrace', size_w: 1200, size_h: 1500 })).dimensionResult.status, 'REVIEW_REQUIRED');
});

test('upstream changes remove invalid downstream values', async () => {
  let result = await resolveRuntimeAppProduct(PRODUCT, { room_specification: 'residential', window_type: 'sliding_window', sash_configuration: 'three_panel', size_class: 'window' });
  assert.ok(values(result, 'window_type').includes('fix_window'), 'downstream selections must not hide an alternative parent choice');
  result = await resolveRuntimeAppProduct(PRODUCT, { room_specification: 'residential', window_type: 'sliding_window', sash_configuration: 'three_panel', size_class: 'window', three_panel_layout: 'meeting_outer_inner_inner', reverse_handing: 'standard', size_w: 1200, size_h: 800 });
  assert.equal(result.selection.reverse_handing, undefined);
  assert.ok(result.clearedFields.some((row) => row.field === 'reverse_handing'));
  assert.ok(field(result, 'three_panel_layout'));
});

test('formal fixed/derived values are read-only', async () => {
  const result = await resolveRuntimeAppProduct(PRODUCT, baseNode);
  assert.equal(field(result, 'size_mode').readOnly, true);
  assert.equal(field(result, 'operating_handle_type').readOnly, true);
  assert.deepEqual(values(result, 'operating_handle_type'), ['detachable_handle']);
});

test('manual and special-check routes remain non-PASS while ORDER_READY stays false', async () => {
  const { master } = await loadRegisteredRuntime('YKK AP', 'ウチリモ 内窓');
  const pick = (gsc) => master.canonical.glass_specs.find((row) => row.glass_size_constraint_group === gsc);
  const semantic = (glass) => Object.fromEntries(['glass_family','glass_structure','low_e_type','glass_coating_color','glass_surface_type','safety_treatment','grille_type','grille_material','muntin_type','vacuum_glass_product','spacer_type','gas_fill'].filter((key) => glass[key] && glass[key] !== 'NOT_APPLICABLE').map((key) => [key, glass[key]]));
  let result = await resolveRuntimeAppProduct(PRODUCT, { ...baseNode, ...semantic(pick('GSC-SG-W3')), size_w: 500, size_h: 500 });
  assert.equal(result.validation.status, 'MANUAL_CHECK');
  assert.ok(result.manualWarnings.some((message) => message.includes('メーカー見積')));
  result = await resolveRuntimeAppProduct(PRODUCT, { ...baseNode, ...semantic(pick('GSC-SG-W3')), size_w: 100, size_h: 500 });
  assert.equal(result.dimensionResult.status, 'BLOCK');
  assert.equal(result.validation.status, 'BLOCKED', 'dimension BLOCK must take precedence over MANUAL_CHECK');
  result = await resolveRuntimeAppProduct(PRODUCT, { room_specification: 'residential', window_type: 'sliding_window', sash_configuration: 'two_panel', size_class: 'window', ...semantic(pick('GSC-IGU-P5P3')), size_w: 800, size_h: 800 });
  assert.equal(result.validation.status, 'MANUAL_CHECK');
  assert.ok(result.manualWarnings.some((message) => message.includes('P5-UCH-117')));
  assert.equal(result.orderReady, false);
  assert.ok(result.notices.some((message) => message.includes('ORDER_READY = false')));
});

test('unknown installation state remains MANUAL_CHECK and fukashi inputs are conditional', async () => {
  const result = await resolveRuntimeAppProduct(PRODUCT, { ...baseNode, extension_frame_type: 'fukashi_60', extension_frame_reinforcement: 'reinforcement_square_pipe', floor_support_condition: 'unknown' });
  assert.ok(field(result, 'extension_frame_reinforcement'));
  assert.ok(field(result, 'construction'));
  assert.equal(result.validation.status, 'MANUAL_CHECK');
  assert.ok(result.manualWarnings.some((message) => message.includes('P5-UCH-204')));
});

test('options stay node-scoped and absent capabilities are not synthesized', async () => {
  let result = await resolveRuntimeAppProduct(PRODUCT, { room_specification: 'residential', window_type: 'inward_opening_window' });
  assert.ok(field(result, 'arm_stopper_option'));
  assert.equal(field(result, 'outside_handle_option'), undefined);
  result = await resolveRuntimeAppProduct(PRODUCT, baseNode);
  assert.deepEqual(result.derivedComponents, []);
  assert.equal(result.runtimeCapabilities.bom, 'NOT_PROVIDED_BY_RUNTIME');
  assert.equal(result.runtimeCapabilities.lifecycle, 'NOT_PROVIDED_BY_RUNTIME');
});

test('invalid values fail closed and identical requests converge deterministically', async () => {
  const bad = await resolveRuntimeAppProduct(PRODUCT, { room_specification: '__invalid__', window_type: 'fix_window' });
  assert.equal(bad.validation.status, 'INVALID');
  assert.equal(bad.selection.room_specification, undefined);
  const input = { ...baseNode, glass_family: 'single_glazing', size_w: 500, size_h: 500 };
  const a = await resolveRuntimeAppProduct(PRODUCT, input); const b = await resolveRuntimeAppProduct(PRODUCT, input);
  assert.deepEqual(b.selection, a.selection); assert.deepEqual(b.fields, a.fields); assert.deepEqual(b.validation, a.validation);
});
