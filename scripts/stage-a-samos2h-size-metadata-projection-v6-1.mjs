import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const SOURCE=new URL('./stage-a-samos-conflict-graph-v4.mjs',import.meta.url);
const GENERATED=new URL('./.stage-a-samos2h-size-metadata-projection-v6-1.generated.mjs',import.meta.url);
let source=await readFile(SOURCE,'utf8');

function replaceOnce(label,before,after){
  const first=source.indexOf(before);
  if(first<0)throw new Error(`V6.1 patch anchor missing: ${label}`);
  if(source.indexOf(before,first+before.length)>=0)throw new Error(`V6.1 patch anchor not unique: ${label}`);
  source=source.slice(0,first)+after+source.slice(first+before.length);
}

replaceOnce(
  'output env',
  "const OUT = process.env.STAGE_A_SAMOS_V4_OUT ?? 'artifacts/stage-a-samos-conflict-graph-v4';",
  "const OUT = process.env.STAGE_A_SAMOS_V61_OUT ?? 'artifacts/stage-a-samos2h-size-metadata-projection-v6-1';",
);

replaceOnce(
  'metadata-aware size projection helpers',
  "const exactSubset = (r,key,subset) => sameStrings(normalizeMulti(Array.isArray(r.selection?.[key]) ? r.selection[key] : []), subset);",
  `const exactSubset = (r,key,subset) => sameStrings(normalizeMulti(Array.isArray(r.selection?.[key]) ? r.selection[key] : []), subset);
const sameValue=(a,b)=>Object.is(a,b)||String(a)===String(b);
function constructionFromSelectorV61(selector,fallback=null){
  const raw=selector?.construction;
  if(typeof raw==='string')return raw;
  const values=raw?.$in;
  if(Array.isArray(values)&&values.length===1)return values[0];
  if(Array.isArray(values)&&values.includes(fallback))return fallback;
  return fallback;
}
function preparedSizeMetadataV61(module,value){
  const constructionDef=(module.specificationDefinitions??[]).find((def)=>def.key==='construction');
  const fallback=constructionDef?.defaultValue??null;
  const sizeRow=(module.allowedValues??[]).find((row)=>row.specificationKey==='size'&&sameValue(row.value,value));
  if(!sizeRow)return null;
  const metadata={...(sizeRow.metadata??{})};
  const sourceConstruction=sizeRow.selector?.construction;
  if(sourceConstruction!==undefined){
    metadata.internalConstructionSelector=metadata.internalConstructionSelector??sourceConstruction;
    metadata.derivedConstruction=metadata.derivedConstruction??constructionFromSelectorV61({construction:sourceConstruction},fallback);
  }
  return {row:sizeRow,metadata,fallback};
}
function derivedConstructionForSizeV61(module,value){
  const prepared=preparedSizeMetadataV61(module,value);
  if(!prepared)return null;
  const {metadata,fallback}=prepared;
  const explicit=metadata.derivedConstruction??metadata.construction??metadata.constructionSource;
  if(present(explicit)&&!String(explicit).includes('・'))return String(explicit);
  return constructionFromSelectorV61({construction:metadata.internalConstructionSelector},explicit??fallback)??explicit??fallback??null;
}
function selectorKeysDeepV61(selector,out=new Set()){
  if(!selector||typeof selector!=='object')return out;
  if(Array.isArray(selector)){for(const one of selector)selectorKeysDeepV61(one,out);return out;}
  for(const [key,value] of Object.entries(selector)){
    if(!['any','anyOf','all','allOf','not'].includes(key)&&!key.startsWith('$'))out.add(key);
    selectorKeysDeepV61(value,out);
  }
  return out;
}
function collectSelectorObjectsV61(node,out=[]){
  if(!node||typeof node!=='object')return out;
  if(Array.isArray(node)){for(const one of node)collectSelectorObjectsV61(one,out);return out;}
  for(const [key,value] of Object.entries(node)){
    if((key==='selector'||key==='when')&&value&&typeof value==='object')out.push(value);
    collectSelectorObjectsV61(value,out);
  }
  return out;
}
function relevantSizeMetadataKeysV61(module){
  const sizeRows=(module.allowedValues??[]).filter((row)=>row.specificationKey==='size');
  const metadataKeys=new Set();
  for(const row of sizeRows){
    const prepared=preparedSizeMetadataV61(module,row.value);
    for(const key of Object.keys(prepared?.metadata??{}))metadataKeys.add(key);
  }
  const selectorKeys=new Set();
  for(const selector of collectSelectorObjectsV61(module))for(const key of selectorKeysDeepV61(selector))selectorKeys.add(key);
  return [...metadataKeys].filter((key)=>selectorKeys.has(key)).sort();
}
function collectSizeSelectorRefsV61(node,path=[],out=[]){
  if(!node||typeof node!=='object')return out;
  if(Array.isArray(node)){node.forEach((child,index)=>collectSizeSelectorRefsV61(child,[...path,index],out));return out;}
  for(const [key,value] of Object.entries(node)){
    if((key==='selector'||key==='when')&&selectorMentions(value,'size'))out.push([...path,key].join('.'));
    collectSizeSelectorRefsV61(value,[...path,key],out);
  }
  return out;
}
function sizeProjectionAuditV61(module){
  const refs=[];
  for(const def of module.specificationDefinitions??[])if(def.key!=='size'&&selectorMentions(def.selector,'size'))refs.push({kind:'definition',id:def.id??def.key,target:def.key});
  for(const row of module.allowedValues??[])if(row.specificationKey!=='size'&&selectorMentions(row.selector,'size'))refs.push({kind:'allowed_value',id:row.id??null,target:row.specificationKey});
  for(const row of module.requiredFieldRules??[])if(row.specificationKey!=='size'&&selectorMentions(row.selector,'size'))refs.push({kind:'required_rule',id:row.id??null,target:row.specificationKey});
  for(const dep of module.dependencies??[]){const target=dep.targetField??dep.effect?.key??null;if(target!=='size'&&selectorMentions(dep.when,'size'))refs.push({kind:'dependency',id:dep.id??dep.rule_id??null,target});}
  const nested=(module.ruleSets??[]).flatMap((set,index)=>collectSizeSelectorRefsV61(set,['ruleSets',index])).filter(Boolean);
  const relevant_metadata_keys=relevantSizeMetadataKeysV61(module);
  return {direct_downstream_refs:refs,nested_rule_set_refs:nested,relevant_metadata_keys};
}
function sizeProjectionClassesV61(module,field,relevantKeys){
  const groups=new Map();
  for(const choice of enabled(field)){
    const prepared=preparedSizeMetadataV61(module,choice.value);
    const construction=derivedConstructionForSizeV61(module,choice.value);
    if(!prepared||!construction)throw Object.assign(new Error('size behavior metadata missing'),{code:'SAMOS2H_SIZE_METADATA_PROJECTION_SOURCE_MISSING',value:choice.value});
    const fingerprint={construction,...Object.fromEntries(relevantKeys.map((key)=>[key,prepared.metadata[key]??null]))};
    const fingerprintKey=stableJson(fingerprint);
    const group=groups.get(fingerprintKey)??{fingerprint,representative:choice.value,weight:0,values:[]};
    group.weight+=1;group.values.push(String(choice.value));groups.set(fingerprintKey,group);
  }
  const classes=[...groups.values()].sort((a,b)=>stableJson(a.fingerprint).localeCompare(stableJson(b.fingerprint)));
  const total=classes.reduce((sum,row)=>sum+row.weight,0);
  if(total!==enabled(field).length)throw Object.assign(new Error('size metadata projection weight mismatch'),{code:'SAMOS2H_SIZE_METADATA_PROJECTION_WEIGHT_MISMATCH',total,expected:enabled(field).length});
  return classes;
}`,
);

replaceOnce(
  'projection counters',
  "  let calls=1,states=0,hits=0,maxDepth=0,blocker=null,terminalAuditHits=0,terminalAuditMisses=0,terminalAuditChecks=0;\n  const memo=new Map(),inProgress=new Set(),terminalAuditCache=new Map();",
  `  let calls=1,states=0,hits=0,maxDepth=0,blocker=null,terminalAuditHits=0,terminalAuditMisses=0,terminalAuditChecks=0;
  let sizeProjectionContextCount=0,sizeProjectionLogicalValueCount=0,sizeProjectionClassCount=0;
  const sizeProjectionEvidence=[];
  const sizeProjectionAudit=sizeProjectionAuditV61(module);
  const memo=new Map(),inProgress=new Set(),terminalAuditCache=new Map();`,
);

replaceOnce(
  'metadata weighted size branch',
  "    if(f.dataType==='MULTI_ENUM' && enabled(f).length>MAX_MULTI){ blocker={status:'NONTERMINAL_MULTI_ENUM_TOO_LARGE',field:f.key,candidate_count:enabled(f).length,states,calls}; inProgress.delete(key); return null; }\n    const branches=f.dataType==='MULTI_ENUM'?[...multiBranches(f)]:scalarBranches(f);",
  `    if(f.dataType==='MULTI_ENUM' && enabled(f).length>MAX_MULTI){ blocker={status:'NONTERMINAL_MULTI_ENUM_TOO_LARGE',field:f.key,candidate_count:enabled(f).length,states,calls}; inProgress.delete(key); return null; }
    if(row.id==='SER-LIX-SAMOS2H'&&f.key==='size'&&result.selection?.size_mode!=='CUSTOM'){
      try{
        if(sizeProjectionAudit.direct_downstream_refs.length||sizeProjectionAudit.nested_rule_set_refs.length){
          throw Object.assign(new Error('source contains unsupported direct size downstream references'),{code:'SAMOS2H_SIZE_METADATA_PROJECTION_SOURCE_SHAPE_UNSUPPORTED',detail:sizeProjectionAudit});
        }
        const classes=sizeProjectionClassesV61(module,f,sizeProjectionAudit.relevant_metadata_keys);
        const branchUnits=classes.length+(f.required?0:1);
        if(calls+branchUnits>MAX_CALLS){blocker={status:'RESOLVER_CALL_LIMIT_REACHED',states,calls,next_field:f.key,candidate_count:branchUnits,projection:'SIZE_METADATA_BEHAVIOR_CLASS'};inProgress.delete(key);return null;}
        sizeProjectionContextCount+=1;
        sizeProjectionLogicalValueCount+=enabled(f).length;
        sizeProjectionClassCount+=classes.length;
        sizeProjectionEvidence.push({context_hash:hash({selection:result.selection,field:fieldSig(f)}),logical_value_count:enabled(f).length,class_count:classes.length,relevant_metadata_keys:sizeProjectionAudit.relevant_metadata_keys,classes:classes.map((one)=>({fingerprint:one.fingerprint,representative:one.representative,weight:one.weight,values_digest:hash(one.values)}))});
        let terminal=0n,custom=0n;
        if(!f.required){
          const branch={kind:'UNSET'};
          const child=await resolveRuntimeAppProduct(row.id,apply(result.selection,f,branch));calls++;
          if(survives(child,f,branch)&&!invalid(child)){
            const cc=await count(child,childDone(done,f.key,child),depth+1);if(!cc){inProgress.delete(key);return null;}terminal+=cc.terminal;custom+=cc.custom;
          }
        }
        for(const group of classes){
          const branch={kind:'VALUE',value:group.representative};
          const child=await resolveRuntimeAppProduct(row.id,apply(result.selection,f,branch));calls++;
          if(!survives(child,f,branch)||invalid(child))continue;
          const actualConstruction=String(child.internalSelection?.construction??'');
          if(actualConstruction!==String(group.fingerprint.construction)){
            throw Object.assign(new Error('representative construction mismatch'),{code:'SAMOS2H_SIZE_METADATA_PROJECTION_RUNTIME_MISMATCH',detail:{expected:group.fingerprint.construction,actual:actualConstruction,representative:group.representative}});
          }
          const cc=await count(child,childDone(done,f.key,child),depth+1);if(!cc){inProgress.delete(key);return null;}
          const weight=BigInt(group.weight);terminal+=cc.terminal*weight;custom+=cc.custom*weight;
        }
        const counts={terminal,custom};memo.set(key,{counts,signature:sig,size_metadata_projection:true});inProgress.delete(key);return counts;
      }catch(error){blocker={status:error.code??'SAMOS2H_SIZE_METADATA_PROJECTION_FAILED',field:f.key,message:error.message,states,calls,detail:error.detail??error.value??null};inProgress.delete(key);return null;}
    }
    const branches=f.dataType==='MULTI_ENUM'?[...multiBranches(f)]:scalarBranches(f);`,
);

const modelCount=(source.match(/SAMOS_RESOLVER_CONTRACT_CONFLICT_GRAPH_V4/g)??[]).length;
if(modelCount<2)throw new Error(`V6.1 count-model anchors too few: ${modelCount}`);
source=source.replaceAll('SAMOS_RESOLVER_CONTRACT_CONFLICT_GRAPH_V4','SAMOS2H_RESOLVER_CONTRACT_SIZE_METADATA_PROJECTION_V6_1');

replaceOnce(
  'projection evidence fields',
  "    terminal_audit_cache_size:terminalAuditCache.size,terminal_audit_cache_hits:terminalAuditHits,terminal_audit_cache_misses:terminalAuditMisses,terminal_audit_checks:terminalAuditChecks,",
  "    terminal_audit_cache_size:terminalAuditCache.size,terminal_audit_cache_hits:terminalAuditHits,terminal_audit_cache_misses:terminalAuditMisses,terminal_audit_checks:terminalAuditChecks,size_projection_context_count:sizeProjectionContextCount,size_projection_logical_value_count:sizeProjectionLogicalValueCount,size_projection_class_count:sizeProjectionClassCount,size_projection_digest:hash(sizeProjectionEvidence),size_projection_audit:sizeProjectionAudit,size_projection_evidence:sizeProjectionEvidence,",
);

await writeFile(GENERATED,source,'utf8');
const child=spawn(process.execPath,[GENERATED.pathname],{stdio:'inherit',env:process.env});
const exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>signal?reject(new Error(`Samos2H V6.1 killed by ${signal}`)):resolve(code??1));});
process.exitCode=exitCode;
