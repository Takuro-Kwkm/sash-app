import test from 'node:test';
import assert from 'node:assert/strict';
import { appRuntimeIntegrationRegistry } from '../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {
  NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY,
  applyNewConstructionSashUiOrder,
} from '../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
import {
  INNER_WINDOW_UI_CATEGORY,
  applyInnerWindowUiOrder,
} from '../src/catalog/runtime-master/inner-window-runtime-ui-contract.mjs';

const STAGE_ORDER = ['PRODUCT','OPENING','CONFIGURATION','SIZE','FINISH','SCREEN','GLAZING','INSTALLATION_SURVEY','OPTION'];
const STAGE_INDEX = new Map(STAGE_ORDER.map((stage,index)=>[stage,index]));
const WINDOW_UI_CATEGORIES = new Set([NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY, INNER_WINDOW_UI_CATEGORY]);
const windowIntegrations = () => appRuntimeIntegrationRegistry.filter((row) => WINDOW_UI_CATEGORIES.has(row.uiCategory));
const stages = (rows) => rows.map((row) => row.semanticStage);
const keys = (rows) => rows.map((row) => row.key);

function assertCanonicalStageOrder(rows, label) {
  let previous = -1;
  for (const field of rows) {
    assert.ok(field.semanticSlot, `${label}:${field.key} missing semanticSlot`);
    assert.ok(field.semanticStage, `${label}:${field.key} missing semanticStage`);
    const current = STAGE_INDEX.get(field.semanticStage);
    assert.notEqual(current, undefined, `${label}:${field.key} unknown stage ${field.semanticStage}`);
    assert.ok(current >= previous, `${label}:${field.key} stage order regressed`);
    previous = current;
  }
}

test('new-construction fields use the single global stage sequence', () => {
  const rows = applyNewConstructionSashUiOrder([
    { key: 'glass_type', displayOrder: 10 },
    { key: 'option', displayOrder: 20 },
    { key: 'screen_presence', displayOrder: 30 },
    { key: 'exterior_color', displayOrder: 40 },
    { key: 'size', displayOrder: 50 },
    { key: 'size_mode', displayOrder: 60 },
    { key: 'handing', displayOrder: 70 },
    { key: 'window_spec', displayOrder: 80 },
    { key: 'window_type', displayOrder: 90 },
  ]);
  assert.deepEqual(stages(rows), [
    'OPENING', 'CONFIGURATION', 'CONFIGURATION', 'SIZE', 'SIZE',
    'FINISH', 'SCREEN', 'GLAZING', 'OPTION',
  ]);
  assert.deepEqual(keys(rows), [
    'window_type', 'window_spec', 'handing', 'size_mode', 'size',
    'exterior_color', 'screen_presence', 'glass_type', 'option',
  ]);
  assert.equal(NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY, 'NEW_CONSTRUCTION_EXTERIOR_WINDOW');
});

test('inner-window fields use the same global stage sequence', () => {
  const rows = applyInnerWindowUiOrder([
    { key: 'frame_installation_mode', field_name: 'frame_installation_mode', domain: 'INSTALLATION', displayOrder: 90 },
    { key: 'glass_family', field_name: 'glass_family', domain: 'GLASS', displayOrder: 40 },
    { key: 'frame_color', field_name: 'frame_color', domain: 'COLOR', displayOrder: 80 },
    { key: 'size_w', field_name: 'size_w', domain: 'SIZE', displayOrder: 101 },
    { key: 'size_mode', field_name: 'size_mode', domain: 'SIZE', displayOrder: 100 },
    { key: 'room_specification', field_name: 'room_specification', domain: 'PRODUCT', displayOrder: 25 },
    { key: 'window_type', field_name: 'window_type', domain: 'PRODUCT', displayOrder: 30 },
  ]);
  assert.deepEqual(stages(rows), [
    'OPENING', 'CONFIGURATION', 'SIZE', 'SIZE', 'FINISH', 'GLAZING', 'INSTALLATION_SURVEY',
  ]);
  assert.deepEqual(keys(rows), [
    'window_type', 'room_specification', 'size_mode', 'size_w', 'frame_color', 'glass_family', 'frame_installation_mode',
  ]);
  assert.equal(INNER_WINDOW_UI_CATEGORY, 'INNER_WINDOW');
});

test('unknown user-facing fields fail closed even when they carry a familiar domain', () => {
  assert.throws(
    () => applyNewConstructionSashUiOrder([{ key: 'mystery_user_field', domain:'INSTALLATION', displayOrder: 10 }]),
    { code: 'WINDOW_UI_FIELD_UNMAPPED' },
  );
  assert.throws(
    () => applyInnerWindowUiOrder([{ key: 'mystery_inner_option', field_name:'mystery_inner_option', domain:'OPTION', displayOrder: 10 }]),
    { code: 'WINDOW_UI_FIELD_UNMAPPED' },
  );
});

test('approved category extensions are exact declarative Uchirimo fields', () => {
  const rows = applyInnerWindowUiOrder([
    { key: 'opening_w_top', field_name: 'opening_w_top', domain: 'MEASUREMENT', displayOrder: 200 },
    { key: 'arm_stopper_option', field_name: 'arm_stopper_option', domain: 'OPTION', displayOrder: 309 },
  ]);
  assert.deepEqual(stages(rows), ['INSTALLATION_SURVEY', 'OPTION']);
  assert.equal(rows[0].semanticSlot, 'extension:installation:opening_w_top');
  assert.equal(rows[1].semanticSlot, 'extension:option:arm_stopper_option');
});

test('all registered window integrations point to UI standard v1.8 and resolve through canonical stages', async () => {
  const integrations = windowIntegrations();
  assert.equal(integrations.length, 8, 'Global Window Flow population must remain the eight registered window integrations');
  for (const integration of integrations) {
    assert.equal(integration.uiStandardSpec, 'サッシ情報管理アプリ_UI実装標準仕様書_v1.8', integration.id);
    const result = await resolveRuntimeAppProduct(integration.id, {});
    assert.equal(result.productId, integration.id);
    assertCanonicalStageOrder(result.fields, integration.id);
    assert.equal(result.fields.some((field)=>String(field.semanticSlot).startsWith('other:')), false, `${integration.id}:other:*`);
  }
});
