import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const P='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const B='scripts/governance/uchirimo-selector-batch-runner.mjs';
const F='scripts/uchirimo-full-selector-proof.mjs';
const R='Takuro-Kwkm/sash-app';
const SR='36086845251';
const SH='037684aae6a400672b5f1c2e8764cdd6ef45c0f5';
const SA=`uchirimo-heavy-recovery-analysis-${SH}`;
const SD='sha256:0fc468431b6999def3f4959d7638191684613a95333bdc39c913b99ee25b0de2';
const SB='659994ba2c2caad9482894229cb1fcec26fc5b91';
const BB='65a57854ab7adf45fa0486b465530686d76cb09f';
const FB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const TIMEOUT=Number(process.env.UCHIRIMO_CONSTRUCTION_REPRESENTATIVE_CHILD_TIMEOUT_MS??60000);
const REPO=String(process.env.GITHUB_REPOSITORY??R);
const head=currentExactHead();
if(!Number.isFinite(TIMEOUT)||TIMEOUT<60000)throw new Error('CONSTRUCTION_REPRESENTATIVE_TIMEOUT_INVALID');
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
    partition_key:`${child.child_id}|construction-representative-rc`,
    room_specification:String(s.room_specification),
    window_type:String(s.window_type),
    sash_configuration:s.sash_configuration==null?'__UNSET__':String(s.sash_configuration),
    size_class:s.size_class==null?'__UNSET__':String(s.size_class),
    glass_family:String(s.glass_family),
    partition_seed_json:sj(Object.fromEntries(Object.entries(s).filter(([k])=>!base.has(k)))),
    decision_constraints_json:sj(constraints),
    expected_hash:hash(constraints),
  };
  const id=`construction-rep-rc-${String(index).padStart(2,'0')}`;
  const dir=`${OUT}/construction-representative-rc/case-${String(index).padStart(2,'0')}`;
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
const t=String(process.env.RUNNER_TEMP??'/tmp'),s=`${t}/uconstruct-rep-${SR}`;
dl(SR,SA,s);
for(const f of readdirSync(s).filter(x=>x.endsWith('.json'))){const d=rd(`${s}/${f}`);writeJson(`${OUT}/${f}`,{...d,exact_head:head,source_bound_exact_head:SH,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_EVIDENCE_NO_REEXECUTION'})}

const part=rd(`${s}/explicit-constraint-slow19-bracket-construction-partition-model-proof.json`);
const decision=rd(`${s}/explicit-constraint-slow19-bracket-construction-partition-decision.json`);
if(part.status!=='PASS'||part.parent_count!==19||part.child_count!==57||part.split_field!=='construction'||part.PARTITION_OVERLAP_COUNT!==0||part.PARTITION_GAP_COUNT!==0||part.coverage_preservation_status!=='PASS'||part.execution_performed!==false)throw new Error('CONSTRUCTION_PARTITION_MODEL_INVALID');
if(decision.next_recovery_action!=='CALIBRATE_REPRESENTATIVE_CONSTRUCTION_CHILDREN_FOR_19_SLOW_BRACKET_PARENTS'||decision.representative_execution_authorized!==true||decision.all_children_execution_authorized!==false||decision.slow19_source_reexecution_authorized!==false||decision.full_constraint_execution_authorized!==false)throw new Error('CONSTRUCTION_PARTITION_DECISION_INVALID');
const rt=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!rt?.sourcePackageIntegrity?.match||rt.sourcePackageIntegrity.actual!==part.current_runtime_manifest_sha256)throw new Error('RUNTIME_IDENTITY_CHANGED');

const representatives=part.children.filter(x=>x.split_decision?.kind==='VALUE'&&x.split_decision?.value==='rc');
if(representatives.length!==19||new Set(representatives.map(x=>x.parent_id)).size!==19||new Set(representatives.map(x=>x.child_id)).size!==19)throw new Error('CONSTRUCTION_REPRESENTATIVE_SET_INVALID');
if(representatives.some(x=>!Array.isArray(x.constraints)||x.constraints.length!==4||x.constraints[0]?.field_key!=='frame_installation_mode'||x.constraints[1]?.field_key!=='extension_frame_type'||x.constraints[1]?.decision?.value!=='fukashi_60'||x.constraints[2]?.field_key!=='extension_frame_reinforcement'||x.constraints[2]?.decision?.value!=='reinforcement_bracket'||x.constraints[3]?.field_key!=='construction'||x.constraints[3]?.decision?.value!=='rc'))throw new Error('CONSTRUCTION_REPRESENTATIVE_CONSTRAINT_INVALID');

const results=[];
for(const [i,x] of representatives.entries()){
  const z=runChild(x,i);results.push(z);
  console.log(`CONSTRUCTION_REPRESENTATIVE index=${i} parent=${x.parent_id} lane=${x.lane_id} decision=${x.split_decision_key} status=${z.status} states=${z.visited_state_count??null} terminals=${z.terminal_context_count??null}`);
}
const pass=results.filter(x=>x.status==='PASS'),slow=results.filter(x=>x.status==='NEEDS_FURTHER_PARTITIONING'),invalid=results.filter(x=>x.status==='EXECUTION_INVALID'),empty=pass.filter(x=>Number(x.terminal_context_count??0)===0),nonempty=pass.filter(x=>Number(x.terminal_context_count??0)>0);
const verified=invalid.length===0&&results.length===19&&results.every(x=>x.constraint_start_valid===true&&x.constraint_count===4&&(x.status==='PASS'||x.constraint_progress_valid===true));
const fast=verified&&pass.length===19&&nonempty.length===19&&empty.length===0&&slow.length===0;
const next=!verified||invalid.length?'REPRESENTATIVE_CONSTRUCTION_CALIBRATION_BLOCKED':fast?'EXECUTE_REMAINING_38_CONSTRUCTION_CHILDREN_ONLY':'RECALIBRATE_OR_PARTITION_ONLY_SLOW_REPRESENTATIVE_CONSTRUCTION_CHILDREN';
writeJson(`${OUT}/explicit-constraint-slow19-bracket-construction-representative-calibration.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_SLOW19_REINFORCEMENT_BRACKET_CONSTRUCTION_REPRESENTATIVE_CALIBRATION',exact_head:head,source_exact_head:SH,source_run_id:Number(SR),source_artifact_name:SA,source_artifact_digest:SD,current_runtime_manifest_sha256:rt.sourcePackageIntegrity.actual,partition_parent_count:19,partition_child_count:57,representative_decision:{kind:'VALUE',value:'rc'},representative_selection_basis:{historical_basis:'Prior Depth4 partial evidence observed rc and unknown PASS while wood was slow; used only to choose rc for current calibration.',historical_evidence_reused_as_current_pass_evidence:false,current_19_parent_measurement_required:true},representative_count:results.length,representative_pass_count:pass.length,representative_nonempty_pass_count:nonempty.length,representative_empty_pass_count:empty.length,representative_needs_further_partitioning_count:slow.length,representative_invalid_count:invalid.length,representative_execution_verified:verified,representative_fast_path_promising:fast,child_timeout_ms:TIMEOUT,representatives:results,status:!verified?'BLOCKED':fast?'PASS':'MEASURED_PARTIAL'});
writeJson(`${OUT}/explicit-constraint-slow19-bracket-construction-representative-decision.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_SLOW19_REINFORCEMENT_BRACKET_CONSTRUCTION_REPRESENTATIVE_DECISION',exact_head:head,partition_parent_count:19,partition_child_count:57,representative_decision:{kind:'VALUE',value:'rc'},representative_count:results.length,representative_pass_count:pass.length,representative_nonempty_pass_count:nonempty.length,representative_empty_pass_count:empty.length,representative_needs_further_partitioning_count:slow.length,representative_invalid_count:invalid.length,representative_execution_verified:verified,representative_fast_path_promising:fast,representative_reexecution_authorized:false,remaining_38_execution_authorized:fast,all_57_execution_authorized:false,slow19_source_reexecution_authorized:false,full_constraint_execution_authorized:false,full_coverage_authorized:false,next_recovery_action:next,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_CALIBRATE_REPRESENTATIVE_CONSTRUCTION_CHILDREN_FOR_19_SLOW_REINFORCEMENT_BRACKET_PARENTS',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:!verified?'BLOCKED':fast?'DIAGNOSTIC_COMPLETE':'PARTIAL_CLOSURE'});
console.log(`CONSTRUCTION_REPRESENTATIVE_PASS_COUNT=${pass.length}/19`);
console.log(`CONSTRUCTION_REPRESENTATIVE_NONEMPTY_PASS_COUNT=${nonempty.length}`);
console.log(`CONSTRUCTION_REPRESENTATIVE_EMPTY_PASS_COUNT=${empty.length}`);
console.log(`CONSTRUCTION_REPRESENTATIVE_NEEDS_FURTHER_PARTITIONING_COUNT=${slow.length}`);
console.log(`CONSTRUCTION_REPRESENTATIVE_INVALID_COUNT=${invalid.length}`);
console.log(`CONSTRUCTION_REPRESENTATIVE_FAST_PATH_PROMISING=${fast?'TRUE':'FALSE'}`);
console.log(`NEXT_RECOVERY_ACTION=${next}`);
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(invalid.length||!verified)throw new Error('CONSTRUCTION_REPRESENTATIVE_CALIBRATION_INVALID');
