import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getRuntimeMasterEntry, loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { adaptUchirimoTabularV1 } from '../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import { getRuntimeAppIntegration, resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT = 'SER-YKKAP-UCHIRIMO';
const MANIFEST_SHA = 'be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d';

test('Uchirimo is declaratively registered from the formal v1.0-P7R1-R2 manifest', () => {
  const integration = getRuntimeAppIntegration(PRODUCT);
  assert.deepEqual({ manufacturer: integration.manufacturer, series: integration.series, packageVersion: integration.packageVersion, schemaVersion: integration.schemaVersion, uiCategory: integration.uiCategory, adapterType: integration.adapterType }, {
    manufacturer: 'YKK AP', series: 'ウチリモ 内窓', packageVersion: 'v1.0-P7R1-R2', schemaVersion: '2.0', uiCategory: 'INNER_WINDOW', adapterType: 'UCHIRIMO_TABULAR_V1',
  });
  assert.equal(integration.canonicalRuntimeReference.runtimeManifestDriveFileId, '1119yamXn21wLZd3C8LvamNWsTAx_1dt2');
  assert.equal(integration.canonicalRuntimeReference.canonicalFolderId, '1-flyN0KX2zdqXbebX2kVF4VRW0jTSrQu');
  assert.equal(integration.sourceHash, MANIFEST_SHA);
});

test('manifest is the only package entry and all four declared component bytes pass SHA-256', async () => {
  const runtime = await loadRegisteredRuntime('YKK AP', 'ウチリモ 内窓');
  assert.equal(runtime.normalizedManifest.formalPass, true);
  assert.equal(runtime.normalizedManifest.storageStatus, 'PASS_CANONICAL');
  assert.equal(runtime.normalizedManifest.packageGate, 'PASS');
  assert.equal(runtime.sourcePackageIntegrity.actual, MANIFEST_SHA);
  assert.equal(runtime.sourcePackageIntegrity.match, true);
  assert.equal(runtime.sourcePackageIntegrity.files.length, 4);
  assert.deepEqual(runtime.sourcePackageIntegrity.files.map((row) => row.fileId), [
    '1iX6-TuR7B7tUKqtGnd76IzVJzq9OH2zK', '1c6hmvMgSLhESgmMJTRW7DN_opa1HhYlZ', '1TJn2-e6Sa6LcIv6FxNt0ahGSWlcgclJZ', '1fNUukTQaDJT2iWbNk6F8gcLLt22Sg32z',
  ]);
  assert.ok(runtime.sourcePackageIntegrity.files.every((row) => row.match && row.codec === 'brotli'));
});

test('schema adapter preserves formal inventories and does not invent standard sizes, BOM or lifecycle', async () => {
  const { master } = await loadRegisteredRuntime('YKK AP', 'ウチリモ 内窓');
  assert.equal(master.canonical.product_nodes.length, 15);
  assert.equal(master.canonical.glass_specs.length, 566);
  assert.equal(master.canonical.glass_node_matrix.length, 8490);
  assert.equal(master.canonical.dependency_rules.length, 29);
  assert.equal(master.canonical.option_master.length, 9);
  assert.equal(master.capabilities.standardSizeRecords, 0);
  assert.equal(master.capabilities.sizeMode, 'custom');
  assert.equal(master.capabilities.bom, 'NOT_PROVIDED_BY_RUNTIME');
  assert.equal(master.capabilities.lifecycle, 'NOT_PROVIDED_BY_RUNTIME');
});

test('unregistered Runtime and invalid package identity fail closed', async () => {
  await assert.rejects(() => resolveRuntimeAppProduct('__UNKNOWN_RUNTIME__', {}), { code: 'RUNTIME_APP_PRODUCT_NOT_FOUND' });
  const entry = getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓');
  await assert.rejects(() => loadCanonicalWorkbookRuntimePackage({ ...entry, schemaVersion: '999' }), { code: 'RUNTIME_MANIFEST_IDENTITY_MISMATCH' });
  await assert.rejects(() => loadCanonicalWorkbookRuntimePackage({ ...entry, runtimeManifestSha256: '0'.repeat(64) }), { code: 'RUNTIME_MANIFEST_SHA_MISMATCH' });
  await assert.rejects(() => loadCanonicalWorkbookRuntimePackage({ ...entry, materializedFiles: {} }), { code: 'RUNTIME_MANIFEST_FILE_MISSING' });
});

test('adapter rejects duplicate IDs, broken references and unsupported dependency actions', async () => {
  const pkg = await loadCanonicalWorkbookRuntimePackage(getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓'));
  const role = Object.entries(pkg.documents).find(([, value]) => value?.field_registry)?.[0];
  const duplicate = structuredClone(pkg);
  duplicate.documents[role].product_nodes.push(structuredClone(duplicate.documents[role].product_nodes[0]));
  assert.throws(() => adaptUchirimoTabularV1(duplicate), { code: 'RUNTIME_DUPLICATE_ID' });
  const broken = structuredClone(pkg);
  broken.documents[role].dependency_rules[0].conditions[0].field = '__missing__';
  assert.throws(() => adaptUchirimoTabularV1(broken), { code: 'RUNTIME_REFERENCE_BROKEN' });
  const unsupported = structuredClone(pkg);
  unsupported.documents[role].dependency_rules[0].effect.action = '__unsupported__';
  assert.throws(() => adaptUchirimoTabularV1(unsupported), { code: 'RUNTIME_RULE_ACTION_UNSUPPORTED' });
});

test('common registry and bridge contain metadata/mapping only, not Uchirimo business branches', async () => {
  for (const path of ['../src/catalog/runtime-master/app-runtime-integration-registry.mjs', '../src/catalog/runtime-master/runtime-app-bridge.mjs', '../src/catalog/runtime-master/inner-window-runtime-ui-contract.mjs']) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.equal(/if\s*\([^)]*(?:ウチリモ|UCHIRIMO|bathroom|spacer_type|gas_fill)/.test(source), false, path);
  }
});
