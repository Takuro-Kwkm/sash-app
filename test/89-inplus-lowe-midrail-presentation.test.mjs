import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRuntimeAppProduct} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {loadRegisteredRuntime} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {validateInplusMidrailF} from '../src/catalog/runtime-master/inplus-presentation-rules.mjs';
const id='SER-LIXIL-INPLUS';
const seed={window_type:'引違い窓',sash_configuration:'2枚建',order_width:1600,order_height:1800,upper_frame_spec:'standard',frame_spec:'standard',lower_frame_spec:'general',fukashi_presence:'none',glass_family:'Low-E複層',glass_type:'透明',sash_midrail:'あり',middle_rail_position_mode:'custom',middle_rail_position_f_mm:1000};
const field=(r,k)=>r.fields.find(f=>f.key===k);
const resolve=(patch={})=>resolveRuntimeAppProduct(id,{...seed,...patch});
test('Low-E labels use current glass construction and retain canonical colors',async()=>{
  for(const color of ['クリア','グリーン']){
    const normal=await resolve({lowe_color:color});
    assert.equal(normal.selection.lowe_color,color);
    assert.equal(field(normal,'lowe_color').values.find(v=>v.value===color).displayLabel,color==='クリア'?'断熱（クリア）':'高遮熱（グリーン）');
    const washi=await resolveRuntimeAppProduct(id,{...normal.selection,glass_type:'和紙調・格子入り'});
    assert.equal(field(washi,'lowe_color').values.find(v=>v.value===color).displayLabel,color);
    const restored=await resolveRuntimeAppProduct(id,{...washi.selection,glass_type:'透明'});
    assert.equal(field(restored,'lowe_color').values.find(v=>v.value===color).displayLabel,color==='クリア'?'断熱（クリア）':'高遮熱（グリーン）');
  }
  const noGrid=await resolve({glass_type:'和紙調・格子なし'});
  assert.equal(field(noGrid,'lowe_color').values.find(v=>v.value==='グリーン').displayLabel,'高遮熱（グリーン）');
  assert.equal(field(noGrid,'lowe_color').values.find(v=>v.value==='クリア').displayLabel,'クリア');
});
test('middle rail branches, required input, flow order, and handoff',async()=>{
  const r=await resolve({crescent_presence:'installed',crescent_position_mode:'custom',crescent_position_p_mm:800});
  const keys=r.fields.map(f=>f.key);
  const ordered=['sales_midrail_request','middle_rail_position_mode','option_items','order_width','order_height','crescent_position_p_mm','middle_rail_position_f_mm'];
  for(let i=1;i<ordered.length;i++)assert.ok(keys.indexOf(ordered[i-1])<keys.indexOf(ordered[i]));
  assert.equal(field(r,'sash_midrail'),undefined);
  assert.equal(r.selection.sash_midrail,'あり');
  assert.equal(field(r,'middle_rail_position_f_mm').unit,'mm');
  assert.equal(r.sales_request_handoff.middle_rail_position_f_mm,1000);
  assert.deepEqual(r.sales_request_handoff.middle_rail_position_validation.rule_ids,['PF-006','PF-008']);
  assert.equal(r.orderReady,false);
  const missing=await resolve({middle_rail_position_f_mm:null});
  assert.ok(missing.validation.missingRequiredFields.includes('middle_rail_position_f_mm'));
  const noMode=await resolve({middle_rail_position_mode:null});
  assert.ok(noMode.validation.missingRequiredFields.includes('middle_rail_position_mode'));
  const none=await resolve({sash_midrail:'なし'});
  assert.equal(field(none,'middle_rail_position_mode'),undefined);
  assert.equal(field(none,'middle_rail_position_f_mm'),undefined);
});
test('formal SG/PG and standard/adjust PF range boundaries and P coupling',async()=>{
  for(const [glass_family,upper_frame_spec,rangeRule,coupledRule,offset] of [
    ['単板','standard','PF-005','PF-007',102.5],['Low-E複層','standard','PF-006','PF-008',110],
    ['単板','adjust_upper_frame','PF-A05','PF-A07',102.5],['一般複層','adjust_upper_frame','PF-A06','PF-A08',110],
  ]){
    const h=1800+(upper_frame_spec==='adjust_upper_frame'?2:0),min=h/4+offset,max=3*h/4+offset;
    for(const f of [min,max]){
      const r=await resolve({glass_family,upper_frame_spec,middle_rail_position_f_mm:f});
      assert.equal(r.sales_request_handoff.middle_rail_position_validation.status,upper_frame_spec==='standard'?'FORMAL_RULE_RANGE_VALID':'ESTIMATE_CONFIRM_REQUIRED');
      assert.deepEqual(r.sales_request_handoff.middle_rail_position_validation.rule_ids,[rangeRule]);
    }
    for(const f of [min-0.5,max+0.5]){
      const r=await resolve({glass_family,upper_frame_spec,middle_rail_position_f_mm:f});
      assert.ok(r.validation.errors.some(e=>e.errorCode==='INPLUS_MIDRAIL_POSITION_OUT_OF_RANGE'));
    }
    const valid=await resolve({glass_family,upper_frame_spec,crescent_position_mode:'custom',crescent_position_p_mm:800,middle_rail_position_f_mm:1000});
    assert.deepEqual(valid.sales_request_handoff.middle_rail_position_validation.rule_ids,[rangeRule,coupledRule]);
    assert.equal(valid.sales_request_handoff.middle_rail_position_validation.status,'FORMAL_RULE_RANGE_VALID');
    const invalid=await resolve({glass_family,upper_frame_spec,crescent_position_mode:'custom',crescent_position_p_mm:1000,middle_rail_position_f_mm:1050});
    assert.equal(invalid.sales_request_handoff.middle_rail_position_validation.status,'INVALID');
    const belowValid=await resolve({glass_family,upper_frame_spec,crescent_position_mode:'custom',crescent_position_p_mm:1100,middle_rail_position_f_mm:1000});
    assert.equal(belowValid.sales_request_handoff.middle_rail_position_validation.status,'FORMAL_RULE_RANGE_VALID');
    const belowInvalid=await resolve({glass_family,upper_frame_spec,crescent_position_mode:'custom',crescent_position_p_mm:1050,middle_rail_position_f_mm:1000});
    assert.equal(belowInvalid.sales_request_handoff.middle_rail_position_validation.status,'INVALID');
  }
});
test('missing context or unsupported formal formula goes to estimate confirmation',async()=>{
  const {master}=await loadRegisteredRuntime('LIXIL','インプラス');
  const state={fields:Object.fromEntries(Object.entries({order_height:1800,upper_frame_spec:'standard',size_class:'テラスタイプ',glass_family:'単板'}).map(([k,value])=>[k,{value}]))};
  assert.equal(validateInplusMidrailF(master,{fields:{}},1000).status,'ESTIMATE_CONFIRM_REQUIRED');
  const altered={document:{tables:{pf_position_rules:{records:master.document.tables.pf_position_rules.records.map(r=>r.rule_id==='PF-005'?{...r,判定式:'UNSUPPORTED'}:r)}}}};
  assert.equal(validateInplusMidrailF(altered,state,1000).status,'ESTIMATE_CONFIRM_REQUIRED');
  const r=await resolve({order_height:1300});
  assert.equal(r.sales_request_handoff.middle_rail_position_validation.status,'ESTIMATE_CONFIRM_REQUIRED');
  assert.ok(r.confirmationRequests.some(r=>r.code==='INPLUS_MIDRAIL_F_CONFIRM'));
});
test('all upstream reset paths remove hidden position values and handoff',async()=>{
  const original=await resolve();
  for(const patch of [{middle_rail_position_mode:'standard'},{sales_midrail_request:'なし'},{order_height:1000},{window_type:'FIX窓'},{sash_configuration:'4枚建（障子W指定）'}]){
    const r=await resolveRuntimeAppProduct(id,{...original.selection,...patch});
    assert.equal(r.selection.middle_rail_position_f_mm,undefined);
    assert.equal(r.sales_request_handoff.middle_rail_position_f_mm,undefined);
    assert.equal(r.sales_request_handoff.middle_rail_position_validation,undefined);
    assert.ok(r.clearedFields.includes('middle_rail_position_f_mm'));
    if(!patch.middle_rail_position_mode)assert.equal(r.selection.middle_rail_position_mode,undefined);
    if(patch.order_height||patch.window_type||patch.sash_configuration)assert.equal(r.selection.sash_midrail,undefined);
  }
});
test('cold start accepts the request and position before W/H but only projects eligible Formal midrail',async()=>{
  const first=await resolveRuntimeAppProduct(id,{window_type:'引違い窓',sash_configuration:'2枚建'});
  assert.ok(field(first,'sales_midrail_request'));
  assert.equal(field(first,'sash_midrail'),undefined);
  const requested=await resolveRuntimeAppProduct(id,{...first.selection,sales_midrail_request:'あり',middle_rail_position_mode:'custom'});
  assert.ok(field(requested,'middle_rail_position_mode'));
  assert.equal(field(requested,'middle_rail_position_f_mm'),undefined);
  assert.equal(requested.selection.sash_midrail,undefined);
  assert.equal(requested.sales_request_handoff.middle_rail_position_mode,undefined);
  assert.equal(requested.sales_request_state,'PENDING_FORMAL_MIDRAIL_APPLICABILITY');
  const eligible=await resolveRuntimeAppProduct(id,{...requested.selection,...seed,sash_midrail:undefined,order_height:1800,sales_midrail_request:'あり'});
  assert.equal(eligible.selection.sash_midrail,'あり');
  assert.ok(field(eligible,'middle_rail_position_f_mm'));
  assert.equal(eligible.sales_request_handoff.middle_rail_position_mode,'custom');
  const windowType=await resolveRuntimeAppProduct(id,{...eligible.selection,order_height:1000});
  assert.equal(windowType.selection.sales_midrail_request,'あり');
  assert.equal(windowType.selection.sash_midrail,undefined);
  assert.equal(windowType.selection.middle_rail_position_mode,undefined);
  assert.equal(windowType.selection.middle_rail_position_f_mm,undefined);
  assert.equal(windowType.sales_request_handoff.middle_rail_position_mode,undefined);
  assert.ok(windowType.validation.errors.some(error=>error.errorCode==='INPLUS_MIDRAIL_NOT_APPLICABLE'));
  const restored=await resolveRuntimeAppProduct(id,{...windowType.selection,order_height:1800});
  assert.equal(restored.selection.sash_midrail,'あり');
  assert.ok(field(restored,'middle_rail_position_mode'));
  const ambiguous=await resolveRuntimeAppProduct(id,{...requested.selection,...seed,order_height:1300,sash_midrail:undefined});
  assert.equal(ambiguous.selection.sash_midrail,undefined);
  assert.equal(ambiguous.sales_request_handoff.middle_rail_position_mode,undefined);
  assert.equal(ambiguous.sales_request_state,'PENDING_FORMAL_MIDRAIL_APPLICABILITY');
});
