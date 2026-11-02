import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRowTableUi} from '../src/catalog/runtime-master/row-table-runtime-ui.mjs';
import {GLOBAL_WINDOW_STAGE_ORDER} from '../src/catalog/runtime-master/canonical-window-semantic-schema.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {createEstimateOutputModel} from '../src/estimate-output/model.mjs';
const base=new URL('../changes/samosa-ui-v0.7-candidate/',import.meta.url),doc=JSON.parse(fs.readFileSync(new URL('candidate.json',base))),entry=JSON.parse(fs.readFileSync(new URL('candidate-index.json',base))).products[0],ui=createRowTableUi(doc,entry);
const seed={window_type:'WT-SA-HIKICHIGAI',construction_module:'zairai',size_mode:'CUSTOM',panel_count:'2',width:1200,height:1000,color_combination:'SA-COLOR-BLACK',glazing_base:'LOW_E',glazing_performance:'CLEAR',glazing_appearance:'TRANSPARENT',glazing_gas:'ARGON'};
const standard={...seed,size_mode:'STANDARD',standard_size:'25118:2550:1830:terrace',width:2550,height:1830};
const field=(r,key)=>r.fields.find(f=>f.key===key),values=(r,key)=>field(r,key)?.values.map(v=>v.value);
test('source master retains exact Formal bytes and explicit roles for all 45 fields',()=>{assert.deepEqual(JSON.parse(fs.readFileSync(doc.source_master.path)),doc.master);assert.equal(Object.keys(doc.ui_policy.fields).length,45);assert.deepEqual(ui.uiResolver().fields.map(f=>f.key),['window_type']);});
for(const row of doc.master.window_type_master)test('source screen applicability and canonical order: '+row.display_name,()=>{
 const r=ui.uiResolver({window_type:row.window_type_id,construction_module:'zairai'});assert.equal(new Set(r.fields.map(f=>f.key)).size,r.fields.length);
 let order=-1;for(const f of r.fields){const stage=GLOBAL_WINDOW_STAGE_ORDER.indexOf(f.semanticStage);assert.ok(stage>=order&&stage>=0);order=stage;for(const v of f.values)assert.ok(v.displayLabel);}
 const expected=doc.ui_policy.sales_views.screen_domains[row.window_type_id];if(row.window_type_id==='WT-SA-UCHIDAOSHI')assert.equal(r.selection.screen_type,expected[0]);else if(expected.length)assert.deepEqual(values(r,'screen_type'),expected);else assert.ok(!field(r,'screen_type'));
 assert.ok(!field(r,'opening_class'));assert.ok(!field(r,'size_code'));assert.ok(!field(r,'width'));assert.ok(!field(r,'height'));assert.equal(r.formalAdoption,false);assert.equal(r.automaticOrderability,false);
});
test('module → panel count → source-filtered standard size; standard W/H remain hidden',()=>{
 const first=ui.uiResolver({window_type:seed.window_type,construction_module:seed.construction_module});assert.deepEqual(first.fields.slice(0,3).map(f=>f.key),['window_type','construction_module','panel_count']);assert.ok(!field(first,'standard_size'));
 for(const count of ['2','4']){const counted=ui.uiResolver({...first.selection,panel_count:count},{changedFields:['panel_count']});assert.ok(field(counted,'size_mode'));assert.ok(!field(counted,'standard_size'));const standardMode=ui.uiResolver({...counted.selection,size_mode:'STANDARD'},{changedFields:['size_mode']});assert.deepEqual(standardMode.fields.slice(0,5).map(f=>f.key),['window_type','construction_module','panel_count','size_mode','standard_size']);
 const expected=new Set(doc.master.size_master.filter(r=>r.window_type_id===seed.window_type&&r.construction_module===seed.construction_module&&doc.ui_policy.sales_views.standard_size.row_panel_counts[r.size_master_id]===count).map(r=>[r.size_code.replace(/-[24]$/,''),r.width,r.height,r.opening_class].join(':')));assert.deepEqual(new Set(values(standardMode,'standard_size')),expected);
 const resolved=ui.uiResolver({...standardMode.selection,standard_size:standard.standard_size},{changedFields:['standard_size']});assert.equal(resolved.selection.size_code,'25118-'+count);for(const k of ['opening_class','size_code','width','height'])assert.ok(!field(resolved,k));}
});
test('panel edits keep shared sizes and clear incompatible sizes; clearing size retains upstream count',()=>{
 const first=ui.uiResolver({...seed,size_mode:'STANDARD',standard_size:'16511:1690:1170:window'});const changed=ui.uiResolver({...first.selection,panel_count:'4'},{changedFields:['panel_count']});assert.equal(changed.selection.standard_size,undefined);assert.equal(changed.selection.size_code,undefined);assert.equal(changed.selection.width,undefined);assert.equal(changed.selection.panel_count,'4');
 const restored=ui.uiResolver(standard),kept=ui.uiResolver({...restored.selection,panel_count:'4'},{changedFields:['panel_count']});assert.equal(kept.selection.standard_size,standard.standard_size);assert.equal(kept.selection.size_code,'25118-4');
 const cleared=ui.uiResolver({...kept.selection,panel_count:undefined},{changedFields:['panel_count']});assert.equal(cleared.selection.standard_size,undefined);assert.ok(!field(cleared,'standard_size'));assert.ok(!field(cleared,'width'));
});
test('every source standard row survives the sales projection with exact panel, dimensions and native scope',()=>{
 for(const row of doc.master.size_master){const input={window_type:row.window_type_id,construction_module:row.construction_module,...(row.configuration_type?{configuration_type:row.configuration_type}:{}),...(row.opening_angle?{opening_angle:row.opening_angle}:{}),opening_class:row.opening_class,size_code:row.size_code,width:row.width,height:row.height};const r=ui.uiResolver(input);assert.equal(r.selection.size_code,row.size_code,row.size_master_id);assert.equal(r.selection.width,row.width);assert.equal(r.selection.height,row.height);assert.ok(r.selection.standard_size);const count=doc.ui_policy.sales_views.standard_size.row_panel_counts[row.size_master_id];if(count)assert.equal(r.selection.panel_count,count);}
});
test('347 source diagram is four sashes without guessing width cutoffs',()=>{const row=doc.master.size_master.find(r=>r.width_nominal==='347');const r=ui.uiResolver({window_type:row.window_type_id,construction_module:row.construction_module,size_code:row.size_code,width:row.width,height:row.height});assert.equal(r.selection.panel_count,'4');assert.equal(field(r,'panel_count').readOnly,false);});
test('custom only exposes numeric W/H; parent changes replace the hidden standard tuple',()=>{
 let r=ui.uiResolver(standard);r=ui.uiResolver({...r.selection,size_mode:'CUSTOM'},{changedFields:['size_mode']});assert.ok(field(r,'width'));assert.ok(field(r,'height'));assert.equal(r.selection.size_code,undefined);assert.equal(r.selection.width,undefined);assert.ok(!field(r,'opening_class'));
 r=ui.uiResolver({...r.selection,width:1200,height:1000},{changedFields:['width','height']});assert.equal(r.dimensionResult.status,'PASS');assert.equal(r.selection.opening_class,'window');
});
test('custom source overlap is explicitly confirmed, without an invented window/terrace threshold',()=>{const r=ui.uiResolver({...seed,height:1550});assert.equal(r.dimensionResult.status,'REVIEW_REQUIRED');assert.ok(r.confirmationRequests.some(r=>r.message.includes('枠仕様')));assert.ok(!field(r,'opening_class'));assert.equal(r.automaticOrderability,false);});
test('custom count restricts source geometry: four-sash area cannot borrow the two-sash region',()=>{const two=ui.uiResolver({...seed,width:1000,height:1800}),four=ui.uiResolver({...seed,width:1000,height:1800,panel_count:'4'});assert.equal(two.dimensionResult.status,'PASS');assert.equal(four.dimensionResult.status,'BLOCK');assert.equal(four.validation.status,'INVALID');});
test('strict restore rejects wrong standard dimensions, native code or unsupported panel count',()=>{assert.equal(ui.uiResolver({...standard,width:999}).validation.status,'INVALID');assert.equal(ui.uiResolver({...standard,size_code:'25118-4'}).validation.status,'INVALID');assert.equal(ui.uiResolver({...standard,panel_count:'8'}).validation.status,'INVALID');});
test('screen per-window invalid import is rejected and real window edit clears incompatible screen',()=>{const first=ui.uiResolver({...seed,screen_type:'sliding_screen'});const input={...first.selection,window_type:'WT-SA-YOKO-SUBERI'};assert.equal(ui.uiResolver(input).validation.status,'INVALID');const r=ui.uiResolver(input,{changedFields:['window_type']});assert.equal(r.selection.screen_type,undefined);assert.deepEqual(values(r,'screen_type'),['horizontal_roll_screen','casement_screen']);assert.equal(r.selection.color_combination,seed.color_combination);});
test('Tate screen H1600 boundary and roll mesh match official matrix footnotes',()=>{
 const r=ui.uiResolver({window_type:'WT-SA-TATE-SUBERI',construction_module:'zairai',size_mode:'CUSTOM',width:600,height:1600});assert.deepEqual(values(r,'screen_type'),['horizontal_roll_screen','vertical_roll_screen','casement_screen']);
 const taller=ui.uiResolver({...r.selection,height:1601},{changedFields:['height']});assert.deepEqual(values(taller,'screen_type'),['vertical_roll_screen']);
 const roll=ui.uiResolver({...r.selection,screen_type:'horizontal_roll_screen'});assert.deepEqual(values(roll,'screen_mesh_type'),['standard_mesh','kirei_net','mushiya_net']);
 const casement=ui.uiResolver({...r.selection,screen_type:'casement_screen'});assert.deepEqual(values(casement,'screen_middle_bar'),['with_middle_bar']);
});
test('glazing axes distinguish coating, appearance, functions and gas; mixed legacy selector is hidden',()=>{
 const r=ui.uiResolver(seed);assert.deepEqual(values(r,'glazing_base'),['LOW_E','GENERAL']);assert.deepEqual(values(r,'glazing_appearance'),['TRANSPARENT','PATTERNED','FROSTED','MILKY']);assert.deepEqual(values(r,'glazing_performance'),['CLEAR','GREEN','HIGH_SOLAR']);assert.deepEqual(values(r,'glazing_gas'),['AIR','ARGON']);assert.equal(field(r,'glazing_functions').dataType,'MULTI_ENUM');assert.ok(!field(r,'glass_category'));assert.ok(!field(r,'glass_type'));
 const requested=ui.uiResolver({...seed,glazing_appearance:'FROSTED',glazing_functions:['DISASTER','GRID']});assert.equal(requested.selection.glass_type,'low_e_clear');const note=requested.confirmationRequests.find(r=>r.code==='SOURCE_GLAZING_COMBINATION_CONFIRMATION');assert.deepEqual(note.selection.glazing_functions,['DISASTER','GRID']);assert.equal(note.selection.glazing_appearance,'FROSTED');assert.ok(note.message.includes('組合せ可否'));assert.equal(requested.automaticOrderability,false);
});
test('general glazing hides Low-E performance and argon; actual base edit clears incompatible selections',()=>{
 const old=ui.uiResolver(seed),input={...old.selection,glazing_base:'GENERAL'};assert.equal(ui.uiResolver(input).validation.status,'INVALID');const r=ui.uiResolver(input,{changedFields:['glazing_base']});assert.equal(r.selection.glazing_performance,undefined);assert.equal(r.selection.glazing_gas,undefined);assert.ok(!field(r,'glazing_performance'));assert.deepEqual(values(r,'glazing_gas'),['AIR']);assert.equal(r.selection.glass_type,'standard_double_glazing');assert.notEqual(r.validation.status,'INVALID');
});
test('legacy optional appearance stays a request without inventing a base; blind restrictions cannot be bypassed',()=>{
 const r=ui.uiResolver({window_type:seed.window_type,construction_module:'zairai',glass_category:'option',glass_type:'patterned_double_glazing'});assert.equal(r.selection.glazing_appearance,'PATTERNED');assert.equal(r.selection.glazing_base,undefined);assert.ok(r.validation.missingRequiredFields.includes('glazing_base'));
 const yoko=ui.uiResolver({...seed,window_type:'WT-SA-YOKO-SUBERI',panel_count:undefined,glazing_functions:['BLIND']});assert.equal(yoko.validation.status,'INVALID');assert.ok(!values(yoko,'glazing_functions').includes('BLIND'));
 const edited=ui.uiResolver({...seed,window_type:'WT-SA-YOKO-SUBERI',glazing_functions:['BLIND']},{changedFields:['window_type']});assert.deepEqual(edited.selection.glazing_functions,[]);
});
test('all requested glazing inputs are required independently; no missing appearance assumed transparent',()=>{const r=ui.uiResolver({...seed,glazing_appearance:undefined});assert.equal(r.validation.status,'INCOMPLETE');assert.ok(r.validation.missingRequiredFields.includes('glazing_appearance'));});
test('source assignments and real color edit preserve strict restoration',()=>{const old=ui.uiResolver(seed);assert.equal(ui.uiResolver({...old.selection,color_combination:'SA-COLOR-WHITE'}).validation.status,'INVALID');const r=ui.uiResolver({...old.selection,color_combination:'SA-COLOR-WHITE'},{changedFields:['color_combination']});assert.equal(r.selection.exterior_color,'white');assert.equal(r.selection.interior_color,'white');assert.equal(ui.uiResolver({window_type:'WT-SA-TATE-SUBERI',handle_type:'other'}).validation.status,'INVALID');});
test('unknown values and fields cannot leak into accepted manufacturer selections',()=>{for(const extra of [{color_combination:'INTERNAL_UNKNOWN_ENUM'},{glass_type:'INTERNAL_UNKNOWN_ENUM'},{unknown_key:'bad'},{paid_option:['not_in_source']}])assert.equal(ui.uiResolver({...seed,...extra}).validation.status,'INVALID');});
test('restoration is stable and composed glazing + user requirements reach estimation handoff',()=>{
 const r=ui.uiResolver({...standard,glazing_functions:['GRID']});assert.deepEqual(ui.uiResolver(JSON.parse(JSON.stringify(r.selection))).selection,r.selection);
 const requirements={special_specification_requested:true,text:'西日への対策を相談'},snapshot=createProductConfigurationSnapshot({product:entry,result:r,previousSnapshot:{user_requirements:requirements}});assert.deepEqual(snapshot.configuration,r.selection);assert.deepEqual(snapshot.user_requirements,requirements);assert.equal(snapshot.confirmation_requests.filter(r=>r.kind==='USER_REQUIREMENT').length,2);
 const model=createEstimateOutputModel({project:{project_id:'p'},estimate:{estimate_id:'e',project_id:'p'},openings:[{opening_id:'o',status:'COMPLETE',product_configuration_snapshot:snapshot}]});assert.ok(JSON.stringify(model).includes('組合せ可否'));assert.ok(JSON.stringify(model).includes('西日への対策'));
});
test('source-backed visual inputs and new views keep official hashes',()=>{const visuals=[...Object.values(doc.choice_visuals).flatMap(Object.values),...doc.ui_policy.sales_views.glazing.flatMap(v=>v.values.map(o=>o.image).filter(Boolean))];for(const row of visuals){assert.match(row.src,/^data:image\/png;base64,/);assert.ok(Buffer.from(row.src.split(',')[1],'base64').length>100);assert.equal(createHash('sha256').update(fs.readFileSync(row.source_ref.path)).digest('hex'),row.source_ref.sha256);}});
test('candidate cannot replace bound Formal identity and cannot enter production',()=>{
 const other=structuredClone(doc);other.master.series_master[0].product_series='other';assert.throws(()=>createRowTableUi(other,entry),/SOURCE_MASTER_IDENTITY/);
 const index=new URL('candidate-index.json',base),hash=createHash('sha256').update(fs.readFileSync(index)).digest('hex');const script="import {candidateRuntimeEntries} from './src/catalog/runtime-master/candidate-runtime-registry.mjs';console.log(candidateRuntimeEntries.length);";
 const env={...process.env,SASH_CANDIDATE_RUNTIME_INDEX:index.pathname,SASH_CANDIDATE_INDEX_SHA:hash,SASH_CANDIDATE_MODE:'INSPECT_LOCAL'};delete env.SASH_CANDIDATE_MANIFEST_FILE_ID;
 const local=spawnSync(process.execPath,['--input-type=module','-e',script],{env,encoding:'utf8'});assert.equal(local.status,0,local.stderr);const prod=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...env,NODE_ENV:'production'},encoding:'utf8'});assert.notEqual(prod.status,0);assert.match(prod.stderr,/CANDIDATE_RUNTIME_NOT_ADMITTED/);
});

test('fixed-count strict restoration checks supplied values before deriving the only valid count',()=>{
 const fixed={window_type:'WT-SA-HIKICHIGAI',construction_module:'two_by_four',standard_size:'11918:1235:1830:terrace'};
 for(const panel_count of ['4','8'])assert.equal(ui.uiResolver({...fixed,panel_count}).validation.status,'INVALID');
 const row=doc.master.size_master.find(r=>r.size_code==='16511'&&r.window_type_id===seed.window_type&&r.construction_module==='zairai');assert.equal(ui.uiResolver({window_type:row.window_type_id,construction_module:row.construction_module,size_code:row.size_code,panel_count:'4'}).validation.status,'INVALID');
});
test('strict restore rejects a native opening context or glass tuple that contradicts explicit sales axes',()=>{
 assert.equal(ui.uiResolver({...standard,opening_class:'window'}).validation.status,'INVALID');
 assert.equal(ui.uiResolver({...seed,opening_class:'terrace'}).validation.status,'INVALID');
 assert.equal(ui.uiResolver({...seed,glass_type:'standard_double_glazing',glass_category:'standard'}).validation.status,'INVALID');
 assert.equal(ui.uiResolver({...seed,glass_type:'low_e_clear',glass_category:'option'}).validation.status,'INVALID');
 const old=ui.uiResolver(seed);assert.notEqual(ui.uiResolver({...old.selection,glazing_performance:'GREEN'},{changedFields:['glazing_performance']}).validation.status,'INVALID');
});
test('explicitly clearing size mode removes both branches without rehydrating dimensions',()=>{
 for(const input of [seed,standard]){const old=ui.uiResolver(input),r=ui.uiResolver({...old.selection,size_mode:undefined},{changedFields:['size_mode']});for(const key of ['size_mode','standard_size','size_code','width','height','opening_class'])assert.equal(r.selection[key],undefined);assert.ok(!field(r,'width'));assert.ok(!field(r,'standard_size'));assert.ok(r.validation.missingRequiredFields.includes('size_mode'));}
});
test('special-order mesh remains selectable on sourced screen forms and is carried as confirmation',()=>{
 for(const window_type of ['WT-SA-TATE-SUBERI','WT-SA-YOKO-SUBERI']){const r=ui.uiResolver({window_type,construction_module:'zairai',size_mode:'CUSTOM',width:600,height:1000,screen_type:'horizontal_roll_screen',screen_mesh_type:'mushiya_net'});assert.ok(values(r,'screen_mesh_type').includes('mushiya_net'));assert.match(field(r,'screen_mesh_type').values.find(o=>o.value==='mushiya_net').displayLabel,/特注対応/);assert.ok(r.confirmationRequests.some(r=>r.code==='SPECIAL_ORDER_SCREEN_NET'));assert.notEqual(r.validation.status,'INVALID');}
});

test('CUSTOM/native code and category-only contradictory imports cannot be silently normalized',()=>{
 for(const size_code of ['16511','INTERNAL_UNKNOWN_ENUM'])assert.equal(ui.uiResolver({...seed,size_code}).validation.status,'INVALID');
 for(const glass_category of ['option','INTERNAL_UNKNOWN_ENUM'])assert.equal(ui.uiResolver({...seed,glass_category}).validation.status,'INVALID');
 assert.equal(ui.uiResolver({...seed,glass_category:'standard'}).validation.status,'VALID');
 assert.equal(ui.uiResolver({...seed,height:1550,opening_class:'terrace_simple_step'}).validation.status,'INVALID');
});
test('internal source gaps are retained for handoff, while actual customer confirmations stay visible',()=>{
 const result=ui.uiResolver(seed),gaps=result.confirmationRequests.filter(r=>r.message.includes('元マスター'));assert.equal(gaps.length,13);assert.ok(gaps.every(r=>r.customer_visible===false));assert.ok(result.confirmationRequests.some(r=>r.code==='SOURCE_GLAZING_COMBINATION_CONFIRMATION'&&r.customer_visible!==false));
 const snapshot=createProductConfigurationSnapshot({product:entry,result});assert.equal(snapshot.confirmation_requests.filter(r=>r.customer_visible===false).length,13);
});

test('new Sash image presentation defaults to modal references, with explicit validated settings',()=>{
 assert.equal(ui.uiResolver(seed).presentation.choiceImages.mode,'MODAL_ON_DEMAND');
 assert.equal(createRowTableUi(doc,{...entry,imagePresentation:'INLINE'}).uiResolver(seed).presentation.choiceImages.mode,'INLINE');
 assert.throws(()=>createRowTableUi(doc,{...entry,imagePresentation:'unknown'}).uiResolver(seed),/CHOICE_IMAGE_PRESENTATION_INVALID/);
});

test('standard calls start with smallest nominal widths and heights instead of terrace storage order',()=>{
 const r=ui.uiResolver(standard),choices=field(r,'standard_size').values;assert.deepEqual(choices.slice(0,8).map(o=>o.displayLabel.split(' ｜ ')[0]),['06003','06005','06007','06009','06903','06905','06907','06909']);assert.ok(choices.every(o=>o.value!=='CUSTOM'));
 const variants=ui.uiResolver({window_type:seed.window_type,construction_module:'two_by_four',panel_count:'2',size_mode:'STANDARD'});assert.deepEqual(field(variants,'standard_size').values.map(o=>o.displayLabel.split(' ｜ ')[0]).filter(c=>/^160(18|20|22)/.test(c)),['16018A','16018B','16020A','16020B','16022A','16022B']);
 const selected=ui.uiResolver(standard);assert.equal(selected.selection.size_code,'25118-2');assert.equal(selected.selection.width,2550);assert.equal(selected.selection.height,1830);
});
test('all window/module/panel lists sort by nominal width then nominal height and preserve exact native identity',()=>{
 let lists=0;for(const window of doc.master.window_type_master)for(const construction_module of ['zairai','two_by_four'])for(const panel_count of doc.ui_policy.sales_views.standard_size.panel_windows.includes(window.window_type_id)?['2','4']:[undefined]){
  const r=ui.uiResolver({window_type:window.window_type_id,construction_module,size_mode:'STANDARD',...(panel_count?{panel_count}:{})}),choices=field(r,'standard_size')?.values;if(!choices)continue;lists++;assert.ok(choices.every(o=>o.value!=='CUSTOM'));
  const actual=choices.map(o=>o.displayLabel.split(' ｜ ')[0]);for(let i=1;i<actual.length;i++){const a=actual[i-1],b=actual[i],wa=Number(a.slice(0,3)),wb=Number(b.slice(0,3)),ha=Number(a.slice(3,5)),hb=Number(b.slice(3,5));assert.ok(wa<wb||wa===wb&&ha<=hb,window.window_type_id+': '+a+' -> '+b);}
 }assert.ok(lists>=20);
});

test('independent size mode shows only its branch and round-trips legacy CUSTOM snapshots',()=>{
 const current=ui.uiResolver(seed);assert.ok(!field(current,'standard_size'));assert.ok(field(current,'width'));assert.deepEqual(values(current,'size_mode'),['STANDARD','CUSTOM']);assert.equal(current.selection.standard_size,undefined);
 const old={...seed,standard_size:'CUSTOM'};delete old.size_mode;const migrated=ui.uiResolver(old);assert.deepEqual(migrated.selection,current.selection);
 const switched=ui.uiResolver({...current.selection,size_mode:'STANDARD'},{changedFields:['size_mode']});for(const key of ['width','height','opening_class','size_code'])assert.equal(switched.selection[key],undefined);assert.ok(field(switched,'standard_size'));assert.ok(!field(switched,'width'));assert.ok(values(switched,'standard_size').every(v=>v!=='CUSTOM'));assert.ok(switched.validation.missingRequiredFields.includes('standard_size'));
 const cleared=ui.uiResolver({...ui.uiResolver(standard).selection,standard_size:undefined},{changedFields:['standard_size']});assert.equal(cleared.selection.size_mode,'STANDARD');assert.equal(cleared.selection.width,undefined);assert.ok(cleared.validation.missingRequiredFields.includes('standard_size'));
 for(const bad of [{...standard,size_mode:'CUSTOM'},{...seed,size_mode:'STANDARD',standard_size:'CUSTOM'},{...seed,size_mode:'INVALID'}])assert.equal(ui.uiResolver(bad).validation.status,'INVALID');
});

test('glazing function presentation remains a dropdown with unchanged multi-value requests',()=>{
 const result=ui.uiResolver({...seed,glazing_functions:['DISASTER','GRID']});assert.equal(field(result,'glazing_functions').control,'DROPDOWN_MULTI');assert.equal(field(result,'glazing_functions').dataType,'MULTI_ENUM');assert.deepEqual(result.selection.glazing_functions,['DISASTER','GRID']);
});
test('all source paid-option matrix columns have explicit coverage and each native window gets its exact request domain',()=>{
 const audit=JSON.parse(fs.readFileSync(new URL('option-coverage.json',base)));assert.equal(audit.columns.length,97);assert.ok(audit.columns.every(x=>x.coverage));assert.equal(audit.columns.filter(x=>x.coverage==='SOURCE_BACKED_CATALOGUE_REQUEST').length,64);
 const requests=doc.ui_policy.sales_views.request_fields.find(f=>f.key==='catalogue_options');assert.deepEqual(requests.values.map(o=>o.value),audit.columns.filter(x=>x.coverage==='SOURCE_BACKED_CATALOGUE_REQUEST').map(x=>x.id));
 for(const window_type of audit.windows){const result=ui.uiResolver({window_type,construction_module:'zairai',panel_count:'2',size_mode:'CUSTOM',width:600,height:1000});
  const expected=audit.columns.filter(x=>x.coverage==='SOURCE_BACKED_CATALOGUE_REQUEST'&&x.windows[window_type]).map(x=>x.id);assert.deepEqual(values(result,'catalogue_options'),expected,window_type);
 }
});
test('request options reject unsupported imports and clear only invalid descendants on real edits',()=>{
 const saved=ui.uiResolver({...seed,catalogue_options:['CAT-SA-162-18','CAT-SA-163-11']});assert.notEqual(saved.validation.status,'INVALID');assert.deepEqual(ui.uiResolver(saved.selection).selection,saved.selection);
 const edited=ui.uiResolver({...saved.selection,window_type:'WT-SA-YOKO-SUBERI'},{changedFields:['window_type']});assert.deepEqual(edited.selection.catalogue_options,['CAT-SA-162-18']);assert.equal(ui.uiResolver({...saved.selection,window_type:'WT-SA-YOKO-SUBERI'}).validation.status,'INVALID');
 assert.equal(ui.uiResolver({...seed,catalogue_options:['NOT_A_CATALOGUE_OPTION']}).validation.status,'INVALID');
 assert.equal(ui.uiResolver({...seed,catalogue_options:['CAT-SA-162-18','CAT-SA-162-18']}).validation.status,'INVALID');
 const snapshot=createProductConfigurationSnapshot({product:entry,result:saved});assert.ok(snapshot.confirmation_requests.some(r=>r.selection==='CAT-SA-163-11'&&r.source_refs[0].sha256));
});
test('clear source prohibitions are enforced, including four panels and electric-shutter waterproof parts',()=>{
 assert.ok(!values(ui.uiResolver({...standard,panel_count:'4'}),'catalogue_options').includes('CAT-SA-163-01'));
 assert.equal(ui.uiResolver({...seed,catalogue_options:['CAT-SA-163-01','CAT-SA-163-11']}).validation.status,'INVALID');
 const shutter={...seed,window_type:'WT-SA-SHUTTER-HIKI',shutter_operation:'electric',shutter_type:'standard'};assert.ok(!values(ui.uiResolver(shutter),'catalogue_options').includes('CAT-SA-162-17'));
 const manual=ui.uiResolver({...shutter,shutter_operation:'manual'});assert.ok(values(manual,'catalogue_options').includes('CAT-SA-162-17'));
});
test('remote/app/home-device source choices exist on electric shutters and electric high windows only',()=>{
 for(const input of [{...seed,window_type:'WT-SA-SHUTTER-HIKI',shutter_operation:'electric',shutter_type:'standard'},{...seed,window_type:'WT-SA-KOSHO-YOKO',panel_count:undefined,width:1000,height:500,operation_method:'electric_unit'}]){
  const result=ui.uiResolver({...input,request_remote_control:'high_function_remote',request_smart_app:'life_assist2',request_home_device:'life_assist2_home_device'});
  assert.notEqual(result.validation.status,'INVALID');assert.deepEqual(values(result,'request_remote_control'),['single_function_remote','high_function_remote']);assert.deepEqual(values(result,'request_smart_app'),['my_window','life_assist2']);assert.equal(result.selection.request_home_device,'life_assist2_home_device');
  const editKey=input.shutter_operation?'shutter_operation':'operation_method',value=input.shutter_operation?'manual':'chain_operator';const edited=ui.uiResolver({...result.selection,[editKey]:value},{changedFields:[editKey]});
  for(const key of ['request_remote_control','request_smart_app','request_home_device']){assert.equal(edited.selection[key],undefined);assert.ok(!field(edited,key));}
 }
});

test('reviewed source footnotes enforce TATE fan H1600 boundary and INNER long-bracket fan requirement',()=>{
 const low={...seed,window_type:'WT-SA-TATE-SUBERI',panel_count:undefined,width:600,height:1600};assert.ok(values(ui.uiResolver(low),'catalogue_options').includes('CAT-SA-161-14'));
 assert.ok(!values(ui.uiResolver({...low,height:1601}),'catalogue_options').includes('CAT-SA-161-14'));
 const selected=ui.uiResolver({...low,catalogue_options:['CAT-SA-161-14']});const edited=ui.uiResolver({...selected.selection,height:1601},{changedFields:['height']});assert.deepEqual(edited.selection.catalogue_options,[]);assert.equal(ui.uiResolver({...selected.selection,height:1601}).validation.status,'INVALID');
 const inner={...seed,window_type:'WT-SA-UCHIDAOSHI',panel_count:undefined,width:600,height:600,catalogue_options:['CAT-SA-162-09']};assert.ok(ui.uiResolver(inner).validation.errors.some(e=>e.code==='SOURCE_OPTION_COMBINATION_FORBIDDEN'));assert.ok(!ui.uiResolver({...inner,catalogue_options:['CAT-SA-162-09','CAT-SA-161-14']}).validation.errors.some(e=>e.code==='SOURCE_OPTION_COMBINATION_FORBIDDEN'));
});
