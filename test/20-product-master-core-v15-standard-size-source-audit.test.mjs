import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{auditStandardSizeSourceCoverage}from'../src/product-master-core/standard-size-source-audit.mjs';
import{runStandardSizeSourceAuditWorkflow}from'../src/product-master-core/standard-size-source-audit-runner.mjs';
import{REGISTERED_PRODUCT_MASTER_WORKFLOW_IDS,PRODUCT_MASTER_WORKFLOW_REGISTRY}from'../src/product-master-core/products/index.mjs';
import{THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS}from'../src/product-master-core/products/thermosl/manual-shutter-standard-size-evidence.mjs';
import{
  THERMOSL_CANONICAL_STANDARD_SIZE_RECORDS,THERMOSL_FORMAL_MASTER,THERMOSL_PRODUCT_ID
}from'../src/product-master-core/products/thermosl/workflow.mjs';

const runAudit=()=>auditStandardSizeSourceCoverage({
  productId:THERMOSL_PRODUCT_ID,
  sourceRecords:THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS,
  canonicalRecords:THERMOSL_CANONICAL_STANDARD_SIZE_RECORDS
});

test('v1.5 generic standard-size source audit Core contains no product/manufacturer token',()=>{
  for(const file of['src/product-master-core/standard-size-source-audit.mjs','src/product-master-core/standard-size-source-audit-runner.mjs']){
    const text=fs.readFileSync(file,'utf8');
    for(const token of['APW430','THERMOS','SAMOS','YKK','LIXIL'])assert.equal(text.includes(token),false,`${file} contains ${token}`);
  }
});

test('v1.5 registers Thermos L as the second generic Product Master workflow profile',()=>{
  assert.deepEqual(REGISTERED_PRODUCT_MASTER_WORKFLOW_IDS,['SER-YKK-APW430','SER-LIX-SAMOSL']);
  const profile=PRODUCT_MASTER_WORKFLOW_REGISTRY.require('SER-LIX-SAMOSL');
  assert.equal(profile.capabilities.standardSizeSourceAudit,true);
  assert.equal(profile.capabilities.formalWorkbookMutation,false);
  assert.equal(profile.capabilities.runtimeAutoWrite,false);
});

test('v1.5 Thermos L manual-standard official slice is exactly 97 explicit size records from printed p54-p61',()=>{
  assert.equal(THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS.length,97);
  assert.deepEqual([...new Set(THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS.map((row)=>row.source.printedPage))],[54,55,56,57,58,59,60,61]);
  assert.ok(THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS.every((row)=>row.source.pdfPage===row.source.printedPage+2));
  assert.ok(THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS.every((row)=>row.source.driveFileId==='1YUN-mtWYs48YBUHJk0C3vJXnhjyZFHyf'));
  assert.ok(THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS.every((row)=>row.specificationId==='SP-SL-SHUT-M-STD'&&row.availability==='AVAILABLE'));
});

test('v1.5 detects 85 official manual-standard sizes missing from the current formal Canonical Master despite the old 1410-row closed-loop PASS',()=>{
  assert.equal(THERMOSL_FORMAL_MASTER.selectableSizeRows,1410);
  assert.equal(THERMOSL_CANONICAL_STANDARD_SIZE_RECORDS.filter((row)=>row.selectable).length,1410);
  const audit=runAudit();
  assert.equal(audit.pass,true);
  assert.equal(audit.coveragePass,false);
  assert.equal(audit.status,'SOURCE_COVERAGE_GAP_DETECTED');
  assert.deepEqual(audit.counts,{
    officialAvailable:97,match:12,missingInCanonical:85,canonicalInactive:0,extraInCanonical:0,duplicateCanonicalKeys:0,canonicalInCoveredScope:12
  });
  assert.equal(audit.gates.OFFICIAL_SOURCE_SIZE_COVERAGE,'FAIL');
  const missing=new Set(audit.missing.map((row)=>row.sourceRecord.sizeCode));
  for(const code of['11409','16507','18009','25111-2','11918','16518','18018','25118-2','25118-4','34722'])assert.equal(missing.has(code),true,`${code} must be detected as missing`);
  for(const code of['17809','18313','17818','18322'])assert.equal(missing.has(code),false,`${code} is already present and must match`);
});

test('v1.5 audit persists a blocking source-gap report without modifying Workbook or Runtime',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sash-v15-size-source-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const result=runStandardSizeSourceAuditWorkflow({
    artifactDir:dir,productId:THERMOSL_PRODUCT_ID,
    sourceRecords:THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS,
    canonicalRecords:THERMOSL_CANONICAL_STANDARD_SIZE_RECORDS,
    sourceScopeLabel:'THERMOS_L_SHUTTER_MANUAL_STANDARD__PRINTED_P54_P61'
  });
  assert.equal(result.pass,true);
  assert.equal(result.coveragePass,false);
  assert.equal(result.report.status,'SOURCE_COVERAGE_GAP_DETECTED');
  assert.equal(result.report.missingInCanonical,85);
  assert.equal(result.report.gates.OFFICIAL_SOURCE_SIZE_COVERAGE,'FAIL');
  assert.equal(result.report.formalWorkbookWritePerformed,false);
  assert.equal(result.report.runtimeWritePerformed,false);
  assert.equal(result.report.autoMutationPerformed,false);
  assert.ok(fs.existsSync(path.join(dir,'standard-size-source-records.json')));
  assert.ok(fs.existsSync(path.join(dir,'standard-size-source-audit-report.json')));
});
