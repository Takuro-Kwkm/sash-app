import { createHash } from 'node:crypto';
import { closeSync, copyFileSync, createReadStream, mkdirSync, openSync, readFileSync, readdirSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { basename, join } from 'node:path';
import { currentExactHead } from './governance/governance-lib.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT_ID='SER-YKKAP-UCHIRIMO';
const MODE=process.env.UCHIRIMO_SELECTOR_MODE ?? 'shard';
const OUT=process.env.UCHIRIMO_FULL_SELECTOR_OUT ?? (MODE==='aggregate' ? 'artifacts/uchirimo-full-selector-proof' : 'artifacts/uchirimo-selector-proof-shard');
const INPUT=process.env.UCHIRIMO_SELECTOR_SHARD_INPUT ?? 'artifacts/uchirimo-selector-proof-shards';
const SHARD_INDEX=Number(process.env.UCHIRIMO_WINDOW_SHARD_INDEX ?? -1);
const EXPECTED_SHARDS=Number(process.env.UCHIRIMO_SELECTOR_EXPECTED_SHARDS ?? 4);
const MAX_STATES=Number(process.env.UCHIRIMO_SELECTOR_MAX_STATES ?? 250000);
const MAX_TERMINALS=Number(process.env.UCHIRIMO_SELECTOR_MAX_TERMINALS ?? 100000);
const MAX_RESOLVER_CACHE=Number(process.env.UCHIRIMO_RESOLVER_CACHE_MAX ?? 512);
const CONTINUOUS_KEYS=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECHNICAL_KEYS=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);

mkdirSync(OUT,{recursive:true});

const stable=(value)=>{
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
};
const stableJson=(value)=>JSON.stringify(stable(value));
const sha=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const same=(a,b)=>Array.isArray(b)
  ? Array.isArray(a)&&stableJson(a.map(String).sort())===stableJson(b.map(String).sort())
  : Object.is(a,b)||String(a)===String(b);
const enabled=(field)=>(field?.values??[]).filter((row)=>row.disabled!==true);
const normalizeMulti=(rows)=>[...new Map(rows.map((v)=>[String(v),v])).values()].sort((a,b)=>String(a).localeCompare(String(b)));

function branches(field){
  const values=enabled(field).map((row)=>row.value);
  if(field.dataType==='MULTI_ENUM'){
    if(values.length>12)throw new Error('UCHIRIMO_MULTI_ENUM_SYMBOLIC_PROOF_REQUIRED:'+field.key+':'+values.length);
    const out=[];
    const total=2**values.length;
    for(let mask=0;mask<total;mask+=1){
      const subset=[];
      for(let i=0;i<values.length;i+=1)if(mask&(1<<i))subset.push(values[i]);
      if(field.required&&subset.length===0)continue;
      out.push({kind:'VALUE',value:normalizeMulti(subset)});
    }
    return out;
  }
  const out=values.map((value)=>({kind:'VALUE',value}));
  if(!field.required)out.unshift({kind:'UNSET'});
  return out;
}

function applyBranch(selection,field,branch){
  const next={...(selection??{})};
  if(branch.kind==='UNSET')delete next[field.key];
  else next[field.key]=branch.value;
  return next;
}

function decisionSurvives(result,key,decision){
  if(decision.kind==='UNSET')return !result.fields.find((field)=>field.key===key)?.required || !present(result.selection?.[key]);
  return same(result.selection?.[key],decision.value);
}

function flowSignature(result){
  return (result.fields??[])
    .filter((field)=>!TECHNICAL_KEYS.has(field.key))
    .map((field)=>String(field.semanticStage)+':'+String(field.semanticSlot)+':'+String(field.key)+':'+(field.required?'R':'O')+':'+(field.readOnly?'RO':'RW'))
    .join('|');
}

function walk(dir){
  const out=[];
  for(const name of readdirSync(dir)){
    const path=join(dir,name);
    const stat=statSync(path);
    if(stat.isDirectory())out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

async function shaFile(path){
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(path))hash.update(chunk);
  return hash.digest('hex');
}

async function aggregate(){
  const head=process.env.HEAD_SHA??process.env.GITHUB_SHA??currentExactHead();
  const reportPaths=walk(INPUT).filter((path)=>/shard-\d+-report\.json$/.test(path));
  if(reportPaths.length!==EXPECTED_SHARDS)throw new Error('UCHIRIMO_SHARD_REPORT_COUNT_MISMATCH:'+reportPaths.length+':'+EXPECTED_SHARDS);
  const reports=reportPaths.map((path)=>({path,data:JSON.parse(readFileSync(path,'utf8'))})).sort((a,b)=>a.data.shard_index-b.data.shard_index);
  const expectedIndices=Array.from({length:EXPECTED_SHARDS},(_,i)=>i);
  if(reports.some((row,i)=>row.data.shard_index!==expectedIndices[i]))throw new Error('UCHIRIMO_SHARD_INDEX_COVERAGE_MISMATCH');
  const runtimeHashes=new Set();
  const windows=new Set();
  const flowSignatures=new Set();
  const perWindow={};
  let terminals=0;
  let states=0;
  let transitions=0;
  let dependencyRejections=0;
  let downstreamClearChecks=0;
  let resolverCacheHits=0;
  let resolverCacheMisses=0;
  let maxStack=0;
  let peakHeapMb=0;
  mkdirSync(join(OUT,'shards'),{recursive:true});
  const caseArtifacts=[];
  for(const row of reports){
    const report=row.data;
    if(report.exact_head!==head)throw new Error('UCHIRIMO_SHARD_EXACT_HEAD_MISMATCH:'+report.shard_index);
    if(report.status!=='PASS'||report.unverified_discrete_selector_case_count!==0)throw new Error('UCHIRIMO_SHARD_NOT_PASS:'+report.shard_index);
    if(report.runtime_integrity_match!==true)throw new Error('UCHIRIMO_SHARD_RUNTIME_INTEGRITY_FAIL:'+report.shard_index);
    if(windows.has(String(report.window_type)))throw new Error('UCHIRIMO_SHARD_DUPLICATE_WINDOW:'+report.window_type);
    windows.add(String(report.window_type));
    runtimeHashes.add(String(report.runtime_manifest_sha256));
    for(const sig of report.flow_signature_sha256s??[])flowSignatures.add(String(sig));
    terminals+=report.terminal_context_count;
    states+=report.visited_state_count;
    transitions+=report.transition_check_count;
    dependencyRejections+=report.dependency_rejection_count;
    downstreamClearChecks+=report.downstream_clear_event_count;
    resolverCacheHits+=report.resolver_cache_hits;
    resolverCacheMisses+=report.resolver_cache_misses;
    maxStack=Math.max(maxStack,report.max_stack_depth??0);
    peakHeapMb=Math.max(peakHeapMb,report.observed_peak_heap_mb??0);
    perWindow[String(report.window_type)]=report.terminal_context_count;
    const casePath=walk(INPUT).find((path)=>basename(path)===basename(report.case_artifact));
    if(!casePath)throw new Error('UCHIRIMO_SHARD_CASE_ARTIFACT_MISSING:'+report.shard_index);
    const actualCaseSha=await shaFile(casePath);
    if(actualCaseSha!==report.case_artifact_sha256)throw new Error('UCHIRIMO_SHARD_CASE_SHA_MISMATCH:'+report.shard_index);
    const targetCase=join(OUT,'shards',basename(casePath));
    const targetReport=join(OUT,'shards',basename(row.path));
    copyFileSync(casePath,targetCase);
    copyFileSync(row.path,targetReport);
    caseArtifacts.push({shard_index:report.shard_index,window_type:report.window_type,path:'shards/'+basename(casePath),sha256:actualCaseSha});
  }
  if(runtimeHashes.size!==1)throw new Error('UCHIRIMO_SHARD_RUNTIME_HASH_MISMATCH');
  if(windows.size!==EXPECTED_SHARDS)throw new Error('UCHIRIMO_SHARD_WINDOW_COVERAGE_MISMATCH:'+windows.size);
  const combined={
    schema_version:'2.0.0',
    exact_head:head,
    task_classification:'NON-PRODUCT-MASTER',
    product_master_mutation:0,
    proof_model:'UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXHAUSTIVE_SHARDED_V2',
    runtime_manifest_sha256:[...runtimeHashes][0],
    runtime_integrity_match:true,
    shard_count:EXPECTED_SHARDS,
    window_type_count:windows.size,
    terminal_context_count:terminals,
    visited_state_count:states,
    transition_check_count:transitions,
    dependency_rejection_count:dependencyRejections,
    downstream_clear_event_count:downstreamClearChecks,
    flow_signature_count:flowSignatures.size,
    per_window_terminal_count:Object.fromEntries(Object.entries(perWindow).sort(([a],[b])=>a.localeCompare(b))),
    continuous_dimension_coverage_delegated_to:'CUSTOM_SIZE_COVERAGE_GATE',
    unverified_discrete_selector_case_count:0,
    case_artifacts:caseArtifacts,
    max_stack_depth:maxStack,
    observed_peak_heap_mb_max:peakHeapMb,
    resolver_cache_limit_per_shard:MAX_RESOLVER_CACHE,
    resolver_cache_hits:resolverCacheHits,
    resolver_cache_misses:resolverCacheMisses,
    status:'PASS'
  };
  writeFileSync(join(OUT,'report.json'),JSON.stringify(combined,null,2)+'\n');
  console.log('UCHIRIMO_FULL_SELECTOR_PROOF=PASS_SHARDED shards='+EXPECTED_SHARDS+' terminals='+terminals+' states='+states+' transitions='+transitions+' peak_heap_mb_max='+peakHeapMb);
  console.log('UCHIRIMO_UNVERIFIED_DISCRETE_SELECTOR_CASE_COUNT=0');
}

async function runShard(){
  if(!Number.isInteger(SHARD_INDEX)||SHARD_INDEX<0||SHARD_INDEX>=EXPECTED_SHARDS)throw new Error('UCHIRIMO_INVALID_SHARD_INDEX:'+SHARD_INDEX);
  const head=currentExactHead();
  const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
  if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_RUNTIME_INTEGRITY_NOT_PASS');
  const resolverCache=new Map();
  let resolverCacheHits=0;
  let resolverCacheMisses=0;
  async function resolveCached(selection){
    const cacheKey=sha(selection??{});
    const cached=resolverCache.get(cacheKey);
    if(cached){resolverCacheHits+=1;return cached;}
    const result=await resolveRuntimeAppProduct(PRODUCT_ID,selection);
    resolverCache.set(cacheKey,result);
    while(resolverCache.size>MAX_RESOLVER_CACHE){
      const oldest=resolverCache.keys().next().value;
      resolverCache.delete(oldest);
    }
    resolverCacheMisses+=1;
    return result;
  }

  const root=await resolveCached({});
  const rootWindow=root.fields.find((field)=>field.key==='window_type');
  const expectedWindows=enabled(rootWindow).map((row)=>row.value);
  if(!rootWindow||expectedWindows.length!==EXPECTED_SHARDS)throw new Error('UCHIRIMO_WINDOW_POPULATION_MISMATCH:'+(rootWindow?expectedWindows.length:0));
  const selectedWindow=expectedWindows[SHARD_INDEX];
  const selected=await resolveCached({...root.selection,window_type:selectedWindow});
  if(!same(selected.selection?.window_type,selectedWindow))throw new Error('UCHIRIMO_SHARD_WINDOW_SELECTION_REJECTED:'+SHARD_INDEX);

  const stack=[{selection:selected.selection??{window_type:selectedWindow},decisions:{window_type:{kind:'VALUE',value:selectedWindow}}}];
  const visited=new Set();
  const signatureCounts=new Map();
  let transitionChecks=0;
  let dependencyRejections=0;
  let downstreamClearChecks=0;
  let terminalCount=0;
  let maxStack=stack.length;
  let peakHeapMb=0;
  const casesPath=join(OUT,'shard-'+SHARD_INDEX+'-cases.jsonl');
  const casesFd=openSync(casesPath,'w');
  const caseHash=createHash('sha256');

  try{
    while(stack.length){
      if(visited.size>=MAX_STATES)throw new Error('UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED:'+MAX_STATES+':SHARD:'+SHARD_INDEX);
      const current=stack.pop();
      const result=await resolveCached(current.selection);
      const visibleKeys=new Set((result.fields??[]).map((field)=>field.key));
      const decisions=Object.fromEntries(Object.entries(current.decisions).filter(([key])=>visibleKeys.has(key)));
      const stateKey=sha({selection:result.selection,decisions});
      if(visited.has(stateKey))continue;
      visited.add(stateKey);

      for(const field of result.fields??[]){
        if(TECHNICAL_KEYS.has(field.key))throw new Error('UCHIRIMO_TECHNICAL_FIELD_VISIBLE:'+field.key);
        if(!field.semanticStage||!field.semanticSlot)throw new Error('UCHIRIMO_UNMAPPED_UI_FIELD:'+field.key);
      }
      const signature=flowSignature(result);
      signatureCounts.set(signature,(signatureCounts.get(signature)??0)+1);
      const nextField=(result.fields??[]).find((field)=>
        !field.readOnly &&
        !CONTINUOUS_KEYS.has(field.key) &&
        field.dataType!=='NUMBER' &&
        enabled(field).length>0 &&
        !Object.prototype.hasOwnProperty.call(decisions,field.key)
      );

      if(!nextField){
        if(terminalCount>=MAX_TERMINALS)throw new Error('UCHIRIMO_TERMINAL_LIMIT_REACHED:'+MAX_TERMINALS+':SHARD:'+SHARD_INDEX);
        terminalCount+=1;
        const row={
          case_id:'UCHIRIMO-S'+SHARD_INDEX+'-'+String(terminalCount).padStart(6,'0'),
          window_type:result.selection?.window_type??null,
          selection:stable(result.selection??{}),
          validation_status:result.validation?.status??null,
          continuous_fields:(result.fields??[]).filter((field)=>CONTINUOUS_KEYS.has(field.key)||field.dataType==='NUMBER').map((field)=>field.key),
          flow_signature_sha256:sha(signature),
          required_fields:(result.fields??[]).filter((field)=>field.required).map((field)=>field.key)
        };
        const line=JSON.stringify(row)+'\n';
        writeSync(casesFd,line);
        caseHash.update(line);
        continue;
      }

      const fieldBranches=branches(nextField);
      for(let i=fieldBranches.length-1;i>=0;i-=1){
        const branch=fieldBranches[i];
        transitionChecks+=1;
        const input=applyBranch(result.selection,nextField,branch);
        const child=await resolveCached(input);
        const nextDecisions={...decisions,[nextField.key]:branch};
        const branchSurvives=branch.kind==='UNSET'
          ? (!nextField.required && !present(child.selection?.[nextField.key]))
          : same(child.selection?.[nextField.key],branch.value);
        const priorSurvive=Object.entries(decisions).every(([key,decision])=>decisionSurvives(child,key,decision));
        if(!branchSurvives||!priorSurvive){
          dependencyRejections+=1;
          continue;
        }
        downstreamClearChecks+=(child.clearedFields??[]).length;
        stack.push({selection:child.selection,decisions:nextDecisions});
      }
      if(stack.length>maxStack)maxStack=stack.length;
      if(visited.size%2000===0){
        peakHeapMb=Math.max(peakHeapMb,Math.round(process.memoryUsage().heapUsed/1024/1024));
        console.log('UCHIRIMO_SHARD_PROGRESS shard='+SHARD_INDEX+' states='+visited.size+' terminals='+terminalCount+' stack='+stack.length+' heap_mb='+peakHeapMb);
      }
    }
  }finally{
    closeSync(casesFd);
  }

  peakHeapMb=Math.max(peakHeapMb,Math.round(process.memoryUsage().heapUsed/1024/1024));
  if(terminalCount===0)throw new Error('UCHIRIMO_NO_TERMINAL_SELECTOR_CONTEXTS:SHARD:'+SHARD_INDEX);
  const report={
    schema_version:'2.0.0',
    exact_head:head,
    task_classification:'NON-PRODUCT-MASTER',
    product_master_mutation:0,
    proof_model:'UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXHAUSTIVE_SHARD_V2',
    shard_index:SHARD_INDEX,
    shard_count:EXPECTED_SHARDS,
    window_type:selectedWindow,
    runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
    runtime_integrity_match:runtime.sourcePackageIntegrity.match,
    terminal_context_count:terminalCount,
    visited_state_count:visited.size,
    transition_check_count:transitionChecks,
    dependency_rejection_count:dependencyRejections,
    downstream_clear_event_count:downstreamClearChecks,
    flow_signature_count:signatureCounts.size,
    flow_signature_sha256s:[...signatureCounts.keys()].map((value)=>sha(value)).sort(),
    continuous_dimension_coverage_delegated_to:'CUSTOM_SIZE_COVERAGE_GATE',
    unverified_discrete_selector_case_count:0,
    case_artifact:basename(casesPath),
    case_artifact_sha256:caseHash.digest('hex'),
    max_stack_depth:maxStack,
    observed_peak_heap_mb:peakHeapMb,
    resolver_cache_size:resolverCache.size,
    resolver_cache_limit:MAX_RESOLVER_CACHE,
    resolver_cache_hits:resolverCacheHits,
    resolver_cache_misses:resolverCacheMisses,
    status:'PASS'
  };
  writeFileSync(join(OUT,'shard-'+SHARD_INDEX+'-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('UCHIRIMO_SELECTOR_SHARD=PASS shard='+SHARD_INDEX+' window='+String(selectedWindow)+' terminals='+terminalCount+' states='+visited.size+' transitions='+transitionChecks+' peak_heap_mb='+peakHeapMb);
}

const failurePath=join(OUT,MODE==='aggregate'?'aggregate-failure.json':'shard-'+String(SHARD_INDEX)+'-failure.json');
try{
  if(MODE==='aggregate')await aggregate();
  else if(MODE==='shard')await runShard();
  else throw new Error('UCHIRIMO_UNKNOWN_SELECTOR_MODE:'+MODE);
}catch(error){
  try{
    writeFileSync(failurePath,JSON.stringify({
      exact_head:process.env.HEAD_SHA??process.env.GITHUB_SHA??null,
      mode:MODE,
      shard_index:Number.isInteger(SHARD_INDEX)?SHARD_INDEX:null,
      status:'FAIL',
      code:error?.code??null,
      message:error?.message??String(error),
      stack:error?.stack??null,
      observed_at:new Date().toISOString()
    },null,2)+'\n');
  }catch{}
  console.error(error);
  process.exit(1);
}
