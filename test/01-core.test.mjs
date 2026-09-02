import test from'node:test';import assert from'node:assert/strict';
import{createCatalog,catalogInventory,validateCatalog}from'../src/catalog/catalog-adapter.mjs';
import{CURRENT_WINDOW_SERIES_MODULES}from'../src/catalog/modules/current-window-series.mjs';
import{getAllowedValues}from'../src/catalog/catalog-resolver.mjs';
import{assertIntegrity,assertCommonArchitecture}from'./core-gates.mjs';
const c=createCatalog(CURRENT_WINDOW_SERIES_MODULES),p='SER-LIX-SAMOS2H',inv=()=>catalogInventory(c).find(x=>x.productId===p);
test('01 four products use one catalog',()=>assert.equal(c.products.length,4));
test('02 S2H inventory preserves formal size shape while common sales presentation adds Frost confirmation',()=>assert.deepEqual(inv(),{
  productId:p,manufacturer:'LIXIL',series:'サーモスⅡ-H',definitions:27,allowedValues:2445,
  requiredRules:26,ruleSets:3,dependencies:26,evidence:13,
  standardSizeRows:2297,selectableSizeRows:2131,inactiveSizeRows:166,missingSizeRows:0,extraSizeRows:0,sizeCoverage:1,
  sourceInventory:{activeWindows:17,standardSizeRows:2297,selectableSizeRows:2131,inactiveSizeRows:166}
}));
test('03 canonical v0.7 source is retained',()=>{const s=c.products.find(x=>x.id===p).source;assert.equal(s.id,'1zHi-XsMqJp0MKH-sDoTcnTqkLMGcuRdo');assert.equal(s.version,'v0.7');assert.equal(s.folder,'01_正本');});
test('04 active windows are exactly 17',()=>assert.equal(c.allowedValues.filter(x=>x.productId===p&&x.specificationKey==='window_type').length,17));
test('05 selectable real sizes are exactly 2131',()=>assert.equal(c.allowedValues.filter(x=>x.productId===p&&x.specificationKey==='size').length,2131));
test('06 dusk gray limits interior colors to black/precious white',()=>assert.deepEqual(getAllowedValues(c,p,'interior_color',{exterior_color:'EXT-H'}).map(x=>x.value).sort(),['INT-F','INT-M']));
test('07 evidence, required and AUTO dependency references are intact',()=>assertIntegrity(c,p));
test('08 common adapter/resolver/UI have no product or window tokens',async()=>{validateCatalog(c);await assertCommonArchitecture();});
