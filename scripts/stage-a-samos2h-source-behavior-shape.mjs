import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const OUT = process.env.STAGE_A_SAMOS_SOURCE_SHAPE_OUT ?? 'artifacts/stage-a-samos2h-source-behavior-shape';
const HEAD_SHA = process.env.HEAD_SHA ?? null;
const TARGET_WINDOWS = String(process.env.STAGE_A_TARGET_WINDOWS ?? 'WT-S2H-SHUTTER-HIKI,WT-S2H-HIKICHIGAI').split(',').map((v)=>v.trim()).filter(Boolean);
const PRODUCT = { id:'SER-LIX-SAMOS2H', manufacturer:'LIXIL', series:'サーモスⅡ-H' };
const stable = (v) => Array.isArray(v) ? v.map(stable) : (!v || typeof v !== 'object' ? v : Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])));
const stableJson = (v) => JSON.stringify(stable(v));
const hash = (v) => createHash('sha256').update(typeof v === 'string' ? v : stableJson(v)).digest('hex');

function selectorMentions(selector,key){
  if(!selector || typeof selector !== 'object') return false;
  if(Array.isArray(selector)) return selector.some((one)=>selectorMentions(one,key));
  for(const [name,value] of Object.entries(selector)){
    if(name===key) return true;
    if(selectorMentions(value,key)) return true;
  }
  return false;
}
function collectOperators(node,out=new Set()){
  if(!node || typeof node !== 'object') return out;
  if(Array.isArray(node)){ for(const one of node) collectOperators(one,out); return out; }
  for(const [key,value] of Object.entries(node)){
    if(key.startsWith('$') || ['any','anyOf','all','allOf','not'].includes(key)) out.add(key);
    collectOperators(value,out);
  }
  return out;
}
function collectLiteralValues(node,out=new Set()){
  if(node===undefined || node===null) return out;
  if(Array.isArray(node)){ for(const one of node) collectLiteralValues(one,out); return out; }
  if(typeof node !== 'object'){ out.add(String(node)); return out; }
  for(const [key,value] of Object.entries(node)){
    if(key.startsWith('$')) collectLiteralValues(value,out);
  }
  return out;
}
function fieldPredicate(selector,key){
  if(!selector || typeof selector !== 'object') return null;
  if(Array.isArray(selector)) return selector.map((one)=>fieldPredicate(one,key)).filter((v)=>v!==null);
  if(Object.prototype.hasOwnProperty.call(selector,key)) return selector[key];
  const nested=[];
  for(const [name,value] of Object.entries(selector)){
    if(['any','anyOf','all','allOf','not'].includes(name)){
      const hit=fieldPredicate(value,key); if(hit!==null && (!Array.isArray(hit)||hit.length)) nested.push({[name]:hit});
    }
  }
  return nested.length?nested:null;
}
function scalarPredicateMatch(predicate,value){
  if(predicate===undefined || predicate===null) return true;
  if(Array.isArray(predicate)) return predicate.some((one)=>scalarPredicateMatch(one,value));
  if(typeof predicate!=='object') return String(predicate)===String(value);
  if('$eq' in predicate) return String(predicate.$eq)===String(value);
  if('$ne' in predicate) return String(predicate.$ne)!==String(value);
  if('$in' in predicate && Array.isArray(predicate.$in)) return predicate.$in.map(String).includes(String(value));
  if('$notIn' in predicate && Array.isArray(predicate.$notIn)) return !predicate.$notIn.map(String).includes(String(value));
  if('$contains' in predicate) return String(predicate.$contains)===String(value);
  if('$notContains' in predicate) return String(predicate.$notContains)!==String(value);
  return null;
}
function windowCompatibility(selector,windowType){
  if(!selector || typeof selector !== 'object') return true;
  if(Array.isArray(selector)){
    const rows=selector.map((one)=>windowCompatibility(one,windowType));
    return rows.includes(true)?true:(rows.every((v)=>v===false)?false:null);
  }
  if(Object.prototype.hasOwnProperty.call(selector,'window_type')) return scalarPredicateMatch(selector.window_type,windowType);
  if(Object.prototype.hasOwnProperty.call(selector,'windowType')) return scalarPredicateMatch(selector.windowType,windowType);
  // Only reject a row when the window predicate itself is provably false.
  for(const [name,value] of Object.entries(selector)){
    if(['any','anyOf'].includes(name)){
      const rows=(Array.isArray(value)?value:[value]).map((one)=>windowCompatibility(one,windowType));
      if(rows.every((v)=>v===false)) return false;
    }
    if(['all','allOf'].includes(name)){
      const rows=(Array.isArray(value)?value:[value]).map((one)=>windowCompatibility(one,windowType));
      if(rows.includes(false)) return false;
    }
    if(name==='not'){
      const nested=windowCompatibility(value,windowType);
      if(nested===true) return false;
    }
  }
  return null;
}

const entry=getRuntimeMasterEntry(PRODUCT.manufacturer,PRODUCT.series);
assert.ok(entry,'Samos2H runtime registry entry missing');
const pkg=await loadFormalProductRuntimePackage(entry);
const preferred=entry.productModuleRole && pkg.documents?.[entry.productModuleRole];
const doc=preferred ?? Object.values(pkg.documents??{}).find((value)=>value?.product_module);
const module=doc?.product_module;
assert.ok(module,'Samos2H product_module missing');

const records=[];
for(const row of module.specificationDefinitions??[]) records.push({kind:'definition',id:row.id??row.key??null,target:row.key??null,selector:row.selector??null,payload:{required:row.required??null,dataType:row.dataType??null}});
for(const row of module.allowedValues??[]) records.push({kind:'allowed_value',id:row.id??null,target:row.specificationKey??null,selector:row.selector??null,payload:{value:row.value??null,metadata:row.metadata??null}});
for(const row of module.requiredFieldRules??[]) records.push({kind:'required_rule',id:row.id??null,target:row.specificationKey??null,selector:row.selector??null,payload:{required:row.required??true}});
for(const row of module.dependencies??[]) records.push({kind:'dependency',id:row.id??row.rule_id??null,target:row.targetField??row.effect?.key??null,selector:row.when??null,payload:{mode:row.mode??row.evaluation??null,action:row.action??row.effect?.type??null,targetValue:row.targetValue??row.effect?.value??null}});
for(const [index,row] of (module.ruleSets??[]).entries()) records.push({kind:'rule_set',id:row.id??`ruleSet:${index}`,target:row.targetField??row.effect?.key??null,selector:row.selector??row.when??null,payload:row});

const fields=[...new Set([
  ...(module.specificationDefinitions??[]).map((row)=>row.key),
  ...(module.allowedValues??[]).map((row)=>row.specificationKey),
  ...(module.requiredFieldRules??[]).map((row)=>row.specificationKey),
  ...(module.dependencies??[]).map((row)=>row.targetField??row.effect?.key),
].filter(Boolean))].sort();

function buildWindow(windowType){
  const candidateMap=new Map();
  for(const row of module.allowedValues??[]){
    if(!row.specificationKey || row.value===undefined || row.value===null) continue;
    const compatible=windowCompatibility(row.selector,windowType);
    if(compatible===false) continue;
    const set=candidateMap.get(row.specificationKey)??new Map();
    set.set(String(row.value),row.value);
    candidateMap.set(row.specificationKey,set);
  }
  const rows=[];
  for(const key of fields){
    const candidates=[...(candidateMap.get(key)?.keys()??[])].sort();
    const influence=records.filter((record)=>record.target!==key && selectorMentions(record.selector,key));
    const selfInfluence=records.filter((record)=>record.target===key && selectorMentions(record.selector,key));
    const operators=[...new Set(influence.flatMap((record)=>[...collectOperators(fieldPredicate(record.selector,key))]))].sort();
    const mentioned=new Set();
    for(const record of influence){ const pred=fieldPredicate(record.selector,key); for(const value of collectLiteralValues(pred)) mentioned.add(value); }
    const mentionedCandidates=candidates.filter((value)=>mentioned.has(String(value)));
    const unmentionedCandidates=candidates.filter((value)=>!mentioned.has(String(value)));
    const targetFields=[...new Set(influence.map((record)=>record.target).filter(Boolean))].sort();
    rows.push({
      field:key,
      candidate_count:candidates.length,
      candidate_values:candidates.length<=80?candidates:null,
      influence_record_count:influence.length,
      self_reference_record_count:selfInfluence.length,
      downstream_target_fields:targetFields,
      operator_set:operators,
      mentioned_literal_count:mentioned.size,
      mentioned_candidate_count:mentionedCandidates.length,
      unmentioned_candidate_count:unmentionedCandidates.length,
      conservative_projection_weight:unmentionedCandidates.length>1?unmentionedCandidates.length:0,
      influence_records:influence.map((record)=>({kind:record.kind,id:record.id,target:record.target,predicate:fieldPredicate(record.selector,key),payload:record.payload})),
    });
  }
  rows.sort((a,b)=>
    (b.conservative_projection_weight-a.conservative_projection_weight) ||
    (b.candidate_count-a.candidate_count) ||
    (b.influence_record_count-a.influence_record_count) ||
    a.field.localeCompare(b.field)
  );
  return {window_type:windowType,fields:rows};
}

const windows=TARGET_WINDOWS.map(buildWindow);
const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  proof_role:'SOURCE_STATIC_BEHAVIOR_SHAPE_DIAGNOSTIC_ONLY',
  runtime_manifest_sha256:entry.expectedSha256??entry.sha256??null,
  product_module_role:entry.productModuleRole??null,
  product_module_digest:hash(module),
  record_count:records.length,
  window_count:windows.length,
  windows,
  gate_status:{source_static_diagnostic:'EVIDENCE_ONLY',samos2h_remaining_discrete_gate:'BLOCKED',nontw_discrete_population_gate:'BLOCKED',custom_size_coverage_gate:'BLOCKED',app_integration_ready:false,release_input_gate:'BLOCKED'},
};
await mkdir(OUT,{recursive:true});
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
for(const window of windows){
  console.log(`SOURCE_SHAPE window=${window.window_type}`);
  for(const row of window.fields.slice(0,12)) console.log(`FIELD field=${row.field} candidates=${row.candidate_count} influence=${row.influence_record_count} mentioned=${row.mentioned_candidate_count} unmentioned=${row.unmentioned_candidate_count} projection_weight=${row.conservative_projection_weight} operators=${row.operator_set.join(',')||'none'} downstream=${row.downstream_target_fields.join(',')||'none'}`);
}
console.log(`PRODUCT_MODULE_DIGEST=${report.product_module_digest}`);
console.log('DIAGNOSTIC_ONLY=true');
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
