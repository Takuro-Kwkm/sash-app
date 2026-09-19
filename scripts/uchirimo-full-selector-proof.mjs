import { createHash } from 'node:crypto';
import { appendFileSync, closeSync, copyFileSync, createReadStream, mkdirSync, openSync, readFileSync, readdirSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { currentExactHead } from './governance/governance-lib.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT_ID='SER-YKKAP-UCHIRIMO';
const MODE=process.env.UCHIRIMO_SELECTOR_MODE ?? 'shard';
const OUT=process.env.UCHIRIMO_FULL_SELECTOR_OUT ?? (MODE==='aggregate' ? 'artifacts/uchirimo-full-selector-proof' : 'artifacts/uchirimo-selector-proof-shard');
const INPUT=process.env.UCHIRIMO_SELECTOR_SHARD_INPUT ?? 'artifacts/uchirimo-selector-proof-shards';
const SHARD_INDEX=Number(process.env.UCHIRIMO_WINDOW_SHARD_INDEX ?? -1);
const SHARD_NODE_ID=String(process.env.UCHIRIMO_SELECTOR_NODE_ID ?? '');
const TARGET_ROOM=String(process.env.UCHIRIMO_SELECTOR_ROOM ?? '');
const TARGET_WINDOW=String(process.env.UCHIRIMO_SELECTOR_WINDOW ?? '');
const TARGET_SASH=String(process.env.UCHIRIMO_SELECTOR_SASH ?? '__UNSET__');
const TARGET_SIZE_CLASS=String(process.env.UCHIRIMO_SELECTOR_SIZE_CLASS ?? '__UNSET__');
const TARGET_GLASS_FAMILY=String(process.env.UCHIRIMO_SELECTOR_GLASS_FAMILY ?? '');
const TARGET_PARTITION_KEY=String(process.env.UCHIRIMO_SELECTOR_PARTITION_KEY ?? '');
const TARGET_PARTITION_SEED_JSON=String(process.env.UCHIRIMO_SELECTOR_PARTITION_SEED_JSON ?? '{}');
const TARGET_PARTITION_SEED=JSON.parse(TARGET_PARTITION_SEED_JSON);
const PARTITION_EXTRA_DEPTH=2;
const PLAN_LANE_COUNT=Number(process.env.UCHIRIMO_SELECTOR_PLAN_LANE_COUNT ?? 1);
const PLAN_LANE_INDEX=Number(process.env.UCHIRIMO_SELECTOR_PLAN_LANE_INDEX ?? 0);
const EXPECTED_SHARDS=Number(process.env.UCHIRIMO_SELECTOR_EXPECTED_SHARDS ?? 0);
const MAX_STATES=Number(process.env.UCHIRIMO_SELECTOR_MAX_STATES ?? 1000000);
const MAX_TERMINALS=Number(process.env.UCHIRIMO_SELECTOR_MAX_TERMINALS ?? 1000000);
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

function baseSeedForNode(row){
  const room=String(row.room??'');
  const windowType=String(row.window_type??'');
  if(!room||!windowType)throw new Error('UCHIRIMO_PRODUCT_NODE_AXIS_MISSING:'+String(row.node_id));
  const sash=windowType==='sliding_window' && row.sash_configuration!=null && row.sash_configuration!=='' ? String(row.sash_configuration) : '__UNSET__';
  const sizeClass=windowType==='sliding_window' && row.size_class!=null && row.size_class!=='' ? String(row.size_class) : '__UNSET__';
  const seed={room_specification:room,window_type:windowType};
  if(sash!=='__UNSET__')seed.sash_configuration=sash;
  if(sizeClass!=='__UNSET__')seed.size_class=sizeClass;
  return {room,windowType,sash,sizeClass,seed};
}

function nextRequiredEnumPartition(result,seed){
  for(const field of result.fields??[]){
    if(field.required!==true||field.readOnly===true||field.dataType!=='ENUM')continue;
    if(TECHNICAL_KEYS.has(field.key)||CONTINUOUS_KEYS.has(field.key))continue;
    if(Object.prototype.hasOwnProperty.call(seed,field.key))continue;
    const values=[...new Map(enabled(field).map((row)=>[stableJson(row.value),row.value])).values()];
    if(values.length>1)return {field,values};
  }
  return null;
}

function isV7MeasuredTimeoutClass(base,glassFamily,extraSeed){
  if(glassFamily==='insulating_glass'&&base.windowType==='fix_window'){
    return ['P3P3','F4P3'].includes(String(extraSeed.glass_structure??''));
  }
  if(glassFamily==='insulating_glass'&&['inward_opening_window','opening_window_terrace'].includes(base.windowType)){
    return true;
  }
  if(base.windowType==='sliding_window'&&base.sash==='two_panel'){
    const bathroomWindow=base.room==='bathroom'&&base.sizeClass==='window';
    const residentialTerrace=base.room==='residential'&&base.sizeClass==='terrace';
    return (bathroomWindow||residentialTerrace)&&['single_glazing','insulating_glass'].includes(glassFamily);
  }
  return false;
}

function isV8MeasuredTimeoutClass(base,glassFamily,extraSeed){
  const structure=String(extraSeed.glass_structure??'');
  if(base.room==='bathroom'&&base.windowType==='inward_opening_window'&&glassFamily==='insulating_glass'){
    return structure==='G4P3';
  }
  if(base.room==='bathroom'&&base.windowType==='sliding_window'&&base.sash==='two_panel'&&base.sizeClass==='window'){
    if(glassFamily==='single_glazing')return ['P5','XJ'].includes(structure);
    if(glassFamily==='insulating_glass')return String(extraSeed.reverse_handing??'')==='reverse'&&['P4P4','G4P3'].includes(structure);
  }
  if(base.room==='residential'&&base.windowType==='fix_window'&&glassFamily==='insulating_glass'){
    return String(extraSeed.frame_color??'')==='greige'&&structure==='G4P3';
  }
  return false;
}

async function buildShardPartitions(runtime){
  const rows=[...(runtime.master?.canonical?.product_nodes??[])].sort((a,b)=>String(a.node_id).localeCompare(String(b.node_id)));
  if(!rows.length)throw new Error('UCHIRIMO_PRODUCT_NODE_PLAN_EMPTY');
  const include=[];
  const seenPartitions=new Set();
  const seenSeeds=new Set();

  const pushPartition=(row,base,glassFamily,seed,extraSeed)=>{
    const nodeId=String(row.node_id);
    const extraEntries=Object.entries(extraSeed);
    const suffix=extraEntries.length
      ? extraEntries.map(([key,value])=>key+'='+stableJson(value)).join('|')
      : '__BASE__';
    const partitionKey=nodeId+'|'+glassFamily+'|'+suffix;
    if(seenPartitions.has(partitionKey))throw new Error('UCHIRIMO_PARTITION_DUPLICATE:'+partitionKey);
    const seedKey=stableJson(seed);
    if(seenSeeds.has(seedKey))throw new Error('UCHIRIMO_PARTITION_SEED_DUPLICATE:'+partitionKey);
    seenPartitions.add(partitionKey);
    seenSeeds.add(seedKey);
    include.push({
      shard:include.length,
      node_id:nodeId,
      partition_key:partitionKey,
      room_specification:base.room,
      window_type:base.windowType,
      sash_configuration:base.sash,
      size_class:base.sizeClass,
      glass_family:glassFamily,
      partition_seed_json:JSON.stringify(stable(extraSeed))
    });
  };

  const pushSplit=async(row,base,glassFamily,seed,extraSeed,resolved,extra)=>{
    if(!extra){
      pushPartition(row,base,glassFamily,seed,extraSeed);
      return;
    }
    for(const value of extra.values){
      const nextSeed={...seed,[extra.field.key]:value};
      const nextExtraSeed={...extraSeed,[extra.field.key]:value};
      const nextResolved=await resolveRuntimeAppProduct(PRODUCT_ID,nextSeed);
      if(!same(nextResolved.selection?.[extra.field.key],value))throw new Error('UCHIRIMO_EXTRA_PARTITION_SEED_REJECTED:'+String(row.node_id)+':'+extra.field.key+':'+String(value));
      pushPartition(row,base,glassFamily,nextSeed,nextExtraSeed);
    }
  };

  const expandMeasured=async(row,base,glassFamily,seed,extraSeed,resolved)=>{
    const v7=isV7MeasuredTimeoutClass(base,glassFamily,extraSeed);
    const v8=isV8MeasuredTimeoutClass(base,glassFamily,extraSeed);
    if(!v7&&!v8){
      pushPartition(row,base,glassFamily,seed,extraSeed);
      return;
    }
    const extra=nextRequiredEnumPartition(resolved,seed);
    if(!extra){
      pushPartition(row,base,glassFamily,seed,extraSeed);
      return;
    }
    for(const value of extra.values){
      const nextSeed={...seed,[extra.field.key]:value};
      const nextExtraSeed={...extraSeed,[extra.field.key]:value};
      const nextResolved=await resolveRuntimeAppProduct(PRODUCT_ID,nextSeed);
      if(!same(nextResolved.selection?.[extra.field.key],value))throw new Error('UCHIRIMO_EXTRA_PARTITION_SEED_REJECTED:'+String(row.node_id)+':'+extra.field.key+':'+String(value));
      if(v7&&isV8MeasuredTimeoutClass(base,glassFamily,nextExtraSeed)){
        await pushSplit(row,base,glassFamily,nextSeed,nextExtraSeed,nextResolved,nextRequiredEnumPartition(nextResolved,nextSeed));
      }else{
        pushPartition(row,base,glassFamily,nextSeed,nextExtraSeed);
      }
    }
  };

  const expand=async(row,base,glassFamily,seed,extraSeed,resolved,remainingDepth)=>{
    if(remainingDepth<=0){
      await expandMeasured(row,base,glassFamily,seed,extraSeed,resolved);
      return;
    }
    const extra=nextRequiredEnumPartition(resolved,seed);
    if(!extra){
      pushPartition(row,base,glassFamily,seed,extraSeed);
      return;
    }
    for(const value of extra.values){
      const nextSeed={...seed,[extra.field.key]:value};
      const nextExtraSeed={...extraSeed,[extra.field.key]:value};
      const nextResolved=await resolveRuntimeAppProduct(PRODUCT_ID,nextSeed);
      if(!same(nextResolved.selection?.[extra.field.key],value))throw new Error('UCHIRIMO_EXTRA_PARTITION_SEED_REJECTED:'+String(row.node_id)+':'+extra.field.key+':'+String(value));
      await expand(row,base,glassFamily,nextSeed,nextExtraSeed,nextResolved,remainingDepth-1);
    }
  };

  for(const row of rows){
    const nodeId=String(row.node_id);
    const base=baseSeedForNode(row);
    const baseResult=await resolveRuntimeAppProduct(PRODUCT_ID,base.seed);
    for(const [key,value] of Object.entries(base.seed))if(!same(baseResult.selection?.[key],value))throw new Error('UCHIRIMO_PRODUCT_NODE_BASE_SEED_REJECTED:'+nodeId+':'+key);
    const glassField=(baseResult.fields??[]).find((field)=>field.key==='glass_family');
    const glassFamilies=[...new Set(enabled(glassField).map((entry)=>String(entry.value)))];
    if(!glassFamilies.length)throw new Error('UCHIRIMO_PRODUCT_NODE_GLASS_FAMILY_EMPTY:'+nodeId);
    for(const glassFamily of glassFamilies){
      const glassSeed={...base.seed,glass_family:glassFamily};
      const resolved=await resolveRuntimeAppProduct(PRODUCT_ID,glassSeed);
      if(!same(resolved.selection?.glass_family,glassFamily))throw new Error('UCHIRIMO_GLASS_FAMILY_SEED_REJECTED:'+nodeId+':'+glassFamily);
      await expand(row,base,glassFamily,glassSeed,{},resolved,PARTITION_EXTRA_DEPTH);
    }
  }
  return include;
}

async function plan(){
  const head=currentExactHead();
  const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
  if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_RUNTIME_INTEGRITY_NOT_PASS');
  const allPartitions=await buildShardPartitions(runtime);
  if(!Number.isInteger(PLAN_LANE_COUNT)||PLAN_LANE_COUNT<1)throw new Error('UCHIRIMO_PLAN_LANE_COUNT_INVALID:'+PLAN_LANE_COUNT);
  if(!Number.isInteger(PLAN_LANE_INDEX)||PLAN_LANE_INDEX<0||PLAN_LANE_INDEX>=PLAN_LANE_COUNT)throw new Error('UCHIRIMO_PLAN_LANE_INDEX_INVALID:'+PLAN_LANE_INDEX+':'+PLAN_LANE_COUNT);
  const include=allPartitions.filter((_,index)=>index%PLAN_LANE_COUNT===PLAN_LANE_INDEX);
  if(!include.length)throw new Error('UCHIRIMO_PLAN_LANE_EMPTY:'+PLAN_LANE_INDEX);
  if(include.length>256)throw new Error('UCHIRIMO_PLAN_LANE_MATRIX_LIMIT_EXCEEDED:'+PLAN_LANE_INDEX+':'+include.length);
  const matrix={include};
  const record={exact_head:head,status:'PASS',partition_axis:'product_node+glass_family+depth2+v7_depth3+v8_measured_timeout_depth4',shard_count:allPartitions.length,lane_index:PLAN_LANE_INDEX,lane_count:PLAN_LANE_COUNT,lane_shard_count:include.length,matrix};
  writeFileSync(join(OUT,'matrix.json'),JSON.stringify(record,null,2)+'\n');
  if(process.env.GITHUB_OUTPUT){
    appendFileSync(process.env.GITHUB_OUTPUT,'matrix='+JSON.stringify(matrix)+'\n');
    appendFileSync(process.env.GITHUB_OUTPUT,'shard_count='+String(allPartitions.length)+'\n');
    appendFileSync(process.env.GITHUB_OUTPUT,'lane_shard_count='+String(include.length)+'\n');
  }
  console.log('UCHIRIMO_SELECTOR_PLAN=PASS partitions='+allPartitions.length+' lane='+PLAN_LANE_INDEX+'/'+PLAN_LANE_COUNT+' lane_partitions='+include.length+' axis=product_node+glass_family+depth2+v7_depth3+v8_measured_timeout_depth4');
}
async function aggregate(){
  const head=process.env.HEAD_SHA??process.env.GITHUB_SHA??currentExactHead();
  const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
  if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_RUNTIME_INTEGRITY_NOT_PASS');
  const expectedNodeIds=new Set((runtime.master?.canonical?.product_nodes??[]).map((row)=>String(row.node_id)));
  const expectedPartitions=await buildShardPartitions(runtime);
  const expectedPartitionKeys=new Set(expectedPartitions.map((row)=>String(row.partition_key)));
  if(expectedPartitionKeys.size!==EXPECTED_SHARDS)throw new Error('UCHIRIMO_EXPECTED_SHARD_COUNT_RUNTIME_MISMATCH:'+expectedPartitionKeys.size+':'+EXPECTED_SHARDS);
  const reportPaths=walk(INPUT).filter((path)=>/shard-\d+-report\.json$/.test(path));
  const reportCandidates=reportPaths.map((path)=>({path,data:JSON.parse(readFileSync(path,'utf8'))}));
  const latestByShard=new Map();
  for(const row of reportCandidates){
    const index=Number(row.data.shard_index);
    if(!Number.isInteger(index))continue;
    const current=latestByShard.get(index);
    if(!current||Number(row.data.run_attempt??1)>Number(current.data.run_attempt??1))latestByShard.set(index,row);
  }
  const reports=[...latestByShard.values()].sort((a,b)=>a.data.shard_index-b.data.shard_index);
  if(reports.length!==EXPECTED_SHARDS)throw new Error('UCHIRIMO_SHARD_REPORT_COUNT_MISMATCH:'+reports.length+':'+EXPECTED_SHARDS);
  const expectedIndices=Array.from({length:EXPECTED_SHARDS},(_,i)=>i);
  if(reports.some((row,i)=>row.data.shard_index!==expectedIndices[i]))throw new Error('UCHIRIMO_SHARD_INDEX_COVERAGE_MISMATCH');
  const runtimeHashes=new Set();
  const windows=new Set();
  const nodeIds=new Set();
  const partitionKeys=new Set();
  const seedKeys=new Set();
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
    const nodeId=String(report.node_id??'');
    const partitionKey=String(report.partition_key??'');
    if(!expectedNodeIds.has(nodeId))throw new Error('UCHIRIMO_SHARD_UNKNOWN_PRODUCT_NODE:'+nodeId);
    if(!expectedPartitionKeys.has(partitionKey))throw new Error('UCHIRIMO_SHARD_UNKNOWN_PARTITION:'+partitionKey);
    if(partitionKeys.has(partitionKey))throw new Error('UCHIRIMO_SHARD_DUPLICATE_PARTITION:'+partitionKey);
    partitionKeys.add(partitionKey);
    nodeIds.add(nodeId);
    const seedKey=stableJson(report.seed??{});
    if(seedKeys.has(seedKey))throw new Error('UCHIRIMO_SHARD_DUPLICATE_SEED:'+nodeId);
    seedKeys.add(seedKey);
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
    perWindow[String(report.window_type)]=(perWindow[String(report.window_type)]??0)+report.terminal_context_count;
    const casePath=join(dirname(row.path),basename(report.case_artifact));
    if(!statSync(casePath).isFile())throw new Error('UCHIRIMO_SHARD_CASE_ARTIFACT_MISSING:'+report.shard_index);
    const actualCaseSha=await shaFile(casePath);
    if(actualCaseSha!==report.case_artifact_sha256)throw new Error('UCHIRIMO_SHARD_CASE_SHA_MISMATCH:'+report.shard_index);
    const targetCase=join(OUT,'shards',basename(casePath));
    const targetReport=join(OUT,'shards',basename(row.path));
    copyFileSync(casePath,targetCase);
    copyFileSync(row.path,targetReport);
    caseArtifacts.push({shard_index:report.shard_index,run_attempt:Number(report.run_attempt??1),window_type:report.window_type,path:'shards/'+basename(casePath),sha256:actualCaseSha});
  }
  if(runtimeHashes.size!==1)throw new Error('UCHIRIMO_SHARD_RUNTIME_HASH_MISMATCH');
  if(partitionKeys.size!==expectedPartitionKeys.size||[...expectedPartitionKeys].some((key)=>!partitionKeys.has(key)))throw new Error('UCHIRIMO_SHARD_PARTITION_COVERAGE_MISMATCH:'+partitionKeys.size+':'+expectedPartitionKeys.size);
  if(nodeIds.size!==expectedNodeIds.size||[...expectedNodeIds].some((id)=>!nodeIds.has(id)))throw new Error('UCHIRIMO_SHARD_PRODUCT_NODE_COVERAGE_MISMATCH:'+nodeIds.size+':'+expectedNodeIds.size);
  if(windows.size!==4)throw new Error('UCHIRIMO_SHARD_WINDOW_COVERAGE_MISMATCH:'+windows.size);
  const combined={
    schema_version:'2.0.0',
    exact_head:head,
    task_classification:'NON-PRODUCT-MASTER',
    product_master_mutation:0,
    proof_model:'UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXHAUSTIVE_SHARDED_V8',
    runtime_manifest_sha256:[...runtimeHashes][0],
    runtime_integrity_match:true,
    shard_count:EXPECTED_SHARDS,
    partition_axis:'product_node+glass_family+depth2+v7_depth3+v8_measured_timeout_depth4',
    product_node_count:nodeIds.size,
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

  if(!SHARD_NODE_ID||!TARGET_ROOM||!TARGET_WINDOW||!TARGET_GLASS_FAMILY||!TARGET_PARTITION_KEY)throw new Error('UCHIRIMO_SHARD_PLAN_INPUT_MISSING:'+SHARD_INDEX);
  const formalNode=(runtime.master?.canonical?.product_nodes??[]).find((row)=>String(row.node_id)===SHARD_NODE_ID);
  if(!formalNode)throw new Error('UCHIRIMO_SHARD_PRODUCT_NODE_NOT_FOUND:'+SHARD_NODE_ID);
  const seed={room_specification:TARGET_ROOM,window_type:TARGET_WINDOW};
  if(TARGET_SASH!=='__UNSET__')seed.sash_configuration=TARGET_SASH;
  if(TARGET_SIZE_CLASS!=='__UNSET__')seed.size_class=TARGET_SIZE_CLASS;
  seed.glass_family=TARGET_GLASS_FAMILY;
  for(const [key,value] of Object.entries(TARGET_PARTITION_SEED)){
    if(Object.prototype.hasOwnProperty.call(seed,key))throw new Error('UCHIRIMO_PARTITION_SEED_AXIS_COLLISION:'+key);
    seed[key]=value;
  }
  if(String(formalNode.room??'')!==TARGET_ROOM||String(formalNode.window_type??'')!==TARGET_WINDOW)throw new Error('UCHIRIMO_SHARD_PLAN_NODE_AXIS_MISMATCH:'+SHARD_NODE_ID);
  if(TARGET_WINDOW==='sliding_window'){
    if(TARGET_SASH!=='__UNSET__'&&String(formalNode.sash_configuration??'')!==TARGET_SASH)throw new Error('UCHIRIMO_SHARD_PLAN_SASH_MISMATCH:'+SHARD_NODE_ID);
    if(TARGET_SIZE_CLASS!=='__UNSET__'&&String(formalNode.size_class??'')!==TARGET_SIZE_CLASS)throw new Error('UCHIRIMO_SHARD_PLAN_SIZE_CLASS_MISMATCH:'+SHARD_NODE_ID);
  }
  const selected=await resolveCached(seed);
  for(const [key,value] of Object.entries(seed))if(!same(selected.selection?.[key],value))throw new Error('UCHIRIMO_SHARD_SEED_REJECTED:'+SHARD_NODE_ID+':'+key);
  const decisions=Object.fromEntries(Object.entries(seed).map(([key,value])=>[key,{kind:'VALUE',value}]));
  const stack=[{selection:selected.selection??seed,decisions,result:selected}];
  const visited=new Set();
  const signatureCounts=new Map();
  let transitionChecks=0;
  let dependencyRejections=0;
  let downstreamClearChecks=0;
  let terminalCount=0;
  let maxStack=stack.length;
  let peakHeapMb=0;
  const casesPath=join(OUT,'shard-'+SHARD_INDEX+'-terminal-digests.jsonl');
  const casesFd=openSync(casesPath,'w');
  const caseHash=createHash('sha256');

  try{
    while(stack.length){
      if(visited.size>=MAX_STATES)throw new Error('UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED:'+MAX_STATES+':SHARD:'+SHARD_INDEX);
      const current=stack.pop();
      const result=current.result??await resolveCached(current.selection);
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
        const line=JSON.stringify({
          case_id:row.case_id,
          window_type:row.window_type,
          terminal_sha256:sha(row)
        })+'\n';
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
        stack.push({selection:child.selection,decisions:nextDecisions,result:child});
      }
      if(stack.length>maxStack)maxStack=stack.length;
      if(visited.size%25000===0){
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
    proof_model:'UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXHAUSTIVE_SHARD_V8',
    shard_index:SHARD_INDEX,
    node_id:SHARD_NODE_ID,
    partition_key:TARGET_PARTITION_KEY,
    partition_seed:stable(TARGET_PARTITION_SEED),
    glass_family:TARGET_GLASS_FAMILY,
    seed:stable(seed),
    shard_count:EXPECTED_SHARDS,
    run_attempt:Number(process.env.GITHUB_RUN_ATTEMPT??1),
    window_type:TARGET_WINDOW,
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
    case_artifact_format:'UCHIRIMO_TERMINAL_DIGEST_JSONL_V1',
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
  console.log('UCHIRIMO_SELECTOR_SHARD=PASS shard='+SHARD_INDEX+' node='+SHARD_NODE_ID+' glass='+TARGET_GLASS_FAMILY+' partition='+TARGET_PARTITION_KEY+' window='+TARGET_WINDOW+' terminals='+terminalCount+' states='+visited.size+' transitions='+transitionChecks+' peak_heap_mb='+peakHeapMb);
}

const failurePath=join(OUT,MODE==='aggregate'?'aggregate-failure.json':MODE==='plan'?'plan-failure.json':'shard-'+String(SHARD_INDEX)+'-failure.json');
try{
  if(MODE==='plan')await plan();
  else if(MODE==='aggregate')await aggregate();
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
