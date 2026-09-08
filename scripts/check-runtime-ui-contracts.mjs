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
const tw = await resolveRuntimeAppProduct('SER-LIXIL-TW', {});
assert.equal(typeof tw.validation.status, 'string');
assert.ok(Array.isArray(tw.fields));
assert.ok(Array.isArray(tw.optionCodeResults));
assert.equal(typeof tw.optionCodeLinkageCount, 'number');
for (const field of tw.fields) {
  assert.equal(typeof field.key, 'string');
  assert.equal(typeof field.displayOrder, 'number');
  assert.ok(Array.isArray(field.values));
}

const inplus = await resolveRuntimeAppProduct('SER-LIXIL-INPLUS', {});
assert.equal(inplus.uiTemplate, 'INPLUS_V04R1');
assert.equal(inplus.uiContractSource.authoringMasterDriveFileId, '1NbvIhvxINl45MStUR17LqPOP2123fUAQ');
assert.equal(inplus.uiGroupingAudit.status, 'PASS');
assert.equal(inplus.uiStandardRuntimeGap.status, 'NONE');
assert.ok(Array.isArray(inplus.fields));
assert.ok(inplus.fields.every((field) => typeof field.key === 'string' && typeof field.displayOrder === 'number' && Array.isArray(field.values)));
console.log('Runtime UI contract typecheck: PASS');
