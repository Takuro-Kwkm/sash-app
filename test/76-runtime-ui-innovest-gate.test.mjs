import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFormalFlatJsonRuntimePackage } from '../src/catalog/runtime-master/formal-flat-json-runtime-loader.mjs';
import { adaptInnovestFlatJsonV1 } from '../src/catalog/runtime-master/innovest-flat-json-v1-adapter.mjs';

const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=join(HERE,'../src/runtime-master-packages/ykkap-innovest-v1.0.1');
const entry={
  manufacturer:'YKK AP',series:'イノベスト',masterVersion:'v1.0.1',schemaVersion:'1.0',
  runtimeManifestPath:join(ROOT,'runtime_manifest.json'),
  runtimeManifestDriveFileId:'1oVKdg3j2YlNEWhBZSqGJl0S7kD5tayox',
  runtimeManifestSha256:'6f47677023212228d1132407c9fce8ccd9d407c65fd19cbb9e1507f1845b287d',
  materializedBundleSegments:Array.from({length:13},(_,index)=>join(ROOT,`materialized-runtime.br.b64.json.parts/part-${String(index).padStart(2,'0')}`)),
};

const runtimePackage=await loadFormalFlatJsonRuntimePackage(entry);
const adapted=adaptInnovestFlatJsonV1(runtimePackage);
const resolve=adapted.resolver;
const source=adapted.master.source;
const firstColor=(filters)=>source.masterData.Design_Color_Whitelist.find((row)=>Object.entries(filters).every(([key,value])=>row[key]===value))?.color_variant_id;

function completeD70(overrides={}){
  return {
    thermal_spec:'D70',configuration:'SINGLE',design:'001',
    door_color:firstColor({thermal_grade:'D70',fire_classification:'NON_FIRE',frame_system:'RESIN_COMPOSITE',design_id:'001'}),
    handing:'RIGHT',frame_installation_type:'FLAT',lock_type:'ELECTRIC',lock_system:'FACE_RECOGNITION',
    handle:'SMART_STRAIGHT',handle_color:'SILVER',size_mode:'STANDARD',...overrides,
  };
}

test('Innovest Formal v1.0.1 materialization is byte-integral',()=>{
  assert.equal(runtimePackage.manifest.package_version,'v1.0.1');
  assert.equal(runtimePackage.manifest.runtime_status,'FORMAL_RUNTIME_PASS');
  assert.equal(runtimePackage.integrity.match,true);
  assert.equal(runtimePackage.integrity.files.length,9);
  assert.ok(runtimePackage.integrity.files.every((row)=>row.match));
});

test('D70 auto-resolves formal fire/frame/power dependencies',()=>{
  const state=resolve(completeD70());
  assert.equal(state.fields.fire_classification.value,'NON_FIRE');
  assert.equal(state.fields.frame_system.value,'RESIN_COMPOSITE');
  assert.deepEqual(state.fields.configuration.allowed_values,['SINGLE']);
  assert.equal(state.fields.power_supply.value,'AC100V');
  assert.equal(state.dimension_result.status,'PASS');
  assert.equal(state.dimension_result.widthMm,982);
  assert.equal(state.dimension_result.heightMm,2330);
  assert.equal(state.status,'VALID');
});

test('parent-child context shows child door and preserves only compatible values',()=>{
  const base={thermal_spec:'D50',fire_classification:'NON_FIRE',frame_system:'EXTRUDED_THERMAL',configuration:'PARENT_CHILD'};
  const design=source.masterData.Design_Opening_Whitelist.find((row)=>row.record_status==='CONFIRMED'&&row.thermal_grade==='D50'&&row.fire_classification==='NON_FIRE'&&row.frame_system==='EXTRUDED_THERMAL'&&row.opening_configuration==='PARENT_CHILD'&&row.allowed)?.design_id;
  assert.ok(design);
  const state=resolve({...base,design});
  assert.equal(state.fields.child_door.visibility,'SHOW');
  assert.ok(state.fields.child_door.allowed_values.length>0);
});

test('SIZE_ORDER validates exact formal W/H range and blocks out-of-range input',()=>{
  const constraint=source.masterData.Design_Size_Constraints.find((row)=>row.record_status==='CONFIRMED'&&row.actual_height_size_order_allowed===true&&row.actual_frame_height_min_mm<row.actual_frame_height_max_mm);
  assert.ok(constraint);
  const color=firstColor({thermal_grade:constraint.thermal_grade,fire_classification:constraint.fire_classification,frame_system:constraint.frame_system,design_id:constraint.design_id});
  const common={thermal_spec:constraint.thermal_grade,fire_classification:constraint.fire_classification,frame_system:constraint.frame_system,configuration:constraint.opening_configuration,design:constraint.design_id,door_color:color,handing:'RIGHT',size_mode:'SIZE_ORDER'};
  const pass=resolve({...common,custom_width:constraint.actual_frame_width_min_mm,custom_height:constraint.actual_frame_height_min_mm});
  assert.equal(pass.dimension_result.status,'PASS');
  const blocked=resolve({...common,custom_width:constraint.actual_frame_width_min_mm,custom_height:constraint.actual_frame_height_min_mm-1});
  assert.equal(blocked.dimension_result.status,'BLOCK');
  assert.ok(blocked.errors.some((row)=>row.code==='SIZE_OUT_OF_RANGE'));
});

test('cold-region option predicates are evaluated from canonical Runtime state',()=>{
  const selection=completeD70({frame_installation_type:'COLD_REGION'});
  const state=resolve(selection);
  assert.ok(state.fields.option.allowed_values.includes('OPT-004'));
  const flat=resolve(completeD70({frame_installation_type:'FLAT'}));
  assert.ok(!flat.fields.option.allowed_values.includes('OPT-004'));
});

test('upstream changes clear incompatible downstream values instead of preserving stale state',()=>{
  const state=resolve({...completeD70(),thermal_spec:'D50',fire_classification:'FIRE',frame_system:'EXTRUDED_THERMAL'});
  assert.ok(state.cleared_fields.some((row)=>['design','door_color','handle'].includes(row.field)));
});

test('resolved angle state survives the next Runtime resolve without throwing',()=>{
  const first=resolve(completeD70());
  assert.equal(first.fields.angle_attached_frame.value,false);
  assert.doesNotThrow(()=>resolve({...completeD70(),angle_attached_frame:false}));
  const second=resolve({...completeD70(),angle_attached_frame:false});
  assert.equal(second.fields.angle_attached_frame.value,false);
  assert.equal(second.status,'VALID');
});
