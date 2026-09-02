import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import{PRODUCT_MASTER_WORKFLOW_REGISTRY}from'../src/product-master-core/products/index.mjs';
import{createStandardSizeSourceGapChangeProposal}from'../src/product-master-core/standard-size-source-gap-proposal.mjs';
import{buildThermosLProductionPreview}from'../src/product-master-core/products/thermosl/production-preview.mjs';

const PRODUCT_ID='SER-LIX-SAMOSL';
const PROPOSAL_ID='PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001';
const snapshot=JSON.parse(fs.readFileSync('data/master-change-control/formal-snapshots/SER-LIX-SAMOSL_v0.7_20260902.json','utf8'));
const approval=JSON.parse(fs.readFileSync(`data/master-change-control/approvals/${PROPOSAL_ID}.approval.json`,'utf8'));
const profile=PRODUCT_MASTER_WORKFLOW_REGISTRY.require(PRODUCT_ID);
const a=profile.standardSizeSourceAudit;
const c=profile.standardSizeGapProposal;
const build=()=>createStandardSizeSourceGapChangeProposal({
  productId:PRODUCT_ID,sourceRecords:a.sourceRecords,canonicalRecords:a.canonicalRecords,
  existingSizeGlassConditions:c.existingSizeGlassConditions??[],sizeIdPrefix:c.sizeIdPrefix,
  glassConditionIdPrefix:c.glassConditionIdPrefix,evidenceIdPrefix:c.evidenceIdPrefix,sourceBatchId:c.sourceBatchId,
  proposalId:c.proposalId,proposalCreatedAt:c.proposalCreatedAt,sourceUrl:c.sourceUrl
});
const preview=()=>buildThermosLProductionPreview({
  snapshot,proposalBuild:build(),approval,
  stagingResultFingerprint:'sha256:668abb7e3bf1f7db248449cbdbf058a9e837b09b9e02e9c95ded8296b5337d76'
});

test('v1.7-R1 production preview binds exact formal Drive revision and approved Proposal',()=>{
  const p=preview();
  assert.equal(p.proposalId,PROPOSAL_ID);
  assert.equal(p.proposalFingerprint,approval.proposalFingerprint);
  assert.equal(p.formalTarget.id,'17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL');
  assert.equal(p.formalTarget.expectedRevisionId,'0B1PsqngSohhlZ0dycXFVYTVFY3JzQWJLLzNkVGFVcFhsNHQ0PQ');
  assert.equal(p.correction.supersedesPreviewFingerprint,'sha256:a057d745c8a3a93b06aebc20c98fba99dd121804d35985d074ed5764bdab9168');
});

test('v1.7-R1 snapshot proves last record is Excel row 1562 and append begins at 1563',()=>{
  for(const sheet of['06_サイズ','08A_サイズ別ガラス条件']){
    assert.equal(snapshot.sheets[sheet].lastExcelRow,1562);
    assert.equal(snapshot.sheets[sheet].nextExcelRow,1563);
    assert.equal(snapshot.sheets[sheet].nextExcelRow,snapshot.sheets[sheet].lastExcelRow+1);
  }
});

test('v1.7-R1 production preview maps 85 Size rows without overwriting SZ-SL-001559',()=>{
  const p=preview();
  const w=p.writePlan.writes[0];
  assert.equal(w.sheet,'06_サイズ');
  assert.equal(w.range,'A1563:V1647');
  assert.equal(w.expectedTailBefore,'SZ-SL-001559');
  assert.equal(w.rows.length,85);
  assert.equal(w.rows[0][0],'SZ-SL-001560');
  assert.equal(w.rows.at(-1)[0],'SZ-SL-001644');
  assert.ok(w.rows.every((row)=>row.length===22));
});

test('v1.7-R1 production preview maps 85 glass rows without overwriting GSC-SL-001559',()=>{
  const p=preview();
  const w=p.writePlan.writes[1];
  assert.equal(w.sheet,'08A_サイズ別ガラス条件');
  assert.equal(w.range,'A1563:N1647');
  assert.equal(w.expectedTailBefore,'GSC-SL-001559');
  assert.equal(w.rows.length,85);
  assert.equal(w.rows[0][0],'GSC-SL-001560');
  assert.equal(w.rows.at(-1)[0],'GSC-SL-001644');
  assert.ok(w.rows.every((row)=>row.length===14));
});

test('v1.7-R1 production preview projects formal selectable Size count to 1495 and requires new production approval',()=>{
  const p=preview();
  assert.deepEqual(p.projectedInventory,{standardSizeRows:1644,selectableSizeRows:1495,sizeGlassConditionRows:1644});
  assert.equal(p.productionApproval.required,true);
  assert.equal(p.productionApproval.status,'PENDING');
  assert.equal(p.productionApproval.scopeRequired,'APPROVE_PRODUCTION_WRITE_ONLY');
  assert.equal(p.formalWorkbookWritePerformed,false);
  assert.equal(p.runtimeWritePerformed,false);
});

test('v1.7-R1 off-by-one append boundary is rejected',()=>{
  const bad=structuredClone(snapshot);
  bad.sheets['06_サイズ'].nextExcelRow=1562;
  assert.throws(()=>buildThermosLProductionPreview({
    snapshot:bad,proposalBuild:build(),approval,
    stagingResultFingerprint:'sha256:668abb7e3bf1f7db248449cbdbf058a9e837b09b9e02e9c95ded8296b5337d76'
  }),/append-row boundary drift/);
});

test('v1.7-R1 formal tail drift blocks preview',()=>{
  const bad=structuredClone(snapshot);
  bad.sheets['06_サイズ'].lastRecordId='SZ-SL-DRIFT';
  assert.throws(()=>buildThermosLProductionPreview({
    snapshot:bad,proposalBuild:build(),approval,
    stagingResultFingerprint:'sha256:668abb7e3bf1f7db248449cbdbf058a9e837b09b9e02e9c95ded8296b5337d76'
  }),/Formal workbook tail drift/);
});
