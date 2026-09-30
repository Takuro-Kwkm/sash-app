import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const INPLUS='SER-LIXIL-INPLUS';
const UCHIRIMO='SER-YKKAP-UCHIRIMO';

function field(result,key){return result.fields.find(row=>row.key===key);}
function values(result,key){return field(result,key)?.values?.map(row=>row.value)??[];}

test('Inplus sales UI hides supply/detail and keeps Low-E -> spacer -> cavity flow',async()=>{
  const result=await resolveRuntimeAppProduct(INPLUS,{
    window_type:'引違い窓',
    sash_configuration:'2枚建',
    glass_family:'Low-E複層',
    glass_type:'透明',
    lowe_color:'クリア',
    cavity_fill:'乾燥空気 A12',
  });
  const keys=result.fields.map(row=>row.key);
  assert.equal(keys.includes('supply_form'),false);
  assert.equal(keys.includes('glass_detail'),false);
  assert.ok(keys.includes('lowe_color'));
  assert.ok(keys.includes('sales_spacer_type'));
  assert.ok(keys.includes('cavity_fill'));
  assert.ok(keys.indexOf('lowe_color')<keys.indexOf('sales_spacer_type'));
  assert.ok(keys.indexOf('sales_spacer_type')<keys.indexOf('cavity_fill'));
  assert.equal(result.sales_request_handoff?.supply_form,'ESTIMATION_RESPONSIBILITY');
  assert.equal(result.sales_request_handoff?.glass_detail,'MANUFACTURER_ESTIMATE_CONFIRMATION');
});

test('Inplus exposes crescentless as estimate-confirm special order',async()=>{
  const base=await resolveRuntimeAppProduct(INPLUS,{window_type:'引違い窓',sash_configuration:'2枚建'});
  assert.deepEqual(values(base,'crescent_presence'),['installed','crescentless_special_order']);
  const changed=await resolveRuntimeAppProduct(INPLUS,{
    ...base.selection,
    crescent_presence:'crescentless_special_order',
  });
  assert.equal(changed.selection.crescent_presence,'crescentless_special_order');
  assert.equal(changed.sales_request_handoff?.crescent_request,'crescentless_special_order');
  assert.equal(changed.validation.status,'MANUAL_CHECK');
  assert.ok(changed.confirmationRequests?.some(row=>row.code==='INPLUS_SALES_REQUEST_CONFIRM'));
  assert.equal(changed.orderReady,false);
});

test('Inplus installation requests preserve multiple choices',async()=>{
  const result=await resolveRuntimeAppProduct(INPLUS,{
    window_type:'引違い窓',
    sash_configuration:'2枚建',
    sales_installation_auxiliaries:['OP-STEP','TRUE_WALL_SCREW','JAPANESE_ROOM_GROOVE_INFIL'],
  });
  const request=field(result,'sales_installation_auxiliaries');
  assert.equal(request?.dataType,'MULTI_ENUM');
  assert.deepEqual(new Set(result.selection.sales_installation_auxiliaries),new Set(['OP-STEP','TRUE_WALL_SCREW','JAPANESE_ROOM_GROOVE_INFIL']));
  assert.deepEqual(new Set(result.sales_request_handoff?.installation_auxiliaries),new Set(['OP-STEP','TRUE_WALL_SCREW','JAPANESE_ROOM_GROOVE_INFIL']));
});

test('Inplus formal option_items remains multi-select',async()=>{
  const result=await resolveRuntimeAppProduct(INPLUS,{
    window_type:'引違い窓',
    sash_configuration:'2枚建',
    glass_family:'単板',
    option_items:['OP-SWEEP','OP-STOP'],
  });
  const option=field(result,'option_items');
  assert.equal(option?.dataType,'MULTI_ENUM');
  assert.ok(Array.isArray(result.selection.option_items));
  assert.deepEqual(new Set(result.selection.option_items),new Set(['OP-SWEEP','OP-STOP']));
});

test('Inplus curtain rail request follows fukashi frame',async()=>{
  const base={
    window_type:'引違い窓',
    sash_configuration:'2枚建',
    fukashi_presence:'present',
    fukashi_sides:'three_side',
    fukashi_depth:'40',
  };
  const result=await resolveRuntimeAppProduct(INPLUS,base);
  assert.deepEqual(values(result,'fukashi_curtain_rail'),['none','enabled']);
  const enabled=await resolveRuntimeAppProduct(INPLUS,{...result.selection,fukashi_curtain_rail:'enabled'});
  assert.equal(enabled.sales_request_handoff?.fukashi_curtain_rail_request,'enabled');
  const none=await resolveRuntimeAppProduct(INPLUS,{...enabled.selection,fukashi_presence:'none'});
  assert.equal(field(none,'fukashi_curtain_rail'),undefined);
  assert.equal(none.selection.fukashi_curtain_rail,undefined);
});

test('Uchirimo curtain rail is offered for fukashi 25/40 and not 60',async()=>{
  const seed={
    room_specification:'residential',
    window_type:'sliding_window',
    sash_configuration:'two_panel',
    size_w:1000,
    size_h:1000,
    frame_spec:'standard',
    lower_frame_spec:'standard',
    fukashi_presence:'present',
    fukashi_sides:'three_side',
  };
  const forty=await resolveRuntimeAppProduct(UCHIRIMO,{...seed,fukashi_depth:'40'});
  assert.deepEqual(values(forty,'fukashi_curtain_rail'),['none','enabled']);
  const sixty=await resolveRuntimeAppProduct(UCHIRIMO,{...seed,fukashi_depth:'60'});
  assert.equal(field(sixty,'fukashi_curtain_rail'),undefined);
});
