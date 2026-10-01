import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRuntimeAppProduct,getRuntimeAppIntegration} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {loadRegisteredRuntime} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {inplusBathroomFormalMaster} from '../src/catalog/runtime-master/inplus-bathroom-formal-adapter.mjs';
import {isSiteSurveyField,splitWorkflowSelection,workflowContextKey} from '../src/work-management/field-workflow-scope.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {createEstimateOutputModel} from '../src/estimate-output/model.mjs';

export const BATHROOM_CASES=[
  {id:'SER-LIXIL-INPLUS',variantKey:'product_variant',dimensionKeys:['width','height'],selection:{product_variant:'bathroom',window_type:'sliding',fit:'tile',glass_family:'ordinary_double',glass_design:'transparent',gas:'dry_air',position_mode:'default',width:1000,height:1000,quantity:2},survey:{effective_depth:50,water_slope_deg:2,bath_bay_window:'present',raw_widths:[999,1000,1001],raw_width_1:999,site_notes:'水掛かり・写真参照',special_request:'設定表証明希望'}},
  {id:'SER-YKKAP-UCHIRIMO',variantKey:'room_specification',dimensionKeys:['size_w','size_h'],selection:{room_specification:'bathroom',window_type:'sliding_window',sash_configuration:'two_panel',reverse_handing:'standard',frame_color:'white',glass_family:'single_glazing',sales_glass_appearance:'clear',frame_spec:'standard',lower_frame_spec:'bathroom_integrated_aluminum_rail',fukashi_presence:'none',crescent_position:'standard',crescent_presence:'installed',crescent_type:'standard',pull_handle_type:'safety_stop_pull',pull_handle_position:'standard',size_w:1000,size_h:1000},survey:{installation_environment:'tile',opening_w_top:999,lower_mounting_surface_horizontal_or_adjustable:'no',mounting_surface_flat:'no',existing_lower_jamb_angle_present:'unknown',hardware_tip_mounting_depth_A_mm:2}},
];

for(const row of BATHROOM_CASES){
  test(`${row.id} estimate omits complete survey section and has no survey Required/save blocker`,async()=>{
    const result=await resolveRuntimeAppProduct(row.id,row.selection);
    assert.equal(result.fields.some(field=>isSiteSurveyField(field.key)),false);
    assert.equal(result.validation.missingRequiredFields.length,0);
    assert.equal(result.validation.errors.length,0);
    assert.equal(result.sales_request_state,'READY_FOR_MANUFACTURER_ESTIMATE');
    assert.ok(row.dimensionKeys.every(key=>result.fields.some(field=>field.key===key&&field.required)));
    assert.ok(result.fields.some(field=>field.key==='glass_family'));
    assert.equal(result.dimensionResult.status,'PASS');
  });
  test(`${row.id} legacy site values are preserved exactly but never reactivated or handed off`,async()=>{
    const input={...row.selection,...row.survey};
    const product={...getRuntimeAppIntegration(row.id),sourceType:'RUNTIME_MASTER'};
    const before=JSON.stringify(input);
    const result=await resolveRuntimeAppProduct(row.id,input);
    assert.equal(JSON.stringify(input),before);
    assert.deepEqual(splitWorkflowSelection(result.selection).siteSurvey,{});
    assert.equal(result.validation.errors.length,0);
    const legacy={product_id:row.id,configuration:input};
    const snapshot=createProductConfigurationSnapshot({product,result,previousSnapshot:legacy});
    const context=workflowContextKey(row.id,input);
    assert.deepEqual(snapshot.workflow_data.site_survey.contexts[context].values,row.survey);
    const reloaded=createProductConfigurationSnapshot({product,result:await resolveRuntimeAppProduct(row.id,snapshot.configuration),previousSnapshot:JSON.parse(JSON.stringify(snapshot))});
    assert.deepEqual(reloaded.workflow_data.site_survey.contexts[context].values,row.survey);
    const model=createEstimateOutputModel({project:{project_id:'p'},estimate:{estimate_id:'e',project_id:'p'},openings:[{opening_id:'o',status:'COMPLETE',product_configuration_snapshot:reloaded}]});
    assert.deepEqual(splitWorkflowSelection(model.rows[0].configuration).siteSurvey,{});
    assert.equal(model.rows[0].display_summary.some(field=>isSiteSurveyField(field.key)),false);
    assert.ok(!JSON.stringify(model).includes('水掛かり・写真参照'));
  });
  test(`${row.id} specification switching retains detached records but not estimate state`,async()=>{
    const product=getRuntimeAppIntegration(row.id);
    const bath=await resolveRuntimeAppProduct(row.id,{...row.selection,...row.survey});
    const saved=createProductConfigurationSnapshot({product,result:bath});
    const standard=await resolveRuntimeAppProduct(row.id,{...bath.selection,[row.variantKey]:row.id==='SER-LIXIL-INPLUS'?'standard':'residential'});
    const changed=createProductConfigurationSnapshot({product,result:standard,previousSnapshot:saved});
    assert.deepEqual(changed.workflow_data,saved.workflow_data);
    const back=await resolveRuntimeAppProduct(row.id,{...standard.selection,[row.variantKey]:'bathroom'});
    assert.deepEqual(splitWorkflowSelection(back.selection).siteSurvey,{});
    assert.equal(back.fields.some(field=>isSiteSurveyField(field.key)),false);
  });
  test(`${row.id} unmodified legacy snapshot output does not leak survey rows or payload`,()=>{
    const snapshot={product_id:row.id,configuration:{...row.selection,...row.survey},display_summary:Object.keys(row.survey).map(key=>({key,label:key,value:'未確認'})),sales_request_handoff:{selection:row.survey},validation_state:'VALID'};
    const original=JSON.stringify(snapshot);
    const model=createEstimateOutputModel({project:{project_id:'p'},estimate:{estimate_id:'e',project_id:'p'},openings:[{status:'COMPLETE',product_configuration_snapshot:snapshot}]});
    assert.equal(model.rows[0].display_summary.length,0);
    assert.equal(JSON.stringify(snapshot),original);
    assert.deepEqual(splitWorkflowSelection(model.rows[0].configuration).siteSurvey,{});
  });
}
test('workflow metadata covers every current survey domain; product frame projection deliberately remains',async()=>{
  const {master}=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
  for(const field of master.fields.filter(field=>['MEASUREMENT','INSTALLATION'].includes(field.domain)&&field.field_name!=='frame_projection'))assert.ok(isSiteSurveyField(field.field_name),field.field_name);
  const formalSurvey=inplusBathroomFormalMaster.fields.slice(inplusBathroomFormalMaster.fields.findIndex(field=>field.id==='effective_depth'));
  for(const field of formalSurvey)assert.ok(isSiteSurveyField(field.id),field.id);
  for(const key of ['frame_spec','lower_frame_spec','fukashi_presence','crescent_position','crescent_p','handle_p','sales_midrail_request','middle_rail_position_f_mm','pull_handle_position_custom_mm','option_items'])assert.equal(isSiteSurveyField(key),false,key);
});
test('Uchirimo no installation assumption: all Formal branches evaluated; all-out-of-range W/H remains invalid',async()=>{
  const row=BATHROOM_CASES[1];
  const result=await resolveRuntimeAppProduct(row.id,row.selection);
  assert.deepEqual(result.workflowDimensionAssessment.candidates.map(row=>row.value),['tile','unit_bath']);
  assert.equal(result.selection.installation_environment,undefined);
  assert.equal(result.selection.bathroom_installation_type,undefined);
  const invalid=await resolveRuntimeAppProduct(row.id,{...row.selection,size_w:9999});
  assert.equal(invalid.validation.status,'INVALID');
  assert.notEqual(invalid.sales_request_state,'READY_FOR_MANUFACTURER_ESTIMATE');
});
test('all seven Formal gaps retained; three site-record gaps deferred, never VERIFIED or fake closed',async()=>{
  const row=BATHROOM_CASES[0],input={...row.selection,...row.survey};
  const result=await resolveRuntimeAppProduct(row.id,input);
  const survey=result.workflow_data.site_survey.contexts[workflowContextKey(row.id,input)];
  const retained=[...result.sales_request_handoff.controlled_unresolved,...survey.controlled_unresolved];
  assert.equal(retained.length,7);
  assert.ok(retained.every(row=>row.auto_resolved===false&&row.status!=='VERIFIED'));
  assert.deepEqual(survey.controlled_unresolved.map(row=>row.gap_id),['IB-G002','IB-G005','IB-G006']);
  assert.equal(result.confirmationRequests.some(row=>['IB-G002','IB-G005','IB-G006'].includes(row.code)),false);
  assert.ok(result.sales_request_handoff.controlled_unresolved.every(row=>row.confirmation_question&&row.confirmation_to));
});
test('site survey workflow preserves original definition, Required and known prohibition assessment',async()=>{
  for(const row of BATHROOM_CASES){
    const site=await resolveRuntimeAppProduct(row.id,{...row.selection,...row.survey},{workflowScope:'site_survey'});
    assert.ok(site.fields.some(field=>isSiteSurveyField(field.key)));
    if(row.id==='SER-LIXIL-INPLUS')assert.ok(site.validation.errors.some(error=>error.errorCode==='INPLUS_BATHROOM_BAY_WINDOW_FORBIDDEN'));
    else assert.ok(site.fields.some(field=>field.key==='hardware_tip_mounting_depth_A_mm'&&field.required));
  }
});
