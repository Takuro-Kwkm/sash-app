import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {adaptComposedProductRuntime} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {applyDeclaredWindowFlow,validateReviewedWindowFlow} from '../src/catalog/runtime-master/declared-window-flow.mjs';
import {selectorMatches} from '../src/catalog/selector.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {createEstimateOutputModel} from '../src/estimate-output/model.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../changes/doorremo-runtime-ui-r1');
const read=path=>JSON.parse(readFileSync(resolve(root,path)));
const index=read('index.json'), entry=index.products[0], document=read(entry.path), master=read('sources/PRODUCT_MASTER.json');
const reader=await adaptComposedProductRuntime(document,entry,()=>{throw new Error('UNEXPECTED_REFERENCE');});
const base={...master.handoff_tests.find(row=>row.case_id==='D50-request').changes,quantity:1};

test('projection retains exact adopted manufacturer facts and all fields',()=>{
  assert.equal(createHash('sha256').update(readFileSync(resolve(root,'sources/PRODUCT_MASTER.json'))).digest('hex'),'f4149b78d6f1d83e8a72c325b49362638e49b72d45efa4fce8795afb846f0187');
  assert.equal(document.product_module.specificationDefinitions.length,master.fields.length+2);
  assert.equal(document.product_module.evidence.length,master.evidence.length);
  for(const field of master.fields){
    const definition=document.product_module.specificationDefinitions.find(row=>row.key===field.field_id);
    assert.deepEqual(definition.parentFields,field.dependency);
    const options=document.product_module.allowedValues.filter(row=>row.specificationKey===field.field_id);
    assert.deepEqual(options.map(row=>[row.value,row.displayLabel,row.evidenceIds]),field.selectable_values.map(row=>[row.value,row.label,row.evidence_ids]));
  }
  assert.equal(document.formal_adoption,false); assert.equal(document.source_adoption,false);
});
test('common number editor preserves conditional enum membership and reset',()=>{
  const good=reader.uiResolver(base), bad=reader.uiResolver({...base,frame_w:10000});
  assert.equal(good.validation.status,'MANUAL_CHECK');
  assert.equal(good.fields.find(row=>row.key==='frame_w').dataType,'NUMBER');
  assert.deepEqual(good.fields.find(row=>row.key==='frame_w').values,[]);
  assert.equal(bad.selection.frame_w,undefined);
  assert.ok(bad.validation.missingRequiredFields.includes('frame_w'));
  assert.ok(!['VALID','MANUAL_CHECK'].includes(bad.validation.status));
});
test('declared lower-frame view uses three exact source tuples and clears an invalid tuple',()=>{
  const good=reader.uiResolver(base);
  assert.equal(good.selection.lower_frame_layout,'STANDARD');
  assert.equal(good.fields.some(row=>['new_frame_type','lower_flat_material'].includes(row.key)),false);
  assert.deepEqual(good.fields.find(row=>row.key==='lower_frame_layout').values.map(row=>row.displayLabel),['標準納まり']);
  const d30={...master.handoff_tests.find(row=>row.case_id==='D30-request').changes,quantity:1};
  const d30Result=reader.uiResolver(d30);
  assert.equal(d30Result.fields.find(row=>row.key==='lower_frame_layout').values.length,3);
  const flat=reader.uiResolver({...d30Result.selection,lower_frame_layout:'STANDARD_WITH_FLAT'});
  assert.equal(flat.selection.new_frame_type,'STANDARD');assert.equal(flat.selection.lower_flat_material,true);
  const changed=reader.uiResolver({...flat.selection,product_grade:'D50'});
  assert.equal(changed.selection.lower_frame_layout,undefined);
  assert.equal(changed.selection.lower_flat_material,undefined);
  assert.ok(changed.validation.missingRequiredFields.includes('lower_frame_layout'));
});
test('forbidden site values and unknown inputs cannot pass sales-request validation',()=>{
  const forbidden=reader.uiResolver({...base,building_structure:'ALC_STEEL'});
  assert.equal(forbidden.validation.status,'INVALID');
  assert.ok(forbidden.validation.errors.some(row=>row.ruleId==='SITE-ALC-PREFAB'));
  assert.equal(reader.uiResolver({...base,unreviewed_field:true}).validation.status,'INVALID');
  const snapshot=createProductConfigurationSnapshot({product:entry,result:forbidden});
  assert.equal(snapshot.validation_state,'INVALID');
  const output=createEstimateOutputModel({project:{project_id:'qa'},estimate:{estimate_id:'qa'},openings:[{status:'COMPLETE',product_configuration_snapshot:snapshot}]});
  assert.equal(output.rows[0].state,'INVALID');
  assert.match(output.rows[0].size,/新設枠発注寸法 W 900 × H 2200 mm/);
});
test('reviewed flow is complete, common, and ordered with two separate glass flags',()=>{
  validateReviewedWindowFlow(entry.uiFlowContract);
  const r=reader.uiResolver(base), fields=applyDeclaredWindowFlow(r.fields,entry);
  assert.ok(fields.every(row=>row.fieldMeaning&&row.presentationGroup));
  assert.equal(fields.filter(row=>['new_frame_type','lower_flat_material'].includes(row.key)).length,0);
  assert.ok(fields.find(row=>row.key==='lower_frame_layout'));
  assert.ok(entry.uiFlowContract.fields.sidelight_glass_required);
  assert.ok(entry.uiFlowContract.fields.transom_glass_required);
});
test('manual confirmations retain owner, question and nonautomatic boundary',()=>{
  const r=reader.uiResolver(base);
  assert.ok(r.manualWarnings.length>=3);assert.equal(document.product_module.dependencies.length,6);
  assert.ok(document.product_module.dependencies.every(row=>row.metadata.owner&&row.metadata.question&&row.metadata.automatic_resolution===false));
  assert.equal(r.orderReady,false);assert.deepEqual(r.pricing,{price:null,bom:null,set_code:null});
  assert.equal(r.sales_request_handoff.quantity,1);assert.equal(r.sales_request_handoff.manufacturing_approval,false);
  assert.ok(r.confirmationRequests.every(row=>row.confirmation_to&&row.message));
  assert.equal(reader.uiResolver({...base,quantity:0}).validation.status,'INVALID');
  assert.equal(reader.uiResolver({...base,quantity:1.5}).validation.status,'INVALID');
  assert.equal(reader.uiResolver({...base,quantity:true}).validation.status,'INVALID');
});
test('catalog negation preserves absent-field semantics',()=>{
  assert.equal(selectorMatches({not:{field:'ALUMINUM'}},{}),true);
  assert.equal(selectorMatches({not:{field:'ALUMINUM'}},{field:'ALUMINUM'}),false);
});
