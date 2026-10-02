import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRegisteredRuntime,getRuntimeMasterEntry} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {loadFormalProductRuntimeV2Package} from '../src/catalog/runtime-master/formal-product-runtime-v2-loader.mjs';
import {resolveRuntimeAppProduct,runtimeAppIntegrationInventory} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {projectEstimateSnapshot,isSiteSurveyField} from '../src/work-management/field-workflow-scope.mjs';
import {RECHENT_ID,completeRechent,RECHENT_BUSINESS_CASES} from './helpers/rechent-estimate-cases.mjs';

for(const {name,...seed} of RECHENT_BUSINESS_CASES)test('estimate business journey '+name,async()=>{
 const result=await completeRechent(seed);
 assert.deepEqual(result.validation.errors,[]);
 assert.deepEqual(result.validation.missingRequiredFields,[]);
 assert.equal(result.fields.some(row=>isSiteSurveyField(row.key)),false);
 assert.equal(Object.keys(result.selection).some(isSiteSurveyField),false);
 if(name.includes('manual-check')){
  assert.ok(result.confirmationRequests.some(row=>row.code==='HIGH_SIZE_DOUBLE_CHILD_RANGE_UNVERIFIED'));
  assert.equal(result.orderReady,false);
 }
});

test('every Formal frame/design and hardware group is selectable without manufacturing new facts',async()=>{
 const p=await loadFormalProductRuntimeV2Package(getRuntimeMasterEntry('LIXIL','リシェント玄関ドア3 非防火'));
 const product=p.documentsByFileName['product_rules.json'],hardware=p.documentsByFileName['hardware_rules.json'];
 for(const frame of product.frame_atomic_rules.filter(row=>row.result==='ALLOW')){
  const uiThermals=frame.thermal_scope==='INSULATION_K2_K4'?['INSULATION_K2','INSULATION_K4']:[frame.thermal_scope];
  for(const thermal_spec of uiThermals){
   const seed={thermal_spec,opening_type:frame.frame_configuration,design:frame.design_id};
   const result=await resolveRuntimeAppProduct(RECHENT_ID,seed);
   assert.equal(result.selection.thermal_spec,thermal_spec,JSON.stringify(seed));
   assert.equal(result.selection.design,frame.design_id,JSON.stringify(seed));
   const expected=hardware.hardware_atomic_rules.filter(row=>row.result==='ALLOW'&&row.thermal_scope===frame.thermal_scope&&row.design_id===frame.design_id);
   assert.ok(expected.length);
   assert.deepEqual(new Set(result.fields.find(row=>row.key==='handle_type').values.map(row=>row.value)),new Set(expected.map(row=>row.handle_type)));
  }
 }
});

test('legacy Survey mode cannot leak to estimate validation, saved payload or output',async()=>{
 const valid=await completeRechent(RECHENT_BUSINESS_CASES[0]);
 const legacy={...valid.selection,runtime_mode:'SURVEY_LINKED',existing_frame_material:'legacy-material',existing_frame_type:'legacy-type',fastening_method:'legacy-fixing',existing_opening_w1:999,fit_result:'OLD_FAILURE',exterior_trim_a:35};
 const result=await resolveRuntimeAppProduct(RECHENT_ID,legacy);
 assert.deepEqual(result.validation.errors,[]);assert.deepEqual(result.validation.missingRequiredFields,[]);
 const product=runtimeAppIntegrationInventory().find(row=>row.id===RECHENT_ID);
 const snapshot=createProductConfigurationSnapshot({product,result});
 assert.equal(Object.keys(snapshot.configuration).some(isSiteSurveyField),false);
 assert.equal(snapshot.validation_state,'VALID');
 const context=Object.values(snapshot.workflow_data.site_survey.contexts)[0];assert.equal(context.values.existing_opening_w1,999);
 const projected=projectEstimateSnapshot({...snapshot,configuration:legacy,display_summary:[{key:'fit_result',value:'OLD_FAILURE'}]});
 assert.equal(Object.keys(projected.configuration).some(isSiteSurveyField),false);assert.deepEqual(projected.display_summary,[]);
 const survey=await resolveRuntimeAppProduct(RECHENT_ID,legacy,{workflowScope:'site_survey'});
 assert.ok(survey.validation.errors.some(row=>row.errorCode==='SURVEY_LAYER_VALUE_SOURCE_REQUIRED'));
});

test('K2 and K4 are separate business selections, battery is localized, and key set follows lock type',async()=>{
 const initial=await resolveRuntimeAppProduct(RECHENT_ID,{});
 const thermal=initial.fields.find(row=>row.key==='thermal_spec').values;
 assert.deepEqual(thermal.map(row=>row.value),['HIGH_INSULATION','INSULATION_K2','INSULATION_K4','ALUMINUM']);
 assert.deepEqual(thermal.map(row=>row.displayLabel),['高断熱仕様','断熱仕様 k2','断熱仕様 k4','アルミ仕様']);
 assert.equal(thermal.some(row=>row.value==='INSULATION_K2_K4'),false);
 for(const thermal_spec of ['INSULATION_K2','INSULATION_K4']){
  const result=await completeRechent({thermal_spec,opening_type:'PARENT_CHILD',design:'G12',lock_type:'FAMILOCK'});
  assert.equal(result.selection.thermal_spec,thermal_spec);
  const power=result.fields.find(row=>row.key==='electric_lock_power');
  assert.equal(power.values.find(row=>row.value==='BATTERY')?.displayLabel,'電池式');
  assert.equal(power.values.find(row=>row.value==='AC100V')?.displayLabel,'AC100V');
  const keys=result.fields.map(row=>row.key);
  assert.equal(keys.indexOf('key_set'),keys.indexOf('lock_type')+1);
 }
});

test('FamiLock/manual, frame/design and flat transitions clear inapplicable children to a fixed point',async()=>{
 const valid=await completeRechent({...RECHENT_BUSINESS_CASES[4],electric_lock_plan:'BASIC'});
 assert.ok(valid.fields.find(row=>row.key==='lock_type').values.some(row=>row.value==='MANUAL'));
 assert.deepEqual(valid.fields.find(row=>row.key==='interior_trim').values.map(row=>row.displayLabel),['特大','大','小']);
 const manual=await resolveRuntimeAppProduct(RECHENT_ID,{...valid.selection,lock_type:'MANUAL',additional_key:['RE3NF-OPT-REMOTE']});
 for(const key of ['electric_lock_power','electric_lock_reader','electric_lock_plan','key_set','additional_key'])assert.equal(Object.hasOwn(manual.selection,key),false,key);
 assert.equal(manual.selection.body_color,valid.selection.body_color);
 const single=await resolveRuntimeAppProduct(RECHENT_ID,{...valid.selection,opening_type:'SINGLE',child_door:'K11',sidelight_spec:'PLAIN'});
 assert.equal(Object.hasOwn(single.selection,'child_door'),false);assert.equal(Object.hasOwn(single.selection,'sidelight_spec'),false);
 const high=await resolveRuntimeAppProduct(RECHENT_ID,{...valid.selection,thermal_spec:'HIGH_INSULATION',threshold_flat_material:'PRESENT'});
 assert.equal(Object.hasOwn(high.selection,'threshold_flat_material'),false);
 assert.equal(Object.hasOwn(high.selection,'design'),false);
});

test('Formal dimension boundaries, high size and parent-specific maximum reject out-of-range input',async()=>{
 const parent=await completeRechent(RECHENT_BUSINESS_CASES[10]);
 assert.equal((await resolveRuntimeAppProduct(RECHENT_ID,{...parent.selection,size_h:2357})).validation.status,'INVALID');
 for(const size_w of [713,978,0,-1,Infinity])assert.equal((await resolveRuntimeAppProduct(RECHENT_ID,{...parent.selection,opening_type:'SINGLE',size_w})).validation.status,'INVALID');
 const high=await completeRechent(RECHENT_BUSINESS_CASES[5]);
 assert.deepEqual(high.validation.errors,[]);
 assert.equal((await resolveRuntimeAppProduct(RECHENT_ID,{...high.selection,size_h:2601})).validation.status,'INVALID');
 assert.equal((await resolveRuntimeAppProduct(RECHENT_ID,{...high.selection,size_h:2440,design:'G13'})).validation.status,'INVALID');
 const runtime=await loadRegisteredRuntime('LIXIL','リシェント玄関ドア3 非防火');assert.ok(runtime.sourcePackageIntegrity.match);
});
