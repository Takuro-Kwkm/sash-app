import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {applyDeclaredWindowFlow,validateReviewedWindowFlow} from '../src/catalog/runtime-master/declared-window-flow.mjs';
import {adaptComposedProductRuntime,migrateCandidateSelection,resolveMigratedCandidateSelection} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {getRuntimeAppIntegration} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {loadRegisteredRuntime} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
const root=resolve('changes/replus-runtime-v5'),index=JSON.parse(readFileSync(resolve(root,'index.json')));
const readers=new Map();
async function ui(component,input={}){
 const entry=index.products.find(r=>r.id==='CANDIDATE:'+component);
 if(!readers.has(component))readers.set(component,await adaptComposedProductRuntime(JSON.parse(readFileSync(resolve(root,entry.path))),entry,async id=>{const meta=getRuntimeAppIntegration(id);return loadRegisteredRuntime(meta.manufacturer,meta.series);}));
 const result=readers.get(component).uiResolver(input);result.fields=applyDeclaredWindowFlow(result.fields,entry);return result;
}
const field=(r,key)=>r.fields.find(f=>f.key===key);
const positions=r=>new Map(r.fields.map((f,i)=>[f.key,i]));
test('reviewed role data covers every projected field and has no unknown survey fallback',()=>{
 for(const row of index.products){
  validateReviewedWindowFlow(row.uiFlowContract);
  const module=JSON.parse(readFileSync(resolve(root,row.path)));
  for(const definition of module.product_module.specificationDefinitions){
   const role=row.uiFlowContract.fields[definition.key];assert.ok(role.meaning&&role.sourceRefs.length);assert.equal(role.label,definition.displayLabel);
  }
  assert.equal(row.uiFlowContract.formalAdoption,false);
 }
 const row=index.products[0];assert.throws(()=>applyDeclaredWindowFlow([{key:'unreviewed_field',dataType:'ENUM',values:[]}],row),/not mapped/);
});
test('cycles, undeclared parents and canonical semantic drift are refused',()=>{
 const base=index.products[0].uiFlowContract;
 for(const mutate of [c=>c.fields.window_type.parents.push('frame_type'),c=>c.fields.window_type.parents.push('missing'),c=>c.fields.window_type.stage='FINISH']){
  const c=structuredClone(base);mutate(c);assert.throws(()=>validateReviewedWindowFlow(c),/WINDOW_FLOW_/);
 }
});
test('installation labels are distinct and survey dimensions are not production dimensions',async()=>{
 const room=await ui('RPL_ROOM');assert.equal(field(room,'installation_room'),undefined);assert.equal(field(room,'work_space'),undefined);
 const attach=await ui('RPL_ATT_TH');assert.equal(field(attach,'survey_w').presentationGroup.id,'survey');assert.match(field(attach,'survey_w').fieldMeaning,/製品仕上がり寸法とは区別/);
 const ew=await ui('RPL_EW',{window_type:'RPL_EW_SLD'});assert.equal(field(ew,'spec_crescent_position').displayLabel,'クレセント位置');assert.equal(field(ew,'interior_resin_cover_color').displayLabel,'室内カバー色（内観色に連動）');
});
test('selected part precedes its color, and removing the part clears its color',async()=>{
 for(const component of ['RPL_ROOM','RPL_TW','RPL_EW','RPL_ATT_TW','RPL_ATT_TH']){
  const row=index.products.find(r=>r.id==='CANDIDATE:'+component),doc=JSON.parse(readFileSync(resolve(root,row.path)));
  const definition=doc.product_module.specificationDefinitions.find(f=>f.key==='wooden_casing_color');const casing=definition.selector.options.$contains;
  const r=await ui(component,{options:[casing],wooden_casing_color:'D'}),p=positions(r);
  assert.ok(p.get('options')<p.get('wooden_casing_color'));assert.equal(r.selection.wooden_casing_color,'D');
  const clear=await ui(component,{...r.selection,options:[]});assert.equal(clear.selection.wooden_casing_color,undefined);assert.ok(clear.clearedFields.includes('wooden_casing_color'));
 }
});
test('glass axes are separate; category change clears incompatible details',async()=>{
 const room=await ui('RPL_ROOM',{window_type:'RPL_ROOM_SLD',glass_category:'Low-E複層ガラス',glass:'GL-LOWE-CLEAR'});
 assert.equal(room.selection.glass,'GL-LOWE-CLEAR');assert.ok(!field(room,'glass').values.some(v=>v.value==='GL-SAFETY'));
 const next=await ui('RPL_ROOM',{...room.selection,glass_category:'複層ガラス'});assert.equal(next.selection.glass,undefined);assert.deepEqual(field(next,'glass').values.map(v=>v.value),['GL-PG']);
 const tw=await ui('RPL_TW',{window_type:'RPL_TW_SLD',glass_category:'TW-GL-TRIPLE',glass:'TW-GL-CC',glass_gas:'TW-GAS-ARGON',glass_spacer:'TW-SPACER-RESIN'});
 assert.equal(tw.selection.glass_gas,'TW-GAS-ARGON');assert.equal(tw.selection.glass_spacer,'TW-SPACER-RESIN');assert.ok(field(tw,'glass').values.every(v=>!v.value.includes('GAS')&&!v.value.includes('SPACER')));
});
test('EW sash specification controls glazing; restricted regions and conflict choices stay closed',async()=>{
 let r=await ui('RPL_EW',{window_type:'RPL_EW_SLD',spec_sash_configuration:'EW-SS-PG'});
 assert.deepEqual(field(r,'glass_category').values.map(v=>v.value),['EW-GL-DOUBLE']);
 r=await ui('RPL_EW',{...r.selection,glass_category:'EW-GL-DOUBLE'});assert.ok(field(r,'glass').values.some(v=>v.value==='EW-D-CLEAR'));assert.ok(!field(r,'glass').values.some(v=>v.value==='EW-D-BRONZE'));
 r=await ui('RPL_EW',{...r.selection,installation_region:'北海道',glass:'EW-D-BRONZE'});assert.equal(r.selection.glass,'EW-D-BRONZE');
 r=await ui('RPL_EW',{...r.selection,installation_region:'その他地域'});assert.equal(r.selection.glass,undefined);
 const tw=await ui('RPL_TW',{window_type:'RPL_TW_SLD',glass_category:'TW-GL-TRIPLE'});assert.ok(!field(tw,'glass').values.some(v=>v.value==='TW-GL-GC-REVIEW'));
});
test('bathroom glass respects bridge frame, gas and triple window prerequisites',async()=>{
 let r=await ui('RPL_BATH',{window_type:'RPL_BATH_SLD',frame_type:'BATH-BRG'});
 assert.deepEqual(field(r,'glass_category').values.map(v=>v.value),['LOW_E_DOUBLE']);
 r=await ui('RPL_BATH',{...r.selection,glass_category:'LOW_E_DOUBLE'});assert.deepEqual(field(r,'glass_gas').values.map(v=>v.value),['ARGON']);
 r=await ui('RPL_BATH',{...r.selection,glass_gas:'ARGON'});assert.deepEqual(field(r,'glass_spacer').values.map(v=>v.value),['RESIN']);
 const dh=await ui('RPL_BATH',{window_type:'RPL_BATH_DHFS',frame_type:'BATH-STD'});assert.ok(field(dh,'glass_category').values.some(v=>v.value==='TRIPLE'));
});
test('fixed native reference standard and custom paths preserve semantic order',async()=>{
 for(const row of index.products){
  const doc=JSON.parse(readFileSync(resolve(root,row.path)));
  for(const binding of (doc.composition?.bindings??[]).filter(b=>b.executable)){
   let input={referenced_series_id:binding.series_id,referenced_window_id:binding.window_id};
   for(const mode of [null,'STANDARD','CUSTOM']){
    if(mode)input.new_sash_size_mode=mode;
    const r=await ui(doc.baseline.component_id,input),p=positions(r);
    for(const f of r.fields)for(const parent of f.parentFields??[])if(p.has(parent)&&!row.uiFlowContract.fields[f.key]?.deferredEvaluationParents?.includes(parent))assert.ok(p.get(parent)<p.get(f.key),binding.window_id+':'+parent+'>'+f.key);
    if(mode==='CUSTOM'&&field(r,'new_sash_custom_width'))assert.equal(field(r,'new_sash_custom_width').presentationGroup.id,'size');
    assert.equal(r.orderReady,false);
   }
  }
 }
});
test('legacy glazing migration is explicit, preserves matching details and cannot rerun as user edits',()=>{
 const module=JSON.parse(readFileSync(resolve(root,'candidates/RPL_TW.module.json')));
 assert.deepEqual(migrateCandidateSelection({glass:'TW-GAS-ARGON'},module.selection_migrations),{glass_gas:'TW-GAS-ARGON'});
 assert.deepEqual(migrateCandidateSelection({glass:'TW-GL-CC'},module.selection_migrations),{glass:'TW-GL-CC',glass_category:'TW-GL-TRIPLE'});
 // Migration is invoked only with a differing saved configurationVersion in the preview API.
 assert.deepEqual(migrateCandidateSelection({glass:'UNKNOWN'},module.selection_migrations),{glass:'UNKNOWN'});
});
test('sash choices follow the declared panel and height prerequisites',async()=>{
 let r=await ui('RPL_TW',{window_type:'RPL_TW_SLD',spec_panel_configuration:'TW-SS-PANEL-2',frame_type:'RPL_TW_FRAME',size_mode:'CUSTOM',custom_width:1000,custom_height:1800,spec_sash_configuration:'TW-SS-WASHI'});assert.equal(r.selection.spec_sash_configuration,'TW-SS-WASHI');
 r=await ui('RPL_TW',{...r.selection,spec_panel_configuration:'TW-SS-PANEL-4'});assert.equal(r.selection.spec_sash_configuration,undefined);assert.ok(!field(r,'spec_sash_configuration').values.some(v=>v.value==='TW-SS-WASHI'));
 r=await ui('RPL_TW',{...r.selection,custom_width:2500,custom_height:1200,spec_sash_configuration:'TW-SS-HANDLE'});assert.deepEqual(field(r,'spec_sash_configuration').values.map(v=>v.value),['TW-SS-TG']);assert.equal(r.selection.spec_sash_configuration,undefined);
 const room=await ui('RPL_ROOM',{window_type:'RPL_ROOM_SLD',frame_type:'RPL_STD',size_mode:'CUSTOM',custom_width:2000,custom_height:1000,spec_panel_configuration:'SS-SLD-PANEL-4'});assert.deepEqual(field(room,'spec_sash_configuration').values.map(v=>v.value),['SS-SLD-PG']);
});
test('bathroom mode precedes opening pattern; a mode change clears the pattern',async()=>{
 let r=await ui('RPL_BATH',{bathroom_remodel_mode:'SYSTEM_BATH_SIMULTANEOUS',bathroom_opening_pattern:'FULL95'}),p=positions(r);assert.ok(p.get('bathroom_remodel_mode')<p.get('bathroom_opening_pattern'));assert.equal(r.selection.bathroom_opening_pattern,'FULL95');
 r=await ui('RPL_BATH',{...r.selection,bathroom_remodel_mode:'WINDOW_ONLY'});assert.equal(r.selection.bathroom_opening_pattern,undefined);assert.equal(field(r,'bathroom_opening_pattern'),undefined);
});
test('migration retains original saved input for review without leaking to a different product',async()=>{
 const {createProductConfigurationSnapshot}=await import('../src/work-management/domain.mjs');
 const {withConfigurationMigrationAudit}=await import('../src/work-management/configuration-migration.mjs');
 const product={id:'CANDIDATE:RPL_TW',manufacturer:'LIXIL',series:'TW'};
 const result={source:'RUNTIME_MASTER',selection:{glass_category:'TW-GL-TRIPLE',glass:'TW-GL-CC'},fields:[],validation:{errors:[],missingRequiredFields:[]},runtimeMaster:{packageVersion:'V7'},configurationMigration:{from:'V6',to:'V7',originalSelection:{glass:'TW-GL-CC'}}};
 const first=withConfigurationMigrationAudit(createProductConfigurationSnapshot({product,result}),null,result.configurationMigration);assert.deepEqual(first.configuration_migration.originalSelection,{glass:'TW-GL-CC'});
 const next=withConfigurationMigrationAudit(createProductConfigurationSnapshot({product,result:{...result,configurationMigration:undefined},previousSnapshot:first}),first);assert.deepEqual(next.configuration_migration,first.configuration_migration);
 const different=withConfigurationMigrationAudit(createProductConfigurationSnapshot({product:{...product,id:'OTHER'},result:{...result,configurationMigration:undefined},previousSnapshot:first}),first);assert.equal(different.configuration_migration,undefined);
});
test('legacy gas survives a declared fixed base; missing window context is not fabricated',async()=>{
 await ui('RPL_TW');const doc=JSON.parse(readFileSync(resolve(root,'candidates/RPL_TW.module.json')));
 const known=resolveMigratedCandidateSelection(readers.get('RPL_TW'),{window_type:'RPL_TW_SLD',glass:'TW-GAS-ARGON'},doc.selection_migrations);assert.equal(known.selection.glass_category,'TW-GL-TRIPLE');assert.equal(known.selection.glass_gas,'TW-GAS-ARGON');
 const missing=resolveMigratedCandidateSelection(readers.get('RPL_TW'),{glass:'TW-GAS-ARGON'},doc.selection_migrations);assert.equal(missing.selection.window_type,undefined);assert.equal(missing.selection.glass_category,undefined);assert.equal(missing.selection.glass_gas,undefined);
});
