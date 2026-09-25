import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const P='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const B='scripts/governance/uchirimo-selector-batch-runner.mjs';
const F='scripts/uchirimo-full-selector-proof.mjs';
const R='Takuro-Kwkm/sash-app';
const SR='36102824069';
const SH='d6dc854065579b69372db9f181060009aa258c46';
const SA=`uchirimo-heavy-recovery-analysis-${SH}`;
const SD='sha256:17d0f0e56505bda556a8620fe64304003dc1af4f78e87e9f2e853aa76079e5e1';
const SB='e18f8e7b182e0332bb7ed40524b7b02d8ecbb2a6';
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
const t=String(process.env.RUNNER_TEMP??'/tmp'),s=`${t}/uextension95-closure-${SR}`;
dl(SR,SA,s);

const extensionPart=rd(`${s}/explicit-constraint-remaining19-extension-frame-partition-model-proof.json`);
const extensionCal=rd(`${s}/explicit-constraint-remaining19-extension-frame-representative-calibration.json`);
const extensionExec=rd(`${s}/explicit-constraint-remaining76-extension-frame-execution.json`);
const extensionDecision=rd(`${s}/explicit-constraint-remaining76-extension-frame-decision.json`);
const reinforcementPart=rd(`${s}/explicit-constraint-slow19-reinforcement-partition-model-proof.json`);
const reinforcementClosure=rd(`${s}/explicit-constraint-reinforcement114-closure-proof.json`);
const reinforcementDecision=rd(`${s}/explicit-constraint-reinforcement114-closure-decision.json`);

const rt=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
const runtimeHash=rt?.sourcePackageIntegrity?.actual??null;
if(!rt?.sourcePackageIntegrity?.match||!runtimeHash)throw new Error('RUNTIME_IDENTITY_INVALID');
for(const [name,x] of Object.entries({extensionPart,extensionExec,reinforcementPart,reinforcementClosure})){
  if(x.exact_head!==SH)throw new Error('SOURCE_EXACT_HEAD_MISMATCH:'+name);
  if(x.current_runtime_manifest_sha256!==runtimeHash)throw new Error('RUNTIME_IDENTITY_CHANGED:'+name);
}
if(extensionCal.exact_head!==SH||extensionDecision.exact_head!==SH||reinforcementDecision.exact_head!==SH)throw new Error('SOURCE_EXACT_HEAD_MISMATCH:decision_or_calibration');
for(const [name,x] of Object.entries({extensionPart,extensionCal,extensionExec,extensionDecision,reinforcementPart,reinforcementClosure,reinforcementDecision})){
  const b=x.current_head_evidence_binding;
  if(!b||b.current_exact_head!==SH||b.measurement_reexecuted!==false)throw new Error('SOURCE_CURRENT_HEAD_BINDING_INVALID:'+name);
}
if(extensionPart.source_run_id!==36071450296||extensionPart.source_artifact_digest!=='sha256:6f5f846d13314910b33ff855f6cb978f09ed6153b3671726e9643bbc45c325bc')throw new Error('EXTENSION_PARTITION_SOURCE_BINDING_INVALID');
if(extensionCal.source_run_id!==36074654997||extensionCal.source_artifact_digest!=='sha256:9116ff7b26024835d4511e1cc2a82ede25ee9306ad080d9a07702765d9bca763')throw new Error('EXTENSION_CALIBRATION_SOURCE_BINDING_INVALID');
if(extensionExec.source_run_id!==36076441589||extensionExec.source_artifact_digest!=='sha256:54db7e1f526b0b0e578fcc4bf7b5c23d1294ea515e1841a11b0300e17226f5ae')throw new Error('EXTENSION_EXECUTION_SOURCE_BINDING_INVALID');
if(reinforcementPart.source_run_id!==36077493632||reinforcementPart.source_artifact_digest!=='sha256:57ef204966e9645e68596b77905198c771414a379adfa8d73796488a41d6e996')throw new Error('REINFORCEMENT_PARTITION_SOURCE_BINDING_INVALID');

if(extensionPart.status!=='PASS'||extensionPart.parent_count!==19||extensionPart.child_count!==95||extensionPart.split_field!=='extension_frame_type'||extensionPart.partition_overlap_count!==0||extensionPart.partition_gap_count!==0||extensionPart.coverage_preservation_status!=='PASS')throw new Error('EXTENSION_PARTITION_MODEL_INVALID');
if(extensionCal.status!=='PASS'||extensionCal.representative_count!==19||extensionCal.representative_pass_count!==19||extensionCal.representative_nonempty_pass_count!==19||extensionCal.representative_empty_pass_count!==0||extensionCal.representative_needs_further_partitioning_count!==0||extensionCal.representative_invalid_count!==0||extensionCal.representative_execution_verified!==true)throw new Error('EXTENSION_REPRESENTATIVE_INVALID');
if(extensionExec.status!=='MEASURED_PARTIAL'||extensionExec.executed_child_count!==76||extensionExec.pass_count!==57||extensionExec.nonempty_pass_count!==57||extensionExec.empty_pass_count!==0||extensionExec.needs_further_partitioning_count!==19||extensionExec.execution_invalid_count!==0||extensionExec.unresolved_extension_child_count!==19||extensionExec.all_95_extension_children_covered!==false)throw new Error('EXTENSION_REMAINING76_INVALID');
if(extensionDecision.next_recovery_action!=='PARTITION_ONLY_SLOW_REMAINING_EXTENSION_FRAME_CHILDREN'||extensionDecision.remaining_76_reexecution_authorized!==false||extensionDecision.full_constraint_execution_authorized!==false||extensionDecision.full_coverage_authorized!==false)throw new Error('EXTENSION_DECISION_INVALID');

if(reinforcementPart.status!=='PASS'||reinforcementPart.parent_count!==19||reinforcementPart.child_count!==114||reinforcementPart.split_field!=='extension_frame_reinforcement'||reinforcementPart.PARTITION_OVERLAP_COUNT!==0||reinforcementPart.PARTITION_GAP_COUNT!==0||reinforcementPart.coverage_preservation_status!=='PASS')throw new Error('REINFORCEMENT_PARTITION_MODEL_INVALID');
if(reinforcementClosure.status!=='PASS'||reinforcementClosure.closed_reinforcement_child_count!==114||reinforcementClosure.unresolved_reinforcement_child_count!==0||reinforcementClosure.all_114_reinforcement_children_covered!==true||reinforcementClosure.execution_performed!==false)throw new Error('REINFORCEMENT114_CLOSURE_SOURCE_INVALID');
if(reinforcementDecision.next_recovery_action!=='REINFORCEMENT_114_TO_EXTENSION_FRAME_TYPE_SLOW19_CLOSURE_PROOF_READY'||reinforcementDecision.full_coverage_authorized!==false)throw new Error('REINFORCEMENT114_CLOSURE_DECISION_INVALID');

const extensionModelById=new Map(extensionPart.children.map(x=>[x.child_id,x]));
const representative=extensionCal.representatives;
const directPass=extensionExec.results.filter(x=>x.status==='PASS');
const slow=extensionExec.results.filter(x=>x.status==='NEEDS_FURTHER_PARTITIONING');
if(representative.length!==19||representative.some(x=>x.split_decision_key!=='UNSET'||x.status!=='PASS'||Number(x.terminal_context_count??0)<=0))throw new Error('EXTENSION_REPRESENTATIVE_SET_INVALID');
if(directPass.length!==57||directPass.some(x=>!['none','fukashi_25','fukashi_40'].includes(x.split_decision?.value)||Number(x.terminal_context_count??0)<=0))throw new Error('EXTENSION_DIRECT_PASS_SET_INVALID');
if(slow.length!==19||slow.some(x=>x.split_decision?.value!=='fukashi_60'||x.constraint_start_valid!==true||x.constraint_progress_valid!==true))throw new Error('EXTENSION_FUKASHI60_SLOW19_SET_INVALID');
const measuredExtensionIds=new Set([...representative,...extensionExec.results].map(x=>x.child_id));
if(measuredExtensionIds.size!==95||!sameIds(measuredExtensionIds,extensionModelById.keys()))throw new Error('EXTENSION_95_IDENTITY_INVALID');

const extensionChildrenByParent=new Map();
for(const c of extensionPart.children){const a=extensionChildrenByParent.get(c.parent_id)??[];a.push(c);extensionChildrenByParent.set(c.parent_id,a)}
const extensionMeasuredById=new Map([...representative,...extensionExec.results].map(x=>[x.child_id,x]));
const expectedExtensionDecisionKeys=['UNSET','VALUE:"none"','VALUE:"fukashi_25"','VALUE:"fukashi_40"','VALUE:"fukashi_60"'].sort();
for(const p of extensionPart.parents){
  const kids=extensionChildrenByParent.get(p.parent_id)??[];
  const keys=kids.map(x=>x.split_decision_key).sort();
  const slowKids=kids.filter(x=>extensionMeasuredById.get(x.child_id)?.status==='NEEDS_FURTHER_PARTITIONING');
  const passKids=kids.filter(x=>extensionMeasuredById.get(x.child_id)?.status==='PASS');
  if(kids.length!==5||sj(keys)!==sj(expectedExtensionDecisionKeys)||slowKids.length!==1||slowKids[0].split_decision?.value!=='fukashi_60'||passKids.length!==4)throw new Error('EXTENSION_PARENT_DOMAIN_INVALID:'+p.parent_id);
}

const reinforcementModelById=new Map(reinforcementPart.children.map(x=>[x.child_id,x]));
const closedReinforcementIds=new Set(reinforcementClosure.reinforcement_child_ids??[]);
if(closedReinforcementIds.size!==114||!sameIds(closedReinforcementIds,reinforcementModelById.keys()))throw new Error('REINFORCEMENT114_CLOSED_IDENTITY_INVALID');
const reinforcementChildrenByParent=new Map();
for(const c of reinforcementPart.children){const a=reinforcementChildrenByParent.get(c.parent_id)??[];a.push(c);reinforcementChildrenByParent.set(c.parent_id,a)}
if(reinforcementChildrenByParent.size!==19)throw new Error('REINFORCEMENT_PARENT_COUNT_INVALID');
for(const p of reinforcementPart.parents){
  const kids=reinforcementChildrenByParent.get(p.parent_id)??[];
  if(kids.length!==6||kids.some(x=>!closedReinforcementIds.has(x.child_id)))throw new Error('REINFORCEMENT_PARENT_NOT_CLOSED:'+p.parent_id);
}

const slowById=new Map(slow.map(x=>[x.child_id,x]));
const reinforcementParentBySourceId=new Map(reinforcementPart.parents.map(x=>[x.source_child_id,x]));
if(slowById.size!==19||reinforcementParentBySourceId.size!==19||!sameIds(slowById.keys(),reinforcementParentBySourceId.keys()))throw new Error('EXTENSION_FUKASHI60_19_TO_REINFORCEMENT19_IDENTITY_INVALID');

const extensionBridgeRecords=[];
for(const [extensionChildId,source] of slowById){
  const model=extensionModelById.get(extensionChildId),p=reinforcementParentBySourceId.get(extensionChildId);
  if(!model||!p)throw new Error('EXTENSION_FUKASHI60_SOURCE_MISSING:'+extensionChildId);
  if(sj(source.constraints)!==sj(model.constraints)||sj(p.source_constraints)!==sj(model.constraints)||p.source_parent_id!==model.parent_id||p.lane_id!==source.lane_id||p.lane_id!==model.lane_id||p.product_node!==source.product_node||p.product_node!==model.product_node)throw new Error('EXTENSION_TO_REINFORCEMENT_SOURCE_BINDING_MISMATCH:'+extensionChildId);
  const kids=(reinforcementChildrenByParent.get(p.parent_id)??[]).sort((a,b)=>String(a.split_decision_key).localeCompare(String(b.split_decision_key)));
  extensionBridgeRecords.push({extension_child_id:extensionChildId,extension_parent_id:model.parent_id,reinforcement_parent_id:p.parent_id,lane_id:p.lane_id,product_node:p.product_node,extension_source_status:source.status,reinforcement_partition_overlap_count:p.partition_overlap_count,reinforcement_partition_gap_count:p.partition_gap_count,reinforcement_child_ids:kids.map(x=>x.child_id),reinforcement_decisions:kids.map(x=>x.split_decision_key),reinforcement_child_closed:kids.map(x=>closedReinforcementIds.has(x.child_id)),closure_status:'PASS'});
}
if(extensionBridgeRecords.length!==19||extensionBridgeRecords.some(x=>x.closure_status!=='PASS'||x.reinforcement_partition_overlap_count!==0||x.reinforcement_partition_gap_count!==0||x.reinforcement_child_ids.length!==6||x.reinforcement_child_closed.some(v=>v!==true)))throw new Error('EXTENSION_FUKASHI60_19_CLOSURE_INVALID');

const closedExtensionIds=new Set([...representative.map(x=>x.child_id),...directPass.map(x=>x.child_id),...extensionBridgeRecords.map(x=>x.extension_child_id)]);
const all95=closedExtensionIds.size===95&&sameIds(closedExtensionIds,extensionModelById.keys());
if(!all95)throw new Error('EXTENSION95_CLOSURE_INVALID');
const dependencyFingerprint=hash({runtime_manifest_sha256:runtimeHash,selector_batch_runner_blob:BB,full_selector_proof_blob:FB,source_artifact_digest:SD,extension_partition_semantic_hash:hash(extensionPart),extension_representative_semantic_hash:hash(extensionCal),extension_execution_semantic_hash:hash(extensionExec),reinforcement_partition_semantic_hash:hash(reinforcementPart),reinforcement114_closure_semantic_hash:hash(reinforcementClosure)});
const binding={source_exact_head:SH,source_run_id:Number(SR),source_artifact_identity:SA,source_artifact_sha256:SD,current_exact_head:head,changed_paths:changed,dependency_fingerprint:dependencyFingerprint,impact_decision:'CLOSURE_ONLY_ANALYZER_CHANGE_SOURCE_MEASUREMENTS_BOUND_AND_REVALIDATED',measurement_reexecuted:false};

for(const f of readdirSync(s).filter(x=>x.endsWith('.json'))){const d=rd(`${s}/${f}`);writeJson(`${OUT}/${f}`,{...d,exact_head:head,source_bound_exact_head:SH,measurement_reexecuted:false,evidence_origin:'CURRENT_HEAD_BOUND_SOURCE_EVIDENCE_NO_REEXECUTION',current_head_evidence_binding:binding})}
writeJson(`${OUT}/explicit-constraint-reinforcement114-to-extension-frame-fukashi60-closure-proof.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_REINFORCEMENT114_TO_EXTENSION_FRAME_FUKASHI60_CLOSURE_PROOF',exact_head:head,current_runtime_manifest_sha256:runtimeHash,current_head_evidence_binding:binding,extension_fukashi60_source_count:19,extension_fukashi60_direct_source_status:'NEEDS_FURTHER_PARTITIONING',reinforcement_partition_parent_count:19,reinforcement_partition_child_count:114,reinforcement_closed_child_count:114,extension_fukashi60_closed_via_reinforcement_count:19,extension_fukashi60_unresolved_count:0,all_19_extension_fukashi60_children_closed:true,bridge_records:extensionBridgeRecords,execution_performed:false,status:'PASS'});
writeJson(`${OUT}/explicit-constraint-extension-frame95-closure-proof.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_EXTENSION_FRAME95_CLOSURE_PROOF',exact_head:head,current_runtime_manifest_sha256:runtimeHash,current_head_evidence_binding:binding,partition_parent_count:19,partition_child_count:95,partition_overlap_count:0,partition_gap_count:0,coverage_preservation_status:'PASS',representative_unset_pass_count:19,remaining_direct_pass_count:57,direct_pass_child_count:76,partition_bridge_closed_fukashi60_child_count:19,closed_extension_child_count:95,unresolved_extension_child_count:0,all_95_extension_children_covered:true,extension_child_ids:[...closedExtensionIds].sort(),execution_performed:false,status:'PASS'});
writeJson(`${OUT}/explicit-constraint-extension-frame95-closure-decision.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_EXTENSION_FRAME95_CLOSURE_DECISION',exact_head:head,all_19_extension_fukashi60_children_closed:true,all_95_extension_children_covered:true,closed_extension_child_count:95,unresolved_extension_child_count:0,next_recovery_action:'EXTENSION_FRAME_TYPE_95_TO_FRAME_INSTALLATION_MODE_21_CLOSURE_PROOF_READY',extension_frame_reexecution_authorized:false,reinforcement_reexecution_authorized:false,new_partition_authorized:false,full_constraint_execution_authorized:false,full_coverage_authorized:false,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_REINFORCEMENT_114_TO_EXTENSION_FRAME_TYPE_SLOW19_CLOSURE_PROOF',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:'DIAGNOSTIC_COMPLETE'});
console.log('REINFORCEMENT_114_CLOSED=114/114');
console.log('EXTENSION_FUKASHI60_19_CLOSED_VIA_REINFORCEMENT=19/19');
console.log('EXTENSION_FRAME_95_CLOSED=95/95');
console.log('EXTENSION_DIRECT_PASS_COUNT=76');
console.log('EXTENSION_PARTITION_BRIDGE_CLOSED_COUNT=19');
console.log('NEXT_RECOVERY_ACTION=EXTENSION_FRAME_TYPE_95_TO_FRAME_INSTALLATION_MODE_21_CLOSURE_PROOF_READY');
console.log('EXPLORATION_EXECUTION_PERFORMED=FALSE');
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
