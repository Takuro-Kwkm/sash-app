import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const OUT=process.env.STAGE_A_SAMOS_SIZE_META_OUT??'artifacts/stage-a-samos2h-size-metadata-fingerprint';
const HEAD_SHA=process.env.HEAD_SHA??null;
const TARGET_WINDOWS=String(process.env.STAGE_A_TARGET_WINDOWS??'WT-S2H-MENKOSHI-HIKI,WT-S2H-SHUTTER-HIKI,WT-S2H-HIKICHIGAI').split(',').map((v)=>v.trim()).filter(Boolean);
const PRODUCT={id:'SER-LIX-SAMOS2H',manufacturer:'LIXIL',series:'サーモスⅡ-H'};
const has=(v)=>v!==undefined&&v!==null&&v!=='';
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
function selectorKeysDeep(selector,out=new Set()){
  if(!selector||typeof selector!=='object')return out;
  if(Array.isArray(selector)){for(const one of selector)selectorKeysDeep(one,out);return out;}
  for(const [key,value] of Object.entries(selector)){
    if(!['any','anyOf','all','allOf','not'].includes(key)&&!key.startsWith('$'))out.add(key);
    selectorKeysDeep(value,out);
  }
  return out;
}
function collectSelectorObjects(node,path=[],out=[]){
  if(!node||typeof node!=='object')return out;
  if(Array.isArray(node)){node.forEach((one,index)=>collectSelectorObjects(one,[...path,index],out));return out;}
  for(const [key,value] of Object.entries(node)){
    if((key==='selector'||key==='when')&&value&&typeof value==='object')out.push({path:[...path,key].join('.'),selector:value});
    collectSelectorObjects(value,[...path,key],out);
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
  if(has(explicit)&&!String(explicit).includes('・'))return String(explicit);
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

const preparedMetadataKeys=[...new Set(sourceSizeRows.flatMap((row)=>Object.keys(preparedSizeMetadata(row))))].sort();
const selectorObjects=collectSelectorObjects(module);
const selectorKeyConsumers=new Map();
for(const row of selectorObjects){
  for(const key of selectorKeysDeep(row.selector)){
    const rows=selectorKeyConsumers.get(key)??[];
    rows.push(row.path);selectorKeyConsumers.set(key,rows);
  }
}
const relevantMetadataKeys=preparedMetadataKeys.filter((key)=>selectorKeyConsumers.has(key)).sort();
const irrelevantMetadataKeys=preparedMetadataKeys.filter((key)=>!selectorKeyConsumers.has(key)).sort();

const windows=[];
for(const windowType of TARGET_WINDOWS){
  const values=candidateValues(windowType);
  const groups=new Map();
  const missing=[];
  for(const value of values){
    const row=firstSizeRow(value);
    const metadata=preparedSizeMetadata(row);
    const construction=derivedConstruction(row);
    if(!construction)missing.push(String(value));
    const fingerprint={construction,...Object.fromEntries(relevantMetadataKeys.map((key)=>[key,metadata[key]??null]))};
    const key=stableJson(fingerprint);
    const group=groups.get(key)??{fingerprint,weight:0,representative:String(value),samples:[],values:[]};
    group.weight+=1;group.values.push(String(value));if(group.samples.length<8)group.samples.push(String(value));groups.set(key,group);
  }
  const classes=[...groups.values()].sort((a,b)=>b.weight-a.weight||stableJson(a.fingerprint).localeCompare(stableJson(b.fingerprint)));
  const total=classes.reduce((sum,row)=>sum+row.weight,0);
  windows.push({
    window_type:windowType,
    logical_size_count:values.length,
    behavior_class_count:classes.length,
    partition_weight_total:total,
    compression_ratio:classes.length?values.length/classes.length:null,
    missing_construction_count:missing.length,
    missing_construction_values:missing.slice(0,20),
    behavior_classes:classes.map((group)=>({fingerprint:group.fingerprint,weight:group.weight,representative:group.representative,samples:group.samples,values_digest:hash(group.values)})),
  });
}

const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  proof_role:'SAMOS2H_SIZE_METADATA_AWARE_FINGERPRINT_DIAGNOSTIC',
  runtime_manifest_sha256:entry.expectedSha256??entry.sha256??null,
  product_module_role:entry.productModuleRole??null,
  product_module_digest:hash(module),
  prepared_size_metadata_keys:preparedMetadataKeys,
  relevant_size_metadata_keys:relevantMetadataKeys,
  irrelevant_size_metadata_keys:irrelevantMetadataKeys,
  relevant_metadata_consumers:Object.fromEntries(relevantMetadataKeys.map((key)=>[key,[...new Set(selectorKeyConsumers.get(key)??[])].sort()])),
  windows,
  gate_status:{diagnostic:'EVIDENCE_ONLY',samos2h_remaining_discrete_gate:'BLOCKED_PENDING_METADATA_AWARE_CONTROL_EQUIVALENCE',nontw_discrete_population_gate:'BLOCKED',custom_size_coverage_gate:'BLOCKED',app_integration_ready:false,release_input_gate:'BLOCKED'},
};
await mkdir(OUT,{recursive:true});
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(`PRODUCT_MODULE_DIGEST=${report.product_module_digest}`);
console.log(`PREPARED_SIZE_METADATA_KEYS=${preparedMetadataKeys.join(',')||'none'}`);
console.log(`RELEVANT_SIZE_METADATA_KEYS=${relevantMetadataKeys.join(',')||'none'}`);
console.log(`IRRELEVANT_SIZE_METADATA_KEYS=${irrelevantMetadataKeys.join(',')||'none'}`);
for(const [key,paths] of Object.entries(report.relevant_metadata_consumers))console.log(`METADATA_CONSUMER key=${key} count=${paths.length}`);
for(const row of windows){
  console.log(`METADATA_PARTITION window=${row.window_type} logical=${row.logical_size_count} classes=${row.behavior_class_count} compression=${row.compression_ratio} missing=${row.missing_construction_count}`);
  console.log(`METADATA_CLASSES window=${row.window_type} ${JSON.stringify(row.behavior_classes.slice(0,30).map((c)=>({fingerprint:c.fingerprint,weight:c.weight,representative:c.representative,samples:c.samples})))}`);
}
console.log('DIAGNOSTIC_ONLY=true');
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
