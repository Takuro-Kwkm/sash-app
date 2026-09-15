import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY,
  applyNewConstructionSashUiOrder,
} from '../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
import {
  INNER_WINDOW_UI_CATEGORY,
  applyInnerWindowUiOrder,
} from '../src/catalog/runtime-master/inner-window-runtime-ui-contract.mjs';

const stages = (rows) => rows.map((row) => row.semanticStage);
const keys = (rows) => rows.map((row) => row.key);

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

test('inner-window fields use the same global stage sequence with category extensions', () => {
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

test('unknown user-facing fields fail closed instead of falling through as other:*', () => {
  assert.throws(
    () => applyNewConstructionSashUiOrder([{ key: 'mystery_user_field', displayOrder: 10 }]),
    { code: 'WINDOW_UI_FIELD_UNMAPPED' },
  );
});

test('explicit installation and option domains are approved category extensions', () => {
  const rows = applyInnerWindowUiOrder([
    { key: 'runtime_install_extension', field_name: 'runtime_install_extension', domain: 'INSTALLATION', displayOrder: 91 },
    { key: 'runtime_option_extension', field_name: 'runtime_option_extension', domain: 'OPTION', displayOrder: 111 },
  ]);
  assert.deepEqual(stages(rows), ['INSTALLATION_SURVEY', 'OPTION']);
  assert.match(rows[0].semanticSlot, /^extension:installation:/);
  assert.match(rows[1].semanticSlot, /^extension:option:/);
});
