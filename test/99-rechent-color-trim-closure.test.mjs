import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFormalProductRuntimeV2Package} from '../src/catalog/runtime-master/formal-product-runtime-v2-loader.mjs';
import {getRuntimeMasterEntry} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {adaptRechentDoor3NonFireV1} from '../src/catalog/runtime-master/rechent-door3-nonfire-v1-adapter.mjs';
import {resolveRuntimeAppProduct,runtimeAppIntegrationInventory} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {createEstimateOutputModel} from '../src/estimate-output/model.mjs';
import {RECHENT_ID,completeRechent} from './helpers/rechent-estimate-cases.mjs';

const packageForTest=()=>loadFormalProductRuntimeV2Package(getRuntimeMasterEntry('LIXIL','リシェント玄関ドア3 非防火'));
const field=(result,key)=>result.fields.find(row=>row.key===key);
const values=(result,key)=>field(result,key)?.values.map(row=>row.value)??[];
// IG3700 RD-40, 呼称 columns (2026/04); no Runtime identifiers translated.
const trimLabels={'150':'150 長（分割タイプ）','125':'125 長（分割タイプ）','100':'100 長（分割タイプ）','75':'75 長（分割タイプ）','50_LONG':'50 長（分割タイプ）','50_SHORT':'50 短（一体タイプ）','25_LONG':'25 長（分割タイプ）','25_SHORT':'25 短（一体タイプ）'};

test('real Formal frame requirements, ANY scopes and recommendation remain distinct',async()=>{
 const pkg=await packageForTest(),product=pkg.documentsByFileName['product_rules.json'];
 const resolver=adaptRechentDoor3NonFireV1(pkg).uiResolver;
 for(const grade of ['INSULATION_K2','INSULATION_K4']){
  for(const rule of product.frame_color_rules.filter(row=>row.constraint==='REQUIRED')){
   for(const design of rule.design_scope.split(',')){
    const bodyColors=product.design_color_allow.find(row=>row.design_id===design).allowed_door_colors.split(',');
    for(const body_color of rule.door_color_scope==='ANY'?bodyColors:rule.door_color_scope.split(',')){
     const result=resolver({thermal_spec:grade,opening_type:'SINGLE',design,body_color});
     assert.equal(result.selection.design,design);
     assert.equal(result.selection.body_color,body_color);
     assert.deepEqual(values(result,'frame_color'),rule.frame_color_result.split(','),`${grade}:${design}:${body_color}`);
    }
   }
  }
  const recommended=resolver({thermal_spec:grade,opening_type:'SINGLE',design:'M78',body_color:'BB'});
  assert.deepEqual(values(recommended,'frame_color'),product.frame_colors.map(row=>row.code));
  assert.deepEqual(field(recommended,'frame_color').values.filter(row=>row.recommended).map(row=>row.value),['AK','AA','AG']);
  assert.match(field(recommended,'frame_color').helpText,/推奨枠色：シャイングレー \/ マットブラック \/ オータムブラウン/);
 }
 for(const [thermal_spec,design,body_color] of [['HIGH_INSULATION','17H','ED'],['INSULATION_K2','G12','CB'],['INSULATION_K4','G12','CB'],['ALUMINUM','C12N','CB']]){
  const result=resolver({thermal_spec,opening_type:'SINGLE',design,body_color});
  assert.deepEqual(values(result,'frame_color'),product.frame_colors.map(row=>row.code));
 }
 // This proves faithful Formal projection, NOT official candidate correctness.
 // DEFAULT's thermal scope defect remains explicitly blocked in the QA report.
 assert.deepEqual(values(resolver({thermal_spec:'INSULATION_K2',design:'G12'}),'frame_color'),[]);
});

test('scoped ALLOW/ALLOWED and REQUIRED intersect; RECOMMENDED never removes permitted colors',async()=>{
 const pkg=structuredClone(await packageForTest());
 const rules=pkg.documentsByFileName['product_rules.json'].frame_color_rules;
 // In-memory contract fixtures only: never written to Formal Runtime / Registry.
 rules.push({rule_id:'TEST-K2',thermal_scope:'INSULATION_K2',design_scope:'G12',door_color_scope:'CB',model_variant_scope:'STANDARD',constraint:'ALLOWED',frame_color_result:'AK,AA'});
 rules.push({rule_id:'TEST-K4',thermal_scope:'INSULATION_K4',design_scope:'G12',door_color_scope:'CB',model_variant_scope:'STANDARD',constraint:'ALLOW',frame_color_result:'AA'});
 rules.push({rule_id:'TEST-WRONG-MODEL',thermal_scope:'INSULATION_K2',design_scope:'G12',door_color_scope:'CB',model_variant_scope:'HIGH_GRADE',constraint:'ALLOWED',frame_color_result:'HC'});
 rules.push({rule_id:'TEST-RECOMMEND',thermal_scope:'ANY',design_scope:'G12',door_color_scope:'ANY',constraint:'RECOMMENDED',frame_color_result:'AK'});
 const resolver=adaptRechentDoor3NonFireV1(pkg).uiResolver;
 const selection={thermal_spec:'INSULATION_K2',opening_type:'SINGLE',design:'G12',body_color:'CB',frame_color:'AK'};
 assert.deepEqual(values(resolver(selection),'frame_color'),['AK','AA']);
 assert.equal(resolver(selection).selection.frame_color,'AK');
 const changed=resolver({...selection,thermal_spec:'INSULATION_K4'});
 assert.deepEqual(values(changed,'frame_color'),['AA']);
 assert.equal(Object.hasOwn(changed.selection,'frame_color'),false);
 assert.ok(changed.clearedFields.includes('frame_color'));
 assert.equal(resolver({...selection,frame_color:'AA',thermal_spec:'INSULATION_K4'}).selection.frame_color,'AA');
 rules.push({rule_id:'TEST-REQUIRE',thermal_scope:'INSULATION_K2',design_scope:'G12',door_color_scope:'ANY',constraint:'REQUIRED',frame_color_result:'AA'});
 assert.deepEqual(values(adaptRechentDoor3NonFireV1(pkg).uiResolver(selection),'frame_color'),['AA']);
 pkg.documentsByFileName['product_rules.json'].frame_color_rules=rules.filter(row=>row.rule_id!=='DEFAULT');
 assert.deepEqual(values(adaptRechentDoor3NonFireV1(pkg).uiResolver({thermal_spec:'INSULATION_K2',opening_type:'SINGLE',design:'S14',body_color:'BB'}),'frame_color'),['AA']);
});

test('real frame reset clears invalid colors and keeps valid colors across upstream changes',async()=>{
 const start=await completeRechent({thermal_spec:'INSULATION_K2',opening_type:'SINGLE',design:'G78',body_color:'CB',frame_color:'AK'});
 const changed=await resolveRuntimeAppProduct(RECHENT_ID,{...start.selection,body_color:'BB'});
 assert.deepEqual(values(changed,'frame_color'),['AA']);
 assert.equal(Object.hasOwn(changed.selection,'frame_color'),false);
 assert.ok(changed.clearedFields.includes('frame_color'));
 const required=await resolveRuntimeAppProduct(RECHENT_ID,{...start.selection,design:'S14',body_color:'BB',frame_color:'AK'});
 assert.deepEqual(values(required,'frame_color'),['AA']);
 assert.equal(Object.hasOwn(required.selection,'frame_color'),false);
 const kept=await resolveRuntimeAppProduct(RECHENT_ID,{...required.selection,frame_color:'AA',design:'G12'});
 assert.equal(kept.selection.frame_color,'AA');
 const thermal=await resolveRuntimeAppProduct(RECHENT_ID,{...start.selection,thermal_spec:'HIGH_INSULATION'});
 assert.equal(Object.hasOwn(thermal.selection,'design'),false);
 assert.equal(Object.hasOwn(thermal.selection,'frame_color'),false);
});

test('all exterior trims preserve IDs, official labels, save/reload and estimate handoff',async()=>{
 const product=runtimeAppIntegrationInventory().find(row=>row.id===RECHENT_ID);
 for(const [exterior_trim,label] of Object.entries(trimLabels)){
  const result=await completeRechent({thermal_spec:'INSULATION_K2',opening_type:'SINGLE',design:'G12',exterior_trim});
  assert.deepEqual(Object.fromEntries(field(result,'exterior_trim').values.map(row=>[row.value,row.displayLabel])),trimLabels);
  const saved=JSON.parse(JSON.stringify(createProductConfigurationSnapshot({product,result})));
  assert.equal(saved.configuration.exterior_trim,exterior_trim);
  assert.equal(saved.display_summary.find(row=>row.key==='exterior_trim').value,label);
  const reload=await resolveRuntimeAppProduct(RECHENT_ID,saved.configuration);
  assert.equal(reload.selection.exterior_trim,exterior_trim);
  assert.deepEqual(field(reload,'exterior_trim'),field(result,'exterior_trim'));
  const output=createEstimateOutputModel({project:{project_id:'trim-qa',project_name:'Trim QA'},estimate:{estimate_id:'trim-estimate',project_id:'trim-qa'},openings:[{opening_id:'trim-opening',project_id:'trim-qa',estimate_id:'trim-estimate',opening_no:1,product_configuration_snapshot:saved}]});
  assert.equal(output.rows[0].configuration.exterior_trim,exterior_trim);
  assert.equal(output.rows[0].display_summary.find(row=>row.key==='exterior_trim').value,label);
  assert.doesNotMatch(label,/(?:25|50)_(?:LONG|SHORT)/);
 }
 const pkg=structuredClone(await packageForTest());
 pkg.documentsByFileName['installation_rules.json'].exterior_trim[0].official_name='公式名称フィールド';
 assert.equal(field(adaptRechentDoor3NonFireV1(pkg).uiResolver({}),'exterior_trim').values[0].displayLabel,'公式名称フィールド');
 pkg.documentsByFileName['installation_rules.json'].exterior_trim.push({trim_id:'UNKNOWN'});
 assert.throws(()=>adaptRechentDoor3NonFireV1(pkg).uiResolver({}),{code:'RECHENT_TRIM_LABEL_MISSING'});
});
