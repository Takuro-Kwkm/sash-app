import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {adaptComposedProductRuntime,resolveMigratedCandidateSelection} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {applyDeclaredWindowFlow} from '../src/catalog/runtime-master/declared-window-flow.mjs';import {getRuntimeAppIntegration} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';import {loadRegisteredRuntime} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
const root='changes/replus-runtime-v5',index=JSON.parse(readFileSync(root+'/index.json')),readers=new Map();
async function ui(name,input={}){const e=index.products.find(e=>e.id==='CANDIDATE:'+name);if(!readers.has(name))readers.set(name,await adaptComposedProductRuntime(JSON.parse(readFileSync(root+'/'+e.path)),e,async id=>{const m=getRuntimeAppIntegration(id);return loadRegisteredRuntime(m.manufacturer,m.series)}));const r=readers.get(name).uiResolver(input);r.internalFields=r.fields;r.fields=applyDeclaredWindowFlow(r.fields,e);return r;}
const field=(r,k)=>r.fields.find(f=>f.key===k)??r.internalFields?.find(f=>f.key===k);
test('both dimensions are visible; only selected basis is editable and required across four direct variants',async()=>{
 for(const name of ['RPL_ROOM','RPL_TW','RPL_EW','RPL_BATH']){
  let r=await ui(name,{window_type:name+'_SLD',dimension_basis:'SURVEY',survey_width:1010,survey_height:1810,custom_width:9999,custom_height:9999});
  assert.equal(r.selection.custom_width,1000);assert.equal(r.selection.custom_height,1800);assert.equal(r.selection.size_mode,'CUSTOM');assert.ok(!field(r,'survey_width').readOnly);assert.ok(field(r,'survey_width').required);assert.ok(field(r,'custom_width').readOnly);assert.equal(field(r,'custom_width').required,false);assert.ok(!r.validation.missingRequiredFields.includes('custom_width'));
  r=await ui(name,{...r.selection,dimension_basis:'FINISHED',custom_width:900,survey_width:1});assert.equal(r.selection.survey_width,910);assert.equal(r.selection.custom_width,900);assert.ok(field(r,'survey_width').readOnly);assert.ok(!field(r,'custom_width').readOnly);
  const blank=await ui(name,{...r.selection,dimension_basis:''});assert.equal(blank.selection.dimension_basis,undefined);for(const key of ['survey_width','survey_height','custom_width','custom_height'])assert.equal(blank.selection[key],undefined);
 }
});
test('empty, invalid and cleared input never leave stale derived dimensions',async()=>{
 let r=await ui('RPL_ROOM',{dimension_basis:'SURVEY',survey_width:'1010.5',survey_height:1010});assert.equal(r.selection.custom_width,1000.5);
 r=await ui('RPL_ROOM',{...r.selection,survey_width:''});assert.equal(r.selection.custom_width,undefined);assert.ok(r.validation.missingRequiredFields.includes('survey_width'));assert.ok(!r.validation.missingRequiredFields.includes('custom_width'));
 r=await ui('RPL_ROOM',{...r.selection,survey_width:'invalid',custom_width:1000});assert.equal(r.selection.custom_width,undefined);assert.equal(r.selection.survey_width,undefined);
});
test('finished dimensions drive classification, incompatible sash clearing and original boundary rejection',async()=>{
 let r=await ui('RPL_TW',{window_type:'RPL_TW_SLD',frame_type:'RPL_TW_FRAME',spec_panel_configuration:'TW-SS-PANEL-2',spec_sash_configuration:'TW-SS-HANDLE',dimension_basis:'SURVEY',survey_width:2010,survey_height:1810});assert.equal(r.selection.spec_height_category,'TW-SS-TER');assert.equal(r.selection.spec_sash_configuration,'TW-SS-HANDLE');
 r=await ui('RPL_TW',{...r.selection,survey_height:1010});assert.equal(r.selection.spec_sash_configuration,undefined);assert.ok(r.clearedFields.includes('spec_sash_configuration'));
 r=await ui('RPL_TW',{...r.selection,survey_width:20000});assert.equal(r.dimensionResult.status,'BLOCK');assert.equal(r.validation.status,'INVALID');assert.equal(r.orderReady,false);
});
test('inner-fit is immediately after glass and carries mandatory base separately from selectable options',async()=>{
 for(const name of ['RPL_ROOM','RPL_TW','RPL_EW','RPL_BATH']){
  let r=await ui(name,{window_type:name+'_SLD',installation_method:'INNER_FIT_INSET',bathroom_remodel_mode:'WINDOW_ONLY',frame_type:name==='RPL_ROOM'?'RPL_STD':name==='RPL_TW'?'RPL_TW_FRAME':name==='RPL_EW'?'RPL_EW_FRAME':'BATH-STD',spec_sash_configuration:name==='RPL_EW'?'EW-SS-PG':undefined,glass_category:name==='RPL_ROOM'?'Low-E複層ガラス':name==='RPL_TW'?'TW-GL-TRIPLE':name==='RPL_EW'?'EW-GL-DOUBLE':'LOW_E_DOUBLE'});
  const groups=[...new Set(r.fields.map(f=>f.presentationGroup.id))];assert.equal(groups[groups.indexOf('glazing')+1],'inner_fit');assert.equal(groups[groups.indexOf('inner_fit')+1],'interior_finish');
  assert.ok(field(r,'inner_fit_required_component').readOnly);assert.ok(r.selection.inner_fit_required_component);assert.ok(!field(r,'options').values.some(v=>v.value===r.selection.inner_fit_required_component));assert.ok(r.manualWarnings.some(w=>w.includes('内はめ用の製作範囲')));
  r=await ui(name,{...r.selection,installation_method:'STANDARD'});assert.equal(r.selection.inner_fit_required_component,undefined);assert.equal(field(r,'inner_fit_required_component'),undefined);assert.equal(r.orderReady,false);
 }
});
test('old finished input retains meaning; ambiguous old inner-fit choice requires a fresh selection',async()=>{
 const r=await ui('RPL_TW',{window_type:'RPL_TW_SLD',size_mode:'CUSTOM',custom_width:1000,custom_height:1800});assert.equal(r.selection.dimension_basis,'FINISHED');assert.equal(r.selection.survey_width,1010);
 const e=index.products.find(e=>e.id==='CANDIDATE:RPL_TW'),d=JSON.parse(readFileSync(root+'/'+e.path));const next=resolveMigratedCandidateSelection(readers.get('RPL_TW'),{window_type:'RPL_TW_SLD',installation_method:'内嵌め用'},d.selection_migrations);assert.equal(next.selection.installation_method,undefined);assert.ok(next.validation.missingRequiredFields.includes('installation_method'));
});
test('attachment finished sizes use existing official transforms and cannot be overridden by submitted values',async()=>{
 for(const name of ['RPL_ATT_TW','RPL_ATT_TH']){
  let r=await ui(name,{survey_w:1010,survey_h:1810,attachment_finished_w:1,attachment_finished_h:1});assert.equal(r.selection.attachment_finished_w,1000);assert.equal(r.selection.attachment_finished_h,1800);assert.ok(field(r,'attachment_finished_w').readOnly);
  r=await ui(name,{...r.selection,survey_w:''});assert.equal(r.selection.attachment_finished_w,undefined);
 }
 const cut=await ui('RPL_CUT_MALL',{survey_w:1010,survey_h:1810});assert.equal(cut.selection.attachment_finished_w,undefined);assert.equal(field(cut,'installation_method'),undefined);
});
