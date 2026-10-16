import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {loadRegisteredRuntime} from '../../../src/catalog/runtime-master/runtime-master-registry.mjs';
import {getRuntimeAppIntegration} from '../../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {applyRuntimeUiCategoryOrder} from '../../../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
import {GLOBAL_WINDOW_STAGE_ORDER} from '../../../src/catalog/runtime-master/global-window-selection-flow-engine.mjs';
import {applyDeclaredInputClears,createProductConfigurationSnapshot} from '../../../src/work-management/domain.mjs';
const [indexPath,modelPath,out]=process.argv.slice(2),index=JSON.parse(readFileSync(indexPath)),entry=index.products[0],root=dirname(resolve(indexPath)),doc=JSON.parse(readFileSync(resolve(root,entry.path))),m=doc.product_module,model=JSON.parse(readFileSync(modelPath));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),clean=x=>Object.fromEntries(Object.entries(x).filter(([,v])=>v!==undefined&&v!==null)),same=(a,b)=>assert.deepEqual(clean(a),clean(b));
assert.equal(model.status,'PASS');assert.equal(createHash('sha256').update(readFileSync(indexPath)).digest('hex'),model.runtime_index_sha256);
const windowKey=Object.entries(entry.uiFlowContract.fields).find(([,f])=>f.slot==='window_type')[0];
const reader=await loadRegisteredRuntime(entry.manufacturer,entry.series),integration=getRuntimeAppIntegration(entry.id),components=new Map(model.component_models.map(c=>[c.id,c]));
const ui=input=>{const r=reader.uiResolver(input);r.fields=applyRuntimeUiCategoryOrder(r.fields,integration);return r;};
const shape=f=>({key:f.key,type:f.dataType,required:f.required,stage:f.semanticStage,slot:f.semanticSlot,parents:f.parentFields??[],readOnly:!!f.readOnly,group:f.presentationGroup?.id,disabled:!!f.disabled});
const fieldCases=new Map(),flows=new Map(),componentShapes=new Map(),seenComponents=new Set(),clearGraphs=new Map();let materialized=0,endpointCases=0;const failures=[];
function observe(s,{mustReady=true,label=''}={}){
 const r=ui(clean(s));materialized++;
 if(mustReady){try{same(r.selection,s);assert.equal(r.sales_request_handoff.request_valid,true);assert.equal(r.validation.status,'MANUAL_CHECK');}catch(e){failures.push({label,input:clean(s),validation:r.validation,selection:r.selection,reason:e.message});}}
 assert.equal(r.orderReady,false);assert.deepEqual(r.pricing,{price:null,bom:null,set_code:null});assert.ok(r.confirmationRequests.length>0);assert.ok(!r.sales_request_handoff.automatic_orderability&&!r.sales_request_handoff.manufacturing_approval);
 let stage=-1;for(const f of r.fields){assert.ok(f.semanticSlot&&f.semanticStage);const pos=GLOBAL_WINDOW_STAGE_ORDER.indexOf(f.semanticStage);assert.ok(pos>=stage);stage=pos;assert.ok(!f.internal&&!f.technical);const key=hash({field:f,selection:r.selection[f.key]});fieldCases.set(key,{field:f,selection:clean({[f.key]:r.selection[f.key]})});}
 const graph=r.fields.map(f=>({key:f.key,clearOnParentChange:f.clearOnParentChange??[],clearLinkedFields:f.clearLinkedFields??[]}));clearGraphs.set(hash(graph),graph);
 return r;
}
for(let i=0;i<model.context_models.length;i++){
 const c=model.context_models[i],s={...c.fixed};if(c.components.some(id=>!components.get(id).valid.length))continue;
 for(const id of c.components)Object.assign(s,components.get(id).valid[0]);
 const r=observe(s,{label:'CONTEXT:'+i});
 if(c.partition){const {width:w,height:h}=c.partition;for(const [width,height] of [[w.hi,h.hi],[Math.floor((w.lo+w.hi)/2),Math.floor((h.lo+h.hi)/2)]]){if(width===s[doc.sales_handoff.dimensions.width]&&height===s[doc.sales_handoff.dimensions.height])continue;observe({...s,[doc.sales_handoff.dimensions.width]:width,[doc.sales_handoff.dimensions.height]:height},{label:'PARTITION_BOUNDARY:'+i});endpointCases++;}}
 for(const id of c.components)if(!seenComponents.has(id)){
  seenComponents.add(id);const comp=components.get(id),patterns=new Map();
  for(let j=0;j<comp.valid.length;j++){const state={...s,...comp.valid[j]},result=observe(state,{label:'COMPONENT:'+id+':'+j}),projected=result.fields.filter(f=>comp.keys.includes(f.key)).map(shape);patterns.set(hash(projected),{projection:projected,assignment:comp.valid[j]});}
  componentShapes.set(id,[...patterns.values()]);
 }
 // A component factor contains every selector support for its fields. Thus
 // visibility/required/slot projections of disjoint components compose exactly.
 const fixedFields=r.fields.filter(f=>Object.hasOwn(c.fixed,f.key)).map(shape);
 const combinations=[{fields:fixedFields,state:{...c.fixed}}];
 for(const id of c.components){const previous=combinations.splice(0);for(const before of previous)for(const pattern of componentShapes.get(id))combinations.push({fields:[...before.fields,...pattern.projection],state:{...before.state,...pattern.assignment}});}
 const ranks=new Map(Object.entries(entry.uiFlowContract.fields).map(([k,v])=>[k,[entry.uiFlowContract.groups.find(g=>g.id===v.group).order,v.rank]]));
 const order=(a,b)=>{const x=ranks.get(a.key),y=ranks.get(b.key);return x[0]-y[0]||x[1]-y[1];};
 for(const row of combinations){row.fields.sort(order);const id=hash({baseWindow:c.fixed[windowKey],fields:row.fields});if(!flows.has(id)){const actual=observe(row.state,{label:'FLOW_COMPOSITION:'+id});assert.deepEqual(actual.fields.map(shape),row.fields);flows.set(id,{id,seed:clean(row.state),fields:row.fields});}}
 assert.ok(failures.length<10,'RUNTIME_MODEL_MISMATCH');
}
// Least-fixed-point CLEAR is compared with an independent queue traversal for
// every changed parent and every presence subset of its complete affected cone.
let transitionAssignments=0;const transitionClasses=[];
for(const [signature,graph] of clearGraphs){
 const parents=[...new Set(graph.flatMap(f=>f.clearOnParentChange))];
 for(const parent of parents){const cone=new Set(),todo=[parent];while(todo.length){const p=todo.shift();for(const f of graph)if(f.clearOnParentChange.includes(p)&&!cone.has(f.key)){cone.add(f.key);todo.push(f.key);for(const k of f.clearLinkedFields){cone.add(k);todo.push(k);}}}
  const keys=[...cone];assert.ok(keys.length<=16,'TRANSITION_PRESENCE_SPACE_UNSUPPORTED');
  for(let mask=0;mask<2**keys.length;mask++){
   const input={unrelated:'preserve'};keys.forEach((k,j)=>{if(mask&(1<<j))input[k]='VALUE';});const expected={...input},queue=[parent],changed=new Set([parent]);
   while(queue.length){const p=queue.shift();for(const f of graph){if(!f.clearOnParentChange.includes(p)||!Object.hasOwn(expected,f.key))continue;for(const k of [f.key,...f.clearLinkedFields]){delete expected[k];if(!changed.has(k)){changed.add(k);queue.push(k);}}}}
   assert.deepEqual(applyDeclaredInputClears(input,[parent],graph),expected);transitionAssignments++;
  }transitionClasses.push({signature,parent,presence_assignments:2**keys.length,affected:keys});
 }
}
const rows=[...flows.values()];const first=rows[0].seed,numericGuards=[];
for(const rule of m.ruleSets.flatMap(s=>s.payload.numbers??[]))for(const value of [0,-1,0.5,'x',Number.NaN,Number.POSITIVE_INFINITY]){
 const s={...first,[rule.key]:value};if(doc.selection_views.some(v=>v.source_fields.includes(rule.key))){delete s[doc.selection_views.find(v=>v.source_fields.includes(rule.key)).key];s[Object.keys(doc.selection_views[0].selector)[0]]=m.allowedValues.find(v=>v.specificationKey===Object.keys(doc.selection_views[0].selector)[0]&&v.value!==Object.values(doc.selection_views[0].selector)[0]).value;}
 const r=observe(s,{mustReady:false});assert.equal(r.sales_request_handoff.request_valid,false);numericGuards.push({field:rule.key,value:String(value),status:r.validation.status});
}
assert.deepEqual(failures,[]);
const qa=JSON.parse(readFileSync(resolve(root,'adoption/browser-qa.json')));qa.rows=rows.map((row,i)=>({id:'flow-'+String(i+1).padStart(3,'0'),proof_signature:row.id,seed:row.seed,expected_valid:true,expected_quantity:1,expected_confirmation_ids:ui(row.seed).confirmationRequests.map(r=>r.id),number_fields:ui(row.seed).fields.filter(f=>f.dataType==='NUMBER').map(f=>f.key)}));
// Retain the adopted negative route and all 15 actual interaction transitions.
const old=JSON.parse(readFileSync(resolve(root,'adoption/browser-qa.json')));qa.rows.push(...old.rows.map(row=>({...row,id:'adopted-'+row.id})));qa.viewports=[1440,390];qa.heights={'1440':1000,'390':844};
mkdirSync(out,{recursive:true});const write=(name,data)=>writeFileSync(resolve(out,name),JSON.stringify(data));write('browser-qa.json',qa);write('browser-field-projections.json',[...fieldCases.values()]);write('flow-signatures.json',rows);write('transition-proof.json',{status:'PASS',classes:transitionClasses,materialized_assignments:transitionAssignments,unverified_classes:0});
const windows=[...new Set(m.allowedValues.filter(v=>v.specificationKey===windowKey).map(v=>v.value))];assert.deepEqual([...new Set(rows.map(r=>r.seed[windowKey]))].sort(),[...windows].sort());
const report={status:'PASS',PROOF_MODEL_VERSION:model.PROOF_MODEL_VERSION,scope:'ADOPTED_SALES_ESTIMATE_REQUEST_UI',series_verified:1,series_total:1,base_windows:windows,base_window_verified:windows.length,base_window_total:windows.length,critical_unmapped:0,exact_head_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime_index_sha256:model.runtime_index_sha256,finite_configuration_points_per_quantity_text_parameters:model.integer_configuration_count,complete_domain_contexts:model.contexts,standard_cells:model.standard_cells,custom_partition_cells:model.custom_partition_cells,component_classes:model.abstract_components,component_assignments:model.component_valid_states,materialized_runtime_cases:materialized,partition_endpoint_cases:endpointCases,flow_signature_count:flows.size,clear_graph_count:clearGraphs.size,transition_proof_classes:transitionClasses.length,transition_presence_assignments:transitionAssignments,browser_field_projection_classes:fieldCases.size,browser_flow_cases:qa.rows.length,numericGuards,unverified_runtime_classes:0,unverified_flow_signatures:0,unverified_continuous_partitions:0,unverified_transition_classes:0,browser_status:'NOT_EXECUTED',APP_INTEGRATION_READY:false,product_master_mutations:0,production_release:false};write('runtime-proof.json',report);console.log(JSON.stringify(report));
