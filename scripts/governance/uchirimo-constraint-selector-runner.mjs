import { createHash } from 'node:crypto';
import { closeSync, mkdirSync, openSync, writeFileSync, writeSync } from 'node:fs';
import { basename, join } from 'node:path';
import { currentExactHead } from './governance-lib.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT_ID='SER-YKKAP-UCHIRIMO';
const OUT=String(process.env.UCHIRIMO_FULL_SELECTOR_OUT ?? 'artifacts/uchirimo-constraint-selector-proof-shard');
const SHARD_INDEX=Number(process.env.UCHIRIMO_WINDOW_SHARD_INDEX ?? -1);
const SHARD_NODE_ID=String(process.env.UCHIRIMO_SELECTOR_NODE_ID ?? '');
const TARGET_ROOM=String(process.env.UCHIRIMO_SELECTOR_ROOM ?? '');
const TARGET_WINDOW=String(process.env.UCHIRIMO_SELECTOR_WINDOW ?? '');
const TARGET_SASH=String(process.env.UCHIRIMO_SELECTOR_SASH ?? '__UNSET__');
const TARGET_SIZE_CLASS=String(process.env.UCHIRIMO_SELECTOR_SIZE_CLASS ?? '__UNSET__');
const TARGET_GLASS_FAMILY=String(process.env.UCHIRIMO_SELECTOR_GLASS_FAMILY ?? '');
const TARGET_PARTITION_KEY=String(process.env.UCHIRIMO_SELECTOR_PARTITION_KEY ?? '');
const TARGET_PARTITION_SEED=JSON.parse(String(process.env.UCHIRIMO_SELECTOR_PARTITION_SEED_JSON ?? '{}'));
const TARGET_CONSTRAINTS=JSON.parse(String(process.env.UCHIRIMO_SELECTOR_DECISION_CONSTRAINTS_JSON ?? '[]'));
const EXPECTED_SHARDS=Number(process.env.UCHIRIMO_SELECTOR_EXPECTED_SHARDS ?? 0);
const MAX_STATES=Number(process.env.UCHIRIMO_SELECTOR_MAX_STATES ?? 1000000);
const MAX_TERMINALS=Number(process.env.UCHIRIMO_SELECTOR_MAX_TERMINALS ?? 1000000);
const MAX_RESOLVER_CACHE=Number(process.env.UCHIRIMO_RESOLVER_CACHE_MAX ?? 512);
const CONTINUOUS_KEYS=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECHNICAL_KEYS=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);

mkdirSync(OUT,{recursive:true});
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
const enabledValues=(field)=>[...new Map((field?.values??[]).filter((row)=>row.disabled!==true).map((row)=>[stableJson(row.value),row.value])).values()];
const normalizeMulti=(rows)=>[...new Map(rows.map((value)=>[String(value),value])).values()].sort((a,b)=>String(a).localeCompare(String(b)));

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

const failurePath=join(OUT,'shard-'+String(SHARD_INDEX)+'-failure.json');
try{
  if(!Number.isInteger(SHARD_INDEX)||SHARD_INDEX<0||SHARD_INDEX>=EXPECTED_SHARDS)throw new Error('UCHIRIMO_INVALID_SHARD_INDEX:'+SHARD_INDEX);
  if(!SHARD_NODE_ID||!TARGET_ROOM||!TARGET_WINDOW||!TARGET_GLASS_FAMILY||!TARGET_PARTITION_KEY)throw new Error('UCHIRIMO_SHARD_PLAN_INPUT_MISSING:'+SHARD_INDEX);
  if(!Array.isArray(TARGET_CONSTRAINTS)||TARGET_CONSTRAINTS.length<1)throw new Error('UCHIRIMO_DECISION_CONSTRAINTS_REQUIRED');
  const constraintKeys=TARGET_CONSTRAINTS.map((row)=>String(row?.field_key??''));
  if(constraintKeys.some((key)=>!key)||new Set(constraintKeys).size!==constraintKeys.length)throw new Error('UCHIRIMO_DECISION_CONSTRAINT_KEYS_INVALID');

  const head=currentExactHead();
  const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
  if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_RUNTIME_INTEGRITY_NOT_PASS');
  const formalNode=(runtime.master?.canonical?.product_nodes??[]).find((row)=>String(row.node_id)===SHARD_NODE_ID);
  if(!formalNode)throw new Error('UCHIRIMO_SHARD_PRODUCT_NODE_NOT_FOUND:'+SHARD_NODE_ID);
  if(String(formalNode.room??'')!==TARGET_ROOM||String(formalNode.window_type??'')!==TARGET_WINDOW)throw new Error('UCHIRIMO_SHARD_PLAN_NODE_AXIS_MISMATCH:'+SHARD_NODE_ID);
  if(TARGET_WINDOW==='sliding_window'){
    if(TARGET_SASH!=='__UNSET__'&&String(formalNode.sash_configuration??'')!==TARGET_SASH)throw new Error('UCHIRIMO_SHARD_PLAN_SASH_MISMATCH:'+SHARD_NODE_ID);
    if(TARGET_SIZE_CLASS!=='__UNSET__'&&String(formalNode.size_class??'')!==TARGET_SIZE_CLASS)throw new Error('UCHIRIMO_SHARD_PLAN_SIZE_CLASS_MISMATCH:'+SHARD_NODE_ID);
  }

  const resolverCache=new Map();
  let resolverCacheHits=0;
  let resolverCacheMisses=0;
  async function resolveCached(selection){
    const cacheKey=sha(selection??{});
    if(resolverCache.has(cacheKey)){resolverCacheHits+=1;return resolverCache.get(cacheKey);}
    const result=await resolveRuntimeAppProduct(PRODUCT_ID,selection);
    resolverCache.set(cacheKey,result);
    while(resolverCache.size>MAX_RESOLVER_CACHE)resolverCache.delete(resolverCache.keys().next().value);
    resolverCacheMisses+=1;
    return result;
  }

  const seed={room_specification:TARGET_ROOM,window_type:TARGET_WINDOW};
  if(TARGET_SASH!=='__UNSET__')seed.sash_configuration=TARGET_SASH;
  if(TARGET_SIZE_CLASS!=='__UNSET__')seed.size_class=TARGET_SIZE_CLASS;
  seed.glass_family=TARGET_GLASS_FAMILY;
  for(const [key,value] of Object.entries(TARGET_PARTITION_SEED)){
    if(Object.prototype.hasOwnProperty.call(seed,key))throw new Error('UCHIRIMO_PARTITION_SEED_AXIS_COLLISION:'+key);
    if(constraintKeys.includes(key))throw new Error('UCHIRIMO_CONSTRAINT_SEED_AXIS_COLLISION:'+key);
    seed[key]=value;
  }
  let selected=await resolveCached(seed);
  for(const [key,value] of Object.entries(seed))if(!same(selected.selection?.[key],value))throw new Error('UCHIRIMO_SHARD_SEED_REJECTED:'+SHARD_NODE_ID+':'+key);
  const decisions=Object.fromEntries(Object.entries(seed).map(([key,value])=>[key,{kind:'VALUE',value}]));

  for(const constraint of TARGET_CONSTRAINTS){
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

  const constraintMap=new Map(TARGET_CONSTRAINTS.map((row)=>[String(row.field_key),stable(row.decision)]));
  const constraintHash=sha(stable(TARGET_CONSTRAINTS));
  const startArtifact={
    schema_version:'1.0.0',
    exact_head:head,
    task_classification:'NON-PRODUCT-MASTER',
    product_master_mutation:0,
    runner:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_SHARD_V1',
    shard_index:SHARD_INDEX,
    node_id:SHARD_NODE_ID,
    partition_key:TARGET_PARTITION_KEY,
    seed:stable(seed),
    seed_sha256:sha(seed),
    decision_constraints:stable(TARGET_CONSTRAINTS),
    decision_constraints_sha256:constraintHash,
    initial_selection_sha256:sha(selected.selection??{}),
    runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
    runtime_integrity_match:true,
    status:'PASS'
  };
  writeFileSync(join(OUT,'shard-'+SHARD_INDEX+'-constraint-start.json'),JSON.stringify(startArtifact,null,2)+'\n');

  const stack=[{selection:selected.selection??seed,decisions:{...decisions},result:selected}];
  const visited=new Set();
  const signatureCounts=new Map();
  let transitionChecks=0;
  let dependencyRejections=0;
  let constraintRejections=0;
  let downstreamClearChecks=0;
  let terminalCount=0;
  let maxStack=stack.length;
  let peakHeapMb=0;
  const casesPath=join(OUT,'shard-'+SHARD_INDEX+'-terminal-digests.jsonl');
  const casesFd=openSync(casesPath,'w');
  const caseHash=createHash('sha256');
  const progressPath=join(OUT,'shard-'+SHARD_INDEX+'-constraint-progress.json');
  const writeProgress=()=>writeFileSync(progressPath,JSON.stringify({
    schema_version:'1.0.0',exact_head:head,shard_index:SHARD_INDEX,partition_key:TARGET_PARTITION_KEY,
    decision_constraints_sha256:constraintHash,visited_state_count:visited.size,terminal_context_count:terminalCount,
    transition_check_count:transitionChecks,dependency_rejection_count:dependencyRejections,constraint_rejection_count:constraintRejections,
    max_stack_depth:maxStack,resolver_cache_hits:resolverCacheHits,resolver_cache_misses:resolverCacheMisses,status:'IN_PROGRESS'
  },null,2)+'\n');
  writeProgress();

  try{
    while(stack.length){
      if(visited.size>=MAX_STATES)throw new Error('UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED:'+MAX_STATES+':SHARD:'+SHARD_INDEX);
      const current=stack.pop();
      const result=current.result??await resolveCached(current.selection);
      const constraintsOk=[...constraintMap].every(([key,decision])=>decisionSurvives(result,key,decision,{constraint:true}));
      if(!constraintsOk){constraintRejections+=1;continue;}
      const visibleKeys=new Set((result.fields??[]).map((field)=>field.key));
      const currentDecisions=Object.fromEntries(Object.entries(current.decisions).filter(([key])=>visibleKeys.has(key)||constraintMap.has(key)));
      for(const [key,decision] of constraintMap)currentDecisions[key]=decision;
      const stateKey=sha({selection:result.selection,decisions:currentDecisions,constraints:stable(TARGET_CONSTRAINTS)});
      if(visited.has(stateKey))continue;
      visited.add(stateKey);

      for(const field of result.fields??[]){
        if(TECHNICAL_KEYS.has(field.key))throw new Error('UCHIRIMO_TECHNICAL_FIELD_VISIBLE:'+field.key);
        if(!field.semanticStage||!field.semanticSlot)throw new Error('UCHIRIMO_UNMAPPED_UI_FIELD:'+field.key);
      }
      const signature=flowSignature(result);
      signatureCounts.set(signature,(signatureCounts.get(signature)??0)+1);
      const nextField=(result.fields??[]).find((field)=>
        !field.readOnly&&
        !CONTINUOUS_KEYS.has(field.key)&&
        field.dataType!=='NUMBER'&&
        enabledValues(field).length>0&&
        !Object.prototype.hasOwnProperty.call(currentDecisions,field.key)&&
        !constraintMap.has(field.key)
      );
      if(!nextField){
        if(terminalCount>=MAX_TERMINALS)throw new Error('UCHIRIMO_TERMINAL_LIMIT_REACHED:'+MAX_TERMINALS+':SHARD:'+SHARD_INDEX);
        terminalCount+=1;
        const terminal={case_id:'UCHIRIMO-C'+SHARD_INDEX+'-'+String(terminalCount).padStart(6,'0'),window_type:result.selection?.window_type??null,selection:stable(result.selection??{}),validation_status:result.validation?.status??null,flow_signature_sha256:sha(signature),decision_constraints_sha256:constraintHash};
        const line=JSON.stringify({case_id:terminal.case_id,window_type:terminal.window_type,terminal_sha256:sha(terminal)})+'\n';
        writeSync(casesFd,line);
        caseHash.update(line);
      }else{
        const fieldBranches=branches(nextField);
        for(let index=fieldBranches.length-1;index>=0;index-=1){
          const branch=fieldBranches[index];
          transitionChecks+=1;
          const input=applyDecision(result.selection,nextField.key,branch);
          const child=await resolveCached(input);
          const branchOk=decisionSurvives(child,nextField.key,branch);
          const priorOk=Object.entries(currentDecisions).filter(([key])=>!constraintMap.has(key)).every(([key,decision])=>decisionSurvives(child,key,decision));
          const childConstraintsOk=[...constraintMap].every(([key,decision])=>decisionSurvives(child,key,decision,{constraint:true}));
          if(!branchOk||!priorOk||!childConstraintsOk){
            dependencyRejections+=1;
            if(!childConstraintsOk)constraintRejections+=1;
            continue;
          }
          downstreamClearChecks+=(child.clearedFields??[]).length;
          stack.push({selection:child.selection,decisions:{...currentDecisions,[nextField.key]:branch},result:child});
        }
      }
      if(stack.length>maxStack)maxStack=stack.length;
      if(visited.size%5000===0){
        peakHeapMb=Math.max(peakHeapMb,Math.round(process.memoryUsage().heapUsed/1024/1024));
        writeProgress();
        console.log('UCHIRIMO_CONSTRAINT_PROGRESS shard='+SHARD_INDEX+' states='+visited.size+' terminals='+terminalCount+' constraint_rejections='+constraintRejections+' stack='+stack.length);
      }
    }
  }finally{
    closeSync(casesFd);
  }

  peakHeapMb=Math.max(peakHeapMb,Math.round(process.memoryUsage().heapUsed/1024/1024));
  if(terminalCount===0)throw new Error('UCHIRIMO_NO_TERMINAL_SELECTOR_CONTEXTS:SHARD:'+SHARD_INDEX);
  const report={
    schema_version:'1.0.0',exact_head:head,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,
    proof_model:'UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXPLICIT_CONSTRAINT_SHARD_V1',shard_index:SHARD_INDEX,node_id:SHARD_NODE_ID,
    partition_key:TARGET_PARTITION_KEY,partition_seed:stable(TARGET_PARTITION_SEED),decision_constraints:stable(TARGET_CONSTRAINTS),decision_constraints_sha256:constraintHash,
    glass_family:TARGET_GLASS_FAMILY,seed:stable(seed),shard_count:EXPECTED_SHARDS,run_attempt:Number(process.env.GITHUB_RUN_ATTEMPT??1),window_type:TARGET_WINDOW,
    runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,runtime_integrity_match:true,terminal_context_count:terminalCount,visited_state_count:visited.size,
    transition_check_count:transitionChecks,dependency_rejection_count:dependencyRejections,constraint_rejection_count:constraintRejections,downstream_clear_event_count:downstreamClearChecks,
    flow_signature_count:signatureCounts.size,flow_signature_sha256s:[...signatureCounts.keys()].map((value)=>sha(value)).sort(),continuous_dimension_coverage_delegated_to:'CUSTOM_SIZE_COVERAGE_GATE',
    unverified_discrete_selector_case_count:0,case_artifact:basename(casesPath),case_artifact_format:'UCHIRIMO_TERMINAL_DIGEST_JSONL_V1',case_artifact_sha256:caseHash.digest('hex'),
    max_stack_depth:maxStack,observed_peak_heap_mb:peakHeapMb,resolver_cache_size:resolverCache.size,resolver_cache_limit:MAX_RESOLVER_CACHE,resolver_cache_hits:resolverCacheHits,resolver_cache_misses:resolverCacheMisses,status:'PASS'
  };
  writeProgress();
  writeFileSync(join(OUT,'shard-'+SHARD_INDEX+'-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('UCHIRIMO_CONSTRAINT_SELECTOR_SHARD=PASS shard='+SHARD_INDEX+' constraints='+TARGET_CONSTRAINTS.length+' terminals='+terminalCount+' states='+visited.size+' constraint_rejections='+constraintRejections);
}catch(error){
  try{writeFileSync(failurePath,JSON.stringify({exact_head:process.env.HEAD_SHA??process.env.GITHUB_SHA??null,mode:'constraint-shard',shard_index:Number.isInteger(SHARD_INDEX)?SHARD_INDEX:null,status:'FAIL',code:error?.code??null,message:error?.message??String(error),stack:error?.stack??null,observed_at:new Date().toISOString()},null,2)+'\n')}catch{}
  console.error(error);
  process.exit(1);
}
