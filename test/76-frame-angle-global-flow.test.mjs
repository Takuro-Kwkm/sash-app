import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CANONICAL_WINDOW_SLOT_STAGE,
  NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER,
  FRAME_ANGLE_CANONICAL_VALUES,
  FRAME_ANGLE_CLASSIFICATIONS,
} from '../src/catalog/runtime-master/canonical-window-semantic-schema.mjs';
import {
  applyNewConstructionSashUiOrder,
  NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER,
  semanticSlotForNewConstructionField,
  semanticStageForNewConstructionSlot,
} from '../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
import {
  applyInnerWindowUiOrder,
  INNER_WINDOW_UI_STANDARD_ORDER,
  semanticSlotForInnerWindowField,
  semanticStageForInnerWindowSlot,
} from '../src/catalog/runtime-master/inner-window-runtime-ui-contract.mjs';

test('frame_angle is a canonical CONFIGURATION slot with the formal values/classifications', () => {
  assert.equal(CANONICAL_WINDOW_SLOT_STAGE.frame_angle, 'CONFIGURATION');
  assert.deepEqual([...FRAME_ANGLE_CANONICAL_VALUES], ['WITH_ANGLE','WITHOUT_ANGLE']);
  assert.deepEqual([...FRAME_ANGLE_CLASSIFICATIONS], ['USER_SELECTABLE','CONDITIONAL_USER_SELECTABLE','FIXED','NOT_APPLICABLE']);
  assert.equal(semanticSlotForNewConstructionField('frame_angle'), 'frame_angle');
  assert.equal(semanticStageForNewConstructionSlot('frame_angle'), 'CONFIGURATION');
  assert.equal(semanticSlotForInnerWindowField('frame_angle'), 'frame_angle');
  assert.equal(semanticStageForInnerWindowSlot('frame_angle'), 'CONFIGURATION');
});

test('global order places frame_angle after handing and before SIZE without series logic', () => {
  for (const order of [NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER, NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER]) {
    assert.ok(order.indexOf('window_spec') < order.indexOf('handing'));
    assert.ok(order.indexOf('handing') < order.indexOf('frame_angle'));
    assert.ok(order.indexOf('frame_angle') < order.indexOf('size_mode'));
  }
  assert.ok(INNER_WINDOW_UI_STANDARD_ORDER.indexOf('frame_angle') < INNER_WINDOW_UI_STANDARD_ORDER.indexOf('size_mode'));

  const ordered=applyNewConstructionSashUiOrder([
    { key:'size_mode', displayLabel:'サイズ方式', values:[] },
    { key:'frame_angle', displayLabel:'枠アングル', values:[
      { value:'WITH_ANGLE', displayLabel:'アングル付' },
      { value:'WITHOUT_ANGLE', displayLabel:'アングル無' },
    ] },
    { key:'handing', displayLabel:'開き勝手', values:[] },
    { key:'window_spec', displayLabel:'窓仕様', values:[] },
  ]);
  assert.deepEqual(ordered.map((row)=>row.key), ['window_spec','handing','frame_angle','size_mode']);
  const frame=ordered.find((row)=>row.key==='frame_angle');
  assert.equal(frame.semanticSlot,'frame_angle');
  assert.equal(frame.semanticStage,'CONFIGURATION');
  assert.deepEqual(frame.values.map((row)=>row.value),['WITH_ANGLE','WITHOUT_ANGLE']);
});

test('frame_angle is never synthesized when Formal Runtime does not provide it', () => {
  const newConstruction=applyNewConstructionSashUiOrder([
    { key:'window_spec', displayLabel:'窓仕様', values:[] },
    { key:'handing', displayLabel:'開き勝手', values:[] },
    { key:'size_mode', displayLabel:'サイズ方式', values:[] },
  ]);
  assert.equal(newConstruction.some((row)=>row.key==='frame_angle'),false);

  const inner=applyInnerWindowUiOrder([
    { key:'window_type', displayLabel:'窓種類', values:[] },
    { key:'size_mode', displayLabel:'サイズ方式', values:[] },
  ]);
  assert.equal(inner.some((row)=>row.key==='frame_angle'),false);
});
