import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const OUT=process.env.STAGE_A_SYMBOLIC_FRONTIER_OUT??'artifacts/stage-a-symbolic-frontier-discovery';
const HEAD_SHA=process.env.HEAD_SHA??null;
const SHARD_TOTAL=Number(process.env.STAGE_A_SHARD_TOTAL??12);
const SHARD_INDEX=Number(process.env.STAGE_A_SHARD_INDEX??0);
const MAX_EXPLICIT_MULTI_ENUM_VALUES=Number(process.env.STAGE_A_MAX_EXPLICIT_MULTI_ENUM_VALUES??18);
const MAX_TRAVERSAL_PER_WINDOW=Number(process.env.STAGE_A_MAX_TRAVERSAL_PER_WINDOW??500000);
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
const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const enabled=(field)=>(field?.values??[]).filter((choice)=>choice.disabled!==true);
const normalizeMulti=(values)=>[...new Map(values.map((value)=>[String(value),value])).values()].sort((a,b)=>String(a).localeCompare(String(b)));
const stable=(value)=>{if(Array.isArray(value))return value.map(stable);if(!value||typeof value!=='object')return value;return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,child])=>[key,stable(child)]));};
const stableJson=(value)=>JSON.stringify(stable(value));
const hash=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const sameValue=(a,b)=>String(a)===String(b);
const selectedContains=(actual,expected)=>Array.isArray(expected)?Array.isArray(actual)&&stableJson(actual.map(String).sort())===stableJson(expected.map(String).sort()):sameValue(actual,expected);
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

function scalarBranches(field){const rows=enabled(field).map((choice)=>({kind:'VALUE',value:choice.value}));if(!field.required)rows.unshift({kind:'UNSET',value:undefined});return rows;}
function explicitMultiBranches(field){const values=enabled(field).map((choice)=>choice.value);const rows=[];for(let mask=0;mask<2**values.length;mask+=1){const subset=[];for(let i=0;i<values.length;i++)if(mask&(1<<i))subset.push(values[i]);if(field.required&&subset.length===0)continue;rows.push({kind:'VALUE',value:normalizeMulti(subset)});}return rows;}
function applyBranch(selection,field,branch){const next={...(selection??{})};if(branch.kind==='UNSET')delete next[field.key];else next[field.key]=field.dataType==='MULTI_ENUM'?normalizeMulti(branch.value):branch.value;return next;}
function survives(result,field,branch){if(branch.kind==='UNSET')return !present(result.selection?.[field.key])||!field.required;return selectedContains(result.selection?.[field.key],branch.value);}
function fingerprint(result,finalized){return stableJson({selection:result.selection??{},finalized:[...finalized].sort(),fields:(result.fields??[]).filter((field)=>!TECHNICAL_KEYS.has(field.key)).map((field)=>({key:field.key,type:field.dataType,required:Boolean(field.required),readOnly:Boolean(field.readOnly),values:enabled(field).map((choice)=>choice.value)}))});}
function bitCount(mask){let count=0;for(let value=mask;value;value>>=1n)count+=Number(value&1n);return count;}
function connectedComponents(adjacency){const seen=new Set(),components=[];for(const vertex of adjacency.keys()){if(seen.has(vertex))continue;const stack=[vertex],component=[];seen.add(vertex);while(stack.length){const current=stack.pop();component.push(current);for(const next of adjacency.get(current)??[]){if(seen.has(next))continue;seen.add(next);stack.push(next);}}components.push(component);}return components;}
function independentSetCount(component,adjacency){const index=new Map(component.map((value,i)=>[value,i]));const neighbors=component.map((value)=>{let mask=0n;for(const next of adjacency.get(value)??[]){const i=index.get(next);if(i!==undefined)mask|=1n<<BigInt(i);}return mask;});const memo=new Map();const solve=(mask)=>{if(mask===0n)return 1n;const key=mask.toString();if(memo.has(key))return memo.get(key);let hasEdge=false;for(let i=0;i<component.length;i++){const bit=1n<<BigInt(i);if((mask&bit)&&(neighbors[i]&mask)){hasEdge=true;break;}}if(!hasEdge){const result=1n<<BigInt(bitCount(mask));memo.set(key,result);return result;}let chosen=-1,best=-1;for(let i=0;i<component.length;i++){const bit=1n<<BigInt(i);if(!(mask&bit))continue;const degree=bitCount(neighbors[i]&mask);if(degree>best){best=degree;chosen=i;}}const bit=1n<<BigInt(chosen),without=mask&~bit;const result=solve(without)+solve(without&~neighbors[chosen]);memo.set(key,result);return result;};return solve((1n<<BigInt(component.length))-1n);}
function exactIndependentSetCount(adjacency){return connectedComponents(adjacency).reduce((product,component)=>product*independentSetCount(component,adjacency),1n);}

async function symbolicOptionPopulation(product,result,field){
  const candidates=enabled(field).map((choice)=>String(choice.value));
  const adjacency=new Map(candidates.map((value)=>[value,new Set()]));
  let singletonChecks=0,pairChecks=0;
  for(let i=0;i<candidates.length;i++){
    const a=candidates[i];
    const singleton=await resolveRuntimeAppProduct(product.id,{...(result.selection??{}),[field.key]:[a]});
    if(!(Array.isArray(singleton.selection?.[field.key])&&singleton.selection[field.key].map(String).includes(a)))throw new Error(`${product.id}: oversized option candidate failed singleton: ${a}`);
    singletonChecks+=1;
    for(let j=i+1;j<candidates.length;j++){
      const b=candidates[j];
      const pair=await resolveRuntimeAppProduct(product.id,{...(result.selection??{}),[field.key]:[a,b]});
      const selected=new Set((Array.isArray(pair.selection?.[field.key])?pair.selection[field.key]:[]).map(String));
      if(!(selected.has(a)&&selected.has(b))){adjacency.get(a).add(b);adjacency.get(b).add(a);}
      pairChecks+=1;
    }
  }
  let count=exactIndependentSetCount(adjacency);
  if(field.required)count-=1n;
  const conflicts=[];
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++)if(adjacency.get(candidates[i]).has(candidates[j]))conflicts.push([candidates[i],candidates[j]]);
  return{candidate_count:candidates.length,singleton_checks:singletonChecks,pair_checks:pairChecks,conflict_edge_count:conflicts.length,conflicts,exact_compatible_subset_count:count.toString()};
}

async function inventoryWindows(product){
  const root=await resolveRuntimeAppProduct(product.id,{});
  const field=(root.fields??[]).find((row)=>row.key==='window_type');
  assert.ok(field,`${product.id}: window_type missing`);
  const windows=enabled(field).map((choice)=>String(choice.value));
  assert.equal(windows.length,product.expectedWindows,`${product.id}: window count ${windows.length}/${product.expectedWindows}`);
  return windows;
}

await mkdir(OUT,{recursive:true});
const inventory=[];let globalWindowIndex=0;
for(const product of PRODUCTS){for(const windowType of await inventoryWindows(product)){inventory.push({...product,windowType,globalWindowIndex});globalWindowIndex+=1;}}
assert.equal(inventory.length,105);
const assigned=inventory.filter((row)=>row.globalWindowIndex%SHARD_TOTAL===SHARD_INDEX);
const windows=[];const symbolicFrontiers=[];const unsupportedFrontiers=[];
let totalVisited=0,explicitTerminalFrontiers=0,customPendingFrontiers=0,prunedTransitions=0;

for(const row of assigned){
  const root=await resolveRuntimeAppProduct(row.id,{window_type:row.windowType});
  assert.equal(String(root.selection?.window_type),row.windowType,`${row.id}/${row.windowType}: window did not survive`);
  const queue=[{result:root,finalized:new Set(['window_type']),depth:0}];const visited=new Set();let queueIndex=0,windowVisited=0;
  while(queueIndex<queue.length){
    const item=queue[queueIndex++];const fp=fingerprint(item.result,item.finalized);if(visited.has(fp))continue;visited.add(fp);windowVisited+=1;totalVisited+=1;
    if(windowVisited>MAX_TRAVERSAL_PER_WINDOW)throw new Error(`${row.id}/${row.windowType}: traversal>${MAX_TRAVERSAL_PER_WINDOW}`);
    const field=nextDiscreteField(item.result,item.finalized);
    if(!field){if(customPending(item.result))customPendingFrontiers+=1;else explicitTerminalFrontiers+=1;continue;}
    const valueCount=enabled(field).length;
    if(field.dataType==='MULTI_ENUM'&&valueCount>MAX_EXPLICIT_MULTI_ENUM_VALUES){
      const remaining=userDiscreteFields(item.result).filter((candidate)=>candidate.key!=='window_type'&&!item.finalized.has(candidate.key));
      const base={frontier_id:`SYMF-${hash(`${row.id}/${row.windowType}/${fp}`).slice(0,20)}`,manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,field:field.key,candidate_count:valueCount,parent_selection:stable(item.result.selection??{}),remaining_discrete_fields:remaining.map((candidate)=>candidate.key),custom_pending:customPending(item.result)};
      if(row.id==='SER-LIXIL-TW'&&field.key==='option'&&remaining.length===1){
        const proof=await symbolicOptionPopulation(row,item.result,field);
        const frontier={...base,...proof,proof_model:'TW_SINGLE_TRIGGER_DENY_PAIRWISE_INDEPENDENT_SET',terminal_without_custom:!base.custom_pending,status:base.custom_pending?'BLOCKED_BY_DOWNSTREAM_CUSTOM_EQUIVALENCE':'SYMBOLIC_TERMINAL_CANDIDATE'};
        symbolicFrontiers.push(frontier);
      }else{
        unsupportedFrontiers.push({...base,status:'UNSUPPORTED_SYMBOLIC_MODEL'});
      }
      continue;
    }
    const branches=field.dataType==='MULTI_ENUM'?explicitMultiBranches(field):scalarBranches(field);
    for(const branch of branches){
      const resolved=await resolveRuntimeAppProduct(row.id,applyBranch(item.result.selection,field,branch));
      if(!survives(resolved,field,branch)||invalid(resolved)){prunedTransitions+=1;continue;}
      queue.push({result:resolved,finalized:childFinalized(item.finalized,field.key,resolved),depth:item.depth+1});
    }
  }
  windows.push({manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,visited_state_count:visited.size});
  console.log(`WINDOW_DONE shard=${SHARD_INDEX}/${SHARD_TOTAL} product=${row.id} window=${row.windowType} visited=${visited.size}`);
}

const symbolicStandard=symbolicFrontiers.filter((row)=>row.status==='SYMBOLIC_TERMINAL_CANDIDATE');
const symbolicCustom=symbolicFrontiers.filter((row)=>row.status==='BLOCKED_BY_DOWNSTREAM_CUSTOM_EQUIVALENCE');
const exactSymbolicStandardTerminalPopulation=symbolicStandard.reduce((sum,row)=>sum+BigInt(row.exact_compatible_subset_count),0n);
const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,
  proof_status:'CANDIDATE_PROOF_NOT_GOVERNING',
  shard_index:SHARD_INDEX,shard_total:SHARD_TOTAL,
  base_window_count:assigned.length,
  total_visited_state_count:totalVisited,
  explicit_terminal_frontier_count:explicitTerminalFrontiers,
  custom_pending_frontier_count:customPendingFrontiers,
  pruned_transition_count:prunedTransitions,
  oversized_frontier_count:symbolicFrontiers.length+unsupportedFrontiers.length,
  symbolic_frontier_count:symbolicFrontiers.length,
  symbolic_standard_terminal_frontier_count:symbolicStandard.length,
  symbolic_custom_downstream_frontier_count:symbolicCustom.length,
  unsupported_symbolic_frontier_count:unsupportedFrontiers.length,
  exact_symbolic_standard_terminal_population:exactSymbolicStandardTerminalPopulation.toString(),
  windows,symbolic_frontiers:symbolicFrontiers,unsupported_frontiers:unsupportedFrontiers,
  gate_status:{
    exhaustive_state_graph_gate:'BLOCKED_PENDING_GOVERNANCE_ADOPTION',
    qa_population_gate:'BLOCKED_PENDING_GOVERNANCE_ADOPTION',
    full_browser_qa_gate:'NOT_STARTED',
    app_integration_ready:false,release_input_gate:'BLOCKED',
  },
  note:'Discovery candidate only. Ordinary scalar/small-MULTI_ENUM paths are explicitly traversed. Oversized TW option frontiers are never power-set expanded; every singleton and unordered pair is resolved and compatible subsets are counted exactly under the separately-proven TW single-trigger-deny model. A frontier with unresolved CUSTOM dimensions is intentionally stopped and marked BLOCKED_BY_DOWNSTREAM_CUSTOM_EQUIVALENCE rather than assumed terminal.',
};
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(`SYMBOLIC_FRONTIER_DISCOVERY_STATUS=${report.proof_status}`);
console.log(`BASE_WINDOW_COUNT=${report.base_window_count}`);
console.log(`OVERSIZED_FRONTIER_COUNT=${report.oversized_frontier_count}`);
console.log(`SYMBOLIC_STANDARD_TERMINAL_FRONTIERS=${report.symbolic_standard_terminal_frontier_count}`);
console.log(`SYMBOLIC_CUSTOM_DOWNSTREAM_FRONTIERS=${report.symbolic_custom_downstream_frontier_count}`);
console.log(`UNSUPPORTED_SYMBOLIC_FRONTIERS=${report.unsupported_symbolic_frontier_count}`);
console.log(`EXACT_SYMBOLIC_STANDARD_TERMINAL_POPULATION=${report.exact_symbolic_standard_terminal_population}`);
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
