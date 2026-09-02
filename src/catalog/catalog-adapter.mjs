import{COLLECTIONS,ROLE_ALIASES,resolveSheetRole}from'./catalog-roles.mjs';
import{validateCatalogModule,validateCatalog}from'./catalog-validation.mjs';
import{sizeCoverage}from'./size-resolver.mjs';
import{applySashSalesInputContract}from'./sash-sales-input-contract.mjs';

export function installCatalogModule(module,catalog){
  validateCatalogModule(module);
  const installed=applySashSalesInputContract(module);
  catalog.products.push(installed.product);
  for(const key of COLLECTIONS)catalog[key].push(...(installed[key]??[]));
  return catalog;
}

export function createCatalog(modules=[]){
  const catalog={products:[],...Object.fromEntries(COLLECTIONS.map((key)=>[key,[]]))};
  for(const module of modules)installCatalogModule(module,catalog);
  validateCatalog(catalog);
  return catalog;
}

export function catalogInventory(catalog){
  return catalog.products.map((product)=>{
    const matches=(row)=>row.productId===product.id;
    const sets=catalog.ruleSets.filter(matches);
    const dimensionRules=sets.filter((row)=>row.type==='DIMENSION_RULES').reduce((n,row)=>n+(Array.isArray(row.payload)?row.payload.length:(row.payload?.rules?.length??0)),0);
    const coverage=sizeCoverage(catalog,product.id);
    const base={
      productId:product.id,manufacturer:product.manufacturer,series:product.displayName,
      definitions:catalog.specificationDefinitions.filter(matches).length,
      allowedValues:catalog.allowedValues.filter(matches).length,
      requiredRules:catalog.requiredFieldRules.filter(matches).length,
      ruleSets:sets.length,dependencies:catalog.dependencies.filter(matches).length,
      evidence:catalog.evidence.filter(matches).length,
      standardSizeRows:coverage.standardSizeRows,
      selectableSizeRows:coverage.selectableSizeRows,
      inactiveSizeRows:coverage.inactiveSizeRows,
      missingSizeRows:coverage.missing,
      extraSizeRows:coverage.extra,
      sizeCoverage:coverage.coverage
    };
    return{...base,...(dimensionRules?{dimensionRules}:{}),...(product.sourceInventory?{sourceInventory:product.sourceInventory}:{})};
  });
}

export{ROLE_ALIASES,resolveSheetRole,validateCatalogModule,validateCatalog};
