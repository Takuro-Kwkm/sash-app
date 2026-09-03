import test from 'node:test';
import assert from 'node:assert/strict';
import {SAMOS2H_MODULE,SAMOS2H_DIMENSION_RULES} from '../src/catalog/modules/samos2h-assembly.mjs';

test('Samos2H v1.0 Runtime is regenerated from formal 06E CUSTOM rules',()=>{
  assert.equal(SAMOS2H_MODULE.product.source.id,'1kTRcb7UdghZl7h3lYdmnZuB7fUVUAduU');
  assert.equal(SAMOS2H_MODULE.product.source.sha256,'7ca8f5cca19187bfb841bc3f3393fb29de591dc554714627faf3a652130cd8a7');
  assert.equal(SAMOS2H_MODULE.runtimeRegeneration.version,'v1.0');
  assert.equal(SAMOS2H_DIMENSION_RULES.length,17);
  assert.equal(SAMOS2H_DIMENSION_RULES.filter((r)=>r.type==='COMPOUND_GATE').length,7);
  assert.equal(SAMOS2H_DIMENSION_RULES.filter((r)=>r.type==='SOURCE_GRAPH_GATE').length,10);
  assert.equal(SAMOS2H_DIMENSION_RULES.filter((r)=>r.automatic).length,0);
  assert.equal(SAMOS2H_MODULE.product.sourceInventory.selectableSizeRows,2131);
});

test('Samos2H inner-tilt formal rule preserves source-confirmed points and review safety',()=>{
  const rule=SAMOS2H_DIMENSION_RULES.find((r)=>r.id==='CR-S2H-012');
  assert.ok(rule);
  assert.equal(rule.window,'WT-S2H-UCHIDAOSHI');
  assert.equal(rule.type,'COMPOUND_GATE');
  assert.equal(rule.automatic,false);
  assert.deepEqual(rule.points,[[240,350],[240,943],[815,943],[815,755],[870,755],[870,500],[1690,500],[1690,350]]);
  assert.equal(rule.condition,'240<=W<=815:350<=H<=943;815<W<=870:350<=H<=755;870<W<=1690:350<=H<=500');
  assert.ok(rule.note.includes('RUNTIME_SAFETY_REVIEW_REQUIRED'));
});
