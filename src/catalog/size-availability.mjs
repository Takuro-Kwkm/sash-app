import{buildCatalogContext,selectorMayMatch}from'./selector.mjs';
import{standardSizeRecords}from'./size-resolver.mjs';

export function dimensionRules(catalog,productId){
  return catalog.ruleSets
    .filter((row)=>row.productId===productId&&row.type==='DIMENSION_RULES'&&row.status!=='INACTIVE')
    .flatMap((row)=>Array.isArray(row.payload)?row.payload:(row.payload?.rules??[]));
}

export function matchingStandardSizeRecords(catalog,productId,selection={},context=buildCatalogContext(catalog,productId)){
  const candidate={...selection,size_mode:'STANDARD'};
  return standardSizeRecords(catalog,productId).filter((row)=>selectorMayMatch(row.selector??{},candidate,context));
}

export function matchingDimensionRules(catalog,productId,selection={},context=buildCatalogContext(catalog,productId)){
  const candidate={...selection,size_mode:'CUSTOM'};
  return dimensionRules(catalog,productId).filter((rule)=>selectorMayMatch(rule.selector??{},candidate,context));
}

export function hasStandardSizes(catalog,productId,selection={},context=buildCatalogContext(catalog,productId)){
  return matchingStandardSizeRecords(catalog,productId,selection,context).length>0;
}

export function hasCustomDimensionRules(catalog,productId,selection={},context=buildCatalogContext(catalog,productId)){
  return matchingDimensionRules(catalog,productId,selection,context).length>0;
}

export function sizeModeAvailable(catalog,productId,value,selection={},context=buildCatalogContext(catalog,productId)){
  if(value==='STANDARD')return hasStandardSizes(catalog,productId,selection,context);
  if(value==='CUSTOM')return hasCustomDimensionRules(catalog,productId,selection,context);
  return true;
}
