import{mkdir,writeFile}from'node:fs/promises';
import{dirname,resolve}from'node:path';
import{createCatalog}from'../src/catalog/catalog-adapter.mjs';
import{matchingDimensionRules,matchingStandardSizeRecords}from'../src/catalog/size-availability.mjs';
import{CURRENT_WINDOW_SERIES_MODULES}from'../src/catalog/modules/current-window-series.mjs';

const output=resolve(process.argv[2]??'artifacts/sales-ui-r2/custom-availability-matrix.json');
const catalog=createCatalog(CURRENT_WINDOW_SERIES_MODULES);
const rows=[];
for(const product of catalog.products){
  const windows=catalog.allowedValues.filter((row)=>row.productId===product.id&&row.specificationKey==='window_type'&&row.status!=='INACTIVE');
  for(const window of windows){
    const selection={window_type:window.value};
    const standardRecords=matchingStandardSizeRecords(catalog,product.id,selection);
    const customRules=matchingDimensionRules(catalog,product.id,selection);
    rows.push({series:product.displayName,productId:product.id,windowType:window.displayLabel,windowTypeId:window.value,standardAvailable:standardRecords.length>0,customAvailable:customRules.length>0,matchingStandardRecords:standardRecords.length,matchingDimensionRules:customRules.length,dimensionRuleIds:customRules.map((rule)=>rule.id)});
  }
}
const report={generatedAt:new Date().toISOString(),summary:{activeWindows:rows.length,standardAvailable:rows.filter((row)=>row.standardAvailable).length,customAvailable:rows.filter((row)=>row.customAvailable).length,standardOnly:rows.filter((row)=>row.standardAvailable&&!row.customAvailable).length,ruleWithoutCustom:rows.filter((row)=>row.matchingDimensionRules>0&&!row.customAvailable).length,customWithoutRule:rows.filter((row)=>row.matchingDimensionRules===0&&row.customAvailable).length},rows};
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({output,...report.summary}));
