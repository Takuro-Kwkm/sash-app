import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {adaptComposedProductRuntime} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {applyDeclaredWindowFlow} from '../src/catalog/runtime-master/declared-window-flow.mjs';
import {GLOBAL_WINDOW_STAGE_ORDER} from '../src/catalog/runtime-master/global-window-selection-flow-engine.mjs';
import {applyDeclaredInputClears,createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {selectorMatches,buildCatalogContext} from '../src/catalog/selector.mjs';
const root=new URL('../changes/apw511-runtime-ui-r3/',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root)));
const entry=read('index.json').products[0],doc=read(entry.path),master=read('sources/PRODUCT_MASTER.json');
const reader=await adaptComposedProductRuntime(doc,entry,()=>{throw Error('UNBOUND_REFERENCE');});
const sample=master.handoff_tests.find(t=>t.case_id==='T_REQUEST');
const base={...sample.before,...sample.changes,request_quantity:2,shutter_requested:false};
const ui=input=>{const r=reader.uiResolver(input);r.fields=applyDeclaredWindowFlow(r.fields,entry);return r;};
const f=(r,key)=>r.fields.find(f=>f.key===key);
function change(r,key,value){return ui(applyDeclaredInputClears({...r.selection,[key]:value},[key],r.fields));}

test('R3 keeps Formal source and predecessor bytes and capabilities',()=>{
 assert.equal(createHash('sha256').update(readFileSync(new URL('sources/PRODUCT_MASTER.json',root))).digest('hex'),'f23760a601229f31bfcd4fdc5b3be6fc64a3392cff8eda31283bc4d3381c043b');
 assert.equal(master.fields.length,40);assert.equal(master.constraints.length,16);
 assert.equal(doc.formal_adoption,false);assert.equal(doc.source_adoption,false);
});
test('standard mode has a size selector; custom mode alone has numeric W/H',()=>{
 const standard=ui(base);assert.equal(f(standard,'standard_size').dataType,'ENUM');
 assert.ok(!f(standard,'sash_width_mm'));assert.ok(!f(standard,'sash_height_mm'));
 assert.ok(f(standard,'standard_size').values.some(v=>v.displayLabel==='W 1640 × H 2030 mm'));
 const custom=change(standard,'size_mode','サイズオーダー');
 assert.ok(!f(custom,'standard_size'));assert.equal(f(custom,'sash_width_mm').dataType,'NUMBER');
 assert.equal(custom.selection.sash_width_mm,undefined);assert.equal(custom.selection.sash_height_mm,undefined);
});
test('every displayed standard tuple is admitted in its exact source context',()=>{
 const context=buildCatalogContext(doc.product_module,entry.id);
 const rule=doc.product_module.ruleSets.find(r=>r.type==='SELECTION_VALIDATION').payload.rules.find(r=>r.id==='R_STANDARD_CELL');
 const view=doc.selection_views.find(v=>v.key==='standard_size');let checked=0;
 for(const construction of ['在来工法','2×4工法'])for(const window_type of ['片引き窓（偏芯）','片引き窓（均等）','両袖片引き窓','FIX窓'])for(const fix_type of window_type==='FIX窓'?['窓タイプ','テラスタイプ']:[undefined]){
  const r=ui({construction,window_type,fix_type,size_mode:'規格',shutter_requested:false});
  for(const value of f(r,'standard_size').values){
   const assign=view.choices.find(c=>c.value===value.value).assign;
   assert.equal(selectorMatches(rule.when,{...r.selection,...assign},context),false);checked++;
  }
 }
 assert.equal(checked,154);
 const outside=ui({...base,standard_size:'730x770'});assert.equal(outside.selection.standard_size,undefined);assert.equal(outside.selection.sash_width_mm,undefined);
});
test('parent changes clear the tuple and hidden source dimensions, while valid color survives',()=>{
 const before=ui(base),after=change(before,'construction','2×4工法');
 for(const key of ['standard_size','sash_width_mm','sash_height_mm'])assert.equal(after.selection[key],undefined,key);
 assert.equal(after.selection.exterior_color,'H2');assert.ok(after.validation.missingRequiredFields.includes('standard_size'));
});
test('shutter intent distinguishes undecided, no request and a request requiring type',()=>{
 const unknown=ui({...base,shutter_requested:undefined});assert.ok(unknown.validation.missingRequiredFields.includes('shutter_requested'));
 const none=ui(base);assert.deepEqual(f(none,'shutter_requested').values.map(v=>v.displayLabel),['希望しない','希望する']);assert.ok(!f(none,'shutter_type'));
 const yes=change(none,'shutter_requested',true);assert.ok(f(yes,'shutter_type'));assert.ok(yes.validation.missingRequiredFields.includes('shutter_type'));
 let selected=change(yes,'shutter_type','リモコンシャッター');const box=f(selected,'shutter_box').values[0].value;
 selected=change(selected,'shutter_box',box);const removed=change(selected,'shutter_requested',false);
 for(const key of ['shutter_type','shutter_box','shutter_color','shutter_jema','shutter_emergency'])assert.equal(removed.selection[key],undefined,key);
 assert.equal(removed.sales_request_handoff.request_choices.shutter_requested,false);
 const again=change(removed,'shutter_requested',true);assert.equal(again.selection.shutter_type,undefined);
});
test('FIX removes shutter, handing and screen controls; glass still respects source restrictions',()=>{
 const fix=change(ui(base),'window_type','FIX窓');
 for(const key of ['shutter_requested','shutter_type','handing','screen_requested','screen_specification'])assert.ok(!f(fix,key),key);
 const high=ui({...base,standard_size:'1640x2530'});assert.deepEqual(f(high,'glass_specification').values.map(v=>v.value),['Low-E複層ガラス']);
});
test('actual visible fields follow the canonical TW/Thermos stage sequence',()=>{
 const r=ui(base);const stages=r.fields.map(f=>GLOBAL_WINDOW_STAGE_ORDER.indexOf(f.semanticStage));
 assert.ok(stages.every((n,i)=>!i||n>=stages[i-1]));
 const keys=r.fields.map(f=>f.key);assert.ok(keys.indexOf('installation_environment')<keys.indexOf('main_options'));
 for(const field of r.fields)for(const parent of field.parentFields??[])if(keys.includes(parent))assert.ok(keys.indexOf(parent)<keys.indexOf(field.key),parent+'>'+field.key);
});
test('saved snapshots retain standard dimensions and explicit no-request without granting manufacturing',()=>{
 const r=ui(base),snapshot=createProductConfigurationSnapshot({product:{...entry,sourceType:'RUNTIME_MASTER'},result:r});
 const restored=ui(JSON.parse(JSON.stringify(snapshot.configuration)));
 assert.equal(restored.selection.standard_size,'1640x2030');assert.equal(restored.selection.shutter_requested,false);
 assert.deepEqual(restored.sales_request_handoff.dimensions,{width:1640,height:2030,label:'サッシ外寸 W / H',unit:'mm'});
 assert.equal(restored.orderReady,false);assert.deepEqual(restored.pricing,{price:null,bom:null,set_code:null});
});
