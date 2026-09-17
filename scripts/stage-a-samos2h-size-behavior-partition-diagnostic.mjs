import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const OUT=process.env.STAGE_A_SAMOS_SIZE_PARTITION_OUT??'artifacts/stage-a-samos2h-size-behavior-partition';
const HEAD_SHA=process.env.HEAD_SHA??null;
const TARGET_WINDOWS=String(process.env.STAGE_A_TARGET_WINDOWS??'WT-S2H-SHUTTER-HIKI,WT-S2H-HIKICHIGAI').split(',').map((v)=>v.trim()).filter(Boolean);
const PRODUCT={id:'SER-LIX-SAMOS2H',manufacturer:'LIXIL',series:'サーモスⅡ-H'};
const has=(v)=>v!==undefined&&v!==null&&v!=='';
const same=(a,b)=>Object.is(a,b)||String(a)===String(b);
const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object'?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])));
const stableJson=(v)=>JSON.stringify(stable(v));
const hash=(v)=>createHash('sha256').update(typeof v==='string'?v:stableJson(v)).digest('hex');

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
function constructionFromSelector(selector,fallback=null){
  const raw=selector?.construction;
  if(typeof raw==='string')return raw;
  const values=raw?.$in;
  if(Array.isArray(values)&&values.length===1)return values[0];
  if(Array.isArray(values)&&values.includes(fallback))return fallback;
  return fallback;
}
function selectorMentions(selector,key){
  if(!selector||typeof selector!=='object')return false;
  if(Array.isArray(selector))return selector.some((one)=>selectorMentions(one,key));
  for(const [name,value] of Object.entries(selector)){
    if(name===key)return true;
    if(selectorMentions(value,key))return true;
  }
  return false;
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

function derivedConstructionForSourceRow(row){
  const metadata={...(row?.metadata??{})};
  const sourceConstruction=row?.selector?.construction;
  if(sourceConstruction!==undefined && metadata.derivedConstruction===undefined){
    metadata.internalConstructionSelector=metadata.internalConstructionSelector??sourceConstruction;
    metadata.derivedConstruction=constructionFromSelector({construction:sourceConstruction},constructionDefault);
  }
  const explicit=metadata.derivedConstruction??metadata.construction??metadata.constructionSource;
  if(has(explicit)&&!String(explicit).includes('・'))return String(explicit);
  return constructionFromSelector({construction:metadata.internalConstructionSelector},explicit??constructionDefault)??explicit??constructionDefault??null;
}
function firstSourceRowForValue(value){return sourceSizeRows.find((row)=>same(row.value,value))??null;}
function candidateValuesForWindow(windowType){
  const values=new Map();
  for(const row of sourceSizeRows){
    if(row.status==='INACTIVE'||row.userSelectable===false||row.runtimeSelectable===false||row.value===undefined||row.value===null)continue;
    if(windowCompatibility(row.selector,windowType)===false)continue;
    if(!values.has(String(row.value)))values.set(String(row.value),row.value);
  }
  return [...values.values()];
}
function rawConstructionSet(value){
  return [...new Set(sourceSizeRows.filter((row)=>same(row.value,value)).map((row)=>stableJson(row.selector?.construction??null)))];
}

const constructionConsumers=[];
for(const row of module.specificationDefinitions??[])if(selectorMentions(row.selector,'construction'))constructionConsumers.push({kind:'definition',id:row.id??row.key,target:row.key});
for(const row of module.allowedValues??[])if(selectorMentions(row.selector,'construction'))constructionConsumers.push({kind:'allowed_value',id:row.id??null,target:row.specificationKey});
for(const row of module.requiredFieldRules??[])if(selectorMentions(row.selector,'construction'))constructionConsumers.push({kind:'required_rule',id:row.id??null,target:row.specificationKey});
for(const row of module.dependencies??[])if(selectorMentions(row.when,'construction'))constructionConsumers.push({kind:'dependency',id:row.id??row.rule_id??null,target:row.targetField??row.effect?.key??null});
const downstreamTargets=[...new Set(constructionConsumers.map((row)=>row.target).filter(Boolean))].sort();

const metadataKeys=[...new Set(sourceSizeRows.flatMap((row)=>Object.keys(row.metadata??{})))].sort();
const windows=[];
for(const windowType of TARGET_WINDOWS){
  const candidates=candidateValuesForWindow(windowType);
  const groups=new Map();
  const ambiguous=[];
  const missing=[];
  for(const value of candidates){
    const first=firstSourceRowForValue(value);
    const construction=derivedConstructionForSourceRow(first);
    if(!construction)missing.push(String(value));
    const rawSet=rawConstructionSet(value);
    if(rawSet.length>1)ambiguous.push({value:String(value),raw_construction_selectors:rawSet});
    const key=construction??'$NULL';
    const group=groups.get(key)??{derived_construction:construction,weight:0,samples:[],all_values:[]};
    group.weight+=1;
    group.all_values.push(String(value));
    if(group.samples.length<10)group.samples.push(String(value));
    groups.set(key,group);
  }
  const classes=[...groups.values()].sort((a,b)=>b.weight-a.weight||String(a.derived_construction).localeCompare(String(b.derived_construction)));
  windows.push({
    window_type:windowType,
    logical_size_count:candidates.length,
    behavior_class_count:classes.length,
    compression_ratio:classes.length?candidates.length/classes.length:null,
    behavior_classes:classes,
    missing_construction_count:missing.length,
    missing_construction_values:missing.slice(0,30),
    duplicate_value_multi_construction_count:ambiguous.length,
    duplicate_value_multi_construction_samples:ambiguous.slice(0,30),
  });
}

const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  proof_role:'SAMOS2H_STANDARD_SIZE_BEHAVIOR_PARTITION_DIAGNOSTIC',
  runtime_manifest_sha256:entry.expectedSha256??entry.sha256??null,
  product_module_role:entry.productModuleRole??null,
  product_module_digest:hash(module),
  adapter_behavior_basis:{
    standard_dimension_uses_size_value:false,
    size_downstream_direct_selector_reference_count:0,
    size_behavior_driver:'FIRST_SOURCE_SIZE_ROW -> DERIVED_HIDDEN_CONSTRUCTION',
    construction_consumer_count:constructionConsumers.length,
    construction_downstream_targets:downstreamTargets,
    size_metadata_keys:metadataKeys,
  },
  windows,
  gate_status:{diagnostic:'EVIDENCE_ONLY',samos2h_remaining_discrete_gate:'BLOCKED_PENDING_V6_CONTROL_EQUIVALENCE',nontw_discrete_population_gate:'BLOCKED',custom_size_coverage_gate:'BLOCKED',app_integration_ready:false,release_input_gate:'BLOCKED'},
};
await mkdir(OUT,{recursive:true});
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(`PRODUCT_MODULE_DIGEST=${report.product_module_digest}`);
console.log(`SIZE_METADATA_KEYS=${metadataKeys.join(',')||'none'}`);
console.log(`CONSTRUCTION_CONSUMER_COUNT=${constructionConsumers.length}`);
console.log(`CONSTRUCTION_DOWNSTREAM_TARGETS=${downstreamTargets.join(',')||'none'}`);
for(const row of windows){
  console.log(`SIZE_PARTITION window=${row.window_type} logical=${row.logical_size_count} classes=${row.behavior_class_count} compression=${row.compression_ratio} missing=${row.missing_construction_count} duplicate_multi_construction=${row.duplicate_value_multi_construction_count}`);
  console.log(`SIZE_CLASSES window=${row.window_type} ${JSON.stringify(row.behavior_classes.map((c)=>({construction:c.derived_construction,weight:c.weight,samples:c.samples})))}`);
}
console.log('DIAGNOSTIC_ONLY=true');
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
