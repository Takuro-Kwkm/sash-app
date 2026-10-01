import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const INPLUS='SER-LIXIL-INPLUS';
const UCHIRIMO='SER-YKKAP-UCHIRIMO';

function field(result,key){return result.fields.find(row=>row.key===key);}
function values(result,key){return field(result,key)?.values?.map(row=>row.value)??[];}

test('Inplus sales UI exposes one dry-air and one argon request without cavity thickness',async()=>{
  const result=await resolveRuntimeAppProduct(INPLUS,{
    window_type:'引違い窓',sash_configuration:'2枚建',
    glass_family:'Low-E複層',glass_type:'透明',lowe_color:'クリア',
  });
  const keys=result.fields.map(row=>row.key);
  assert.equal(keys.includes('supply_form'),false);
  assert.equal(keys.includes('glass_detail'),false);
  assert.equal(keys.includes('cavity_fill'),false);
  assert.ok(keys.indexOf('lowe_color')<keys.indexOf('sales_spacer_type'));
  assert.ok(keys.indexOf('sales_spacer_type')<keys.indexOf('sales_gas_fill'));
  assert.deepEqual(values(result,'sales_gas_fill'),['air','argon']);
  assert.deepEqual(field(result,'sales_gas_fill').values.map(row=>row.displayLabel),['乾燥空気','アルゴンガス']);
  const selected=await resolveRuntimeAppProduct(INPLUS,{...result.selection,sales_gas_fill:'argon'});
  assert.equal(selected.selection.sales_gas_fill,'argon');
  assert.equal(selected.sales_request_handoff?.gas_fill_request,'argon');
});

test('Inplus fukashi 40/50/70 exposes lower reinforcement inside fukashi detail',async()=>{
  for(const depth of ['40','50','70']){
    const result=await resolveRuntimeAppProduct(INPLUS,{
      window_type:'引違い窓',sash_configuration:'2枚建',
      fukashi_presence:'present',fukashi_sides:'three_side',fukashi_depth:depth,
    });
    assert.ok(values(result,'fukashi_reinforcement').includes('lower_reinforcement'),depth);
    const selected=await resolveRuntimeAppProduct(INPLUS,{...result.selection,fukashi_reinforcement:'lower_reinforcement'});
    assert.equal(selected.selection.fukashi_reinforcement,'lower_reinforcement');
    assert.equal(selected.sales_request_handoff?.fukashi_reinforcement_request,'lower_reinforcement');
    assert.equal(selected.orderReady,false);
  }
  const twenty=await resolveRuntimeAppProduct(INPLUS,{
    window_type:'引違い窓',sash_configuration:'2枚建',
    fukashi_presence:'present',fukashi_sides:'three_side',fukashi_depth:'20',
  });
  assert.equal(values(twenty,'fukashi_reinforcement').includes('lower_reinforcement'),false);
});

test('Inplus crescent flow has none, keyed type, and custom position mode',async()=>{
  const base=await resolveRuntimeAppProduct(INPLUS,{window_type:'引違い窓',sash_configuration:'2枚建'});
  assert.deepEqual(values(base,'crescent_presence'),['installed','crescentless_special_order']);
  assert.deepEqual(values(base,'crescent_position_mode'),['standard','custom']);
  const installed=await resolveRuntimeAppProduct(INPLUS,{...base.selection,crescent_presence:'installed'});
  assert.deepEqual(values(installed,'crescent_type'),['standard','keyed']);
  assert.deepEqual(values(installed,'crescent_position_mode'),['standard','custom']);
  const keyed=await resolveRuntimeAppProduct(INPLUS,{...installed.selection,crescent_type:'keyed'});
  assert.equal(keyed.selection.crescent_type,'keyed');
  assert.equal(keyed.sales_request_handoff?.crescent_type,'keyed');
  const none=await resolveRuntimeAppProduct(INPLUS,{...installed.selection,crescent_presence:'crescentless_special_order'});
  assert.equal(field(none,'crescent_type'),undefined);
  assert.equal(field(none,'crescent_position_mode'),undefined);
});

test('Inplus crescent P appears after custom W/H and validates formal P rules',async()=>{
  const seed={
    window_type:'引違い窓',sash_configuration:'2枚建',size_mode:'CUSTOM',
    order_width:1600,order_height:1100,upper_frame_spec:'standard',
    glass_family:'単板',crescent_presence:'installed',crescent_type:'standard',crescent_position_mode:'custom',
  };
  const pending=await resolveRuntimeAppProduct(INPLUS,seed);
  const keys=pending.fields.map(row=>row.key);
  assert.ok(keys.includes('crescent_position_p_mm'));
  assert.ok(keys.indexOf('crescent_position_p_mm')>keys.indexOf('order_height'));
  assert.equal(field(pending,'crescent_position_p_mm')?.dataType,'NUMBER');
  assert.equal(field(pending,'crescent_position_p_mm')?.step,0.5);

  const valid=await resolveRuntimeAppProduct(INPLUS,{...pending.selection,crescent_position_p_mm:550});
  assert.equal(valid.selection.crescent_position_p_mm,550);
  assert.notEqual(valid.validation.errors.some(error=>error.errorCode==='INPLUS_CRESCENT_POSITION_OUT_OF_RANGE'),true);

  const invalid=await resolveRuntimeAppProduct(INPLUS,{...pending.selection,crescent_position_p_mm:100});
  assert.equal(invalid.validation.status,'INVALID');
  assert.ok(invalid.validation.errors.some(error=>error.errorCode==='INPLUS_CRESCENT_POSITION_OUT_OF_RANGE'));
});

test('Uchirimo custom crescent, pull-handle and middle-rail positions appear in requested order',async()=>{
  const seed={
    room_specification:'residential',window_type:'sliding_window',sash_configuration:'two_panel',
    size_w:1000,size_h:1000,
    crescent_presence:'installed',crescent_position:'custom',
    pull_handle_type:'safety_stop_pull',pull_handle_position:'custom',
    middle_rail_option:'enabled',middle_rail_position:'custom',
  };
  const pending=await resolveRuntimeAppProduct(UCHIRIMO,seed);
  const keys=pending.fields.map(row=>row.key);
  for(const key of ['crescent_position_custom_mm','pull_handle_position_custom_mm','middle_rail_position_custom_mm']){
    assert.ok(keys.includes(key),key);
    assert.equal(field(pending,key)?.dataType,'NUMBER',key);
  }
  assert.ok(keys.indexOf('crescent_position_custom_mm')>keys.indexOf('size_h'));
  assert.ok(keys.indexOf('pull_handle_position_custom_mm')>keys.indexOf('crescent_position_custom_mm'));
  assert.ok(keys.indexOf('middle_rail_position_custom_mm')>keys.indexOf('pull_handle_position_custom_mm'));

  const entered=await resolveRuntimeAppProduct(UCHIRIMO,{
    ...pending.selection,
    crescent_position_custom_mm:500,
    pull_handle_position_custom_mm:520,
    middle_rail_position_custom_mm:540,
  });
  assert.equal(entered.selection.crescent_position_custom_mm,500);
  assert.equal(entered.selection.pull_handle_position_custom_mm,520);
  assert.equal(entered.selection.middle_rail_position_custom_mm,540);
  assert.equal(entered.sales_request_handoff?.crescent_position_custom_mm,500);
  assert.equal(entered.sales_request_handoff?.pull_handle_position_custom_mm,520);
  assert.equal(entered.sales_request_handoff?.middle_rail_position_custom_mm,540);
  assert.ok(entered.confirmationRequests.some(row=>row.code==='UCHIRIMO_SALES_REQUEST_CONFIRM'));

  const standardPull=await resolveRuntimeAppProduct(UCHIRIMO,{...entered.selection,pull_handle_position:'standard'});
  assert.equal(field(standardPull,'pull_handle_position_custom_mm'),undefined);
  assert.equal(standardPull.selection.pull_handle_position_custom_mm,undefined);

  const noMiddle=await resolveRuntimeAppProduct(UCHIRIMO,{...entered.selection,middle_rail_option:'none'});
  assert.equal(field(noMiddle,'middle_rail_position_custom_mm'),undefined);
  assert.equal(noMiddle.selection.middle_rail_position_custom_mm,undefined);
});

test('Inplus options include official missing items and preserve multiple selection',async()=>{
  const result=await resolveRuntimeAppProduct(INPLUS,{
    window_type:'引違い窓',sash_configuration:'2枚建',glass_family:'単板',
  });
  const option=field(result,'option_items');
  assert.equal(option?.dataType,'MULTI_ENUM');
  const optionValues=values(result,'option_items');
  for(const value of ['OP-STEP','OP-EMBED-RESIN','OP-TRUE-WALL-SCREW','OP-REPLACEMENT-CRESCENT'])assert.ok(optionValues.includes(value),value);
  const labels=new Map(option.values.map(row=>[row.value,row.displayLabel]));
  assert.equal(labels.get('OP-EMBED-RESIN'),'埋め木樹脂材');
  assert.equal(labels.get('OP-TRUE-WALL-SCREW'),'真壁取付用ねじ');
  assert.match(labels.get('OP-REPLACEMENT-CRESCENT'),/交換用クレセント/);

  const selected=await resolveRuntimeAppProduct(INPLUS,{
    ...result.selection,
    option_items:['OP-SWEEP','OP-STEP','OP-EMBED-RESIN','OP-TRUE-WALL-SCREW','OP-REPLACEMENT-CRESCENT'],
  });
  assert.deepEqual(new Set(selected.selection.option_items),new Set(['OP-SWEEP','OP-STEP','OP-EMBED-RESIN','OP-TRUE-WALL-SCREW','OP-REPLACEMENT-CRESCENT']));
  assert.deepEqual(new Set(selected.sales_request_handoff?.additional_option_items),new Set(['OP-STEP','OP-EMBED-RESIN','OP-TRUE-WALL-SCREW','OP-REPLACEMENT-CRESCENT']));
});

test('Inplus curtain rail request follows fukashi frame',async()=>{
  const base={window_type:'引違い窓',sash_configuration:'2枚建',fukashi_presence:'present',fukashi_sides:'three_side',fukashi_depth:'40'};
  const result=await resolveRuntimeAppProduct(INPLUS,base);
  assert.deepEqual(values(result,'fukashi_curtain_rail'),['none','enabled']);
  const order=result.fields.map(row=>row.key);
  assert.equal(order.indexOf('fukashi_curtain_rail'),order.indexOf('fukashi_presence')+1);
  const enabled=await resolveRuntimeAppProduct(INPLUS,{...result.selection,fukashi_curtain_rail:'enabled'});
  assert.equal(enabled.sales_request_handoff?.fukashi_curtain_rail_request,'enabled');
  const none=await resolveRuntimeAppProduct(INPLUS,{...enabled.selection,fukashi_presence:'none'});
  assert.equal(field(none,'fukashi_curtain_rail'),undefined);
});

test('Uchirimo curtain rail is offered for fukashi 25/40 and not 60',async()=>{
  const seed={room_specification:'residential',window_type:'sliding_window',sash_configuration:'two_panel',size_w:1000,size_h:1000,frame_spec:'standard',lower_frame_spec:'standard',fukashi_presence:'present',fukashi_sides:'three_side'};
  const forty=await resolveRuntimeAppProduct(UCHIRIMO,{...seed,fukashi_depth:'40'});
  assert.deepEqual(values(forty,'fukashi_curtain_rail'),['none','enabled']);
  const order=forty.fields.map(row=>row.key);
  assert.equal(order.indexOf('fukashi_curtain_rail'),order.indexOf('fukashi_presence')+1);
  const sixty=await resolveRuntimeAppProduct(UCHIRIMO,{...seed,fukashi_depth:'60'});
  assert.equal(field(sixty,'fukashi_curtain_rail'),undefined);
});
