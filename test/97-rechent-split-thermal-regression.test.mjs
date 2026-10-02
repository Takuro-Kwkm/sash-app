import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFormalProductRuntimeV2Package} from '../src/catalog/runtime-master/formal-product-runtime-v2-loader.mjs';
import {getRuntimeMasterEntry} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {adaptRechentDoor3NonFireV1} from '../src/catalog/runtime-master/rechent-door3-nonfire-v1-adapter.mjs';
import {resolveRuntimeAppProduct,runtimeAppIntegrationInventory} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {RECHENT_ID,completeRechent} from './helpers/rechent-estimate-cases.mjs';

const packageForTest=()=>loadFormalProductRuntimeV2Package(getRuntimeMasterEntry('LIXIL','リシェント玄関ドア3 非防火'));
const field=(result,key)=>result.fields.find(row=>row.key===key);
const values=(result,key)=>field(result,key)?.values.map(row=>row.value)??[];

test('all Formal K2/K4 glass groups resolve separately and survive serialized snapshots',async()=>{
 const p=await packageForTest(),product=p.documentsByFileName['product_rules.json'];
 const integration=runtimeAppIntegrationInventory().find(row=>row.id===RECHENT_ID);
 let checks=0;
 for(const glass of product.glass_master.filter(row=>['INSULATION_K2','INSULATION_K4'].includes(row.thermal_scope))){
  for(const design of glass.design_scope.split(',')){
   const result=await completeRechent({thermal_spec:glass.thermal_scope,opening_type:'SINGLE',design,size_w:800,size_h:2100});
   assert.equal(result.selection.design,design);
   assert.equal(result.selection.thermal_spec,glass.thermal_scope);
   assert.deepEqual(values(result,'glass_spec'),[glass.glass_spec],`${glass.thermal_scope}:${design}`);
   assert.equal(result.selection.glass_spec,glass.glass_spec);
   assert.equal(result.confirmationRequests.some(row=>row.code==='DERIVED_GLASS_REQUIRES_THERMAL_CONFIRMATION'),false);
   const saved=JSON.parse(JSON.stringify(createProductConfigurationSnapshot({product:integration,result})));
   assert.equal(saved.configuration.thermal_spec,glass.thermal_scope);
   assert.equal(saved.configuration.glass_spec,glass.glass_spec);
   const reloaded=await resolveRuntimeAppProduct(RECHENT_ID,saved.configuration);
   assert.deepEqual(reloaded.selection,result.selection);
   checks+=1;
  }
 }
 assert.equal(checks,58);
});

test('K2/K4 upstream transitions rederive glass while keeping valid common dependencies',async()=>{
 for(const thermal_spec of ['INSULATION_K2','INSULATION_K4']){
  const start=await completeRechent({thermal_spec,opening_type:'PARENT_CHILD',design:'G14',size_w:1100,lock_type:'FAMILOCK',electric_lock_power:'AC100V'});
  const nextThermal=thermal_spec==='INSULATION_K2'?'INSULATION_K4':'INSULATION_K2';
  const next=await resolveRuntimeAppProduct(RECHENT_ID,{...start.selection,thermal_spec:nextThermal});
  assert.equal(next.selection.thermal_spec,nextThermal);
  assert.equal(next.selection.glass_spec,nextThermal==='INSULATION_K2'?'LOW_E_IGU_A16':'IGU_A16');
  for(const key of ['design','opening_type','child_door','body_color','frame_color','glass_safety','handle_type','lock_type','key_set','cylinder','electric_lock_power','electric_lock_reader','electric_lock_plan','exterior_trim','interior_trim','size_w','size_h']){
   assert.deepEqual(next.selection[key],start.selection[key],key);
   assert.deepEqual(values(next,key),values(start,key),key);
  }
  assert.equal(next.validation.status,'VALID');
 }
 const legacy=await resolveRuntimeAppProduct(RECHENT_ID,{thermal_spec:'INSULATION_K2_K4',design:'G12',glass_spec:'LOW_E_IGU_A16'});
 assert.equal(Object.hasOwn(legacy.selection,'thermal_spec'),false);
 assert.ok(legacy.validation.missingRequiredFields.includes('thermal_spec'));
 assert.equal(Object.hasOwn(legacy.selection,'glass_spec'),false);
 assert.equal(legacy.orderReady,false);
});

test('Adapter respects individual grade rules alongside shared scopes without opposite-grade union',async()=>{
 // Synthetic in-memory fixtures exercise the compatibility boundary. They are
 // never published as manufacturer facts or written into the Formal package.
 const p=structuredClone(await packageForTest()),d=p.documentsByFileName;
 const product=d['product_rules.json'],hardware=d['hardware_rules.json'];
 for(const thermal_scope of ['INSULATION_K2','INSULATION_K4']){
  const design_id=thermal_scope==='INSULATION_K2'?'TEST_K2_ONLY':'TEST_K4_ONLY';
  product.design_master.push({...product.design_master.find(row=>row.design_id==='G12'),design_id,thermal_scope});
  product.frame_atomic_rules.push({...product.frame_atomic_rules.find(row=>row.design_id==='G12'&&row.frame_configuration==='SINGLE'&&row.result==='ALLOW'),design_id,thermal_scope});
  hardware.hardware_atomic_rules.push({...hardware.hardware_atomic_rules.find(row=>row.design_id==='G12'&&row.entry_system==='FAMILOCK'&&row.result==='ALLOW'),design_id,thermal_scope});
 }
 // The same design has distinct color and width constraints in each grade.
 const color=product.design_color_allow.find(row=>row.design_id==='G12');
 product.design_color_allow=product.design_color_allow.filter(row=>row.design_id!=='G12');
 const colors=color.allowed_door_colors.split(',');
 for(const [i,thermal_scope]of ['INSULATION_K2','INSULATION_K4'].entries())product.design_color_allow.push({...color,thermal_scope,allowed_door_colors:colors[i]});
 const width=product.dimension_ranges.find(row=>row.thermal_scope==='INSULATION_K2_K4'&&row.field==='frame_w'&&row.frame_scope==='SINGLE');
 product.dimension_ranges=product.dimension_ranges.filter(row=>row!==width);
 product.dimension_ranges.push({...width,thermal_scope:'INSULATION_K2'},{...width,thermal_scope:'INSULATION_K4',max:900});
 const resolve=adaptRechentDoor3NonFireV1(p).uiResolver;
 for(const thermal_spec of ['INSULATION_K2','INSULATION_K4']){
  const result=resolve({thermal_spec,opening_type:'SINGLE',design:'G12',transom:'NONE',lock_type:'MANUAL',size_w:950,size_h:2100});
  const own=thermal_spec==='INSULATION_K2'?'TEST_K2_ONLY':'TEST_K4_ONLY';
  const other=thermal_spec==='INSULATION_K2'?'TEST_K4_ONLY':'TEST_K2_ONLY';
  assert.ok(values(result,'design').includes(own));
  assert.ok(values(result,'design').includes('G12'));
  assert.equal(values(result,'design').includes(other),false);
  assert.deepEqual(values(result,'body_color'),[colors[thermal_spec==='INSULATION_K2'?0:1]]);
  assert.equal(result.validation.errors.some(row=>row.errorCode==='WIDTH_OUT_OF_RANGE'),thermal_spec==='INSULATION_K4');
  assert.equal(new Set(values(result,'thermal_spec')).size,4);
  assert.ok(resolve({thermal_spec,opening_type:'SINGLE',design:own}).selection.design);
  assert.equal(Object.hasOwn(resolve({thermal_spec,opening_type:'SINGLE',design:other}).selection,'design'),false);
 }
});
