import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const OUT=process.env.STAGE_A_CONTRACT_V2_OUT??'artifacts/stage-a-resolver-derived-contract-v2-pilot';
const HEAD_SHA=process.env.HEAD_SHA??null;
const MAX_STATES=Number(process.env.STAGE_A_MAX_MEMO_STATES_PER_WINDOW??12000);
const MAX_CALLS=Number(process.env.STAGE_A_MAX_RESOLVER_CALLS_PER_WINDOW??80000);
const MAX_MULTI=Number(process.env.STAGE_A_MAX_EXPLICIT_MULTI_ENUM_VALUES??18);
const TARGETS=String(process.env.STAGE_A_TARGET_WINDOWS??'').split(',').map((v)=>v.trim()).filter(Boolean);

const PRODUCTS=[
  {id:'SER-LIX-SAMOS2H',manufacturer:'LIXIL',series:'サーモスⅡ-H',contract:'PRODUCT_MODULE'},
  {id:'SER-LIX-SAMOSL',manufacturer:'LIXIL',series:'サーモスL',contract:'PRODUCT_MODULE'},
  {id:'SER-LIX-EW',manufacturer:'LIXIL',series:'EW',contract:'EW_CANONICAL_V1'},
  {id:'SER-LIXIL-TW',manufacturer:'LIXIL',series:'TW',contract:'TW_CANONICAL_V2'},
  {id:'SER-YKK-APW430',manufacturer:'YKK AP',series:'APW430',contract:'APW430_V1'},
  {id:'SER-YKK-APW431',manufacturer:'YKK AP',series:'APW431',contract:'APW431_V1'},
];

const TECHNICAL=new Set(['construction','legacyConstruction','legacyConfiguration','internal_construction','color_relation_id']);
const CONTINUOUS=new Set(['custom_width','custom_w','order_width','custom_height','custom_h','order_height']);
const present=(v)=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0);
const enabled=(f)=>(f?.values??[]).filter((c)=>c.disabled!==true);
const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object'?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])));
const stableJson=(v)=>JSON.stringify(stable(v));
const hash=(v)=>createHash('sha256').update(typeof v==='string'?v:stableJson(v)).digest('hex');
const normalizeMulti=(values)=>[...new Map(values.map((v)=>[String(v),v])).values()].sort((a,b)=>String(a).localeCompare(String(b)));
const invalid=(r)=>['INVALID','BLOCKED','BLOCK'].includes(String(r.validation?.status??r.status??''));
const visibleKeys=(r)=>new Set((r.fields??[]).map((f)=>f.key));
const userFields=(r)=>(r.fields??[]).filter((f)=>!TECHNICAL.has(f.key)&&!CONTINUOUS.has(f.key)&&enabled(f).length>0&&!f.readOnly);
const nextField=(r,done)=>userFields(r).find((f)=>f.key!=='window_type'&&!done.has(f.key))??null;
const childDone=(done,key,r)=>{const vis=visibleKeys(r);return new Set([...done,key].filter((k)=>vis.has(k)));};
const customPending=(r)=>{
  const w=(r.fields??[]).find((f)=>['custom_width','custom_w','order_width'].includes(f.key))?.key;
  const h=(r.fields??[]).find((f)=>['custom_height','custom_h','order_height'].includes(f.key))?.key;
  return Boolean(w&&h&&(!present(r.selection?.[w])||!present(r.selection?.[h])));
};
const fieldSig=(f)=>f?{visibility:'SHOW',key:f.key,dataType:f.dataType,required:Boolean(f.required),readOnly:Boolean(f.readOnly),selectionMode:f.selectionMode??null,values:enabled(f).map((c)=>c.value)}:{visibility:'HIDDEN'};
const scalarBranches=(f)=>{const rows=enabled(f).map((c)=>({kind:'VALUE',value:c.value}));if(!f.required)rows.unshift({kind:'UNSET'});return rows;};
function* multiBranches(f){const vals=enabled(f).map((c)=>c.value);for(let mask=0;mask<2**vals.length;mask++){const subset=[];for(let i=0;i<vals.length;i++)if(mask&(1<<i))subset.push(vals[i]);if(f.required&&subset.length===0)continue;yield{kind:'VALUE',value:normalizeMulti(subset)};}}
const apply=(sel,f,b)=>{const next={...(sel??{})};if(b.kind==='UNSET')delete next[f.key];else next[f.key]=f.dataType==='MULTI_ENUM'?normalizeMulti(b.value):b.value;return next;};
const survives=(r,f,b)=>{if(b.kind==='UNSET')return !present(r.selection?.[f.key]);const actual=r.selection?.[f.key];return Array.isArray(b.value)?Array.isArray(actual)&&stableJson(actual.map(String).sort())===stableJson(b.value.map(String).sort()):String(actual)===String(b.value);};

function addDep(map,target,...deps){
  if(!target||TECHNICAL.has(target)||CONTINUOUS.has(target))return;
  const set=map.get(target)??new Set();
  for(const dep of deps.flat()){
    if(!dep||dep===target||CONTINUOUS.has(dep))continue;
    if(TECHNICAL.has(dep)){
      if(dep==='color_relation_id'){set.add('window_type');set.add('exterior_color');set.add('interior_color');}
      else {set.add('size');set.add('size_mode');}
      continue;
    }
    set.add(dep);
  }
  map.set(target,set);
}
const freezeMap=(map)=>new Map([...map.entries()].map(([k,v])=>[k,[...v].sort()]));
const selectorKeys=(selector)=>!selector||typeof selector!=='object'||Array.isArray(selector)?[]:Object.keys(selector).filter((k)=>!k.startsWith('$'));

const APW430={
  window_spec:['window_type'],
  window_configuration:['window_type','window_spec'],
  handing:['window_type','window_spec','window_configuration'],
  size_mode:['window_type'],
  panel_count:['window_type','window_spec','window_configuration','handing'],
  size:['window_type','window_spec','window_configuration','handing','panel_count','size_mode'],
  exterior_color:['window_type'],
  interior_color:['window_type','exterior_color'],
  screen_presence:['window_type','size'],
  screen_form:['window_type','size','screen_presence'],
  screen_net:['window_type','screen_presence','screen_form'],
  glass_base:['window_type','size','size_mode'],
  glass_function:['glass_base'],
  glass_type:['glass_base'],
  option:['window_type','exterior_color','interior_color'],
};

const APW431={
  region_standard:['window_type'],
  panel_count:['window_type','region_standard'],
  window_configuration:['window_type','region_standard','panel_count'],
  shutter_type:['window_type','region_standard','panel_count','window_configuration'],
  size_mode:['window_type','region_standard','panel_count','window_configuration'],
  size:['window_type','region_standard','panel_count','window_configuration','shutter_type','size_mode'],
  exterior_color:['window_type'],
  interior_color:['window_type','exterior_color'],
  screen_presence:['window_type'],
  screen_form:['window_type','screen_presence'],
  screen_midrail:['window_type','screen_presence','screen_form'],
  screen_net:['window_type','screen_presence','screen_form'],
  glass_base:['window_type'],
  option:['window_type'],
};

const EW={
  window_spec:['window_type'],
  variant:['window_type','window_spec'],
  handing:['window_type','window_spec'],
  size_mode:['window_type','window_spec'],
  size:['window_type','window_spec','size_mode'],
  exterior_color:['window_type','window_spec','variant'],
  interior_color:['window_type','window_spec','variant','exterior_color'],
  screen_presence:['window_type'],
  screen_form:['window_type','screen_presence'],
  screen_net:['window_type','screen_presence','screen_form'],
  screen_midrail:['window_type','screen_presence','screen_form'],
  glass_base:['window_type','window_spec','size_mode','size','variant'],
  glass_detail:['glass_base'],
  glass_function:['glass_base'],
  glass_spacer:['glass_base','glass_detail'],
  glass_air_layer:['glass_base','glass_detail','glass_spacer'],
  option:['window_type','window_spec'],
};

const TW={
  shutter_type:['window_type','size'],
  grille_type:['window_type','size'],
  operation_type:['window_type','size'],
  door_grille_type:['window_type','size'],
  handing:['window_type','panel_count'],
  operator_position:['window_type','panel_count'],
  size_mode:['window_type'],
  panel_count:['window_type'],
  size:['window_type','panel_count','size_mode'],
  exterior_color:['size'],
  interior_color:['size','exterior_color'],
  screen_presence:['window_type','size','exterior_color','interior_color'],
  screen_type:['window_type','screen_presence'],
  screen_midrail:['window_type','size','screen_presence'],
  screen_net:['window_type','screen_presence'],
  glass_base:['window_type','size'],
  glass_type:['glass_base'],
  glass_detail:['glass_base','glass_type'],
  glass_function:['glass_base','glass_type'],
  glass_spacer:['glass_base','glass_type','glass_detail'],
  glass_air_layer:['glass_base','glass_type','glass_detail','glass_spacer'],
  option:['window_type','size','panel_count','glass_base','shutter_type','operation_type'],
};

const contractCache=new Map();
async function productModuleContract(product){
  const entry=getRuntimeMasterEntry(product.manufacturer,product.series);
  assert.ok(entry,`${product.id}: registry entry missing`);
  const pkg=await loadFormalProductRuntimePackage(entry);
  const preferred=entry.productModuleRole&&pkg.documents?.[entry.productModuleRole];
  const doc=preferred??Object.values(pkg.documents??{}).find((value)=>value?.product_module);
  const module=doc?.product_module;
  assert.ok(module,`${product.id}: product_module missing`);
  const map=new Map();
  for(const def of module.specificationDefinitions??[])addDep(map,def.key,...selectorKeys(def.selector));
  for(const row of module.allowedValues??[])addDep(map,row.specificationKey,...selectorKeys(row.selector));
  for(const row of module.requiredFieldRules??[])addDep(map,row.specificationKey,...selectorKeys(row.selector));
  for(const dep of module.dependencies??[])addDep(map,dep.effect?.key??dep.targetField,...selectorKeys(dep.when));
  return freezeMap(map);
}
async function contractFor(product){
  if(contractCache.has(product.id))return contractCache.get(product.id);
  let result;
  if(product.contract==='PRODUCT_MODULE')result=await productModuleContract(product);
  else if(product.contract==='APW430_V1')result=freezeMap(new Map(Object.entries(APW430).map(([k,v])=>[k,new Set(v)])));
  else if(product.contract==='APW431_V1')result=freezeMap(new Map(Object.entries(APW431).map(([k,v])=>[k,new Set(v)])));
  else if(product.contract==='EW_CANONICAL_V1')result=freezeMap(new Map(Object.entries(EW).map(([k,v])=>[k,new Set(v)])));
  else if(product.contract==='TW_CANONICAL_V2')result=freezeMap(new Map(Object.entries(TW).map(([k,v])=>[k,new Set(v)])));
  else throw new Error(`unknown contract ${product.contract}`);
  contractCache.set(product.id,result);return result;
}
function ancestors(map,key,cache=new Map(),stack=new Set()){
  if(cache.has(key))return cache.get(key);
  if(stack.has(key))return new Set();
  stack.add(key);const out=new Set();
  for(const p of map.get(key)??[]){out.add(p);for(const a of ancestors(map,p,cache,stack))out.add(a);}
  stack.delete(key);cache.set(key,out);return out;
}
function futureSignature(result,done,depMap){
  const keys=new Set([...depMap.keys(),...userFields(result).map((f)=>f.key)]);
  const byKey=new Map((result.fields??[]).map((f)=>[f.key,f]));
  const rows=[];
  for(const key of [...keys].filter((k)=>k!=='window_type'&&!TECHNICAL.has(k)&&!CONTINUOUS.has(k)&&!done.has(k)).sort()){
    rows.push([key,fieldSig(byKey.get(key)??null)]);
  }
  return {rows,validation:result.validation?.status??result.status??null,dimension:result.dimensionResult?.status??result.dimension_result?.status??null};
}
function memoKey(result,done,depMap){
  const future=[...depMap.keys()].filter((k)=>k!=='window_type'&&!TECHNICAL.has(k)&&!CONTINUOUS.has(k)&&!done.has(k));
  const cache=new Map(),live=new Set();
  for(const key of future){live.add(key);for(const a of ancestors(depMap,key,cache))live.add(a);}
  const liveSelection={};
  for(const key of [...live].sort())if(Object.prototype.hasOwnProperty.call(result.selection??{},key))liveSelection[key]=result.selection[key];
  return hash({done:[...done].sort(),liveSelection,observable:futureSignature(result,done,depMap)});
}

async function inventory(){
  const rows=[];
  for(const p of PRODUCTS){
    const root=await resolveRuntimeAppProduct(p.id,{});
    const wf=(root.fields??[]).find((f)=>f.key==='window_type');
    assert.ok(wf,`${p.id}: window_type missing`);
    for(const c of enabled(wf)){
      const windowType=String(c.value);
      if(!TARGETS.length||TARGETS.includes(windowType))rows.push({...p,windowType});
    }
  }
  if(TARGETS.length)assert.equal(rows.length,TARGETS.length,`target windows resolved ${rows.length}/${TARGETS.length}`);
  return rows;
}

await mkdir(OUT,{recursive:true});
const windows=[];
for(const row of await inventory()){
  const depMap=await contractFor(row);
  let calls=1,states=0,hits=0,maxDepth=0,blocker=null;
  const memo=new Map(),inProgress=new Set();
  const root=await resolveRuntimeAppProduct(row.id,{window_type:row.windowType});
  async function count(result,done,depth=0){
    if(blocker)return null;
    maxDepth=Math.max(maxDepth,depth);
    const key=memoKey(result,done,depMap);
    const sig=futureSignature(result,done,depMap);
    const cached=memo.get(key);
    if(cached){
      if(stableJson(cached.signature)!==stableJson(sig)){
        blocker={status:'RESOLVER_DERIVED_CONTRACT_INCONSISTENT',memo_key:key,previous_selection:cached.selection,current_selection:stable(result.selection??{}),previous_signature:cached.signature,current_signature:sig};
        return null;
      }
      hits++;return cached.counts;
    }
    if(inProgress.has(key)){blocker={status:'MEMO_CYCLE_DETECTED',memo_key:key};return null;}
    if(states>=MAX_STATES){blocker={status:'MEMO_STATE_LIMIT_REACHED',states,calls,next_field:nextField(result,done)?.key??null};return null;}
    inProgress.add(key);states++;
    const f=nextField(result,done);
    if(!f){
      const counts={terminal:1n,custom:customPending(result)?1n:0n,symbolic:false};
      memo.set(key,{counts,signature:sig,selection:stable(result.selection??{})});inProgress.delete(key);return counts;
    }
    if(f.dataType==='MULTI_ENUM'&&enabled(f).length>MAX_MULTI){
      const counts={terminal:0n,custom:0n,symbolic:true};
      memo.set(key,{counts,signature:sig,selection:stable(result.selection??{}),frontier:{field:f.key,candidate_count:enabled(f).length,field_signature:fieldSig(f),selection:stable(result.selection??{})}});
      inProgress.delete(key);return counts;
    }
    const branches=f.dataType==='MULTI_ENUM'?[...multiBranches(f)]:scalarBranches(f);
    if(calls+branches.length>MAX_CALLS){blocker={status:'RESOLVER_CALL_LIMIT_REACHED',states,calls,next_field:f.key,candidate_count:branches.length};inProgress.delete(key);return null;}
    let terminal=0n,custom=0n,symbolic=false;
    for(const b of branches){
      const child=await resolveRuntimeAppProduct(row.id,apply(result.selection,f,b));calls++;
      if(!survives(child,f,b)||invalid(child))continue;
      const cc=await count(child,childDone(done,f.key,child),depth+1);
      if(!cc){inProgress.delete(key);return null;}
      terminal+=cc.terminal;custom+=cc.custom;symbolic ||= cc.symbolic;
    }
    const counts={terminal,custom,symbolic};
    memo.set(key,{counts,signature:sig,selection:stable(result.selection??{})});inProgress.delete(key);return counts;
  }
  const counts=await count(root,new Set(['window_type']));
  const frontiers=[...memo.values()].filter((v)=>v.frontier).map((v)=>v.frontier);
  const status=blocker?'BLOCKED':frontiers.length?'SYMBOLIC_FRONTIER_REACHED':'COUNTED_CANDIDATE';
  windows.push({manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,status,exact_discrete_terminal_context_count:counts?.terminal?.toString()??null,custom_pending_context_count:counts?.custom?.toString()??null,memo_state_count:states,memo_hit_count:hits,resolver_call_count:calls,max_depth:maxDepth,symbolic_frontiers:frontiers,contract_entries:Object.fromEntries([...depMap.entries()]),blocker});
  console.log(`CONTRACT_V2_WINDOW product=${row.id} window=${row.windowType} status=${status} terminal=${counts?.terminal??'BLOCKED'} custom=${counts?.custom??'BLOCKED'} memo=${states} hits=${hits} calls=${calls} frontiers=${frontiers.length}`);
}
const counted=windows.filter((w)=>w.status==='COUNTED_CANDIDATE'),symbolic=windows.filter((w)=>w.status==='SYMBOLIC_FRONTIER_REACHED'),blocked=windows.filter((w)=>w.status==='BLOCKED');
const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,
  proof_status:blocked.length?'PILOT_BLOCKED':'PILOT_COMPLETE',
  proof_basis:'RESOLVER_SOURCE_DERIVED_FIELD_DEPENDENCY_CONTRACT_V2_PLUS_EXACT_RUNTIME_BRANCH_RESOLUTION',
  pilot_only:true,target_windows:TARGETS,base_window_count:windows.length,
  counted_window_count:counted.length,symbolic_frontier_window_count:symbolic.length,blocked_window_count:blocked.length,
  contract_inconsistency_count:blocked.filter((w)=>w.blocker?.status==='RESOLVER_DERIVED_CONTRACT_INCONSISTENT').length,
  memo_state_count:windows.reduce((n,w)=>n+w.memo_state_count,0),memo_hit_count:windows.reduce((n,w)=>n+w.memo_hit_count,0),resolver_call_count:windows.reduce((n,w)=>n+w.resolver_call_count,0),
  windows,
  gate_status:{exhaustive_state_graph_gate:'BLOCKED_PILOT_ONLY',qa_population_gate:'BLOCKED_PILOT_ONLY',custom_size_coverage_gate:'BLOCKED_CONTINUOUS_PARTITION_NOT_PROVEN',full_browser_qa_gate:'NOT_STARTED',app_integration_ready:false,release_input_gate:'BLOCKED'},
  note:'Pilot only. Contracts are proof-side dependency projections derived from the actual registered resolver implementations; Runtime/Product Master data remain read-only. Oversized MULTI_ENUM is handed off as a symbolic frontier and is not treated as counted here.'
};
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(`CONTRACT_V2_PILOT_STATUS=${report.proof_status}`);
console.log(`COUNTED_WINDOW_COUNT=${report.counted_window_count}`);
console.log(`SYMBOLIC_FRONTIER_WINDOW_COUNT=${report.symbolic_frontier_window_count}`);
console.log(`BLOCKED_WINDOW_COUNT=${report.blocked_window_count}`);
console.log(`CONTRACT_INCONSISTENCY_COUNT=${report.contract_inconsistency_count}`);
console.log(`MEMO_STATE_COUNT=${report.memo_state_count}`);
console.log(`MEMO_HIT_COUNT=${report.memo_hit_count}`);
console.log(`RESOLVER_CALL_COUNT=${report.resolver_call_count}`);
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
