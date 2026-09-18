import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_WINDOW_STAGE_ORDER,
  NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER,
  INSTALLATION_ENVIRONMENT_CANONICAL_VALUES,
  canonicalStageForSlot,
  classifyGlazingChoice,
  auditCanonicalGlazingField,
} from '../src/catalog/runtime-master/canonical-window-semantic-schema.mjs';

test('canonical window stages and new-construction slots are globally ordered', () => {
  assert.deepEqual(GLOBAL_WINDOW_STAGE_ORDER, [
    'PRODUCT','OPENING','CONFIGURATION','SIZE','FINISH','SCREEN','GLAZING','INSTALLATION_SURVEY','OPTION',
  ]);
  assert.equal(canonicalStageForSlot('glass_type'), 'GLAZING');
  assert.equal(canonicalStageForSlot('installation_environment'), 'INSTALLATION_SURVEY');
  assert.deepEqual(INSTALLATION_ENVIRONMENT_CANONICAL_VALUES, ['BATHROOM','NON_BATHROOM']);
  assert.ok(NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER.indexOf('screen_net') < NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER.indexOf('glass_base'));
  assert.ok(NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER.indexOf('glass_type') < NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER.indexOf('glass_detail'));
  assert.ok(NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER.indexOf('glass_detail') < NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER.indexOf('glass_function'));
  assert.ok(NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER.indexOf('glass_air_layer') < NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER.indexOf('installation_environment'));
  assert.ok(NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER.indexOf('installation_environment') < NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER.indexOf('option'));
});

test('glazing value classifier separates appearance, detail, function and technical composition', () => {
  assert.equal(classifyGlazingChoice({ displayLabel:'型板' }), 'APPEARANCE');
  assert.equal(classifyGlazingChoice({ displayLabel:'フロスト' }), 'APPEARANCE');
  assert.equal(classifyGlazingChoice({ displayLabel:'Low-E グリーン（高遮熱仕様）' }), 'DETAIL');
  assert.equal(classifyGlazingChoice({ displayLabel:'安全合わせ' }), 'FUNCTION');
  assert.equal(classifyGlazingChoice({ displayLabel:'3-Ar16-LowE3（クリア）' }), 'TECHNICAL_COMPOSITION');
  assert.equal(classifyGlazingChoice({ displayLabel:'フロスト／型板' }), 'AMBIGUOUS_APPEARANCE');
});

test('clean canonical glazing slots pass semantic audit', () => {
  const fields = [
    { key:'glass_type', semanticSlot:'glass_type', values:[{displayLabel:'透明'},{displayLabel:'型板'},{displayLabel:'フロスト'},{displayLabel:'乳白'}] },
    { key:'glass_detail', semanticSlot:'glass_detail', values:[{displayLabel:'内外Low-Eクリア'},{displayLabel:'内外Low-Eグリーン'},{displayLabel:'高日射取得'}] },
    { key:'glass_function', semanticSlot:'glass_function', values:[{displayLabel:'なし（標準）'},{displayLabel:'安全合わせ'},{displayLabel:'防災安全合わせ'},{displayLabel:'強化'}] },
  ];
  for (const field of fields) assert.deepEqual(auditCanonicalGlazingField(field).issues, []);
});

test('mixed appearance and functions in one canonical function slot fail closed', () => {
  const audit = auditCanonicalGlazingField({
    key:'glass_additional', semanticSlot:'glass_function', values:[
      {displayLabel:'なし'},{displayLabel:'型板'},{displayLabel:'フロスト'},{displayLabel:'安全合わせ'},{displayLabel:'ブラインドイン'},
    ],
  });
  assert.ok(audit.issues.some((row)=>row.code==='GLAZING_SLOT_SEMANTIC_MISMATCH'));
  assert.ok(audit.issues.some((row)=>row.code==='GLAZING_MIXED_SEMANTICS'));
});

test('technical glass makeup cannot masquerade as user-facing glass detail', () => {
  const audit = auditCanonicalGlazingField({
    key:'glass_detail', semanticSlot:'glass_detail', values:[
      {displayLabel:'3-Ar16-LowE3（クリア）'},{displayLabel:'4-Ar15-LowE3（クリア）'},
    ],
  });
  assert.ok(audit.issues.every((row)=>row.code==='GLAZING_TECHNICAL_COMPOSITION_EXPOSED'));
});

test('combined frost/pattern value is an ambiguous appearance and cannot pass as a function', () => {
  const audit = auditCanonicalGlazingField({
    key:'glass_function', semanticSlot:'glass_function', values:[
      {displayLabel:'フロスト／型板'},{displayLabel:'安全合わせ'},
    ],
  });
  assert.ok(audit.issues.some((row)=>row.code==='GLAZING_AMBIGUOUS_APPEARANCE_VALUE'));
});
