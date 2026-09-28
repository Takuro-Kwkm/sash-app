// Differential fixtures verify the proof machinery; they are not product QA evidence.
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runConstraint,recoveryIdentity,validateConstraintCaseEvidence,buildSymbolicSafety} from './uchirimo-selector-batch-runner.mjs';
import {sha256,stableJson,recoveryEvidenceNames} from './uchirimo-v11-recovery-controller.mjs';

const root=mkdtempSync(join(tmpdir(),'uchirimo-proof-differential-'));
const row={shard:0,node_id:'FIXTURE',partition_key:'FIXTURE',room_specification:'residential',window_type:'sliding_window',glass_family:'insulating_glass',partition_seed_json:'{}'};
const constraints=[{field_key:'fixed',decision:{kind:'VALUE',value:'A'}}];
const identity=recoveryIdentity(row,constraints);
const field=(key,values,extra={})=>({key,values:values.map(value=>({value})),required:true,readOnly:false,dataType:'ENUM',semanticStage:'fixture',semanticSlot:key,...extra});
const fields=[field('fixed',['A','B']),field('mode',['first','second']),field('detail',['x','y']),field('color',['a','b','c']),field('optional',['x','y'],{required:false}),field('multi',['x','y'],{dataType:'MULTI_ENUM',required:false}),field('fallback',['a','b'])];
const runtime={sourcePackageIntegrity:{match:true,actual:'fixture'},master:{fields:fields.map(f=>({field_name:f.key})),canonical:{product_nodes:[{node_id:'FIXTURE',room:'residential',window_type:'sliding_window'}],dependency_rules:[{conditions:[{field:'mode'}],effect:{target_field:'detail'}}]}}};
const resolveProduct=async(_,selection)=>({selection:{...selection},fields:fields.map(f=>f.key==='detail'&&selection.mode==='second'?field('detail',['z']):f),validation:{status:selection.fallback==='b'?'REVIEW':'PASS'},clearedFields:[]});
const expand=terminal=>{
 let selections=[terminal.representative_selection];
 for(const axis of terminal.symbolic_axes)selections=selections.flatMap(selection=>axis.branches.map(branch=>{const next={...selection};if(branch.kind==='UNSET')delete next[axis.field_key];else next[axis.field_key]=branch.value;return next;}));
 return selections.map(selection=>stableJson({selection,validation_status:terminal.validation_status,flow:terminal.flow_signature_sha256}));
};
const base={expectedShards:1,timeoutMs:60000,head:'f'.repeat(40),loadRuntime:async()=>runtime,resolveProduct};
try{
 const symbolic=[],explicit=[];
 for(const [name,enabled,target] of [['symbolic',true,symbolic],['explicit',false,explicit]]){
   const out=join(root,name);
   const result=await runConstraint(row,constraints,identity,{...base,out,symbolic:enabled,onTerminal:t=>target.push(...expand(t))});
   assert.equal(result.status,'PASS');
   const report=JSON.parse(readFileSync(join(out,recoveryEvidenceNames(identity).report)));
   assert.equal(report.terminal_context_count,target.length);
   const lines=readFileSync(join(out,report.case_artifact),'utf8');
   assert.doesNotThrow(()=>validateConstraintCaseEvidence(report,lines));
   assert.throws(()=>validateConstraintCaseEvidence({...report,terminal_context_count:report.terminal_context_count+1},lines),/COVERAGE_MISMATCH/);
   assert.throws(()=>validateConstraintCaseEvidence(report,lines+lines.split('\n')[0]+'\n'),/INTEGRITY_MISMATCH/);
   assert.equal(sha256(lines),report.case_artifact_sha256);
   const classes=lines.trim().split('\n').map(JSON.parse);
   assert.equal(classes.length,report.terminal_equivalence_class_count);
   assert.equal(classes.reduce((n,c)=>n+c.symbolic_multiplicity,0),report.terminal_context_count);
   if(enabled){assert.ok(report.symbolic_collapsed_branch_count>0);assert.ok(report.symbolic_fallback_count>0);assert.ok(report.terminal_equivalence_class_count<report.terminal_context_count);}
 }
 assert.deepEqual(symbolic.sort(),explicit.sort());
 assert.equal(new Set(symbolic).size,symbolic.length);
 assert.equal(symbolic.length,216);
 // Target/raw-input values that drive a later decision must remain explicit,
 // even if their immediate projections are identical before that decision.
 const delayedFields=[field('fixed',['A']),field('target_driver',['a','b']),field('raw_driver',['a','b']),field('late',['off','on']),field('detail',['x','y']),field('conditional',['yes','no'])];
 const delayedRuntime={...runtime,master:{...runtime.master,fields:[...delayedFields.map(f=>({field_name:f.key})),{field_name:'fixed_by_source'},{field_name:'also_sink'}],canonical:{...runtime.master.canonical,dependency_rules:[
   {conditions:[{field:'fixed'}],effect:{target_field:'target_driver',also:{also_sink:['x','y']}}},
   {conditions:[{field:'target_driver'},{field:'late'}],effect:{target_field:'detail'}},
   {conditions:[],effect:{field:'fixed_by_source',target_field:'detail'}}
 ]},sizeInstallation:{installation_input_contract:{raw_inputs:[
   {field_name:'raw_driver'},
   {field_name:'conditional',required_when:'raw_driver == b AND late == on'}
 ]}}}};
 const safety=buildSymbolicSafety(delayedRuntime);
 for(const key of ['target_driver','raw_driver','late','fixed_by_source'])assert.equal(safety.independent.has(key),false,key);
 for(const key of ['detail','conditional','also_sink'])assert.equal(safety.independent.has(key),true,key);
 const delayedResolve=async(_,selection)=>({selection:{...selection},fields:delayedFields.flatMap(f=>{
   if(f.key==='detail'&&selection.late==='on'&&selection.target_driver==='b')return [field('detail',['z'])];
   if(f.key==='conditional'&&!(selection.raw_driver==='b'&&selection.late==='on'))return [];
   return [f];
 }),validation:{status:'PASS'},clearedFields:[]});
 const delayedSets=[];
 for(const enabled of [false,true]){
   const terminals=[],out=join(root,'delayed-'+enabled);
   const result=await runConstraint(row,constraints,identity,{...base,out,symbolic:enabled,loadRuntime:async()=>delayedRuntime,resolveProduct:delayedResolve,onTerminal:t=>terminals.push(...expand(t))});
   assert.equal(result.status,'PASS',result.error);
   const report=JSON.parse(readFileSync(join(out,recoveryEvidenceNames(identity).report)));
   validateConstraintCaseEvidence(report,readFileSync(join(out,report.case_artifact)));
   if(enabled)assert.ok(report.terminal_equivalence_class_count<report.terminal_context_count);
   delayedSets.push(terminals.sort());
 }
 assert.equal(delayedSets[0].length,17);
 assert.equal(new Set(delayedSets[0]).size,17);
 assert.deepEqual(delayedSets[1],delayedSets[0]);
 // A sink encountered before its upstream selector must not be collapsed:
 // the later selector can invalidate only some of its previously equal values.
 const incomingFields=[field('fixed',['A']),field('sink',['a','b']),field('later',['off','on'])];
 const incomingRuntime={...runtime,master:{fields:incomingFields.map(f=>({field_name:f.key})),canonical:{...runtime.master.canonical,dependency_rules:[{conditions:[{field:'later'}],effect:{target_field:'sink'}}]}}};
 const incomingResolve=async(_,input)=>{
   const selection={...input},clearedFields=[];
   if(selection.later==='on'&&selection.sink==='a'){delete selection.sink;clearedFields.push({field:'sink'});}
   return {selection,fields:incomingFields.map(f=>f.key==='sink'&&selection.later==='on'?field('sink',['b']):f),validation:{status:'PASS'},clearedFields};
 };
 const incomingSets=[];
 for(const enabled of [false,true]){
   const terminals=[];
   const result=await runConstraint(row,constraints,identity,{...base,out:join(root,'incoming-'+enabled),symbolic:enabled,loadRuntime:async()=>incomingRuntime,resolveProduct:incomingResolve,onTerminal:t=>terminals.push(...expand(t))});
   assert.equal(result.status,'PASS',result.error);incomingSets.push(terminals.sort());
 }
 assert.equal(incomingSets[0].length,3);
 assert.deepEqual(incomingSets[1],incomingSets[0]);
 // Cross the deadline inside branch evaluation, including the last evaluated branch.
 // No terminal/report may be accepted from an incomplete or expired traversal.
 for(const expireAfter of [3,4,5]){
   let clock=0,calls=0;const out=join(root,'timeout-'+expireAfter);
   const result=await runConstraint(row,constraints,identity,{...base,out,now:()=>clock,resolveProduct:async(...args)=>{if(++calls>=expireAfter)clock=60001;return resolveProduct(...args);}});
   assert.equal(result.status,'FAIL');assert.equal(result.timed_out,true);
   assert.ok(!readdirSync(out).includes(recoveryEvidenceNames(identity).report));
 }
 const reject=await runConstraint(row,constraints,identity,{...base,out:join(root,'reject'),resolveProduct:async(_,selection)=>resolveProduct(_,Object.fromEntries(Object.entries(selection).filter(([key])=>key!=='fixed')))});
 assert.equal(reject.status,'FAIL');assert.match(reject.error,/CONSTRAINT_ENTRY_NOT_PRESERVED/);
 console.log('UCHIRIMO_CHILD_PROOF_DIFFERENTIAL=PASS exhaustive-set/optional/multi/dependency/target-sink/raw-input/delayed-effect/required-when/fallback/constraint/timeout; NOT_PRODUCT_QA_EVIDENCE');
}finally{rmSync(root,{recursive:true,force:true});}
