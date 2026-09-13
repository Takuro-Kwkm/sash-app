import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getRuntimeMasterEntry,
  loadRegisteredRuntime,
} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {
  getRuntimeAppIntegration,
  resolveRuntimeAppProduct,
} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { runtimeUiTemplateTopLevelOrder } from '../src/catalog/runtime-master/runtime-ui-template.mjs';

const PRODUCT_ID = 'SER-LIXIL-INPLUS';
const MANIFEST_ID = '1TokjIpcipm8TPxwrSO0FjyPxxvhCq5iZ';
const MANIFEST_SHA = 'cbbdb6ba315c985f7d27f75a237e861be8ce635962ce1cd5a746d7f152c8e1f8';
const RUNTIME_ID = '16dqUaVFp0YW3PqJ-A9tR0fAV0KT7WZML';
const RUNTIME_SHA = '6b225c76cbec1364473da2f8b74ca9b738d70f74baf4151f574c25415ca5fae9';
const SCHEMA_ID = '1Qov5w3pNrU9om40OLJikJv7B8klK1RNz';
const SCHEMA_SHA = '75a6a775229d48e2338a529b7d9b4fee2cb90fb4fe9809ff941151d90bb7154c';
const UI_SECTIONS = [
  'manufacturer',
  'product',
  'window_type',
  'glass_spec',
  'lowe_performance',
  'spacer',
  'cavity',
  'body_color',
  'frame_install',
  'custom_size',
  'options',
];

function integrityFile(runtime, fileId) {
  return runtime.sourcePackageIntegrity.files.find((row) => row.fileId === fileId);
}

function baseCustomSelection(overrides = {}) {
  return {
    size_mode: 'CUSTOM',
    window_type: '引違い窓',
    sash_configuration: '2枚建',
    size_class: '窓タイプ',
    upper_frame_spec: '標準',
    order_width: 1000,
    order_height: 1000,
    ...overrides,
  };
}

test('Inplus v0.4-R2 canonical Runtime is exact and Formal-ready', async () => {
  const entry = getRuntimeMasterEntry('LIXIL', 'インプラス');
  assert.ok(entry);
  assert.equal(entry.masterVersion, 'v0.4-R2');
  assert.equal(entry.runtimeManifestDriveFileId, MANIFEST_ID);
  assert.equal(entry.runtimeManifestSha256, MANIFEST_SHA);

  const runtime = await loadRegisteredRuntime('LIXIL', 'インプラス');
  assert.ok(runtime);
  assert.equal(runtime.normalizedManifest.packageVersion, 'v0.4-R2');
  assert.equal(runtime.normalizedManifest.formalPass, true);
  assert.equal(runtime.normalizedManifest.runtimeStatus, 'READY');
  assert.equal(runtime.sourcePackageIntegrity.match, true);
  assert.equal(runtime.sourcePackageIntegrity.expected, MANIFEST_SHA);
  assert.equal(runtime.sourcePackageIntegrity.actual, MANIFEST_SHA);
  assert.equal(runtime.sourcePackageIntegrity.manifestDriveFileId, MANIFEST_ID);

  const runtimeFile = integrityFile(runtime, RUNTIME_ID);
  assert.ok(runtimeFile, 'Formal Runtime JSON must be materialized from the manifest-listed Drive file');
  assert.equal(runtimeFile.expected, RUNTIME_SHA);
  assert.equal(runtimeFile.actual, RUNTIME_SHA);
  assert.equal(runtimeFile.match, true);

  const schemaFile = integrityFile(runtime, SCHEMA_ID);
  assert.ok(schemaFile, 'Formal Runtime schema must be materialized from the manifest-listed Drive file');
  assert.equal(schemaFile.expected, SCHEMA_SHA);
  assert.equal(schemaFile.actual, SCHEMA_SHA);
  assert.equal(schemaFile.match, true);
});

test('Inplus v0.4-R2 exposes Formal CUSTOM-only size capability', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL', 'インプラス');
  const custom = runtime.master.capabilities.uiSemanticSupport.customSize;
  assert.equal(custom.modeField, 'size_mode');
  assert.deepEqual(custom.allowedModes, ['CUSTOM']);
  assert.equal(custom.customMode, 'CUSTOM');
  assert.equal(custom.standardSupported, false);
  assert.equal(custom.standardRecordSource, null);
  assert.equal(custom.customSupported, true);
  assert.deepEqual(custom.dimensionFields, ['order_width', 'order_height']);
  assert.equal(custom.unit, 'mm');
  assert.equal(custom.stepMm, 1);
  assert.deepEqual(custom.validationResultModel, ['PASS', 'BLOCKED', 'REVIEW_REQUIRED', 'MANUAL_CHECK']);
  assert.equal(custom.clearRules.upstream_selector_change, 'CLEAR_INVALID_DOWNSTREAM_AND_REEVALUATE');
});

test('Inplus v0.4-R2 uses the fixed 11-section INNER_WINDOW UI contract', async () => {
  const integration = getRuntimeAppIntegration(PRODUCT_ID);
  assert.ok(integration);
  assert.equal(integration.packageVersion, 'v0.4-R2');
  assert.equal(integration.uiTemplate, 'INPLUS_V04R2');
  assert.equal(integration.sourceHash, MANIFEST_SHA);
  assert.equal(integration.canonicalRuntimeReference.runtimeManifestDriveFileId, MANIFEST_ID);
  assert.equal(integration.canonicalRuntimeReference.runtimeJsonDriveFileId, RUNTIME_ID);
  assert.equal(integration.canonicalRuntimeReference.runtimeSchemaDriveFileId, SCHEMA_ID);
  assert.deepEqual(runtimeUiTemplateTopLevelOrder.INPLUS_V04R2, UI_SECTIONS);

  const initial = await resolveRuntimeAppProduct(PRODUCT_ID, {});
  assert.equal(initial.uiTemplate, 'INPLUS_V04R2');
  assert.equal(initial.uiStandardRuntimeGap.status, 'NONE');
  assert.equal(initial.uiGroupingAudit.status, 'PASS');
  assert.deepEqual(initial.uiSections.map((section) => section.id), UI_SECTIONS);

  const sizeMode = initial.fields.find((field) => field.key === 'size_mode');
  assert.ok(sizeMode, '特注サイズ section must expose the Formal size_mode field');
  assert.equal(sizeMode.required, true);
  assert.deepEqual(sizeMode.values.map((row) => row.value), ['CUSTOM']);
  assert.deepEqual(sizeMode.values.map((row) => row.displayLabel), ['特注']);
  assert.equal(initial.fields.some((field) => field.key === 'order_width'), false);
  assert.equal(initial.fields.some((field) => field.key === 'order_height'), false);

  const custom = await resolveRuntimeAppProduct(PRODUCT_ID, { size_mode: 'CUSTOM' });
  const width = custom.fields.find((field) => field.key === 'order_width');
  const height = custom.fields.find((field) => field.key === 'order_height');
  assert.ok(width);
  assert.ok(height);
  assert.equal(width.required, true);
  assert.equal(height.required, true);
  assert.equal(width.unit, 'mm');
  assert.equal(height.unit, 'mm');
  assert.equal(width.step, 1);
  assert.equal(height.step, 1);
});

test('Inplus v0.4-R2 CUSTOM validation passes valid ranges and blocks invalid ranges', async () => {
  const valid = await resolveRuntimeAppProduct(PRODUCT_ID, baseCustomSelection());
  assert.equal(valid.dimensionResult.status, 'PASS');
  assert.notEqual(valid.validation.status, 'INVALID');
  assert.equal(valid.runtimeMaster.sourcePackageIntegrity.match, true);

  const outside = await resolveRuntimeAppProduct(PRODUCT_ID, baseCustomSelection({
    order_width: 99999,
    order_height: 99999,
  }));
  assert.equal(outside.dimensionResult.status, 'BLOCKED');
  assert.equal(outside.validation.status, 'INVALID');

  const fractional = await resolveRuntimeAppProduct(PRODUCT_ID, baseCustomSelection({
    order_width: 1000.5,
  }));
  assert.equal(fractional.dimensionResult.status, 'BLOCKED');
  assert.equal(fractional.validation.status, 'INVALID');
});

test('Inplus v0.4-R2 never offers STANDARD and clears unsupported size input fail-closed', async () => {
  const result = await resolveRuntimeAppProduct(PRODUCT_ID, {
    ...baseCustomSelection(),
    size_mode: 'STANDARD',
  });
  const mode = result.fields.find((field) => field.key === 'size_mode');
  assert.ok(mode);
  assert.deepEqual(mode.values.map((row) => row.value), ['CUSTOM']);
  assert.equal(result.selection.size_mode, undefined);
  assert.equal(result.selection.order_width, undefined);
  assert.equal(result.selection.order_height, undefined);
  assert.ok(result.clearedFields.includes('size_mode'));
});

test('Inplus v0.4-R2 preserves REVIEW_REQUIRED / MANUAL_CHECK instead of guessing', async () => {
  const manual = await resolveRuntimeAppProduct(PRODUCT_ID, baseCustomSelection({
    sash_configuration: '2枚建（障子W指定）',
  }));
  assert.ok(
    manual.validation.status === 'MANUAL_CHECK'
      || manual.dimensionResult?.status === 'REVIEW_REQUIRED',
    `Expected fail-closed manual/review result, got validation=${manual.validation.status} dimension=${manual.dimensionResult?.status}`,
  );
  assert.ok(
    manual.manualWarnings.some((text) => text.includes('MANUAL_CHECK'))
      || manual.dimensionResult?.status === 'REVIEW_REQUIRED',
  );
});
