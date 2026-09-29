import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const OUT = process.env.STAGE_A_SAMOS_V4_OUT ?? 'artifacts/stage-a-samos-conflict-graph-v4';
const HEAD_SHA = process.env.HEAD_SHA ?? null;
const TARGETS = String(process.env.STAGE_A_TARGET_WINDOWS ?? '').split(',').map((v) => v.trim()).filter(Boolean);
const MAX_STATES = Number(process.env.STAGE_A_MAX_MEMO_STATES_PER_WINDOW ?? 12000);
const MAX_CALLS = Number(process.env.STAGE_A_MAX_RESOLVER_CALLS_PER_WINDOW ?? 80000);
const MAX_MULTI = Number(process.env.STAGE_A_MAX_EXPLICIT_MULTI_ENUM_VALUES ?? 18);

const PRODUCTS = [
  { id: 'SER-LIX-SAMOS2H', manufacturer: 'LIXIL', series: 'サーモスⅡ-H' },
  { id: 'SER-LIX-SAMOSL', manufacturer: 'LIXIL', series: 'サーモスL' },
];
const TECHNICAL = new Set(['construction','legacyConstruction','legacyConfiguration','internal_construction','color_relation_id']);
const CONTINUOUS = new Set(['custom_width','custom_w','order_width','custom_height','custom_h','order_height']);
const present = (v) => v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0);
const enabled = (f) => (f?.values ?? []).filter((c) => c.disabled !== true);
const stable = (v) => Array.isArray(v) ? v.map(stable) : (!v || typeof v !== 'object' ? v : Object.fromEntries(Object.entries(v).sort(([a],[b]) => a.localeCompare(b)).map(([k,x]) => [k,stable(x)])));
const stableJson = (v) => JSON.stringify(stable(v));
const hash = (v) => createHash('sha256').update(typeof v === 'string' ? v : stableJson(v)).digest('hex');
const normalizeMulti = (values) => [...new Map(values.map((v) => [String(v),v])).values()].sort((a,b) => String(a).localeCompare(String(b)));
const invalid = (r) => ['INVALID','BLOCKED','BLOCK'].includes(String(r.validation?.status ?? r.status ?? ''));
const visibleKeys = (r) => new Set((r.fields ?? []).map((f) => f.key));
const userFields = (r) => (r.fields ?? []).filter((f) => !TECHNICAL.has(f.key) && !CONTINUOUS.has(f.key) && enabled(f).length > 0 && !f.readOnly);
const nextField = (r,done) => userFields(r).find((f) => f.key !== 'window_type' && !done.has(f.key)) ?? null;
const childDone = (done,key,r) => { const vis = visibleKeys(r); return new Set([...done,key].filter((k) => vis.has(k))); };
const customPending = (r) => {
  const w = (r.fields ?? []).find((f) => ['custom_width','custom_w','order_width'].includes(f.key))?.key;
  const h = (r.fields ?? []).find((f) => ['custom_height','custom_h','order_height'].includes(f.key))?.key;
  return Boolean(w && h && (!present(r.selection?.[w]) || !present(r.selection?.[h])));
};
const fieldSig = (f) => f ? { visibility:'SHOW', key:f.key, dataType:f.dataType, required:Boolean(f.required), readOnly:Boolean(f.readOnly), selectionMode:f.selectionMode ?? null, values:enabled(f).map((c) => c.value) } : { visibility:'HIDDEN' };
const scalarBranches = (f) => { const rows = enabled(f).map((c) => ({kind:'VALUE',value:c.value})); if (!f.required) rows.unshift({kind:'UNSET'}); return rows; };
function* multiBranches(f) { const vals = enabled(f).map((c) => c.value); for (let mask=0; mask<2**vals.length; mask++) { const subset=[]; for(let i=0;i<vals.length;i++) if(mask&(1<<i)) subset.push(vals[i]); if(f.required && subset.length===0) continue; yield {kind:'VALUE',value:normalizeMulti(subset)}; } }
const apply = (sel,f,b) => { const next={...(sel ?? {})}; if(b.kind==='UNSET') delete next[f.key]; else next[f.key]=f.dataType==='MULTI_ENUM'?normalizeMulti(b.value):b.value; return next; };
const survives = (r,f,b) => { if(b.kind==='UNSET') return !present(r.selection?.[f.key]); const actual=r.selection?.[f.key]; return Array.isArray(b.value) ? Array.isArray(actual) && stableJson(actual.map(String).sort())===stableJson(b.value.map(String).sort()) : String(actual)===String(b.value); };
const sameStrings = (a,b) => stableJson([...a].map(String).sort()) === stableJson([...b].map(String).sort());
const exactSubset = (r,key,subset) => sameStrings(normalizeMulti(Array.isArray(r.selection?.[key]) ? r.selection[key] : []), subset);

function addDep(map,target,...deps){
  if(!target || TECHNICAL.has(target) || CONTINUOUS.has(target)) return;
  const set = map.get(target) ?? new Set();
  for(const dep of deps.flat()){
    if(!dep || dep===target || CONTINUOUS.has(dep)) continue;
    if(TECHNICAL.has(dep)){
      if(dep==='color_relation_id'){ set.add('window_type'); set.add('exterior_color'); set.add('interior_color'); }
      else { set.add('size'); set.add('size_mode'); }
      continue;
    }
    set.add(dep);
  }
  map.set(target,set);
}
const freezeMap = (map) => new Map([...map.entries()].map(([k,v]) => [k,[...v].sort()]));
const selectorKeys = (selector) => !selector || typeof selector !== 'object' || Array.isArray(selector) ? [] : Object.keys(selector).filter((k) => !k.startsWith('$'));
function ancestors(map,key,cache=new Map(),stack=new Set()){
  if(cache.has(key)) return cache.get(key);
  if(stack.has(key)) return new Set();
  stack.add(key); const out=new Set();
  for(const p of map.get(key) ?? []){ out.add(p); for(const a of ancestors(map,p,cache,stack)) out.add(a); }
  stack.delete(key); cache.set(key,out); return out;
}
function futureSignature(result,done,depMap){
  const keys=new Set([...depMap.keys(),...userFields(result).map((f)=>f.key)]);
  const byKey=new Map((result.fields ?? []).map((f)=>[f.key,f]));
  const rows=[];
  for(const key of [...keys].filter((k)=>k!=='window_type'&&!TECHNICAL.has(k)&&!CONTINUOUS.has(k)&&!done.has(k)).sort()) rows.push([key,fieldSig(byKey.get(key) ?? null)]);
  return { rows, validation:result.validation?.status ?? result.status ?? null, dimension:result.dimensionResult?.status ?? result.dimension_result?.status ?? null };
}
function memoKey(result,done,depMap){
  const future=[...depMap.keys()].filter((k)=>k!=='window_type'&&!TECHNICAL.has(k)&&!CONTINUOUS.has(k)&&!done.has(k));
  const cache=new Map(),live=new Set();
  for(const key of future){ live.add(key); for(const a of ancestors(depMap,key,cache)) live.add(a); }
  const liveSelection={};
  for(const key of [...live].sort()) if(Object.prototype.hasOwnProperty.call(result.selection ?? {},key)) liveSelection[key]=result.selection[key];
  return hash({done:[...done].sort(),liveSelection,observable:futureSignature(result,done,depMap)});
}

function selectorMentions(selector,key){
  if(!selector || typeof selector !== 'object') return false;
  if(Array.isArray(selector)) return selector.some((one)=>selectorMentions(one,key));
  for(const [name,value] of Object.entries(selector)){
    if(name===key) return true;
    if(['any','anyOf','all','allOf','not'].includes(name) && selectorMentions(value,key)) return true;
  }
  return false;
}
function nestedSelectorMention(node,keys){
  if(!node || typeof node !== 'object') return false;
  if(Array.isArray(node)) return node.some((one)=>nestedSelectorMention(one,keys));
  for(const [name,value] of Object.entries(node)){
    if((name==='selector'||name==='when') && [...keys].some((key)=>selectorMentions(value,key))) return true;
    if(nestedSelectorMention(value,keys)) return true;
  }
  return false;
}
function exactPredicate(selector,key,op){
  if(!selector || typeof selector !== 'object' || Array.isArray(selector)) return null;
  const value=selector[key];
  if(!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries=Object.entries(value);
  if(entries.length!==1 || entries[0][0]!==op || entries[0][1]===undefined || entries[0][1]===null || Array.isArray(entries[0][1])) return null;
  return String(entries[0][1]);
}
function canonicalEdge(a,b){ return [String(a),String(b)].sort().join('::'); }

async function loadProductModule(product){
  const entry=getRuntimeMasterEntry(product.manufacturer,product.series);
  assert.ok(entry,`${product.id}: runtime registry entry missing`);
  const pkg=await loadFormalProductRuntimePackage(entry);
  const preferred=entry.productModuleRole && pkg.documents?.[entry.productModuleRole];
  const doc=preferred ?? Object.values(pkg.documents ?? {}).find((value)=>value?.product_module);
  assert.ok(doc?.product_module,`${product.id}: product_module missing`);
  return { entry, module:doc.product_module };
}
function productModuleContract(module){
  const map=new Map();
  for(const def of module.specificationDefinitions ?? []) addDep(map,def.key,...selectorKeys(def.selector));
  for(const row of module.allowedValues ?? []) addDep(map,row.specificationKey,...selectorKeys(row.selector));
  for(const row of module.requiredFieldRules ?? []) addDep(map,row.specificationKey,...selectorKeys(row.selector));
  for(const dep of module.dependencies ?? []) addDep(map,dep.effect?.key ?? dep.targetField,...selectorKeys(dep.when));
  return freezeMap(map);
}
function deriveConflictTemplates(module,key){
  const influenceKeys=new Set([key]);
  for(const row of module.allowedValues ?? []) if(row.specificationKey===key) for(const metadataKey of Object.keys(row.metadata ?? {})) influenceKeys.add(metadataKey);
  const unsupported=[]; const templates=new Map();
  const mentionsAny=(selector)=>[...influenceKeys].some((candidate)=>selectorMentions(selector,candidate));
  for(const def of module.specificationDefinitions ?? []) if(mentionsAny(def.selector)) unsupported.push({kind:'definition',id:def.id ?? def.key});
  for(const rule of module.requiredFieldRules ?? []) if(mentionsAny(rule.selector)) unsupported.push({kind:'required',id:rule.id ?? rule.specificationKey});
  if(nestedSelectorMention(module.ruleSets ?? [],influenceKeys)) unsupported.push({kind:'ruleSet',id:'selector_or_when'});

  for(const row of module.allowedValues ?? []){
    if(!mentionsAny(row.selector)) continue;
    if(row.specificationKey!==key){ unsupported.push({kind:'allowed_other_field',id:row.id ?? row.specificationKey}); continue; }
    const other=exactPredicate(row.selector,key,'$notContains');
    if(!other || row.value===undefined || row.value===null){ unsupported.push({kind:'allowed_unsupported',id:row.id ?? row.value}); continue; }
    templates.set(canonicalEdge(row.value,other),{kind:'MUTEX_ALLOWED_VALUE_NOT_CONTAINS',a:String(row.value),b:other,source_id:row.id ?? null});
  }
  for(const dep of module.dependencies ?? []){
    if(!mentionsAny(dep.when)) continue;
    const trigger=exactPredicate(dep.when,key,'$contains');
    const mode=dep.mode ?? dep.evaluation;
    const action=dep.action ?? dep.effect?.type;
    const targetField=dep.targetField ?? dep.effect?.key;
    const targetValue=dep.targetValue ?? dep.effect?.value;
    if(!trigger || mode!=='AUTO' || !['deny_candidate','DENY_CANDIDATE'].includes(action) || targetField!==key || targetValue===undefined || targetValue===null){
      unsupported.push({kind:'dependency_unsupported',id:dep.id ?? dep.rule_id ?? null}); continue;
    }
    templates.set(canonicalEdge(trigger,targetValue),{kind:'MUTEX_AUTO_DENY',a:trigger,b:String(targetValue),source_id:dep.id ?? dep.rule_id ?? null});
  }
  return { influence_keys:[...influenceKeys].sort(), unsupported, templates:[...templates.values()].sort((x,y)=>canonicalEdge(x.a,x.b).localeCompare(canonicalEdge(y.a,y.b))) };
}
function independentSetCount(candidates,edges,required){
  const nodes=[...new Set(candidates.map(String))];
  const adjacency=new Map(nodes.map((id)=>[id,new Set()]));
  for(const [a,b] of edges){ if(a===b || !adjacency.has(a) || !adjacency.has(b)) continue; adjacency.get(a).add(b); adjacency.get(b).add(a); }
  const isolated=nodes.filter((id)=>adjacency.get(id).size===0);
  const remaining=new Set(nodes.filter((id)=>adjacency.get(id).size>0));
  let total=1n<<BigInt(isolated.length);
  while(remaining.size){
    const seed=remaining.values().next().value; const component=[]; const queue=[seed]; remaining.delete(seed);
    while(queue.length){ const id=queue.pop(); component.push(id); for(const n of adjacency.get(id)) if(remaining.delete(n)) queue.push(n); }
    const memo=new Map();
    const count=(arr)=>{
      if(!arr.length) return 1n;
      const sorted=[...arr].sort(); const key=sorted.join('|'); if(memo.has(key)) return memo.get(key);
      const first=sorted[0]; const without=sorted.slice(1); const excluded=count(without);
      const blocked=adjacency.get(first); const included=count(without.filter((id)=>!blocked.has(id)));
      const value=excluded+included; memo.set(key,value); return value;
    };
    total*=count(component);
  }
  return total-(required?1n:0n);
}

await mkdir(OUT,{recursive:true});
const modules=new Map();
for(const product of PRODUCTS) modules.set(product.id,await loadProductModule(product));
const inventory=[];
for(const product of PRODUCTS){
  const root=await resolveRuntimeAppProduct(product.id,{}); const wf=(root.fields ?? []).find((f)=>f.key==='window_type');
  assert.ok(wf,`${product.id}: window_type missing`);
  for(const choice of enabled(wf)){ const windowType=String(choice.value); if(!TARGETS.length || TARGETS.includes(windowType)) inventory.push({...product,windowType}); }
}
if(TARGETS.length) assert.equal(inventory.length,TARGETS.length,`target windows resolved ${inventory.length}/${TARGETS.length}`);

const windows=[];
for(const row of inventory){
  const {entry,module}=modules.get(row.id); const depMap=productModuleContract(module); const conflictShape=deriveConflictTemplates(module,'options');
  let calls=1,states=0,hits=0,maxDepth=0,blocker=null,terminalAuditHits=0,terminalAuditMisses=0,terminalAuditChecks=0;
  const memo=new Map(),inProgress=new Set(),terminalAuditCache=new Map();
  const root=await resolveRuntimeAppProduct(row.id,{window_type:row.windowType});

  async function exactTerminalOptions(result,field){
    if(field.key!=='options') return null;
    if(conflictShape.unsupported.length){
      throw Object.assign(new Error('unsupported Samos options self-reference shape'),{code:'SAMOS_OPTIONS_SELF_REFERENCE_UNSUPPORTED',detail:conflictShape.unsupported});
    }
    const candidates=enabled(field).map((choice)=>String(choice.value));
    const candidateSet=new Set(candidates);
    const possible=conflictShape.templates.filter((edge)=>candidateSet.has(edge.a)&&candidateSet.has(edge.b));
    const auditKey=hash({field_signature:fieldSig(field),templates:possible.map((edge)=>({a:edge.a,b:edge.b,kind:edge.kind,source_id:edge.source_id})),influence_keys:conflictShape.influence_keys});
    let audit=terminalAuditCache.get(auditKey);
    if(audit){ terminalAuditHits++; }
    else{
      terminalAuditMisses++;
      const upstream={...(result.selection ?? {})}; delete upstream[field.key];
      if(calls>=MAX_CALLS) throw Object.assign(new Error('resolver call limit before options empty audit'),{code:'RESOLVER_CALL_LIMIT_REACHED',calls});
      const emptyResolved=await resolveRuntimeAppProduct(row.id,upstream); calls++; terminalAuditChecks++;
      const emptyField=(emptyResolved.fields ?? []).find((f)=>f.key===field.key) ?? null;
      if(!emptyField || !sameStrings(enabled(emptyField).map((c)=>c.value),candidates) || !exactSubset(emptyResolved,field.key,[])) throw Object.assign(new Error('options empty-state audit mismatch'),{code:'SAMOS_OPTIONS_EMPTY_AUDIT_MISMATCH'});
      for(const id of candidates){
        if(calls>=MAX_CALLS) throw Object.assign(new Error('resolver call limit during options singleton audit'),{code:'RESOLVER_CALL_LIMIT_REACHED',calls});
        const child=await resolveRuntimeAppProduct(row.id,{...upstream,[field.key]:[id]}); calls++; terminalAuditChecks++;
        if(invalid(child) || !exactSubset(child,field.key,[id])) throw Object.assign(new Error(`options singleton audit mismatch ${id}`),{code:'SAMOS_OPTIONS_SINGLETON_AUDIT_MISMATCH',id});
      }
      const templateKeys=new Set(possible.map((edge)=>canonicalEdge(edge.a,edge.b))); const activeEdges=[];
      for(let i=0;i<candidates.length;i++) for(let j=i+1;j<candidates.length;j++){
        if(calls>=MAX_CALLS) throw Object.assign(new Error('resolver call limit during options pair audit'),{code:'RESOLVER_CALL_LIMIT_REACHED',calls});
        const pair=[candidates[i],candidates[j]]; const child=await resolveRuntimeAppProduct(row.id,{...upstream,[field.key]:pair}); calls++; terminalAuditChecks++;
        const exact=!invalid(child)&&exactSubset(child,field.key,pair); const key=canonicalEdge(pair[0],pair[1]);
        if(templateKeys.has(key)){ if(exact) throw Object.assign(new Error(`declared conflict pair survives ${key}`),{code:'SAMOS_OPTIONS_CONFLICT_AUDIT_MISMATCH',pair}); activeEdges.push(pair); }
        else if(!exact) throw Object.assign(new Error(`undeclared option interaction ${key}`),{code:'SAMOS_OPTIONS_UNDECLARED_INTERACTION',pair});
      }
      audit={verified:true,active_edges:activeEdges.map(([a,b])=>[String(a),String(b)]),candidate_count:candidates.length,pair_checks:candidates.length*(candidates.length-1)/2,source_templates:possible};
      terminalAuditCache.set(auditKey,audit);
      console.log(`SAMOS_CONFLICT_AUDIT series=${row.series} window=${row.windowType} candidates=${candidates.length} edges=${audit.active_edges.length} pair_checks=${audit.pair_checks} calls=${calls}`);
    }
    const terminal=independentSetCount(candidates,audit.active_edges,Boolean(field.required));
    return {terminal,custom:customPending(result)?terminal:0n,model:'SAMOS_SOURCE_AUDITED_CONFLICT_GRAPH_V4',candidate_count:candidates.length,edge_count:audit.active_edges.length,audit_key:auditKey,source_templates:audit.source_templates};
  }

  async function count(result,done,depth=0){
    if(blocker) return null; maxDepth=Math.max(maxDepth,depth);
    const key=memoKey(result,done,depMap),sig=futureSignature(result,done,depMap),cached=memo.get(key);
    if(cached){ if(stableJson(cached.signature)!==stableJson(sig)){ blocker={status:'RESOLVER_DERIVED_CONTRACT_INCONSISTENT',memo_key:key}; return null; } hits++; return cached.counts; }
    if(inProgress.has(key)){ blocker={status:'MEMO_CYCLE_DETECTED',memo_key:key}; return null; }
    if(states>=MAX_STATES){ blocker={status:'MEMO_STATE_LIMIT_REACHED',states,calls,next_field:nextField(result,done)?.key ?? null}; return null; }
    inProgress.add(key); states++;
    const f=nextField(result,done);
    if(!f){ const counts={terminal:1n,custom:customPending(result)?1n:0n}; memo.set(key,{counts,signature:sig}); inProgress.delete(key); return counts; }
    const remaining=userFields(result).filter((candidate)=>candidate.key!=='window_type'&&!done.has(candidate.key));
    if(f.dataType==='MULTI_ENUM' && f.key==='options' && remaining.length===1){
      try{
        const proof=await exactTerminalOptions(result,f); const counts={terminal:proof.terminal,custom:proof.custom};
        memo.set(key,{counts,signature:sig,terminal_proof:proof}); inProgress.delete(key); return counts;
      }catch(error){ blocker={status:error.code ?? 'SAMOS_TERMINAL_CONFLICT_PROOF_FAILED',field:f.key,message:error.message,states,calls,detail:error.detail ?? error.pair ?? error.id ?? null}; inProgress.delete(key); return null; }
    }
    if(f.dataType==='MULTI_ENUM' && enabled(f).length>MAX_MULTI){ blocker={status:'NONTERMINAL_MULTI_ENUM_TOO_LARGE',field:f.key,candidate_count:enabled(f).length,states,calls}; inProgress.delete(key); return null; }
    const branches=f.dataType==='MULTI_ENUM'?[...multiBranches(f)]:scalarBranches(f);
    if(calls+branches.length>MAX_CALLS){ blocker={status:'RESOLVER_CALL_LIMIT_REACHED',states,calls,next_field:f.key,candidate_count:branches.length}; inProgress.delete(key); return null; }
    let terminal=0n,custom=0n;
    for(const branch of branches){
      const child=await resolveRuntimeAppProduct(row.id,apply(result.selection,f,branch)); calls++;
      if(!survives(child,f,branch)||invalid(child)) continue;
      const cc=await count(child,childDone(done,f.key,child),depth+1); if(!cc){ inProgress.delete(key); return null; }
      terminal+=cc.terminal; custom+=cc.custom;
    }
    const counts={terminal,custom}; memo.set(key,{counts,signature:sig}); inProgress.delete(key); return counts;
  }

  const counts=await count(root,new Set(['window_type']));
  const proofs=[...memo.values()].filter((value)=>value.terminal_proof).map((value)=>value.terminal_proof);
  const status=blocker?'BLOCKED':'COUNTED_CANDIDATE';
  const evidence={
    manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,status,
    proof_model_version:'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1',count_model_version:'SAMOS_RESOLVER_CONTRACT_CONFLICT_GRAPH_V4',
    runtime_manifest_sha256:entry.runtimeManifestSha256 ?? null,
    exact_discrete_terminal_context_count:counts?.terminal?.toString() ?? null,custom_pending_context_count:counts?.custom?.toString() ?? null,
    memo_state_count:states,memo_hit_count:hits,resolver_call_count:calls,max_depth:maxDepth,
    terminal_audit_cache_size:terminalAuditCache.size,terminal_audit_cache_hits:terminalAuditHits,terminal_audit_cache_misses:terminalAuditMisses,terminal_audit_checks:terminalAuditChecks,
    contract_digest:hash(Object.fromEntries([...depMap.entries()])),source_shape_digest:hash(conflictShape),terminal_proof_digest:hash(proofs.map((proof)=>({...proof,terminal:proof.terminal.toString(),custom:proof.custom.toString()}))),
    source_shape:{influence_keys:conflictShape.influence_keys,unsupported:conflictShape.unsupported,templates:conflictShape.templates},
    terminal_proofs:proofs.map((proof)=>({...proof,terminal:proof.terminal.toString(),custom:proof.custom.toString()})),blocker,
  };
  windows.push(evidence);
  console.log(`SAMOS_V4_WINDOW series=${row.series} window=${row.windowType} status=${status} terminal=${evidence.exact_discrete_terminal_context_count ?? 'BLOCKED'} custom=${evidence.custom_pending_context_count ?? 'BLOCKED'} memo=${states} hits=${hits} calls=${calls} audit_checks=${terminalAuditChecks}`);
}

const counted=windows.filter((row)=>row.status==='COUNTED_CANDIDATE'&&!row.blocker);
const report={
  exact_head_sha:HEAD_SHA,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,
  proof_model_version:'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1',count_model_version:'SAMOS_RESOLVER_CONTRACT_CONFLICT_GRAPH_V4',
  target_windows:TARGETS,base_window_count:windows.length,counted_window_count:counted.length,blocked_window_count:windows.length-counted.length,
  exact_discrete_terminal_context_count:counted.length===windows.length?counted.reduce((sum,row)=>sum+BigInt(row.exact_discrete_terminal_context_count),0n).toString():null,
  custom_pending_context_count:counted.length===windows.length?counted.reduce((sum,row)=>sum+BigInt(row.custom_pending_context_count),0n).toString():null,
  windows,
  gate_status:{samos_v4_gate:counted.length===windows.length?'PASS':'BLOCKED',nontw_discrete_population_gate:'BLOCKED_REMAINING_WINDOWS_AND_APW430_PENDING',custom_size_coverage_gate:'BLOCKED_CONTINUOUS_PARTITION_NOT_PROVEN',app_integration_ready:false,release_input_gate:'BLOCKED'},
};
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(`SAMOS_V4_STATUS=${report.gate_status.samos_v4_gate}`);
console.log(`COUNTED_WINDOW_COUNT=${report.counted_window_count}`);
console.log(`BLOCKED_WINDOW_COUNT=${report.blocked_window_count}`);
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
