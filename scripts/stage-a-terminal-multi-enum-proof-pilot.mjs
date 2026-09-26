import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';

const OUT=process.env.STAGE_A_TERMINAL_MULTI_OUT??'artifacts/stage-a-terminal-multi-enum-proof-pilot';
const HEAD_SHA=process.env.HEAD_SHA??null;
const TARGET=process.env.STAGE_A_TARGET_WINDOW??'';
const MAX_STATES=Number(process.env.STAGE_A_MAX_MEMO_STATES_PER_WINDOW??12000);
const MAX_CALLS=Number(process.env.STAGE_A_MAX_RESOLVER_CALLS_PER_WINDOW??100000);
const MAX_EXPLICIT_NONTERMINAL_MULTI=Number(process.env.STAGE_A_MAX_EXPLICIT_MULTI_ENUM_VALUES??12);
const MAX_BFS_SUBSETS=Number(process.env.STAGE_A_MAX_TERMINAL_BFS_SUBSETS??4096);

const PRODUCTS=[
  {id:'SER-LIX-EW',manufacturer:'LIXIL',series:'EW',contract:'EW_CANONICAL_V1'},
  {id:'SER-LIXIL-TW',manufacturer:'LIXIL',series:'TW',contract:'TW_CANONICAL_V2'},
];
const TECHNICAL=new Set(['construction','legacyConstruction','legacyConfiguration','internal_construction','color_relation_id']);
const CONTINUOUS=new Set(['custom_width','custom_w','order_width','custom_height','custom_h','order_height']);
const present=(v)=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0);
const enabled=(f)=>(f?.values??[]).filter((c)=>c.disabled!==true);
const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object'?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])));
const stableJson=(v)=>JSON.stringify(stable(v));
const jsonStringify=(v)=>JSON.stringify(v,(_key,value)=>typeof value==='bigint'?value.toString():value,2);
const hash=(v)=>createHash('sha256').update(typeof v==='string'?v:stableJson(v)).digest('hex');
const normalizeMulti=(values)=>[...new Map(values.map((v)=>[String(v),v])).values()].sort((a,b)=>String(a).localeCompare(String(b)));
const invalid=(r)=>['INVALID','BLOCKED','BLOCK'].includes(String(r.validation?.status??r.status??''));
const visibleKeys=(r)=>new Set((r.fields??[]).map((f)=>f.key));
const userFields=(r)=>(r.fields??[]).filter((f)=>!TECHNICAL.has(f.key)&&!CONTINUOUS.has(f.key)&&enabled(f).length>0&&!f.readOnly);
const nextField=(r,done)=>userFields(r).find((f)=>f.key!=='window_type'&&!done.has(f.key))??null;
const childDone=(done,key,r)=>{const vis=visibleKeys(r);return new Set([...done,key].filter((k)=>vis.has(k)));};
const customPending=(r)=>{const w=(r.fields??[]).find((f)=>['custom_width','custom_w','order_width'].includes(f.key))?.key;const h=(r.fields??[]).find((f)=>['custom_height','custom_h','order_height'].includes(f.key))?.key;return Boolean(w&&h&&(!present(r.selection?.[w])||!present(r.selection?.[h])));};
const fieldSig=(f)=>f?{visibility:'SHOW',key:f.key,dataType:f.dataType,required:Boolean(f.required),readOnly:Boolean(f.readOnly),selectionMode:f.selectionMode??null,values:enabled(f).map((c)=>c.value)}:{visibility:'HIDDEN'};
const scalarBranches=(f)=>{const rows=enabled(f).map((c)=>({kind:'VALUE',value:c.value}));if(!f.required)rows.unshift({kind:'UNSET'});return rows;};
function* explicitMultiBranches(f){const vals=enabled(f).map((c)=>c.value);for(let mask=0;mask<2**vals.length;mask++){const subset=[];for(let i=0;i<vals.length;i++)if(mask&(1<<i))subset.push(vals[i]);if(subset.length===0){if(!f.required)yield{kind:'UNSET'};continue;}yield{kind:'VALUE',value:normalizeMulti(subset)};}}
const apply=(sel,f,b)=>{const next={...(sel??{})};if(b.kind==='UNSET')delete next[f.key];else next[f.key]=f.dataType==='MULTI_ENUM'?normalizeMulti(b.value):b.value;return next;};
const survives=(r,f,b)=>{if(b.kind==='UNSET')return !present(r.selection?.[f.key]);const actual=r.selection?.[f.key];return Array.isArray(b.value)?Array.isArray(actual)&&stableJson(actual.map(String).sort())===stableJson(b.value.map(String).sort()):String(actual)===String(b.value);};

const EW={
  window_spec:['window_type'],variant:['window_type','window_spec'],handing:['window_type','window_spec'],size_mode:['window_type','window_spec'],size:['window_type','window_spec','size_mode'],
  exterior_color:['window_type','window_spec','variant'],interior_color:['window_type','window_spec','variant','exterior_color'],
  screen_presence:['window_type'],screen_form:['window_type','screen_presence'],screen_net:['window_type','screen_presence','screen_form'],screen_midrail:['window_type','screen_presence','screen_form'],
  glass_base:['window_type','window_spec','size_mode','size','variant'],glass_detail:['glass_base'],glass_function:['glass_base'],glass_spacer:['glass_base','glass_detail'],glass_air_layer:['glass_base','glass_detail','glass_spacer'],
  option:['window_type','window_spec'],
};
const TW={
  shutter_type:['window_type','size'],grille_type:['window_type','size'],operation_type:['window_type','size'],door_grille_type:['window_type','size'],handing:['window_type','panel_count'],operator_position:['window_type','panel_count'],
  size_mode:['window_type'],panel_count:['window_type'],size:['window_type','panel_count','size_mode'],exterior_color:['size'],interior_color:['size','exterior_color'],
  screen_presence:['window_type','size','exterior_color','interior_color'],screen_type:['window_type','screen_presence'],screen_midrail:['window_type','size','screen_presence'],screen_net:['window_type','screen_presence'],
  glass_base:['window_type','size'],glass_type:['glass_base'],glass_detail:['glass_base','glass_type'],glass_function:['glass_base','glass_type'],glass_spacer:['glass_base','glass_type','glass_detail'],glass_air_layer:['glass_base','glass_type','glass_detail','glass_spacer'],
  option:['window_type','size','panel_count','glass_base','shutter_type','operation_type'],
};
const freezeMap=(obj)=>new Map(Object.entries(obj).map(([k,v])=>[k,[...v].sort()]));
const CONTRACTS={EW_CANONICAL_V1:freezeMap(EW),TW_CANONICAL_V2:freezeMap(TW)};
function ancestors(map,key,cache=new Map(),stack=new Set()){if(cache.has(key))return cache.get(key);if(stack.has(key))return new Set();stack.add(key);const out=new Set();for(const p of map.get(key)??[]){out.add(p);for(const a of ancestors(map,p,cache,stack))out.add(a);}stack.delete(key);cache.set(key,out);return out;}
function futureSignature(result,done,depMap){const keys=new Set([...depMap.keys(),...userFields(result).map((f)=>f.key)]);const byKey=new Map((result.fields??[]).map((f)=>[f.key,f]));const rows=[];for(const key of [...keys].filter((k)=>k!=='window_type'&&!TECHNICAL.has(k)&&!CONTINUOUS.has(k)&&!done.has(k)).sort())rows.push([key,fieldSig(byKey.get(key)??null)]);return{rows,validation:result.validation?.status??result.status??null,dimension:result.dimensionResult?.status??result.dimension_result?.status??null};}
function memoKey(result,done,depMap){const future=[...depMap.keys()].filter((k)=>k!=='window_type'&&!TECHNICAL.has(k)&&!CONTINUOUS.has(k)&&!done.has(k));const cache=new Map(),live=new Set();for(const key of future){live.add(key);for(const a of ancestors(depMap,key,cache))live.add(a);}const liveSelection={};for(const key of [...live].sort())if(Object.prototype.hasOwnProperty.call(result.selection??{},key))liveSelection[key]=result.selection[key];return hash({done:[...done].sort(),liveSelection,observable:futureSignature(result,done,depMap)});}
function terminalContextKey(product,result,field,depMap){const deps=[...ancestors(depMap,field.key)].sort();const context={};for(const key of deps)if(Object.prototype.hasOwnProperty.call(result.selection??{},key))context[key]=result.selection[key];return hash({product:product.id,field:field.key,context,signature:fieldSig(field)});}
function bitCount(mask){let count=0;for(let value=mask;value;value>>=1n)count+=Number(value&1n);return count;}
function connectedComponents(adjacency){const seen=new Set(),components=[];for(const vertex of adjacency.keys()){if(seen.has(vertex))continue;const stack=[vertex],component=[];seen.add(vertex);while(stack.length){const current=stack.pop();component.push(current);for(const next of adjacency.get(current)??[]){if(seen.has(next))continue;seen.add(next);stack.push(next);}}components.push(component);}return components;}
function independentSetCount(component,adjacency){const index=new Map(component.map((v,i)=>[v,i]));const neighbors=component.map((v)=>{let mask=0n;for(const n of adjacency.get(v)??[]){const i=index.get(n);if(i!==undefined)mask|=1n<<BigInt(i);}return mask;});const memo=new Map();const solve=(mask)=>{if(mask===0n)return 1n;const key=mask.toString();if(memo.has(key))return memo.get(key);let edge=false;for(let i=0;i<component.length;i++){const bit=1n<<BigInt(i);if((mask&bit)&&(neighbors[i]&mask)){edge=true;break;}}if(!edge){const r=1n<<BigInt(bitCount(mask));memo.set(key,r);return r;}let chosen=-1,best=-1;for(let i=0;i<component.length;i++){const bit=1n<<BigInt(i);if(!(mask&bit))continue;const degree=bitCount(neighbors[i]&mask);if(degree>best){best=degree;chosen=i;}}const bit=1n<<BigInt(chosen),without=mask&~bit;const r=solve(without)+solve(without&~neighbors[chosen]);memo.set(key,r);return r;};return solve((1n<<BigInt(component.length))-1n);}
const exactIndependentSetCount=(adj)=>connectedComponents(adj).reduce((p,c)=>p*independentSetCount(c,adj),1n);

let resolverCalls=0;
const terminalProofCache=new Map();
let terminalCacheHits=0,terminalCacheMisses=0,terminalTransitionChecks=0;
let twShapeAudit=null;
async function auditTwPairwiseShape(){
  if(twShapeAudit)return twShapeAudit;
  const runtime=await loadRegisteredRuntime('LIXIL','TW');
  const rows=runtime?.master?.sourceRows?.optionDependencies??[];
  const supportedConditions=new Set(['窓種適用','建て方/区分','障子枚数','実寸W(mm)','ガラス大分類','電動仕様','選択状態']);
  const effective=rows.filter((row)=>{
    if(row?.active===false)return false;
    if(String(row['アクション']??'')!=='選択不可')return false;
    const condition=String(row['条件項目']??'');
    return !condition||supportedConditions.has(condition);
  });
  const unsupported=[];
  for(const row of effective){
    const trigger=row['トリガーoption_id'];
    if(Array.isArray(trigger)||(trigger&&typeof trigger==='object'))unsupported.push({reason:'NON_SCALAR_TRIGGER'});
  }
  twShapeAudit={row_count:rows.length,effective_row_count:effective.length,ignored_row_count:rows.length-effective.length,unsupported_count:unsupported.length,unsupported,digest:hash(effective)};
  return twShapeAudit;
}
async function resolve(product,selection){if(resolverCalls>=MAX_CALLS)throw Object.assign(new Error('resolver call limit'),{code:'RESOLVER_CALL_LIMIT'});resolverCalls++;return resolveRuntimeAppProduct(product.id,selection);}
async function exactTerminalBfs(product,result,field,contextKey){const bySubset=new Map();const queue=[];const canonical=(r)=>normalizeMulti(Array.isArray(r.selection?.[field.key])?r.selection[field.key]:[]).map(String);const put=(r)=>{const subset=canonical(r);const key=stableJson(subset);if(bySubset.has(key))return;bySubset.set(key,r);queue.push(key);};put(result);while(queue.length){if(bySubset.size>MAX_BFS_SUBSETS)throw Object.assign(new Error('terminal bfs subset limit'),{code:'TERMINAL_BFS_SUBSET_LIMIT'});const key=queue.shift(),state=bySubset.get(key),subset=canonical(state);const currentField=(state.fields??[]).find((f)=>f.key===field.key);if(!currentField)throw Object.assign(new Error('terminal multi field hidden during BFS'),{code:'TERMINAL_MULTI_FIELD_HIDDEN'});const allowed=enabled(currentField).map((c)=>String(c.value));const desired=[];for(const c of allowed)if(!subset.includes(c))desired.push(normalizeMulti([...subset,c]));for(const c of subset)desired.push(normalizeMulti(subset.filter((x)=>x!==c)));for(const nextSubset of desired){const nextSel={...(state.selection??{})};if(nextSubset.length)nextSel[field.key]=nextSubset;else delete nextSel[field.key];const child=await resolve(product,nextSel);terminalTransitionChecks++;if(invalid(child))continue;put(child);}}
return{count:BigInt(bySubset.size),proof_type:'EXACT_UI_REACHABLE_SUBSET_BFS',context_key:contextKey,reachable_subset_count:bySubset.size};}
async function exactTerminalTw(product,result,field,contextKey){const audit=await auditTwPairwiseShape();if(audit.unsupported_count)throw Object.assign(new Error('TW option rules are not pairwise-safe'),{code:'TW_HIGHER_ORDER_OPTION_RULE',audit});const candidates=enabled(field).map((c)=>String(c.value));const adjacency=new Map(candidates.map((v)=>[v,new Set()]));let singletons=0,pairs=0;for(let i=0;i<candidates.length;i++){const a=candidates[i];const one=await resolve(product,{...(result.selection??{}),[field.key]:[a]});terminalTransitionChecks++;const selectedOne=new Set((Array.isArray(one.selection?.[field.key])?one.selection[field.key]:[]).map(String));if(!selectedOne.has(a))throw Object.assign(new Error(`TW singleton rejected ${a}`),{code:'TW_SINGLETON_REJECTED'});singletons++;for(let j=i+1;j<candidates.length;j++){const b=candidates[j];const two=await resolve(product,{...(result.selection??{}),[field.key]:[a,b]});terminalTransitionChecks++;const selected=new Set((Array.isArray(two.selection?.[field.key])?two.selection[field.key]:[]).map(String));if(!(selected.has(a)&&selected.has(b))){adjacency.get(a).add(b);adjacency.get(b).add(a);}pairs++;}}
let count=exactIndependentSetCount(adjacency);if(field.required)count-=1n;const edges=[];for(const [a,ns] of adjacency)for(const b of ns)if(a<b)edges.push([a,b]);return{count,proof_type:'PAIRWISE_RULE_SHAPE_AUDIT_PLUS_EXACT_INDEPENDENT_SET',context_key:contextKey,candidate_count:candidates.length,singleton_checks:singletons,pair_checks:pairs,conflict_edge_count:edges.length,conflict_digest:hash(edges.sort()),shape_audit:audit};}
async function exactTerminalMulti(product,result,field,depMap){const key=terminalContextKey(product,result,field,depMap);if(terminalProofCache.has(key)){terminalCacheHits++;return terminalProofCache.get(key);}terminalCacheMisses++;const proof=product.series==='TW'?await exactTerminalTw(product,result,field,key):await exactTerminalBfs(product,result,field,key);terminalProofCache.set(key,proof);return proof;}

async function inventory(){for(const product of PRODUCTS){const root=await resolveRuntimeAppProduct(product.id,{});const wf=(root.fields??[]).find((f)=>f.key==='window_type');assert.ok(wf);if(enabled(wf).some((c)=>String(c.value)===TARGET))return product;}throw new Error(`target not found ${TARGET}`);}

await mkdir(OUT,{recursive:true});
const product=await inventory();
const depMap=CONTRACTS[product.contract];
let states=0,hits=0,maxDepth=0,blocker=null;
const memo=new Map(),inProgress=new Set();
resolverCalls=1;
const root=await resolveRuntimeAppProduct(product.id,{window_type:TARGET});
async function count(result,done,depth=0){
  if(blocker)return null;maxDepth=Math.max(maxDepth,depth);
  const key=memoKey(result,done,depMap),sig=futureSignature(result,done,depMap),cached=memo.get(key);
  if(cached){if(stableJson(cached.signature)!==stableJson(sig)){blocker={status:'CONTRACT_INCONSISTENT',memo_key:key,previous_signature:cached.signature,current_signature:sig};return null;}hits++;return cached.counts;}
  if(inProgress.has(key)){blocker={status:'MEMO_CYCLE_DETECTED',memo_key:key};return null;}
  if(states>=MAX_STATES){blocker={status:'MEMO_STATE_LIMIT_REACHED',states,calls:resolverCalls,next_field:nextField(result,done)?.key??null};return null;}
  inProgress.add(key);states++;
  const field=nextField(result,done);
  if(!field){const counts={terminal:1n,custom:customPending(result)?1n:0n};memo.set(key,{counts,signature:sig});inProgress.delete(key);return counts;}
  const remaining=userFields(result).filter((f)=>f.key!=='window_type'&&!done.has(f.key));
  if(field.dataType==='MULTI_ENUM'&&remaining.length===1){try{const proof=await exactTerminalMulti(product,result,field,depMap);const counts={terminal:proof.count,custom:customPending(result)?proof.count:0n};memo.set(key,{counts,signature:sig,terminal_multi_proof:proof});inProgress.delete(key);return counts;}catch(error){blocker={status:error.code??'TERMINAL_MULTI_PROOF_FAILED',field:field.key,message:error.message,states,calls:resolverCalls};inProgress.delete(key);return null;}}
  if(field.dataType==='MULTI_ENUM'&&enabled(field).length>MAX_EXPLICIT_NONTERMINAL_MULTI){blocker={status:'NONTERMINAL_MULTI_REQUIRES_SYMBOLIC_PROOF',field:field.key,candidate_count:enabled(field).length,states,calls:resolverCalls};inProgress.delete(key);return null;}
  const branches=field.dataType==='MULTI_ENUM'?[...explicitMultiBranches(field)]:scalarBranches(field);
  let terminal=0n,custom=0n;
  for(const b of branches){let child;try{child=await resolve(product,apply(result.selection,field,b));}catch(error){blocker={status:error.code??'RESOLVER_FAILED',field:field.key,states,calls:resolverCalls};inProgress.delete(key);return null;}if(!survives(child,field,b)||invalid(child))continue;const cc=await count(child,childDone(done,field.key,child),depth+1);if(!cc){inProgress.delete(key);return null;}terminal+=cc.terminal;custom+=cc.custom;}
  const counts={terminal,custom};memo.set(key,{counts,signature:sig});inProgress.delete(key);return counts;
}
const counts=await count(root,new Set(['window_type']));
const proofs=[...memo.values()].map((v)=>v.terminal_multi_proof).filter(Boolean);
const report={exact_head_sha:HEAD_SHA,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,pilot_only:true,manufacturer:product.manufacturer,series:product.series,product_id:product.id,window_type:TARGET,status:blocker?'BLOCKED':'COUNTED_CANDIDATE',exact_discrete_terminal_context_count:counts?.terminal?.toString()??null,custom_pending_context_count:counts?.custom?.toString()??null,memo_state_count:states,memo_hit_count:hits,resolver_call_count:resolverCalls,max_depth:maxDepth,terminal_multi_proof_context_count:terminalProofCache.size,terminal_multi_cache_hits:terminalCacheHits,terminal_multi_cache_misses:terminalCacheMisses,terminal_transition_checks:terminalTransitionChecks,terminal_multi_proofs:proofs,blocker,gate_status:{qa_population_gate:'BLOCKED_PILOT_ONLY',custom_size_coverage_gate:'BLOCKED_CONTINUOUS_PARTITION_NOT_PROVEN',app_integration_ready:false,release_input_gate:'BLOCKED'},note:'Pilot only. Terminal MULTI_ENUM is counted exactly: EW by UI-reachable subset graph closure; TW by source-shape-audited pairwise conflict graph and exact independent-set counting. Empty optional selection is included. No Product Master mutation.'};
await writeFile(`${OUT}/report.json`,`${jsonStringify(report)}\n`,'utf8');
console.log(`TERMINAL_MULTI_PILOT_STATUS=${report.status}`);console.log(`SERIES=${report.series}`);console.log(`WINDOW=${report.window_type}`);console.log(`EXACT_DISCRETE_TERMINAL_CONTEXT_COUNT=${report.exact_discrete_terminal_context_count??'BLOCKED'}`);console.log(`CUSTOM_PENDING_CONTEXT_COUNT=${report.custom_pending_context_count??'BLOCKED'}`);console.log(`MEMO_STATE_COUNT=${states}`);console.log(`MEMO_HIT_COUNT=${hits}`);console.log(`RESOLVER_CALL_COUNT=${resolverCalls}`);console.log(`TERMINAL_MULTI_PROOF_CONTEXT_COUNT=${terminalProofCache.size}`);console.log(`TERMINAL_MULTI_CACHE_HITS=${terminalCacheHits}`);console.log(`TERMINAL_TRANSITION_CHECKS=${terminalTransitionChecks}`);console.log(`BLOCKER=${blocker?JSON.stringify(blocker):'NONE'}`);console.log('APP_INTEGRATION_READY=false');console.log('RELEASE_INPUT_GATE=BLOCKED');
