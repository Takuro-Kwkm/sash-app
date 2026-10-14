import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync,mkdtempSync,cpSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
const root=resolve('changes/replus-runtime-v5'),indexPath=resolve(root,'index.json');
const index=JSON.parse(readFileSync(indexPath));
const digest=b=>createHash('sha256').update(b).digest('hex');
process.env.SASH_CANDIDATE_MANIFEST_FILE_ID='1QC4ZIiQfLe-I9qHoXuUkBrhKSk82AGGp';process.env.SASH_CANDIDATE_RUNTIME_INDEX=indexPath;process.env.SASH_CANDIDATE_MODE='INSPECT_LOCAL';process.env.SASH_CANDIDATE_INDEX_SHA=digest(readFileSync(indexPath));
const {resolveRuntimeAppProduct,runtimeAppIntegrationInventory,getRuntimeAppIntegration}=await import('../src/catalog/runtime-master/runtime-app-bridge.mjs');
const rows=index.products;
const {candidateRuntimeEntries,readCandidateModule}=await import('../src/catalog/runtime-master/candidate-runtime-registry.mjs');
const {adaptComposedProductRuntime}=await import('../src/catalog/runtime-master/composed-product-runtime-adapter.mjs');
const {runtimeMasterInventory,loadRegisteredRuntime}=await import('../src/catalog/runtime-master/runtime-master-registry.mjs');
const readers=new Map();
async function resolveUi(id,s={}){
 const entry=candidateRuntimeEntries.find(r=>r.id===id);if(!entry)throw new Error('CANDIDATE_NOT_BOUND');
 if(!readers.has(id))readers.set(id,await adaptComposedProductRuntime(readCandidateModule(entry),entry,async pid=>{const r=getRuntimeAppIntegration(pid);return loadRegisteredRuntime(r.manufacturer,r.series);}));
 return readers.get(id).uiResolver(s);
}
async function complete(row,seed={}){
 const doc=JSON.parse(readFileSync(resolve(root,row.path))),first=doc.product_module.allowedValues.find(v=>v.specificationKey==='window_type');
 const reference=doc.composition?.bindings.find(b=>b.executable);
 let s={...(first?{window_type:first.value}:{}),...(reference?{referenced_series_id:reference.series_id,referenced_window_id:reference.window_id}:{}),...seed},r;
 for(let i=0;i<40;i++){
  r=await resolveUi(row.id,s);s={...r.selection};let changed=false;
  for(const f of r.fields){
   if(!f.required||s[f.key]!==undefined)continue;
   if(f.dataType==='NUMBER')s[f.key]=1000;
   else if(f.values.length)s[f.key]=f.values[0].value;
   else continue;
   changed=true;break;
  }
  if(!changed)return r;
 }
 throw new Error('Selection did not converge: '+row.id);
}
for(const row of rows)test(row.id+' shared module and evidence',async()=>{
 const d=JSON.parse(readFileSync(resolve(root,row.path)));
 assert.equal(digest(readFileSync(resolve(root,row.path))),row.sha256);
 assert.equal(d.product_module.product.id,row.id);
 assert.equal(d.formal_adoption,false);assert.equal(d.pricing.price,null);
 for(const c of d.product_module.allowedValues){assert.ok(c.evidenceIds.length);assert.ok(/[ぁ-んァ-ヶ一-龠]/u.test(c.displayLabel)||['TW','TF','TFT'].includes(c.displayLabel),c.displayLabel);}
 const r=await complete(row);
 assert.ok(r.fields.length>=8);
 assert.equal(r.orderReady,false);
 assert.equal(r.runtimeCapabilities.formalAdoption,false);
 assert.equal(r.pricing.price,null);
 assert.equal(r.validation.errors.length,0,JSON.stringify(r.validation));
 writeFileSync(resolve('artifacts/replus-runtime-v5',row.id.replace(':','-')+'.json'),JSON.stringify(r,null,2));
});
test('missing casing native id and incompatible choice clear',async()=>{
 const r=await resolveUi('CANDIDATE:RPL_ROOM',{options:['OP-COVER-CASING','OP-INTERIOR-RESIN-COVER']});
 assert.ok(!r.selection.options?.includes('OP-COVER-CASING'));assert.ok(r.clearedFields.includes('options')===false||r.selection.options?.length<2);
 assert.ok(r.fields.find(f=>f.key==='options').values.some(v=>v.value==='OP-INTERIOR-RESIN-COVER'));
});
test('frame and spec descendants clear across window change',async()=>{
 const seed=await complete(rows[0]);assert.equal(seed.selection.window_type,'RPL_ROOM_SLD');
 const r=await resolveUi(rows[0].id,{...seed.selection,frame_type:'RPL_BRIDGE',window_type:'RPL_ROOM_VS_OP'});
 assert.ok(!r.selection.frame_type);assert.ok(!r.selection.spec_panel_configuration);assert.ok(r.clearedFields.includes('spec_panel_configuration'));
});
test('native dimension min/max outside blocked, inside graph review',async()=>{
 for(const row of rows.slice(0,4)){
  const r=await complete(row),d=JSON.parse(readFileSync(resolve(root,row.path)));
  const {buildCatalogContext,selectorMatches}=await import('../src/catalog/selector.mjs');
  const {createCatalog}=await import('../src/catalog/catalog-adapter.mjs');
  const c=createCatalog([d.product_module]),ctx=buildCatalogContext(c,row.id);
  const rules=d.product_module.ruleSets.flatMap(s=>s.type==='DIMENSION_RULES'?s.payload:[]).filter(s=>selectorMatches(s.selector,r.selection,ctx));
  assert.ok(rules.length,row.id);
  const bounds=rules[0].bounds;
  for(const [w,h,expected] of [[bounds.minW,bounds.minH,'REVIEW_REQUIRED'],[bounds.maxW,bounds.maxH,'REVIEW_REQUIRED'],[0,bounds.minH,'BLOCK'],[bounds.maxW+10000,bounds.maxH,'BLOCK']]){
   const a=await resolveUi(row.id,{...r.selection,custom_width:w,custom_height:h});assert.equal(a.dimensionResult.status,expected,row.id);
  }
 }
});
test('every fixed reference row executes only supported native readers',async()=>{
 const bs=JSON.parse(readFileSync(resolve(root,'review/reference-bindings.json'))).bindings;
 for(const b of bs){
  const r=await resolveUi('CANDIDATE:'+b.component,{referenced_series_id:b.series_id,referenced_window_id:b.window_id});
  if(b.series_id==='SER-LIX-SAMOSA')assert.ok(r.validation.errors.some(e=>e.errorCode==='REFERENCE_ADAPTER_PENDING'));
  else {assert.ok(r.referenceResult,b.rule_id+JSON.stringify(r.validation));assert.equal(r.referenceResult.windowId,b.window_id);assert.equal(r.referenceResult.runtimeIdentity.sourcePackageIntegrity.match,true);}
 }
});
test('unknown reference never delegates, depth rejects and formulas preserve evidence',async()=>{
 const r=await resolveUi('CANDIDATE:RPL_ATT_TH',{referenced_series_id:'SER-LIX-SAMOSL',referenced_window_id:'UNKNOWN',existing_frame_depth:91,survey_w:1000,survey_h:1000});
 assert.equal(r.selection.referenced_window_id,undefined);assert.equal(r.referenceResult,undefined);
 assert.ok(r.validation.errors.some(e=>e.errorCode==='NATIVE_NUMERIC_BOUNDARY'));
 assert.equal(r.derivedMeasurements.referenced_product_w.value,962);assert.equal(r.derivedMeasurements.referenced_product_h.value,961);
 assert.ok(r.derivedMeasurements.referenced_product_h.evidenceIds.length);
});
test('source-hold options remain absent and external never becomes allowed',async()=>{
 const a=await resolveUi('CANDIDATE:RPL_ROOM',{options:['KEY-CRESCENT-UNADOPTED']});assert.equal(a.selection.options,undefined);
 const r=await resolveUi('CANDIDATE:RPL_CUT_MALL',{existing_sash_mount:'外付サッシ',new_sash_mount:'内付',new_sash_size_relation:'既設より小さい'});
 assert.equal(r.selection.new_sash_mount,undefined);assert.equal(r.selection.new_sash_size_relation,undefined);
 assert.equal(r.fields.find(f=>f.key==='new_sash_mount').required,true);
 assert.ok(r.manualWarnings.some(m=>m.includes('外付既設')));assert.equal(r.orderReady,false);
});
test('default process excludes all candidates, production and corruption refuse',()=>{
 const file=resolve('src/catalog/runtime-master/candidate-runtime-registry.mjs');
 function exec(env){return spawnSync(process.execPath,['--input-type=module','-e','const m=await import('+JSON.stringify(file)+');console.log(m.candidateRuntimeEntries.length)'],{encoding:'utf8',env});}
 const clean={...process.env};delete clean.SASH_CANDIDATE_RUNTIME_INDEX;const no=exec(clean);assert.equal(no.status,0);assert.equal(no.stdout.trim(),'0');
 for(const changes of [{NODE_ENV:'production'},{SASH_CANDIDATE_MODE:'RUN'},{SASH_CANDIDATE_INDEX_SHA:'0'.repeat(64)}]){
  const r=exec({...process.env,...changes});assert.notEqual(r.status,0);assert.match(r.stderr,/CANDIDATE/);
 }
 const folder=mkdtempSync(resolve(tmpdir(),'composition-refusal-'));
 try{
  cpSync(root,folder,{recursive:true});const ix=resolve(folder,'index.json'),d=JSON.parse(readFileSync(ix));writeFileSync(resolve(folder,d.products[0].path),'{}');
  const r=exec({...process.env,SASH_CANDIDATE_RUNTIME_INDEX:ix});assert.notEqual(r.status,0);assert.match(r.stderr,/CANDIDATE_MODULE_BYTES_CHANGED/);
 }finally{rmSync(folder,{recursive:true});}
});
test('reference runtime hash and critical schema are immutable admission inputs',async()=>{
 const entry=candidateRuntimeEntries.find(r=>r.id==='CANDIDATE:RPL_ATT_TH'),d=readCandidateModule(entry);
 const load=async pid=>{
  const meta=getRuntimeAppIntegration(pid),reader=await loadRegisteredRuntime(meta.manufacturer,meta.series);
  const files=reader.sourcePackageIntegrity.files.map((f,i)=>({...f,actual:i===0?'0'.repeat(64):f.actual}));
  return {...reader,sourcePackageIntegrity:{...reader.sourcePackageIntegrity,files}};
 };
 await assert.rejects(()=>adaptComposedProductRuntime(d,entry,load),/REFERENCE_BYTES_CHANGED/);
 const changed=structuredClone(d);changed.composition.bindings.find(b=>b.executable).bound_files=[];
 await assert.rejects(()=>adaptComposedProductRuntime(changed,entry,load),/REFERENCE_CRITICAL_BYTES_REQUIRED/);
});
test('official revised options remain scoped and deny incompatible/humid selections',async()=>{
 for(const component of ['RPL_ROOM','RPL_TW']){
  const key=component+'-OP-V5-KEY-CRESCENT';
  const r=await resolveUi('CANDIDATE:'+component,{window_type:component+'_SLD',options:[key]});
  assert.ok(r.fields.find(f=>f.key==='options').values.some(v=>v.value===key));
  assert.ok(r.manualWarnings.some(w=>w.includes('要在庫確認')));
  const humid=await resolveUi('CANDIDATE:'+component,{window_type:component+'_SLD',usage_humidity:'HIGH_HUMIDITY',options:[key]});
  assert.ok(!humid.selection.options?.includes(key));
  const d=readCandidateModule(candidateRuntimeEntries.find(e=>e.id==='CANDIDATE:'+component));
  const dependency=d.product_module.dependencies.find(d=>d.when?.options?.$contains===key&&d.targetValue?.includes('STOP'));
  if(dependency){
   const deny=await resolveUi('CANDIDATE:'+component,{window_type:component+'_SLD',options:[key,dependency.targetValue]});
   assert.ok(!(deny.selection.options?.includes(key)&&deny.selection.options?.includes(dependency.targetValue)));
  }
 }
 const bath=await resolveUi('CANDIDATE:RPL_BATH',{});assert.ok(!bath.fields.find(f=>f.key==='options').values.some(v=>v.value.includes('KEY-CRESCENT')));
 const cut=await resolveUi('CANDIDATE:RPL_CUT_MALL',{});assert.ok(!cut.fields.find(f=>f.key==='options')?.values.some(v=>v.value.includes('SPACER-15-20')));
});
test('wood palettes affect the component part only, body/resin carry forward',()=>{
 const doc=readCandidateModule(candidateRuntimeEntries.find(e=>e.id==='CANDIDATE:RPL_ROOM'));
 const wood=doc.product_module.allowedValues.filter(v=>v.specificationKey==='wooden_casing_color');
 assert.deepEqual(wood.map(v=>v.value),['D','M','Y','AD','AC','WA']);
 const original=JSON.parse(readFileSync(resolve(root,'baseline/RPL_ROOM.json')));
 const candidate=JSON.parse(readFileSync(resolve(root,'candidates/RPL_ROOM.json')));
 const before=original.tables['06_色'].values.filter(r=>['sash_interior_color','interior_cover_color','sash_exterior_color'].includes(r[1]));
 const after=candidate.tables['06_色'].values.filter(r=>['sash_interior_color','interior_cover_color','sash_exterior_color'].includes(r[1]));
 assert.deepEqual(after,before);
 assert.equal(doc.pricing.bom,null);assert.equal(doc.pricing.set_code,null);
});
