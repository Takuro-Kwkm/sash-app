import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRuntimeAppIntegration,
  resolveRuntimeAppProduct,
  runtimeAppIntegrationInventory,
} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';

test('Giesta2 app integration is visible but fail-closed until a formal Runtime is registered', () => {
  const row = getRuntimeAppIntegration('SER-LIXIL-GIESTA2');
  assert.ok(row);
  assert.equal(row.manufacturer, 'LIXIL');
  assert.equal(row.series, 'ジエスタ2');
  assert.equal(row.registrySeriesKey, 'LIXIL::ジエスタ2');
  assert.equal(row.status, 'BLOCKED_RUNTIME_NOT_REGISTERED');
  assert.equal(row.selectable, false);
  assert.equal(getRuntimeMasterEntry('LIXIL', 'ジエスタ2'), null);
});

test('Giesta2 blocked integration refuses resolution instead of inventing product data', async () => {
  await assert.rejects(
    () => resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', { design_code: 'DUMMY' }),
    (error) => error?.code === 'RUNTIME_MASTER_NOT_REGISTERED',
  );
});

test('registered XE Runtime proves the generic app bridge is reusable without XE-specific resolver logic', async () => {
  const inventory = runtimeAppIntegrationInventory();
  const xe = inventory.find((row) => row.manufacturer === 'LIXIL' && row.series === 'XE');
  assert.ok(xe);
  assert.equal(xe.status, 'READY');
  assert.equal(xe.selectable, true);

  const result = await resolveRuntimeAppProduct(xe.id, {});
  assert.equal(result.source, 'RUNTIME_MASTER');
  assert.equal(result.manufacturer, 'LIXIL');
  assert.equal(result.series, 'XE');
  assert.equal(result.runtimeMaster.sourcePackageIntegrity.match, true);
  assert.ok(Array.isArray(result.fields));
  assert.ok(result.fields.length > 0);
  assert.ok(['INCOMPLETE', 'VALID'].includes(result.validation.status));
  assert.ok(result.fields.every((field) => field.key && field.displayLabel && field.dataType));
});
