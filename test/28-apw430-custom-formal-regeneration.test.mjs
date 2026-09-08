import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {APW430_MODULE,APW430_DIMENSION_RULES} from '../src/catalog/modules/apw430-module.mjs';
import {APW430_RUNTIME_FORMAL_DIMENSION_DELTA_V10} from '../src/catalog/modules/apw430-runtime-formal-dimension-delta-v10.mjs';

const read=(relative)=>JSON.parse(fs.readFileSync(new URL(`../${relative}`,import.meta.url),'utf8'));

test('APW430 v1.0 Runtime is regenerated from formal 06C CUSTOM Master',()=>{
  assert.equal(APW430_RUNTIME_FORMAL_DIMENSION_DELTA_V10.version,'v1.0');
  assert.equal(APW430_RUNTIME_FORMAL_DIMENSION_DELTA_V10.formalMaster.sheet,'06C_特注寸法範囲');
  assert.equal(APW430_RUNTIME_FORMAL_DIMENSION_DELTA_V10.formalMaster.driveRevisionId,'13');
  assert.equal(APW430_RUNTIME_FORMAL_DIMENSION_DELTA_V10.formalSemanticFingerprint,'sha256:1940a1ce7b768ccd2cc0fa1f44ebc1e3ba65e26c40089d618b0b837607ae6966');
  assert.equal(APW430_DIMENSION_RULES.length,25);
  assert.equal(APW430_DIMENSION_RULES.filter((row)=>row.type==='COMPOUND_GATE').length,20);
  assert.equal(APW430_DIMENSION_RULES.filter((row)=>row.type==='SOURCE_GRAPH_GATE').length,5);
  assert.equal(APW430_DIMENSION_RULES.filter((row)=>row.automatic).length,0);
  assert.ok(APW430_DIMENSION_RULES.every((row)=>row.selector.size_mode==='CUSTOM'));
});

test('APW430 module exposes CUSTOM inputs without changing STANDARD inventory',()=>{
  assert.equal(APW430_MODULE.standardSizeRecords.length,718);
  assert.equal(APW430_MODULE.stats.dimensionRules,25);
  assert.equal(APW430_MODULE.stats.dimensionAuto,0);
  assert.equal(APW430_MODULE.stats.dimensionReview,25);
  const sizeModes=APW430_MODULE.allowedValues.filter((row)=>row.specificationKey==='size_mode').map((row)=>row.value);
  assert.deepEqual(sizeModes,['STANDARD','CUSTOM']);
  const width=APW430_MODULE.specificationDefinitions.find((row)=>row.key==='custom_width');
  const height=APW430_MODULE.specificationDefinitions.find((row)=>row.key==='custom_height');
  assert.equal(width.dataType,'NUMBER');assert.deepEqual(width.selector,{size_mode:'CUSTOM'});
  assert.equal(height.dataType,'NUMBER');assert.deepEqual(height.selector,{size_mode:'CUSTOM'});
});

test('APW430 production/readback and Runtime regeneration records preserve safety invariants',()=>{
  const production=read('data/master-change-control/production/PMCP-YKK-APW430-CUSTOM-DIMENSION-RULESET-20260903-001.applied.json');
  const runtime=read('data/master-change-control/runtime/APW430_CUSTOM_RUNTIME_REGENERATION_V10.json');
  assert.equal(production.status,'PRODUCTION_APPLY_COMPLETE');
  assert.equal(production.formalTarget.postWriteDriveRevisionId,'13');
  assert.equal(production.postWriteReadback.dimensionRuleCount,25);
  assert.equal(production.postWriteReadback.automaticTrue,0);
  assert.equal(production.postWriteReadback.automaticFalse,25);
  assert.equal(production.postWriteReadback.unexpectedChangedExistingSheets,0);
  assert.equal(production.write.standardSizeMasterChanged,false);
  assert.equal(runtime.status,'RUNTIME_REGENERATION_COMMITTED');
  assert.equal(runtime.sourceOfTruth,'FORMAL_PRODUCT_MASTER');
  assert.equal(runtime.runtimeProjection.dimensionRuleCount,25);
  assert.equal(runtime.runtimeProjection.finalAutoPassAllowed,false);
  assert.equal(runtime.runtimeProjection.interpolatedPointsAdded,false);
  assert.equal(runtime.runtimeProjection.directManufacturerValueEditToGenericCore,false);
  assert.deepEqual(runtime.standardInventory,{'SER-LIX-SAMOS2H':2131,'SER-LIX-SAMOSL':1495,'SER-YKK-APW430':718,'SER-YKK-APW431':538});
});

test('APW430-specific manufacturer values do not enter generic dimension resolver',()=>{
  const core=fs.readFileSync(new URL('../src/catalog/dimension-resolver.mjs',import.meta.url),'utf8');
  for(const token of ['SER-YKK-APW430','SWT-YKK-APW430','CR-APW430','XAAAA-H26-075S1'])assert.equal(core.includes(token),false);
});
