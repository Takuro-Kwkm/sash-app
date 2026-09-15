import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';

const runtime=await loadRegisteredRuntime('YKK AP','イノベスト');
assert.ok(runtime);
const source=runtime.master.source;
const color=source.masterData.Design_Color_Whitelist.find((row)=>row.record_status==='CONFIRMED'&&row.thermal_grade==='D70'&&row.fire_classification==='NON_FIRE'&&row.frame_system==='RESIN_COMPOSITE'&&row.design_id==='001')?.color_variant_id;
assert.ok(color);

const complete={
  thermal_spec:'D70',configuration:'SINGLE',design:'001',door_color:color,handing:'RIGHT',
  frame_installation_type:'FLAT',lock_type:'ELECTRIC',lock_system:'FACE_RECOGNITION',
  handle:'SMART_STRAIGHT',handle_color:'SILVER',size_mode:'STANDARD',
};
const allowed=(state)=>state.fields.option.allowed_values;

test('structured ANY_OF / ALL_OF requirements gate dependent smart options',()=>{
  const base=runtime.resolver(complete);
  assert.ok(allowed(base).includes('OPT-SMART-1'));
  assert.ok(allowed(base).includes('OPT-SMART-2'));
  assert.ok(!allowed(base).includes('OPT-SMART-3'));
  assert.ok(!allowed(base).includes('OPT-SMART-4'));

  const light=runtime.resolver({...complete,option:['OPT-SMART-1']});
  assert.ok(allowed(light).includes('OPT-SMART-3'));
  assert.ok(!allowed(light).includes('OPT-SMART-4'));

  const multi=runtime.resolver({...complete,option:['OPT-SMART-2']});
  assert.ok(allowed(multi).includes('OPT-SMART-3'));
  assert.ok(allowed(multi).includes('OPT-SMART-4'));
});

test('dependent options survive only while their formal prerequisite is selected',()=>{
  const valid=runtime.resolver({...complete,option:['OPT-SMART-1','OPT-SMART-3']});
  assert.deepEqual(valid.fields.option.value,['OPT-SMART-1','OPT-SMART-3']);

  const invalid=runtime.resolver({...complete,option:['OPT-SMART-3']});
  assert.deepEqual(invalid.fields.option.value,[]);
  assert.ok(invalid.cleared_fields.some((row)=>row.field==='option'&&row.reason==='OPTION_REQUIREMENT'&&row.removed.includes('OPT-SMART-3')));
});
