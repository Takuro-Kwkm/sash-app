import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname,join } from 'node:path';
import { getRuntimeAppIntegration, resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {
  INPLUS_BATHROOM_CANONICAL_MAPPING,
  INPLUS_BATHROOM_FORMAL_SHA256,
  inplusBathroomFormalMaster,
} from '../src/catalog/runtime-master/inplus-bathroom-formal-adapter.mjs';
import { createProductConfigurationSnapshot } from '../src/work-management/domain.mjs';
import { createEstimateOutputModel } from '../src/estimate-output/model.mjs';

const HERE=dirname(fileURLToPath(import.meta.url));
const PRODUCT='SER-LIXIL-INPLUS';
const FORMAL=join(HERE,'../src/catalog/runtime-master-packages/lixil-inplus-bathroom-v1.0/formal-product-master.json');
const COMPLETE_SLIDING={
  product_variant:'bathroom',window_type:'sliding',fit:'tile',glass_family:'ordinary_double',glass_design:'transparent',gas:'dry_air',
  position_mode:'default',width:1000,height:1000,quantity:2,effective_depth:100,water_slope_deg:0,
  surround_material:'aluminum',outer_sash_material:'aluminum',outer_angle:'present',mounting_surface_step:'absent',bath_bay_window:'absent',support_checked:'confirmed',
};

test('bathroom v1.0 uses the exact read-only Formal file and maps all 40 Formal fields',async()=>{
  const bytes=await readFile(FORMAL);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),INPLUS_BATHROOM_FORMAL_SHA256);
  assert.equal(inplusBathroomFormalMaster.revision,'v1.0');
  assert.equal(inplusBathroomFormalMaster.identity.product_id,'LIXIL_INPLUS_BATHROOM');
  assert.equal(INPLUS_BATHROOM_CANONICAL_MAPPING.length,40);
  assert.equal(INPLUS_BATHROOM_CANONICAL_MAPPING.filter((row)=>row.status==='MAPPED').length,40);
  assert.equal(INPLUS_BATHROOM_CANONICAL_MAPPING.filter((row)=>row.status==='ERROR').length,0);
  const initial=await resolveRuntimeAppProduct(PRODUCT,{product_variant:'bathroom'});
  assert.ok(initial.fields.filter((field)=>field.helpText).every((field)=>!/[A-Z]{2,}-G\d|estimator|unknown/i.test(field.helpText)));
  assert.ok(initial.manualWarnings.every((message)=>!message.includes('Controlled Unresolved')));
});

test('Inplus remains one top-level product and exposes standard/bathroom as product variants',async()=>{
  const integration=getRuntimeAppIntegration(PRODUCT);
  assert.equal(integration.series,'インプラス');
  assert.deepEqual(integration.productVariantContract.variants.map((row)=>row.value),['standard','bathroom']);
  const standard=await resolveRuntimeAppProduct(PRODUCT,{});
  assert.equal(standard.selection.product_variant,'standard');
  assert.equal(standard.fields[0].key,'product_variant');
  const bathroom=await resolveRuntimeAppProduct(PRODUCT,{product_variant:'bathroom'});
  assert.equal(bathroom.selection.product_variant,'bathroom');
  assert.equal(bathroom.fields[0].key,'product_variant');
  assert.equal(bathroom.runtimeMaster.packageVersion,'v1.0');
});

test('Scenario A sliding/tile reaches estimate handoff with Formal fields and request quantity',async()=>{
  const result=await resolveRuntimeAppProduct(PRODUCT,COMPLETE_SLIDING);
  assert.deepEqual(result.validation.errors,[]);
  assert.deepEqual(result.validation.missingRequiredFields,[]);
  assert.equal(result.sales_request_state,'READY_FOR_MANUFACTURER_ESTIMATE');
  assert.equal(result.sales_request_handoff.product_variant,'浴室仕様');
  assert.equal(result.sales_request_handoff.selection.panel_count,'two_panels');
  assert.equal(result.sales_request_handoff.selection.color,'precious_white_p');
  assert.equal(result.sales_request_handoff.quantity,2);
  assert.equal(result.orderReady,false);
});

test('Scenario B casement requires handing and handle position, then validates H/P',async()=>{
  const incomplete=await resolveRuntimeAppProduct(PRODUCT,{...COMPLETE_SLIDING,window_type:'casement',fit:'unit_bath'});
  assert.ok(incomplete.validation.missingRequiredFields.includes('hinge'));
  assert.ok(incomplete.validation.missingRequiredFields.includes('handle_position_mode'));
  const result=await resolveRuntimeAppProduct(PRODUCT,{...COMPLETE_SLIDING,window_type:'casement',fit:'unit_bath',hinge:'L',handle_position_mode:'custom',handle_p:500,width:600,height:1000,effective_depth:120});
  assert.deepEqual(result.validation.errors,[]);
  assert.deepEqual(result.validation.missingRequiredFields,[]);
  assert.equal(result.selection.handle,'cam_latch');
  assert.equal(result.selection.frame,'bath_casement');
  assert.equal(result.sales_request_state,'READY_FOR_MANUFACTURER_ESTIMATE');
});

test('upstream window/fit changes clear only invalid bathroom descendants and retain valid W/H',async()=>{
  const prior={...COMPLETE_SLIDING,fit:'unit_bath',unit_pattern:'B',position_mode:'custom',crescent_p:500,unit_lower_step:10,water_prevention:'requested'};
  const changed=await resolveRuntimeAppProduct(PRODUCT,{...prior,window_type:'casement',hinge:'R',handle_position_mode:'default'});
  for(const key of ['unit_pattern','position_mode','crescent_p','unit_lower_step','water_prevention'])assert.equal(changed.selection[key],undefined,key);
  assert.equal(changed.selection.width,1000);
  assert.equal(changed.selection.height,1000);
  assert.equal(changed.selection.glass_family,'ordinary_double');
});

test('variant switching removes stale fields from selection and handoff in both directions',async()=>{
  const bathroom=await resolveRuntimeAppProduct(PRODUCT,{...COMPLETE_SLIDING,frame_spec:'standard',fukashi_presence:'present'});
  assert.equal(bathroom.selection.frame_spec,undefined);
  assert.equal(bathroom.selection.fukashi_presence,undefined);
  const standard=await resolveRuntimeAppProduct(PRODUCT,{...bathroom.selection,product_variant:'standard',unit_pattern:'A',special_request:'浴室希望'});
  assert.equal(standard.selection.product_variant,'standard');
  assert.equal(standard.selection.unit_pattern,undefined);
  assert.equal(standard.selection.special_request,undefined);
  const back=await resolveRuntimeAppProduct(PRODUCT,{...standard.selection,product_variant:'bathroom'});
  assert.equal(back.selection.product_variant,'bathroom');
  for(const key of ['frame_spec','fukashi_presence','order_width','order_height'])assert.equal(back.selection[key],undefined,key);
});

test('explicit forbidden conditions block instead of becoming estimate confirmation',async()=>{
  const result=await resolveRuntimeAppProduct(PRODUCT,{...COMPLETE_SLIDING,bath_bay_window:'present'});
  assert.equal(result.validation.status,'INVALID');
  assert.ok(result.validation.errors.some((row)=>row.errorCode==='INPLUS_BATHROOM_BAY_WINDOW_FORBIDDEN'));
  assert.notEqual(result.sales_request_state,'READY_FOR_MANUFACTURER_ESTIMATE');
});

test('all seven Controlled Unresolved records remain non-VERIFIED and hand off status/question/contact',async()=>{
  const result=await resolveRuntimeAppProduct(PRODUCT,{...COMPLETE_SLIDING,special_request:'キー付きクレセント希望'});
  const gaps=result.sales_request_handoff.controlled_unresolved;
  assert.equal(gaps.length,7);
  assert.ok(gaps.every((row)=>row.status!=='VERIFIED'&&row.auto_resolved===false));
  assert.ok(gaps.every((row)=>row.target_condition&&row.confirmation_question&&row.confirmation_to));
  assert.ok(result.confirmationRequests.some((row)=>row.code==='IB-G006'));
  assert.ok(result.confirmationRequests.some((row)=>row.code==='IB-G007'));
});

test('bathroom snapshot preserves Formal identity and estimate output variant/quantity without BOM synthesis',async()=>{
  const product={...getRuntimeAppIntegration(PRODUCT),sourceType:'RUNTIME_MASTER'};
  const result=await resolveRuntimeAppProduct(PRODUCT,COMPLETE_SLIDING);
  const snapshot=createProductConfigurationSnapshot({product,result,clock:()=>new Date('2026-10-01T12:00:00Z')});
  assert.equal(snapshot.package_version,'v1.0');
  assert.equal(snapshot.runtime_manifest_identity,'1GJknHnjU0-hvNvTS2X8fajuTkE0SvX0m');
  assert.equal(snapshot.configuration.product_variant,'bathroom');
  const model=createEstimateOutputModel({
    project:{project_id:'P1',project_name:'浴室'},estimate:{estimate_id:'E1',project_id:'P1'},
    openings:[{opening_id:'O1',opening_no:1,status:'COMPLETE',product_configuration_snapshot:snapshot}],generatedAt:'2026-10-01T12:00:00Z',
  });
  assert.equal(model.rows[0].product_variant,'浴室仕様');
  assert.equal(model.rows[0].request_quantity,2);
  assert.equal(model.rows[0].price,null);
  assert.equal(model.rows[0].state,'NEEDS_CONFIRMATION');
});
