import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { getRuntimeAppIntegration } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

test('TW integrated-v0.3 is registered from the formal manifest and verifies the canonical Runtime SHA', async () => {
  const integration = getRuntimeAppIntegration('SER-LIXIL-TW');
  assert.ok(integration);
  assert.deepEqual(
    { manufacturer: integration.manufacturer, series: integration.series, packageVersion: integration.packageVersion, schemaVersion: integration.schemaVersion, status: integration.status, selectable: integration.selectable },
    { manufacturer: 'LIXIL', series: 'TW', packageVersion: 'integrated-v0.3', schemaVersion: '2.0', status: 'READY', selectable: true },
  );
  assert.equal(integration.canonicalRuntimeReference.runtimeManifestDriveFileId, '1f_RL37UoveSoQYtWZQf3NzIG4jUwzlcb');
  assert.equal(integration.canonicalRuntimeReference.runtimeJsonDriveFileId, '1i_rfZwRcPJCDj3bn-QH1OldX_sbogc2A');

  const runtime = await loadRegisteredRuntime('LIXIL', 'TW');
  assert.equal(runtime.normalizedManifest.formalPass, true);
  assert.equal(runtime.normalizedManifest.storageStatus, 'DRIVE_CANONICAL');
  assert.equal(runtime.normalizedManifest.storageGate, 'PASS');
  assert.equal(runtime.normalizedManifest.registryGate, 'PASS');
  assert.equal(runtime.sourcePackageIntegrity.match, true);
  assert.equal(runtime.sourcePackageIntegrity.files.length, 1);
  assert.deepEqual(runtime.sourcePackageIntegrity.files[0], {
    role: 'runtime_master',
    fileName: 'LIXIL_TW_runtime_integrated-v0.3.json',
    fileId: '1i_rfZwRcPJCDj3bn-QH1OldX_sbogc2A',
    expected: '81fdd437884e5248103e2d56f24ade6b9939bbf69530a6d22399bb6b1b899fd0',
    actual: '81fdd437884e5248103e2d56f24ade6b9939bbf69530a6d22399bb6b1b899fd0',
    match: true,
    bytes: 4025620,
    codec: 'json-transform-v1',
  });
});

test('TW v0.3 adapter preserves formal inventories and exposes all 25 formal CUSTOM rules without synthetic domain records', async () => {
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
  assert.equal(master.capabilities.customSize, 'FORMAL_SOURCE_GRAPH_GATE');
  assert.equal(master.capabilities.customDimensionRuleCount, 25);
  assert.equal(master.capabilities.customDimensionAutomaticRuleCount, 0);
  assert.equal(master.capabilities.customDimensionSafety, 'OUTSIDE_BLOCK_INSIDE_REVIEW_REQUIRED');
  assert.equal(master.customDimensionRules.length, 25);
  assert.equal(new Set(master.customDimensionRules.map((rule) => rule.productNode ?? rule.windowId ?? rule.selector?.window_type)).size, 25);
  assert.ok(master.customDimensionRules.every((rule) => rule.evaluationType === 'SOURCE_GRAPH_GATE'));
  assert.ok(master.customDimensionRules.every((rule) => rule.automatic === false));
});
