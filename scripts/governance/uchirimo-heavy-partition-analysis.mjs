import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const P='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const B='scripts/governance/uchirimo-selector-batch-runner.mjs';
const F='scripts/uchirimo-full-selector-proof.mjs';
const R='Takuro-Kwkm/sash-app';
const SR='36110660337';
const SH='3de6c5529344bf6606b6a2d9c61a7d0136431088';
const SA=`uchirimo-heavy-recovery-analysis-${SH}`;
const SD='sha256:8e6f7568a08fcceec6b02811ca1b2eb1e39d0a4665ec62817969bad69d84eafb';
const SB='1d7c5fbb1339d1b1786b86af18136fb9565a1992';
const BB='65a57854ab7adf45fa0486b465530686d76cb09f';
const FB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const REPO=String(process.env.GITHUB_REPOSITORY??R);
const head=currentExactHead();
mkdirSync(OUT,{recursive:true});

const stable=v=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object')?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));
const sj=v=>JSON.stringify(stable(v));
const hash=v=>createHash('sha256').update(typeof v==='string'?v:sj(v)).digest('hex');
const rd=p=>JSON.parse(readFileSync(p,'utf8'));
const meta=(run,name,dig)=>{const x=JSON.parse(execFileSync('gh',['api',`repos/${REPO}/actions/runs/${run}/artifacts?per_page=100`],{encoding:'utf8',timeout:120000,maxBuffer:16e6})).artifacts?.find(x=>x.name===name);if(!x||x.expired||x.digest!==dig)throw new Error('SOURCE_ARTIFACT_INVALID:'+run)};
const dl=(run,name,dir)=>{mkdirSync(dir,{recursive:true});execFileSync('gh',['run','download',run,'--repo',REPO,'--name',name,'--dir',dir],{stdio:'inherit',timeout:120000})};
const blob=(ref,path)=>execFileSync('git',['rev-parse',`${ref}:${path}`],{encoding:'utf8'}).trim();
const sameIds=(a,b)=>sj([...a].sort())===sj([...b].sort());

execFileSync('git',['merge-base','--is-ancestor',SH,head],{stdio:'ignore'});
if(blob(SH,P)!==SB)throw new Error('SOURCE_ANALYSIS_BLOB_MISMATCH');
const changed=execFileSync('git',['diff','--name-only',`${SH}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
if(sj(changed)!==sj([P]))throw new Error('NEXT_STAGE_SCOPE_INVALID:'+changed.join(','));
if(blob(head,B)!==BB||blob(head,F)!==FB)throw new Error('RUNNER_IDENTITY_CHANGED');
meta(SR,SA,SD);
const t=String(process.env.RUNNER_TEMP??'/tmp'),s=`${t}/uframe21-closure-${SR}`;
dl(SR,SA,s);

const frameBinding=rd(`${s}/explicit-constraint-7-lane-recursive-closure-binding.json`);
const frameExec=rd(`${s}/explicit-constraint-7-lane-remaining19-execution.json`);
const frameDecision=rd(`${s}/explicit-constraint-7-lane-remaining19-decision.json`);
const extensionPart=rd(`${s}/explicit-constraint-remaining19-extension-frame-partition-model-proof.json`);
const extensionClosure=rd(`${s}/explicit-constraint-extension-frame95-closure-proof.json`);
const extensionDecision=rd(`${s}/explicit-constraint-extension-frame95-closure-decision.json`);

const rt=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
const runtimeHash=rt?.sourcePackageIntegrity?.actual??null;
if(!rt?.sourcePackageIntegrity?.match||!runtimeHash)throw new Error('RUNTIME_IDENTITY_INVALID');
for(const [name,x] of Object.entries({frameBinding,frameExec,extensionPart,extensionClosure})){
  if(x.exact_head!==SH)throw new Error('SOURCE_EXACT_HEAD_MISMATCH:'+name);
}
for(const [name,x] of Object.entries({frameBinding,extensionPart,extensionClosure})){
  if(x.current_runtime_manifest_sha256!==runtimeHash)throw new Error('RUNTIME_IDENTITY_CHANGED:'+name);
}
if(frameDecision.exact_head!==SH||extensionDecision.exact_head!==SH)throw new Error('SOURCE_EXACT_HEAD_MISMATCH:decision');
for(const [name,x] of Object.entries({frameBinding,frameExec,frameDecision,extensionPart,extensionClosure})){
  const b=x.current_head_evidence_binding;
  if(!b||b.current_exact_head!==SH||b.measurement_reexecuted!==false)throw new Error('SOURCE_CURRENT_HEAD_BINDING_INVALID:'+name);
}
if(frameBinding.closure_source_run_id!==36065595011||frameBinding.closure_source_artifact_digest!=='sha256:ebd836f955b1e57e077ce0a5c795272ff061dbfc026c38bb1eef4627efc90074')throw new Error('FRAME_BINDING_CLOSURE_SOURCE_INVALID');
if(frameBinding.model_source_run_id!==35985579293||frameBinding.model_source_artifact_digest!=='sha256:26fa7cd7aff04d9770d1e613a1f847803034ad8b14a24269704016aa73404c2c')throw new Error('FRAME_BINDING_MODEL_SOURCE_INVALID');
if(frameExec.source_run_id!==36070242614||frameExec.source_artifact_digest!=='sha256:37b764b4d7cba9c677e49fdba24fba2347eaec634efe311a96c77401192fbb1c')throw new Error('FRAME_EXEC_SOURCE_INVALID');
if(frameExec.model_source_run_id!==35982709102||frameExec.model_source_artifact_digest!=='sha256:b1a50e0ca2438cbfb3642b4c7d59d5d4ca025d0ed51463b5519c769e15fbf89a')throw new Error('FRAME_EXEC_MODEL_SOURCE_INVALID');
if(extensionPart.source_run_id!==36071450296||extensionPart.source_artifact_digest!=='sha256:6f5f846d13314910b33ff855f6cb978f09ed6153b3671726e9643bbc45c325bc')throw new Error('EXTENSION_PARTITION_SOURCE_INVALID');

if(frameBinding.status!=='PASS'||frameBinding.binding_status!=='PASS'||frameBinding.model_lane_count!==7||frameBinding.model_decision_child_count!==21||frameBinding.closure_bound_child_count!==2||frameBinding.remaining_unverified_child_count!==19||frameBinding.full_constraint_execution_authorized!==false||frameBinding.full_coverage_authorized!==false)throw new Error('FRAME21_MODEL_BINDING_INVALID');
if(frameExec.status!=='MEASURED_PARTIAL'||frameExec.expected_execution_child_count!==19||frameExec.executed_child_count!==19||frameExec.pass_count!==0||frameExec.needs_further_partitioning_count!==19||frameExec.execution_invalid_count!==0||frameExec.remaining19_execution_verified!==true||frameExec.all_21_decision_children_covered!==false)throw new Error('FRAME19_EXECUTION_INVALID');
if(frameDecision.next_recovery_action!=='PARTITION_ONLY_SLOW_REMAINING_EXPLICIT_CONSTRAINT_CHILDREN'||frameDecision.full_constraint_execution_authorized!==false||frameDecision.full_coverage_authorized!==false)throw new Error('FRAME19_DECISION_INVALID');
if(extensionPart.status!=='PASS'||extensionPart.parent_count!==19||extensionPart.child_count!==95||extensionPart.split_field!=='extension_frame_type'||extensionPart.partition_overlap_count!==0||extensionPart.partition_gap_count!==0||extensionPart.coverage_preservation_status!=='PASS')throw new Error('EXTENSION_PARTITION_MODEL_INVALID');
if(extensionClosure.status!=='PASS'||extensionClosure.closed_extension_child_count!==95||extensionClosure.unresolved_extension_child_count!==0||extensionClosure.all_95_extension_children_covered!==true||extensionClosure.execution_performed!==false)throw new Error('EXTENSION95_CLOSURE_SOURCE_INVALID');
if(extensionDecision.next_recovery_action!=='EXTENSION_FRAME_TYPE_95_TO_FRAME_INSTALLATION_MODE_21_CLOSURE_PROOF_READY'||extensionDecision.full_coverage_authorized!==false)throw new Error('EXTENSION95_CLOSURE_DECISION_INVALID');

const frameChildren=frameBinding.children??[];
if(frameChildren.length!==21)throw new Error('FRAME21_CHILD_COUNT_INVALID');
const frameFp=new Set(frameChildren.map(x=>x.selection_fingerprint));
if(frameFp.size!==21)throw new Error('FRAME21_FINGERPRINT_IDENTITY_INVALID');
const directClosed=frameChildren.filter(x=>x.execution_status==='PASS_BY_RECURSIVE_LEAF_CLOSURE'&&Number(x.closure_terminal_leaf_count??0)>0);
const unresolvedModel=frameChildren.filter(x=>x.execution_status!=='PASS_BY_RECURSIVE_LEAF_CLOSURE');
if(directClosed.length!==2||directClosed.some(x=>Number(x.closure_terminal_leaf_count??0)!==14)||unresolvedModel.length!==19)throw new Error('FRAME21_PRIOR_CLOSURE_SET_INVALID');

const frameExecByFp=new Map(frameExec.results.map(x=>[x.selection_fingerprint,x]));
if(frameExecByFp.size!==19||frameExec.results.some(x=>x.status!=='NEEDS_FURTHER_PARTITIONING'||x.constraint_start_valid!==true||x.constraint_progress_valid!==true))throw new Error('FRAME19_SLOW_SET_INVALID');
const unresolvedFp=new Set(unresolvedModel.map(x=>x.selection_fingerprint));
if(!sameIds(frameExecByFp.keys(),unresolvedFp))throw new Error('FRAME19_EXEC_TO_MODEL_IDENTITY_INVALID');
for(const m of unresolvedModel){
  const x=frameExecByFp.get(m.selection_fingerprint);
  if(!x||x.lane_id!==m.lane_id||x.product_node!==m.product_node||x.decision_key!==m.decision_key)throw new Error('FRAME19_EXEC_TO_MODEL_BINDING_MISMATCH:'+m.selection_fingerprint);
}

const extensionParentByFp=new Map(extensionPart.parents.map(x=>[x.parent_selection_fingerprint,x]));
if(extensionParentByFp.size!==19||!sameIds(extensionParentByFp.keys(),frameExecByFp.keys()))throw new Error('FRAME19_TO_EXTENSION19_IDENTITY_INVALID');
const extensionModelById=new Map(extensionPart.children.map(x=>[x.child_id,x]));
const closedExtensionIds=new Set(extensionClosure.extension_child_ids??[]);
if(closedExtensionIds.size!==95||!sameIds(closedExtensionIds,extensionModelById.keys()))throw new Error('EXTENSION95_CLOSED_IDENTITY_INVALID');
const extensionChildrenByParent=new Map();
for(const c of extensionPart.children){const a=extensionChildrenByParent.get(c.parent_id)??[];a.push(c);extensionChildrenByParent.set(c.parent_id,a)}
if(extensionChildrenByParent.size!==19)throw new Error('EXTENSION_PARENT_COUNT_INVALID');

const frameBridgeRecords=[];
for(const [fp,source] of frameExecByFp){
  const p=extensionParentByFp.get(fp),model=frameChildren.find(x=>x.selection_fingerprint===fp);
  if(!p||!model)throw new Error('FRAME19_SOURCE_MISSING:'+fp);
  if(source.lane_id!==p.lane_id||source.product_node!==p.product_node||source.decision_key!==p.parent_decision_key||model.lane_id!==p.lane_id||model.product_node!==p.product_node||model.decision_key!==p.parent_decision_key)throw new Error('FRAME_TO_EXTENSION_SOURCE_BINDING_MISMATCH:'+fp);
  const kids=(extensionChildrenByParent.get(p.parent_id)??[]).sort((a,b)=>String(a.split_decision_key).localeCompare(String(b.split_decision_key)));
  if(kids.length!==5||kids.some(x=>!closedExtensionIds.has(x.child_id)))throw new Error('EXTENSION_PARENT_NOT_CLOSED:'+p.parent_id);
  frameBridgeRecords.push({selection_fingerprint:fp,lane_id:p.lane_id,product_node:p.product_node,frame_decision_key:p.parent_decision_key,extension_parent_id:p.parent_id,frame_source_status:source.status,extension_partition_overlap_count:p.partition_overlap_count,extension_partition_gap_count:p.partition_gap_count,extension_child_ids:kids.map(x=>x.child_id),extension_decisions:kids.map(x=>x.split_decision_key),extension_child_closed:kids.map(x=>closedExtensionIds.has(x.child_id)),closure_status:'PASS'});
}
if(frameBridgeRecords.length!==19||frameBridgeRecords.some(x=>x.closure_status!=='PASS'||x.extension_partition_overlap_count!==0||x.extension_partition_gap_count!==0||x.extension_child_ids.length!==5||x.extension_child_closed.some(v=>v!==true)))throw new Error('FRAME19_CLOSURE_INVALID');

const closedFrameFp=new Set([...directClosed.map(x=>x.selection_fingerprint),...frameBridgeRecords.map(x=>x.selection_fingerprint)]);
const all21=closedFrameFp.size===21&&sameIds(closedFrameFp,frameFp);
if(!all21)throw new Error('FRAME21_CLOSURE_INVALID');
const dependencyFingerprint=hash({runtime_manifest_sha256:runtimeHash,selector_batch_runner_blob:BB,full_selector_proof_blob:FB,source_artifact_digest:SD,frame_binding_semantic_hash:hash(frameBinding),frame_execution_semantic_hash:hash(frameExec),extension_partition_semantic_hash:hash(extensionPart),extension95_closure_semantic_hash:hash(extensionClosure)});
const binding={source_exact_head:SH,source_run_id:Number(SR),source_artifact_identity:SA,source_artifact_sha256:SD,current_exact_head:head,changed_paths:changed,dependency_fingerprint:dependencyFingerprint,impact_decision:'CLOSURE_ONLY_ANALYZER_CHANGE_SOURCE_MEASUREMENTS_BOUND_AND_REVALIDATED',measurement_reexecuted:false};

for(const f of readdirSync(s).filter(x=>x.endsWith('.json'))){const d=rd(`${s}/${f}`);writeJson(`${OUT}/${f}`,{...d,exact_head:head,source_bound_exact_head:SH,measurement_reexecuted:false,evidence_origin:'CURRENT_HEAD_BOUND_SOURCE_EVIDENCE_NO_REEXECUTION',current_head_evidence_binding:binding})}
writeJson(`${OUT}/explicit-constraint-extension-frame95-to-frame-installation-mode19-closure-proof.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_EXTENSION_FRAME95_TO_FRAME_INSTALLATION_MODE19_CLOSURE_PROOF',exact_head:head,current_runtime_manifest_sha256:runtimeHash,current_head_evidence_binding:binding,frame_slow_source_count:19,frame_slow_direct_source_status:'NEEDS_FURTHER_PARTITIONING',extension_partition_parent_count:19,extension_partition_child_count:95,extension_closed_child_count:95,frame_slow_closed_via_extension_count:19,frame_slow_unresolved_count:0,all_19_frame_slow_children_closed:true,bridge_records:frameBridgeRecords,execution_performed:false,status:'PASS'});
writeJson(`${OUT}/explicit-constraint-frame-installation-mode21-closure-proof.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_FRAME_INSTALLATION_MODE21_CLOSURE_PROOF',exact_head:head,current_runtime_manifest_sha256:runtimeHash,current_head_evidence_binding:binding,model_lane_count:7,model_decision_child_count:21,direct_recursive_leaf_closed_child_count:2,direct_recursive_leaf_terminal_count:28,partition_bridge_closed_child_count:19,closed_frame_child_count:21,unresolved_frame_child_count:0,all_21_frame_installation_mode_children_covered:true,closed_selection_fingerprints:[...closedFrameFp].sort(),execution_performed:false,status:'PASS'});
writeJson(`${OUT}/explicit-constraint-frame-installation-mode21-closure-decision.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_FRAME_INSTALLATION_MODE21_CLOSURE_DECISION',exact_head:head,all_19_remaining_frame_children_closed:true,all_21_frame_installation_mode_children_covered:true,closed_frame_child_count:21,unresolved_frame_child_count:0,next_recovery_action:'FRAME_INSTALLATION_MODE_21_TO_ORIGINAL_514_CLOSURE_PROOF_READY',frame_reexecution_authorized:false,extension_frame_reexecution_authorized:false,new_partition_authorized:false,full_constraint_execution_authorized:false,full_coverage_authorized:false,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_EXTENSION_FRAME_95_TO_FRAME_INSTALLATION_MODE_21_CLOSURE_PROOF',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:'DIAGNOSTIC_COMPLETE'});
console.log('EXTENSION_FRAME_95_CLOSED=95/95');
console.log('FRAME_INSTALLATION_MODE_REMAINING19_CLOSED_VIA_EXTENSION=19/19');
console.log('FRAME_INSTALLATION_MODE_DIRECT_PRIOR_CLOSED=2/2');
console.log('FRAME_INSTALLATION_MODE_21_CLOSED=21/21');
console.log('NEXT_RECOVERY_ACTION=FRAME_INSTALLATION_MODE_21_TO_ORIGINAL_514_CLOSURE_PROOF_READY');
console.log('EXPLORATION_EXECUTION_PERFORMED=FALSE');
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');