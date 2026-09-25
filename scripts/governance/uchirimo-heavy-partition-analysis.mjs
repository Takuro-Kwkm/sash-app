import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PID='SER-YKKAP-UCHIRIMO';
const P='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const B='scripts/governance/uchirimo-selector-batch-runner.mjs';
const F='scripts/uchirimo-full-selector-proof.mjs';
const R='Takuro-Kwkm/sash-app';
const SR='36077493632';
const SH='e2ab6b0d6f8ac6e367406c64af32dc6f8339c8a0';
const SA=`uchirimo-heavy-recovery-analysis-${SH}`;
const SD='sha256:57ef204966e9645e68596b77905198c771414a379adfa8d73796488a41d6e996';
const SB='abd2ab59223837f22913e7c496335ef4e73fcf26';
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

const TECH=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);
const CONT=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const stable=v=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object')?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));
const sj=v=>JSON.stringify(stable(v));
const hash=v=>createHash('sha256').update(typeof v==='string'?v:sj(v)).digest('hex');
const rd=p=>JSON.parse(readFileSync(p,'utf8'));
const same=(a,b)=>Array.isArray(b)?Array.isArray(a)&&sj(a.map(String).sort())===sj(b.map(String).sort()):Object.is(a,b)||String(a)===String(b);
const present=v=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0);
const enabled=f=>[...new Map((f?.values??[]).filter(x=>x.disabled!==true).map(x=>[sj(x.value),x.value])).values()];
const normalizeMulti=rows=>[...new Map(rows.map(v=>[String(v),v])).values()].sort((a,b)=>String(a).localeCompare(String(b)));
const prefixPreserved=(result,prefix)=>Object.entries(prefix).every(([k,v])=>same(result.selection?.[k],v));
const dkey=d=>d.kind==='UNSET'?'UNSET':`VALUE:${sj(d.value)}`;
const meta=(run,name,dig)=>{const x=JSON.parse(execFileSync('gh',['api',`repos/${REPO}/actions/runs/${run}/artifacts?per_page=100`],{encoding:'utf8',timeout:120000,maxBuffer:16e6})).artifacts?.find(x=>x.name===name);if(!x||x.expired||x.digest!==dig)throw new Error('SOURCE_ARTIFACT_INVALID:'+run)};
const dl=(run,name,dir)=>{mkdirSync(dir,{recursive:true});execFileSync('gh',['run','download',run,'--repo',REPO,'--name',name,'--dir',dir],{stdio:'inherit',timeout:120000})};

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
  if(decision.kind==='UNSET')delete next[key]; else next[key]=decision.value;
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
  if(!prefixPreserved(result,prefix))throw new Error('SLOW19_PREFIX_REJECTED');
  for(const constraint of constraints){
    result=await resolveRuntimeAppProduct(PID,applyDecision(result.selection??prefix,constraint.field_key,constraint.decision));
    if(!survives(result,constraint.field_key,constraint.decision))throw new Error('SLOW19_SOURCE_CONSTRAINT_NOT_PRESERVED:'+constraint.field_key);
    if(!prefixPreserved(result,prefix))throw new Error('SLOW19_SOURCE_CONSTRAINT_CLEARED_PREFIX:'+constraint.field_key);
  }
  return result;
}

execFileSync('git',['merge-base','--is-ancestor',SH,head],{stdio:'ignore'});
if(execFileSync('git',['rev-parse',`${SH}:${P}`],{encoding:'utf8'}).trim()!==SB)throw new Error('SOURCE_ANALYSIS_BLOB_MISMATCH');
const changed=execFileSync('git',['diff','--name-only',`${SH}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
if(sj(changed)!==sj([P]))throw new Error('NEXT_STAGE_SCOPE_INVALID:'+changed.join(','));
if(execFileSync('git',['rev-parse',`${head}:${B}`],{encoding:'utf8'}).trim()!==BB)throw new Error('BATCH_RUNNER_IDENTITY_CHANGED');
if(execFileSync('git',['rev-parse',`${head}:${F}`],{encoding:'utf8'}).trim()!==FB)throw new Error('FULL_SELECTOR_RUNNER_IDENTITY_CHANGED');
meta(SR,SA,SD);meta(MR,MA,MD);

const t=String(process.env.RUNNER_TEMP??'/tmp'),s=`${t}/uslow19-${SR}`,m=`${t}/uslow19-model-${MR}`;
dl(SR,SA,s);dl(MR,MA,m);
for(const f of readdirSync(s).filter(x=>x.endsWith('.json'))){
  const d=rd(`${s}/${f}`);
  writeJson(`${OUT}/${f}`,{...d,exact_head:head,source_bound_exact_head:SH,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_EVIDENCE_NO_REEXECUTION'});
}

const exec76=rd(`${s}/explicit-constraint-remaining76-extension-frame-execution.json`);
const dec76=rd(`${s}/explicit-constraint-remaining76-extension-frame-decision.json`);
const model=rd(`${m}/explicit-decision-constraint-partition-model-proof.json`);
const modelBinding=rd(`${m}/depth8-source-binding.json`);
if(exec76.exact_head!==SH||exec76.executed_child_count!==76||exec76.pass_count!==57||exec76.needs_further_partitioning_count!==19||exec76.execution_invalid_count!==0||exec76.remaining76_execution_verified!==true||exec76.status!=='MEASURED_PARTIAL')throw new Error('REMAINING76_SOURCE_INVALID');
if(dec76.next_recovery_action!=='PARTITION_ONLY_SLOW_REMAINING_EXTENSION_FRAME_CHILDREN'||dec76.covered_extension_child_count!==76||dec76.unresolved_extension_child_count!==19||dec76.status!=='PARTIAL_CLOSURE')throw new Error('REMAINING76_DECISION_INVALID');
if(model.exact_head!==MH||model.lane_count!==7||model.proof_pass_count!==7||model.blocked_count!==0||model.explicit_decision_constraint_model_status!=='PASS')throw new Error('MODEL_SOURCE_INVALID');
if(modelBinding.status!=='PASS')throw new Error('MODEL_BINDING_INVALID');

const rt=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!rt?.sourcePackageIntegrity?.match||rt.sourcePackageIntegrity.actual!==exec76.current_runtime_manifest_sha256||rt.sourcePackageIntegrity.actual!==modelBinding.current_runtime_manifest_sha256)throw new Error('RUNTIME_IDENTITY_CHANGED');
const laneById=new Map(model.lanes.map(x=>[x.lane_id,x]));
const slow=exec76.results.filter(x=>x.status==='NEEDS_FURTHER_PARTITIONING');
if(slow.length!==19||slow.some(x=>x.outcome!=='TIMEOUT_CONSTRAINT_ACTIVE'||x.constraint_start_valid!==true||x.constraint_progress_valid!==true||x.split_decision?.kind!=='VALUE'||x.split_decision?.value!=='fukashi_60'||x.constraints?.length!==2))throw new Error('SLOW19_SET_INVALID');

const parents=[];const children=[];
for(const source of slow){
  const lane=laneById.get(source.lane_id);
  if(!lane||lane.product_node!==source.product_node)throw new Error('SLOW19_LANE_MISSING:'+source.child_id);
  const prefix=stable(lane.selector_prefix??{});
  const sourceConstraints=stable(source.constraints);
  const constrained=await applyConstraints(prefix,sourceConstraints);
  const constraintKeys=new Set(sourceConstraints.map(x=>x.field_key));
  const candidates=(constrained.fields??[]).filter(field=>
    !field.readOnly&&!TECH.has(field.key)&&!CONT.has(field.key)&&!constraintKeys.has(field.key)
    &&!Object.prototype.hasOwnProperty.call(prefix,field.key)
    &&['ENUM','MULTI_ENUM'].includes(field.dataType)&&enabled(field).length>0
  );
  const candidateProofs=[];
  for(const field of candidates){
    const domain=decisionDomain(field),reachable=[],rejected=[];
    for(const decision of domain){
      const child=await resolveRuntimeAppProduct(PID,applyDecision(constrained.selection??prefix,field.key,decision));
      const constraintsOk=sourceConstraints.every(c=>survives(child,c.field_key,c.decision));
      const splitOk=survives(child,field.key,decision);
      const prefixOk=prefixPreserved(child,prefix);
      if(constraintsOk&&splitOk&&prefixOk)reachable.push({decision:stable(decision),decision_key:dkey(decision),selection_fingerprint:hash(stable(child.selection??{}))});
      else rejected.push({decision:stable(decision),reason:!constraintsOk?'SOURCE_CONSTRAINT_CLEARED':!splitOk?'SPLIT_DECISION_REJECTED_OR_CLEARED':'PREFIX_CLEARED'});
    }
    const accounted=reachable.length+rejected.length===domain.length;
    const uniqueKeys=new Set(reachable.map(x=>x.decision_key)).size===reachable.length;
    const uniqueFingerprints=new Set(reachable.map(x=>x.selection_fingerprint)).size===reachable.length;
    const unsetCount=reachable.filter(x=>x.decision.kind==='UNSET').length;
    const unsetValid=field.required===true?unsetCount===0:unsetCount===1;
    const pass=reachable.length>=2&&unsetValid&&accounted&&uniqueKeys&&uniqueFingerprints;
    candidateProofs.push({field_key:field.key,data_type:field.dataType,required:field.required===true,decision_domain_count:domain.length,reachable_branch_count:reachable.length,rejected_branch_count:rejected.length,reachable_unset_branch_count:unsetCount,branch_disjointness_status:uniqueKeys&&uniqueFingerprints?'PASS':'FAIL',parent_union_accounting_status:accounted?'PASS':'FAIL',reachable_children:reachable,rejected_branches:rejected,status:pass?'PASS':'BLOCKED'});
  }
  const chosen=candidateProofs.find(x=>x.field_key==='extension_frame_reinforcement'&&x.status==='PASS');
  if(!chosen)throw new Error('EXTENSION_FRAME_REINFORCEMENT_NOT_SAFE:'+source.child_id);
  const parentId=`UHC-S19P-${hash({child_id:source.child_id,constraints:sourceConstraints}).slice(0,20)}`;
  parents.push({parent_id:parentId,source_child_id:source.child_id,source_parent_id:source.parent_id,lane_id:source.lane_id,product_node:source.product_node,selector_prefix:prefix,source_constraints:sourceConstraints,split_field:'extension_frame_reinforcement',split_data_type:chosen.data_type,decision_domain_count:chosen.decision_domain_count,reachable_branch_count:chosen.reachable_branch_count,rejected_branch_count:chosen.rejected_branch_count,candidate_proofs:candidateProofs,partition_overlap_count:0,partition_gap_count:0,status:'PASS'});
  for(const reach of chosen.reachable_children){
    const constraints=[...sourceConstraints,{field_key:'extension_frame_reinforcement',decision:reach.decision}];
    children.push({child_id:`UHC-S19C-${hash({parent_id:parentId,constraints}).slice(0,20)}`,parent_id:parentId,source_child_id:source.child_id,lane_id:source.lane_id,product_node:source.product_node,selector_prefix:prefix,constraints,split_field:'extension_frame_reinforcement',split_decision:reach.decision,split_decision_key:dkey(reach.decision),selection_fingerprint:reach.selection_fingerprint,execution_status:'UNVERIFIED',status:'PLANNED_UNVERIFIED'});
  }
}
const overlap=children.length-new Set(children.map(x=>x.child_id)).size;
const gap=parents.reduce((n,p)=>n+(children.filter(c=>c.parent_id===p.parent_id).length===p.reachable_branch_count?0:1),0);
const parentIds=new Set(parents.map(x=>x.parent_id));
const proofPass=parents.length===19&&parentIds.size===19&&children.length>19&&overlap===0&&gap===0&&parents.every(x=>x.reachable_branch_count>=2&&x.status==='PASS');
writeJson(`${OUT}/explicit-constraint-slow19-reinforcement-partition-model-proof.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_SLOW19_EXTENSION_FRAME_REINFORCEMENT_PARTITION_MODEL_PROOF',exact_head:head,source_exact_head:SH,source_run_id:Number(SR),source_artifact_name:SA,source_artifact_digest:SD,model_source_exact_head:MH,model_source_run_id:Number(MR),model_source_artifact_name:MA,model_source_artifact_digest:MD,current_runtime_manifest_sha256:rt.sourcePackageIntegrity.actual,parent_count:parents.length,split_field:'extension_frame_reinforcement',child_count:children.length,PARTITION_OVERLAP_COUNT:overlap,PARTITION_GAP_COUNT:gap,parents,children,coverage_preservation_status:proofPass?'PASS':'FAIL',execution_performed:false,full_coverage_authorized:false,status:proofPass?'PASS':'BLOCKED'});
if(!proofPass)throw new Error('SLOW19_REINFORCEMENT_PARTITION_MODEL_FAIL');
writeJson(`${OUT}/explicit-constraint-slow19-reinforcement-partition-decision.json`,{schema_version:'1.0.0',artifact_type:'UCHIRIMO_SLOW19_EXTENSION_FRAME_REINFORCEMENT_PARTITION_DECISION',exact_head:head,parent_count:parents.length,child_count:children.length,split_field:'extension_frame_reinforcement',PARTITION_OVERLAP_COUNT:overlap,PARTITION_GAP_COUNT:gap,coverage_preservation_status:'PASS',execution_performed:false,next_recovery_action:'CALIBRATE_REPRESENTATIVE_REINFORCEMENT_CHILDREN_FOR_19_SLOW_EXTENSION_PARENTS',representative_execution_authorized:true,all_children_execution_authorized:false,slow19_source_reexecution_authorized:false,full_constraint_execution_authorized:false,full_coverage_authorized:false,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_PARTITION_ONLY_19_SLOW_FUKASHI60_CHILDREN_BY_REINFORCEMENT',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:'DIAGNOSTIC_COMPLETE'});
console.log('SLOW19_REINFORCEMENT_PARTITION_MODEL_STATUS=PASS');
console.log(`PARENT_COUNT=${parents.length}`);
console.log(`CHILD_COUNT=${children.length}`);
console.log(`PARTITION_OVERLAP_COUNT=${overlap}`);
console.log(`PARTITION_GAP_COUNT=${gap}`);
console.log('EXECUTION_PERFORMED=FALSE');
console.log('NEXT_RECOVERY_ACTION=CALIBRATE_REPRESENTATIVE_REINFORCEMENT_CHILDREN_FOR_19_SLOW_EXTENSION_PARENTS');
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
