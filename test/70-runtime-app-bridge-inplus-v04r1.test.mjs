import test from 'node:test';
import assert from 'node:assert/strict';
import { getRuntimeAppIntegration, resolveRuntimeAppProduct, runtimeAppIntegrationInventory } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { getRuntimeMasterEntry, loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { runtimeUiTemplateTopLevelOrder } from '../src/catalog/runtime-master/runtime-ui-template.mjs';

const PRODUCT_ID = 'SER-LIXIL-INPLUS';
const UI_ORDER = [
  'window_type','sash_configuration','size_class','reverse_handing','hinge_side',
  'order_width','order_height','upper_frame_spec','sash_midrail','crescent_position',
  'frame_install_spec','fukashi_spec','joint_layout','body_color','glass_family',
  'glass_type','lowe_color','cavity_fill','supply_form','glass_detail',
  'decorative_pattern','option_items',
];
const FORBIDDEN = new Set([
  'manufacturer','series','product_category','evidence','spacer','glass_config_id','size_mode',
  'screen','screen_type','screen_midrail','screen_net','exterior_color','interior_color',
]);
const standardSelection = Object.freeze({
  window_type:'引違い窓', sash_configuration:'2枚建', size_class:'窓タイプ', upper_frame_spec:'標準',
  order_width:1000, order_height:1000, body_color:'COL-S', glass_family:'Low-E複層', glass_type:'透明',
  lowe_color:'グリーン', cavity_fill:'乾燥空気 A12', supply_form:'完成品障子（枠はノックダウン）', glass_detail:'LE-A-G-CLR',
});
const gridSelection = Object.freeze({
  ...standardSelection, order_width:900, order_height:500, glass_type:'和紙調・格子入り', cavity_fill:'乾燥空気 A8', glass_detail:'LE-A-G-WG',
});

function assertCanonicalUi(result) {
  const keys = result.fields.map((field) => field.key);
  assert.ok(keys.every((key) => UI_ORDER.includes(key)), `unexpected UI field: ${keys.filter((key) => !UI_ORDER.includes(key)).join(', ')}`);
  assert.ok(keys.every((key) => !FORBIDDEN.has(key)), `forbidden UI field: ${keys.filter((key) => FORBIDDEN.has(key)).join(', ')}`);
  const positions = keys.map((key) => UI_ORDER.indexOf(key));
  for (let i = 1; i < positions.length; i += 1) assert.ok(positions[i - 1] < positions[i], `UI order violated: ${keys.join(' > ')}`);
  assert.equal(result.uiGroupingAudit.status, 'PASS');
  assert.equal(result.uiGroupingAudit.orderMatches, true);
  assert.equal(result.uiStandardRuntimeGap.status, 'NONE');
}

test('Inplus v0.4-R1 is registered read-only through canonical runtime_manifest and formal Authoring UI contract', () => {
  const row = getRuntimeAppIntegration(PRODUCT_ID);
  assert.ok(row);
  assert.equal(row.manufacturer, 'LIXIL');
  assert.equal(row.series, 'インプラス');
  assert.equal(row.status, 'READY');
  assert.equal(row.selectable, true);
  assert.equal(row.packageVersion, 'v0.4-R1');
  assert.equal(row.schemaVersion, '2.0');
  assert.equal(row.adapterType, 'SEMANTIC_TABLE_BUNDLE_V2');
  assert.equal(row.uiTemplate, 'INPLUS_V04R1');
  assert.equal(row.uiContractSource.authoringMasterDriveFileId, '1NbvIhvxINl45MStUR17LqPOP2123fUAQ');
  assert.equal(row.canonicalRuntimeReference.runtimeManifestDriveFileId, '1iPSLxyziMGXUN71-cSvQO8SRfudx80Qf');
  assert.equal(row.canonicalRuntimeReference.canonicalFolderId, '1NPW7cUbaC1JRvIaJrltFkoYUiLyPwJa1');
  const entry = getRuntimeMasterEntry('LIXIL', 'インプラス');
  assert.ok(entry);
  assert.equal(entry.packageType, 'RUNTIME_MANIFEST_V1');
  assert.equal(entry.runtimeManifestSha256, '39017746404c98b59a3238890bfece9f46acb122870def6a1361472dad5390ed');
});

test('canonical v0.4-R1 package bytes, schema and machine join contract verify before adaptation', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL', 'インプラス');
  assert.equal(runtime.sourcePackageIntegrity.match, true);
  assert.equal(runtime.normalizedManifest.packageVersion, 'v0.4-R1');
  assert.equal(runtime.normalizedManifest.storageStatus, 'CANONICAL');
  assert.deepEqual(runtime.sourcePackageIntegrity.files.map((row) => [row.fileId, row.match]), [
    ['1VREtyCeLgiGD4ereIDGLLPfsea3d-ac5', true],
    ['1re25pGC5Zo0ytwD2snL0OPsfYSW6Ymqc', true],
  ]);
  assert.equal(runtime.master.runtimeContract, 'MANIFEST_DECLARED_SEMANTIC_TABLE_BUNDLE');
  assert.equal(runtime.master.capabilities.textJoinAllowed, false);
  assert.equal(runtime.master.capabilities.machineJoinContractVersion, '1.0');
  for (const id of ['SZ-SL3W','ND-01','ND-06','GL-ORD-004','FK-SA09','FK-R08','FK-R14','FK-R15','FK-R18','FK-R19']) {
    assert.ok(runtime.master.capabilities.knownManualCheckIds.includes(id));
  }
});

test('INPLUS_UI_CONTRACT_TEST uses exact Authoring Master field order and excludes app-invented fields', async () => {
  assert.deepEqual(runtimeUiTemplateTopLevelOrder.INPLUS_V04R1, UI_ORDER);
  const result = await resolveRuntimeAppProduct(PRODUCT_ID, standardSelection);
  assert.equal(result.uiTemplate, 'INPLUS_V04R1');
  assert.equal(result.uiContractSource.authoringMasterDriveFileId, '1NbvIhvxINl45MStUR17LqPOP2123fUAQ');
  assertCanonicalUi(result);
  const keys = result.fields.map((field) => field.key);
  assert.ok(keys.indexOf('order_width') < keys.indexOf('order_height'));
  assert.ok(keys.indexOf('order_height') < keys.indexOf('upper_frame_spec'));
  assert.ok(keys.indexOf('body_color') < keys.indexOf('glass_family'));
  assert.equal(keys.includes('spacer'), false);
  assert.equal(keys.includes('size_mode'), false);
  assert.equal(keys.some((key) => /screen|網戸/i.test(key)), false);
  assert.equal(keys.some((key) => ['exterior_color','interior_color'].includes(key)), false);
});

test('upper frame waits for W/H and singleton supply form is auto-fixed/hidden', async () => {
  const beforeDimensions = await resolveRuntimeAppProduct(PRODUCT_ID, { window_type:'引違い窓', sash_configuration:'2枚建', size_class:'窓タイプ' });
  assertCanonicalUi(beforeDimensions);
  assert.equal(beforeDimensions.fields.some((field) => field.key === 'upper_frame_spec'), false);
  const afterDimensions = await resolveRuntimeAppProduct(PRODUCT_ID, { window_type:'引違い窓', sash_configuration:'2枚建', size_class:'窓タイプ', order_width:1000, order_height:1000 });
  assertCanonicalUi(afterDimensions);
  assert.equal(afterDimensions.fields.some((field) => field.key === 'upper_frame_spec'), true);
  const complete = await resolveRuntimeAppProduct(PRODUCT_ID, standardSelection);
  assertCanonicalUi(complete);
  const supply = complete.fields.find((field) => field.key === 'supply_form');
  if (supply) assert.ok(supply.values.length > 1, 'singleton supply_form must be hidden');
  const cavity = complete.fields.find((field) => field.key === 'cavity_fill');
  if (cavity) assert.ok(cavity.values.length > 1, 'singleton cavity_fill must be hidden');
});

test('standard Inplus selection resolves by explicit IDs and formal fabrication ranges', async () => {
  const result = await resolveRuntimeAppProduct(PRODUCT_ID, standardSelection);
  assertCanonicalUi(result);
  assert.equal(result.runtimeMaster.sourcePackageIntegrity.match, true);
  assert.equal(result.validation.status, 'VALID');
  assert.equal(result.dimensionResult.status, 'PASS');
  assert.equal(result.selection.glass_detail, 'LE-A-G-CLR');
  assert.equal(result.selection.body_color, 'COL-S');
});

test('RL-016 exposes decorative pattern by glass_config ID while derived spacer stays internal/hidden', async () => {
  const incomplete = await resolveRuntimeAppProduct(PRODUCT_ID, gridSelection);
  assertCanonicalUi(incomplete);
  const pattern = incomplete.fields.find((row) => row.key === 'decorative_pattern');
  assert.ok(pattern);
  assert.equal(pattern.required, true);
  assert.deepEqual(pattern.values.map((row) => row.value).sort(), ['横繁','荒間'].sort());
  assert.equal(incomplete.validation.status, 'INCOMPLETE');
  const complete = await resolveRuntimeAppProduct(PRODUCT_ID, { ...gridSelection, decorative_pattern:'荒間' });
  assertCanonicalUi(complete);
  assert.equal(complete.validation.status, 'VALID');
  assert.equal(complete.dimensionResult.status, 'PASS');
  assert.equal(complete.fields.some((field) => field.key === 'spacer'), false);
  assert.equal(complete.selection.spacer, undefined);
  assert.equal(complete.runtimeCapabilities.uiSemanticSupport.spacer.field, 'spacer');
});

test('invalid downstream body color is cleared after glass dependency change rather than retained or invented', async () => {
  const result = await resolveRuntimeAppProduct(PRODUCT_ID, { ...gridSelection, decorative_pattern:'荒間', body_color:'COL-G' });
  assertCanonicalUi(result);
  assert.ok(result.clearedFields.includes('body_color'));
  assert.equal(result.selection.body_color, undefined);
  assert.notEqual(result.validation.status, 'INVALID');
});

test('2W/4W-equivalent and SZ-SL3W fabrication selectors remain MANUAL_CHECK', async () => {
  for (const selection of [
    { ...standardSelection, sash_configuration:'2枚建（障子W指定）' },
    { ...standardSelection, sash_configuration:'4枚建（障子W指定）', order_width:1800 },
    { ...standardSelection, sash_configuration:'3枚建（障子W指定）', size_class:'窓/テラス' },
  ]) {
    const result = await resolveRuntimeAppProduct(PRODUCT_ID, selection);
    assertCanonicalUi(result);
    assert.equal(result.validation.status, 'MANUAL_CHECK');
    assert.ok(result.notices.some((text) => text.includes('MANUAL_CHECK')));
  }
});

test('partial installability mappings FR-CORNER / FR-AUX / OP-FLAT never auto-pass', async () => {
  for (const selection of [
    { ...standardSelection, frame_install_spec:'FR-CORNER' },
    { ...standardSelection, frame_install_spec:'FR-AUX' },
    { ...standardSelection, option_items:['OP-FLAT'] },
  ]) {
    const result = await resolveRuntimeAppProduct(PRODUCT_ID, selection);
    assertCanonicalUi(result);
    assert.equal(result.validation.status, 'MANUAL_CHECK');
    assert.ok(result.notices.some((text) => text.includes('MANUAL_CHECK')));
  }
});

test('runtime inventory preserves production EW/TW integrations alongside Inplus', () => {
  const inventory = runtimeAppIntegrationInventory();
  assert.deepEqual(new Set(inventory.map((row) => row.id)), new Set(['SER-LIX-EW','SER-LIXIL-TW',PRODUCT_ID]));
  assert.ok(inventory.some((row) => row.id === PRODUCT_ID && row.selectable));
  assert.ok(inventory.some((row) => row.id === 'SER-LIX-EW' && row.selectable));
  assert.ok(inventory.some((row) => row.id === 'SER-LIXIL-TW' && row.selectable));
});
