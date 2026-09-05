import test from'node:test';import assert from'node:assert/strict';
import{createCatalog,catalogInventory,validateCatalog}from'../src/catalog/catalog-adapter.mjs';
import{CURRENT_WINDOW_SERIES_MODULES}from'../src/catalog/modules/current-window-series.mjs';
import{SAMOS2H_MODULE}from'../src/catalog/modules/samos2h-assembly.mjs';
import{getAllowedValues}from'../src/catalog/catalog-resolver.mjs';
import{assertIntegrity,assertCommonArchitecture}from'./core-gates.mjs';
const c=createCatalog(CURRENT_WINDOW_SERIES_MODULES),p='SER-LIX-SAMOS2H',inv=()=>catalogInventory(c).find(x=>x.productId===p);
test('01 four products use one catalog',()=>assert.equal(c.products.length,4));
test('02 S2H inventory preserves formal STANDARD size shape and adds controlled CUSTOM capability',()=>assert.deepEqual(inv(),{
  productId:p,manufacturer:'LIXIL',series:'サーモスⅡ-H',definitions:30,allowedValues:2457,
  requiredRules:29,ruleSets:4,dependencies:26,evidence:15,
  standardSizeRows:2309,selectableSizeRows:2140,inactiveSizeRows:169,missingSizeRows:0,extraSizeRows:0,sizeCoverage:1,dimensionRules:17,
  sourceInventory:{activeWindows:17,standardSizeRows:2309,selectableSizeRows:2140,inactiveSizeRows:169,dimensionRules:17,dimensionAuto:0,dimensionReview:17}
}));
test('03 canonical v0.7 base source lineage is retained while formal CUSTOM v1.0 and STANDARD v1.1 regeneration bind separately',()=>{const s=c.products.find(x=>x.id===p).source;assert.equal(s.id,'1zHi-XsMqJp0MKH-sDoTcnTqkLMGcuRdo');assert.equal(s.version,'v0.7');assert.equal(s.folder,'01_正本');assert.equal(SAMOS2H_MODULE.standardRuntimeRegeneration.version,'v1.1');assert.equal(SAMOS2H_MODULE.standardRuntimeRegeneration.formalMaster.sha256,'9d4a0812cadc6d804a8e8db77ad0e4b042d674e62b9ef9edfcd2afcab9c9e5a6');});
test('04 active windows are exactly 17',()=>assert.equal(c.allowedValues.filter(x=>x.productId===p&&x.specificationKey==='window_type').length,17));
test('05 selectable real sizes are exactly 2140',()=>assert.equal(c.allowedValues.filter(x=>x.productId===p&&x.specificationKey==='size').length,2140));
test('06 dusk gray limits interior colors to black/precious white',()=>assert.deepEqual(getAllowedValues(c,p,'interior_color',{exterior_color:'EXT-H'}).map(x=>x.value).sort(),['INT-F','INT-M']));
test('07 evidence, required and AUTO dependency references are intact',()=>assertIntegrity(c,p));
test('08 common adapter/resolver/UI have no product or window tokens',async()=>{validateCatalog(c);await assertCommonArchitecture();});
