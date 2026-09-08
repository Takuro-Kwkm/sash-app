import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const { master } = await loadRegisteredRuntime('LIXIL', 'TW');
for (const field of master.fields) {
  assert.equal(typeof field.field_name, 'string');
  assert.equal(typeof field.display_order, 'number');
  assert.ok(['enum','array'].includes(field.data_type));
  assert.ok(Array.isArray(field.parent_fields));
}
for (const value of master.values) {
  assert.equal(typeof value.field_name, 'string');
  assert.ok(master.fields.some((field) => field.field_name === value.field_name));
}
const result = await resolveRuntimeAppProduct('SER-LIXIL-TW', {});
assert.equal(typeof result.validation.status, 'string');
assert.ok(Array.isArray(result.fields));
assert.ok(Array.isArray(result.optionCodeResults));
assert.equal(typeof result.optionCodeLinkageCount, 'number');
for (const field of result.fields) {
  assert.equal(typeof field.key, 'string');
  assert.equal(typeof field.displayOrder, 'number');
  assert.ok(Array.isArray(field.values));
}
console.log('Runtime UI contract typecheck: PASS');
