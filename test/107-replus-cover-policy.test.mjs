import {spawnSync} from 'node:child_process';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {adaptComposedProductRuntime,migrateCandidateSelection} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {applyDeclaredWindowFlow} from '../src/catalog/runtime-master/declared-window-flow.mjs';
import {getRuntimeAppIntegration} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';import {loadRegisteredRuntime} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
const root='changes/replus-runtime-v5',index=JSON.parse(readFileSync(root+'/index.json')),readers=new Map();
async function ui(name,input={}){const e=index.products.find(e=>e.id==='CANDIDATE:'+name);if(!readers.has(name))readers.set(name,await adaptComposedProductRuntime(JSON.parse(readFileSync(root+'/'+e.path)),e,async id=>{const m=getRuntimeAppIntegration(id);return loadRegisteredRuntime(m.manufacturer,m.series)}));const r=readers.get(name).uiResolver(input);r.fields=applyDeclaredWindowFlow(r.fields,e);return r;}
const field=(r,k)=>r.fields.find(f=>f.key===k);
test('both cover colors follow body colors, override stale/tampered values, and clear when source is removed',async()=>{
 for(const name of ['RPL_ROOM','RPL_TW','RPL_EW','RPL_BATH']){
  const seed={sash_exterior_color:'G',sash_interior_color:name==='RPL_EW'?'F':'M',color_mode:'FREE',bathroom_remodel_mode:'WINDOW_ONLY',exterior_cover_color:'W',interior_cover_color:'P'};
  const r=await ui(name,seed),inside=name==='RPL_EW'?'interior_resin_cover_color':'interior_cover_color';
  assert.equal(r.selection.exterior_cover_color,'G',name);assert.equal(r.selection[inside],name==='RPL_EW'?'F':'M',name);
  for(const k of ['exterior_cover_color',inside])assert.ok(field(r,k).readOnly&&field(r,k).disabled);
  const changed=await ui(name,{...r.selection,sash_exterior_color:'T'});assert.equal(changed.selection.exterior_cover_color,'T');
  const cleared=await ui(name,{...changed.selection,sash_exterior_color:undefined});assert.equal(cleared.selection.exterior_cover_color,undefined);
 }
});
test('same/free mode preserves correct indoor palettes and black material code mapping',async()=>{
 let r=await ui('RPL_ROOM',{color_mode:'SAME',sash_exterior_color:'T',sash_interior_color:'C',interior_cover_color:'P'});
 assert.equal(r.selection.sash_interior_color,'M');assert.equal(r.selection.interior_cover_color,'M');assert.ok(field(r,'sash_interior_color').readOnly);
 r=await ui('RPL_ROOM',{...r.selection,sash_exterior_color:'K'});assert.equal(r.selection.sash_interior_color,'K');assert.equal(r.selection.interior_cover_color,'K');
 r=await ui('RPL_ROOM',{...r.selection,color_mode:'FREE'});assert.equal(r.selection.sash_interior_color,undefined);assert.equal(r.selection.interior_cover_color,undefined);
 r=await ui('RPL_ROOM',{...r.selection,sash_interior_color:'C'});assert.equal(r.selection.interior_cover_color,'C');assert.ok(!field(r,'sash_interior_color').readOnly);
});
test('bath system frame replaces the angle flow and clears the window-only cover',async()=>{
 let r=await ui('RPL_BATH',{bathroom_remodel_mode:'WINDOW_ONLY',sash_interior_color:'F',interior_cover_type:'BATH-OP-ANGLE-NOMITER'});assert.equal(r.selection.interior_cover_color,'F');
 r=await ui('RPL_BATH',{...r.selection,bathroom_remodel_mode:'SYSTEM_BATH_SIMULTANEOUS'});assert.equal(r.selection.interior_cover_color,undefined);assert.equal(r.selection.interior_cover_type,undefined);assert.equal(field(r,'interior_cover_color'),undefined);
});
test('native reference colors use explicit mappings; unavailable dusk gray is never substituted',async()=>{
 for(const name of ['RPL_ATT_TW','RPL_ATT_TH','RPL_CUT_MALL']){
  const e=index.products.find(e=>e.id==='CANDIDATE:'+name),d=JSON.parse(readFileSync(root+'/'+e.path));const binding=d.composition.bindings.find(b=>b.executable&&b.consumer_product_id==='SER-LIX-SAMOS2H')??d.composition.bindings.find(b=>b.executable);
  let s={referenced_series_id:binding.series_id,referenced_window_id:binding.window_id,new_sash_size_mode:'CUSTOM'};
  let r=await ui(name,s);let ext=field(r,'new_sash_exterior_color');
  // Resolve native prerequisite fields, while retaining the selected reference scope.
  for(let i=0;i<20&&!ext;i++){const f=r.fields.find(f=>f.key.startsWith('new_sash_')&&!f.readOnly&&f.required&&r.selection[f.key]===undefined&&(f.dataType==='NUMBER'||f.values.length));assert.ok(f,name);s={...r.selection,[f.key]:f.dataType==='NUMBER'?(f.key.endsWith('width')?500:1000):f.values[0].value};r=await ui(name,s);ext=field(r,'new_sash_exterior_color');}
  const black=ext.values.find(v=>v.displayLabel==='ブラック');assert.ok(black,name);r=await ui(name,{...r.selection,new_sash_exterior_color:black.value});
  const outer=name==='RPL_CUT_MALL'?'cut_mall_color':'exterior_cover_color';assert.equal(r.selection[outer],'T',name);
  const inner=field(r,'new_sash_interior_color');const wood=inner.values.find(v=>v.displayLabel==='クリエモカP')??inner.values.find(v=>v.displayLabel==='ブラック');assert.ok(wood,name);r=await ui(name,{...r.selection,new_sash_interior_color:wood.value});
  const inside=name==='RPL_CUT_MALL'?'interior_adjustment_angle_color':'interior_cover_color';assert.equal(r.selection[inside],wood.displayLabel==='クリエモカP'?'C':name==='RPL_CUT_MALL'?'T':'M',name);
  const dusk=ext.values.find(v=>v.displayLabel==='ダスクグレー');if(dusk){r=await ui(name,{...r.selection,new_sash_exterior_color:dusk.value});assert.equal(r.selection[outer],undefined);assert.match(field(r,outer).feedback.message,/確認/);}
 }
});
test('glass then interior/exterior finishes precede final measurements across all seven',async()=>{
 for(const e of index.products){const d=JSON.parse(readFileSync(root+'/'+e.path));const b=d.composition?.bindings.find(v=>v.executable),name=d.baseline.component_id;const s=b?{referenced_series_id:b.series_id,referenced_window_id:b.window_id,new_sash_size_mode:'CUSTOM'}:{window_type:d.product_module.allowedValues.find(v=>v.specificationKey==='window_type').value,size_mode:'CUSTOM'};const r=await ui(name,s);let last=-1;for(const f of r.fields){const order=f.presentationGroup.order;assert.ok(order>=last,e.id);last=order;}assert.equal(field(r,'spec_height_category'),undefined);assert.equal(r.orderReady,false);assert.equal(r.pricing.price,null);}
});
test('removed survey inputs cannot filter covers; frame changes still clear incompatible cover sizes',async()=>{
 let r=await ui('RPL_ROOM',{frame_type:'RPL_STD',window_type:'RPL_ROOM_SLD',sash_exterior_color:'G',exterior_cover_type:'COV-STD-SMALL',survey_cover_top:20,survey_cover_bottom:30,survey_cover_side:5});assert.equal(r.selection.exterior_cover_type,'COV-STD-SMALL');
 r=await ui('RPL_ROOM',{...r.selection,survey_cover_top:50});assert.equal(r.selection.survey_cover_top,undefined);assert.equal(r.selection.exterior_cover_type,'COV-STD-SMALL');assert.ok(r.manualWarnings.some(w=>w.includes('納まり・適合')));
 r=await ui('RPL_ROOM',{...r.selection,frame_type:'RPL_BRIDGE'});assert.equal(r.selection.exterior_cover_type,undefined);assert.ok(r.clearedFields.includes('exterior_cover_type'));assert.equal(r.selection.exterior_cover_color,'G');assert.ok(!field(r,'exterior_cover_type').values.some(v=>v.value==='COV-STD-SMALL'));
});
test('dimensions derive hidden category, invalidate terrace sash, and hold overlapping ranges',async()=>{
 let r=await ui('RPL_TW',{window_type:'RPL_TW_SLD',frame_type:'RPL_TW_FRAME',spec_panel_configuration:'TW-SS-PANEL-2',spec_sash_configuration:'TW-SS-HANDLE',size_mode:'CUSTOM',custom_width:2000,custom_height:1800});assert.equal(r.selection.spec_height_category,'TW-SS-TER');assert.equal(r.selection.spec_sash_configuration,'TW-SS-HANDLE');
 r=await ui('RPL_TW',{...r.selection,custom_height:1000});assert.equal(r.selection.spec_height_category,'TW-SS-MAD');assert.equal(r.selection.spec_sash_configuration,undefined);assert.ok(r.clearedFields.includes('spec_sash_configuration'));
 const overlap=await ui('RPL_ROOM',{window_type:'RPL_ROOM_SLD',frame_type:'RPL_BRIDGE',spec_panel_configuration:'SS-SLD-PANEL-2',spec_sash_configuration:'SS-SLD-PG',size_mode:'CUSTOM',custom_width:3017,custom_height:1637});assert.equal(overlap.selection.spec_height_category,undefined);assert.equal(overlap.dimensionResult.status,'REVIEW_REQUIRED');
});
test('old cover options migrate into dedicated flow without dropping unrelated options',()=>{
 const d=JSON.parse(readFileSync(root+'/candidates/RPL_ROOM.module.json'));const s=migrateCandidateSelection({options:['OP-ANGLE-COVER-CUT','OP-COVER-CASING']},d.selection_migrations);assert.equal(s.interior_cover_type,'OP-ANGLE-COVER-CUT');assert.deepEqual(s.options,['OP-COVER-CASING']);
});
test('cover-only saved selections retain migration audit without a glass field',()=>{
 const {stdout,stderr,status}=spawnSync(process.execPath,['--input-type=module','-e',`
  import {createCandidateRuntimePreview} from './src/server/candidate-runtime-preview.mjs';
  const input={options:['OP-ANGLE-COVER-CUT','OP-COVER-CASING']};
  await createCandidateRuntimePreview()({url:'/api/runtime-master/resolve?'+new URLSearchParams({productId:'CANDIDATE:RPL_ROOM',configurationVersion:'REPLUS_GLASS_FLOW_V8_20261014',selection:JSON.stringify(input)})},{writeHead(){},end(text){const r=JSON.parse(text);if(!r.configurationMigration?.originalSelection.options.includes('OP-ANGLE-COVER-CUT')||r.selection.interior_cover_type!=='OP-ANGLE-COVER-CUT'||!r.selection.options.includes('OP-COVER-CASING'))throw Error('COVER_MIGRATION_AUDIT_MISSING');console.log('PASS');}});
 `],{encoding:'utf8',env:{...process.env,SASH_CANDIDATE_MODE:'INSPECT_LOCAL',SASH_CANDIDATE_MANIFEST_FILE_ID:'1m9UMPr1xSNn73tjzkTyBinczePi66VE7',SASH_CANDIDATE_RUNTIME_INDEX:resolve(root,'index.json'),SASH_CANDIDATE_INDEX_SHA:createHash('sha256').update(readFileSync(root+'/index.json')).digest('hex')}});
 assert.equal(status,0,stderr);assert.match(stdout,/PASS/);
});
test('separately supplied trim and angle remain combinable and both migrate from saved options',async()=>{
 const d=JSON.parse(readFileSync(root+'/candidates/RPL_ATT_TW.module.json'));const migrated=migrateCandidateSelection({options:['ATT-TW-OP-ANGLE-COVER','ATT-TW-OP-TRIM','ATT-TW-OP-CONNECT-SCREW']},d.selection_migrations);
 assert.deepEqual(migrated.interior_cover_type,['ATT-TW-OP-ANGLE-COVER','ATT-TW-OP-TRIM']);assert.deepEqual(migrated.options,['ATT-TW-OP-CONNECT-SCREW']);
 const r=await ui('RPL_ATT_TW',migrated);assert.equal(field(r,'interior_cover_type').dataType,'MULTI_ENUM');assert.deepEqual(r.selection.interior_cover_type,migrated.interior_cover_type);
});
