import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PID='SER-YKKAP-UCHIRIMO';
const SOURCE_RUN='35993498469';
const SOURCE_HEAD='b87a46b4afe52234c0942650436c8dada726d3f3';
const SOURCE_ART=`uchirimo-heavy-recovery-analysis-${SOURCE_HEAD}`;
const SOURCE_ANALYSIS_BLOB='5e80d8e687980b9fa6d526aff0e7e8085f03d254';
const SOURCE_BATCH_BLOB='65a57854ab7adf45fa0486b465530686d76cb09f';
const SOURCE_FULL_BLOB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const SOURCE_DEPTH2_MODEL_REL='source-run-35992423385/explicit-decision-constraint-depth2-partition-model-proof.json';
const PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const BATCH='scripts/governance/uchirimo-selector-batch-runner.mjs';
const FULL='scripts/uchirimo-full-selector-proof.mjs';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const TIMEOUT=Number(process.env.UCHIRIMO_CONSTRAINT_DEPTH3_MICRO_TIMEOUT_MS??60000);
const head=currentExactHead();
if(!Number.isFinite(TIMEOUT)||TIMEOUT<60000)throw new Error('CONSTRAINT_DEPTH3_TIMEOUT_INVALID');
mkdirSync(OUT,{recursive:true});

const TECH=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);
const CONT=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object')?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));
const sj=(v)=>JSON.stringify(stable(v));
const hash=(v)=>createHash('sha256').update(typeof v==='string'?v:sj(v)).digest('hex');
const read=(p)=>JSON.parse(readFileSync(p,'utf8'));
const safeRead=(p)=>{try{return read(p)}catch{return null}};
const same=(a,b)=>Array.isArray(b)?Array.isArray(a)&&sj(a.map(String).sort())===sj(b.map(String).sort()):Object.is(a,b)||String(a)===String(b);
const present=(v)=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0);
const enabled=(f)=>[...new Map((f?.values??[]).filter(x=>x.disabled!==true).map(x=>[sj(x.value),x.value])).values()];
const normalizeMulti=(rows)=>[...new Map(rows.map(v=>[String(v),v])).values()].sort((a,b)=>String(a).localeCompare(String(b)));
const prefixPreserved=(result,prefix)=>Object.entries(prefix).every(([k,v])=>same(result.selection?.[k],v));
const dkey=(d)=>d.kind==='UNSET'?'UNSET':`VALUE:${sj(d.value)}`;

function decisionDomain(field){
  const values=enabled(field);
  if(field.dataType==='MULTI_ENUM'){
    if(values.length>12)throw new Error('MULTI_ENUM_SYMBOLIC_REQUIRED:'+field.key);
    const out=[];
    if(field.required!==true)out.push({kind:'UNSET'});
    for(let mask=1;mask<2**values.length;mask+=1){
      const subset=[];
      for(let i=0;i<values.length;i+=1)if(mask&(1<<i))subset.push(values[i]);
      out.push({kind:'VALUE',value:normalizeMulti(subset)});
    }
    return out;
  }
  const out=values.map(v=>({kind:'VALUE',value:stable(v)}));
  if(field.required!==true)out.unshift({kind:'UNSET'});
  return out;
}

function applyDecision(selection,key,decision){
  const next={...(selection??{})};
  if(decision.kind==='UNSET')delete next[key];
  else next[key]=decision.value;
  return next;
}

function survives(result,key,decision){
  const field=(result.fields??[]).find(x=>x.key===key)??null;
  if(!field)return false;
  if(decision.kind==='UNSET')return field.required!==true&&!present(result.selection?.[key]);
  return same(result.selection?.[key],decision.value);
}

async function applyConstraints(prefix,constraints){
  let result=await resolveRuntimeAppProduct(PID,prefix);
  if(!prefixPreserved(result,prefix))throw new Error('CONSTRAINT_DEPTH3_PREFIX_REJECTED');
  for(const constraint of constraints){
    result=await resolveRuntimeAppProduct(PID,applyDecision(result.selection??prefix,constraint.field_key,constraint.decision));
    if(!survives(result,constraint.field_key,constraint.decision))throw new Error('CONSTRAINT_DEPTH3_SOURCE_CONSTRAINT_NOT_PRESERVED:'+constraint.field_key);
    if(!prefixPreserved(result,prefix))throw new Error('CONSTRAINT_DEPTH3_SOURCE_CONSTRAINT_CLEARED_PREFIX:'+constraint.field_key);
  }
  return result;
}

function constraintRow(parent,index,constraints){
  const s=parent.selector_prefix??{};
  const base=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  return {
    shard:0,
    node_id:parent.product_node,
    partition_key:`${parent.parent_child_id}|constraint-depth3-representative-${index}`,
    room_specification:String(s.room_specification),
    window_type:String(s.window_type),
    sash_configuration:s.sash_configuration==null?'__UNSET__':String(s.sash_configuration),
    size_class:s.size_class==null?'__UNSET__':String(s.size_class),
    glass_family:String(s.glass_family),
    partition_seed_json:sj(Object.fromEntries(Object.entries(s).filter(([k])=>!base.has(k)))),
    decision_constraints_json:sj(constraints),
    expected_hash:hash(constraints)
  };
}

function executeConstraint(parent,index,constraints){
  const row=constraintRow(parent,index,constraints);
  const id=`constraint-depth3-representative-${String(index).padStart(2,'0')}`;
  const dir=`${OUT}/constraint-depth3-representative/case-${String(index).padStart(2,'0')}`;
  mkdirSync(dir,{recursive:true});
  let executionError=null;
  try{
    execFileSync(process.execPath,[BATCH],{
      env:{
        ...process.env,
        HEAD_SHA:head,
        UCHIRIMO_SELECTOR_BATCH_ID:id,
        UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([row]),
        UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(TIMEOUT),
        UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
        UCHIRIMO_SELECTOR_MAX_STATES:'1000000',
        UCHIRIMO_SELECTOR_MAX_TERMINALS:'1000000',
        UCHIRIMO_RESOLVER_CACHE_MAX:'512',
        UCHIRIMO_FULL_SELECTOR_OUT:dir
      },
      encoding:'utf8',
      timeout:TIMEOUT+20000,
      maxBuffer:64*1024*1024
    });
  }catch(error){
    executionError={message:String(error?.message??error),code:error?.code??null,signal:error?.signal??null};
  }
  const batch=safeRead(`${dir}/batch-${id}-report.json`);
  const report=safeRead(`${dir}/shard-0-report.json`);
  const failure=safeRead(`${dir}/shard-0-failure.json`);
  const start=safeRead(`${dir}/shard-0-constraint-start.json`);
  const progress=safeRead(`${dir}/shard-0-constraint-progress.json`);
  const digest=`${dir}/shard-0-terminal-digests.jsonl`;
  if(existsSync(digest))unlinkSync(digest);
  const br=batch?.results?.[0]??null;
  const a=Date.parse(br?.started_at??'');
  const b=Date.parse(br?.completed_at??'');
  const elapsed=Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:null;
  const message=String(failure?.message??br?.error??'');
  const timedOut=br?.timed_out===true;
  const startOk=start?.status==='PASS'&&start.exact_head===head&&start.runner==='UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_SHARD_V1'&&start.decision_constraints_sha256===row.expected_hash&&start.runtime_integrity_match===true;
  const progressOk=progress?.exact_head===head&&progress.decision_constraints_sha256===row.expected_hash&&Number(progress.visited_state_count??0)>0;
  const pass=batch?.status==='PASS'&&report?.status==='PASS'&&report?.exact_head===head&&report?.decision_constraints_sha256===row.expected_hash&&report?.runtime_integrity_match===true&&Number(report?.unverified_discrete_selector_case_count??1)===0;
  const outcome=pass?'COMPLETED':timedOut&&startOk&&progressOk?'TIMEOUT_CONSTRAINT_ACTIVE':/STATE_LIMIT/.test(message)&&startOk?'STATE_LIMIT_REACHED':/TERMINAL_LIMIT/.test(message)&&startOk?'TERMINAL_LIMIT_REACHED':'INVALID';
  return {
    outcome,
    elapsed_ms:elapsed,
    timed_out:timedOut,
    runner_path:br?.runner??null,
    constraint_count:br?.constraint_count??null,
    constraint_start_valid:startOk,
    constraint_progress_valid:progressOk,
    visited_state_count:report?.visited_state_count??progress?.visited_state_count??null,
    terminal_context_count:report?.terminal_context_count??progress?.terminal_context_count??null,
    transition_check_count:report?.transition_check_count??progress?.transition_check_count??null,
    constraint_rejection_count:report?.constraint_rejection_count??progress?.constraint_rejection_count??null,
    failure_message:message||null,
    execution_error:executionError
  };
}

execFileSync('git',['merge-base','--is-ancestor',SOURCE_HEAD,head],{stdio:'ignore'});
for(const [path,expected] of [[PATH,SOURCE_ANALYSIS_BLOB],[BATCH,SOURCE_BATCH_BLOB],[FULL,SOURCE_FULL_BLOB]]){
  const actual=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${path}`],{encoding:'utf8'}).trim();
  if(actual!==expected)throw new Error(`SOURCE_BLOB_MISMATCH:${path}:${actual}`);
}
const changed=execFileSync('git',['diff','--name-only',`${SOURCE_HEAD}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
if(sj(changed)!==sj([PATH]))throw new Error('NEXT_STAGE_SCOPE_INVALID:'+changed.join(','));
if(execFileSync('git',['rev-parse',`${head}:${BATCH}`],{encoding:'utf8'}).trim()!==SOURCE_BATCH_BLOB)throw new Error('BATCH_RUNNER_IDENTITY_CHANGED');
if(execFileSync('git',['rev-parse',`${head}:${FULL}`],{encoding:'utf8'}).trim()!==SOURCE_FULL_BLOB)throw new Error('FULL_SELECTOR_RUNNER_IDENTITY_CHANGED');

const src=`${OUT}/source-run-${SOURCE_RUN}`;
mkdirSync(src,{recursive:true});
execFileSync('gh',['run','download',SOURCE_RUN,'--repo',String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app'),'--name',SOURCE_ART,'--dir',src],{stdio:'inherit',timeout:120000});
const heavy=read(`${src}/heavy-partition-analysis.json`);
const recursive=read(`${src}/recursive-partition-plan.json`);
const sourceBinding=read(`${src}/depth11-and-constraint-depth2-branch-sweep-source-binding.json`);
const sourceDecision=read(`${src}/depth11-and-constraint-depth2-branch-sweep-decision.json`);
const sourceDepth11Plan=read(`${src}/depth11-safe-representative-partition-plan.json`);
const sourceDepth11Proof=read(`${src}/depth11-safe-representative-coverage-preservation-proof.json`);
const sourceDepth11Micro=read(`${src}/depth11-safe-representative-micro-calibration.json`);
const depth2Calibration=read(`${src}/explicit-decision-constraint-depth2-all-branch-calibration.json`);
const depth2Model=read(`${src}/${SOURCE_DEPTH2_MODEL_REL}`);
for(const artifact of [heavy,recursive,sourceBinding,sourceDecision,sourceDepth11Plan,sourceDepth11Proof,sourceDepth11Micro,depth2Calibration])if(artifact.exact_head!==SOURCE_HEAD)throw new Error('SOURCE_HEAD_MISMATCH');
if(sourceBinding.status!=='PASS'||sourceBinding.source_exact_head!=='e1d386c2a67abf03fe6fd84680593b1601645f1e')throw new Error('SOURCE_BINDING_INVALID');
if(sourceDecision.REQUESTED_DIFF_COVERAGE!=='PASS'||sourceDecision.UNREQUESTED_DIFF_COUNT!==0)throw new Error('SOURCE_SCOPE_INVALID');
if(sourceDecision.next_constraint_action!=='CONSTRAINT_DEPTH3_REQUIRED_FOR_SLOW_DEPTH2_BRANCHES')throw new Error('SOURCE_CONSTRAINT_ACTION_INVALID');
if(depth2Calibration.expected_branch_count!==10||depth2Calibration.executed_branch_count!==10||depth2Calibration.pass_count!==8||depth2Calibration.needs_further_partitioning_count!==2||depth2Calibration.calibration_invalid_count!==0||depth2Calibration.constraint_depth2_all_branch_runner_verified!==true)throw new Error('SOURCE_DEPTH2_CALIBRATION_INVALID');
if(sourceDepth11Micro.calibration_invalid_count!==0||sourceDepth11Micro.needs_deeper_split_count!==3)throw new Error('SOURCE_DEPTH11_DIAGNOSTIC_INVALID');
if(depth2Model.status!=='PASS'||depth2Model.coverage_preservation_status!=='PASS'||depth2Model.PARTITION_OVERLAP_COUNT!==0||depth2Model.PARTITION_GAP_COUNT!==0)throw new Error('SOURCE_DEPTH2_MODEL_INVALID');

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('RUNTIME_INTEGRITY_FAIL');
if(runtime.sourcePackageIntegrity.actual!==sourceBinding.current_runtime_manifest_sha256)throw new Error('RUNTIME_IDENTITY_CHANGED');

const binding={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_CONSTRAINT_DEPTH3_REPRESENTATIVE_SOURCE_BINDING',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  changed_files_since_source:changed,
  source_constraint_depth2_expected_branch_count:depth2Calibration.expected_branch_count,
  source_constraint_depth2_pass_count:depth2Calibration.pass_count,
  source_constraint_depth2_slow_count:depth2Calibration.needs_further_partitioning_count,
  source_constraint_depth2_invalid_count:depth2Calibration.calibration_invalid_count,
  source_depth2_branch_measurement_reexecuted:false,
  source_depth11_measurement_reexecuted:false,
  source_depth11_decision:sourceDecision.depth11_decision,
  current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  batch_runner_unchanged:true,
  full_selector_runner_unchanged:true,
  status:'PASS'
};
writeJson(`${OUT}/constraint-depth3-representative-source-binding.json`,binding);
writeJson(`${OUT}/heavy-partition-analysis.json`,{...heavy,exact_head:head,evidence_origin:'CURRENT_HEAD_CONSTRAINT_DEPTH3_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/recursive-partition-plan.json`,{...recursive,exact_head:head,evidence_origin:'CURRENT_HEAD_CONSTRAINT_DEPTH3_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/depth11-safe-representative-partition-plan.json`,{...sourceDepth11Plan,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/depth11-safe-representative-coverage-preservation-proof.json`,{...sourceDepth11Proof,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/depth11-safe-representative-micro-calibration.json`,{...sourceDepth11Micro,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});

const depth2ById=new Map(depth2Model.children.map(child=>[child.child_id,child]));
const slowRows=depth2Calibration.results.filter(row=>row.status==='NEEDS_FURTHER_PARTITIONING');
if(slowRows.length!==2)throw new Error('CONSTRAINT_DEPTH3_SOURCE_SLOW_COUNT_INVALID:'+slowRows.length);
const parents=[];
const children=[];
for(const source of slowRows){
  const depth2Child=depth2ById.get(source.child_id);
  if(!depth2Child)throw new Error('CONSTRAINT_DEPTH3_SOURCE_CHILD_MISSING:'+source.child_id);
  const prefix=stable(depth2Child.selector_prefix??{});
  const sourceConstraints=stable(depth2Child.constraints??[]);
  if(sourceConstraints.length!==2||sourceConstraints[1]?.field_key!=='extension_frame_type'||sourceConstraints[1]?.decision?.value!=='fukashi_60')throw new Error('CONSTRAINT_DEPTH3_SOURCE_CONSTRAINT_SHAPE_INVALID:'+source.child_id);
  const constrained=await applyConstraints(prefix,sourceConstraints);
  const constraintKeys=new Set(sourceConstraints.map(row=>row.field_key));
  const candidates=(constrained.fields??[]).filter(field=>
    !field.readOnly
    &&!TECH.has(field.key)
    &&!CONT.has(field.key)
    &&!constraintKeys.has(field.key)
    &&!Object.prototype.hasOwnProperty.call(prefix,field.key)
    &&['ENUM','MULTI_ENUM'].includes(field.dataType)
    &&enabled(field).length>0
  );
  let chosen=null;
  const candidateProofs=[];
  for(const field of candidates){
    const domain=decisionDomain(field);
    const reachable=[];
    const rejected=[];
    for(const decision of domain){
      const child=await resolveRuntimeAppProduct(PID,applyDecision(constrained.selection??prefix,field.key,decision));
      const constraintsOk=sourceConstraints.every(constraint=>survives(child,constraint.field_key,constraint.decision));
      const thirdOk=survives(child,field.key,decision);
      const prefixOk=prefixPreserved(child,prefix);
      if(constraintsOk&&thirdOk&&prefixOk){
        reachable.push({decision:stable(decision),decision_key:dkey(decision),selection_fingerprint:hash(stable(child.selection??{}))});
      }else{
        rejected.push({decision:stable(decision),reason:!constraintsOk?'SOURCE_CONSTRAINT_CLEARED':!thirdOk?'THIRD_DECISION_REJECTED_OR_CLEARED':'PREFIX_CLEARED'});
      }
    }
    const accounted=reachable.length+rejected.length===domain.length;
    const unique=new Set(reachable.map(row=>row.decision_key)).size===reachable.length&&new Set(reachable.map(row=>row.selection_fingerprint)).size===reachable.length;
    const unsetCount=reachable.filter(row=>row.decision.kind==='UNSET').length;
    const unsetValid=field.required===true?unsetCount===0:unsetCount===1;
    const pass=reachable.length>=2&&unsetValid&&accounted&&unique;
    const proof={
      field_key:field.key,
      data_type:field.dataType,
      required:field.required===true,
      decision_domain_count:domain.length,
      reachable_branch_count:reachable.length,
      rejected_branch_count:rejected.length,
      reachable_unset_branch_count:unsetCount,
      branch_disjointness_status:unique?'PASS':'FAIL',
      parent_union_accounting_status:accounted?'PASS':'FAIL',
      reachable_children:reachable,
      rejected_branches:rejected,
      status:pass?'PASS':'BLOCKED'
    };
    candidateProofs.push(proof);
    if(!chosen&&pass)chosen=proof;
  }
  if(!chosen)throw new Error('CONSTRAINT_DEPTH3_NO_SAFE_DECISION_AXIS:'+source.child_id);
  const parent={
    parent_child_id:source.child_id,
    parent_lane_id:source.parent_lane_id,
    product_node:source.product_node,
    selector_prefix:prefix,
    source_constraints:sourceConstraints,
    third_constraint_field:chosen.field_key,
    third_constraint_data_type:chosen.data_type,
    candidate_proofs:candidateProofs,
    reachable_branch_count:chosen.reachable_branch_count,
    rejected_branch_count:chosen.rejected_branch_count,
    status:'PASS'
  };
  parents.push(parent);
  for(const reachable of chosen.reachable_children){
    const constraints=[...sourceConstraints,{field_key:chosen.field_key,decision:reachable.decision}];
    children.push({
      child_id:`UHC-C3-${hash([source.child_id,chosen.field_key,reachable.decision]).slice(0,20)}`,
      parent_child_id:source.child_id,
      parent_lane_id:source.parent_lane_id,
      product_node:source.product_node,
      selector_prefix:prefix,
      constraints,
      third_constraint_field:chosen.field_key,
      third_decision:reachable.decision,
      selection_fingerprint:reachable.selection_fingerprint,
      status:'PLANNED_UNVERIFIED'
    });
  }
}

const overlap=children.length-new Set(children.map(row=>row.child_id)).size;
const gap=parents.reduce((count,parent)=>count+(children.filter(row=>row.parent_child_id===parent.parent_child_id).length===parent.reachable_branch_count?0:1),0);
const proofPass=parents.length===2&&children.length>0&&overlap===0&&gap===0;
const proof={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_DEPTH3_PARTITION_MODEL_PROOF',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  parent_partition_count:parents.length,
  child_partition_count:children.length,
  PARTITION_OVERLAP_COUNT:overlap,
  PARTITION_GAP_COUNT:gap,
  parents,
  children,
  coverage_preservation_status:proofPass?'PASS':'FAIL',
  constraint_depth3_full_execution_authorized:false,
  full_coverage_authorized:false,
  status:proofPass?'PASS':'BLOCKED'
};
writeJson(`${OUT}/explicit-decision-constraint-depth3-partition-model-proof.json`,proof);
if(!proofPass)throw new Error('CONSTRAINT_DEPTH3_MODEL_PROOF_FAIL');

const results=[];
for(const [index,parent] of parents.entries()){
  const representative=children.filter(row=>row.parent_child_id===parent.parent_child_id).sort((a,b)=>dkey(a.third_decision).localeCompare(dkey(b.third_decision)))[0];
  if(!representative)throw new Error('CONSTRAINT_DEPTH3_REPRESENTATIVE_MISSING:'+parent.parent_child_id);
  const measured=executeConstraint(parent,index,representative.constraints);
  const deeper=['TIMEOUT_CONSTRAINT_ACTIVE','STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(measured.outcome);
  const status=measured.outcome==='COMPLETED'?'PASS':deeper?'NEEDS_FURTHER_PARTITIONING':'CALIBRATION_INVALID';
  results.push({
    index,
    parent_child_id:parent.parent_child_id,
    parent_lane_id:parent.parent_lane_id,
    product_node:parent.product_node,
    source_constraints:parent.source_constraints,
    third_constraint_field:parent.third_constraint_field,
    third_decision:representative.third_decision,
    constraints:representative.constraints,
    ...measured,
    status
  });
  console.log(`CONSTRAINT_DEPTH3_REPRESENTATIVE parent=${parent.parent_child_id} field=${parent.third_constraint_field} decision=${dkey(representative.third_decision)} status=${status} outcome=${measured.outcome} states=${measured.visited_state_count??null} terminals=${measured.terminal_context_count??null}`);
}

const passed=results.filter(row=>row.status==='PASS');
const deeper=results.filter(row=>row.status==='NEEDS_FURTHER_PARTITIONING');
const invalid=results.filter(row=>row.status==='CALIBRATION_INVALID');
const verified=invalid.length===0&&results.length===2&&results.every(row=>row.constraint_start_valid===true&&row.constraint_count===3&&(row.status==='PASS'||row.constraint_progress_valid===true));
const micro={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_DEPTH3_REPRESENTATIVE_MICRO_CALIBRATION',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  representative_count:results.length,
  child_timeout_ms:TIMEOUT,
  pass_count:passed.length,
  needs_further_partitioning_count:deeper.length,
  calibration_invalid_count:invalid.length,
  constraint_depth3_representative_verified:verified,
  constraint_depth3_full_execution_authorized:false,
  full_coverage_authorized:false,
  results,
  status:invalid.length||!verified?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
};
writeJson(`${OUT}/explicit-decision-constraint-depth3-representative-micro-calibration.json`,micro);

const nextConstraintAction=!verified?'CONSTRAINT_DEPTH3_REPRESENTATIVE_BLOCKED':deeper.length?'CONSTRAINT_DEPTH4_REQUIRED_FOR_SLOW_DEPTH3_BRANCHES':'CONSTRAINT_DEPTH3_REPRESENTATIVE_FAST_PATH_PROMISING';
const decision={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_CONSTRAINT_DEPTH3_REPRESENTATIVE_DECISION',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  source_depth2_branch_measurement_reexecuted:false,
  source_depth11_measurement_reexecuted:false,
  source_depth11_decision:sourceDecision.depth11_decision,
  constraint_depth3_model_status:proof.status,
  constraint_depth3_parent_count:parents.length,
  constraint_depth3_child_count:children.length,
  constraint_depth3_representative_pass_count:passed.length,
  constraint_depth3_representative_needs_further_partitioning_count:deeper.length,
  constraint_depth3_representative_calibration_invalid_count:invalid.length,
  constraint_depth3_representative_verified:verified,
  next_constraint_action:nextConstraintAction,
  next_safe_lane_action:sourceDecision.depth11_decision,
  constraint_depth3_full_execution_authorized:false,
  full_depth11_execution_authorized:false,
  full_coverage_authorized:false,
  REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_CONSTRAINT_DEPTH3_MODEL_AND_TWO_REPRESENTATIVE_MICROS_ONLY',
  REQUESTED_DIFF_COVERAGE:'PASS',
  UNREQUESTED_DIFF_COUNT:0,
  UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',
  UCHIRIMO_QA_STATUS:'UNVERIFIED',
  APP_INTEGRATION_READY:false,
  RELEASE_INPUT_GATE:'BLOCKED',
  status:invalid.length||!verified?'BLOCKED':'DIAGNOSTIC_COMPLETE'
};
writeJson(`${OUT}/constraint-depth3-representative-decision.json`,decision);

console.log(`CONSTRAINT_DEPTH3_MODEL_STATUS=${proof.status}`);
console.log(`CONSTRAINT_DEPTH3_PARENT_COUNT=${parents.length}`);
console.log(`CONSTRAINT_DEPTH3_CHILD_COUNT=${children.length}`);
console.log(`CONSTRAINT_DEPTH3_REPRESENTATIVE_PASS_COUNT=${passed.length}/${results.length}`);
console.log(`CONSTRAINT_DEPTH3_REPRESENTATIVE_VERIFIED=${verified?'TRUE':'FALSE'}`);
console.log('SOURCE_DEPTH2_BRANCH_MEASUREMENT_REEXECUTED=FALSE');
console.log('SOURCE_DEPTH11_MEASUREMENT_REEXECUTED=FALSE');
console.log(`NEXT_CONSTRAINT_ACTION=${nextConstraintAction}`);
console.log(`NEXT_SAFE_LANE_ACTION=${sourceDecision.depth11_decision}`);
console.log('CONSTRAINT_DEPTH3_FULL_EXECUTION_AUTHORIZED=FALSE');
console.log('FULL_DEPTH11_EXECUTION_AUTHORIZED=FALSE');
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(invalid.length||!verified)throw new Error('CONSTRAINT_DEPTH3_REPRESENTATIVE_INVALID');
