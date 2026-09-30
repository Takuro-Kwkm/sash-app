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
import { resolveFormalRuntimeProduct } from './helpers/formal-runtime-result.mjs';
import { GLOBAL_WINDOW_STAGE_ORDER } from '../src/catalog/runtime-master/global-window-selection-flow-engine.mjs';

const PRODUCT_ID = 'SER-LIXIL-INPLUS';
const MANIFEST_ID = '1N1sQQM616oeuQm7kehqaz3EMQDrNzfhy';
const MANIFEST_SHA = 'd408bd64237ba5d44f9ebbf3ab3c869e9b64864ff0da28609568718b881607d1';
const RUNTIME_ID = '19OtDgWSQFehEmxFYFIqxZGZCFXyzJaZ4';
const RUNTIME_SHA = 'bd3b00f673ad3dc77b593c4818fe9d4e92c074c7fc96e9f8919a43d56c8d5ec2';
const SCHEMA_ID = '1d61bdbtl9LafVMgwzu2rduwMieB8kKtf';
const SCHEMA_SHA = '351569028723f9e92392a1741f7134886d602dccba406260f385ef5bc3618740';

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

function assertGlobalFlow(fields) {
  let previous = -1;
  for (const field of fields) {
    assert.ok(field.semanticSlot, `unmapped semantic slot: ${field.key}`);
    assert.ok(field.semanticStage, `unmapped semantic stage: ${field.key}`);
    const index = field.presentationSlot==='INNER_WINDOW_FINAL_DIMENSION'?9:GLOBAL_WINDOW_STAGE_ORDER.indexOf(field.semanticStage);
    assert.ok(index >= 0, `unknown global stage ${field.semanticStage} for ${field.key}`);
    assert.ok(index >= previous, `stage inversion at ${field.key}: ${field.semanticStage}`);
    previous = index;
  }
}

test('Inplus v0.4-R3 canonical Runtime is exact and Formal-ready', async () => {
  const entry = getRuntimeMasterEntry('LIXIL', 'インプラス');
  assert.ok(entry);
  assert.equal(entry.masterVersion, 'v0.4-R3');
  assert.equal(entry.runtimeManifestDriveFileId, MANIFEST_ID);
  assert.equal(entry.runtimeManifestSha256, MANIFEST_SHA);

  const runtime = await loadRegisteredRuntime('LIXIL', 'インプラス');
  assert.ok(runtime);
  assert.equal(runtime.normalizedManifest.packageVersion, 'v0.4-R3');
  assert.equal(runtime.normalizedManifest.formalPass, true);
  assert.equal(runtime.normalizedManifest.runtimeStatus, 'READY');
  assert.equal(runtime.sourcePackageIntegrity.match, true);
  assert.equal(runtime.sourcePackageIntegrity.expected, MANIFEST_SHA);
  assert.equal(runtime.sourcePackageIntegrity.actual, MANIFEST_SHA);
  assert.equal(runtime.sourcePackageIntegrity.manifestDriveFileId, MANIFEST_ID);

  const runtimeFile = integrityFile(runtime, RUNTIME_ID);
  assert.ok(runtimeFile);
  assert.equal(runtimeFile.expected, RUNTIME_SHA);
  assert.equal(runtimeFile.actual, RUNTIME_SHA);
  assert.equal(runtimeFile.match, true);

  const schemaFile = integrityFile(runtime, SCHEMA_ID);
  assert.ok(schemaFile);
  assert.equal(schemaFile.expected, SCHEMA_SHA);
  assert.equal(schemaFile.actual, SCHEMA_SHA);
  assert.equal(schemaFile.match, true);
});

test('Inplus v0.4-R3 exposes Formal CUSTOM-only size capability', async () => {
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

test('Inplus v0.4-R3 uses UI v1.9 Global Window Selection Flow with no series template', async () => {
  const integration = getRuntimeAppIntegration(PRODUCT_ID);
  assert.ok(integration);
  assert.equal(integration.packageVersion, 'v0.4-R3');
  assert.equal(integration.uiCategory, 'INNER_WINDOW');
  assert.equal(integration.uiTemplate, undefined);
  assert.equal(integration.uiStandardSpec, 'サッシ情報管理アプリ_UI実装標準仕様書_v1.9');
  assert.equal(integration.sourceHash, MANIFEST_SHA);
  assert.equal(integration.canonicalRuntimeReference.runtimeManifestDriveFileId, MANIFEST_ID);
  assert.equal(integration.canonicalRuntimeReference.runtimeJsonDriveFileId, RUNTIME_ID);
  assert.equal(integration.canonicalRuntimeReference.runtimeSchemaDriveFileId, SCHEMA_ID);

  const initial = await resolveRuntimeAppProduct(PRODUCT_ID, {});
  assertGlobalFlow(initial.fields);
  assert.ok(initial.fields.every((field) => field.semanticSlot && field.semanticStage));

  assert.equal(initial.fields.some(f=>['size_mode','size_class'].includes(f.key)),false);
  assert.equal(initial.selection.size_mode,'CUSTOM');
  const custom = await resolveRuntimeAppProduct(PRODUCT_ID, { size_mode: 'CUSTOM' });
  assertGlobalFlow(custom.fields);
  const width = custom.fields.find((field) => field.key === 'order_width');
  const height = custom.fields.find((field) => field.key === 'order_height');
  assert.ok(width);
  assert.ok(height);
  assert.equal(width.semanticStage, 'SIZE');
  assert.equal(height.semanticStage, 'SIZE');
  assert.equal(width.required, true);
  assert.equal(height.required, true);
  assert.equal(width.unit, 'mm');
  assert.equal(height.unit, 'mm');
  assert.equal(width.step, 1);
  assert.equal(height.step, 1);

  const finish = custom.fields.find((field) => field.key === 'body_color');
  if (finish) assert.equal(finish.semanticStage, 'FINISH');
  for (const key of ['glass_family','glass_type','glass_detail','lowe_color','spacer','cavity_fill']) {
    const field = custom.fields.find((row) => row.key === key);
    if (field) assert.equal(field.semanticStage, 'GLAZING', key);
  }
  for (const key of ['upper_frame_spec','frame_install_spec','fukashi_spec','joint_layout']) {
    const field = custom.fields.find((row) => row.key === key);
    if (field) assert.equal(field.semanticStage, 'INSTALLATION_SURVEY', key);
  }
});

test('Inplus v0.4-R3 CUSTOM validation passes valid ranges and blocks invalid ranges', async () => {
  const valid = await resolveRuntimeAppProduct(PRODUCT_ID, baseCustomSelection());
  assert.equal(valid.dimensionResult.status, 'PASS');
  assert.notEqual(valid.validation.status, 'INVALID');
  assert.equal(valid.runtimeMaster.sourcePackageIntegrity.match, true);

  const outside = await resolveRuntimeAppProduct(PRODUCT_ID, baseCustomSelection({ order_width: 99999, order_height: 99999 }));
  assert.equal(outside.dimensionResult.status, 'BLOCKED');
  assert.equal(outside.validation.status, 'INVALID');

  const fractional = await resolveRuntimeAppProduct(PRODUCT_ID, baseCustomSelection({ order_width: 1000.5 }));
  assert.equal(fractional.dimensionResult.status, 'BLOCKED');
  assert.equal(fractional.validation.status, 'INVALID');
});

test('Inplus v0.4-R3 never offers STANDARD and clears unsupported size input fail-closed', async () => {
  const result = await resolveFormalRuntimeProduct(PRODUCT_ID, { ...baseCustomSelection(), size_mode: 'STANDARD' });
  const mode = result.fields.find((field) => field.key === 'size_mode');
  assert.equal(mode,undefined);
  assert.equal(result.selection.size_mode, undefined);
  assert.equal(result.selection.order_width, undefined);
  assert.equal(result.selection.order_height, undefined);
  assert.ok(result.clearedFields.includes('size_mode'));
});

test('Inplus v0.4-R3 preserves REVIEW_REQUIRED / MANUAL_CHECK instead of guessing', async () => {
  const manual = await resolveRuntimeAppProduct(PRODUCT_ID, baseCustomSelection({ sash_configuration: '2枚建（障子W指定）' }));
  assert.ok(manual.validation.status === 'MANUAL_CHECK' || manual.dimensionResult?.status === 'REVIEW_REQUIRED');
  assert.ok(manual.manualWarnings.some((text) => text.includes('MANUAL_CHECK')) || manual.dimensionResult?.status === 'REVIEW_REQUIRED');
});
