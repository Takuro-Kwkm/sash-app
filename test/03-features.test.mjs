import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../src/catalog/catalog-adapter.mjs';
import { CURRENT_WINDOW_SERIES_MODULES } from '../src/catalog/modules/current-window-series.mjs';
import { getAllowedValues, stabilizeSelection, unresolvedRequiredFields } from '../src/catalog/catalog-resolver.mjs';
const c=createCatalog(CURRENT_WINDOW_SERIES_MODULES), p='SER-LIX-SAMOS2H';
const values=(key,sel)=>getAllowedValues(c,p,key,sel).map(x=>x.value);
const field=(sel,key)=>stabilizeSelection(c,p,sel).fields.find(x=>x.key===key);

test('17 FIX single windows have no screen field',()=>{assert.equal(field({window_type:'WT-S2H-FIX-OUT'},'screen_presence'),undefined);assert.equal(field({window_type:'WT-S2H-FIX-IN'},'screen_presence'),undefined);});
test('18 vertical OP/CAM map to fixed/roll screens',()=>{assert.deepEqual(values('screen_form',{window_type:'WT-S2H-TATE-SUBERI',handle_configuration:'SP-S2H-TATE-OP-T',screen_presence:'あり'}),['固定式網戸']);assert.deepEqual(values('screen_form',{window_type:'WT-S2H-TATE-SUBERI',handle_configuration:'SP-S2H-TATE-CAM-T',screen_presence:'あり'}),['横引きロール網戸']);});
test('19 pet net obeys actual W <= 780',()=>{assert.equal(values('screen_net',{screen_form:'引違い網戸',size:'SZ-S2H-00001'}).includes('ペットネット'),false);assert.equal(values('screen_net',{screen_form:'引違い網戸',size:'SZ-S2H-00093'}).includes('ペットネット'),true);});
test('20 pattern glass obeys size master',()=>{assert.deepEqual(values('glass_type',{size:'SZ-S2H-00001'}),['CLEAR']);assert.deepEqual(values('glass_type',{size:'SZ-S2H-00093'}),['CLEAR','PATTERN']);});
test('21 vent kitchen door auto-selects mandatory mesh grille',()=>{const r=stabilizeSelection(c,p,{window_type:'WT-S2H-KATTEGUCHI-VENT-FS'});assert.equal(r.selection.screen_presence,'あり');assert.equal(r.selection.screen_form,'網付格子');});
test('22 normal option catalog excludes maintenance rows',()=>{const opts=c.allowedValues.filter(x=>x.productId===p&&x.specificationKey==='options');assert.ok(opts.length>0);assert.equal(opts.some(x=>/施工|メンテ|交換/.test(x.displayLabel)),false);});
test('23 manual-check candidates do not block normal estimate',()=>{const policy=c.ruleSets.find(x=>x.id===`${p}:manual-check`);assert.equal(policy.payload.blocksNormalEstimate,false);assert.equal(policy.payload.windPressureInputVisible,false);assert.ok(!unresolvedRequiredFields(c,p,{window_type:'WT-S2H-HIKICHIGAI'}).includes('options'));});
test('24 canonical Golden Tests are 16/16 PASS',()=>{const m=CURRENT_WINDOW_SERIES_MODULES[0];assert.equal(m.goldenTests.length,16);assert.equal(m.goldenTests.every(x=>x['判定']==='PASS'),true);});
