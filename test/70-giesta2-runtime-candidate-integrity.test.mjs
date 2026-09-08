import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT_ID = 'SER-LIXIL-GIESTA2';

function field(result, key) {
  const found = result.fields.find((row) => row.key === key);
  assert.ok(found, `${key} field must be present`);
  return found;
}

function values(result, key) {
  return field(result, key).values.map((row) => row.value);
}

test('Giesta2 single-door design candidates are not reduced to representative preview values', async () => {
  const result = await resolveRuntimeAppProduct(PRODUCT_ID, {
    thermal_spec: 'k2',
    configuration: 'single',
  });
  const designValues = values(result, 'design');

  assert.equal(designValues.length, 81, 'formal Runtime must expose all 81 single-door design candidates');
  assert.equal(new Set(designValues).size, designValues.length, 'design candidates must not contain duplicates');
  assert.ok(designValues.includes('GST2_G11'));
  assert.ok(designValues.includes('GST2_C11'));
  assert.ok(designValues.length > 2, 'G11/C11-only representative preview must never satisfy Runtime acceptance');
});

test('Giesta2 G11 handle candidates are not reduced to S-handle only', async () => {
  const result = await resolveRuntimeAppProduct(PRODUCT_ID, {
    thermal_spec: 'k2',
    configuration: 'single',
    design: 'GST2_G11',
    door_color: 'ED',
  });
  const handleValues = values(result, 'handle');

  assert.equal(handleValues.length, 5, 'formal Runtime must expose the five G11 handle families');
  assert.equal(new Set(handleValues).size, handleValues.length, 'handle candidates must not contain duplicates');
  assert.ok(handleValues.includes('GST2_HANDLE_S'));
  assert.ok(handleValues.length > 1, 'S-handle-only representative preview must never satisfy Runtime acceptance');
});
