import test from'node:test';
import assert from'node:assert/strict';
import{createCatalog,catalogInventory}from'../src/catalog/catalog-adapter.mjs';
import{stabilizeSelection}from'../src/catalog/catalog-resolver.mjs';
import{CURRENT_WINDOW_SERIES_MODULES}from'../src/catalog/modules/current-window-series.mjs';
import{THERMOSL_SOURCE}from'../src/catalog/modules/thermosl-source.mjs';
import{THERMOSL_RUNTIME_FORMAL_DELTA_V18}from'../src/catalog/modules/thermosl-runtime-formal-delta-v18.mjs';
import{THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS}from'../src/product-master-core/products/thermosl/manual-shutter-standard-size-evidence.mjs';

const PRODUCT_ID='SER-LIX-SAMOSL';
const catalog=createCatalog(CURRENT_WINDOW_SERIES_MODULES);
const manualRuntime=THERMOSL_SOURCE.sizes.filter((row)=>row.active&&row.window==='WT-SL-SHUTTER-HIKI'&&row.spec==='SP-SL-SHUT-M-STD');
const key=(row)=>`${row.construction}|${row.callCode??row.sizeCode}`;

test('v1.8 runtime is bound to the exact post-production formal Master revision and SHA',()=>{
  assert.equal(THERMOSL_RUNTIME_FORMAL_DELTA_V18.formalMaster.driveFileId,'17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL');
  assert.equal(THERMOSL_RUNTIME_FORMAL_DELTA_V18.formalMaster.revisionId,'0B1PsqngSohhlRDByanJSNkxtSlpqdVo0WXBRT01MNDIzM2tNPQ');
  assert.equal(THERMOSL_RUNTIME_FORMAL_DELTA_V18.formalMaster.sha256,'664a51bd5b9ded22e19780b1ce339338cba45f292438221b0a60fc3974e1abf9');
  assert.equal(THERMOSL_SOURCE.master.revisionId,THERMOSL_RUNTIME_FORMAL_DELTA_V18.formalMaster.revisionId);
  assert.equal(THERMOSL_SOURCE.master.sha256,THERMOSL_RUNTIME_FORMAL_DELTA_V18.formalMaster.sha256);
});

test('v1.8 runtime inventory is exactly formal 1644 / selectable 1495 with 85 approved additions',()=>{
  assert.equal(THERMOSL_RUNTIME_FORMAL_DELTA_V18.sizes.length,85);
  assert.equal(THERMOSL_SOURCE.sizes.length,1644);
  assert.equal(THERMOSL_SOURCE.sizes.filter((row)=>row.active).length,1495);
  const inventory=catalogInventory(catalog).find((row)=>row.productId===PRODUCT_ID);
  assert.equal(inventory.standardSizeRows,1644);
  assert.equal(inventory.selectableSizeRows,1495);
  assert.equal(inventory.missingSizeRows,0);
  assert.equal(inventory.extraSizeRows,0);
  assert.equal(inventory.sizeCoverage,1);
});

test('v1.8 preserves old tail and adds exactly SZ-SL-001560 through SZ-SL-001644 without duplicate IDs',()=>{
  assert.ok(THERMOSL_SOURCE.sizes.some((row)=>row.id==='SZ-SL-001559'));
  assert.equal(THERMOSL_RUNTIME_FORMAL_DELTA_V18.sizes[0].id,'SZ-SL-001560');
  assert.equal(THERMOSL_RUNTIME_FORMAL_DELTA_V18.sizes.at(-1).id,'SZ-SL-001644');
  assert.equal(new Set(THERMOSL_SOURCE.sizes.map((row)=>row.id)).size,1644);
});

test('v1.8 manual standard official source and Runtime are exact 97-set equality',()=>{
  assert.equal(THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS.length,97);
  assert.equal(manualRuntime.length,97);
  const officialKeys=new Set(THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS.map(key));
  const runtimeKeys=new Set(manualRuntime.map(key));
  assert.equal(officialKeys.size,97);
  assert.equal(runtimeKeys.size,97);
  assert.deepEqual(runtimeKeys,officialKeys);
});

test('v1.8 manual standard construction split is 51 在来・204 plus 46 在来',()=>{
  assert.equal(manualRuntime.filter((row)=>row.construction==='在来・204').length,51);
  assert.equal(manualRuntime.filter((row)=>row.construction==='在来').length,46);
});

test('v1.8 generic Runtime resolver exposes all 97 formal manual-standard candidates without cross-product generation',()=>{
  let total=0;
  for(const[construction,expected]of[['在来・204',51],['在来',46]]){
    const result=stabilizeSelection(catalog,PRODUCT_ID,{window_type:'WT-SL-SHUTTER-HIKI',shutter_type:'SP-SL-SHUT-M-STD',size_mode:'STANDARD',construction});
    const size=result.fields.find((row)=>row.key==='size');
    assert.ok(size);
    assert.equal(size.values.length,expected,construction);
    assert.equal(new Set(size.values.map((row)=>row.value)).size,expected,construction);
    total+=size.values.length;
  }
  assert.equal(total,97);
});
