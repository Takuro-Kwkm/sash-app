import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRuntimeAppProduct,getRuntimeAppIntegration} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {INPLUS_OUTER_WINDOW_ACCESSORIES} from '../src/catalog/runtime-master/inner-window-sales-extension.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {createEstimateOutputModel} from '../src/estimate-output/model.mjs';
const PRODUCT='SER-LIXIL-INPLUS';
const ids=INPLUS_OUTER_WINDOW_ACCESSORIES.map(row=>row.id);
const seeds={
  standard:{product_variant:'standard',window_type:'引違い窓',sash_configuration:'2枚建',glass_family:'一般複層',glass_type:'透明',frame_color:'ホワイト',frame_spec:'standard',upper_frame_spec:'standard',lower_frame_spec:'general',fukashi_presence:'none',order_width:1000,order_height:1000},
  bathroom:{product_variant:'bathroom',window_type:'sliding',fit:'tile',glass_family:'ordinary_double',glass_design:'transparent',gas:'dry_air',position_mode:'default',width:1000,height:1000,quantity:2},
};
for(const [variant,seed] of Object.entries(seeds)){
  test(`${variant}: checkbox requests survive snapshot/re-resolution and estimator output`,async()=>{
    const result=await resolveRuntimeAppProduct(PRODUCT,{...seed,option_items:[...ids,...ids,'NOT_AN_OPTION']});
    const field=result.fields.find(row=>row.key==='option_items');
    assert.equal(field.dataType,'MULTI_ENUM');
    assert.equal(result.fields.filter(row=>row.key==='option_items').length,1);
    assert.deepEqual(result.selection.option_items,ids);
    assert.equal(new Set(field.values.map(row=>row.value)).size,field.values.length);
    const requests=result.sales_request_handoff.additional_accessory_requests;
    assert.equal(requests.length,2);
    assert.ok(requests.every(row=>row.status==='ESTIMATE_CONFIRM_REQUIRED'&&!row.auto_resolved&&row.accessory_scope==='EXISTING_OUTER_WINDOW'));
    assert.equal(requests[1].manufacturer,'YKK AP');
    assert.equal(requests[1].source_product,'CROSS_MANUFACTURER_ACCESSORY');
    assert.equal(result.orderReady,false);
    const snapshot=createProductConfigurationSnapshot({product:getRuntimeAppIntegration(PRODUCT),result});
    const reloaded=await resolveRuntimeAppProduct(PRODUCT,JSON.parse(JSON.stringify(snapshot.configuration)));
    assert.deepEqual(reloaded.selection.option_items,ids);
    assert.deepEqual(reloaded.sales_request_handoff.additional_accessory_requests,requests);
    const output=createEstimateOutputModel({project:{project_id:'p'},estimate:{estimate_id:'e',project_id:'p'},openings:[{opening_id:'o',status:'COMPLETE',product_configuration_snapshot:snapshot}]});
    assert.ok(output.rows[0].major_specifications.includes('外窓用 汎用ハンドル（YKK AP製）'));
    assert.ok(output.rows[0].issues.some(row=>row.status==='ESTIMATE_CONFIRM_REQUIRED'&&row.confirmation_to==='積算／YKK AP'&&row.message.includes('適合')));
    const cleared=await resolveRuntimeAppProduct(PRODUCT,{...seed,option_items:[]});
    assert.equal(cleared.sales_request_handoff?.additional_accessory_requests,undefined);
    assert.equal(cleared.confirmationRequests?.some(row=>row.code.startsWith('INPLUS_ACCESSORY_')),false);
  });
}
test('bathroom exposes only requested outer-window accessories; residential options cannot leak',async()=>{
  const result=await resolveRuntimeAppProduct(PRODUCT,{...seeds.bathroom,option_items:['OP-STEP','OP-EMBED-RESIN','OP-TRUE-WALL-SCREW',...ids]});
  assert.deepEqual(result.fields.find(row=>row.key==='option_items').values.map(row=>row.value),ids);
  assert.deepEqual(result.selection.option_items,ids);
  assert.deepEqual(result.validation.errors,[]);
  const blocked=await resolveRuntimeAppProduct(PRODUCT,{...seeds.bathroom,width:99999,option_items:ids});
  assert.equal(blocked.validation.status,'INVALID');
});
test('switching variants retains accessory intent, clears irrelevant product options',async()=>{
  const room=await resolveRuntimeAppProduct(PRODUCT,{...seeds.standard,option_items:['OP-STEP',...ids]});
  assert.ok(room.selection.option_items.includes('OP-STEP'));
  const bath=await resolveRuntimeAppProduct(PRODUCT,{...room.selection,...seeds.bathroom});
  assert.deepEqual(bath.selection.option_items,ids);
});
