import{selectorMatches,selectorMatchesWithInternalDefaults,buildCatalogContext}from'./selector.mjs';
import{sizeAllowedValues,standardSizeRecords}from'./size-resolver.mjs';
import{sizeModeAvailable,dimensionRules}from'./size-availability.mjs';
export const depMode=d=>d.mode??d.evaluation;
export const depAction=d=>d.effect?.type??d.action;
function targetHit(d,row){if(d.targetField!==row.specificationKey)return false;if(d.targetValue!==undefined)return row.value===d.targetValue;if(d.targetValuePrefix)return String(row.value).startsWith(d.targetValuePrefix);return false;}
function denied(catalog,productId,row,selection,context){for(const d of catalog.dependencies.filter(x=>x.productId===productId&&depMode(x)==='AUTO')){if(!selectorMatchesWithInternalDefaults(d.when,selection,context)||!targetHit(d,row))continue;if(['deny_candidate','DENY_CANDIDATE'].includes(depAction(d)))return true;}return false;}
function dedupe(rows){const m=new Map();for(const r of rows)if(!m.has(r.value))m.set(r.value,r);return[...m.values()].sort((a,b)=>(a.displayOrder??9999)-(b.displayOrder??9999)||String(a.displayLabel).localeCompare(String(b.displayLabel),'ja'));}
function canonicalSizeModeRows(catalog,productId){
  const existing=catalog.allowedValues.filter((row)=>row.productId===productId&&row.specificationKey==='size_mode');
  const byValue=new Map(existing.map((row)=>[row.value,row]));
  const standard=standardSizeRecords(catalog,productId);
  const custom=dimensionRules(catalog,productId);
  const fallbackEvidence=standard[0]?.evidenceIds??custom[0]?.evidenceIds??[];
  if(standard.length&&!byValue.has('STANDARD'))byValue.set('STANDARD',{
    id:`${productId}:generated:size_mode:STANDARD`,productId,specificationKey:'size_mode',value:'STANDARD',displayLabel:'規格サイズ',displayOrder:1,status:'ACTIVE',selector:{},evidenceIds:fallbackEvidence,metadata:{generatedBy:'SASH_SALES_INPUT_CONTRACT'}
  });
  if(custom.length&&!byValue.has('CUSTOM'))byValue.set('CUSTOM',{
    id:`${productId}:generated:size_mode:CUSTOM`,productId,specificationKey:'size_mode',value:'CUSTOM',displayLabel:'特注サイズ',displayOrder:2,status:'ACTIVE',selector:{},evidenceIds:fallbackEvidence,metadata:{generatedBy:'SASH_SALES_INPUT_CONTRACT'}
  });
  return[...byValue.values()];
}
export function getAllowedValues(catalog,productId,key,selection={},context=buildCatalogContext(catalog,productId)){
  const source=key==='size'&&catalog.standardSizeRecords?.some(row=>row.productId===productId)
    ?sizeAllowedValues(catalog,productId,selection,context)
    :key==='size_mode'?canonicalSizeModeRows(catalog,productId)
    :catalog.allowedValues.filter(row=>row.productId===productId&&row.specificationKey===key);
  return dedupe(source.filter(row=>row.status!=='INACTIVE'&&selectorMatchesWithInternalDefaults(row.selector,selection,context)&&!denied(catalog,productId,row,selection,context)&&(key!=='size_mode'||sizeModeAvailable(catalog,productId,row.value,selection,context))));
}
export function definitions(catalog,productId,selection,context){return catalog.specificationDefinitions.filter(r=>r.productId===productId&&r.status!=='INACTIVE'&&selectorMatchesWithInternalDefaults(r.selector,selection,context)).sort((a,b)=>(a.displayOrder??9999)-(b.displayOrder??9999));}
