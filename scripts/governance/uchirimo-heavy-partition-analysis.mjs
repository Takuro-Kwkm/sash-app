import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const P='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const B='scripts/governance/uchirimo-selector-batch-runner.mjs';
const F='scripts/uchirimo-full-selector-proof.mjs';
const R='Takuro-Kwkm/sash-app';
const SR='36101676425';
const SH='5c26bacb6cf2286263994b1ceaee31a6a9bca72b';
const SA=`uchirimo-heavy-recovery-analysis-${SH}`;
const SD='sha256:ea4895dcbe394e33c3a6189ed239108c36dad7239bf93481f5935d567fc80bcf';
const SB='1b792c379f8ce2c95919cd3ed04cb61e105c9788';
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
const t=String(process.env.RUNNER_TEMP??'/tmp'),s=`${t}/ureinforcement114-closure-${SR}`;
dl(SR,SA,s);

const reinforcementPart=rd(`${s}/explicit-constraint-slow19-reinforcement-partition-model-proof.json`);
const reinforcementCal=rd(`${s}/explicit-constraint-slow19-reinforcement-representative-calibration.json`);
const reinforcementExec=rd(`${s}/explicit-constraint-remaining95-reinforcement-execution.json`);
const reinforcementDecision=rd(`${s}/explicit-constraint-remaining95-reinforcement-decision.json`);
const constructionPart=rd(`${s}/explicit-constraint-slow19-bracket-construction-partition-model-proof.json`);
const constructionClosure=rd(`${s}/explicit-constraint-construction57-closure-proof.json`);
const constructionDecision=rd(`${s}/explicit-constraint-construction57-closure-decision.json`);

const rt=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
const runtimeHash=rt?.sourcePackageIntegrity?.actual??null;
if(!rt?.sourcePackageIntegrity?.match||!runtimeHash)throw new Error('RUNTIME_IDENTITY_INVALID');
for(const [name,x] of Object.entries({reinforcementPart,reinforcementCal,reinforcementExec,constructionPart,constructionClosure})){
  if(x.exact_head!==SH)throw new Error('SOURCE_EXACT_HEAD_MISMATCH:'+name);
  if(x.current_runtime_manifest_sha256!==runtimeHash)throw new Error('RUNTIME_IDENTITY_CHANGED:'+name);
}
for(const [name,x] of Object.entries({reinforcementPart,reinforcementCal,reinforcementExec,constructionPart,constructionClosure})){
  const b=x.current_head_evidence_binding;
  if(!b||b.current_exact_head!==SH||b.measurement_reexecuted!==false)throw new Error('SOURCE_CURRENT_HEAD_BINDING_INVALID:'+name);
}
if(reinforcementPart.source_run_id!==36077493632||reinforcementPart.source_artifact_digest!=='sha256:57ef204966e9645e68596b77905198c771414a379adfa8d73796488a41d6e996')throw new Error('REINFORCEMENT_PARTITION_SOURCE_BINDING_INVALID');
if(reinforcementCal.source_run_id!==36080020201||reinforcementCal.source_artifact_digest!=='sha256:72ea711929d72afb5bd3b2d515802edf81d6e7d9f1447c405723791325ac9a15')throw new Error('REINFORCEMENT_CALIBRATION_SOURCE_BINDING_INVALID');
if(reinforcementExec.source_run_id!==36081608404||reinforcementExec.source_artifact_digest!=='sha256:f850c91b5a1b5c1ad4dafab476cce49b7e350af7aed4ba8b683fb5932be04a43')throw new Error('REINFORCEMENT_EXECUTION_SOURCE_BINDING_INVALID');
if(constructionPart.source_run_id!==36083813009||constructionPart.source_artifact_digest!=='sha256:a70b4b877dcd67121552968501314abe71e09d5a6d43e0532e2784c12e48aecb')throw new Error('CONSTRUCTION_PARTITION_SOURCE_BINDING_INVALID');

if(reinforcementPart.status!=='PASS'||reinforcementPart.parent_count!==19||reinforcementPart.child_count!==114||reinforcementPart.split_field!=='extension_frame_reinforcement'||reinforcementPart.PARTITION_OVERLAP_COUNT!==0||reinforcementPart.PARTITION_GAP_COUNT!==0||reinforcementPart.coverage_preservation_status!=='PASS')throw new Error('REINFORCEMENT_PARTITION_MODEL_INVALID');
if(reinforcementCal.status!=='PASS'||reinforcementCal.representative_count!==19||reinforcementCal.representative_pass_count!==19||reinforcementCal.representative_nonempty_pass_count!==19||reinforcementCal.representative_empty_pass_count!==0||reinforcementCal.representative_needs_further_partitioning_count!==0||reinforcementCal.representative_invalid_count!==0||reinforcementCal.representative_execution_verified!==true)throw new Error('REINFORCEMENT_REPRESENTATIVE_INVALID');
if(reinforcementExec.status!=='MEASURED_PARTIAL'||reinforcementExec.executed_child_count!==95||reinforcementExec.pass_count!==76||reinforcementExec.nonempty_pass_count!==76||reinforcementExec.empty_pass_count!==0||reinforcementExec.needs_further_partitioning_count!==19||reinforcementExec.execution_invalid_count!==0||reinforcementExec.unresolved_reinforcement_child_count!==19||reinforcementExec.all_114_reinforcement_children_covered!==false)throw new Error('REINFORCEMENT_REMAINING95_INVALID');
if(reinforcementDecision.next_recovery_action!=='PARTITION_ONLY_SLOW_REMAINING_REINFORCEMENT_CHILDREN'||reinforcementDecision.remaining_95_reexecution_authorized!==false||reinforcementDecision.full_constraint_execution_authorized!==false||reinforcementDecision.full_coverage_authorized!==false)throw new Error('REINFORCEMENT_DECISION_INVALID');

if(constructionPart.status!=='PASS'||constructionPart.parent_count!==19||constructionPart.child_count!==57||constructionPart.split_field!=='construction'||constructionPart.PARTITION_OVERLAP_COUNT!==0||constructionPart.PARTITION_GAP_COUNT!==0||constructionPart.coverage_preservation_status!=='PASS')throw new Error('CONSTRUCTION_PARTITION_MODEL_INVALID');
if(constructionClosure.status!=='PASS'||constructionClosure.closed_construction_child_count!==57||constructionClosure.unresolved_construction_child_count!==0||constructionClosure.all_57_construction_children_covered!==true||constructionClosure.execution_performed!==false)throw new Error('CONSTRUCTION57_CLOSURE_SOURCE_INVALID');
if(constructionDecision.next_recovery_action!=='CONSTRUCTION_57_TO_REINFORCEMENT_BRACKET_SLOW19_CLOSURE_PROOF_READY'||constructionDecision.full_coverage_authorized!==false)throw new Error('CONSTRUCTION57_CLOSURE_DECISION_INVALID');

const reinforcementModelById=new Map(reinforcementPart.children.map(x=>[x.child_id,x]));
const representative=reinforcementCal.representatives;
const directPass=reinforcementExec.results.filter(x=>x.status==='PASS');
const slow=reinforcementExec.results.filter(x=>x.status==='NEEDS_FURTHER_PARTITIONING');
if(representative.length!==19||representative.some(x=>x.split_decision?.value!=='none'||x.status!=='PASS'||Number(x.terminal_context_count??0)<=0))throw new Error('REINFORCEMENT_REPRESENTATIVE_SET_INVALID');
if(directPass.length!==76||directPass.some(x=>Number(x.terminal_context_count??0)<=0))throw new Error('REINFORCEMENT_DIRECT_PASS_SET_INVALID');
if(slow.length!==19||slow.some(x=>x.split_decision?.value!=='reinforcement_bracket'||x.constraint_start_valid!==true||x.constraint_progress_valid!==true))throw new Error('REINFORCEMENT_BRACKET_SLOW19_SET_INVALID');
const measuredReinforcementIds=new Set([...representative,...reinforcementExec.results].map(x=>x.child_id));
if(measuredReinforcementIds.size!==114||!sameIds(measuredReinforcementIds,reinforcementModelById.keys()))throw new Error('REINFORCEMENT_114_IDENTITY_INVALID');

const reinforcementChildrenByParent=new Map();
for(const c of reinforcementPart.children){const a=reinforcementChildrenByParent.get(c.parent_id)??[];a.push(c);reinforcementChildrenByParent.set(c.parent_id,a)}
const reinforcementMeasuredById=new Map([...representative,...reinforcementExec.results].map(x=>[x.child_id,x]));
const expectedReinforcementValues=['construction_material_floor_supported','none','reinforcement_bracket','reinforcement_bundle','reinforcement_square_pipe','stepped_fukashi_60'].sort();
for(const p of reinforcementPart.parents){
  const kids=reinforcementChildrenByParent.get(p.parent_id)??[];
  const values=kids.map(x=>x.split_decision?.value).sort();
  const slowKids=kids.filter(x=>reinforcementMeasuredById.get(x.child_id)?.status==='NEEDS_FURTHER_PARTITIONING');
  const passKids=kids.filter(x=>reinforcementMeasuredById.get(x.child_id)?.status==='PASS');
  if(kids.length!==6||sj(values)!==sj(expectedReinforcementValues)||slowKids.length!==1||slowKids[0].split_decision?.value!=='reinforcement_bracket'||passKids.length!==5)throw new Error('REINFORCEMENT_PARENT_DOMAIN_INVALID:'+p.parent_id);
}

const constructionModelById=new Map(constructionPart.children.map(x=>[x.child_id,x]));
const closedConstructionIds=new Set(constructionClosure.construction_child_ids??[]);
if(closedConstructionIds.size!==57||!sameIds(closedConstructionIds,constructionModelById.keys()))throw new Error('CONSTRUCTION57_CLOSED_IDENTITY_INVALID');
const constructionChildrenByParent=new Map();
for(const c of constructionPart.children){const a=constructionChildrenByParent.get(c.parent_id)??[];a.push(c);constructionChildrenByParent.set(c.parent_id,a)}
if(constructionChildrenByParent.size!==19)throw new Error('CONSTRUCTION_PARENT_COUNT_INVALID');
for(const p of constructionPart.parents){
  const kids=constructionChildrenByParent.get(p.parent_id)??[];
  const values=kids.map(x=>x.split_decision?.value).sort();
  if(kids.length!==3||sj(values)!==sj(['rc','unknown','wood'])||kids.some(x=>!closedConstructionIds.has(x.child_id)))throw new Error('CONSTRUCTION_PARENT_NOT_CLOSED:'+p.parent_id);
}

const slowById=new Map(slow.map(x=>[x.child_id,x]));
const constructionParentBySourceId=new Map(constructionPart.parents.map(x=>[x.source_child_id,x]));
if(slowById.size!==19||constructionParentBySourceId.size!==19||!sameIds(slowById.keys(),constructionParentBySourceId.keys()))throw new Error('REINFORCEMENT_BRACKET19_TO_CONSTRUCTION19_IDENTITY_INVALID');

const bracketBridgeRecords=[];
for(const [reinforcementChildId,source] of slowById){
  const model=reinforcementModelById.get(reinforcementChildId),p=constructionParentBySourceId.get(reinforcementChildId);
  if(!model||!p)throw new Error('REINFORCEMENT_BRACKET_SOURCE_MISSING:'+reinforcementChildId);
  if(sj(source.constraints)!==sj(model.constraints)||sj(p.source_constraints)!==sj(model.constraints)||sj(p.selector_prefix)!==sj(model.selector_prefix)||p.lane_id!==source.lane_id||p.lane_id!==model.lane_id||p.product_node!==source.product_node||p.product_node!==model.product_node)throw new Error('REINFORCEMENT_TO_CONSTRUCTION_SOURCE_BINDING_MISMATCH:'+reinforcementChildId);
  const kids=(constructionChildrenByParent.get(p.parent_id)??[]).sort((a,b)=>String(a.split_decision_key).localeCompare(String(b.split_decision_key)));
  bracketBridgeRecords.push({reinforcement_child_id:reinforcementChildId,reinforcement_parent_id:model.parent_id,construction_parent_id:p.parent_id,lane_id:p.lane_id,product_node:p.product_node,reinforcement_source_status:source.status,construction_partition_overlap_count:p.partition_overlap_count,construction_partition_gap_count:p.partition_gap_count,construction_child_ids:kids.map(x=>x.child_id),construction_decisions:kids.map(x=>x.split_decision_key),construction_child_closed:kids.map(x=>closedConstructionIds.has(x.child_id)),closure_status:'PASS'});
}
if(bracketBridgeRecords.length!==19||bracketBridgeRecords.some(x=>x.closure_status!=='PASS'||x.construction_partition_overlap_count!==0||x.construction_partition_gap_count!==0||x.construction_child_ids.length!==3||x.construction_child_closed.some(v=>v!==true)))throw new Error('REINFORCEMENT_BRACKET19_CLOSURE_INVALID');

const closedReinforcementIds=new Set([...representative.map(x=>x.child_id),...directPass.map(x=>x.child_id),...bracketBridgeRecords.map(x=>x.reinforcement_child_id)]);
const all114=closedReinforcementIds.size===114&&sameIds(closedReinforcementIds,reinforcementModelById.keys());
if(!all114)throw new Error('REINFORCEMENT114_CLOSURE_INVALID');
const dependencyFingerprint=hash({runtime_manifest_sha256:runtimeHash,selector_batch_runner_blob:BB,full_selector_proof_blob:FB,source_artifact_digest:SD,reinforcement_partition_semantic_hash:hash(reinforcementPart),reinforcement_representative_semantic_hash:hash(reinforcementCal),reinforcement_execution_semantic_hash:hash(reinforcementExec),construction_partition_semantic_hash:hash(constructionPart),construction57_closure_semantic_hash:hash(constructionClosure)});
const binding={source_exact_head:SH,source_run_id:Number(SR),source_artifact_identity:SA,source_artifact_sha256:SD,current_exact_head:head,changed_paths:changed,dependency_fingerprint:dependencyFingerprint,impact_decision:'CLOSURE_ONLY_ANALYZER_CHANGE_SOURCE_MEASUREMENTS_BOUND_AND_REVALIDATED',measurement_reexecuted:false};

for(const f of readdirSync(s).filter(x=>x.endsWith('.json'))){const d=rd(`${s}/${f}`);writeJson(`${OUT}/${f}`,{...d,exact_head:head,source_bound_exact_head:SH,measurement_reexecuted:false,evidence_origin:'CURRENT_HEAD_BOUND_SOURCE_EVIDENCE_NO_REEXECUTION',current_head_evidence_binding:binding})}
writeJson(`${OUT}/explicit-constraint-construction57-to-reinforcement-bracket19-closure-proof.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_CONSTRUCTION57_TO_REINFORCEMENT_BRACKET19_CLOSURE_PROOF',exact_head:head,current_runtime_manifest_sha256:runtimeHash,current_head_evidence_binding:binding,construction_parent_count:19,construction_child_count:57,construction_closed_child_count:57,construction_unresolved_child_count:0,all_57_construction_children_covered:true,reinforcement_bracket_source_count:19,reinforcement_bracket_direct_source_status:'NEEDS_FURTHER_PARTITIONING',reinforcement_bracket_closed_via_construction_count:19,reinforcement_bracket_unresolved_count:0,all_19_reinforcement_bracket_children_closed:true,bridge_records:bracketBridgeRecords,execution_performed:false,status:'PASS'});
writeJson(`${OUT}/explicit-constraint-reinforcement114-closure-proof.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_REINFORCEMENT114_CLOSURE_PROOF',exact_head:head,current_runtime_manifest_sha256:runtimeHash,current_head_evidence_binding:binding,partition_parent_count:19,partition_child_count:114,partition_overlap_count:0,partition_gap_count:0,coverage_preservation_status:'PASS',representative_none_pass_count:19,remaining_direct_pass_count:76,direct_pass_child_count:95,partition_bridge_closed_reinforcement_bracket_child_count:19,closed_reinforcement_child_count:114,unresolved_reinforcement_child_count:0,all_114_reinforcement_children_covered:true,reinforcement_child_ids:[...closedReinforcementIds].sort(),execution_performed:false,status:'PASS'});
writeJson(`${OUT}/explicit-constraint-reinforcement114-closure-decision.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_REINFORCEMENT114_CLOSURE_DECISION',exact_head:head,all_19_reinforcement_bracket_children_closed:true,all_114_reinforcement_children_covered:true,closed_reinforcement_child_count:114,unresolved_reinforcement_child_count:0,next_recovery_action:'REINFORCEMENT_114_TO_EXTENSION_FRAME_TYPE_SLOW19_CLOSURE_PROOF_READY',reinforcement_reexecution_authorized:false,construction_reexecution_authorized:false,new_partition_authorized:false,full_constraint_execution_authorized:false,full_coverage_authorized:false,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_CONSTRUCTION_57_TO_REINFORCEMENT_BRACKET_SLOW19_CLOSURE_PROOF',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:'DIAGNOSTIC_COMPLETE'});
console.log('CONSTRUCTION_57_SOURCE_CLOSED=57/57');
console.log('REINFORCEMENT_BRACKET19_CLOSED_VIA_CONSTRUCTION=19/19');
console.log('REINFORCEMENT_114_CLOSED=114/114');
console.log('REINFORCEMENT_DIRECT_PASS_COUNT=95');
console.log('REINFORCEMENT_PARTITION_BRIDGE_CLOSED_COUNT=19');
console.log('NEXT_RECOVERY_ACTION=REINFORCEMENT_114_TO_EXTENSION_FRAME_TYPE_SLOW19_CLOSURE_PROOF_READY');
console.log('EXPLORATION_EXECUTION_PERFORMED=FALSE');
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
