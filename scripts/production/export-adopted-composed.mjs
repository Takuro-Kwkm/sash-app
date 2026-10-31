/** Read-only projection of an already adopted generic composed package. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {resolveRuntimeAppProduct} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {formalComposedRuntimeEntries,readFormalComposedModule} from '../../src/catalog/runtime-master/formal-composed-runtime-registry.mjs';
const c=JSON.parse(readFileSync(process.argv[2])),entry=formalComposedRuntimeEntries.find(e=>e.id===c.product_id);
assert.ok(entry,'Exact formally registered composition required');
const hash=b=>createHash('sha256').update(b).digest('hex'),master=JSON.parse(readFileSync(c.formal.path));
assert.equal(hash(readFileSync(c.formal.path)),c.formal.sha256);assert.equal(entry.uiFlowContract.sourceFlow.sha256,c.formal.sha256);
const module=readFormalComposedModule(entry).document;assert.equal(module.baseline.sha256,c.formal.sha256);
const state=await resolveRuntimeAppProduct(entry.id,c.seed),active=new Map(state.fields.map(f=>[f.key,f]));
const flow=entry.uiFlowContract,ordered=Object.entries(flow.fields).sort((a,b)=>a[1].rank-b[1].rank);
const fields=ordered.map(([key,f])=>{
 const current=active.get(key),visible=Boolean(current),derived=Boolean(current?.readOnly);
 const output=derived&&current.selectionMode==='DERIVED';
 const control=!visible?'NOT_RENDERED':output?'OUTPUT':current.dataType==='NUMBER'?'NUMBER':current.dataType==='TEXT'?'TEXT':'SELECT';
 return {field_id:key,stage:f.stage,role:derived?'DERIVED':'SELECTOR',control,candidate_values:control==='SELECT'?(current.values??[]).map(v=>String(v.value)):[],visible,required:visible&&!output&&Boolean(current.required),label:current?.displayLabel??f.label};
});
const types=[...new Set(master.handoff_tests.filter(t=>t.case_id.startsWith('STANDARD-')).map(t=>t.before.window_type))],checks={};
checks.MASTER_PROJECTION={status:'PASS',executed_cases:master.fields.length};
let contexts=0;
for(const type of types){
 const source=master.handoff_tests.find(t=>t.case_id.startsWith('STANDARD-')&&t.before.window_type===type);
 const result=await resolveRuntimeAppProduct(entry.id,{...source.before,quantity:1});
 assert.equal(result.sales_request_handoff.request_valid,true);assert.equal(result.orderReady,false);assert.equal(result.pricing.price,null);
 const ranks=result.fields.map(f=>flow.fields[f.key].rank);assert.deepEqual(ranks,[...ranks].sort((a,b)=>a-b));contexts++;
}
checks.FLOW_ORDER={status:'PASS',executed_cases:contexts};
for(const field of fields.filter(f=>f.visible))assert.ok(field.control&&Array.isArray(field.candidate_values));
checks.CONTROL_AND_VALUES={status:'PASS',executed_cases:fields.length};
let transitions=0;
for(const id of c.transition_case_ids){
 const t=master.handoff_tests.find(t=>t.case_id===id);assert.ok(t,id);
 const result=await resolveRuntimeAppProduct(entry.id,{...t.before,...t.changes,quantity:1},{changedFields:Object.keys(t.changes??{})});
 for(const [key,value] of Object.entries(t.expected_output??{}))assert.deepEqual(result.selection[key],value,id+':'+key);
 for(const key of t.expected_cleared??[])assert.equal(result.selection[key],undefined,id+':'+key);
 for(const key of c.transition_expectations?.[id]?.cleared??[])assert.equal(result.selection[key],undefined,id+':'+key);
 for(const key of c.transition_expectations?.[id]?.hidden??[])assert.ok(!result.fields.some(f=>f.key===key),id+':'+key);
 for(const key of c.transition_expectations?.[id]?.visible??[])assert.ok(result.fields.some(f=>f.key===key),id+':'+key);
 if(t.expected_valid!==undefined)assert.equal(result.sales_request_handoff.request_valid,t.expected_valid,id);
 transitions++;
}
assert.ok(transitions>0);
for(const key of ['BRANCH_VISIBILITY','KEEP_VALID','CLEAR_INVALID'])checks[key]={status:'PASS',executed_cases:transitions};
const restored=await resolveRuntimeAppProduct(entry.id,JSON.parse(JSON.stringify(state.selection)));
assert.deepEqual(restored.selection,state.selection);checks.RESTORE={status:'PASS',executed_cases:1};
assert.equal(restored.sales_request_handoff.request_valid,true);assert.equal(restored.sales_request_handoff.manufacturing_approval,false);checks.HANDOFF={status:'PASS',executed_cases:contexts+1};
console.log(JSON.stringify({schema:'ADOPTED_COMPOSED_INSPECTION_PROJECTION_V1',repository:'Takuro-Kwkm/sash-app',product_id:entry.id,status:'PASS',master_sha256:c.formal.sha256,fields,master_fields:master.fields.map(f=>({field_id:f.field_id})),flow_stages:flow.groups.map(g=>g.id),checks,selection:state.selection,ui_semantic_identity:hash(Buffer.from(JSON.stringify(flow)))}));
