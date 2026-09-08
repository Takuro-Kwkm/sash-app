import{selectorMatches,buildCatalogContext}from'./selector.mjs';
export const depMode=d=>d.mode??d.evaluation;
export const depAction=d=>d.effect?.type??d.action;
function targetHit(d,row){if(d.targetField!==row.specificationKey)return false;if(d.targetValue!==undefined)return row.value===d.targetValue;if(d.targetValuePrefix)return String(row.value).startsWith(d.targetValuePrefix);return false;}
function denied(catalog,productId,row,selection,context){for(const d of catalog.dependencies.filter(x=>x.productId===productId&&depMode(x)==='AUTO')){if(!selectorMatches(d.when,selection,context)||!targetHit(d,row))continue;if(['deny_candidate','DENY_CANDIDATE'].includes(depAction(d)))return true;}return false;}
function dedupe(rows){const m=new Map();for(const r of rows)if(!m.has(r.value))m.set(r.value,r);return[...m.values()].sort((a,b)=>(a.displayOrder??9999)-(b.displayOrder??9999)||String(a.displayLabel).localeCompare(String(b.displayLabel),'ja'));}
export function getAllowedValues(catalog,productId,key,selection={},context=buildCatalogContext(catalog,productId)){return dedupe(catalog.allowedValues.filter(row=>row.productId===productId&&row.specificationKey===key&&row.status!=='INACTIVE'&&selectorMatches(row.selector,selection,context)&&!denied(catalog,productId,row,selection,context)));}
export function definitions(catalog,productId,selection,context){return catalog.specificationDefinitions.filter(r=>r.productId===productId&&r.status!=='INACTIVE'&&selectorMatches(r.selector,selection,context)).sort((a,b)=>(a.displayOrder??9999)-(b.displayOrder??9999));}
