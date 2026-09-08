import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { getRuntimeAppIntegration } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

test('TW integrated-v0.2 is registered from the formal manifest and verifies its canonical SHA', async () => {
  const integration = getRuntimeAppIntegration('SER-LIXIL-TW');
  assert.ok(integration);
  assert.deepEqual(
    { manufacturer: integration.manufacturer, series: integration.series, packageVersion: integration.packageVersion, schemaVersion: integration.schemaVersion, status: integration.status, selectable: integration.selectable },
    { manufacturer: 'LIXIL', series: 'TW', packageVersion: 'integrated-v0.2', schemaVersion: '2.0', status: 'READY', selectable: true },
  );
  assert.equal(integration.canonicalRuntimeReference.runtimeManifestDriveFileId, '1f9ogJ2pS0HmrUuXG1Qy431lG0mgxN9pw');
  assert.equal(integration.canonicalRuntimeReference.runtimeJsonDriveFileId, '1yt4ADBqoK4-5Xqt6bJ593Q4thi81IRzI');

  const runtime = await loadRegisteredRuntime('LIXIL', 'TW');
  assert.equal(runtime.normalizedManifest.formalPass, true);
  assert.equal(runtime.normalizedManifest.storageStatus, 'DRIVE_CANONICAL');
  assert.equal(runtime.normalizedManifest.storageGate, 'PASS');
  assert.equal(runtime.normalizedManifest.registryGate, 'PASS');
  assert.equal(runtime.sourcePackageIntegrity.match, true);
  assert.equal(runtime.sourcePackageIntegrity.files.length, 1);
  assert.deepEqual(runtime.sourcePackageIntegrity.files[0], {
    role: 'runtime_master',
    fileName: 'LIXIL_TW_runtime_integrated-v0.2.json',
    fileId: '1yt4ADBqoK4-5Xqt6bJ593Q4thi81IRzI',
    expected: '358d8ee5f6e13a294a20b3bb69dd07fac6f21ec20da0c43c7e00d6fb8fa0237f',
    actual: '358d8ee5f6e13a294a20b3bb69dd07fac6f21ec20da0c43c7e00d6fb8fa0237f',
    match: true,
    bytes: 3946522,
    codec: 'brotli',
  });
});

test('TW adapter preserves the formal Runtime inventories without synthetic domain records', async () => {
  const { master } = await loadRegisteredRuntime('LIXIL', 'TW');
  assert.equal(master.provider.windows.filter((row) => row.active !== false).length, 25);
  assert.equal(master.provider.sizes.filter((row) => row.active !== false).length, 1112);
  assert.equal(master.provider.color_relations.filter((row) => row.active !== false).length, 30);
  assert.equal(master.provider.screens.filter((row) => row.active !== false).length, 25);
  assert.equal(master.provider.glass.filter((row) => row.active !== false).length, 12);
  assert.equal(master.provider.options.filter((row) => row.active !== false).length, 107);
  assert.equal(master.optionCodeLinkages.length, 196);
  assert.equal(master.optionCodeLinkages.filter((row) => row.status === 'SUPERSEDED').length, 0);
  assert.equal(master.sourceRows.screenForms.length, 29);
  assert.equal(master.capabilities.customSize, 'NOT_PROVIDED_BY_RUNTIME');
});
