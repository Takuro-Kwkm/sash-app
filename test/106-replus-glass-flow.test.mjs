import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {adaptComposedProductRuntime} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {applyDeclaredWindowFlow,validateReviewedWindowFlow} from '../src/catalog/runtime-master/declared-window-flow.mjs';
import {getRuntimeAppIntegration} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {loadRegisteredRuntime} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
const root=resolve('changes/replus-runtime-v5'),index=JSON.parse(readFileSync(resolve(root,'index.json'))),readers=new Map();
async function ui(component,input={}){
 const entry=index.products.find(row=>row.id==='CANDIDATE:'+component);
 if(!readers.has(component))readers.set(component,await adaptComposedProductRuntime(JSON.parse(readFileSync(resolve(root,entry.path))),entry,async id=>{const meta=getRuntimeAppIntegration(id);return loadRegisteredRuntime(meta.manufacturer,meta.series);}));
 const result=readers.get(component).uiResolver(input);result.fields=applyDeclaredWindowFlow(result.fields,entry);return result;
}
const field=(r,key)=>r.fields.find(f=>f.key===key);
const values=(r,key)=>field(r,key)?.values.map(v=>v.value)??[];
test('official double and triple functions restore separate functional and appearance axes',async()=>{
 for(const [component,seed,expected] of [
  ['RPL_ROOM',{window_type:'RPL_ROOM_SLD',frame_type:'RPL_STD',glass_category:'Low-E複層ガラス',glass:'GL-LOWE-CLEAR'},['NONE','GL-SAFETY','DISASTER','MILKY','GRID','BLIND']],
  ['RPL_TW',{window_type:'RPL_TW_SLD',glass_category:'TW-GL-TRIPLE',glass:'TW-GL-CC'},['NONE','SAFETY','DISASTER','MILKY','THIN']],
  ['RPL_EW',{window_type:'RPL_EW_SLD',spec_sash_configuration:'EW-SS-PG',glass_category:'EW-GL-DOUBLE',glass:'EW-D-CLEAR'},['NONE','SAFETY','MILKY']],
  ['RPL_BATH',{window_type:'RPL_BATH_SLD',frame_type:'BATH-STD',glass_category:'LOW_E_DOUBLE',glass:'BATH-GL-LOWE-CLEAR'},['NONE','SAFETY','DISASTER','MILKY','GRID','BLIND']],
 ]){
  const r=await ui(component,seed);assert.deepEqual(values(r,'glass_function'),expected.filter(v=>v!=='MILKY'),component);
  assert.deepEqual(values(r,'glass_appearance'),['CLEAR','OBSCURE','FROST','MILKY']);
  assert.equal(field(r,'glass_gas').displayLabel,'中空層');
  const conflict=await ui(component,{...r.selection,glass_function:'MILKY',glass_appearance:'CLEAR'});
  assert.equal(conflict.selection.glass_appearance,'CLEAR');assert.equal(conflict.selection.glass_function,undefined);assert.ok(conflict.clearedFields.includes('glass_function'));
  const white=await ui(component,{...r.selection,glass_appearance:'MILKY'});assert.deepEqual(values(white,'glass_function'),['MILKY']);
  const selectedWhite=await ui(component,{...white.selection,glass_function:'MILKY'});assert.equal(selectedWhite.selection.glass_appearance,'MILKY');assert.equal(selectedWhite.selection.glass_function,'MILKY');
  assert.equal(r.orderReady,false);assert.equal(r.pricing.price,null);
  assert.ok(field(r,'glass_function').values.filter(v=>v.value!=='NONE').every(v=>v.manualCheck));
 }
});
test('cavity and spacer follow glass family and bridge-frame restrictions',async()=>{
 const seed={window_type:'RPL_ROOM_SLD',frame_type:'RPL_STD',glass_category:'Low-E複層ガラス',glass:'GL-LOWE-CLEAR'};
 let r=await ui('RPL_ROOM',seed);assert.deepEqual(values(r,'glass_gas'),['DRY_AIR','ARGON']);
 r=await ui('RPL_ROOM',{...seed,glass_gas:'ARGON'});assert.deepEqual(values(r,'glass_spacer'),['ALUMINUM','RESIN']);
 r=await ui('RPL_ROOM',{...seed,glass_gas:'DRY_AIR',glass_spacer:'RESIN'});assert.deepEqual(values(r,'glass_spacer'),['ALUMINUM']);assert.equal(r.selection.glass_spacer,undefined);
 r=await ui('RPL_ROOM',{...seed,frame_type:'RPL_BRIDGE',glass_gas:'DRY_AIR',glass_spacer:'ALUMINUM'});assert.deepEqual(values(r,'glass_category'),['Low-E複層ガラス']);assert.deepEqual(values(r,'glass_gas'),['ARGON']);assert.equal(r.selection.glass_gas,undefined);assert.equal(r.selection.glass_spacer,undefined);
 r=await ui('RPL_ROOM',{...seed,frame_type:'RPL_BRIDGE',glass_gas:'ARGON'});assert.deepEqual(values(r,'glass_spacer'),['RESIN']);
 r=await ui('RPL_ROOM',{window_type:'RPL_ROOM_DHFS',frame_type:'RPL_STD',glass_category:'トリプル',glass:'GL-TRIPLE-DHFS',glass_gas:'KRYPTON',glass_function:'GRID'});assert.deepEqual(values(r,'glass_gas'),['ARGON','KRYPTON']);assert.ok(values(r,'glass_function').includes('THIN'));assert.ok(!values(r,'glass_function').includes('GRID'));assert.equal(r.selection.glass_function,undefined);
 const pg=await ui('RPL_ROOM',{...seed,glass_category:'複層ガラス',glass:'GL-PG',glass_gas:'ARGON'});assert.deepEqual(values(pg,'glass_gas'),['DRY_AIR']);assert.equal(pg.selection.glass_gas,undefined);
});
test('measured and product dimensions are the final groups across all seven specifications',async()=>{
 for(const row of index.products){
  const doc=JSON.parse(readFileSync(resolve(root,row.path))),binding=doc.composition?.bindings.find(b=>b.executable);
  const seed=binding?{referenced_series_id:binding.series_id,referenced_window_id:binding.window_id,new_sash_size_mode:'CUSTOM'}:{window_type:doc.product_module.allowedValues.find(v=>v.specificationKey==='window_type')?.value,size_mode:'CUSTOM'};
  const r=await ui(doc.baseline.component_id,seed);
  let dimensionsStarted=false;
  for(const f of r.fields){
   const dimension=['survey','size'].includes(f.presentationGroup.id);
   if(dimension)dimensionsStarted=true;else assert.equal(dimensionsStarted,false,row.id+':'+f.key);
  }
  assert.ok(dimensionsStarted);
 }
});
test('late evaluation context preserves dependencies without allowing undeclared parents or cycles',()=>{
 const base=index.products.find(r=>r.id==='CANDIDATE:RPL_ATT_TH').uiFlowContract;
 validateReviewedWindowFlow(base);
 for(const change of [
  c=>{c.fields.referenced_series_id.deferredEvaluationParents=['missing'];},
  c=>{c.fields.referenced_series_id.parents.push('new_sash_size_mode');c.fields.referenced_series_id.deferredEvaluationParents=['new_sash_size_mode'];},
  c=>{c.fields.window_type={label:'x',meaning:'x',sourceRefs:[{}],slot:'window_type',stage:'OPENING',group:'opening',rank:-1,parents:['new_sash_size_mode'],deferredEvaluationParents:['new_sash_size_mode']};c.fields.new_sash_size_mode.parents.push('window_type');},
 ]){const c=structuredClone(base);change(c);assert.throws(()=>validateReviewedWindowFlow(c),/WINDOW_FLOW_/);}
});
