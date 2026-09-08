import fs from'node:fs';
import path from'node:path';
import{PRODUCT_MASTER_WORKFLOW_REGISTRY}from'../src/product-master-core/products/index.mjs';
import{createStandardSizeSourceGapChangeProposal}from'../src/product-master-core/standard-size-source-gap-proposal.mjs';
import{buildThermosLProductionPreview}from'../src/product-master-core/products/thermosl/production-preview.mjs';

const PRODUCT_ID='SER-LIX-SAMOSL';
const PROPOSAL_ID='PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001';
const STAGING_RESULT_FINGERPRINT='sha256:668abb7e3bf1f7db248449cbdbf058a9e837b09b9e02e9c95ded8296b5337d76';
const artifactDir=path.resolve(process.argv[2]??'artifacts/product-master-production-preview-v17/thermosl');
const approvalPath=path.resolve(`data/master-change-control/approvals/${PROPOSAL_ID}.approval.json`);
const snapshotPath=path.resolve('data/master-change-control/formal-snapshots/SER-LIX-SAMOSL_v0.7_20260902.json');
const approval=JSON.parse(fs.readFileSync(approvalPath,'utf8'));
const snapshot=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
const profile=PRODUCT_MASTER_WORKFLOW_REGISTRY.require(PRODUCT_ID);
const audit=profile.standardSizeSourceAudit;
const config=profile.standardSizeGapProposal;
const built=createStandardSizeSourceGapChangeProposal({
  productId:PRODUCT_ID,sourceRecords:audit.sourceRecords,canonicalRecords:audit.canonicalRecords,
  existingSizeGlassConditions:config.existingSizeGlassConditions??[],
  sizeIdPrefix:config.sizeIdPrefix,glassConditionIdPrefix:config.glassConditionIdPrefix,
  evidenceIdPrefix:config.evidenceIdPrefix,sourceBatchId:config.sourceBatchId,
  proposalId:config.proposalId,proposalCreatedAt:config.proposalCreatedAt,sourceUrl:config.sourceUrl
});
if(!built.pass||built.proposal.id!==PROPOSAL_ID)throw new Error(JSON.stringify(built.errors??[]));
const preview=buildThermosLProductionPreview({snapshot,proposalBuild:built,approval,stagingResultFingerprint:STAGING_RESULT_FINGERPRINT});
const gates={
  HUMAN_STAGING_APPROVAL:approval.approverType==='HUMAN'?'PASS':'FAIL',
  STAGING_RESULT_BOUND:preview.approvedStagingResultFingerprint===STAGING_RESULT_FINGERPRINT?'PASS':'FAIL',
  FORMAL_DRIVE_FILE_BOUND:preview.formalTarget.id==='17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL'?'PASS':'FAIL',
  FORMAL_REVISION_BOUND:preview.formalTarget.expectedRevisionId===snapshot.driveFile.revisionId?'PASS':'FAIL',
  APPEND_BOUNDARY_SIZE:snapshot.sheets['06_サイズ'].lastExcelRow===1562&&snapshot.sheets['06_サイズ'].nextExcelRow===1563?'PASS':'FAIL',
  APPEND_BOUNDARY_GLASS:snapshot.sheets['08A_サイズ別ガラス条件'].lastExcelRow===1562&&snapshot.sheets['08A_サイズ別ガラス条件'].nextExcelRow===1563?'PASS':'FAIL',
  SIZE_WRITE_ROWS:preview.writePlan.writes[0].addRows===85?'PASS':'FAIL',
  GLASS_WRITE_ROWS:preview.writePlan.writes[1].addRows===85?'PASS':'FAIL',
  SIZE_RANGE:preview.writePlan.writes[0].range==='A1563:V1647'?'PASS':'FAIL',
  GLASS_RANGE:preview.writePlan.writes[1].range==='A1563:N1647'?'PASS':'FAIL',
  PROJECTED_STANDARD_SIZE_ROWS:preview.projectedInventory.standardSizeRows===1644?'PASS':'FAIL',
  PROJECTED_SELECTABLE_SIZE_ROWS:preview.projectedInventory.selectableSizeRows===1495?'PASS':'FAIL',
  PRODUCTION_APPROVAL_REQUIRED:preview.productionApproval.required&&preview.productionApproval.status==='PENDING'?'PASS':'FAIL',
  FORMAL_WORKBOOK_WRITE:preview.formalWorkbookWritePerformed===false?'PASS':'FAIL',
  RUNTIME_WRITE:preview.runtimeWritePerformed===false?'PASS':'FAIL'
};
const pass=Object.values(gates).every((v)=>v==='PASS');
const report={
  reportVersion:'1.7-R2',status:pass?'PRODUCTION_WRITE_PREVIEW_READY':'PRODUCTION_WRITE_PREVIEW_FAILED',productId:PRODUCT_ID,
  proposalId:PROPOSAL_ID,proposalFingerprint:preview.proposalFingerprint,previewFingerprint:preview.previewFingerprint,
  supersedesPreviewFingerprints:preview.correction.supersedesPreviewFingerprints,
  formalTarget:preview.formalTarget,writeSummary:{
    sizeSheet:preview.writePlan.writes[0].sheet,sizeRange:preview.writePlan.writes[0].range,sizeRows:85,
    glassSheet:preview.writePlan.writes[1].sheet,glassRange:preview.writePlan.writes[1].range,glassRows:85,
    formalWorkbookRowAdditions:170,controlPlaneEvidenceAdditions:8
  },
  projectedInventory:preview.projectedInventory,productionApproval:preview.productionApproval,
  formalWorkbookWritePerformed:false,runtimeWritePerformed:false,gates
};
fs.mkdirSync(artifactDir,{recursive:true});
fs.writeFileSync(path.join(artifactDir,'production-preview.json'),`${JSON.stringify(preview,null,2)}\n`,'utf8');
fs.writeFileSync(path.join(artifactDir,'production-preview-report.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
fs.writeFileSync(path.join(artifactDir,'formal-read-snapshot.json'),`${JSON.stringify(snapshot,null,2)}\n`,'utf8');
console.log(JSON.stringify({pass,artifactDir,report},null,2));
if(!pass)process.exitCode=1;
