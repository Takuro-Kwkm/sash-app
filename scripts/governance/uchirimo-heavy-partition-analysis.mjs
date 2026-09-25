import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const P='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const B='scripts/governance/uchirimo-selector-batch-runner.mjs';
const F='scripts/uchirimo-full-selector-proof.mjs';
const R='Takuro-Kwkm/sash-app';
const SR='36099252863';
const SH='92d9605df565dd1bd88b5cf320efeeaf9bdf7d06';
const SA=`uchirimo-heavy-recovery-analysis-${SH}`;
const SD='sha256:1716bc35b8ecdc47b6a8dc3c92cfd8664bb7a152a168c88dd37997d631c27f6b';
const SB='1ab61eb287c87ef183b68fb5d823846efe89f6de';
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
const t=String(process.env.RUNNER_TEMP??'/tmp'),s=`${t}/uwall-surface57-closure-${SR}`;
dl(SR,SA,s);

const wallPart=rd(`${s}/explicit-constraint-slow19-wood-wall-surface-partition-model-proof.json`);
const wallCal=rd(`${s}/explicit-constraint-slow19-wood-wall-surface-representative-calibration.json`);
const wallExec=rd(`${s}/explicit-constraint-remaining38-wall-surface-execution.json`);
const wallDecision=rd(`${s}/explicit-constraint-remaining38-wall-surface-decision.json`);
const constructionPart=rd(`${s}/explicit-constraint-slow19-bracket-construction-partition-model-proof.json`);
const constructionCal=rd(`${s}/explicit-constraint-slow19-bracket-construction-representative-calibration.json`);
const constructionExec=rd(`${s}/explicit-constraint-remaining38-construction-execution.json`);
const constructionDecision=rd(`${s}/explicit-constraint-remaining38-construction-decision.json`);

const rt=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
const runtimeHash=rt?.sourcePackageIntegrity?.actual??null;
if(!rt?.sourcePackageIntegrity?.match||!runtimeHash)throw new Error('RUNTIME_IDENTITY_INVALID');
for(const [name,x] of Object.entries({wallPart,wallCal,wallExec,constructionPart,constructionCal,constructionExec})){
  if(x.exact_head!==SH)throw new Error('SOURCE_EXACT_HEAD_MISMATCH:'+name);
  if(x.current_runtime_manifest_sha256!==runtimeHash)throw new Error('RUNTIME_IDENTITY_CHANGED:'+name);
}
if(wallExec.source_run_id!==36097199674||wallExec.source_artifact_digest!=='sha256:b4711f4f8e537f3302a442489d46319ad07865abf8e351129cc99ac20fbdfd4c')throw new Error('WALL_EXEC_SOURCE_BINDING_INVALID');
if(wallPart.source_run_id!==36089961893||wallPart.source_artifact_digest!=='sha256:4dc580cc97d70703f6e2a8ebf8ad0895d9525b68ce6d79a508eacd98031b6157')throw new Error('WALL_PARTITION_SOURCE_BINDING_INVALID');
if(constructionPart.source_run_id!==36083813009||constructionPart.source_artifact_digest!=='sha256:a70b4b877dcd67121552968501314abe71e09d5a6d43e0532e2784c12e48aecb')throw new Error('CONSTRUCTION_PARTITION_SOURCE_BINDING_INVALID');
if(constructionExec.source_run_id!==36088697832||constructionExec.source_artifact_digest!=='sha256:ed8776a87d335310265a7a94465de8edfc4cd027d07236c3dddcaae5885b733c')throw new Error('CONSTRUCTION_EXEC_SOURCE_BINDING_INVALID');

if(wallPart.status!=='PASS'||wallPart.parent_count!==19||wallPart.child_count!==57||wallPart.split_field!=='wall_surface_for_reinforcement_available'||wallPart.PARTITION_OVERLAP_COUNT!==0||wallPart.PARTITION_GAP_COUNT!==0||wallPart.coverage_preservation_status!=='PASS')throw new Error('WALL_SURFACE_PARTITION_MODEL_INVALID');
if(wallCal.status!=='PASS'||wallCal.representative_count!==19||wallCal.representative_pass_count!==19||wallCal.representative_nonempty_pass_count!==19||wallCal.representative_empty_pass_count!==0||wallCal.representative_needs_further_partitioning_count!==0||wallCal.representative_invalid_count!==0||wallCal.representative_execution_verified!==true)throw new Error('WALL_SURFACE_REPRESENTATIVE_INVALID');
if(wallExec.status!=='PASS'||wallExec.executed_child_count!==38||wallExec.pass_count!==38||wallExec.nonempty_pass_count!==38||wallExec.empty_pass_count!==0||wallExec.needs_further_partitioning_count!==0||wallExec.execution_invalid_count!==0||wallExec.unresolved_wall_surface_child_count!==0||wallExec.all_57_wall_surface_children_covered!==true)throw new Error('WALL_SURFACE_EXECUTION_INVALID');
if(wallDecision.next_recovery_action!=='WALL_SURFACE_57_EXECUTION_CLOSURE_READY'||wallDecision.remaining_38_reexecution_authorized!==false||wallDecision.representative_reexecution_authorized!==false||wallDecision.full_57_reexecution_authorized!==false||wallDecision.full_coverage_authorized!==false)throw new Error('WALL_SURFACE_DECISION_INVALID');

const wallMeasured=[...wallCal.representatives,...wallExec.results];
const wallMeasuredById=new Map(wallMeasured.map(x=>[x.child_id,x]));
if(wallMeasured.length!==57||wallMeasuredById.size!==57||!sameIds(wallMeasuredById.keys(),wallPart.children.map(x=>x.child_id)))throw new Error('WALL_SURFACE_57_IDENTITY_INVALID');
if(wallMeasured.some(x=>x.status!=='PASS'||Number(x.terminal_context_count??0)<=0))throw new Error('WALL_SURFACE_57_NOT_ALL_NONEMPTY_PASS');
const wallChildrenByParent=new Map();
for(const c of wallPart.children){const a=wallChildrenByParent.get(c.parent_id)??[];a.push(c);wallChildrenByParent.set(c.parent_id,a)}
if(wallChildrenByParent.size!==19)throw new Error('WALL_SURFACE_PARENT_COUNT_INVALID');
for(const p of wallPart.parents){
  const kids=wallChildrenByParent.get(p.parent_id)??[];
  const values=kids.map(x=>x.split_decision?.value).sort();
  if(kids.length!==3||sj(values)!==sj(['no','unknown','yes']))throw new Error('WALL_SURFACE_PARENT_DOMAIN_INVALID:'+p.parent_id);
  if(kids.some(x=>wallMeasuredById.get(x.child_id)?.status!=='PASS'||Number(wallMeasuredById.get(x.child_id)?.terminal_context_count??0)<=0))throw new Error('WALL_SURFACE_PARENT_NOT_CLOSED:'+p.parent_id);
}

if(constructionPart.status!=='PASS'||constructionPart.parent_count!==19||constructionPart.child_count!==57||constructionPart.split_field!=='construction'||constructionPart.PARTITION_OVERLAP_COUNT!==0||constructionPart.PARTITION_GAP_COUNT!==0||constructionPart.coverage_preservation_status!=='PASS')throw new Error('CONSTRUCTION_PARTITION_MODEL_INVALID');
if(constructionCal.status!=='PASS'||constructionCal.representative_count!==19||constructionCal.representative_pass_count!==19||constructionCal.representative_nonempty_pass_count!==19||constructionCal.representative_empty_pass_count!==0||constructionCal.representative_needs_further_partitioning_count!==0||constructionCal.representative_invalid_count!==0||constructionCal.representative_execution_verified!==true)throw new Error('CONSTRUCTION_REPRESENTATIVE_INVALID');
if(constructionExec.status!=='MEASURED_PARTIAL'||constructionExec.executed_child_count!==38||constructionExec.pass_count!==19||constructionExec.nonempty_pass_count!==19||constructionExec.empty_pass_count!==0||constructionExec.needs_further_partitioning_count!==19||constructionExec.execution_invalid_count!==0||constructionExec.unresolved_construction_child_count!==19)throw new Error('CONSTRUCTION_REMAINING38_INVALID');
if(constructionDecision.next_recovery_action!=='PARTITION_ONLY_SLOW_REMAINING_CONSTRUCTION_CHILDREN'||constructionDecision.full_coverage_authorized!==false)throw new Error('CONSTRUCTION_DECISION_INVALID');

const constructionModelById=new Map(constructionPart.children.map(x=>[x.child_id,x]));
const rc=constructionCal.representatives;
const unknown=constructionExec.results.filter(x=>x.split_decision?.value==='unknown');
const wood=constructionExec.results.filter(x=>x.split_decision?.value==='wood');
if(rc.length!==19||rc.some(x=>x.split_decision?.value!=='rc'||x.status!=='PASS'||Number(x.terminal_context_count??0)<=0))throw new Error('CONSTRUCTION_RC_SET_INVALID');
if(unknown.length!==19||unknown.some(x=>x.status!=='PASS'||Number(x.terminal_context_count??0)<=0))throw new Error('CONSTRUCTION_UNKNOWN_SET_INVALID');
if(wood.length!==19||wood.some(x=>x.status!=='NEEDS_FURTHER_PARTITIONING'||x.constraint_start_valid!==true||x.constraint_progress_valid!==true))throw new Error('CONSTRUCTION_WOOD_SOURCE_SET_INVALID');
const measuredConstructionIds=new Set([...rc,...unknown,...wood].map(x=>x.child_id));
if(measuredConstructionIds.size!==57||!sameIds(measuredConstructionIds,constructionModelById.keys()))throw new Error('CONSTRUCTION_57_IDENTITY_INVALID');
const woodById=new Map(wood.map(x=>[x.child_id,x]));
const wallSourceIds=new Set(wallPart.parents.map(x=>x.source_child_id));
if(wallSourceIds.size!==19||!sameIds(wallSourceIds,woodById.keys()))throw new Error('WOOD19_TO_WALL19_SOURCE_IDENTITY_INVALID');

const woodBridgeRecords=[];
for(const p of wallPart.parents){
  const source=woodById.get(p.source_child_id),model=constructionModelById.get(p.source_child_id),kids=(wallChildrenByParent.get(p.parent_id)??[]).sort((a,b)=>String(a.split_decision_key).localeCompare(String(b.split_decision_key)));
  if(!source||!model)throw new Error('WOOD_SOURCE_MISSING:'+p.source_child_id);
  if(sj(p.source_constraints)!==sj(source.constraints)||sj(p.source_constraints)!==sj(model.constraints)||sj(p.selector_prefix)!==sj(model.selector_prefix)||p.lane_id!==source.lane_id||p.product_node!==source.product_node)throw new Error('WOOD_SOURCE_BINDING_MISMATCH:'+p.source_child_id);
  woodBridgeRecords.push({construction_child_id:p.source_child_id,construction_parent_id:model.parent_id,wall_surface_parent_id:p.parent_id,lane_id:p.lane_id,product_node:p.product_node,construction_source_status:source.status,wall_surface_partition_overlap_count:p.partition_overlap_count,wall_surface_partition_gap_count:p.partition_gap_count,wall_surface_child_ids:kids.map(x=>x.child_id),wall_surface_decisions:kids.map(x=>x.split_decision_key),wall_surface_child_statuses:kids.map(x=>wallMeasuredById.get(x.child_id)?.status??null),wall_surface_nonempty_terminal_counts:kids.map(x=>Number(wallMeasuredById.get(x.child_id)?.terminal_context_count??0)),closure_status:'PASS'});
}
if(woodBridgeRecords.length!==19||woodBridgeRecords.some(x=>x.closure_status!=='PASS'||x.wall_surface_partition_overlap_count!==0||x.wall_surface_partition_gap_count!==0||x.wall_surface_child_statuses.some(v=>v!=='PASS')||x.wall_surface_nonempty_terminal_counts.some(v=>v<=0)))throw new Error('WOOD19_CLOSURE_INVALID');

const closedConstructionIds=new Set([...rc.map(x=>x.child_id),...unknown.map(x=>x.child_id),...woodBridgeRecords.map(x=>x.construction_child_id)]);
const all57=closedConstructionIds.size===57&&sameIds(closedConstructionIds,constructionModelById.keys());
if(!all57)throw new Error('CONSTRUCTION57_CLOSURE_INVALID');
const dependencyFingerprint=hash({runtime_manifest_sha256:runtimeHash,selector_batch_runner_blob:BB,full_selector_proof_blob:FB,source_artifact_digest:SD,wall_partition_semantic_hash:hash(wallPart),wall_representative_semantic_hash:hash(wallCal),wall_execution_semantic_hash:hash(wallExec),construction_partition_semantic_hash:hash(constructionPart),construction_representative_semantic_hash:hash(constructionCal),construction_execution_semantic_hash:hash(constructionExec)});
const binding={source_exact_head:SH,source_run_id:Number(SR),source_artifact_identity:SA,source_artifact_sha256:SD,current_exact_head:head,changed_paths:changed,dependency_fingerprint:dependencyFingerprint,impact_decision:'CLOSURE_ONLY_ANALYZER_CHANGE_SOURCE_MEASUREMENTS_BOUND_AND_REVALIDATED',measurement_reexecuted:false};

for(const f of readdirSync(s).filter(x=>x.endsWith('.json'))){const d=rd(`${s}/${f}`);writeJson(`${OUT}/${f}`,{...d,exact_head:head,source_bound_exact_head:SH,measurement_reexecuted:false,evidence_origin:'CURRENT_HEAD_BOUND_SOURCE_EVIDENCE_NO_REEXECUTION',current_head_evidence_binding:binding})}
writeJson(`${OUT}/explicit-constraint-wall-surface57-to-construction-wood19-closure-proof.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_WALL_SURFACE57_TO_CONSTRUCTION_WOOD19_CLOSURE_PROOF',exact_head:head,current_runtime_manifest_sha256:runtimeHash,current_head_evidence_binding:binding,wall_surface_parent_count:19,wall_surface_child_count:57,wall_surface_direct_pass_count:57,wall_surface_nonempty_pass_count:57,wall_surface_unresolved_count:0,wall_surface_partition_overlap_count:0,wall_surface_partition_gap_count:0,construction_wood_source_count:19,construction_wood_direct_source_status:'NEEDS_FURTHER_PARTITIONING',construction_wood_closed_via_wall_surface_count:19,construction_wood_unresolved_count:0,all_19_construction_wood_children_closed:true,bridge_records:woodBridgeRecords,execution_performed:false,status:'PASS'});
writeJson(`${OUT}/explicit-constraint-construction57-closure-proof.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_CONSTRUCTION57_CLOSURE_PROOF',exact_head:head,current_runtime_manifest_sha256:runtimeHash,current_head_evidence_binding:binding,partition_parent_count:19,partition_child_count:57,partition_overlap_count:0,partition_gap_count:0,coverage_preservation_status:'PASS',direct_rc_pass_count:19,direct_unknown_pass_count:19,direct_pass_child_count:38,partition_bridge_closed_wood_child_count:19,closed_construction_child_count:57,unresolved_construction_child_count:0,all_57_construction_children_covered:true,construction_child_ids:[...closedConstructionIds].sort(),execution_performed:false,status:'PASS'});
writeJson(`${OUT}/explicit-constraint-construction57-closure-decision.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_CONSTRUCTION57_CLOSURE_DECISION',exact_head:head,all_19_construction_wood_children_closed:true,all_57_construction_children_covered:true,closed_construction_child_count:57,unresolved_construction_child_count:0,next_recovery_action:'CONSTRUCTION_57_TO_REINFORCEMENT_BRACKET_SLOW19_CLOSURE_PROOF_READY',wall_surface_reexecution_authorized:false,construction_reexecution_authorized:false,new_partition_authorized:false,full_constraint_execution_authorized:false,full_coverage_authorized:false,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_WALL_SURFACE_57_TO_CONSTRUCTION_57_CLOSURE_PROOF',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:'DIAGNOSTIC_COMPLETE'});
console.log('WALL_SURFACE_57_DIRECT_PASS_COUNT=57/57');
console.log('CONSTRUCTION_WOOD19_CLOSED_VIA_WALL_SURFACE=19/19');
console.log('CONSTRUCTION_57_CLOSED=57/57');
console.log('CONSTRUCTION_DIRECT_PASS_COUNT=38');
console.log('CONSTRUCTION_PARTITION_BRIDGE_CLOSED_COUNT=19');
console.log('NEXT_RECOVERY_ACTION=CONSTRUCTION_57_TO_REINFORCEMENT_BRACKET_SLOW19_CLOSURE_PROOF_READY');
console.log('EXPLORATION_EXECUTION_PERFORMED=FALSE');
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');