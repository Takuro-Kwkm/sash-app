import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { getRuntimeAppIntegration } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

test('TW integrated-v0.5 is registered from the formal manifest and verifies the canonical Runtime SHA', async () => {
  const integration = getRuntimeAppIntegration('SER-LIXIL-TW');
  assert.ok(integration);
  assert.deepEqual(
    { manufacturer: integration.manufacturer, series: integration.series, packageVersion: integration.packageVersion, schemaVersion: integration.schemaVersion, status: integration.status, selectable: integration.selectable },
    { manufacturer: 'LIXIL', series: 'TW', packageVersion: 'integrated-v0.5', schemaVersion: '2.0', status: 'READY', selectable: true },
  );
  assert.equal(integration.canonicalRuntimeReference.runtimeManifestDriveFileId, '1AH-m4HCVuP15kdJqF0kebOtbZp2whqPW');
  assert.equal(integration.canonicalRuntimeReference.runtimeJsonDriveFileId, '1r946VJlEi_qmIFrV-TULmfgJ8XhYV230');

  const runtime = await loadRegisteredRuntime('LIXIL', 'TW');
  assert.equal(runtime.normalizedManifest.formalPass, true);
  assert.equal(runtime.normalizedManifest.storageStatus, 'DRIVE_CANONICAL');
  assert.equal(runtime.normalizedManifest.storageGate, 'PASS');
  assert.equal(runtime.normalizedManifest.registryGate, 'PASS');
  assert.equal(runtime.sourcePackageIntegrity.match, true);
  assert.equal(runtime.sourcePackageIntegrity.files.length, 1);
  assert.deepEqual(runtime.sourcePackageIntegrity.files[0], {
    role: 'runtime_master',
    fileName: 'LIXIL_TW_runtime_integrated-v0.5.json',
    fileId: '1r946VJlEi_qmIFrV-TULmfgJ8XhYV230',
    expected: '17e2a7468f5f9a2c6bfdd275281307c6a9739b994a18faa6fef90dc6fddb4491',
    actual: '17e2a7468f5f9a2c6bfdd275281307c6a9739b994a18faa6fef90dc6fddb4491',
    match: true,
    bytes: 3764442,
    codec: 'brotli',
  });
});

test('TW v0.5 adapter preserves formal inventories and exposes all 26 formal CUSTOM rules without synthetic domain records', async () => {
  const { master } = await loadRegisteredRuntime('LIXIL', 'TW');
  assert.equal(master.provider.windows.filter((row) => row.active !== false).length, 26);
  assert.equal(master.provider.sizes.filter((row) => row.active !== false).length, 1112);
  assert.equal(master.provider.color_relations.filter((row) => row.active !== false).length, 30);
  assert.equal(master.provider.screens.filter((row) => row.active !== false).length, 25);
  assert.equal(master.provider.glass.filter((row) => row.active !== false).length, 12);
  assert.equal(master.provider.options.filter((row) => row.active !== false).length, 110);
  assert.equal(master.optionCodeLinkages.length, 247);
  assert.equal(master.optionCodeLinkages.filter((row) => row.status === 'SUPERSEDED').length, 0);
  assert.equal(master.sourceRows.screenForms.length, 29);
  assert.equal(master.capabilities.customSize, 'FORMAL_SOURCE_GRAPH_GATE');
  assert.equal(master.capabilities.customDimensionRuleCount, 26);
  assert.equal(master.capabilities.customDimensionAutomaticRuleCount, 0);
  assert.equal(master.capabilities.customDimensionSafety, 'OUTSIDE_BLOCK_INSIDE_REVIEW_REQUIRED');
  assert.equal(master.customDimensionRules.length, 26);
  assert.equal(new Set(master.customDimensionRules.map((rule) => rule.productNode ?? rule.windowId ?? rule.selector?.window_type)).size, 26);
  assert.ok(master.customDimensionRules.every((rule) => rule.evaluationType === 'SOURCE_GRAPH_GATE'));
  assert.ok(master.customDimensionRules.every((rule) => rule.automatic === false));
});
