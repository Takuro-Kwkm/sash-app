import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRuntimeAppIntegration,
  resolveRuntimeAppProduct,
  runtimeAppIntegrationInventory,
} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';

test('Giesta2 app integration becomes selectable only through its registered formal Runtime package', () => {
  const row = getRuntimeAppIntegration('SER-LIXIL-GIESTA2');
  assert.ok(row);
  assert.equal(row.manufacturer, 'LIXIL');
  assert.equal(row.series, 'ジエスタ2');
  assert.equal(row.registrySeriesKey, 'LIXIL::ジエスタ2');
  assert.equal(row.status, 'READY');
  assert.equal(row.selectable, true);
  assert.equal(row.packageVersion, 'v0.8-R1');
  assert.equal(row.schemaVersion, '1.0');
  assert.equal(row.adapterType, 'PHASE_MASTER_MAPS_V1');
  assert.equal(row.canonicalRuntimeReference.runtimeManifestDriveFileId, '1AEMf7ay34L5iIxFBT9fLh655yta2nWbC');

  const entry = getRuntimeMasterEntry('LIXIL', 'ジエスタ2');
  assert.ok(entry);
  assert.equal(entry.packageType, 'RUNTIME_MANIFEST_V1');
});

test('Giesta2 resolves through the generic Runtime app bridge without product-specific UI business rules', async () => {
  const result = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', {});
  assert.equal(result.source, 'RUNTIME_MASTER');
  assert.equal(result.manufacturer, 'LIXIL');
  assert.equal(result.series, 'ジエスタ2');
  assert.equal(result.runtimeMaster.packageVersion, 'v0.8-R1');
  assert.equal(result.runtimeMaster.sourcePackageIntegrity.match, true);
  assert.ok(Array.isArray(result.fields));
  assert.ok(result.fields.length > 0);
  assert.ok(['INCOMPLETE', 'VALID'].includes(result.validation.status));
  assert.ok(result.fields.every((field) => field.key && field.displayLabel && field.dataType));
});

test('registered XE Runtime remains available through the same generic bridge', async () => {
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
});
