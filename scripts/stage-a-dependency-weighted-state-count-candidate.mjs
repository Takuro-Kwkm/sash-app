import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const OUT=process.env.STAGE_A_WEIGHTED_COUNT_OUT??'artifacts/stage-a-dependency-weighted-state-count';
const HEAD_SHA=process.env.HEAD_SHA??null;
const SHARD_TOTAL=Number(process.env.STAGE_A_SHARD_TOTAL??12);
const SHARD_INDEX=Number(process.env.STAGE_A_SHARD_INDEX??0);
const MAX_EXPLICIT_MULTI_ENUM_VALUES=Number(process.env.STAGE_A_MAX_EXPLICIT_MULTI_ENUM_VALUES??18);
const MAX_MEMO_STATES_PER_WINDOW=Number(process.env.STAGE_A_MAX_MEMO_STATES_PER_WINDOW??50000);
assert.ok(Number.isInteger(SHARD_TOTAL)&&SHARD_TOTAL>=1);
assert.ok(Number.isInteger(SHARD_INDEX)&&SHARD_INDEX>=0&&SHARD_INDEX<SHARD_TOTAL);

const PRODUCTS=[
  {id:'SER-LIX-SAMOS2H',manufacturer:'LIXIL',series:'サーモスⅡ-H',expectedWindows:17},
  {id:'SER-LIX-SAMOSL',manufacturer:'LIXIL',series:'サーモスL',expectedWindows:17},
  {id:'SER-LIX-EW',manufacturer:'LIXIL',series:'EW',expectedWindows:15},
  {id:'SER-LIXIL-TW',manufacturer:'LIXIL',series:'TW',expectedWindows:25},
  {id:'SER-YKK-APW430',manufacturer:'YKK AP',series:'APW430',expectedWindows:25},
  {id:'SER-YKK-APW431',manufacturer:'YKK AP',series:'APW431',expectedWindows:6},
];
const CONTINUOUS_KEYS=new Set(['custom_width','custom_w','order_width','custom_height','custom_h','order_height']);
const TECHNICAL_KEYS=new Set(['construction','legacyConstruction','legacyConfiguration','internal_construction']);
const TW_OPTION_CONTEXT_KEYS=['window_type','size','panel_count','glass_base','shutter_type','operation_type'];
const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const enabled=(field)=>(field?.values??[]).filter((choice)=>choice.disabled!==true);
const stable=(value)=>{if(Array.isArray(value))return value.map(stable);if(!value||typeof value!=='object')return value;return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,child])=>[key,stable(child)]));};
const stableJson=(value)=>JSON.stringify(stable(value));
const hash=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const normalizeMulti=(values)=>[...new Map(values.map((value)=>[String(value),value])).values()].sort((a,b)=>String(a).localeCompare(String(b)));
const invalid=(result)=>['INVALID','BLOCKED','BLOCK'].includes(String(result.validation?.status??''));
const userDiscreteFields=(result)=>(result.fields??[]).filter((field)=>!TECHNICAL_KEYS.has(field.key)&&!CONTINUOUS_KEYS.has(field.key)&&enabled(field).length>0&&!field.readOnly);
const nextDiscreteField=(result,finalized)=>userDiscreteFields(result).find((field)=>field.key!=='window_type'&&!finalized.has(field.key))??null;
const visibleKeys=(result)=>new Set((result.fields??[]).map((field)=>field.key));
const childFinalized=(parent,key,result)=>{const visible=visibleKeys(result);return new Set([...parent,key].filter((candidate)=>visible.has(candidate)));};
const customKeys=(result)=>({
  width:(result.fields??[]).find((field)=>['custom_width','custom_w','order_width'].includes(field.key))?.key??null,
  height:(result.fields??[]).find((field)=>['custom_height','custom_h','order_height'].includes(field.key))?.key??null,
});
const customPending=(result)=>{const keys=customKeys(result);return Boolean(keys.width&&keys.height&&(!present(result.selection?.[keys.width])||!present(result.selection?.[keys.height])));};
const addCounts=(a,b)=>({terminal:a.terminal+b.terminal,custom:a.custom+b.custom});
const ZERO=()=>({terminal:0n,custom:0n});

function scalarBranches(field){const rows=enabled(field).map((choice)=>({kind:'VALUE',value:choice.value}));if(!field.required)rows.unshift({kind:'UNSET',value:undefined});return rows;}
function* explicitMultiBranches(field){const values=enabled(field).map((choice)=>choice.value);const total=2**values.length;for(let mask=0;mask<total;mask+=1){const subset=[];for(let i=0;i<values.length;i++)if(mask&(1<<i))subset.push(values[i]);if(field.required&&subset.length===0)continue;yield{kind:'VALUE',value:normalizeMulti(subset)};}}
function applyBranch(selection,field,branch){const next={...(selection??{})};if(branch.kind==='UNSET')delete next[field.key];else next[field.key]=field.dataType==='MULTI_ENUM'?normalizeMulti(branch.value):branch.value;return next;}
function branchSurvives(result,field,branch){
  if(branch.kind==='UNSET')return !present(result.selection?.[field.key]);
  const actual=result.selection?.[field.key];
  if(Array.isArray(branch.value))return Array.isArray(actual)&&stableJson(actual.map(String).sort())===stableJson(branch.value.map(String).sort());
  return String(actual)===String(branch.value);
}
function bitCount(mask){let count=0;for(let value=mask;value;value>>=1n)count+=Number(value&1n);return count;}
function connectedComponents(adjacency){const seen=new Set(),components=[];for(const vertex of adjacency.keys()){if(seen.has(vertex))continue;const stack=[vertex],component=[];seen.add(vertex);while(stack.length){const current=stack.pop();component.push(current);for(const next of adjacency.get(current)??[]){if(seen.has(next))continue;seen.add(next);stack.push(next);}}components.push(component);}return components;}
function independentSetCount(component,adjacency){const index=new Map(component.map((value,i)=>[value,i]));const neighbors=component.map((value)=>{let mask=0n;for(const next of adjacency.get(value)??[]){const i=index.get(next);if(i!==undefined)mask|=1n<<BigInt(i);}return mask;});const memo=new Map();const solve=(mask)=>{if(mask===0n)return 1n;const key=mask.toString();if(memo.has(key))return memo.get(key);let hasEdge=false;for(let i=0;i<component.length;i++){const bit=1n<<BigInt(i);if((mask&bit)&&(neighbors[i]&mask)){hasEdge=true;break;}}if(!hasEdge){const result=1n<<BigInt(bitCount(mask));memo.set(key,result);return result;}let chosen=-1,best=-1;for(let i=0;i<component.length;i++){const bit=1n<<BigInt(i);if(!(mask&bit))continue;const degree=bitCount(neighbors[i]&mask);if(degree>best){best=degree;chosen=i;}}const bit=1n<<BigInt(chosen),without=mask&~bit;const result=solve(without)+solve(without&~neighbors[chosen]);memo.set(key,result);return result;};return solve((1n<<BigInt(component.length))-1n);}
function exactIndependentSetCount(adjacency){return connectedComponents(adjacency).reduce((product,component)=>product*independentSetCount(component,adjacency),1n);}

function dependencyMap(result){return new Map((result.dependencyFields??[]).map((row)=>[row.key,[...(row.parentFields??[])]]));}
function transitiveAncestors(depMap,key,cache=new Map()){
  if(cache.has(key))return cache.get(key);
  const result=new Set();cache.set(key,result);
  for(const parent of depMap.get(key)??[]){result.add(parent);for(const ancestor of transitiveAncestors(depMap,parent,cache))result.add(ancestor);}
  return result;
}
function visibleFieldSignature(field){
  if(!field)return{visibility:'HIDDEN'};
  return{visibility:'SHOW',dataType:field.dataType,required:Boolean(field.required),readOnly:Boolean(field.readOnly),selectionMode:field.selectionMode??null,values:enabled(field).map((choice)=>choice.value)};
}
function declaredParentTuple(result,key,depMap,ancestorCache){
  const ancestors=[...transitiveAncestors(depMap,key,ancestorCache)].sort();
  const tuple={};for(const parent of ancestors)if(Object.prototype.hasOwnProperty.call(result.selection??{},parent))tuple[parent]=result.selection[parent];
  if(Object.prototype.hasOwnProperty.call(result.selection??{},key))tuple[`$self:${key}`]=result.selection[key];
  return tuple;
}
function memoKeyFor(result,finalized){
  const depMap=dependencyMap(result),ancestorCache=new Map();
  const futureKeys=[...depMap.keys()].filter((key)=>key!=='window_type'&&!TECHNICAL_KEYS.has(key)&&!CONTINUOUS_KEYS.has(key)&&!finalized.has(key));
  const live=new Set(futureKeys);
  for(const key of futureKeys)for(const ancestor of transitiveAncestors(depMap,key,ancestorCache))live.add(ancestor);
  const liveSelection={};for(const key of [...live].sort())if(Object.prototype.hasOwnProperty.call(result.selection??{},key))liveSelection[key]=result.selection[key];
  const fields=userDiscreteFields(result).filter((field)=>field.key!=='window_type'&&!finalized.has(field.key)).map((field)=>({key:field.key,...visibleFieldSignature(field)}));
  return hash({finalized:[...finalized].sort(),liveSelection,fields,validation:result.validation?.status??null,dimensionResult:result.dimensionResult??null});
}

const twProofCache=new Map();
let twProofCacheHits=0,twProofCacheMisses=0,twProofPairChecksExecuted=0,twProofSingletonChecksExecuted=0;
function twOptionContextKey(product,result,field){
  const context={};
  for(const key of TW_OPTION_CONTEXT_KEYS)context[key]=result.selection?.[key]??null;
  return hash({product_id:product.id,field:field.key,required:Boolean(field.required),context,candidates:enabled(field).map((choice)=>String(choice.value)).sort()});
}
async function symbolicTwTerminalPopulation(product,result,field){
  const contextKey=twOptionContextKey(product,result,field);
  const cached=twProofCache.get(contextKey);
  if(cached){twProofCacheHits+=1;return{...cached,cacheHit:true,contextKey,resolverCallsAdded:0};}
  twProofCacheMisses+=1;
  const candidates=enabled(field).map((choice)=>String(choice.value));
  const adjacency=new Map(candidates.map((value)=>[value,new Set()]));
  let singletonChecks=0,pairChecks=0;
  for(let i=0;i<candidates.length;i++){
    const a=candidates[i];
    const singleton=await resolveRuntimeAppProduct(product.id,{...(result.selection??{}),[field.key]:[a]});
    const singletonSelected=new Set((Array.isArray(singleton.selection?.[field.key])?singleton.selection[field.key]:[]).map(String));
    if(!singletonSelected.has(a))throw new Error(`${product.id}/${result.selection?.window_type}: symbolic singleton failed ${a}`);
    singletonChecks+=1;twProofSingletonChecksExecuted+=1;
    for(let j=i+1;j<candidates.length;j++){
      const b=candidates[j];
      const pair=await resolveRuntimeAppProduct(product.id,{...(result.selection??{}),[field.key]:[a,b]});
      const selected=new Set((Array.isArray(pair.selection?.[field.key])?pair.selection[field.key]:[]).map(String));
      if(!(selected.has(a)&&selected.has(b))){adjacency.get(a).add(b);adjacency.get(b).add(a);}
      pairChecks+=1;twProofPairChecksExecuted+=1;
    }
  }
  let count=exactIndependentSetCount(adjacency);if(field.required)count-=1n;
  let edgeCount=0;const conflicts=[];
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++)if(adjacency.get(candidates[i]).has(candidates[j])){edgeCount+=1;conflicts.push([candidates[i],candidates[j]]);}
  const proof={count,candidateCount:candidates.length,singletonChecks,pairChecks,edgeCount,conflictDigest:hash(conflicts)};
  twProofCache.set(contextKey,proof);
  return{...proof,cacheHit:false,contextKey,resolverCallsAdded:singletonChecks+pairChecks};
}

async function inventoryWindows(product){
  const root=await resolveRuntimeAppProduct(product.id,{});
  const field=(root.fields??[]).find((row)=>row.key==='window_type');assert.ok(field,`${product.id}: window_type missing`);
  const windows=enabled(field).map((choice)=>String(choice.value));assert.equal(windows.length,product.expectedWindows,`${product.id}: window count ${windows.length}/${product.expectedWindows}`);return windows;
}

await mkdir(OUT,{recursive:true});
const inventory=[];let globalWindowIndex=0;
for(const product of PRODUCTS)for(const windowType of await inventoryWindows(product)){inventory.push({...product,windowType,globalWindowIndex});globalWindowIndex+=1;}
assert.equal(inventory.length,105);
const assigned=inventory.filter((row)=>row.globalWindowIndex%SHARD_TOTAL===SHARD_INDEX);
const windows=[];const blockers=[];const metadataInconsistencies=[];const symbolicFrontiers=[];
let aggregateTerminal=0n,aggregateCustom=0n,totalMemoHits=0,totalMemoStates=0,totalResolverCalls=0,totalCompressionCollisions=0;

for(const row of assigned){
  const root=await resolveRuntimeAppProduct(row.id,{window_type:row.windowType});
  assert.equal(String(root.selection?.window_type),row.windowType,`${row.id}/${row.windowType}: window did not survive`);
  const memo=new Map(),memoRepresentative=new Map(),parentConsistency=new Map();
  let memoHits=0,resolverCalls=1,compressionCollisions=0,symbolicTerminalCount=0,blocked=null;

  function auditDeclaredParents(result){
    if(blocked)return;
    const depMap=dependencyMap(result),ancestorCache=new Map();
    const fieldsByKey=new Map((result.fields??[]).map((field)=>[field.key,field]));
    for(const key of depMap.keys()){
      if(TECHNICAL_KEYS.has(key)||CONTINUOUS_KEYS.has(key))continue;
      const tuple=declaredParentTuple(result,key,depMap,ancestorCache);
      const consistencyKey=`${key}:${hash(tuple)}`;
      const signature=stableJson(visibleFieldSignature(fieldsByKey.get(key)));
      const previous=parentConsistency.get(consistencyKey);
      if(previous!==undefined&&previous!==signature){
        const issue={manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,field:key,parent_tuple:tuple,first_signature:JSON.parse(previous),second_signature:JSON.parse(signature),status:'DECLARED_PARENT_METADATA_INCONSISTENT'};
        metadataInconsistencies.push(issue);blocked=issue;return;
      }
      parentConsistency.set(consistencyKey,signature);
    }
  }

  async function countState(result,finalized){
    if(blocked)return ZERO();
    auditDeclaredParents(result);if(blocked)return ZERO();
    const field=nextDiscreteField(result,finalized);
    if(!field)return{terminal:1n,custom:customPending(result)?1n:0n};

    const key=memoKeyFor(result,finalized);
    if(memo.has(key)){
      memoHits+=1;
      const fullHash=hash({selection:result.selection??{},fields:(result.fields??[]).map((f)=>({key:f.key,values:enabled(f).map((c)=>c.value)}))});
      if(memoRepresentative.get(key)!==fullHash)compressionCollisions+=1;
      return memo.get(key);
    }
    if(memo.size>=MAX_MEMO_STATES_PER_WINDOW){
      blocked={manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,status:'MEMO_STATE_LIMIT_REACHED',memo_state_count:memo.size};blockers.push(blocked);return ZERO();
    }
    const fullHash=hash({selection:result.selection??{},fields:(result.fields??[]).map((f)=>({key:f.key,values:enabled(f).map((c)=>c.value)}))});
    memoRepresentative.set(key,fullHash);

    const remaining=userDiscreteFields(result).filter((candidate)=>candidate.key!=='window_type'&&!finalized.has(candidate.key));
    if(field.dataType==='MULTI_ENUM'&&enabled(field).length>MAX_EXPLICIT_MULTI_ENUM_VALUES){
      if(row.id==='SER-LIXIL-TW'&&field.key==='option'&&remaining.length===1){
        const proof=await symbolicTwTerminalPopulation(row,result,field);
        resolverCalls+=proof.resolverCallsAdded;
        symbolicTerminalCount+=1;
        symbolicFrontiers.push({manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,field:field.key,parent_selection:stable(result.selection??{}),context_key:proof.contextKey,cache_hit:proof.cacheHit,candidate_count:proof.candidateCount,pair_checks_logical:proof.pairChecks,pair_checks_executed:proof.cacheHit?0:proof.pairChecks,conflict_edge_count:proof.edgeCount,conflict_digest:proof.conflictDigest,exact_terminal_count:proof.count.toString(),status:'SYMBOLIC_TERMINAL_COUNTED'});
        const value={terminal:proof.count,custom:0n};memo.set(key,value);return value;
      }
      blocked={manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,field:field.key,candidate_count:enabled(field).length,status:'UNSUPPORTED_OVERSIZED_MULTI_ENUM'};blockers.push(blocked);return ZERO();
    }

    let total=ZERO();
    const branches=field.dataType==='MULTI_ENUM'?explicitMultiBranches(field):scalarBranches(field);
    for(const branch of branches){
      if(blocked)break;
      const resolved=await resolveRuntimeAppProduct(row.id,applyBranch(result.selection,field,branch));resolverCalls+=1;
      if(!branchSurvives(resolved,field,branch)||invalid(resolved))continue;
      total=addCounts(total,await countState(resolved,childFinalized(finalized,field.key,resolved)));
    }
    memo.set(key,total);return total;
  }

  const result=await countState(root,new Set(['window_type']));
  totalMemoHits+=memoHits;totalMemoStates+=memo.size;totalResolverCalls+=resolverCalls;totalCompressionCollisions+=compressionCollisions;
  if(!blocked){aggregateTerminal+=result.terminal;aggregateCustom+=result.custom;}
  const status=blocked?'BLOCKED':'COUNTED_CANDIDATE';
  windows.push({manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,status,exact_discrete_terminal_context_count:blocked?null:result.terminal.toString(),custom_pending_context_count:blocked?null:result.custom.toString(),memo_state_count:memo.size,memo_hit_count:memoHits,compression_collision_count:compressionCollisions,parent_consistency_key_count:parentConsistency.size,resolver_call_count:resolverCalls,symbolic_terminal_count:symbolicTerminalCount,blocker:blocked});
  console.log(`WINDOW_COUNT shard=${SHARD_INDEX}/${SHARD_TOTAL} product=${row.id} window=${row.windowType} status=${status} terminals=${blocked?'BLOCKED':result.terminal} custom=${blocked?'BLOCKED':result.custom} memo=${memo.size} hits=${memoHits} collisions=${compressionCollisions} resolver_calls=${resolverCalls}`);
}

const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,
  proof_status:blockers.length||metadataInconsistencies.length?'CANDIDATE_BLOCKED':'DEPENDENCY_WEIGHTED_COUNT_CANDIDATE',
  proof_basis:'DECLARED_PARENT_FIELDS_LIVENESS_PLUS_EXACT_RUNTIME_BRANCH_RESOLUTION',
  performance_model:'TW_RULE_SENSITIVE_CONTEXT_CACHE_V1',
  shard_index:SHARD_INDEX,shard_total:SHARD_TOTAL,base_window_count:assigned.length,
  counted_window_count:windows.filter((row)=>row.status==='COUNTED_CANDIDATE').length,
  blocked_window_count:windows.filter((row)=>row.status==='BLOCKED').length,
  exact_discrete_terminal_context_count:blockers.length||metadataInconsistencies.length?null:aggregateTerminal.toString(),
  custom_pending_context_count:blockers.length||metadataInconsistencies.length?null:aggregateCustom.toString(),
  memo_state_count:totalMemoStates,memo_hit_count:totalMemoHits,compression_collision_count:totalCompressionCollisions,resolver_call_count:totalResolverCalls,
  symbolic_terminal_frontier_count:symbolicFrontiers.length,
  parent_metadata_inconsistency_count:metadataInconsistencies.length,
  tw_proof_cache:{context_keys:twProofCache.size,hit_count:twProofCacheHits,miss_count:twProofCacheMisses,singleton_checks_executed:twProofSingletonChecksExecuted,pair_checks_executed:twProofPairChecksExecuted,context_key_fields:[...TW_OPTION_CONTEXT_KEYS,'candidate_set','required']},
  windows,blockers,parent_metadata_inconsistencies:metadataInconsistencies,symbolic_frontiers:symbolicFrontiers,
  gate_status:{exhaustive_state_graph_gate:'BLOCKED_PENDING_GOVERNING_PROMOTION',qa_population_gate:'BLOCKED_PENDING_GOVERNING_PROMOTION',full_browser_qa_gate:'NOT_STARTED',app_integration_ready:false,release_input_gate:'BLOCKED'},
  note:'NON-GOVERNING candidate v2. Continuations are memoized only from Runtime-declared parent_fields. TW oversized option exact pair proofs are reused only under a rule-sensitive context signature containing window_type, size, panel_count, glass_base, shutter_type, operation_type, candidate set and required state. Runtime branches are still resolved exactly. CUSTOM continuous dimensions remain pending proof contexts.',
};
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(`DEPENDENCY_WEIGHTED_COUNT_STATUS=${report.proof_status}`);
console.log(`BASE_WINDOW_COUNT=${report.base_window_count}`);
console.log(`COUNTED_WINDOW_COUNT=${report.counted_window_count}`);
console.log(`BLOCKED_WINDOW_COUNT=${report.blocked_window_count}`);
console.log(`EXACT_DISCRETE_TERMINAL_CONTEXT_COUNT=${report.exact_discrete_terminal_context_count??'BLOCKED'}`);
console.log(`CUSTOM_PENDING_CONTEXT_COUNT=${report.custom_pending_context_count??'BLOCKED'}`);
console.log(`PARENT_METADATA_INCONSISTENCY_COUNT=${report.parent_metadata_inconsistency_count}`);
console.log(`MEMO_STATE_COUNT=${report.memo_state_count}`);
console.log(`MEMO_HIT_COUNT=${report.memo_hit_count}`);
console.log(`COMPRESSION_COLLISION_COUNT=${report.compression_collision_count}`);
console.log(`RESOLVER_CALL_COUNT=${report.resolver_call_count}`);
console.log(`TW_PROOF_CACHE_HITS=${report.tw_proof_cache.hit_count}`);
console.log(`TW_PROOF_CACHE_MISSES=${report.tw_proof_cache.miss_count}`);
console.log(`TW_PAIR_CHECKS_EXECUTED=${report.tw_proof_cache.pair_checks_executed}`);
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
