// Synthetic orchestration fixtures. These results are NEVER product QA evidence.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadRegisteredRuntime} from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import {CONTROLLER_CONTRACT_VERSION,recoveryUnitId,recoveryEvidenceNames,sha256,MAX_RECOVERY_DEPTH} from './uchirimo-v11-recovery-controller.mjs';
import {splitUnit,resolveUnitSelection} from './uchirimo-v11-recovery-controller-runner.mjs';

const root=mkdtempSync(join(tmpdir(),'uchirimo-integration-fixture-'));
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,obj)=>writeFileSync(p,JSON.stringify(obj,null,2)+'\n');
const raw=bytes=>createHash('sha256').update(bytes).digest('hex');
const run=(script,env={})=>execFileSync(process.execPath,[script],{env:{...process.env,...env},encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024});
const runner='scripts/governance/uchirimo-v11-recovery-controller-runner.mjs';
try{
 const planDir=join(root,'plan');mkdirSync(planDir);
 run('scripts/uchirimo-full-selector-proof.mjs',{UCHIRIMO_SELECTOR_MODE:'plan-all',UCHIRIMO_FULL_SELECTOR_OUT:planDir});
 const planPath=join(planDir,'all-partitions.json'),plan=read(planPath),head=plan.exact_head;
 assert.equal(plan.partitions.length,3956);
 const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
 const runtimeHash=runtime.sourcePackageIntegrity.actual;
 assert.equal(runtime.sourcePackageIntegrity.match,true);
 // Inspect every real canonical root and resolve every child, without executing selectors.
 let splitParents=0,splitChildren=0,unsplittable=0;
 const axisCounts={};
 for(const parent of plan.partitions){
   const id=recoveryUnitId(parent.partition_key),unit={parent_shard_index:parent.shard,parent_partition_key:parent.partition_key,recovery_unit_id:id,parent_recovery_unit_id:null,recovery_depth:0,decision_constraints:[],decision_constraints_sha256:sha256([]),state:'SPLIT_REQUIRED',execution_class:'HEAVY'};
   const units={[id]:unit},certificates={};
   const args={parent,unit,units,certificates,exactHead:head,runtimeManifestSha:runtimeHash,executionFingerprint:'SYNTHETIC_TEST_ONLY'};
   const result=await splitUnit(args);
   if(result.unit.state==='BLOCKED_UNSPLITTABLE'){unsplittable++;continue;}
   assert.equal(result.unit.state,'PENDING_CHILDREN');
   const cert=certificates[id];axisCounts[cert.split_field_key]=(axisCounts[cert.split_field_key]??0)+1;
   for(const child of cert.children){await resolveUnitSelection(parent,units[child.recovery_unit_id]);splitChildren++;}
   splitParents++;
   assert.equal((await splitUnit({...args,unit:{...unit,recovery_depth:MAX_RECOVERY_DEPTH},units:{},certificates:{}})).unit.state,'BLOCKED_RECOVERY_DEPTH');
 }
 console.log('REAL_RUNTIME_SPLIT_AUDIT='+JSON.stringify({parents:3956,splitParents,splitChildren,unsplittable,axisCounts,selector_execution_count:0}));
 const out=join(root,'controller'),carryDir=join(root,'carry'),evidence=join(root,'evidence'),plans=join(root,'plans');
 for(const dir of [out,carryDir,evidence,plans])mkdirSync(dir);
 const carryPath=join(carryDir,'manifest.json');
 write(carryPath,{status:'PASS',current_exact_head:head,current_shard_count:3956,reused_partition_keys:plan.partitions.slice(65).map(row=>row.partition_key),heavy_partition_keys:[plan.partitions[0].partition_key],runtime_manifest_sha256:runtimeHash,execution_dependency_fingerprint:'SYNTHETIC_TEST_ONLY'});
 const env={HEAD_SHA:head,UCHIRIMO_V12_PARENT_PLAN:planPath,UCHIRIMO_V12_CARRY_MANIFEST:carryPath,UCHIRIMO_V12_CONTROLLER_OUT:out,UCHIRIMO_V12_GENERATION:'0',UCHIRIMO_SELECTOR_PLAN_LANE_COUNT:'16',GITHUB_RUN_ID:'1',GITHUB_OUTPUT:''};
 run(runner,{...env,UCHIRIMO_V12_CONTROLLER_MODE:'init'});
 let units=read(join(out,'recovery-units.json')).units;const certs=read(join(out,'split-certificates.json')).certificates;
 const heavyRoot=recoveryUnitId(plan.partitions[0].partition_key);
 assert.equal(units[heavyRoot].state,'PENDING_CHILDREN');assert.ok(certs[heavyRoot]);
 const makeReport=(parent,unit)=>{
   const caseName=unit?recoveryEvidenceNames(unit).terminal_digests:'carry-'+parent.shard+'.jsonl';
   const bytes=Buffer.from('SYNTHETIC_TEST_ONLY\n');
   const seed={room_specification:parent.room_specification,window_type:parent.window_type,glass_family:parent.glass_family,...(parent.sash_configuration!=='__UNSET__'?{sash_configuration:parent.sash_configuration}:{}),...(parent.size_class!=='__UNSET__'?{size_class:parent.size_class}:{}),...JSON.parse(parent.partition_seed_json)};
   return {bytes,report:{status:'PASS',exact_head:head,shard_index:parent.shard,node_id:parent.node_id,partition_key:parent.partition_key,parent_partition_key:parent.partition_key,parent_shard_index:parent.shard,window_type:parent.window_type,glass_family:parent.glass_family,seed,partition_seed:JSON.parse(parent.partition_seed_json),unverified_discrete_selector_case_count:0,runtime_manifest_sha256:runtimeHash,runtime_integrity_match:true,case_artifact:caseName,case_artifact_sha256:raw(bytes),recovery_unit_id:unit?.recovery_unit_id,decision_constraints_sha256:unit?.decision_constraints_sha256,terminal_context_count:1,visited_state_count:1,transition_check_count:1,dependency_rejection_count:0,downstream_clear_event_count:0,resolver_cache_hits:0,resolver_cache_misses:0,flow_signature_sha256s:['SYNTHETIC_TEST_ONLY']}};
 };
 const ids=[];let generation=0,injectedTimeoutId=null;
 while(true){
   const waveIds=[];
   for(let lane=0;lane<16;lane++){
     run(runner,{...env,UCHIRIMO_V12_GENERATION:String(generation),UCHIRIMO_V12_CONTROLLER_MODE:'plan-lane',UCHIRIMO_SELECTOR_PLAN_LANE_INDEX:String(lane)});
     const lanePlan=read(join(out,'lane-'+lane+'-plan.json'));waveIds.push(...lanePlan.scheduled_recovery_unit_ids);write(join(plans,'lane-'+lane+'-plan.json'),lanePlan);
   }
   assert.ok(!waveIds.includes(heavyRoot));
   if(generation===0)injectedTimeoutId=waveIds.find(id=>units[id].recovery_depth>0);
   assert.ok(injectedTimeoutId);
   for(const id of waveIds){assert.ok(!ids.includes(id));if(generation===0&&id===injectedTimeoutId)continue;const unit=units[id],parent=plan.partitions[unit.parent_shard_index],{bytes,report}=makeReport(parent,unit);writeFileSync(join(evidence,report.case_artifact),bytes);write(join(evidence,unit.recovery_depth===0?'shard-'+parent.shard+'-report.json':recoveryEvidenceNames(unit).report),report);}
   write(join(evidence,'batch-fixture-report.json'),{exact_head:head,batch_id:'fixture',evidence_artifact_identity:'fixture-artifact',results:waveIds.map(id=>generation===0&&id===injectedTimeoutId?{status:'FAIL',timed_out:true,recovery_unit_id:id}:{status:'PASS',recovery_unit_id:id})});
   run(runner,{...env,UCHIRIMO_V12_GENERATION:String(generation),UCHIRIMO_V12_CONTROLLER_MODE:'advance',UCHIRIMO_V12_EXECUTION_INPUT:evidence,UCHIRIMO_V12_PLAN_SUMMARY_INPUT:plans});
   ids.push(...waveIds.filter(id=>!(generation===0&&id===injectedTimeoutId)));units=read(join(out,'recovery-units.json')).units;
   if(generation===0){assert.equal(units[injectedTimeoutId].compute_failed,true);assert.equal(units[injectedTimeoutId].state,'PENDING_CHILDREN');}
   const current=read(join(out,'controller-state.json'));
   if(current.next_action==='FINAL_AGGREGATE')break;
   assert.equal(current.next_action,'DISPATCH_NEXT_GENERATION');assert.ok(++generation<10);
   run(runner,{...env,UCHIRIMO_V12_GENERATION:String(generation),UCHIRIMO_V12_SOURCE_CONTROLLER_RUN_ID:'1',UCHIRIMO_V12_CONTROLLER_MODE:'resume-generation'});
   for(const id of ids)assert.equal(read(join(out,'recovery-units.json')).units[id].state,'PASS');
 }
 assert.ok(ids.length>certs[heavyRoot].children.length+64);assert.ok(!ids.includes(injectedTimeoutId));assert.ok(generation>0,'must verify actual multi-wave resume');
 const state=read(join(out,'controller-state.json')),after=read(join(out,'recovery-units.json')).units,parents=read(join(out,'parent-status.json')).parents;
 assert.equal(state.next_action,'FINAL_AGGREGATE');assert.equal(state.closed_parent_count,3956);
 assert.equal(parents[plan.partitions[0].partition_key].status,'RECOVERY_TREE_PASS');
 assert.equal(parents[plan.partitions[1].partition_key].status,'ROOT_PASS_FRESH');
 for(const id of ids)assert.equal(after[id].proof_report_sha256,raw(readFileSync(join(evidence,after[id].proof_report_file))));
 for(const parent of plan.partitions.slice(65)){const {bytes,report}=makeReport(parent);report.evidence_origin='CURRENT_HEAD_CARRY_FORWARD';report.source_exact_head=head;report.current_head_binding={status:'PASS',current_exact_head:head,source_exact_head:head,partition_key:parent.partition_key};writeFileSync(join(carryDir,report.case_artifact),bytes);write(join(carryDir,'shard-'+parent.shard+'-report.json'),report);}
 const sources=join(root,'sources');mkdirSync(sources);const {cpSync}=await import('node:fs');cpSync(evidence,join(sources,'fixture-artifact'),{recursive:true});
 const finalDir=join(root,'final');
 const finalEnv={...env,UCHIRIMO_V12_STATE:join(out,'controller-state.json'),UCHIRIMO_V12_UNITS:join(out,'recovery-units.json'),UCHIRIMO_V12_PARENT_STATUS:join(out,'parent-status.json'),UCHIRIMO_V12_CARRY_FORWARD_DIR:carryDir,UCHIRIMO_V12_LOCAL_EVIDENCE_ROOT:sources,UCHIRIMO_V12_FINALIZED_OUT:finalDir};
 run('scripts/governance/uchirimo-v11-recovery-finalizer.mjs',finalEnv);
 const manifest=read(join(finalDir,'v12-finalization-manifest.json'));
 assert.equal(manifest.report_count,3956);assert.equal(manifest.recovery_tree_parent_count,1);assert.equal(manifest.fresh_root_parent_count,64);assert.equal(manifest.carry_forward_parent_count,3891);
 run('scripts/uchirimo-full-selector-proof.mjs',{...env,UCHIRIMO_SELECTOR_MODE:'aggregate',UCHIRIMO_SELECTOR_SHARD_INPUT:finalDir,UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'3956',UCHIRIMO_FULL_SELECTOR_OUT:join(root,'aggregate')});
 assert.equal(read(join(root,'aggregate/report.json')).status,'PASS');
 // Corrupt one retained source byte. The same finalizer must now reject it.
 const victim=after[ids[0]].proof_report_file;writeFileSync(join(sources,'fixture-artifact',victim),readFileSync(join(sources,'fixture-artifact',victim),'utf8')+' ');
 assert.throws(()=>run('scripts/governance/uchirimo-v11-recovery-finalizer.mjs',finalEnv),/REPORT_SHA_MISMATCH/);
 console.log('UCHIRIMO_V12_SYNTHETIC_ORCHESTRATION_TEST=PASS init/plan/advance/synthesis/finalizer/aggregate; NOT_PRODUCT_QA_EVIDENCE');
}finally{rmSync(root,{recursive:true,force:true});}
