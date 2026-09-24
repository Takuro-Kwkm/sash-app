import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const P='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const B='scripts/governance/uchirimo-selector-batch-runner.mjs';
const F='scripts/uchirimo-full-selector-proof.mjs';
const R='Takuro-Kwkm/sash-app';
const SR='36071450296';
const SH='e3303eec1bb35dbffbf3bfcda6e96c2e1988211c';
const SA=`uchirimo-heavy-recovery-analysis-${SH}`;
const SD='sha256:6f5f846d13314910b33ff855f6cb978f09ed6153b3671726e9643bbc45c325bc';
const SB='eb01684ac967e7814f5ce7e3ddd5950750c4237e';
const MR='35982709102';
const MH='fa426d588ce41343d462472882f791616fd29fe1';
const MA=`uchirimo-heavy-recovery-analysis-${MH}`;
const MD='sha256:b1a50e0ca2438cbfb3642b4c7d59d5d4ca025d0ed51463b5519c769e15fbf89a';
const BB='65a57854ab7adf45fa0486b465530686d76cb09f';
const FB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const REPO=String(process.env.GITHUB_REPOSITORY??R);
const head=currentExactHead();
mkdirSync(OUT,{recursive:true});

const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object')?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));
const sj=(v)=>JSON.stringify(stable(v));
const hash=(v)=>createHash('sha256').update(typeof v==='string'?v:sj(v)).digest('hex');
const rd=(p)=>JSON.parse(readFileSync(p,'utf8'));
const dkey=(d)=>d.kind==='UNSET'?'UNSET':`VALUE:${sj(d.value)}`;
const meta=(run,name,digest)=>{const x=JSON.parse(execFileSync('gh',['api',`repos/${REPO}/actions/runs/${run}/artifacts?per_page=100`],{encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024})).artifacts?.find(x=>x.name===name);if(!x||x.expired||x.digest!==digest)throw new Error('SOURCE_ARTIFACT_INVALID:'+run);};
const dl=(run,name,dir)=>{mkdirSync(dir,{recursive:true});execFileSync('gh',['run','download',run,'--repo',REPO,'--name',name,'--dir',dir],{stdio:'inherit',timeout:120000});};

execFileSync('git',['merge-base','--is-ancestor',SH,head],{stdio:'ignore'});
if(execFileSync('git',['rev-parse',`${SH}:${P}`],{encoding:'utf8'}).trim()!==SB)throw new Error('SOURCE_ANALYSIS_BLOB_MISMATCH');
const changed=execFileSync('git',['diff','--name-only',`${SH}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
if(sj(changed)!==sj([P]))throw new Error('NEXT_STAGE_SCOPE_INVALID:'+changed.join(','));
if(execFileSync('git',['rev-parse',`${head}:${B}`],{encoding:'utf8'}).trim()!==BB)throw new Error('BATCH_RUNNER_IDENTITY_CHANGED');
if(execFileSync('git',['rev-parse',`${head}:${F}`],{encoding:'utf8'}).trim()!==FB)throw new Error('FULL_SELECTOR_RUNNER_IDENTITY_CHANGED');
meta(SR,SA,SD);meta(MR,MA,MD);
const t=String(process.env.RUNNER_TEMP??'/tmp'),s=`${t}/u19split-${SR}`,m=`${t}/u19split-model-${MR}`;dl(SR,SA,s);dl(MR,MA,m);
for(const f of readdirSync(s).filter(x=>x.endsWith('.json'))){const d=rd(`${s}/${f}`);writeJson(`${OUT}/${f}`,{...d,exact_head:head,source_bound_exact_head:SH,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_EVIDENCE_NO_REEXECUTION'});}

const exec19=rd(`${s}/explicit-constraint-7-lane-remaining19-execution.json`);
const dec19=rd(`${s}/explicit-constraint-7-lane-remaining19-decision.json`);
const binding=rd(`${s}/explicit-constraint-7-lane-recursive-closure-binding.json`);
const model=rd(`${m}/explicit-decision-constraint-partition-model-proof.json`);
const modelBinding=rd(`${m}/depth8-source-binding.json`);
if(exec19.exact_head!==SH||exec19.executed_child_count!==19||exec19.pass_count!==0||exec19.needs_further_partitioning_count!==19||exec19.execution_invalid_count!==0||exec19.remaining19_execution_verified!==true||exec19.status!=='MEASURED_PARTIAL')throw new Error('REMAINING19_SOURCE_INVALID');
if(dec19.next_recovery_action!=='PARTITION_ONLY_SLOW_REMAINING_EXPLICIT_CONSTRAINT_CHILDREN'||dec19.unresolved_decision_child_count!==19||dec19.status!=='PARTIAL_CLOSURE')throw new Error('REMAINING19_DECISION_INVALID');
if(binding.status!=='PASS'||binding.model_lane_count!==7||binding.model_decision_child_count!==21||binding.closure_bound_child_count!==2||binding.remaining_unverified_child_count!==19)throw new Error('SEVEN_LANE_BINDING_INVALID');
if(model.exact_head!==MH||model.lane_count!==7||model.proof_pass_count!==7||model.blocked_count!==0||model.explicit_decision_constraint_model_status!=='PASS')throw new Error('MODEL_SOURCE_INVALID');
if(modelBinding.status!=='PASS'||modelBinding.current_runtime_manifest_sha256!==binding.current_runtime_manifest_sha256)throw new Error('MODEL_RUNTIME_BINDING_INVALID');
const rt=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');if(!rt?.sourcePackageIntegrity?.match||rt.sourcePackageIntegrity.actual!==binding.current_runtime_manifest_sha256)throw new Error('RUNTIME_IDENTITY_CHANGED');

const laneById=new Map(model.lanes.map(x=>[x.lane_id,x]));
const parents=[];const children=[];
for(const parent of exec19.results){
  if(parent.status!=='NEEDS_FURTHER_PARTITIONING'||parent.outcome!=='TIMEOUT_CONSTRAINT_ACTIVE'||parent.constraint_start_valid!==true||parent.constraint_progress_valid!==true)throw new Error('SLOW_PARENT_INVALID:'+parent.lane_id+':'+parent.decision_key);
  const lane=laneById.get(parent.lane_id);if(!lane||lane.product_node!==parent.product_node)throw new Error('SLOW_PARENT_LANE_MISSING:'+parent.lane_id);
  const proof=lane.candidate_proofs.find(x=>x.field_key==='extension_frame_type');
  if(!proof||proof.status!=='PASS'||proof.explicit_constraint_representable!==true||proof.coverage_exhaustive!==true||proof.coverage_disjoint_by_single_field_decision!==true||proof.reachable_branch_count!==5||proof.constraints?.length!==5)throw new Error('EXTENSION_FRAME_PARTITION_PROOF_INVALID:'+parent.lane_id);
  const branchKeys=proof.constraints.map(x=>dkey(x.decision_constraint.decision));if(new Set(branchKeys).size!==5)throw new Error('EXTENSION_FRAME_BRANCH_DUPLICATE:'+parent.lane_id);
  const parentId=`UHC-R19P-${hash({lane_id:parent.lane_id,decision:parent.decision}).slice(0,20)}`;
  const parentConstraints=parent.constraints??[{field_key:parent.selected_constraint_field,decision:parent.decision}];
  if(parentConstraints.length!==1||parentConstraints[0].field_key!=='frame_installation_mode')throw new Error('PARENT_CONSTRAINT_SHAPE_INVALID:'+parentId);
  const parentRow={parent_id:parentId,lane_id:parent.lane_id,product_node:parent.product_node,parent_decision:parent.decision,parent_decision_key:parent.decision_key,parent_selection_fingerprint:parent.selection_fingerprint,split_field:'extension_frame_type',source_split_proof_status:'PASS',source_split_reachable_branch_count:5,partition_overlap_count:0,partition_gap_count:0,status:'PASS'};
  parents.push(parentRow);
  for(const sourceChild of proof.constraints){
    const splitDecision=sourceChild.decision_constraint.decision;
    const constraints=[...parentConstraints,{field_key:'extension_frame_type',decision:splitDecision}];
    const childId=`UHC-R19C-${hash({parent_id:parentId,constraints}).slice(0,20)}`;
    children.push({child_id:childId,parent_id:parentId,lane_id:parent.lane_id,product_node:parent.product_node,parent_decision:parent.decision,parent_decision_key:parent.decision_key,split_field:'extension_frame_type',split_decision:splitDecision,split_decision_key:dkey(splitDecision),constraints,source_split_selection_fingerprint:sourceChild.selection_fingerprint,reachability_status:'UNMEASURED_MAY_BE_EMPTY',execution_status:'UNVERIFIED',status:'PLANNED_UNVERIFIED'});
  }
}
const parentIds=new Set(parents.map(x=>x.parent_id)),childIds=new Set(children.map(x=>x.child_id));
const childCountByParent=new Map(parents.map(x=>[x.parent_id,children.filter(c=>c.parent_id===x.parent_id).length]));
const modelPass=parents.length===19&&parentIds.size===19&&children.length===95&&childIds.size===95&&[...childCountByParent.values()].every(n=>n===5)&&parents.every(x=>x.partition_overlap_count===0&&x.partition_gap_count===0);
writeJson(`${OUT}/explicit-constraint-remaining19-extension-frame-partition-model-proof.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_EXPLICIT_CONSTRAINT_REMAINING19_EXTENSION_FRAME_PARTITION_MODEL_PROOF',exact_head:head,source_exact_head:SH,source_run_id:Number(SR),source_artifact_name:SA,source_artifact_digest:SD,model_source_exact_head:MH,model_source_run_id:Number(MR),model_source_artifact_name:MA,model_source_artifact_digest:MD,current_runtime_manifest_sha256:rt.sourcePackageIntegrity.actual,parent_count:parents.length,split_field:'extension_frame_type',source_decision_domain:['UNSET','VALUE:"none"','VALUE:"fukashi_25"','VALUE:"fukashi_40"','VALUE:"fukashi_60"'],child_count:children.length,children_per_parent:5,partition_overlap_count:0,partition_gap_count:0,empty_child_branches_allowed:true,reachability_measurement_deferred:true,coverage_reason:'THE_EXHAUSTIVE_MUTUALLY_EXCLUSIVE_EXTENSION_FRAME_TYPE_DECISION_DOMAIN_PARTITIONS_ANY_SUBSET_DEFINED_BY_THE_PARENT_FRAME_INSTALLATION_MODE_CONSTRAINT',parents,children,coverage_preservation_status:modelPass?'PASS':'FAIL',status:modelPass?'PASS':'BLOCKED'});
if(!modelPass)throw new Error('REMAINING19_EXTENSION_FRAME_PARTITION_MODEL_FAIL');
writeJson(`${OUT}/explicit-constraint-remaining19-extension-frame-partition-decision.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_EXPLICIT_CONSTRAINT_REMAINING19_EXTENSION_FRAME_PARTITION_DECISION',exact_head:head,parent_count:19,child_count:95,split_field:'extension_frame_type',partition_overlap_count:0,partition_gap_count:0,coverage_preservation_status:'PASS',execution_performed:false,next_recovery_action:'CALIBRATE_REPRESENTATIVE_EXTENSION_FRAME_CHILDREN_FOR_19_SLOW_PARENTS',representative_execution_authorized:true,all_95_execution_authorized:false,full_constraint_execution_authorized:false,full_coverage_authorized:false,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_PARTITION_ONLY_19_SLOW_EXPLICIT_CONSTRAINT_CHILDREN',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:'DIAGNOSTIC_COMPLETE'});
console.log('REMAINING19_EXTENSION_FRAME_PARTITION_MODEL_STATUS=PASS');
console.log('PARENT_COUNT=19');
console.log('CHILD_COUNT=95');
console.log('PARTITION_OVERLAP_COUNT=0');
console.log('PARTITION_GAP_COUNT=0');
console.log('EXECUTION_PERFORMED=FALSE');
console.log('NEXT_RECOVERY_ACTION=CALIBRATE_REPRESENTATIVE_EXTENSION_FRAME_CHILDREN_FOR_19_SLOW_PARENTS');
console.log('ALL_95_EXECUTION_AUTHORIZED=FALSE');
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
