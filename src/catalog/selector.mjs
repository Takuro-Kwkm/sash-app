import{empty,opMatch}from'./selector-ops.mjs';
function meta(selection,context){const out={};for(const[key,val]of Object.entries(selection)){const map=context.valueMetadata?.[key];for(const one of(Array.isArray(val)?val:[val]))Object.assign(out,map?.get(one)??{});}return out;}
function actual(key,selection,context){if(key==='productId')return context.productId;if(!empty(selection[key]))return selection[key];return meta(selection,context)[key];}
export function selectorValue(key,selection={},context={}){return actual(key,selection,context);}
export function selectorMatches(selector,selection={},context={}){if(!selector||!Object.keys(selector).length)return true;const any=selector.any??selector.anyOf;if(any&&!any.some(s=>selectorMatches(s,selection,context)))return false;const all=selector.all??selector.allOf;if(all&&!all.every(s=>selectorMatches(s,selection,context)))return false;if(selector.not&&selectorMatches(selector.not,selection,context))return false;for(const[key,expected]of Object.entries(selector)){if(['any','anyOf','all','allOf','not'].includes(key))continue;const a=actual(key,selection,context);if(empty(a)&&!(expected&&typeof expected==='object'&&'$exists'in expected))return false;if(!opMatch(a,expected))return false;}return true;}
export function selectorMayMatch(selector,selection={},context={}){
  if(!selector||!Object.keys(selector).length)return true;
  const any=selector.any??selector.anyOf;
  if(any&&!any.some((candidate)=>selectorMayMatch(candidate,selection,context)))return false;
  const all=selector.all??selector.allOf;
  if(all&&!all.every((candidate)=>selectorMayMatch(candidate,selection,context)))return false;
  if(selector.not&&selectorMatches(selector.not,selection,context))return false;
  for(const[key,expected]of Object.entries(selector)){
    if(['any','anyOf','all','allOf','not'].includes(key))continue;
    const value=actual(key,selection,context);
    if(empty(value))continue;
    if(!opMatch(value,expected))return false;
  }
  return true;
}
const candidatesFor=(expected)=>{
  if(typeof expected==='string'||typeof expected==='number'||typeof expected==='boolean')return[expected];
  if(expected&&typeof expected==='object'&&Array.isArray(expected.$in))return expected.$in;
  return[];
};
export function selectorMatchesWithInternalDefaults(selector,selection={},context={},internalKeys=['construction']){
  if(selectorMatches(selector,selection,context))return true;
  if(!selector||!Object.keys(selector).length)return true;
  let candidates=[{...selection}];
  for(const key of internalKeys){
    if(!empty(actual(key,selection,context)))continue;
    const values=candidatesFor(selector[key]);
    if(!values.length)continue;
    candidates=candidates.flatMap((candidate)=>values.map((value)=>({...candidate,[key]:value})));
  }
  return candidates.some((candidate)=>selectorMatches(selector,candidate,context));
}
export function buildCatalogContext(catalog,productId){const valueMetadata={};for(const row of catalog.allowedValues.filter(x=>x.productId===productId)){valueMetadata[row.specificationKey]??=new Map();if(!valueMetadata[row.specificationKey].has(row.value))valueMetadata[row.specificationKey].set(row.value,row.metadata??{});}for(const row of(catalog.standardSizeRecords??[]).filter(x=>x.productId===productId)){valueMetadata.size??=new Map();if(!valueMetadata.size.has(row.id))valueMetadata.size.set(row.id,{...(row.metadata??{}),actualW:row.actualW,actualH:row.actualH,callW:row.nominalW,callH:row.nominalH,callCode:row.sizeCode,construction:row.construction,windowClass:row.windowClass,frameType:row.frameType,configuration:row.configuration});}return{catalog,productId,valueMetadata};}
