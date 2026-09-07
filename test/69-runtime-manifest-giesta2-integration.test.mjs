import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

test('Giesta2 manifest loader reconstructs canonical Runtime files and verifies every manifest SHA', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL', 'ジエスタ2');
  assert.ok(runtime);
  assert.equal(runtime.normalizedManifest.manufacturer, 'LIXIL');
  assert.equal(runtime.normalizedManifest.series, 'ジエスタ2');
  assert.equal(runtime.normalizedManifest.packageVersion, 'v0.8-R1');
  assert.equal(runtime.normalizedManifest.runtimeStatus, 'READY');
  assert.equal(runtime.sourcePackageIntegrity.match, true);
  assert.equal(runtime.sourcePackageIntegrity.manifestDriveFileId, '1AEMf7ay34L5iIxFBT9fLh655yta2nWbC');

  const files = runtime.sourcePackageIntegrity.files;
  assert.equal(files.length, 3);
  assert.ok(files.every((row) => row.match === true && row.expected === row.actual));
  assert.equal(files.find((row) => row.role === 'RUNTIME_MAPS')?.bytes, 7002381);
  assert.equal(files.find((row) => row.role === 'RUNTIME_MAPS')?.codec, 'brotli');
  assert.equal(files.find((row) => row.role === 'RUNTIME_CORE')?.codec, 'gzip');
  assert.equal(files.find((row) => row.role === 'RUNTIME_SCHEMA')?.codec, 'gzip');
});

test('Giesta2 normalized Runtime contains generic fields, values and relations', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL', 'ジエスタ2');
  assert.ok(runtime.master.fields.length > 0);
  assert.ok(runtime.master.values.length > 0);
  assert.ok(Array.isArray(runtime.master.relations));
  assert.ok(Array.isArray(runtime.master.optionDependencies));
  assert.ok(runtime.master.fields.every((row) => row.field_name));
});

test('Giesta2 Runtime resolution is deterministic for the same selection', async () => {
  const first = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', {});
  const second = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', {});
  assert.deepEqual(second.selection, first.selection);
  assert.deepEqual(second.validation, first.validation);
  assert.deepEqual(second.fields, first.fields);
});

test('Giesta2 invalid explicit selection fails closed instead of inventing a value', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL', 'ジエスタ2');
  const target = runtime.master.fields.find((row) => ['enum', 'string'].includes(row.data_type) && row.runtime_included !== false);
  assert.ok(target);
  const result = await resolveRuntimeAppProduct('SER-LIXIL-GIESTA2', { [target.field_name]: '__INVALID_RUNTIME_VALUE__' });
  assert.equal(result.validation.status, 'INVALID');
  assert.ok(result.validation.errors.some((row) => row.errorCode === 'SELECTION_NOT_ALLOWED' && row.field === target.field_name));
});
