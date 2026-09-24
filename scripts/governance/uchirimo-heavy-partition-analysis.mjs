import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PID='SER-YKKAP-UCHIRIMO';
const P='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const B='scripts/governance/uchirimo-selector-batch-runner.mjs';
const F='scripts/uchirimo-full-selector-proof.mjs';
const R='Takuro-Kwkm/sash-app';
const SR='36070242614';
const SH='277400153b8c1e06d482d2a9a944a261873810ed';
const SA=`uchirimo-heavy-recovery-analysis-${SH}`;
const SD='sha256:37b764b4d7cba9c677e49fdba24fba2347eaec634efe311a96c77401192fbb1c';
const SB='a1264b2f6706f53eeee3a447b54f21d9fbfed8da';
const MR='35982709102';
const MH='fa426d588ce41343d462472882f791616fd29fe1';
const MA=`uchirimo-heavy-recovery-analysis-${MH}`;
const MD='sha256:b1a50e0ca2438cbfb3642b4c7d59d5d4ca025d0ed51463b5519c769e15fbf89a';
const BB='65a57854ab7adf45fa0486b465530686d76cb09f';
const FB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const TIMEOUT=Number(process.env.UCHIRIMO_REMAINING19_CHILD_TIMEOUT_MS??60000);
const REPO=String(process.env.GITHUB_REPOSITORY??R);
const head=currentExactHead();
if(!Number.isFinite(TIMEOUT)||TIMEOUT<60000)throw new Error('REMAINING19_TIMEOUT_INVALID');
mkdirSync(OUT,{recursive:true});

const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object')?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));
const sj=(v)=>JSON.stringify(stable(v));
const hash=(v)=>createHash('sha256').update(typeof v==='string'?v:sj(v)).digest('hex');
const rd=(p)=>JSON.parse(readFileSync(p,'utf8'));
const safeRead=(p)=>{try{return rd(p)}catch{return null}};
const dkey=(d)=>d.kind==='UNSET'?'UNSET':`VALUE:${sj(d.value)}`;
const meta=(run,name,digest)=>{const x=JSON.parse(execFileSync('gh',['api',`repos/${REPO}/actions/runs/${run}/artifacts?per_page=100`],{encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024})).artifacts?.find(x=>x.name===name);if(!x||x.expired||x.digest!==digest)throw new Error('SOURCE_ARTIFACT_INVALID:'+run);};
const dl=(run,name,dir)=>{mkdirSync(dir,{recursive:true});execFileSync('gh',['run','download',run,'--repo',REPO,'--name',name,'--dir',dir],{stdio:'inherit',timeout:120000});};

function rowFor(item,lane,index){
  const s=lane.selector_prefix??{};
  const base=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  const constraints=[{field_key:item.selected_constraint_field,decision:item.decision}];
  return {row:{shard:0,node_id:item.product_node,partition_key:`${item.lane_id}|remaining19-${String(index).padStart(2,'0')}|${item.decision_key}`,room_specification:String(s.room_specification),window_type:String(s.window_type),sash_configuration:s.sash_configuration==null?'__UNSET__':String(s.sash_configuration),size_class:s.size_class==null?'__UNSET__':String(s.size_class),glass_family:String(s.glass_family),partition_seed_json:sj(Object.fromEntries(Object.entries(s).filter(([k])=>!base.has(k)))),decision_constraints_json:sj(constraints),expected_hash:hash(constraints)},constraints};
}

function executeBranch(item,lane,index){
  const {row,constraints}=rowFor(item,lane,index);
  const id=`remaining19-${String(index).padStart(2,'0')}`;
  const dir=`${OUT}/remaining19/case-${String(index).padStart(2,'0')}`;
  mkdirSync(dir,{recursive:true});
  let executionError=null;
  try{execFileSync(process.execPath,[B],{env:{...process.env,HEAD_SHA:head,UCHIRIMO_SELECTOR_BATCH_ID:id,UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([row]),UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(TIMEOUT),UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',UCHIRIMO_SELECTOR_MAX_STATES:'1000000',UCHIRIMO_SELECTOR_MAX_TERMINALS:'1000000',UCHIRIMO_RESOLVER_CACHE_MAX:'512',UCHIRIMO_FULL_SELECTOR_OUT:dir},encoding:'utf8',timeout:TIMEOUT+20000,maxBuffer:64*1024*1024});}catch(error){executionError={message:String(error?.message??error),code:error?.code??null,signal:error?.signal??null};}
  const batch=safeRead(`${dir}/batch-${id}-report.json`),report=safeRead(`${dir}/shard-0-report.json`),failure=safeRead(`${dir}/shard-0-failure.json`),start=safeRead(`${dir}/shard-0-constraint-start.json`),progress=safeRead(`${dir}/shard-0-constraint-progress.json`),digest=`${dir}/shard-0-terminal-digests.jsonl`;
  if(existsSync(digest))unlinkSync(digest);
  const br=batch?.results?.[0]??null,a=Date.parse(br?.started_at??''),b=Date.parse(br?.completed_at??''),elapsed=Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:null,message=String(failure?.message??br?.error??''),timedOut=br?.timed_out===true;
  const startOk=start?.status==='PASS'&&start.exact_head===head&&start.runner==='UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_SHARD_V1'&&start.decision_constraints_sha256===row.expected_hash&&start.runtime_integrity_match===true;
  const progressOk=progress?.exact_head===head&&progress.decision_constraints_sha256===row.expected_hash&&Number(progress.visited_state_count??0)>0;
  const pass=batch?.status==='PASS'&&report?.status==='PASS'&&report?.exact_head===head&&report?.decision_constraints_sha256===row.expected_hash&&report?.runtime_integrity_match===true&&Number(report?.unverified_discrete_selector_case_count??1)===0;
  const outcome=pass?'COMPLETED':timedOut&&startOk&&progressOk?'TIMEOUT_CONSTRAINT_ACTIVE':/STATE_LIMIT/.test(message)&&startOk?'STATE_LIMIT_REACHED':/TERMINAL_LIMIT/.test(message)&&startOk?'TERMINAL_LIMIT_REACHED':'INVALID';
  const status=outcome==='COMPLETED'?'PASS':['TIMEOUT_CONSTRAINT_ACTIVE','STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(outcome)?'NEEDS_FURTHER_PARTITIONING':'EXECUTION_INVALID';
  return {lane_id:item.lane_id,product_node:item.product_node,selected_constraint_field:item.selected_constraint_field,decision:item.decision,decision_key:item.decision_key,selection_fingerprint:item.selection_fingerprint,constraints,outcome,status,elapsed_ms:elapsed,timed_out:timedOut,constraint_count:br?.constraint_count??null,constraint_start_valid:startOk,constraint_progress_valid:progressOk,visited_state_count:report?.visited_state_count??progress?.visited_state_count??null,terminal_context_count:report?.terminal_context_count??progress?.terminal_context_count??null,transition_check_count:report?.transition_check_count??progress?.transition_check_count??null,constraint_rejection_count:report?.constraint_rejection_count??progress?.constraint_rejection_count??null,failure_message:message||null,execution_error:executionError};
}

execFileSync('git',['merge-base','--is-ancestor',SH,head],{stdio:'ignore'});
if(execFileSync('git',['rev-parse',`${SH}:${P}`],{encoding:'utf8'}).trim()!==SB)throw new Error('SOURCE_ANALYSIS_BLOB_MISMATCH');
const changed=execFileSync('git',['diff','--name-only',`${SH}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
if(sj(changed)!==sj([P]))throw new Error('NEXT_STAGE_SCOPE_INVALID:'+changed.join(','));
if(execFileSync('git',['rev-parse',`${head}:${B}`],{encoding:'utf8'}).trim()!==BB)throw new Error('BATCH_RUNNER_IDENTITY_CHANGED');
if(execFileSync('git',['rev-parse',`${head}:${F}`],{encoding:'utf8'}).trim()!==FB)throw new Error('FULL_SELECTOR_RUNNER_IDENTITY_CHANGED');
meta(SR,SA,SD);meta(MR,MA,MD);
const t=String(process.env.RUNNER_TEMP??'/tmp'),s=`${t}/u19-${SR}`,m=`${t}/u19-model-${MR}`;dl(SR,SA,s);dl(MR,MA,m);
for(const f of readdirSync(s).filter(x=>x.endsWith('.json'))){const d=rd(`${s}/${f}`);writeJson(`${OUT}/${f}`,{...d,exact_head:head,source_bound_exact_head:SH,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_EVIDENCE_NO_REEXECUTION'});}

const binding=rd(`${s}/explicit-constraint-7-lane-recursive-closure-binding.json`),decision=rd(`${s}/explicit-constraint-7-lane-recursive-closure-decision.json`),model=rd(`${m}/explicit-decision-constraint-partition-model-proof.json`),modelBinding=rd(`${m}/depth8-source-binding.json`);
if(binding.status!=='PASS'||binding.binding_status!=='PASS'||binding.model_lane_count!==7||binding.model_decision_child_count!==21||binding.closure_bound_child_count!==2||binding.remaining_unverified_child_count!==19)throw new Error('SEVEN_LANE_BINDING_INVALID');
if(decision.next_recovery_action!=='EXECUTE_REMAINING_19_EXPLICIT_CONSTRAINT_DECISION_CHILDREN_ONLY'||decision.closed_children_reexecution_authorized!==false||decision.remaining_children_execution_authorized!==true)throw new Error('SEVEN_LANE_DECISION_INVALID');
if(model.exact_head!==MH||model.lane_count!==7||model.proof_pass_count!==7||model.blocked_count!==0||model.explicit_decision_constraint_model_status!=='PASS'||model.status!=='MODEL_PROOF_COMPLETE_IMPLEMENTATION_NOT_AUTHORIZED')throw new Error('MODEL_SOURCE_INVALID');
if(modelBinding.status!=='PASS'||modelBinding.current_runtime_manifest_sha256!==binding.current_runtime_manifest_sha256)throw new Error('MODEL_RUNTIME_BINDING_INVALID');
const rt=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');if(!rt?.sourcePackageIntegrity?.match||rt.sourcePackageIntegrity.actual!==binding.current_runtime_manifest_sha256)throw new Error('RUNTIME_IDENTITY_CHANGED');
const closed=binding.children.filter(x=>x.execution_status==='PASS_BY_RECURSIVE_LEAF_CLOSURE'),pending=binding.children.filter(x=>x.execution_status==='UNVERIFIED');if(closed.length!==2||pending.length!==19||closed.some(x=>x.decision_key!=='UNSET'))throw new Error('PENDING_SET_INVALID');
const laneById=new Map(model.lanes.map(x=>[x.lane_id,x]));
for(const item of pending){const lane=laneById.get(item.lane_id);if(!lane||lane.product_node!==item.product_node||lane.selected_constraint_field!==item.selected_constraint_field||lane.status!=='MODEL_PROOF_PASS_IMPLEMENTATION_NOT_AUTHORIZED')throw new Error('PENDING_MODEL_IDENTITY_INVALID:'+item.lane_id);const proof=lane.candidate_proofs.find(x=>x.field_key===item.selected_constraint_field&&x.status==='PASS');if(!proof)throw new Error('PENDING_MODEL_PROOF_MISSING:'+item.lane_id);const source=proof.constraints.find(x=>dkey(x.decision_constraint?.decision)===item.decision_key);if(!source||source.selection_fingerprint!==item.selection_fingerprint)throw new Error('PENDING_CHILD_FINGERPRINT_MISMATCH:'+item.lane_id+':'+item.decision_key);}

const results=[];for(const [index,item] of pending.entries()){const measured=executeBranch(item,laneById.get(item.lane_id),index);results.push(measured);console.log(`REMAINING19 index=${index} lane=${item.lane_id} decision=${item.decision_key} status=${measured.status} outcome=${measured.outcome} states=${measured.visited_state_count??null} terminals=${measured.terminal_context_count??null}`);}
const passed=results.filter(x=>x.status==='PASS'),slow=results.filter(x=>x.status==='NEEDS_FURTHER_PARTITIONING'),invalid=results.filter(x=>x.status==='EXECUTION_INVALID');
const verified=invalid.length===0&&results.length===19&&results.every(x=>x.constraint_start_valid===true&&x.constraint_count===1&&(x.status==='PASS'||x.constraint_progress_valid===true));
const complete=verified&&passed.length===19&&slow.length===0;
writeJson(`${OUT}/explicit-constraint-7-lane-remaining19-execution.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_EXPLICIT_CONSTRAINT_7_LANE_REMAINING19_EXECUTION',exact_head:head,source_exact_head:SH,source_run_id:Number(SR),source_artifact_name:SA,source_artifact_digest:SD,model_source_exact_head:MH,model_source_run_id:Number(MR),model_source_artifact_name:MA,model_source_artifact_digest:MD,closed_child_count:2,closed_children_reexecuted:false,expected_execution_child_count:19,executed_child_count:results.length,pass_count:passed.length,needs_further_partitioning_count:slow.length,execution_invalid_count:invalid.length,remaining19_execution_verified:verified,all_21_decision_children_covered:complete,child_timeout_ms:TIMEOUT,results,status:invalid.length||!verified?'BLOCKED':complete?'PASS':'MEASURED_PARTIAL'});
const next=!verified||invalid.length?'REMAINING_19_EXECUTION_BLOCKED':slow.length?'PARTITION_ONLY_SLOW_REMAINING_EXPLICIT_CONSTRAINT_CHILDREN':'EXPLICIT_CONSTRAINT_7_LANE_EXECUTION_CLOSURE_READY';
writeJson(`${OUT}/explicit-constraint-7-lane-remaining19-decision.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_EXPLICIT_CONSTRAINT_7_LANE_REMAINING19_DECISION',exact_head:head,closed_child_count:2,closed_children_reexecuted:false,executed_child_count:results.length,pass_count:passed.length,needs_further_partitioning_count:slow.length,execution_invalid_count:invalid.length,covered_decision_child_count:2+passed.length,unresolved_decision_child_count:slow.length+invalid.length,remaining19_execution_verified:verified,all_21_decision_children_covered:complete,next_recovery_action:next,full_constraint_execution_authorized:complete,full_coverage_authorized:false,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_EXECUTE_REMAINING_19_EXPLICIT_CONSTRAINT_DECISION_CHILDREN_ONLY',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:invalid.length||!verified?'BLOCKED':complete?'DIAGNOSTIC_COMPLETE':'PARTIAL_CLOSURE'});
console.log(`REMAINING19_PASS_COUNT=${passed.length}/19`);console.log(`REMAINING19_NEEDS_FURTHER_PARTITIONING_COUNT=${slow.length}`);console.log(`REMAINING19_EXECUTION_INVALID_COUNT=${invalid.length}`);console.log(`ALL_21_DECISION_CHILDREN_COVERED=${complete?'TRUE':'FALSE'}`);console.log(`NEXT_RECOVERY_ACTION=${next}`);console.log('CLOSED_CHILDREN_REEXECUTED=FALSE');console.log('FULL_COVERAGE_AUTHORIZED=FALSE');console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');console.log('APP_INTEGRATION_READY=FALSE');console.log('RELEASE_INPUT_GATE=BLOCKED');
if(invalid.length||!verified)throw new Error('REMAINING19_EXECUTION_INVALID');
