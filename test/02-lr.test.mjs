import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../src/catalog/catalog-adapter.mjs';
import { CURRENT_WINDOW_SERIES_MODULES } from '../src/catalog/modules/current-window-series.mjs';
import { stabilizeSelection } from '../src/catalog/catalog-resolver.mjs';
const c=createCatalog(CURRENT_WINDOW_SERIES_MODULES), p='SER-LIX-SAMOS2H';
const field=(sel,key)=>stabilizeSelection(c,p,sel).fields.find(x=>x.key===key);
const lr=(sel)=>field(sel,'handing')?.values.map(x=>x.value);

test('09 vertical T requires L/R',()=>assert.deepEqual(lr({window_type:'WT-S2H-TATE-SUBERI',handle_configuration:'SP-S2H-TATE-OP-T'}),['L','R']));
test('10 vertical TF requires L/R',()=>assert.deepEqual(lr({window_type:'WT-S2H-TATE-SUBERI',handle_configuration:'SP-S2H-TATE-OP-TF-OUT'}),['L','R']));
test('11 vertical TFT has no L/R field',()=>assert.equal(field({window_type:'WT-S2H-TATE-SUBERI',handle_configuration:'SP-S2H-TATE-OP-TFT-OUT'},'handing'),undefined));
test('12 horizontal sliding-out OP/CAM has no L/R field',()=>{assert.equal(field({window_type:'WT-S2H-YOKO-SUBERI',handle_type:'SP-S2H-YOKO-OP'},'handing'),undefined);assert.equal(field({window_type:'WT-S2H-YOKO-SUBERI',handle_type:'SP-S2H-YOKO-CAM'},'handing'),undefined);});
test('13 high horizontal sliding-out has L/R',()=>assert.deepEqual(lr({window_type:'WT-S2H-KOSHO-YOKO',operation_method:'SP-S2H-HIGH-CHAIN'}),['L','R']));
test('14 terrace/vent/kitchen doors have L/R',()=>{for(const sel of [{window_type:'WT-S2H-TERRACE-DOOR'},{window_type:'WT-S2H-KATTEGUCHI-VENT-FS'},{window_type:'WT-S2H-KATTEGUCHI',door_type:'SP-S2H-KD-WAIST'}])assert.deepEqual(lr(sel),['L','R']);});
test('15 decorative HK has L/R',()=>assert.deepEqual(lr({window_type:'WT-S2H-KAZARI-HIKI',joinery_configuration:'SP-S2H-KAZARI-HK'}),['L','R']));
test('16 switching L/R-applicable to non-applicable clears downstream',()=>{const r=stabilizeSelection(c,p,{window_type:'WT-S2H-TATE-SUBERI',handle_configuration:'SP-S2H-TATE-OP-TFT-OUT',handing:'L',size:'SZ-S2H-01556',exterior_color:'EXT-T'});assert.equal(r.selection.handing,undefined);assert.equal(r.selection.size,undefined);});
