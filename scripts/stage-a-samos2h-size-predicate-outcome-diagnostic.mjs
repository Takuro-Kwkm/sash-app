import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { opMatch } from '../src/catalog/selector-ops.mjs';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const OUT=process.env.STAGE_A_SAMOS_PREDICATE_OUT??'artifacts/stage-a-samos2h-size-predicate-outcome';
const HEAD_SHA=process.env.HEAD_SHA??null;
const TARGET_WINDOWS=String(process.env.STAGE_A_TARGET_WINDOWS??'WT-S2H-MENKOSHI-HIKI,WT-S2H-SHUTTER-HIKI,WT-S2H-HIKICHIGAI').split(',').map((v)=>v.trim()).filter(Boolean);
const PRODUCT={id:'SER-LIX-SAMOS2H',manufacturer:'LIXIL',series:'サーモスⅡ-H'};
const META_KEYS=['actualH','actualW','windowClass'];
const same=(a,b)=>Object.is(a,b)||String(a)===String(b);
const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object'?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])));
const stableJson=(v)=>JSON.stringify(stable(v));
const hash=(v)=>createHash('sha256').update(typeof v==='string'?v:stableJson(v)).digest('hex');

function constructionFromSelector(selector,fallback=null){
  const raw=selector?.construction;
  if(typeof raw==='string')return raw;
  const values=raw?.$in;
  if(Array.isArray(values)&&values.length===1)return values[0];
  if(Array.isArray(values)&&values.includes(fallback))return fallback;
  return fallback;
}
function collectSelectors(node,path=[],out=[]){
  if(!node||typeof node!=='object')return out;
  if(Array.isArray(node)){node.forEach((one,index)=>collectSelectors(one,[...path,index],out));return out;}
  for(const [key,value] of Object.entries(node)){
    if((key==='selector'||key==='when')&&value&&typeof value==='object')out.push({path:[...path,key].join('.'),selector:value});
    collectSelectors(value,[...path,key],out);
  }
  return out;
}
function collectAtomicPredicates(selector,key,path=[],out=[]){
  if(!selector||typeof selector!=='object')return out;
  if(Array.isArray(selector)){selector.forEach((one,index)=>collectAtomicPredicates(one,key,[...path,index],out));return out;}
  for(const [name,value] of Object.entries(selector)){
    if(name===key){out.push({path:[...path,name].join('.'),expected:value});continue;}
    if(['any','anyOf','all','allOf','not'].includes(name))collectAtomicPredicates(value,key,[...path,name],out);
  }
  return out;
}
function scalarPredicateMatch(predicate,value){
  if(predicate===undefined||predicate===null)return true;
  if(Array.isArray(predicate))return predicate.some((one)=>scalarPredicateMatch(one,value));
  if(typeof predicate!=='object')return String(predicate)===String(value);
  if('$eq' in predicate)return String(predicate.$eq)===String(value);
  if('$ne' in predicate)return String(predicate.$ne)!==String(value);
  if('$in' in predicate&&Array.isArray(predicate.$in))return predicate.$in.map(String).includes(String(value));
  if('$notIn' in predicate&&Array.isArray(predicate.$notIn))return !predicate.$notIn.map(String).includes(String(value));
  return null;
}
function windowCompatibility(selector,windowType){
  if(!selector||typeof selector!=='object')return true;
  if(Array.isArray(selector)){
    const rows=selector.map((one)=>windowCompatibility(one,windowType));
    return rows.includes(true)?true:(rows.every((v)=>v===false)?false:null);
  }
  if(Object.prototype.hasOwnProperty.call(selector,'window_type'))return scalarPredicateMatch(selector.window_type,windowType);
  if(Object.prototype.hasOwnProperty.call(selector,'windowType'))return scalarPredicateMatch(selector.windowType,windowType);
  for(const [name,value] of Object.entries(selector)){
    if(['any','anyOf'].includes(name)){
      const rows=(Array.isArray(value)?value:[value]).map((one)=>windowCompatibility(one,windowType));
      if(rows.every((v)=>v===false))return false;
    }
    if(['all','allOf'].includes(name)){
      const rows=(Array.isArray(value)?value:[value]).map((one)=>windowCompatibility(one,windowType));
      if(rows.includes(false))return false;
    }
    if(name==='not'){
      const nested=windowCompatibility(value,windowType);
      if(nested===true)return false;
    }
  }
  return null;
}

const entry=getRuntimeMasterEntry(PRODUCT.manufacturer,PRODUCT.series);
assert.ok(entry,'Samos2H registry entry missing');
const pkg=await loadFormalProductRuntimePackage(entry);
const preferred=entry.productModuleRole&&pkg.documents?.[entry.productModuleRole];
const doc=preferred??Object.values(pkg.documents??{}).find((value)=>value?.product_module);
const module=doc?.product_module;
assert.ok(module,'Samos2H product_module missing');
const constructionDef=(module.specificationDefinitions??[]).find((def)=>def.key==='construction');
const constructionDefault=constructionDef?.defaultValue??null;
const sourceSizeRows=(module.allowedValues??[]).filter((row)=>row.specificationKey==='size');

function preparedSizeMetadata(row){
  const metadata={...(row?.metadata??{})};
  const sourceConstruction=row?.selector?.construction;
  if(sourceConstruction!==undefined){
    metadata.internalConstructionSelector=metadata.internalConstructionSelector??sourceConstruction;
    metadata.derivedConstruction=metadata.derivedConstruction??constructionFromSelector({construction:sourceConstruction},constructionDefault);
  }
  return metadata;
}
function derivedConstruction(row){
  const metadata=preparedSizeMetadata(row);
  const explicit=metadata.derivedConstruction??metadata.construction??metadata.constructionSource;
  if(explicit!==undefined&&explicit!==null&&explicit!==''&&!String(explicit).includes('・'))return String(explicit);
  return constructionFromSelector({construction:metadata.internalConstructionSelector},explicit??constructionDefault)??explicit??constructionDefault??null;
}
function firstSizeRow(value){return sourceSizeRows.find((row)=>same(row.value,value))??null;}
function candidateValues(windowType){
  const values=new Map();
  for(const row of sourceSizeRows){
    if(row.status==='INACTIVE'||row.userSelectable===false||row.runtimeSelectable===false||row.value===undefined||row.value===null)continue;
    if(windowCompatibility(row.selector,windowType)===false)continue;
    if(!values.has(String(row.value)))values.set(String(row.value),row.value);
  }
  return [...values.values()];
}

const selectorRows=collectSelectors(module);
const predicateMap=new Map();
for(const key of META_KEYS){
  for(const row of selectorRows){
    for(const atomic of collectAtomicPredicates(row.selector,key)){
      const signature=stableJson({key,expected:atomic.expected});
      const existing=predicateMap.get(signature)??{id:hash(signature).slice(0,16),key,expected:atomic.expected,consumer_paths:[]};
      existing.consumer_paths.push(`${row.path}:${atomic.path}`);
      predicateMap.set(signature,existing);
    }
  }
}
const predicates=[...predicateMap.values()].map((row)=>({...row,consumer_paths:[...new Set(row.consumer_paths)].sort()})).sort((a,b)=>a.key.localeCompare(b.key)||stableJson(a.expected).localeCompare(stableJson(b.expected)));

const windows=[];
for(const windowType of TARGET_WINDOWS){
  const values=candidateValues(windowType);
  const groups=new Map();
  for(const value of values){
    const row=firstSizeRow(value);assert.ok(row,`missing size source row ${value}`);
    const metadata=preparedSizeMetadata(row);
    const construction=derivedConstruction(row);assert.ok(construction,`missing construction ${value}`);
    const outcomes=predicates.map((predicate)=>({id:predicate.id,value:Boolean(opMatch(metadata[predicate.key],predicate.expected))}));
    const fingerprint={construction,outcomes:outcomes.map((x)=>x.value)};
    const key=stableJson(fingerprint);
    const group=groups.get(key)??{fingerprint,representative:String(value),weight:0,samples:[],values:[]};
    group.weight+=1;group.values.push(String(value));if(group.samples.length<10)group.samples.push(String(value));groups.set(key,group);
  }
  const classes=[...groups.values()].sort((a,b)=>b.weight-a.weight||stableJson(a.fingerprint).localeCompare(stableJson(b.fingerprint)));
  const total=classes.reduce((sum,row)=>sum+row.weight,0);
  windows.push({
    window_type:windowType,
    logical_size_count:values.length,
    predicate_outcome_class_count:classes.length,
    partition_weight_total:total,
    compression_ratio:classes.length?values.length/classes.length:null,
    classes:classes.map((group)=>({fingerprint:group.fingerprint,representative:group.representative,weight:group.weight,samples:group.samples,values_digest:hash(group.values)})),
  });
}

const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  proof_role:'SAMOS2H_SIZE_PREDICATE_OUTCOME_DIAGNOSTIC_V6_2',
  runtime_manifest_sha256:entry.expectedSha256??entry.sha256??null,
  product_module_digest:hash(module),
  metadata_keys:META_KEYS,
  atomic_predicate_count:predicates.length,
  atomic_predicates:predicates,
  atomic_predicate_digest:hash(predicates.map((p)=>({key:p.key,expected:p.expected}))),
  windows,
  gate_status:{diagnostic:'EVIDENCE_ONLY',samos2h_remaining_discrete_gate:'BLOCKED_PENDING_V6_2_CONTROL_EQUIVALENCE',nontw_discrete_population_gate:'BLOCKED',custom_size_coverage_gate:'BLOCKED',app_integration_ready:false,release_input_gate:'BLOCKED'},
};
await mkdir(OUT,{recursive:true});
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(`ATOMIC_PREDICATE_COUNT=${predicates.length}`);
console.log(`ATOMIC_PREDICATE_DIGEST=${report.atomic_predicate_digest}`);
for(const predicate of predicates)console.log(`PREDICATE id=${predicate.id} key=${predicate.key} expected=${stableJson(predicate.expected)} consumers=${predicate.consumer_paths.length}`);
for(const row of windows){
  console.log(`PREDICATE_PARTITION window=${row.window_type} logical=${row.logical_size_count} classes=${row.predicate_outcome_class_count} compression=${row.compression_ratio}`);
  console.log(`PREDICATE_CLASSES window=${row.window_type} ${JSON.stringify(row.classes.map((c)=>({construction:c.fingerprint.construction,outcomes:c.fingerprint.outcomes,weight:c.weight,representative:c.representative,samples:c.samples})))}`);
}
console.log('DIAGNOSTIC_ONLY=true');
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
