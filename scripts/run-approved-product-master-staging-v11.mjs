import fs from'node:fs';
import path from'node:path';
import{runApw430LiveEvidenceRoundTrip}from'../src/product-master-core/live-roundtrip-v1.mjs';
import{
  applyPersistedProductMasterChangeProposal,approvePersistedProductMasterChangeProposal,
  createProductMasterChangeProposal,persistProductMasterChangeProposal,productMasterFingerprint
}from'../src/product-master-core/master-change-control.mjs';
import{APW430_OFFICIAL_EVIDENCE_POC}from'../src/product-master-core/poc/apw430-official-evidence-poc.mjs';

const artifactDir=path.resolve(process.argv[2]??'artifacts/product-master-staging-v11');
const approvalPath=path.resolve(process.argv[3]??'data/master-change-control/approvals/PMCP-YKK-APW430-FIX-LIVE-20260902-001.approval.json');
const approval=JSON.parse(fs.readFileSync(approvalPath,'utf8'));
if(approval.recordType!=='PRODUCT_MASTER_CHANGE_APPROVAL'||approval.approverType!=='HUMAN'||approval.scope!=='APPROVE_AND_STAGE_ONLY'||approval.productionApproval!==false)throw new Error('Invalid human staging approval record');

fs.mkdirSync(artifactDir,{recursive:true});
const live=runApw430LiveEvidenceRoundTrip({artifactDir:path.join(artifactDir,'live-roundtrip')});
const baseMaster=structuredClone(APW430_OFFICIAL_EVIDENCE_POC);
const evidence=live.state.canonicalEvidence;
const proposalResult=createProductMasterChangeProposal({
  id:approval.proposalId,productId:'SER-YKK-APW430',baseMaster,
  changes:evidence.map((record)=>({operation:'ADD_RECORD',collection:'evidence',record})),
  evidenceIds:evidence.map((row)=>row.id),sourceBatchIds:[live.report.batchId],
  openBlockingPending:live.report.transportIssues.blocking,createdBy:'CHATGPT',
  at:'2026-09-02T06:30:00Z',
  summary:'Add 9 adjudicated APW430 FIX Canonical Evidence records from the real NotebookLM LIVE_EXTERNAL V3 batch. No Rule, size, Runtime, or production Product Master mutation is included.'
});
if(!proposalResult.pass)throw new Error(JSON.stringify(proposalResult.errors));
const proposal=proposalResult.proposal;
if(proposal.proposalFingerprint!==approval.proposalFingerprint)throw new Error(`Approved fingerprint mismatch: ${proposal.proposalFingerprint}`);
if(proposal.target.baseMasterFingerprint!==approval.baseMasterFingerprint)throw new Error(`Approved base Master fingerprint mismatch: ${proposal.target.baseMasterFingerprint}`);

const controlRoot=path.join(artifactDir,'change-control');
persistProductMasterChangeProposal(proposal,{rootDir:controlRoot});
const approved=approvePersistedProductMasterChangeProposal({
  proposalId:proposal.id,rootDir:controlRoot,approverType:'HUMAN',approvedBy:approval.approvedBy,
  note:`${approval.approvalSource}; explicit approval scope=${approval.scope}. ${approval.auditNotes?.join(' ')??''}`,
  at:approval.approvedAt,expectedProposalFingerprint:approval.proposalFingerprint
});
if(!approved.pass)throw new Error(JSON.stringify(approved.errors));

const appliedAt=new Date().toISOString();
const applied=applyPersistedProductMasterChangeProposal({
  proposalId:proposal.id,rootDir:controlRoot,baseMaster,openBlockingPending:live.report.transportIssues.blocking,
  mode:'STAGING',at:appliedAt,appliedBy:'CHATGPT_CONTROL_PLANE',
  validateMaster:(master)=>({pass:master.evidence.length===11&&evidence.every((row)=>master.evidence.some((item)=>item.id===row.id))})
});
if(!applied.pass)throw new Error(JSON.stringify(applied.errors));

const report={
  reportVersion:'1.1',status:'STAGING_APPLY_COMPLETE',productId:'SER-YKK-APW430',
  proposalId:proposal.id,proposalStatus:applied.proposal.status,proposalFingerprint:proposal.proposalFingerprint,
  baseMasterFingerprint:productMasterFingerprint(baseMaster),resultMasterFingerprint:applied.proposal.applied.resultMasterFingerprint,
  approvedBy:approval.approvedBy,approvedAt:approval.approvedAt,appliedAt,
  stagingChangesApplied:proposal.changes.length,stagingEvidenceBefore:baseMaster.evidence.length,stagingEvidenceAfter:applied.appliedMaster.evidence.length,
  openBlockingPending:live.report.transportIssues.blocking,openNonBlockingPending:live.report.transportIssues.nonBlocking,
  auditTimestampAnomaly:'PROPOSAL_CREATED_AT_FIXED_TEST_TIMESTAMP_AFTER_REAL_APPROVAL',
  productionMasterWritePerformed:false,runtimeWritePerformed:false,
  gates:{
    EXPLICIT_HUMAN_APPROVAL:'PASS',PROPOSAL_FINGERPRINT_MATCH:'PASS',BASE_MASTER_FINGERPRINT_MATCH:'PASS',
    OPEN_BLOCKING_PENDING:live.report.transportIssues.blocking,STAGING_APPLY:'PASS',STAGING_EVIDENCE_COUNT:applied.appliedMaster.evidence.length,
    PRODUCTION_MASTER_WRITE:'0',RUNTIME_WRITE:'0'
  }
};
const pass=live.pass&&proposal.changes.length===9&&approved.proposal.status==='APPROVED'&&applied.proposal.status==='APPLIED'&&applied.appliedMaster.evidence.length===11&&live.report.transportIssues.blocking===0;
fs.writeFileSync(path.join(artifactDir,'staging-apply-report.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
fs.writeFileSync(path.join(artifactDir,'approval-record.json'),`${JSON.stringify(approval,null,2)}\n`,'utf8');
console.log(JSON.stringify({pass,artifactDir,report},null,2));
if(!pass)process.exitCode=1;
