import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT = 'SER-LIXIL-TW';

async function complete(windowType, overrides = {}) {
  const selection = { window_type: windowType, ...overrides };
  for (let pass = 0; pass < 40; pass += 1) {
    const result = await resolveRuntimeAppProduct(PRODUCT, selection);
    const missing = result.fields.find((field) => field.required && selection[field.key] === undefined && field.values.length);
    if (!missing) return { result, selection: result.selection };
    selection[missing.key] = missing.key === 'screen_presence' && missing.values.some((row) => row.value === 'NONE')
      ? 'NONE' : missing.values[0].value;
  }
  throw new Error('representative TW selection did not converge');
}

test('TW starts with manufacturer/product/window context and follows the UI Standard v1.5 order', async () => {
  const initial = await resolveRuntimeAppProduct(PRODUCT, {});
  assert.deepEqual(initial.fields.map((field) => field.key), ['window_type']);
  assert.equal(initial.fields[0].values.length, 25);

  const { result } = await complete('SWT-LIX-TW-UNIT-HIKI', { glass_base: 'Low-E複層ガラス' });
  const keys = result.fields.map((field) => field.key);
  const expectedOrder = ['window_type','size_mode','panel_count','size','exterior_color','interior_color','screen_presence','glass_base','glass_type','glass_detail','glass_function','glass_spacer','glass_air_layer','option'];
  assert.deepEqual(keys, expectedOrder);
  for (const internal of ['construction','configuration','common_window_id','actual_w','actual_h']) assert.ok(!keys.includes(internal));
  const optionValues = result.fields.find((field) => field.key === 'option').values.map((row) => row.value);
  assert.ok(!optionValues.some((value) => value.startsWith('SCR-')));
  assert.deepEqual(result.fields.find((field) => field.key === 'size_mode').values.map((row) => row.value), ['STANDARD']);
  assert.ok(!result.fields.some((field) => ['custom_width','custom_height'].includes(field.key)));
  assert.equal(result.fields.find((field) => field.key === 'exterior_color').values.length, 6);
  assert.equal(result.fields.find((field) => field.key === 'interior_color').values.length, 5);
});

test('formal window-specific fields, handing and size-only specification rules are enforced', async () => {
  let result = await resolveRuntimeAppProduct(PRODUCT, { window_type: 'SWT-LIX-TW-SHUT-HIKI-FLAT' });
  assert.deepEqual(result.fields.find((field) => field.key === 'shutter_type').values.map((row) => row.value), [
    'SP-TW-SHUT-MAN-STD', 'SP-TW-SHUT-ELE-STD',
  ]);
  assert.ok(!result.fields.some((field) => field.key === 'handing'));

  result = await resolveRuntimeAppProduct(PRODUCT, { window_type: 'SWT-LIX-TW-TATE-GREMON-T' });
  assert.deepEqual(result.fields.find((field) => field.key === 'handing').values.map((row) => row.value), ['L','R']);

  result = await resolveRuntimeAppProduct(PRODUCT, {
    window_type: 'SWT-LIX-TW-SHUT-HIKI', shutter_type: 'SP-TW-SHUT-MAN-STD',
    size_mode: 'STANDARD', panel_count: '2枚建', size: 'SZ-LIX-TW-SHUT-HIKI-Z-15024',
  });
  assert.equal(result.selection.shutter_type, undefined);
  assert.deepEqual(result.fields.find((field) => field.key === 'shutter_type').values.map((row) => row.value), ['SP-TW-SHUT-ELE-STD']);
  assert.ok(result.clearedFields.some((row) => row.field === 'shutter_type'));
});

test('screen fields use formal 09A forms, remain ahead of glass and disappear for FIX', async () => {
  let { result, selection } = await complete('SWT-LIX-TW-TATE-OP-T');
  result = await resolveRuntimeAppProduct(PRODUCT, { ...selection, screen_presence: 'YES' });
  const type = result.fields.find((field) => field.key === 'screen_type');
  assert.deepEqual(type.values.map((row) => row.value), ['SCR-013','SCR-014','SCR-015']);
  assert.ok(result.fields.findIndex((field) => field.key === 'screen_type') < result.fields.findIndex((field) => field.key === 'glass_base'));

  ({ result } = await complete('SWT-LIX-TW-FIX-IN-MADO'));
  assert.ok(!result.fields.some((field) => field.key.startsWith('screen_')));

  ({ result } = await complete('SWT-LIX-TW-SAIHU-KATTEGUCHI'));
  const presence = result.fields.find((field) => field.key === 'screen_presence');
  assert.deepEqual(presence.values.map((row) => row.value), ['YES']);
  assert.equal(result.selection.screen_type, 'SCR-033');
});

test('option dependencies clear stale values and glass restrictions hide unsupported ventilation options', async () => {
  let completeResult = await complete('SWT-LIX-TW-UNIT-HIKI', { glass_base: 'Low-E複層ガラス' });
  let result = await resolveRuntimeAppProduct(PRODUCT, { ...completeResult.selection, option: ['OP-LIX-TW-CAT-28401'] });
  assert.deepEqual(result.derivedOptions, ['OP-LIX-TW-CHILD-OPEN-CRES-S']);
  assert.ok(!result.fields.find((field) => field.key === 'option').values.some((row) => row.value === 'OP-LIX-TW-CHILD-OPEN-CRES-S'));
  result = await resolveRuntimeAppProduct(PRODUCT, { ...completeResult.selection, option: ['OP-LIX-TW-CAT-28401','OP-LIX-TW-CAT-28417'] });
  assert.equal(result.selection.option, undefined);
  assert.ok(result.clearedFields.some((row) => row.field === 'option'));

  completeResult = await complete('SWT-LIX-TW-UNIT-HIKI', { glass_base: 'トリプルガラス' });
  const options = completeResult.result.fields.find((field) => field.key === 'option').values.map((row) => row.value);
  assert.ok(!options.includes('OP-LIX-TW-CAT-28302'));
  assert.ok(!options.includes('OP-LIX-TW-CAT-28303'));
});

test('formal option-code linkages resolve fixed dimensions and preserve special/source-limit states', async () => {
  const completeResult = await complete('SWT-LIX-TW-UNIT-HIKI', { glass_base: 'Low-E複層ガラス' });
  const result = await resolveRuntimeAppProduct(PRODUCT, {
    ...completeResult.selection,
    option: ['OP-LIX-TW-CAT-28303','OP-LIX-TW-CAT-28322','OP-LIX-TW-CAT-28509'],
  });
  assert.equal(result.optionCodeLinkageCount, 196);
  const byId = new Map(result.optionCodeResults.map((row) => [row.optionId, row]));
  assert.equal(byId.get('OP-LIX-TW-CAT-28303').status, 'SPECIAL_ORDER_NO_STANDARD_SKU');
  assert.equal(byId.get('OP-LIX-TW-CAT-28303').productCode, null);
  assert.equal(byId.get('OP-LIX-TW-CAT-28322').status, 'SOURCE_LIMITATION');
  assert.equal(byId.get('OP-LIX-TW-CAT-28322').productCode, null);
  assert.equal(byId.get('OP-LIX-TW-CAT-28509').status, 'RESOLVED');
  assert.equal(byId.get('OP-LIX-TW-CAT-28509').productCode, 'Z-01-BXKF');
});

test('APR-TW-04 scope includes shutter-flat 28509 while 28323 remains limited to its formal scopes', async () => {
  let completeResult = await complete('SWT-LIX-TW-SHUT-HIKI-FLAT', { glass_base: 'Low-E複層ガラス' });
  let options = completeResult.result.fields.find((field) => field.key === 'option').values.map((row) => row.value);
  assert.ok(options.includes('OP-LIX-TW-CAT-28509'));
  assert.ok(!options.includes('OP-LIX-TW-CAT-28323'));

  completeResult = await complete('SWT-LIX-TW-FIX-IN-MADO', { glass_base: 'Low-E複層ガラス' });
  options = completeResult.result.fields.find((field) => field.key === 'option').values.map((row) => row.value);
  assert.ok(options.includes('OP-LIX-TW-CAT-28323'));
  const result = await resolveRuntimeAppProduct(PRODUCT, { ...completeResult.selection, option: ['OP-LIX-TW-CAT-28323'] });
  assert.equal(result.optionCodeResults[0].status, 'SOURCE_LIMITATION');
});

test('changing the window type revalidates and removes every stale downstream selection', async () => {
  const completeResult = await complete('SWT-LIX-TW-UNIT-HIKI', { glass_base: 'Low-E複層ガラス' });
  const result = await resolveRuntimeAppProduct(PRODUCT, {
    ...completeResult.selection,
    option: ['OP-LIX-TW-CAT-28322'],
    window_type: 'SWT-LIX-TW-FIX-IN-MADO',
  });
  assert.equal(result.selection.option, undefined);
  assert.equal(result.selection.screen_presence, undefined);
  assert.equal(result.selection.size, undefined);
  assert.ok(result.clearedFields.some((row) => row.field === 'size'));
  assert.ok(!result.fields.some((field) => field.key.startsWith('screen_')));
});
