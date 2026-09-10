import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyNewConstructionSashUiOrder,
  commonLabelForRuntimeField,
  isInternalRuntimeUiField,
  semanticSlotForRuntimeField,
} from '../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
import { runtimeAppIntegrationInventory } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

test('v1.6 semantic aliases normalize without embedding product business rules', () => {
  assert.equal(semanticSlotForRuntimeField('shutter_type'), 'window_spec');
  assert.equal(semanticSlotForRuntimeField('operation_type'), 'window_spec');
  assert.equal(semanticSlotForRuntimeField('leaf_configuration'), 'panel_leaf');
  assert.equal(semanticSlotForRuntimeField('screen_type'), 'screen_form');
  assert.equal(semanticSlotForRuntimeField('glass_additional'), 'glass_function');
  assert.equal(semanticSlotForRuntimeField('glass_gas'), 'glass_air_layer');
  assert.equal(semanticSlotForRuntimeField('options'), 'option');
});

test('v1.6 common labels and internal-field filter are centralized', () => {
  assert.equal(commonLabelForRuntimeField('window_type'), '窓種類');
  assert.equal(commonLabelForRuntimeField('handing'), '開き勝手（吊元）');
  assert.equal(commonLabelForRuntimeField('panel_count'), '建具・枚数');
  assert.equal(commonLabelForRuntimeField('glass_function'), 'ガラス追加機能');
  assert.equal(commonLabelForRuntimeField('options'), 'その他オプション');
  for (const key of ['construction','actual_w','actual_h','common_window_id']) assert.equal(isInternalRuntimeUiField(key), true);
});

test('window-specific aliases stay after window type and screen/glass blocks keep v1.6 relative order', () => {
  const ordered = applyNewConstructionSashUiOrder([
    { key: 'glass_base', displayLabel: 'x', displayOrder: 1 },
    { key: 'screen_net', displayLabel: 'x', displayOrder: 2 },
    { key: 'window_type', displayLabel: 'x', displayOrder: 99 },
    { key: 'operator_position', displayLabel: 'オペレーター位置', displayOrder: 0 },
    { key: 'interior_color', displayLabel: 'x', displayOrder: 3 },
    { key: 'screen_type', displayLabel: 'x', displayOrder: 4 },
    { key: 'glass_spacer', displayLabel: 'x', displayOrder: 5 },
    { key: 'construction', displayLabel: '技術項目', displayOrder: 0 },
  ]);
  assert.deepEqual(ordered.map((field) => field.key), ['window_type','operator_position','interior_color','screen_type','screen_net','glass_base','glass_spacer']);
});

test('all six new-construction target series are declared and missing Runtime packages fail closed', () => {
  const rows = runtimeAppIntegrationInventory().filter((row) => row.uiCategory === 'NEW_CONSTRUCTION_EXTERIOR_WINDOW');
  const bySeries = new Map(rows.map((row) => [row.series, row]));
  assert.equal(rows.length, 6);
  for (const series of ['EW','TW','サーモスL','サーモスⅡ-H','APW430','APW431']) assert.ok(bySeries.has(series), series);
  assert.equal(bySeries.get('サーモスⅡ-H').status, 'RUNTIME_NOT_READY');
  assert.equal(bySeries.get('サーモスⅡ-H').selectable, false);
  assert.equal(bySeries.get('APW431').status, 'RUNTIME_NOT_READY');
  assert.equal(bySeries.get('APW431').selectable, false);
  assert.equal(bySeries.get('サーモスL').status, 'RUNTIME_NOT_INTEGRATED');
  assert.equal(bySeries.get('APW430').status, 'RUNTIME_NOT_INTEGRATED');
});

test('current target count is recalculated from current integration metadata, not the historical constant', () => {
  const target = runtimeAppIntegrationInventory().filter((row) => row.uiCategory === 'NEW_CONSTRUCTION_EXTERIOR_WINDOW');
  assert.equal(target.reduce((sum, row) => sum + Number(row.activeWindowCount ?? 0), 0), 105);
  assert.equal(target.filter((row) => row.runtimeStatus === 'READY').reduce((sum, row) => sum + Number(row.activeWindowCount ?? 0), 0), 82);
});
