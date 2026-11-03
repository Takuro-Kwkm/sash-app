/** Inspect a declared source flow against the normal adopted Runtime. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolveRuntimeAppProduct} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {adaptComposedProductRuntime} from '../../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {applyDeclaredWindowFlow} from '../../src/catalog/runtime-master/declared-window-flow.mjs';
import {fieldLabel} from '../../contracts/ui-common/field-labels.v1.mjs';
import {formalComposedRuntimeEntries,readFormalComposedModule} from '../../src/catalog/runtime-master/formal-composed-runtime-registry.mjs';
const c=JSON.parse(readFileSync(process.argv[2])),read=r=>{const b=readFileSync(r.path);assert.equal(createHash('sha256').update(b).digest('hex'),r.sha256);return JSON.parse(b);};
assert.equal(c.schema,'ADOPTED_SHARED_DOMAIN_FLOW_PROBE_V1');
const master=read(c.formal),entry=formalComposedRuntimeEntries.find(e=>e.id===c.runtime_product_id);
assert.ok(entry);assert.equal(master.product.product_id,c.product_id);
const module=readFormalComposedModule(entry).document;assert.equal(module.baseline.sha256,c.formal.sha256);assert.equal(entry.uiFlowContract.sourceFlow.sha256,c.formal.sha256);
const old=read(c.candidate_index).products[0],candidate=read(c.candidate_module),reader=await adaptComposedProductRuntime(candidate,old,()=>{throw Error('Unexpected source lookup');});
const approved=reader.uiResolver(c.seed),flow=old.uiFlowContract,state=await resolveRuntimeAppProduct(entry.id,c.seed);
const groupOrder=new Map(flow.groups.map(g=>[g.id,g.order]));
const fields=applyDeclaredWindowFlow(approved.fields,old).map(f=>{const d=flow.fields[f.key];assert.ok(d);const control=f.readOnly&&f.selectionMode==='DERIVED'?'OUTPUT':f.dataType==='MULTI_ENUM'?'CHECKBOX_GROUP':f.dataType==='NUMBER'?'NUMBER':f.dataType==='TEXT'?'TEXT':'SELECT';return {field_id:f.key,stage:d.group,semantic_stage:d.stage,semantic_slot:d.slot,role:f.readOnly?'DERIVED':'SELECTOR',control,candidate_values:['SELECT','CHECKBOX_GROUP'].includes(control)?f.values.map(v=>String(v.value)):[],visible:true,required:control!=='OUTPUT'&&Boolean(f.required),label:f.key==='quantity'?fieldLabel('quantity'):f.displayLabel};});
assert.deepEqual(state.fields.map(f=>f.key),fields.map(f=>f.field_id));
const rank=key=>[groupOrder.get(flow.fields[key].group),flow.fields[key].rank];
const checkOrder=keys=>{const ranks=keys.map(rank);assert.deepEqual(ranks,[...ranks].sort((a,b)=>a[0]-b[0]||a[1]-b[1]));};checkOrder(state.fields.map(f=>f.key));
const checks={MASTER_PROJECTION:{status:'PASS',executed_cases:master.fields.length},CONTROL_AND_VALUES:{status:'PASS',executed_cases:fields.length}},executed=[];
for(const [check,ids]of Object.entries(c.check_case_ids)){
 assert.ok(['FLOW_ORDER','BRANCH_VISIBILITY','KEEP_VALID','CLEAR_INVALID','HANDOFF'].includes(check)&&ids.length>0);
 for(const id of ids){const t=master.handoff_tests.find(t=>t.case_id===id);assert.ok(t,id);const input={quantity:1,...t.before,...t.changes},a=reader.uiResolver(input),b=await resolveRuntimeAppProduct(entry.id,input);
  assert.deepEqual(b.selection,a.selection,id);assert.deepEqual(b.validation,a.validation,id);assert.deepEqual(b.sales_request_handoff,a.sales_request_handoff,id);assert.deepEqual(b.fields.map(f=>f.key),applyDeclaredWindowFlow(a.fields,old).map(f=>f.key));checkOrder(b.fields.map(f=>f.key));
  assert.equal(b.orderReady,false);assert.deepEqual(b.pricing,{price:null,bom:null,set_code:null});
  const expect=c.case_assertions[id];assert.ok(expect&&Object.keys(expect).length,id+': explicit assertions required');
  for(const [key,value]of Object.entries(expect.selection??{}))assert.deepEqual(b.selection[key],value,id+':'+key);
  for(const key of expect.cleared??[])assert.equal(b.selection[key],undefined,id+':'+key);
  for(const key of expect.hidden??[])assert.ok(!b.fields.some(f=>f.key===key),id+': hidden '+key);
  for(const key of expect.visible??[])assert.ok(b.fields.some(f=>f.key===key),id+': visible '+key);
  if(expect.valid!==undefined)assert.equal(b.sales_request_handoff.request_valid,expect.valid,id);
  executed.push({check,case_id:id,status:'PASS'});
 }
 checks[check]={status:'PASS',executed_cases:ids.length};
}
const restored=await resolveRuntimeAppProduct(entry.id,JSON.parse(JSON.stringify(state.selection)));assert.deepEqual(restored.selection,state.selection);assert.equal(restored.sales_request_handoff.request_valid,true);assert.equal(restored.sales_request_handoff.manufacturing_approval,false);checks.RESTORE={status:'PASS',executed_cases:1};
console.log(JSON.stringify({schema:'ADOPTED_SHARED_DOMAIN_FLOW_PROJECTION_V1',status:'PASS',repository:c.repository,product_id:c.product_id,runtime_product_id:entry.id,master_sha256:c.formal.sha256,fields,master_fields:master.fields.map(f=>({field_id:f.field_id})),flow_stages:[...flow.groups].sort((a,b)=>a.order-b.order).map(g=>g.id),checks,executed,selection:state.selection,retained_full_qa:'INSPECT_ORIGINAL_VERIFIED_WORK; NOT_REEXECUTED'}));
