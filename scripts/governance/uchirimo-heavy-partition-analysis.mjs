import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const P='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const B='scripts/governance/uchirimo-selector-batch-runner.mjs';
const F='scripts/uchirimo-full-selector-proof.mjs';
const R='Takuro-Kwkm/sash-app';
const SR='36097199674';
const SH='44e8f1378b452a0556b0bd4ee619b552ffc2d4ff';
const SA=`uchirimo-heavy-recovery-analysis-${SH}`;
const SD='sha256:b4711f4f8e537f3302a442489d46319ad07865abf8e351129cc99ac20fbdfd4c';
const SB='e7ce2031fffdd1c0c22c95953b23c8b17ddd6de5';
const BB='65a57854ab7adf45fa0486b465530686d76cb09f';
const FB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const SPLIT='wall_surface_for_reinforcement_available';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const TIMEOUT=Number(process.env.UCHIRIMO_REMAINING38_WALL_SURFACE_CHILD_TIMEOUT_MS??60000);
const REPO=String(process.env.GITHUB_REPOSITORY??R);
const head=currentExactHead();
if(!Number.isFinite(TIMEOUT)||TIMEOUT<60000)throw new Error('REMAINING38_WALL_SURFACE_TIMEOUT_INVALID');
mkdirSync(OUT,{recursive:true});

const stable=v=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object')?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));
const sj=v=>JSON.stringify(stable(v));
const hash=v=>createHash('sha256').update(typeof v==='string'?v:sj(v)).digest('hex');
const rd=p=>JSON.parse(readFileSync(p,'utf8'));
const safe=p=>{try{return rd(p)}catch{return null}};
const meta=(run,name,dig)=>{const x=JSON.parse(execFileSync('gh',['api',`repos/${REPO}/actions/runs/${run}/artifacts?per_page=100`],{encoding:'utf8',timeout:120000,maxBuffer:16e6})).artifacts?.find(x=>x.name===name);if(!x||x.expired||x.digest!==dig)throw new Error('SOURCE_ARTIFACT_INVALID:'+run)};
const dl=(run,name,dir)=>{mkdirSync(dir,{recursive:true});execFileSync('gh',['run','download',run,'--repo',REPO,'--name',name,'--dir',dir],{stdio:'inherit',timeout:120000})};

function runChild(child,index){
  const s=child.selector_prefix??{};
  const base=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  const constraints=child.constraints;
  const row={
    shard:0,
    node_id:child.product_node,
    partition_key:`${child.child_id}|remaining38-wall-surface`,
    room_specification:String(s.room_specification),
    window_type:String(s.window_type),
    sash_configuration:s.sash_configuration==null?'__UNSET__':String(s.sash_configuration),
    size_class:s.size_class==null?'__UNSET__':String(s.size_class),
    glass_family:String(s.glass_family),
    partition_seed_json:sj(Object.fromEntries(Object.entries(s).filter(([k])=>!base.has(k)))),
    decision_constraints_json:sj(constraints),
    expected_hash:hash(constraints),
  };
  const id=`remaining38-wall-surface-${String(index).padStart(2,'0')}`;
  const dir=`${OUT}/remaining38-wall-surface/case-${String(index).padStart(2,'0')}`;
  mkdirSync(dir,{recursive:true});
  let execution_error=null;
  try{
    execFileSync(process.execPath,[B],{
      env:{...process.env,HEAD_SHA:head,UCHIRIMO_SELECTOR_BATCH_ID:id,UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([row]),UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(TIMEOUT),UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',UCHIRIMO_SELECTOR_MAX_STATES:'1000000',UCHIRIMO_SELECTOR_MAX_TERMINALS:'1000000',UCHIRIMO_RESOLVER_CACHE_MAX:'512',UCHIRIMO_FULL_SELECTOR_OUT:dir},
      encoding:'utf8',timeout:TIMEOUT+20000,maxBuffer:64e6,
    });
  }catch(e){execution_error={message:String(e?.message??e),code:e?.code??null,signal:e?.signal??null}}
  const batch=safe(`${dir}/batch-${id}-report.json`),report=safe(`${dir}/shard-0-report.json`),failure=safe(`${dir}/shard-0-failure.json`),start=safe(`${dir}/shard-0-constraint-start.json`),progress=safe(`${dir}/shard-0-constraint-progress.json`),digest=`${dir}/shard-0-terminal-digests.jsonl`;
  if(existsSync(digest))unlinkSync(digest);
  const br=batch?.results?.[0]??null,a=Date.parse(br?.started_at??''),b=Date.parse(br?.completed_at??''),elapsed=Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:null,msg=String(failure?.message??br?.error??''),timed=br?.timed_out===true;
  const startOk=start?.status==='PASS'&&start.exact_head===head&&start.runner==='UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_SHARD_V1'&&start.decision_constraints_sha256===row.expected_hash&&start.runtime_integrity_match===true;
  const progressOk=progress?.exact_head===head&&progress.decision_constraints_sha256===row.expected_hash&&Number(progress.visited_state_count??0)>0;
  const pass=batch?.status==='PASS'&&report?.status==='PASS'&&report?.exact_head===head&&report?.decision_constraints_sha256===row.expected_hash&&report?.runtime_integrity_match===true&&Number(report?.unverified_discrete_selector_case_count??1)===0;
  const outcome=pass?'COMPLETED':timed&&startOk&&progressOk?'TIMEOUT_CONSTRAINT_ACTIVE':/STATE_LIMIT/.test(msg)&&startOk?'STATE_LIMIT_REACHED':/TERMINAL_LIMIT/.test(msg)&&startOk?'TERMINAL_LIMIT_REACHED':'INVALID';
  const status=outcome==='COMPLETED'?'PASS':['TIMEOUT_CONSTRAINT_ACTIVE','STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(outcome)?'NEEDS_FURTHER_PARTITIONING':'EXECUTION_INVALID';
  return {parent_id:child.parent_id,child_id:child.child_id,source_child_id:child.source_child_id,lane_id:child.lane_id,product_node:child.product_node,split_field:child.split_field,split_decision:child.split_decision,split_decision_key:child.split_decision_key,constraints,outcome,status,elapsed_ms:elapsed,timed_out:timed,constraint_count:br?.constraint_count??null,constraint_start_valid:startOk,constraint_progress_valid:progressOk,visited_state_count:report?.visited_state_count??progress?.visited_state_count??null,terminal_context_count:report?.terminal_context_count??progress?.terminal_context_count??null,transition_check_count:report?.transition_check_count??progress?.transition_check_count??null,constraint_rejection_count:report?.constraint_rejection_count??progress?.constraint_rejection_count??null,failure_message:msg||null,execution_error};
}

execFileSync('git',['merge-base','--is-ancestor',SH,head],{stdio:'ignore'});
if(execFileSync('git',['rev-parse',`${SH}:${P}`],{encoding:'utf8'}).trim()!==SB)throw new Error('SOURCE_ANALYSIS_BLOB_MISMATCH');
const changed=execFileSync('git',['diff','--name-only',`${SH}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
if(sj(changed)!==sj([P]))throw new Error('NEXT_STAGE_SCOPE_INVALID:'+changed.join(','));
if(execFileSync('git',['rev-parse',`${head}:${B}`],{encoding:'utf8'}).trim()!==BB||execFileSync('git',['rev-parse',`${head}:${F}`],{encoding:'utf8'}).trim()!==FB)throw new Error('RUNNER_IDENTITY_CHANGED');
meta(SR,SA,SD);
const t=String(process.env.RUNNER_TEMP??'/tmp'),s=`${t}/uwall-surface-rem38-${SR}`;
dl(SR,SA,s);
for(const f of readdirSync(s).filter(x=>x.endsWith('.json'))){const d=rd(`${s}/${f}`);writeJson(`${OUT}/${f}`,{...d,exact_head:head,source_bound_exact_head:SH,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_EVIDENCE_NO_REEXECUTION'})}

const part=rd(`${s}/explicit-constraint-slow19-wood-wall-surface-partition-model-proof.json`);
const calibration=rd(`${s}/explicit-constraint-slow19-wood-wall-surface-representative-calibration.json`);
const decision=rd(`${s}/explicit-constraint-slow19-wood-wall-surface-representative-decision.json`);
if(part.status!=='PASS'||part.parent_count!==19||part.child_count!==57||part.split_field!==SPLIT||part.PARTITION_OVERLAP_COUNT!==0||part.PARTITION_GAP_COUNT!==0||part.coverage_preservation_status!=='PASS')throw new Error('WALL_SURFACE_PARTITION_MODEL_INVALID');
if(calibration.status!=='PASS'||calibration.representative_count!==19||calibration.representative_pass_count!==19||calibration.representative_nonempty_pass_count!==19||calibration.representative_empty_pass_count!==0||calibration.representative_needs_further_partitioning_count!==0||calibration.representative_invalid_count!==0||calibration.representative_execution_verified!==true||calibration.representative_fast_path_promising!==true)throw new Error('WALL_SURFACE_REPRESENTATIVE_CALIBRATION_INVALID');
if(decision.next_recovery_action!=='EXECUTE_REMAINING_38_WALL_SURFACE_CHILDREN_ONLY'||decision.representative_reexecution_authorized!==false||decision.remaining_38_execution_authorized!==true||decision.all_57_execution_authorized!==false||decision.slow19_wood_source_reexecution_authorized!==false)throw new Error('WALL_SURFACE_REPRESENTATIVE_DECISION_INVALID');
const rt=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!rt?.sourcePackageIntegrity?.match||rt.sourcePackageIntegrity.actual!==part.current_runtime_manifest_sha256||rt.sourcePackageIntegrity.actual!==calibration.current_runtime_manifest_sha256)throw new Error('RUNTIME_IDENTITY_CHANGED');

const repIds=new Set(calibration.representatives.map(x=>x.child_id));
if(repIds.size!==19||calibration.representatives.some(x=>x.status!=='PASS'||Number(x.terminal_context_count??0)<=0||x.split_decision?.value!=='no'))throw new Error('REPRESENTATIVE_SET_INVALID');
const remaining=part.children.filter(x=>!repIds.has(x.child_id));
if(remaining.length!==38||new Set(remaining.map(x=>x.parent_id)).size!==19||new Set(remaining.map(x=>x.child_id)).size!==38)throw new Error('REMAINING38_SET_INVALID');
if(remaining.some(x=>x.split_decision?.kind!=='VALUE'||!['yes','unknown'].includes(x.split_decision?.value)))throw new Error('REMAINING38_DECISION_INVALID');
if(new Set([...repIds,...remaining.map(x=>x.child_id)]).size!==57)throw new Error('FULL57_IDENTITY_INVALID');
for(const x of remaining){if(!Array.isArray(x.constraints)||x.constraints.length!==5||x.constraints[0]?.field_key!=='frame_installation_mode'||x.constraints[1]?.field_key!=='extension_frame_type'||x.constraints[1]?.decision?.value!=='fukashi_60'||x.constraints[2]?.field_key!=='extension_frame_reinforcement'||x.constraints[2]?.decision?.value!=='reinforcement_bracket'||x.constraints[3]?.field_key!=='construction'||x.constraints[3]?.decision?.value!=='wood'||x.constraints[4]?.field_key!==SPLIT||!['yes','unknown'].includes(x.constraints[4]?.decision?.value))throw new Error('REMAINING38_CONSTRAINT_INVALID:'+x.child_id)}

const results=[];
for(const [i,x] of remaining.entries()){
  const z=runChild(x,i);results.push(z);
  console.log(`REMAINING38_WALL_SURFACE index=${i} parent=${x.parent_id} lane=${x.lane_id} decision=${x.split_decision_key} status=${z.status} states=${z.visited_state_count??null} terminals=${z.terminal_context_count??null}`);
}
const pass=results.filter(x=>x.status==='PASS'),slow=results.filter(x=>x.status==='NEEDS_FURTHER_PARTITIONING'),invalid=results.filter(x=>x.status==='EXECUTION_INVALID'),empty=pass.filter(x=>Number(x.terminal_context_count??0)===0),nonempty=pass.filter(x=>Number(x.terminal_context_count??0)>0);
const verified=invalid.length===0&&results.length===38&&results.every(x=>x.constraint_start_valid===true&&x.constraint_count===5&&(x.status==='PASS'||x.constraint_progress_valid===true));
const complete57=verified&&pass.length===38&&nonempty.length===38&&empty.length===0&&slow.length===0;
const covered=19+pass.length,unresolved=slow.length+invalid.length;
const slowValues=[...new Set(slow.map(x=>x.split_decision?.value))].sort();
const next=!verified||invalid.length?'REMAINING_38_WALL_SURFACE_EXECUTION_BLOCKED':slow.length?'PARTITION_ONLY_SLOW_REMAINING_WALL_SURFACE_CHILDREN':'WALL_SURFACE_57_EXECUTION_CLOSURE_READY';

writeJson(`${OUT}/explicit-constraint-remaining38-wall-surface-execution.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_REMAINING38_WALL_SURFACE_EXECUTION',exact_head:head,source_exact_head:SH,source_run_id:Number(SR),source_artifact_name:SA,source_artifact_digest:SD,current_runtime_manifest_sha256:rt.sourcePackageIntegrity.actual,partition_parent_count:19,partition_child_count:57,representative_closed_child_count:19,representative_children_reexecuted:false,expected_execution_child_count:38,executed_child_count:results.length,pass_count:pass.length,nonempty_pass_count:nonempty.length,empty_pass_count:empty.length,needs_further_partitioning_count:slow.length,execution_invalid_count:invalid.length,remaining38_execution_verified:verified,covered_wall_surface_child_count:covered,unresolved_wall_surface_child_count:unresolved,slow_split_values:slowValues,all_57_wall_surface_children_covered:complete57,child_timeout_ms:TIMEOUT,results,status:invalid.length||!verified?'BLOCKED':complete57?'PASS':'MEASURED_PARTIAL'});
writeJson(`${OUT}/explicit-constraint-remaining38-wall-surface-decision.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_REMAINING38_WALL_SURFACE_DECISION',exact_head:head,representative_closed_child_count:19,representative_children_reexecuted:false,executed_child_count:results.length,pass_count:pass.length,nonempty_pass_count:nonempty.length,empty_pass_count:empty.length,needs_further_partitioning_count:slow.length,execution_invalid_count:invalid.length,covered_wall_surface_child_count:covered,unresolved_wall_surface_child_count:unresolved,slow_split_values:slowValues,all_57_wall_surface_children_covered:complete57,next_recovery_action:next,remaining_38_reexecution_authorized:false,representative_reexecution_authorized:false,full_57_reexecution_authorized:false,slow19_wood_source_reexecution_authorized:false,full_constraint_execution_authorized:false,full_coverage_authorized:false,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_EXECUTE_REMAINING_38_WALL_SURFACE_CHILDREN_ONLY',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:invalid.length||!verified?'BLOCKED':complete57?'DIAGNOSTIC_COMPLETE':'PARTIAL_CLOSURE'});
console.log(`REMAINING38_WALL_SURFACE_PASS_COUNT=${pass.length}/38`);
console.log(`REMAINING38_WALL_SURFACE_NONEMPTY_PASS_COUNT=${nonempty.length}`);
console.log(`REMAINING38_WALL_SURFACE_EMPTY_PASS_COUNT=${empty.length}`);
console.log(`REMAINING38_WALL_SURFACE_NEEDS_FURTHER_PARTITIONING_COUNT=${slow.length}`);
console.log(`REMAINING38_WALL_SURFACE_EXECUTION_INVALID_COUNT=${invalid.length}`);
console.log(`REMAINING38_WALL_SURFACE_SLOW_SPLIT_VALUES=${slowValues.join(',')||'NONE'}`);
console.log(`ALL_57_WALL_SURFACE_CHILDREN_COVERED=${complete57?'TRUE':'FALSE'}`);
console.log(`NEXT_RECOVERY_ACTION=${next}`);
console.log('REPRESENTATIVE_CHILDREN_REEXECUTED=FALSE');
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(invalid.length||!verified)throw new Error('REMAINING38_WALL_SURFACE_EXECUTION_INVALID');
