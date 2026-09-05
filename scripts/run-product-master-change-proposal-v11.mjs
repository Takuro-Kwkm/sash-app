import fs from'node:fs';
import path from'node:path';
import{runApw430LiveEvidenceRoundTrip}from'../src/product-master-core/live-roundtrip-v1.mjs';
import{
  applyApprovedProductMasterChangeProposal,approveProductMasterChangeProposal,
  createProductMasterChangeProposal,persistProductMasterChangeProposal,productMasterFingerprint
}from'../src/product-master-core/master-change-control.mjs';
import{APW430_OFFICIAL_EVIDENCE_POC}from'../src/product-master-core/poc/apw430-official-evidence-poc.mjs';

const artifactDir=path.resolve(process.argv[2]??'artifacts/product-master-change-v11');
const liveDir=path.join(artifactDir,'live-roundtrip');
fs.mkdirSync(artifactDir,{recursive:true});

const live=runApw430LiveEvidenceRoundTrip({artifactDir:liveDir});
const baseMaster=structuredClone(APW430_OFFICIAL_EVIDENCE_POC);
const acceptedEvidence=live.state.canonicalEvidence;
const changes=acceptedEvidence.map((record)=>({operation:'ADD_RECORD',collection:'evidence',record}));
const evidenceIds=acceptedEvidence.map((row)=>row.id);
const createdAt=new Date().toISOString();
const proposalId=`PMCP-YKK-APW430-FIX-LIVE-${createdAt.replace(/\D/g,'').slice(0,14)}`;
const proposalResult=createProductMasterChangeProposal({
  id:proposalId,
  productId:'SER-YKK-APW430',
  baseMaster,
  changes,
  evidenceIds,
  sourceBatchIds:[live.report.batchId],
  openBlockingPending:live.report.transportIssues.blocking,
  createdBy:'CHATGPT',
  at:createdAt,
  summary:'Add 9 adjudicated APW430 FIX Canonical Evidence records from the real NotebookLM LIVE_EXTERNAL V3 batch. No Rule, size, Runtime, or production Product Master mutation is included.'
});
if(!proposalResult.pass)throw new Error(JSON.stringify(proposalResult.errors));
const proposal=proposalResult.proposal;
const controlRoot=path.join(artifactDir,'change-control');
const proposalPath=persistProductMasterChangeProposal(proposal,{rootDir:controlRoot});

const unapprovedApply=applyApprovedProductMasterChangeProposal({proposal,baseMaster,openBlockingPending:0});
const chatgptApproval=approveProductMasterChangeProposal(proposal,{approverType:'CHATGPT',approvedBy:'CHATGPT',note:'This must be rejected.'});

const report={
  reportVersion:'1.1',
  status:'PROPOSAL_READY_FOR_HUMAN_APPROVAL',
  productId:proposal.productId,
  proposalId:proposal.id,
  proposalStatus:proposal.status,
  proposalFingerprint:proposal.proposalFingerprint,
  baseMasterFingerprint:productMasterFingerprint(baseMaster),
  sourceBatchIds:proposal.sourceBatchIds,
  acceptedCanonicalEvidence:acceptedEvidence.length,
  proposedChanges:proposal.changes.length,
  riskLevel:proposal.riskLevel,
  approvalPolicy:proposal.approvalPolicy,
  openBlockingPending:proposal.gateSnapshot.openBlockingPending,
  openNonBlockingPending:live.report.transportIssues.nonBlocking,
  unapprovedApplyBlocked:!unapprovedApply.pass&&unapprovedApply.errors.some((row)=>row.code==='MASTER_CHANGE_APPROVAL_REQUIRED'),
  chatgptSelfApprovalBlocked:!chatgptApproval.pass&&chatgptApproval.errors.some((row)=>row.code==='MASTER_CHANGE_HUMAN_APPROVAL_REQUIRED'),
  productionMasterWritePerformed:false,
  runtimeWritePerformed:false,
  proposalPath:path.relative(process.cwd(),proposalPath),
  gates:{
    LIVE_EVIDENCE_ROUNDTRIP:live.pass?'PASS':'FAIL',
    CANONICAL_EVIDENCE_9:acceptedEvidence.length===9?'PASS':'FAIL',
    CHANGE_PROPOSAL_CREATED:proposal.status==='PROPOSED'?'PASS':'FAIL',
    BASE_FINGERPRINT_BOUND:proposal.target.baseMasterFingerprint===productMasterFingerprint(baseMaster)?'PASS':'FAIL',
    HUMAN_APPROVAL_REQUIRED:proposal.approvalPolicy==='HUMAN_REQUIRED'?'PASS':'FAIL',
    UNAPPROVED_APPLY_BLOCKED:!unapprovedApply.pass?'PASS':'FAIL',
    CHATGPT_SELF_APPROVAL_BLOCKED:!chatgptApproval.pass?'PASS':'FAIL',
    OPEN_BLOCKING_PENDING:proposal.gateSnapshot.openBlockingPending,
    PRODUCTION_MASTER_AUTO_WRITE:'0',
    RUNTIME_AUTO_WRITE:'0'
  }
};
const pass=live.pass&&acceptedEvidence.length===9&&proposal.status==='PROPOSED'&&report.unapprovedApplyBlocked&&report.chatgptSelfApprovalBlocked&&proposal.gateSnapshot.openBlockingPending===0;
fs.writeFileSync(path.join(artifactDir,'proposal-report.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
fs.writeFileSync(path.join(artifactDir,'proposal.json'),`${JSON.stringify(proposal,null,2)}\n`,'utf8');
console.log(JSON.stringify({pass,artifactDir,report},null,2));
if(!pass)process.exitCode=1;
