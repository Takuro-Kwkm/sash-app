// Differential fixtures verify the proof machinery; they are not product QA evidence.
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runConstraint,recoveryIdentity,validateConstraintCaseEvidence} from './uchirimo-selector-batch-runner.mjs';
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
 console.log('UCHIRIMO_CHILD_PROOF_DIFFERENTIAL=PASS exhaustive-set/optional/multi/dependency/fallback/constraint/timeout; NOT_PRODUCT_QA_EVIDENCE');
}finally{rmSync(root,{recursive:true,force:true});}
