// Application workflow metadata, not manufacturer facts. Audited against the
// Inplus v1.0 Formal mapping and Uchirimo current measurement/installation metadata.
export const WorkflowScope=Object.freeze({ESTIMATE:'estimate',SITE_SURVEY:'site_survey'});
const roles={
  site_measurement:['existing_opening_w1','existing_opening_w2','existing_opening_w_correction','existing_opening_h1','existing_opening_h2','exterior_trim_a','exterior_trim_b','exterior_trim_c','interior_trim_d','interior_trim_e','interior_trim_j','interior_trim_k','existing_threshold_g','effective_depth','unit_lower_step','resin_trim_clearance','outer_angle_height','water_slope_deg','raw_widths','raw_heights','raw_diagonals','edge_bends','raw_width_1','raw_width_2','raw_width_3','raw_height_1','raw_height_2','raw_height_3','raw_diagonal_1','raw_diagonal_2','edge_bend_top','edge_bend_right','edge_bend_bottom','edge_bend_left','opening_w_top','opening_w_middle','opening_w_bottom','opening_h_left','opening_h_middle','opening_h_right','diagonal_1','diagonal_2','available_mounting_depth','jamb_projection_a_mm','jamb_face_b_mm','jamb_height_h_mm','jamb_height_h1_mm','jamb_height_h2_mm','jamb_height_h3_mm','sill_upper_c_mm','sill_lower_d_mm','vertical_horizontal_jamb_step_e_mm','lower_resin_jamb_space_mm','lower_jamb_a_mm','lower_jamb_a_prime_mm','hardware_tip_mounting_depth_A_mm','existing_angle_height_mm','existing_angle_tip_mm'],
  existing_site_condition:['existing_frame_material','existing_frame_type','fastening_method','fit_result','surround_material','outer_sash_material','outer_angle','mounting_surface_step','bath_bay_window','support_checked','installation_environment','bathroom_installation_type','existing_window_interference','existing_hardware_interference','structural_support_condition','floor_support_condition','construction','wall_surface_for_reinforcement_available','substrate_present','substrate_wall_gap_present','substrate_or_structure_present','substrate_or_structure_wall_gap_present','stud_spacing_condition_met','tool_floor_interference','floor_supports_load','floor_screw_holding','baseboard_interference','lower_mounting_surface_horizontal_or_adjustable','mounting_surface_flat','mounting_surface_damage_protection','resin_jamb_face_screw_fixed','existing_lower_jamb_angle_present','system_bath_component_screw_interference','existing_window_to_jamb_step_large'],
  site_record:['site_notes','special_request'],
};
export const SITE_SURVEY_FIELD_METADATA=Object.freeze(Object.fromEntries(Object.entries(roles).flatMap(([responsibility,keys])=>keys.map(key=>[key,Object.freeze({responsibility,workflowScopes:Object.freeze(['site_survey'])})]))));
// Product selectors sharing INSTALLATION_SURVEY presentation stage (frame,
// fukashi, crescent/midrail/handle positions) deliberately remain estimate fields.
const bathroomProfiles=Object.freeze({'SER-LIXIL-INPLUS':'product_variant','SER-YKKAP-UCHIRIMO':'room_specification'});
const confirmationScopes=Object.freeze({'IB-G002':'site_survey','IB-G005':'site_survey','IB-G006':'site_survey'});
export const isSiteSurveyField=(key)=>Boolean(SITE_SURVEY_FIELD_METADATA[key]);
export function isBathroomEstimateContext(productId,selection={}){const variantKey=bathroomProfiles[productId];return Boolean(variantKey&&selection[variantKey]==='bathroom');}
export const isSeparatedEstimateContext=(productId,selection={})=>productId==='SER-LIXIL-RECHENT-D3-NF'||isBathroomEstimateContext(productId,selection);
export const workflowContextKey=(productId,selection={})=>`${productId}::${selection[bathroomProfiles[productId]]??'standard'}`;
export function splitWorkflowSelection(selection={}){
  const estimate={},siteSurvey={};
  for(const [key,value] of Object.entries(selection))(isSiteSurveyField(key)?siteSurvey:estimate)[key]=value;
  return {estimate,siteSurvey};
}
const scopeOf=(row)=>confirmationScopes[row?.gap_id??row?.code]??(isSiteSurveyField(row?.field)?'site_survey':'estimate');
export function estimateHandoff(handoff){
  if(!handoff)return handoff;
  const project=(value)=>Array.isArray(value)?value.filter(row=>scopeOf(row)!=='site_survey').map(project):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!isSiteSurveyField(key)).map(([key,item])=>[key,project(item)])):value;
  const result=project(handoff);
  if(result.controlled_unresolved)result.active_confirmation_count=result.controlled_unresolved.filter(row=>row.active).length;
  return result;
}
export function mergeWorkflowData(previous={},incoming={}){
  const contexts={...(previous?.site_survey?.contexts??{})};
  for(const [key,record] of Object.entries(incoming?.site_survey?.contexts??{}))contexts[key]={...contexts[key],...record,values:{...contexts[key]?.values,...record.values}};
  return Object.keys(contexts).length?{...previous,schema_version:'1.0',site_survey:{...previous.site_survey,contexts}}:previous;
}
export function projectEstimateResult(result,input={}){
  const {estimate:selection}=splitWorkflowSelection(result.selection);
  const {siteSurvey:values}=splitWorkflowSelection(input);
  const deferred=(result.sales_request_handoff?.controlled_unresolved??[]).filter(row=>scopeOf(row)==='site_survey');
  const confirmationRequests=(result.confirmationRequests??[]).filter(row=>scopeOf(row)!=='site_survey');
  const fields=result.fields.filter(row=>!isSiteSurveyField(row.key)).map(row=>({...row,workflowScopes:['estimate','site_survey']}));
  const errors=(result.validation?.errors??[]).filter(row=>!isSiteSurveyField(row.field));
  const missingRequiredFields=(result.validation?.missingRequiredFields??[]).filter(key=>!isSiteSurveyField(key));
  const ready=!errors.length&&!missingRequiredFields.length&&!['PENDING','BLOCK','BLOCKED'].includes(result.dimensionResult?.status);
  const status=errors.length?'INVALID':!ready?'INCOMPLETE':confirmationRequests.length||result.dimensionResult?.status==='REVIEW_REQUIRED'?'MANUAL_CHECK':'VALID';
  return {...result,selection,fields,confirmationRequests,workflowScope:'estimate',
    workflow_data:{schema_version:'1.0',site_survey:{contexts:{[workflowContextKey(result.productId,input)]:{values,controlled_unresolved:deferred,assessment_status:'DEFERRED_NOT_VERIFIED'}}}},
    sales_request_handoff:estimateHandoff(result.sales_request_handoff),sales_request_state:ready?'READY_FOR_MANUFACTURER_ESTIMATE':'INCOMPLETE',
    dependencyFields:(result.dependencyFields??[]).filter(row=>!isSiteSurveyField(row.key)),
    clearedFields:(result.clearedFields??[]).filter(key=>!isSiteSurveyField(key)),
    validation:{...result.validation,status,errors,missingRequiredFields},
    manualWarnings:result.sales_request_handoff?.controlled_unresolved?(confirmationRequests.length?[`未確定事項 ${confirmationRequests.length}件を自動確定せず、確認事項として引き継ぎます。`]:[]):result.manualWarnings,
  };
}
// Output projection also protects unmodified legacy snapshots, without writing
// or deleting any saved site-survey data.
export function projectEstimateSnapshot(snapshot){
  if(!snapshot||!isSeparatedEstimateContext(snapshot.product_id,snapshot.configuration))return snapshot;
  return {...snapshot,configuration:splitWorkflowSelection(snapshot.configuration).estimate,
    display_summary:(snapshot.display_summary??[]).filter(row=>!isSiteSurveyField(row.key)),
    confirmation_requests:(snapshot.confirmation_requests??[]).filter(row=>scopeOf(row)!=='site_survey'),
    sales_request_handoff:estimateHandoff(snapshot.sales_request_handoff)};
}
