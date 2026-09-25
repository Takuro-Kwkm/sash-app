import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const P='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const B='scripts/governance/uchirimo-selector-batch-runner.mjs';
const F='scripts/uchirimo-full-selector-proof.mjs';
const R='Takuro-Kwkm/sash-app';
const SR='36076441589';
const SH='3dd3eccd56bcf3bf346f6db4f96051d3a723b321';
const SA=`uchirimo-heavy-recovery-analysis-${SH}`;
const SD='sha256:54db7e1f526b0b0e578fcc4bf7b5c23d1294ea515e1841a11b0300e17226f5ae';
const SB='ad2b894c223b7501c6221ba1822ad062a9203959';
const MR='35982709102';
const MH='fa426d588ce41343d462472882f791616fd29fe1';
const MA=`uchirimo-heavy-recovery-analysis-${MH}`;
const MD='sha256:b1a50e0ca2438cbfb3642b4c7d59d5d4ca025d0ed51463b5519c769e15fbf89a';
const BB='65a57854ab7adf45fa0486b465530686d76cb09f';
const FB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const TIMEOUT=Number(process.env.UCHIRIMO_REMAINING76_CHILD_TIMEOUT_MS??60000);
const repo=String(process.env.GITHUB_REPOSITORY??R);
const head=currentExactHead();
if(!Number.isFinite(TIMEOUT)||TIMEOUT<60000) throw new Error('REMAINING76_TIMEOUT_INVALID');
mkdirSync(OUT,{recursive:true});

const stable=v=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object')?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));
const sj=v=>JSON.stringify(stable(v));
const hash=v=>createHash('sha256').update(typeof v==='string'?v:sj(v)).digest('hex');
const rd=p=>JSON.parse(readFileSync(p,'utf8'));
const safe=p=>{try{return rd(p)}catch{return null}};
const meta=(run,name,dig)=>{const x=JSON.parse(execFileSync('gh',['api',`repos/${repo}/actions/runs/${run}/artifacts?per_page=100`],{encoding:'utf8',timeout:120000,maxBuffer:16e6})).artifacts?.find(x=>x.name===name);if(!x||x.expired||x.digest!==dig)throw new Error('SOURCE_ARTIFACT_INVALID:'+run)};
const dl=(run,name,dir)=>{mkdirSync(dir,{recursive:true});execFileSync('gh',['run','download',run,'--repo',repo,'--name',name,'--dir',dir],{stdio:'inherit',timeout:120000})};

function runChild(child,lane,index){
  const s=lane.selector_prefix??{};
  const base=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  const constraints=child.constraints;
  const row={
    shard:0,
    node_id:child.product_node,
    partition_key:`${child.child_id}|remaining76`,
    room_specification:String(s.room_specification),
    window_type:String(s.window_type),
    sash_configuration:s.sash_configuration==null?'__UNSET__':String(s.sash_configuration),
    size_class:s.size_class==null?'__UNSET__':String(s.size_class),
    glass_family:String(s.glass_family),
    partition_seed_json:sj(Object.fromEntries(Object.entries(s).filter(([k])=>!base.has(k)))),
    decision_constraints_json:sj(constraints),
    expected_hash:hash(constraints),
  };
  const id=`rem76-${String(index).padStart(2,'0')}`;
  const dir=`${OUT}/remaining76/case-${String(index).padStart(2,'0')}`;
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
  return {parent_id:child.parent_id,child_id:child.child_id,lane_id:child.lane_id,product_node:child.product_node,parent_decision_key:child.parent_decision_key,split_decision:child.split_decision,split_decision_key:child.split_decision_key,constraints,outcome,status,elapsed_ms:elapsed,timed_out:timed,constraint_count:br?.constraint_count??null,constraint_start_valid:startOk,constraint_progress_valid:progressOk,visited_state_count:report?.visited_state_count??progress?.visited_state_count??null,terminal_context_count:report?.terminal_context_count??progress?.terminal_context_count??null,transition_check_count:report?.transition_check_count??progress?.transition_check_count??null,constraint_rejection_count:report?.constraint_rejection_count??progress?.constraint_rejection_count??null,failure_message:msg||null,execution_error};
}

execFileSync('git',['merge-base','--is-ancestor',SH,head],{stdio:'ignore'});
if(execFileSync('git',['rev-parse',`${SH}:${P}`],{encoding:'utf8'}).trim()!==SB)throw new Error('SOURCE_ANALYSIS_BLOB_MISMATCH');
const changed=execFileSync('git',['diff','--name-only',`${SH}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
if(sj(changed)!==sj([P]))throw new Error('NEXT_STAGE_SCOPE_INVALID:'+changed.join(','));
if(execFileSync('git',['rev-parse',`${head}:${B}`],{encoding:'utf8'}).trim()!==BB||execFileSync('git',['rev-parse',`${head}:${F}`],{encoding:'utf8'}).trim()!==FB)throw new Error('RUNNER_IDENTITY_CHANGED');
meta(SR,SA,SD);meta(MR,MA,MD);
const t=String(process.env.RUNNER_TEMP??'/tmp'),s=`${t}/u76-${SR}`,m=`${t}/u76-model-${MR}`;
dl(SR,SA,s);dl(MR,MA,m);
for(const f of readdirSync(s).filter(x=>x.endsWith('.json'))){const d=rd(`${s}/${f}`);writeJson(`${OUT}/${f}`,{...d,exact_head:head,source_bound_exact_head:SH,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_EVIDENCE_NO_REEXECUTION'})}

const part=rd(`${s}/explicit-constraint-remaining19-extension-frame-partition-model-proof.json`);
const calibration=rd(`${s}/explicit-constraint-remaining19-extension-frame-representative-calibration.json`);
const decision=rd(`${s}/explicit-constraint-remaining19-extension-frame-representative-decision.json`);
const model=rd(`${m}/explicit-decision-constraint-partition-model-proof.json`);
if(part.status!=='PASS'||part.parent_count!==19||part.child_count!==95||part.split_field!=='extension_frame_type'||part.partition_overlap_count!==0||part.partition_gap_count!==0||part.coverage_preservation_status!=='PASS')throw new Error('PARTITION_MODEL_INVALID');
if(calibration.status!=='PASS'||calibration.representative_count!==19||calibration.representative_pass_count!==19||calibration.representative_nonempty_pass_count!==19||calibration.representative_empty_pass_count!==0||calibration.representative_needs_further_partitioning_count!==0||calibration.representative_invalid_count!==0||calibration.representative_execution_verified!==true||calibration.representative_fast_path_promising!==true)throw new Error('REPRESENTATIVE_CALIBRATION_INVALID');
if(decision.next_recovery_action!=='EXECUTE_REMAINING_76_EXTENSION_FRAME_CHILDREN_ONLY'||decision.representative_reexecution_authorized!==false||decision.remaining_76_execution_authorized!==true)throw new Error('REPRESENTATIVE_DECISION_INVALID');
const rt=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!rt?.sourcePackageIntegrity?.match||rt.sourcePackageIntegrity.actual!==part.current_runtime_manifest_sha256)throw new Error('RUNTIME_IDENTITY_CHANGED');
const laneById=new Map(model.lanes.map(x=>[x.lane_id,x]));
const repIds=new Set(calibration.representatives.map(x=>x.child_id));
if(repIds.size!==19||calibration.representatives.some(x=>x.status!=='PASS'||Number(x.terminal_context_count??0)<=0))throw new Error('REPRESENTATIVE_SET_INVALID');
const remaining=part.children.filter(x=>!repIds.has(x.child_id));
if(remaining.length!==76||remaining.some(x=>x.split_decision?.kind==='UNSET')||new Set(remaining.map(x=>x.child_id)).size!==76)throw new Error('REMAINING76_SET_INVALID');
if(new Set([...repIds,...remaining.map(x=>x.child_id)]).size!==95)throw new Error('FULL95_IDENTITY_INVALID');
for(const x of remaining){const lane=laneById.get(x.lane_id);if(!lane||lane.product_node!==x.product_node)throw new Error('REMAINING76_LANE_IDENTITY_INVALID:'+x.child_id);if(!Array.isArray(x.constraints)||x.constraints.length!==2||x.constraints[0]?.field_key!=='frame_installation_mode'||x.constraints[1]?.field_key!=='extension_frame_type')throw new Error('REMAINING76_CONSTRAINT_INVALID:'+x.child_id)}

const results=[];
for(const [i,x] of remaining.entries()){
  const z=runChild(x,laneById.get(x.lane_id),i);results.push(z);
  console.log(`REMAINING76 index=${i} parent=${x.parent_id} lane=${x.lane_id} ext=${x.split_decision_key} status=${z.status} states=${z.visited_state_count??null} terminals=${z.terminal_context_count??null}`);
}
const pass=results.filter(x=>x.status==='PASS'),slow=results.filter(x=>x.status==='NEEDS_FURTHER_PARTITIONING'),invalid=results.filter(x=>x.status==='EXECUTION_INVALID'),empty=pass.filter(x=>Number(x.terminal_context_count??0)===0),nonempty=pass.filter(x=>Number(x.terminal_context_count??0)>0);
const verified=invalid.length===0&&results.length===76&&results.every(x=>x.constraint_start_valid===true&&x.constraint_count===2&&(x.status==='PASS'||x.constraint_progress_valid===true));
const complete95=verified&&pass.length===76&&slow.length===0;
const next=!verified||invalid.length?'REMAINING_76_EXTENSION_EXECUTION_BLOCKED':slow.length?'PARTITION_ONLY_SLOW_REMAINING_EXTENSION_FRAME_CHILDREN':'EXPLICIT_CONSTRAINT_95_EXTENSION_FRAME_EXECUTION_CLOSURE_READY';
writeJson(`${OUT}/explicit-constraint-remaining76-extension-frame-execution.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_REMAINING76_EXTENSION_FRAME_EXECUTION',exact_head:head,source_exact_head:SH,source_run_id:Number(SR),source_artifact_name:SA,source_artifact_digest:SD,current_runtime_manifest_sha256:rt.sourcePackageIntegrity.actual,partition_parent_count:19,partition_child_count:95,representative_closed_child_count:19,representative_children_reexecuted:false,expected_execution_child_count:76,executed_child_count:results.length,pass_count:pass.length,nonempty_pass_count:nonempty.length,empty_pass_count:empty.length,needs_further_partitioning_count:slow.length,execution_invalid_count:invalid.length,remaining76_execution_verified:verified,covered_extension_child_count:19+pass.length,unresolved_extension_child_count:slow.length+invalid.length,all_95_extension_children_covered:complete95,child_timeout_ms:TIMEOUT,results,status:invalid.length||!verified?'BLOCKED':complete95?'PASS':'MEASURED_PARTIAL'});
writeJson(`${OUT}/explicit-constraint-remaining76-extension-frame-decision.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_REMAINING76_EXTENSION_FRAME_DECISION',exact_head:head,representative_closed_child_count:19,representative_children_reexecuted:false,executed_child_count:results.length,pass_count:pass.length,nonempty_pass_count:nonempty.length,empty_pass_count:empty.length,needs_further_partitioning_count:slow.length,execution_invalid_count:invalid.length,covered_extension_child_count:19+pass.length,unresolved_extension_child_count:slow.length+invalid.length,all_95_extension_children_covered:complete95,next_recovery_action:next,remaining_76_reexecution_authorized:false,full_constraint_execution_authorized:false,full_coverage_authorized:false,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_EXECUTE_REMAINING_76_EXTENSION_FRAME_CHILDREN_ONLY',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:invalid.length||!verified?'BLOCKED':complete95?'DIAGNOSTIC_COMPLETE':'PARTIAL_CLOSURE'});
console.log(`REMAINING76_PASS_COUNT=${pass.length}/76`);
console.log(`REMAINING76_NONEMPTY_PASS_COUNT=${nonempty.length}`);
console.log(`REMAINING76_EMPTY_PASS_COUNT=${empty.length}`);
console.log(`REMAINING76_NEEDS_FURTHER_PARTITIONING_COUNT=${slow.length}`);
console.log(`REMAINING76_EXECUTION_INVALID_COUNT=${invalid.length}`);
console.log(`ALL_95_EXTENSION_CHILDREN_COVERED=${complete95?'TRUE':'FALSE'}`);
console.log(`NEXT_RECOVERY_ACTION=${next}`);
console.log('REPRESENTATIVE_CHILDREN_REEXECUTED=FALSE');
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(invalid.length||!verified)throw new Error('REMAINING76_EXTENSION_EXECUTION_INVALID');
