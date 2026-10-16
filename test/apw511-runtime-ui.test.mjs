import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {adaptComposedProductRuntime} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {applyDeclaredWindowFlow} from '../src/catalog/runtime-master/declared-window-flow.mjs';
import {applyDeclaredInputClears} from '../src/work-management/domain.mjs';
const base=new URL('../changes/apw511-runtime-ui-r2/',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,base)));
const entry=read('index.json').products[0],doc=read(entry.path),master=read(doc.baseline.path);
const reader=await adaptComposedProductRuntime(doc,entry,()=>{throw Error('UNBOUND_REFERENCE');});
const sample=master.handoff_tests.find(t=>t.case_id==='T_REQUEST');
const input={...sample.before,...sample.changes,request_quantity:2};
test('adopted snapshot bytes and all 40 field definitions are preserved',()=>{
 assert.equal(createHash('sha256').update(readFileSync(new URL(doc.baseline.path,base))).digest('hex'),doc.baseline.sha256);
 assert.equal(doc.product_module.specificationDefinitions.length,40);
 assert.equal(master.lifecycle_status,'QA_READY');
 assert.equal(doc.formal_adoption,false);
});
test('global new construction flow orders size, finish, screen and glass with every parent before child',()=>{
 const fields=applyDeclaredWindowFlow(reader.uiResolver(input).fields,entry),keys=fields.map(f=>f.key);
 const before=(a,b)=>assert.ok(keys.indexOf(a)<keys.indexOf(b),`${a} before ${b}`);
 before('window_type','construction');before('construction','sash_width_mm');before('sash_width_mm','exterior_color');before('exterior_color','interior_color');before('interior_color','screen_requested');before('screen_specification','glass_specification');before('glass_specification','glass_surface');before('glass_surface','glass_solar');before('glass_solar','glass_color');before('spacer','gas');
 assert.ok(!keys.includes('estimator_confirmation')&&!keys.includes('manufacture_confirmation'));
});
test('explicit parent CLEAR empties dimensions and propagates, unrelated valid color survives',()=>{
 const next=applyDeclaredInputClears({...input,window_type:'FIX窓'},['window_type'],doc.product_module.specificationDefinitions);
 assert.equal(next.sash_width_mm,undefined);assert.equal(next.sash_height_mm,undefined);assert.equal(next.handing,undefined);assert.equal(next.exterior_color,input.exterior_color);
 const resolved=reader.uiResolver(next);assert.equal(resolved.selection.screen_requested,undefined);assert.equal(resolved.selection.screen_specification,undefined);assert.equal(resolved.selection.handle_color,undefined);
});
test('selectable construction, boolean false and free text survive the shared runtime',()=>{
 const r=reader.uiResolver({...input,site_conditions:'現場採寸待ち',raw_measurements:'ROW原文：未換算'});
 assert.equal(r.selection.construction,'在来工法');assert.equal(r.selection.standalone_fire_use,false);assert.equal(r.selection.site_conditions,'現場採寸待ち');assert.equal(r.selection.raw_measurements,'ROW原文：未換算');
});
test('color changes reevaluate only invalid values and labels are official Japanese names',()=>{
 const r=reader.uiResolver({...input,exterior_color:'3B'});assert.equal(r.selection.interior_color,undefined);assert.equal(r.selection.handle_color,undefined);
 const option=r.fields.find(f=>f.key==='exterior_color').values.find(v=>v.value==='3B');assert.equal(option.displayLabel,'チーク（3B）');
});
test('numeric invalidity, known forbiddance and manufacturer confirmation stay separate',()=>{
 for(const patch of [{sash_width_mm:0},{sash_height_mm:-1},{request_quantity:0},{request_quantity:1.5},{standalone_fire_use:true}])assert.equal(reader.uiResolver({...input,...patch}).validation.status,'INVALID');
 const r=reader.uiResolver(input);assert.equal(r.validation.status,'MANUAL_CHECK');assert.equal(r.orderReady,false);assert.equal(r.sales_request_handoff.quantity,2);assert.equal(r.confirmationRequests.length,2);assert.equal(r.sales_request_handoff.manufacturing_approval,false);assert.deepEqual(r.pricing,{price:null,bom:null,set_code:null});
});
