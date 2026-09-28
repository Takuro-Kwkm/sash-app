import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, mkdirSync, openSync, writeFileSync, writeSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { currentExactHead } from './governance-lib.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { canonicalConstraints, recoveryUnitId, recoveryEvidenceNames, sha256 as recoverySha256 } from './uchirimo-v11-recovery-controller.mjs';

const OUT=String(process.env.UCHIRIMO_FULL_SELECTOR_OUT ?? 'artifacts/uchirimo-selector-proof-shard');
const BATCH_ID=String(process.env.UCHIRIMO_SELECTOR_BATCH_ID ?? '');
const EVIDENCE_ARTIFACT_IDENTITY=String(process.env.UCHIRIMO_V12_EVIDENCE_ARTIFACT_IDENTITY ?? '');
const CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS ?? 1080000);
const EXPECTED_SHARDS=Number(process.env.UCHIRIMO_SELECTOR_EXPECTED_SHARDS ?? 0);
const MAX_STATES=Number(process.env.UCHIRIMO_SELECTOR_MAX_STATES ?? 1000000);
const MAX_TERMINALS=Number(process.env.UCHIRIMO_SELECTOR_MAX_TERMINALS ?? 1000000);
const MAX_RESOLVER_CACHE=Number(process.env.UCHIRIMO_RESOLVER_CACHE_MAX ?? 512);
const PRODUCT_ID='SER-YKKAP-UCHIRIMO';
const CONTINUOUS_KEYS=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECHNICAL_KEYS=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);
const batch=JSON.parse(String(process.env.UCHIRIMO_SELECTOR_BATCH_JSON ?? '[]'));

const stable=(value)=>Array.isArray(value)
  ? value.map(stable)
  : (!value||typeof value!=='object')
    ? value
    : Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,stable(v)]));
const stableJson=(value)=>JSON.stringify(stable(value));
const sha=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const same=(a,b)=>Array.isArray(b)
  ? Array.isArray(a)&&stableJson(a.map(String).sort())===stableJson(b.map(String).sort())
  : Object.is(a,b)||String(a)===String(b);
const enabledValues=(field)=>[...new Map((field?.values??[]).filter((entry)=>entry.disabled!==true).map((entry)=>[stableJson(entry.value),entry.value])).values()];
const normalizeMulti=(rows)=>[...new Map(rows.map((value)=>[String(value),value])).values()].sort((a,b)=>String(a).localeCompare(String(b)));

function parseConstraints(row){
  const parsed=JSON.parse(String(row.decision_constraints_json ?? '[]'));
  if(!Array.isArray(parsed))throw new Error('UCHIRIMO_DECISION_CONSTRAINTS_INVALID');
  return parsed;
}

export function recoveryIdentity(row,constraints){
  const parentShard=Number(row.parent_shard_index ?? row.shard);
  const parentPartitionKey=String(row.parent_partition_key ?? row.partition_key ?? '');
  if(!Number.isInteger(parentShard)||parentShard<0)throw new Error('UCHIRIMO_RECOVERY_PARENT_SHARD_INVALID');
  if(!parentPartitionKey)throw new Error('UCHIRIMO_RECOVERY_PARENT_PARTITION_KEY_MISSING');
  const normalized=canonicalConstraints(constraints);
  const unitId=recoveryUnitId(parentPartitionKey,normalized);
  if(row.recovery_unit_id!=null&&String(row.recovery_unit_id)!==unitId)throw new Error('UCHIRIMO_RECOVERY_UNIT_ID_MISMATCH:'+parentPartitionKey);
  const depth=normalized.length;
  if(row.recovery_depth!=null&&Number(row.recovery_depth)!==depth)throw new Error('UCHIRIMO_RECOVERY_DEPTH_MISMATCH:'+parentPartitionKey);
  const parentUnitId=row.parent_recovery_unit_id==null?null:String(row.parent_recovery_unit_id);
  return {
    parent_shard_index:parentShard,
    parent_partition_key:parentPartitionKey,
    recovery_unit_id:unitId,
    recovery_depth:depth,
    parent_recovery_unit_id:parentUnitId,
    decision_constraints:normalized,
    decision_constraints_sha256:recoverySha256(normalized)
  };
}

function recoveryNames(identity){
  return recoveryEvidenceNames(identity);
}

function envForNormal(row){
  return {
    ...process.env,
    UCHIRIMO_SELECTOR_MODE:'shard',
    UCHIRIMO_WINDOW_SHARD_INDEX:String(row.shard),
    UCHIRIMO_SELECTOR_NODE_ID:String(row.node_id),
    UCHIRIMO_SELECTOR_ROOM:String(row.room_specification),
    UCHIRIMO_SELECTOR_WINDOW:String(row.window_type),
    UCHIRIMO_SELECTOR_SASH:String(row.sash_configuration ?? '__UNSET__'),
    UCHIRIMO_SELECTOR_SIZE_CLASS:String(row.size_class ?? '__UNSET__'),
    UCHIRIMO_SELECTOR_GLASS_FAMILY:String(row.glass_family),
    UCHIRIMO_SELECTOR_PARTITION_KEY:String(row.partition_key),
    UCHIRIMO_SELECTOR_PARTITION_SEED_JSON:String(row.partition_seed_json ?? '{}'),
    UCHIRIMO_FULL_SELECTOR_OUT:OUT
  };
}

function runNormal(row){
  return new Promise((resolve)=>{
    const startedAt=new Date().toISOString();
    const child=spawn(process.execPath,['scripts/uchirimo-full-selector-proof.mjs'],{env:envForNormal(row),stdio:'inherit'});
    let timedOut=false;
    const timer=setTimeout(()=>{
      timedOut=true;
      child.kill('SIGTERM');
      setTimeout(()=>{ try{ child.kill('SIGKILL'); }catch{} },10000).unref();
    },CHILD_TIMEOUT_MS);
    child.on('error',(error)=>{
      clearTimeout(timer);
      resolve({shard:Number(row.shard),partition_key:String(row.partition_key),status:'FAIL',timed_out:timedOut,exit_code:null,signal:null,error:error?.message??String(error),runner:'scripts/uchirimo-full-selector-proof.mjs',constraint_count:0,started_at:startedAt,completed_at:new Date().toISOString()});
    });
    child.on('exit',(code,signal)=>{
      clearTimeout(timer);
      resolve({shard:Number(row.shard),partition_key:String(row.partition_key),status:code===0&&!timedOut?'PASS':'FAIL',timed_out:timedOut,exit_code:code,signal:signal??null,runner:'scripts/uchirimo-full-selector-proof.mjs',constraint_count:0,started_at:startedAt,completed_at:new Date().toISOString()});
    });
  });
}

function branches(field){
  const values=enabledValues(field);
  if(field.dataType==='MULTI_ENUM'){
    if(values.length>12)throw new Error('UCHIRIMO_MULTI_ENUM_SYMBOLIC_PROOF_REQUIRED:'+field.key+':'+values.length);
    const out=[];
    if(field.required!==true)out.push({kind:'UNSET'});
    const total=2**values.length;
    for(let mask=1;mask<total;mask+=1){
      const subset=[];
      for(let index=0;index<values.length;index+=1)if(mask&(1<<index))subset.push(values[index]);
      out.push({kind:'VALUE',value:normalizeMulti(subset)});
    }
    return out;
  }
  const out=values.map((value)=>({kind:'VALUE',value:stable(value)}));
  if(field.required!==true)out.unshift({kind:'UNSET'});
  return out;
}

function applyDecision(selection,key,decision){
  const next={...(selection??{})};
  if(decision.kind==='UNSET')delete next[key];
  else next[key]=decision.value;
  return next;
}

function decisionSurvives(result,key,decision,{constraint=false}={}){
  const field=(result.fields??[]).find((candidate)=>candidate.key===key)??null;
  if(!field)return constraint?false:true;
  if(decision.kind==='UNSET')return field.required!==true&&!present(result.selection?.[key]);
  return same(result.selection?.[key],decision.value);
}

function decisionInDomain(field,decision){
  if(decision?.kind==='UNSET')return field.required!==true;
  if(decision?.kind!=='VALUE')return false;
  if(field.dataType==='MULTI_ENUM'){
    if(!Array.isArray(decision.value)||decision.value.length===0)return false;
    const allowed=new Set(enabledValues(field).map(String));
    return normalizeMulti(decision.value).every((value)=>allowed.has(String(value)));
  }
  return enabledValues(field).some((value)=>same(value,decision.value));
}

function flowSignature(result){
  return (result.fields??[])
    .filter((field)=>!TECHNICAL_KEYS.has(field.key))
    .map((field)=>String(field.semanticStage)+':'+String(field.semanticSlot)+':'+String(field.key)+':'+(field.required?'R':'O')+':'+(field.readOnly?'RO':'RW'))
    .join('|');
}

export function buildSymbolicSafety(runtime){
  const master=runtime.master;
  const fieldNames=new Set((master?.fields??[]).map((row)=>String(row.field_name)));
  const behaviorInputs=new Set([
    'room_specification','window_type','sash_configuration','size_class',
    'glass_family','glass_structure','low_e_type','glass_coating_color','glass_surface_type',
    'safety_treatment','grille_type','grille_material','muntin_type','vacuum_glass_product',
    'spacer_type','gas_fill','size_w','size_h','bathroom_installation_type',
    'frame_installation_mode','extension_frame_type'
  ]);
  const behaviorTargets=new Set([
    'bathroom_installation_type','frame_projection','extension_frame_reinforcement'
  ]);
  for(const rule of master?.canonical?.dependency_rules??[]){
    for(const condition of rule.conditions??[])if(condition?.field)behaviorInputs.add(String(condition.field));
    const effect=rule.effect??{};
    if(effect.field)behaviorInputs.add(String(effect.field));
    if(effect.target_field)behaviorTargets.add(String(effect.target_field));
    for(const key of Object.keys(effect.also??{}))behaviorTargets.add(String(key));
  }
  for(const input of master?.sizeInstallation?.installation_input_contract?.raw_inputs??[]){
    if(input?.field_name)behaviorTargets.add(String(input.field_name));
    const expression=String(input?.required_when??'');
    for(const match of expression.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)){
      if(fieldNames.has(match[0]))behaviorInputs.add(match[0]);
    }
  }
  const independent=new Set([...fieldNames].filter((key)=>
    !behaviorInputs.has(key)&&!behaviorTargets.has(key)&&!CONTINUOUS_KEYS.has(key)&&!TECHNICAL_KEYS.has(key)
  ));
  return {behaviorInputs,behaviorTargets,independent};
}
function symbolicBehaviorProjection(result,ignoredKey){
  const selection=Object.fromEntries(Object.entries(result.selection??{}).filter(([key])=>key!==ignoredKey));
  const fields=(result.fields??[]).map((field)=>({
    key:field.key,
    dataType:field.dataType,
    required:Boolean(field.required),
    readOnly:Boolean(field.readOnly),
    semanticStage:field.semanticStage??null,
    semanticSlot:field.semanticSlot??null,
    values:enabledValues(field).map(stable)
  }));
  return stable({
    selection,
    fields,
    validation_status:result.validation?.status??null,
    clearedFields:result.clearedFields??[]
  });
}

export function validateConstraintCaseEvidence(report,bytes){
  if(report.proof_model!=='UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXPLICIT_CONSTRAINT_SYMBOLIC_SHARD_V3')return;
  const lines=String(bytes).trim().split('\n');
  const ids=new Set();let terminals=0;
  for(const line of lines){
    const row=JSON.parse(line),n=row.symbolic_multiplicity;
    if(!row.case_id||ids.has(row.case_id)||!/^[0-9a-f]{64}$/.test(String(row.terminal_class_sha256))||!Number.isSafeInteger(n)||n<1||terminals>Number.MAX_SAFE_INTEGER-n)throw new Error('UCHIRIMO_SYMBOLIC_CASE_INTEGRITY_MISMATCH');
    ids.add(row.case_id);terminals+=n;
  }
  if(lines.length!==report.terminal_equivalence_class_count||terminals!==report.terminal_context_count)throw new Error('UCHIRIMO_SYMBOLIC_CASE_COVERAGE_MISMATCH');
}

export async function runConstraint(row,constraints,identity,options={}){
  const OUT=options.out??String(process.env.UCHIRIMO_FULL_SELECTOR_OUT??'artifacts/uchirimo-selector-proof-shard');
  const CHILD_TIMEOUT_MS=options.timeoutMs??Number(process.env.UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS??1080000);
  const EXPECTED_SHARDS=options.expectedShards??Number(process.env.UCHIRIMO_SELECTOR_EXPECTED_SHARDS??0);
  const MAX_STATES=options.maxStates??Number(process.env.UCHIRIMO_SELECTOR_MAX_STATES??1000000);
  const MAX_TERMINALS=options.maxTerminals??Number(process.env.UCHIRIMO_SELECTOR_MAX_TERMINALS??1000000);
  const now=options.now??Date.now;
  const loadRuntime=options.loadRuntime??loadRegisteredRuntime;
  const resolveProduct=options.resolveProduct??resolveRuntimeAppProduct;
  mkdirSync(OUT,{recursive:true});
  const startedAt=new Date().toISOString();
  const startedMs=now();
  const deadline=startedMs+CHILD_TIMEOUT_MS;
  const shard=Number(row.shard);
  const partitionKey=String(row.partition_key);
  const names=recoveryNames(identity);
  const failurePath=join(OUT,names.failure);
  const progressPath=join(OUT,names.progress);
  let casesFd=null;
  try{
    if(!Number.isInteger(shard)||shard<0||shard>=EXPECTED_SHARDS)throw new Error('UCHIRIMO_INVALID_SHARD_INDEX:'+shard);
    if(!row.node_id||!row.room_specification||!row.window_type||!row.glass_family||!partitionKey)throw new Error('UCHIRIMO_SHARD_PLAN_INPUT_MISSING:'+shard);
    if(!constraints.length)throw new Error('UCHIRIMO_DECISION_CONSTRAINTS_REQUIRED');
    const constraintKeys=constraints.map((entry)=>String(entry?.field_key??''));
    if(constraintKeys.some((key)=>!key)||new Set(constraintKeys).size!==constraintKeys.length)throw new Error('UCHIRIMO_DECISION_CONSTRAINT_KEYS_INVALID');

    const head=options.head??currentExactHead();
    const runtime=await loadRuntime('YKK AP','ウチリモ 内窓');
    if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_RUNTIME_INTEGRITY_NOT_PASS');
    const formalNode=(runtime.master?.canonical?.product_nodes??[]).find((entry)=>String(entry.node_id)===String(row.node_id));
    if(!formalNode)throw new Error('UCHIRIMO_SHARD_PRODUCT_NODE_NOT_FOUND:'+String(row.node_id));
    if(String(formalNode.room??'')!==String(row.room_specification)||String(formalNode.window_type??'')!==String(row.window_type))throw new Error('UCHIRIMO_SHARD_PLAN_NODE_AXIS_MISMATCH:'+String(row.node_id));

    const symbolicSafety=buildSymbolicSafety(runtime);
    const resolverCache=new Map();
    let resolverCacheHits=0;
    let resolverCacheMisses=0;
    const resolveCached=async(selection)=>{
      const key=sha(selection??{});
      if(resolverCache.has(key)){resolverCacheHits+=1;return resolverCache.get(key);}
      const result=await resolveProduct(PRODUCT_ID,selection);
      resolverCache.set(key,result);
      while(resolverCache.size>MAX_RESOLVER_CACHE)resolverCache.delete(resolverCache.keys().next().value);
      resolverCacheMisses+=1;
      return result;
    };

    const seed={room_specification:String(row.room_specification),window_type:String(row.window_type)};
    if(String(row.sash_configuration??'__UNSET__')!=='__UNSET__')seed.sash_configuration=String(row.sash_configuration);
    if(String(row.size_class??'__UNSET__')!=='__UNSET__')seed.size_class=String(row.size_class);
    seed.glass_family=String(row.glass_family);
    const extra=JSON.parse(String(row.partition_seed_json??'{}'));
    for(const [key,value] of Object.entries(extra)){
      if(Object.prototype.hasOwnProperty.call(seed,key))throw new Error('UCHIRIMO_PARTITION_SEED_AXIS_COLLISION:'+key);
      if(constraintKeys.includes(key))throw new Error('UCHIRIMO_CONSTRAINT_SEED_AXIS_COLLISION:'+key);
      seed[key]=value;
    }
    let selected=await resolveCached(seed);
    for(const [key,value] of Object.entries(seed))if(!same(selected.selection?.[key],value))throw new Error('UCHIRIMO_SHARD_SEED_REJECTED:'+String(row.node_id)+':'+key);
    const decisions=Object.fromEntries(Object.entries(seed).map(([key,value])=>[key,{kind:'VALUE',value}]));

    for(const constraint of constraints){
      const key=String(constraint.field_key);
      const field=(selected.fields??[]).find((candidate)=>candidate.key===key)??null;
      if(!field||field.readOnly===true||TECHNICAL_KEYS.has(key)||CONTINUOUS_KEYS.has(key)||!['ENUM','MULTI_ENUM'].includes(field.dataType))throw new Error('UCHIRIMO_CONSTRAINT_FIELD_INVALID:'+key);
      if(!decisionInDomain(field,constraint.decision))throw new Error('UCHIRIMO_CONSTRAINT_DECISION_OUT_OF_DOMAIN:'+key);
      const input=applyDecision(selected.selection??seed,key,constraint.decision);
      const child=await resolveCached(input);
      if(!decisionSurvives(child,key,constraint.decision,{constraint:true}))throw new Error('UCHIRIMO_CONSTRAINT_ENTRY_NOT_PRESERVED:'+key);
      for(const [seedKey,value] of Object.entries(seed))if(!same(child.selection?.[seedKey],value))throw new Error('UCHIRIMO_CONSTRAINT_CLEARED_PREFIX:'+key+':'+seedKey);
      selected=child;
      decisions[key]=stable(constraint.decision);
    }

    const constraintMap=new Map(constraints.map((entry)=>[String(entry.field_key),stable(entry.decision)]));
    const constraintHash=sha(stable(constraints));
    if(constraintHash!==identity.decision_constraints_sha256)throw new Error('UCHIRIMO_RECOVERY_CONSTRAINT_HASH_MISMATCH:'+identity.recovery_unit_id);
    const startArtifact={schema_version:'2.0.0',exact_head:head,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,runner:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_SHARD_V2',shard_index:shard,parent_shard_index:identity.parent_shard_index,node_id:String(row.node_id),partition_key:partitionKey,parent_partition_key:identity.parent_partition_key,recovery_unit_id:identity.recovery_unit_id,recovery_depth:identity.recovery_depth,parent_recovery_unit_id:identity.parent_recovery_unit_id,seed:stable(seed),seed_sha256:sha(seed),decision_constraints:identity.decision_constraints,decision_constraints_sha256:constraintHash,initial_selection_sha256:sha(selected.selection??{}),runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,runtime_integrity_match:true,status:'PASS'};
    writeFileSync(join(OUT,names.start),JSON.stringify(startArtifact,null,2)+'\n');

    const stack=[{selection:selected.selection??seed,decisions:{...decisions},result:selected,symbolicMultiplier:1,symbolicAxes:[]}];
    const visited=new Set();
    const signatureCounts=new Map();
    let transitionChecks=0;
    let dependencyRejections=0;
    let constraintRejections=0;
    let downstreamClearChecks=0;
    let terminalCount=0,terminalClassCount=0,symbolicEquivalenceChecks=0,symbolicCollapsedBranchCount=0,symbolicFallbackCount=0;
    let maxStack=stack.length;
    let peakHeapMb=0;
    const casesPath=join(OUT,names.terminal_digests);
    casesFd=openSync(casesPath,'w');
    const caseHash=createHash('sha256');
    const writeProgress=(status='IN_PROGRESS')=>writeFileSync(progressPath,JSON.stringify({schema_version:'1.0.0',exact_head:head,shard_index:shard,partition_key:partitionKey,decision_constraints_sha256:constraintHash,visited_state_count:visited.size,terminal_context_count:terminalCount,transition_check_count:transitionChecks,dependency_rejection_count:dependencyRejections,constraint_rejection_count:constraintRejections,terminal_equivalence_class_count:terminalClassCount,symbolic_collapsed_branch_count:symbolicCollapsedBranchCount,max_stack_depth:maxStack,resolver_cache_hits:resolverCacheHits,resolver_cache_misses:resolverCacheMisses,status},null,2)+'\n');
    writeProgress();

    while(stack.length){
      if(now()>=deadline)throw new Error('UCHIRIMO_CONSTRAINT_CHILD_TIMEOUT:'+CHILD_TIMEOUT_MS);
      if(visited.size>=MAX_STATES)throw new Error('UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED:'+MAX_STATES+':SHARD:'+shard);
      const current=stack.pop();
      const result=current.result??await resolveCached(current.selection);
      if(![...constraintMap].every(([key,decision])=>decisionSurvives(result,key,decision,{constraint:true}))){constraintRejections+=1;continue;}
      const visibleKeys=new Set((result.fields??[]).map((field)=>field.key));
      const currentDecisions=Object.fromEntries(Object.entries(current.decisions).filter(([key])=>visibleKeys.has(key)||constraintMap.has(key)));
      for(const [key,decision] of constraintMap)currentDecisions[key]=decision;
      const stateKey=sha({selection:result.selection,decisions:currentDecisions,constraints:stable(constraints)});
      if(visited.has(stateKey))continue;
      visited.add(stateKey);
      for(const field of result.fields??[]){
        if(TECHNICAL_KEYS.has(field.key))throw new Error('UCHIRIMO_TECHNICAL_FIELD_VISIBLE:'+field.key);
        if(!field.semanticStage||!field.semanticSlot)throw new Error('UCHIRIMO_UNMAPPED_UI_FIELD:'+field.key);
      }
      const signature=flowSignature(result);
      signatureCounts.set(signature,(signatureCounts.get(signature)??0)+1);
      const nextField=(result.fields??[]).find((field)=>!field.readOnly&&!CONTINUOUS_KEYS.has(field.key)&&field.dataType!=='NUMBER'&&enabledValues(field).length>0&&!Object.prototype.hasOwnProperty.call(currentDecisions,field.key)&&!constraintMap.has(field.key));
      if(!nextField){
        if(terminalClassCount>=MAX_TERMINALS)throw new Error('UCHIRIMO_TERMINAL_LIMIT_REACHED:'+MAX_TERMINALS+':SHARD:'+shard);
        const multiplicity=current.symbolicMultiplier;
        if(!Number.isSafeInteger(multiplicity)||multiplicity<1||terminalCount>Number.MAX_SAFE_INTEGER-multiplicity)throw new Error("UCHIRIMO_SYMBOLIC_MULTIPLICITY_OVERFLOW");
        terminalClassCount+=1;terminalCount+=multiplicity;
        const terminal={case_id:'UCHIRIMO-C'+shard+'-'+identity.recovery_unit_id.slice(0,12)+'-'+String(terminalClassCount).padStart(6,'0'),window_type:result.selection?.window_type??null,representative_selection:stable(result.selection??{}),symbolic_multiplicity:multiplicity,symbolic_axes:stable(current.symbolicAxes),validation_status:result.validation?.status??null,flow_signature_sha256:sha(signature),decision_constraints_sha256:constraintHash};
        const line=JSON.stringify({case_id:terminal.case_id,window_type:terminal.window_type,symbolic_multiplicity:multiplicity,terminal_class_sha256:sha(terminal)})+'\n';
        options.onTerminal?.(terminal);
        writeSync(casesFd,line);
        caseHash.update(line);
      }else{
        const fieldBranches=branches(nextField);
        const evaluated=[];
        for(let index=fieldBranches.length-1;index>=0;index-=1){
          if(now()>=deadline)throw new Error('UCHIRIMO_CONSTRAINT_CHILD_TIMEOUT:'+CHILD_TIMEOUT_MS);
          const branch=fieldBranches[index];
          transitionChecks+=1;
          const input=applyDecision(result.selection,nextField.key,branch);
          const child=await resolveCached(input);
          const branchOk=decisionSurvives(child,nextField.key,branch);
          const priorOk=Object.entries(currentDecisions).filter(([key])=>!constraintMap.has(key)).every(([key,decision])=>decisionSurvives(child,key,decision));
          const constraintsOk=[...constraintMap].every(([key,decision])=>decisionSurvives(child,key,decision,{constraint:true}));
          if(!branchOk||!priorOk||!constraintsOk){dependencyRejections+=1;if(!constraintsOk)constraintRejections+=1;continue;}
          downstreamClearChecks+=(child.clearedFields??[]).length;
          evaluated.push({branch,selection:child.selection,decisions:{...currentDecisions,[nextField.key]:branch},result:child,symbolicMultiplier:current.symbolicMultiplier,symbolicAxes:current.symbolicAxes});
        }
        if(options.symbolic!==false&&symbolicSafety.independent.has(nextField.key)&&fieldBranches.length>1){
          symbolicEquivalenceChecks+=evaluated.length;
          const equivalent=evaluated.length===fieldBranches.length&&new Set(evaluated.map(item=>sha(symbolicBehaviorProjection(item.result,nextField.key)))).size===1;
          if(equivalent){
            const factor=fieldBranches.length;
            if(current.symbolicMultiplier>Math.floor(Number.MAX_SAFE_INTEGER/factor))throw new Error('UCHIRIMO_SYMBOLIC_MULTIPLICITY_OVERFLOW');
            symbolicCollapsedBranchCount+=factor-1;
            const representative=evaluated.at(-1);
            stack.push({...representative,symbolicMultiplier:current.symbolicMultiplier*factor,symbolicAxes:[...current.symbolicAxes,{field_key:nextField.key,branch_count:factor,branches:fieldBranches.map(stable)}]});
          }else{symbolicFallbackCount+=1;stack.push(...evaluated);}
        }else stack.push(...evaluated);
      }
      if(stack.length>maxStack)maxStack=stack.length;
      if(visited.size%5000===0){peakHeapMb=Math.max(peakHeapMb,Math.round(process.memoryUsage().heapUsed/1024/1024));writeProgress();console.log('UCHIRIMO_CONSTRAINT_PROGRESS shard='+shard+' states='+visited.size+' terminals='+terminalCount+' constraint_rejections='+constraintRejections+' stack='+stack.length);}
    }

    if(now()>=deadline)throw new Error('UCHIRIMO_CONSTRAINT_CHILD_TIMEOUT:'+CHILD_TIMEOUT_MS);
    closeSync(casesFd);casesFd=null;
    peakHeapMb=Math.max(peakHeapMb,Math.round(process.memoryUsage().heapUsed/1024/1024));
    if(terminalCount===0)throw new Error('UCHIRIMO_NO_TERMINAL_SELECTOR_CONTEXTS:SHARD:'+shard);
    const report={schema_version:'2.0.0',exact_head:head,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,proof_model:'UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXPLICIT_CONSTRAINT_SYMBOLIC_SHARD_V3',shard_index:shard,parent_shard_index:identity.parent_shard_index,node_id:String(row.node_id),partition_key:partitionKey,parent_partition_key:identity.parent_partition_key,recovery_unit_id:identity.recovery_unit_id,recovery_depth:identity.recovery_depth,parent_recovery_unit_id:identity.parent_recovery_unit_id,partition_seed:stable(extra),decision_constraints:identity.decision_constraints,decision_constraints_sha256:constraintHash,glass_family:String(row.glass_family),seed:stable(seed),shard_count:EXPECTED_SHARDS,run_attempt:Number(process.env.GITHUB_RUN_ATTEMPT??1),window_type:String(row.window_type),runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,runtime_integrity_match:true,terminal_context_count:terminalCount,terminal_equivalence_class_count:terminalClassCount,symbolic_equivalence_check_count:symbolicEquivalenceChecks,symbolic_collapsed_branch_count:symbolicCollapsedBranchCount,symbolic_fallback_count:symbolicFallbackCount,visited_state_count:visited.size,transition_check_count:transitionChecks,dependency_rejection_count:dependencyRejections,constraint_rejection_count:constraintRejections,downstream_clear_event_count:downstreamClearChecks,flow_signature_count:signatureCounts.size,flow_signature_sha256s:[...signatureCounts.keys()].map((value)=>sha(value)).sort(),continuous_dimension_coverage_delegated_to:'CUSTOM_SIZE_COVERAGE_GATE',unverified_discrete_selector_case_count:0,case_artifact:basename(casesPath),case_artifact_format:'UCHIRIMO_TERMINAL_EQUIVALENCE_CLASS_DIGEST_JSONL_V1',case_artifact_sha256:caseHash.digest('hex'),max_stack_depth:maxStack,observed_peak_heap_mb:peakHeapMb,resolver_cache_size:resolverCache.size,resolver_cache_limit:MAX_RESOLVER_CACHE,resolver_cache_hits:resolverCacheHits,resolver_cache_misses:resolverCacheMisses,status:'PASS'};
    writeProgress('PASS');
    writeFileSync(join(OUT,names.report),JSON.stringify(report,null,2)+'\n');
    console.log('UCHIRIMO_CONSTRAINT_SELECTOR_SHARD=PASS shard='+shard+' constraints='+constraints.length+' terminals='+terminalCount+' states='+visited.size+' constraint_rejections='+constraintRejections);
    return {shard,partition_key:partitionKey,parent_shard_index:identity.parent_shard_index,parent_partition_key:identity.parent_partition_key,recovery_unit_id:identity.recovery_unit_id,recovery_depth:identity.recovery_depth,parent_recovery_unit_id:identity.parent_recovery_unit_id,decision_constraints_sha256:identity.decision_constraints_sha256,status:'PASS',timed_out:false,exit_code:0,signal:null,runner:'INLINE_EXPLICIT_CONSTRAINT_V2',constraint_count:constraints.length,started_at:startedAt,completed_at:new Date().toISOString()};
  }catch(error){
    if(casesFd!==null){try{closeSync(casesFd)}catch{}casesFd=null;}
    try{writeFileSync(failurePath,JSON.stringify({exact_head:process.env.HEAD_SHA??process.env.GITHUB_SHA??null,mode:'constraint-shard',shard_index:Number.isInteger(shard)?shard:null,status:'FAIL',code:error?.code??null,message:error?.message??String(error),stack:error?.stack??null,observed_at:new Date().toISOString()},null,2)+'\n')}catch{}
    return {shard,partition_key:partitionKey,parent_shard_index:identity.parent_shard_index,parent_partition_key:identity.parent_partition_key,recovery_unit_id:identity.recovery_unit_id,recovery_depth:identity.recovery_depth,parent_recovery_unit_id:identity.parent_recovery_unit_id,decision_constraints_sha256:identity.decision_constraints_sha256,status:'FAIL',timed_out:/UCHIRIMO_CONSTRAINT_CHILD_TIMEOUT/.test(String(error?.message)),exit_code:1,signal:null,error:error?.message??String(error),runner:'INLINE_EXPLICIT_CONSTRAINT_V2',constraint_count:constraints.length,started_at:startedAt,completed_at:new Date().toISOString()};
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
if(!BATCH_ID)throw new Error('UCHIRIMO_BATCH_ID_REQUIRED');
if(!Array.isArray(batch)||batch.length<1||batch.length>2)throw new Error('UCHIRIMO_BATCH_ITEMS_INVALID:'+String(batch?.length));
if(!Number.isFinite(CHILD_TIMEOUT_MS)||CHILD_TIMEOUT_MS<60000)throw new Error('UCHIRIMO_CHILD_TIMEOUT_INVALID:'+CHILD_TIMEOUT_MS);
mkdirSync(OUT,{recursive:true});

console.log('UCHIRIMO_SELECTOR_BATCH_START id='+BATCH_ID+' items='+batch.length);
const results=[];
for(const row of batch){
  let constraints,identity;
  try{
    constraints=parseConstraints(row);
    identity=recoveryIdentity(row,constraints);
  }catch(error){
    results.push({shard:Number(row.shard),partition_key:String(row.partition_key),status:'FAIL',timed_out:false,exit_code:null,signal:null,error:error?.message??String(error),runner:null,constraint_count:null,started_at:new Date().toISOString(),completed_at:new Date().toISOString()});
    continue;
  }
  if(constraints.length)results.push(await runConstraint(row,constraints,identity));
  else results.push({...await runNormal(row),...identity});
}
const failed=results.filter((row)=>row.status!=='PASS');
const report={schema_version:'2.0.0',exact_head:process.env.HEAD_SHA??process.env.GITHUB_SHA??null,batch_id:BATCH_ID,evidence_artifact_identity:EVIDENCE_ARTIFACT_IDENTITY||null,item_count:results.length,pass_count:results.length-failed.length,fail_count:failed.length,child_timeout_ms:CHILD_TIMEOUT_MS,results,status:failed.length?'FAIL':'PASS'};
writeFileSync(join(OUT,'batch-'+BATCH_ID+'-report.json'),JSON.stringify(report,null,2)+'\n');
if(failed.length){
  console.error('UCHIRIMO_SELECTOR_BATCH=FAIL id='+BATCH_ID+' failed='+failed.map((row)=>row.shard).join(','));
  process.exit(1);
}
console.log('UCHIRIMO_SELECTOR_BATCH=PASS id='+BATCH_ID+' items='+results.length);

}
