import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRowTableUi} from '../src/catalog/runtime-master/row-table-runtime-ui.mjs';
import {GLOBAL_WINDOW_STAGE_ORDER} from '../src/catalog/runtime-master/canonical-window-semantic-schema.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {createEstimateOutputModel} from '../src/estimate-output/model.mjs';
const path=new URL('../changes/samosa-ui-v0.7-candidate/',import.meta.url);
const doc=JSON.parse(fs.readFileSync(new URL('candidate.json',path))),entry=JSON.parse(fs.readFileSync(new URL('candidate-index.json',path))).products[0];
const ui=createRowTableUi(doc,entry);
const seed={window_type:'WT-SA-HIKICHIGAI',construction_module:'zairai',opening_class:'window',width:1200,height:1000,color_combination:'SA-COLOR-BLACK'};
test('every source field has one explicit presentation or handoff role',()=>{
 assert.equal(Object.keys(doc.ui_policy.fields).length,45);for(const f of doc.master.field_master)assert.ok(doc.ui_policy.fields[f.field_name]);
 assert.deepEqual(ui.uiResolver().fields.map(f=>f.key),['window_type']);
});
for(const row of doc.master.window_type_master)test('native UI scope: '+row.display_name,()=>{
 const r=ui.uiResolver({window_type:row.window_type_id});const keys=new Set(r.fields.map(f=>f.key));
 assert.equal(keys.size,r.fields.length);assert.ok(keys.has('window_type'));assert.ok(keys.has('construction_module'));
 let order=-1;for(const f of r.fields){const index=GLOBAL_WINDOW_STAGE_ORDER.indexOf(f.semanticStage);assert.ok(index>=order&&index>=0);order=index;for(const v of f.values)assert.ok(v.displayLabel);}
 if(row.screen_applicability==='NOT_APPLICABLE')assert.ok(!keys.has('screen_type'));
 assert.equal(r.formalAdoption,false);assert.equal(r.automaticOrderability,false);
});
test('source auto-assignment stays hidden and rejects conflicting imports',()=>{
 const r=ui.uiResolver({window_type:'WT-SA-TATE-SUBERI'});assert.equal(r.selection.handle_type,'cam_latch');assert.equal(r.selection.configuration_type,'T');assert.ok(!r.fields.some(f=>['handle_type','configuration_type'].includes(f.key)));
 assert.equal(ui.uiResolver({window_type:'WT-SA-TATE-SUBERI',handle_type:'other'}).validation.status,'INVALID');
});
test('standard tuple is derived read-only, custom inputs retain shared labels',()=>{
 const row=doc.master.size_master.find(r=>r.window_type_id===seed.window_type&&r.construction_module===seed.construction_module&&r.opening_class===seed.opening_class);
 const r=ui.uiResolver({...seed,width:row.width,height:row.height,size_code:row.size_code});
 for(const key of ['width','height']){assert.equal(r.selection[key],row[key]);assert.ok(r.fields.find(f=>f.key===key).readOnly);assert.doesNotMatch(r.fields.find(f=>f.key===key).displayLabel,/特注/);}
 assert.equal(ui.uiResolver({...seed,size_code:row.size_code,width:row.width+1}).validation.status,'INVALID');
 assert.ok(!ui.uiResolver(seed).fields.find(f=>f.key==='width').readOnly);
});
test('real size-code edit replaces custom dimensions; strict restoration still rejects mismatch',()=>{
 const row=doc.master.size_master.find(r=>r.window_type_id===seed.window_type&&r.construction_module===seed.construction_module&&r.opening_class===seed.opening_class&&(r.width!==seed.width||r.height!==seed.height));
 const imported={...seed,size_code:row.size_code};assert.equal(ui.uiResolver(imported).validation.status,'INVALID');
 const changed=ui.uiResolver(imported,{changedFields:['size_code']});assert.equal(changed.selection.width,row.width);assert.equal(changed.selection.height,row.height);assert.notEqual(changed.validation.status,'INVALID');
 assert.ok(changed.fields.find(f=>f.key==='width').readOnly);assert.ok(!changed.clearedFields.some(key=>['width','height'].includes(key)));
});
test('hidden assignments retained after a window edit are not reported cleared',()=>{
 const r=ui.uiResolver({window_type:'WT-SA-TATE-SUBERI'},{changedFields:['window_type']});assert.equal(r.selection.handle_type,'cam_latch');assert.equal(r.selection.configuration_type,'T');
 assert.ok(!r.clearedFields.includes('handle_type'));assert.ok(!r.clearedFields.includes('configuration_type'));
});
test('a real color edit recomputes source-derived colors; inconsistent imports remain invalid',()=>{
 const old=ui.uiResolver(seed);const changedInput={...old.selection,color_combination:'SA-COLOR-WHITE'};
 assert.equal(ui.uiResolver(changedInput).validation.status,'INVALID');
 const changed=ui.uiResolver(changedInput,{changedFields:['color_combination']});assert.equal(changed.selection.exterior_color,'white');assert.equal(changed.selection.interior_color,'white');assert.notEqual(changed.validation.status,'INVALID');
 assert.ok(!changed.clearedFields.includes('exterior_color'));
});
test('parent edit clears inapplicable screen and preserves valid color',()=>{
 const first=ui.uiResolver({...seed,screen_type:'sliding_screen'});
 const r=ui.uiResolver({...first.selection,window_type:'WT-SA-FIX-IN'},{changedFields:['window_type']});
 assert.equal(r.selection.screen_type,undefined);assert.equal(r.selection.color_combination,seed.color_combination);assert.equal(r.selection.exterior_color,'black');assert.ok(!r.fields.some(f=>f.key==='screen_type'));
});
test('invalid initial screen import stays invalid',()=>{
 assert.equal(ui.uiResolver({...seed,window_type:'WT-SA-FIX-IN',screen_type:'sliding_screen'}).validation.status,'INVALID');
});
test('direct unknown values do not leak into the display summary selection',()=>{
 const r=ui.uiResolver({...seed,color_combination:'INTERNAL_UNKNOWN_ENUM'});assert.equal(r.validation.status,'INVALID');assert.equal(r.selection.color_combination,undefined);
});
test('fixed identity null and unknown fields cannot erase Formal identity',()=>{
 const r=ui.uiResolver({...seed,manufacturer:null,unknown_key:'INTERNAL_UNKNOWN_ENUM'});assert.equal(r.validation.status,'INVALID');assert.equal(r.selection.manufacturer,'LIXIL');assert.equal(r.selection.unknown_key,undefined);
});
test('multi-choice invalid input cannot become an accepted configuration',()=>{
 const r=ui.uiResolver({window_type:'WT-SA-TATE-SUBERI',paid_option:['not_in_source']});assert.equal(r.validation.status,'INVALID');assert.equal(r.selection.paid_option,undefined);
});
test('restoration is deterministic and all unresolved items are named',()=>{
 const a=ui.uiResolver(seed),b=ui.uiResolver(JSON.parse(JSON.stringify(a.selection)));assert.deepEqual(b.selection,a.selection);assert.equal(a.confirmationRequests.length,13);assert.ok(a.confirmationRequests.every(r=>r.message.startsWith(r.label+'：')));
});
test('manual confirmation and invalid dimensions retain separate outcomes',()=>{
 const manual=doc.master.golden_test_master.find(r=>r.expected_result==='MANUAL_CONFIRMATION_REQUIRED');const r=ui.uiResolver(JSON.parse(manual.input_configuration_json));assert.equal(r.automaticOrderability,false);assert.ok(r.manualWarnings.length);
 assert.equal(ui.uiResolver({...seed,width:99999,height:99999}).validation.status,'INVALID');
});
test('all image bytes are actual bounded images with a pinned official source',()=>{
 const sources=new Set();
 for(const values of Object.values(doc.choice_visuals))for(const row of Object.values(values)){
  assert.match(row.src,/^data:image\/png;base64,/);assert.ok(Buffer.from(row.src.split(',')[1],'base64').length>100);assert.ok(row.alt&&row.source_label);if(!sources.has(row.source_ref.path)){assert.equal(createHash('sha256').update(fs.readFileSync(row.source_ref.path)).digest('hex'),row.source_ref.sha256);sources.add(row.source_ref.path);}
 }
});
test('candidate cannot replace the bound Formal contents or source identity',()=>{
 const other=structuredClone(doc);other.master.series_master[0].product_series='other';assert.throws(()=>createRowTableUi(other,entry),/SOURCE_MASTER_IDENTITY/);
 assert.throws(()=>createRowTableUi(doc,{...entry,id:'other'}),/SOURCE_MASTER_IDENTITY/);
});
test('typed local candidate admission preserves the production guard',()=>{
 const index=new URL('candidate-index.json',path),hash=createHash('sha256').update(fs.readFileSync(index)).digest('hex');
 const script=`import {candidateRuntimeEntries} from './src/catalog/runtime-master/candidate-runtime-registry.mjs';console.log(candidateRuntimeEntries.length);`;
 const env={...process.env,SASH_CANDIDATE_RUNTIME_INDEX:index.pathname,SASH_CANDIDATE_INDEX_SHA:hash,SASH_CANDIDATE_MODE:'INSPECT_LOCAL'};delete env.SASH_CANDIDATE_MANIFEST_FILE_ID;
 const local=spawnSync(process.execPath,['--input-type=module','-e',script],{env,encoding:'utf8'});assert.equal(local.status,0,local.stderr);assert.equal(local.stdout.trim(),'1');
 const production=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...env,NODE_ENV:'production'},encoding:'utf8'});assert.notEqual(production.status,0);assert.match(production.stderr,/CANDIDATE_RUNTIME_NOT_ADMITTED/);
});
test('independent requirements survive re-resolution and enter the estimate handoff',()=>{
 const result=ui.uiResolver(seed),requirements={special_specification_requested:true,text:'西日への対策を相談'};
 const snapshot=createProductConfigurationSnapshot({product:entry,result,previousSnapshot:{user_requirements:requirements}});
 assert.deepEqual(snapshot.user_requirements,requirements);assert.equal(snapshot.configuration.user_requirements,undefined);assert.equal(snapshot.confirmation_requests.filter(r=>r.kind==='USER_REQUIREMENT').length,2);
 const again=createProductConfigurationSnapshot({product:entry,result,previousSnapshot:snapshot});assert.deepEqual(again.user_requirements,requirements);assert.equal(again.confirmation_requests.filter(r=>r.kind==='USER_REQUIREMENT').length,2);
 const model=createEstimateOutputModel({project:{project_id:'p'},estimate:{estimate_id:'e',project_id:'p'},openings:[{opening_id:'o',status:'COMPLETE',product_configuration_snapshot:again}]});
 assert.ok(JSON.stringify(model).includes('西日への対策を相談'));
});
test('unmodified snapshots gain no independent user requirement data',()=>{
 const snapshot=createProductConfigurationSnapshot({product:entry,result:ui.uiResolver(seed)});assert.equal(snapshot.user_requirements,undefined);assert.equal(snapshot.confirmation_requests.some(r=>r.kind==='USER_REQUIREMENT'),false);
});
