import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { THERMOSL_MODULE } from '../src/catalog/modules/thermosl-module.mjs';
import { THERMOSL_SOURCE } from '../src/catalog/modules/thermosl-source.mjs';
import { buildThermosLRuntimePackage, writeThermosLRuntimePackage } from '../scripts/build-thermosl-runtime-package-v07.mjs';

const AUTHORING_SHA='cd6844218fcf0150a16cbbfa947f391aa08f5449b82ba6fc2249ccdb6894c3d3';

test('Thermos L v0.7 Runtime package binds exactly to current formal Authoring Master v1.9 projection',()=>{
  const {packageObject}=buildThermosLRuntimePackage();
  assert.equal(packageObject.manufacturer,'LIXIL');
  assert.equal(packageObject.series,'サーモスL');
  assert.equal(packageObject.package_version,'v0.7');
  assert.equal(packageObject.product_id,'SER-LIX-SAMOSL');
  assert.equal(packageObject.authoring_binding.file_id,'17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL');
  assert.equal(packageObject.authoring_binding.sha256,AUTHORING_SHA);
  assert.equal(packageObject.authoring_binding.revision_id,'0B1PsqngSohhlZVhYaTVRdUNPRFp4ZVB5Y05IdnJNYXI4YTlZPQ');
  assert.equal(THERMOSL_SOURCE.runtimeRegeneration.version,'v1.9');
});

test('Runtime package is an exact JSON serialization of the current app-consumable Thermos L module',()=>{
  const {packageObject}=buildThermosLRuntimePackage();
  assert.deepEqual(packageObject.product_module,JSON.parse(JSON.stringify(THERMOSL_MODULE)));
});

test('Runtime package preserves exact formal standard-size inventories and IDs',()=>{
  const {packageObject}=buildThermosLRuntimePackage();
  const rows=packageObject.product_module.standardSizeRecords;
  assert.equal(rows.length,1644);
  assert.equal(rows.filter((row)=>row.selectable!==false&&row.status!=='INACTIVE').length,1495);
  assert.equal(new Set(rows.map((row)=>row.id)).size,1644);
  assert.ok(rows.some((row)=>row.id==='SZ-SL-001644'));
});

test('Runtime package preserves all 17 active window types, 50 custom rules and 29 Golden Tests',()=>{
  const {packageObject}=buildThermosLRuntimePackage();
  const module=packageObject.product_module;
  const windowTypes=module.allowedValues.filter((row)=>row.specificationKey==='window_type');
  const dimensionRules=module.ruleSets.find((row)=>row.type==='DIMENSION_RULES')?.payload??[];
  assert.equal(windowTypes.length,17);
  assert.equal(dimensionRules.length,50);
  assert.equal(module.goldenTests.length,29);
});

test('Runtime package keeps CR-SL-036 and graph/compound rules fail-closed',()=>{
  const {packageObject}=buildThermosLRuntimePackage();
  const rules=packageObject.product_module.ruleSets.find((row)=>row.type==='DIMENSION_RULES').payload;
  const cr=rules.find((row)=>row.id==='CR-SL-036');
  assert.ok(cr);
  assert.equal(cr.type,'COMPOUND_GATE');
  assert.equal(cr.automatic,false);
  assert.equal(cr.result,'REVIEW_REQUIRED');
  assert.deepEqual(cr.points,[[240,350],[240,943],[815,943],[815,755],[870,755],[870,500],[1690,500],[1690,350]]);
  for(const row of rules.filter((rule)=>rule.type==='COMPOUND_GATE'||rule.type==='SOURCE_GRAPH_GATE')){
    assert.equal(row.automatic,false,row.id);
    assert.equal(row.result,'REVIEW_REQUIRED',row.id);
  }
});

test('Runtime package writer emits exactly two Runtime package JSON files plus QA record',()=>{
  const dir=mkdtempSync(join(tmpdir(),'thermosl-runtime-v07-'));
  const qa=writeThermosLRuntimePackage(dir);
  const runtime=JSON.parse(readFileSync(join(dir,'LIXIL_サーモスL_runtime_v0.7.json'),'utf8'));
  const schema=JSON.parse(readFileSync(join(dir,'thermosl_runtime_package.schema.json'),'utf8'));
  const audit=JSON.parse(readFileSync(join(dir,'runtime_package_qa.json'),'utf8'));
  assert.equal(qa.status,'PASS');
  assert.equal(qa.runtime_file_count,2);
  assert.equal(runtime.qa_summary.status,'PASS');
  assert.equal(schema.properties.standardSizeRecords,undefined);
  assert.equal(schema.properties.product_module.properties.standardSizeRecords.minItems,1644);
  assert.equal(audit.status,'PASS');
  assert.equal(audit.authoring_sha256,AUTHORING_SHA);
});
