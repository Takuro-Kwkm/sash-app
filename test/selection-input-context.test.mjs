import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSelectionErrors,parseSelectionContext,attachDeclaredSalesHandoff} from '../src/catalog/runtime-master/declared-selection-views.mjs';
import {createEstimateOutputModel} from '../src/estimate-output/model.mjs';
const module={product:{id:'SYNTHETIC'},selectionInputPolicy:'INITIAL_STRICT_PARENT_REEVALUATE_V1',
 specificationDefinitions:[{key:'parent',dataType:'ENUM',selector:{},parentFields:[]},{key:'wishes',dataType:'MULTI_ENUM',selector:{},parentFields:['parent']},{key:'free',dataType:'TEXT',selector:{},parentFields:[]}],
 allowedValues:[{productId:'SYNTHETIC',specificationKey:'parent',value:'A',status:'ACTIVE',selector:{}},{productId:'SYNTHETIC',specificationKey:'parent',value:'B',status:'ACTIVE',selector:{}},{productId:'SYNTHETIC',specificationKey:'wishes',value:'keep',status:'ACTIVE',selector:{}},{productId:'SYNTHETIC',specificationKey:'wishes',value:'limited',status:'ACTIVE',selector:{parent:'A'}}],dependencies:[],ruleSets:[]};
test('initial-invalid optional wishes retain a rejection after common normalization',()=>{
 const input={parent:'B',wishes:['keep','limited']},normalized={parent:'B',wishes:['keep']};
 assert.deepEqual(initialSelectionErrors(module,input,normalized).map(x=>x.field),['wishes']);
 assert.deepEqual(input.wishes,['keep','limited']);assert.deepEqual(normalized.wishes,['keep']);
});
test('a parent edit permits only the normalized valid wishes to survive',()=>{
 assert.deepEqual(initialSelectionErrors(module,{parent:'B',wishes:['keep','limited']},{parent:'B',wishes:['keep']},['parent']),[]);
 assert.equal(initialSelectionErrors(module,{parent:'B',wishes:['keep','limited']},{parent:'B',wishes:['keep']},['wishes']).length,1);
});
test('invalid array type and duplicates are not silently admitted',()=>{
 assert.equal(initialSelectionErrors(module,{parent:'A',wishes:'keep'},{parent:'A'}).length,1);
 assert.equal(initialSelectionErrors(module,{parent:'A',wishes:['keep','keep']},{parent:'A',wishes:['keep','keep']}).length,1);
 assert.equal(initialSelectionErrors(module,{parent:'A',free:123},{parent:'A'}).length,1);
});
test('unchanged profiles preserve the prior interpretation',()=>{
 const old={...module};delete old.selectionInputPolicy;
 assert.deepEqual(initialSelectionErrors(old,{parent:'B',wishes:['limited']},{parent:'B'}),[]);
});
test('context is explicit, bounded and rejects malformed or undeclared fields',()=>{
 assert.deepEqual(parseSelectionContext(null),{changedFields:[]});assert.deepEqual(parseSelectionContext('{"changedFields":["parent","parent"]}'),{changedFields:['parent']});
 for(const value of [{changedFields:'parent'},{changedFields:['parent'],other:true},[],{changedFields:[null]}])assert.throws(()=>parseSelectionContext(value),TypeError);
 assert.throws(()=>initialSelectionErrors(module,{}, {},['unknown']),TypeError);
});
test('free requests have a structured handoff and a visible output representation',()=>{
 const document={product_module:module,sales_handoff:{quantity_field:'quantity',dimensions:{width:'w',height:'h',label:'寸法基準',unit:'mm'},request_fields:['quantity','free'],preserve_request_inputs:true}};
 const result={selection:{w:640,h:970,quantity:2,free:'現地取付けを確認希望'},validation:{errors:[],missingRequiredFields:[]}};
 attachDeclaredSalesHandoff(result,document);
 assert.deepEqual(result.sales_request_handoff.request_inputs,{quantity:2,free:'現地取付けを確認希望'});
 const model=createEstimateOutputModel({project:{project_id:'qa'},estimate:{estimate_id:'qa'},openings:[{status:'COMPLETE',product_configuration_snapshot:{configuration:{width:640,height:970,free:'現地取付けを確認希望'},sales_request_handoff:result.sales_request_handoff,validation_state:'VALID',display_summary:[{key:'free',label:'その他の希望',value:'現地取付けを確認希望'}]}}]});
 assert.equal(model.rows[0].size,'寸法基準 W 640 × H 970 mm');assert.ok(model.rows[0].major_specifications.includes('現地取付けを確認希望'));
});
