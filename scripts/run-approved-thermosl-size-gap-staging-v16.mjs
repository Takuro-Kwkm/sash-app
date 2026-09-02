import fs from'node:fs';
import path from'node:path';
import{PRODUCT_MASTER_WORKFLOW_REGISTRY}from'../src/product-master-core/products/index.mjs';
import{createStandardSizeSourceGapChangeProposal}from'../src/product-master-core/standard-size-source-gap-proposal.mjs';
import{auditStandardSizeSourceCoverage}from'../src/product-master-core/standard-size-source-audit.mjs';
import{
  applyPersistedProductMasterChangeProposal,
  approvePersistedProductMasterChangeProposal,
  persistProductMasterChangeProposal,
  productMasterFingerprint
}from'../src/product-master-core/master-change-control.mjs';

const PRODUCT_ID='SER-LIX-SAMOSL';
const PROPOSAL_ID='PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001';
const artifactDir=path.resolve(process.argv[2]??'artifacts/product-master-staging-v16-thermosl');
const approvalPath=path.resolve(process.argv[3]??`data/master-change-control/approvals/${PROPOSAL_ID}.approval.json`);
const approval=JSON.parse(fs.readFileSync(approvalPath,'utf8'));
if(
  approval.recordType!=='PRODUCT_MASTER_CHANGE_APPROVAL'||approval.proposalId!==PROPOSAL_ID||approval.productId!==PRODUCT_ID||
  approval.approverType!=='HUMAN'||approval.scope!=='APPROVE_AND_STAGE_ONLY'||approval.productionApproval!==false
)throw new Error('Invalid human staging approval record');

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
if(!built.pass||!built.proposal)throw new Error(JSON.stringify(built.errors??[]));
const proposal=built.proposal;
const baseMaster=built.baseMaster;

if(proposal.proposalFingerprint!==approval.proposalFingerprint)throw new Error(`Approved proposal fingerprint mismatch: ${proposal.proposalFingerprint}`);
if(proposal.target.baseMasterFingerprint!==approval.baseMasterFingerprint)throw new Error(`Approved base Master fingerprint mismatch: ${proposal.target.baseMasterFingerprint}`);
if(built.auditBefore.counts.missingInCanonical!==approval.expectedChanges.standardSizeRecordAdditions)throw new Error('Approved size addition count drift');
if(built.counts.totalChanges!==approval.expectedChanges.total)throw new Error('Approved total change count drift');
if(built.counts.evidenceAdditions!==approval.expectedChanges.verifiedEvidenceAdditions)throw new Error('Approved Evidence addition count drift');
if(built.counts.glassConditionAdditions!==approval.expectedChanges.sizeGlassConditionAdditions)throw new Error('Approved glass-condition addition count drift');

fs.mkdirSync(artifactDir,{recursive:true});
const controlRoot=path.join(artifactDir,'change-control');
persistProductMasterChangeProposal(proposal,{rootDir:controlRoot});
const approved=approvePersistedProductMasterChangeProposal({
  proposalId:PROPOSAL_ID,rootDir:controlRoot,approverType:'HUMAN',approvedBy:approval.approvedBy,
  note:`${approval.approvalSource}; scope=${approval.scope}. ${approval.auditNotes?.join(' ')??''}`,
  at:approval.approvedAt,expectedProposalFingerprint:approval.proposalFingerprint
});
if(!approved.pass)throw new Error(JSON.stringify(approved.errors));

const appliedAt=new Date().toISOString();
const applied=applyPersistedProductMasterChangeProposal({
  proposalId:PROPOSAL_ID,rootDir:controlRoot,baseMaster,openBlockingPending:0,
  mode:'STAGING',at:appliedAt,appliedBy:'CHATGPT_CONTROL_PLANE',
  validateMaster:(master)=>{
    const coverage=auditStandardSizeSourceCoverage({productId:PRODUCT_ID,sourceRecords:audit.sourceRecords,canonicalRecords:master.standardSizeRecords});
    const sizeIds=new Set(master.standardSizeRecords.map((row)=>row.id));
    const glassSizeIds=new Set(master.sizeGlassConditions.map((row)=>row.sizeId));
    return{
      pass:coverage.pass&&coverage.coveragePass&&coverage.counts.match===97&&coverage.counts.missingInCanonical===0&&
        master.standardSizeRecords.length===1644&&master.sizeGlassConditions.length===1644&&master.evidence.length===8&&
        built.sizeRecords.every((row)=>sizeIds.has(row.id)&&glassSizeIds.has(row.id))
    };
  }
});
if(!applied.pass)throw new Error(JSON.stringify(applied.errors));

const stagingCoverage=auditStandardSizeSourceCoverage({
  productId:PRODUCT_ID,sourceRecords:audit.sourceRecords,canonicalRecords:applied.appliedMaster.standardSizeRecords
});
const newSizeIds=built.sizeRecords.map((row)=>row.id);
const report={
  reportVersion:'1.6',status:'STAGING_APPLY_COMPLETE',productId:PRODUCT_ID,
  proposalId:PROPOSAL_ID,proposalStatus:applied.proposal.status,
  proposalFingerprint:proposal.proposalFingerprint,baseMasterFingerprint:productMasterFingerprint(baseMaster),
  resultMasterFingerprint:applied.proposal.applied.resultMasterFingerprint,
  approvedBy:approval.approvedBy,approvedAt:approval.approvedAt,appliedAt,
  stagingChangesApplied:proposal.changes.length,
  stagingStandardSizeBefore:baseMaster.standardSizeRecords.length,stagingStandardSizeAfter:applied.appliedMaster.standardSizeRecords.length,
  stagingSizeGlassConditionsBefore:baseMaster.sizeGlassConditions.length,stagingSizeGlassConditionsAfter:applied.appliedMaster.sizeGlassConditions.length,
  stagingEvidenceBefore:baseMaster.evidence.length,stagingEvidenceAfter:applied.appliedMaster.evidence.length,
  firstNewSizeId:newSizeIds[0],lastNewSizeId:newSizeIds.at(-1),newSizeCount:newSizeIds.length,
  sourceCoverage:stagingCoverage.counts,
  openBlockingPending:0,
  productionMasterWritePerformed:false,runtimeWritePerformed:false,
  gates:{
    EXPLICIT_HUMAN_APPROVAL:'PASS',PROPOSAL_FINGERPRINT_MATCH:'PASS',BASE_MASTER_FINGERPRINT_MATCH:'PASS',
    APPROVED_CHANGE_COUNT:proposal.changes.length===178?'PASS':'FAIL',
    STAGING_APPLY:applied.proposal.status==='APPLIED'?'PASS':'FAIL',
    STAGING_STANDARD_SIZE_COUNT:applied.appliedMaster.standardSizeRecords.length===1644?'PASS':'FAIL',
    STAGING_GLASS_CONDITION_COUNT:applied.appliedMaster.sizeGlassConditions.length===1644?'PASS':'FAIL',
    STAGING_EVIDENCE_COUNT:applied.appliedMaster.evidence.length===8?'PASS':'FAIL',
    OFFICIAL_SOURCE_SIZE_COVERAGE:stagingCoverage.coveragePass&&stagingCoverage.counts.match===97&&stagingCoverage.counts.missingInCanonical===0?'PASS':'FAIL',
    OPEN_BLOCKING_PENDING:0,PRODUCTION_MASTER_WRITE:'0',RUNTIME_WRITE:'0'
  }
};
const pass=Object.values(report.gates).every((value)=>value==='PASS'||value===0||value==='0')&&
  proposal.proposalFingerprint===approval.proposalFingerprint&&proposal.target.baseMasterFingerprint===approval.baseMasterFingerprint;
fs.writeFileSync(path.join(artifactDir,'staging-apply-report.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
fs.writeFileSync(path.join(artifactDir,'approval-record.json'),`${JSON.stringify(approval,null,2)}\n`,'utf8');
fs.writeFileSync(path.join(artifactDir,'applied-proposal.json'),`${JSON.stringify(applied.proposal,null,2)}\n`,'utf8');
console.log(JSON.stringify({pass,artifactDir,report},null,2));
if(!pass)process.exitCode=1;
