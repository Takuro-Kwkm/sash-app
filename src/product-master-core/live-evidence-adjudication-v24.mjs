import fs from'node:fs';
import path from'node:path';
import{persistGeminiTransport}from'./evidence-inbox-store.mjs';
import{
  adjudicatePersistedCandidate,loadEvidenceAdjudicationStore,persistCandidateUnderReview
}from'./evidence-adjudication-store.mjs';
import{buildProductMasterReviewQueue}from'./review-queue.mjs';
import{
  applyApprovedProductMasterChangeProposal,approveProductMasterChangeProposal,
  createProductMasterChangeProposal,persistProductMasterChangeProposal,productMasterFingerprint
}from'./master-change-control.mjs';
import{APW430_OFFICIAL_EVIDENCE_POC}from'./poc/apw430-official-evidence-poc.mjs';

export const APW430_LIVE_ADJUDICATION_V24_PRODUCT_ID='SER-YKK-APW430';
export const APW430_LIVE_ADJUDICATION_V24_BATCH_ID='BATCH-202607-APW430-P69-71';
export const APW430_LIVE_ADJUDICATION_V24_PROPOSAL_ID='PMCP-YKK-APW430-LIVE-EVIDENCE-20260904-001';

const ACCEPT_REASONS=Object.freeze({
  'EC-APW430-FIX-001':'Official YKK AP APW430 catalog PDF p.71 (printed p.69) visibly confirms the FIX window taxonomy: window type and terrace type.',
  'EC-APW430-FIX-002':'Official YKK AP APW430 catalog PDF p.71 (printed p.69) visibly confirms window type=conventional and terrace type=conventional/2x4 construction.',
  'EC-APW430-FIX-003':'Official YKK AP APW430 catalog PDF p.72 (printed p.70) explicitly states that the terrace type is angle-frame only.',
  'EC-APW430-FIX-004':'Official YKK AP APW430 catalog PDF p.73 (printed p.71) explicitly states frame depth 115 mm (65+50) and usable total glass thickness 45 mm.',
  'EC-APW430-FIX-005':'Official YKK AP APW430 catalog PDF p.73 (printed p.71) shows conventional terrace H call 24 / sash H 2430 mm and the seven listed standard widths.'
});

const canonicalEvidenceId=(candidateId)=>`EV-APW430-LIVE-20260904-${candidateId.replace(/^EC-APW430-/,'')}`;
const readJson=(filePath)=>JSON.parse(fs.readFileSync(filePath,'utf8'));
const writeJson=(filePath,value)=>{
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  fs.writeFileSync(filePath,`${JSON.stringify(value,null,2)}\n`,'utf8');
};
const fail=(code,message,details={})=>{const error=new Error(message);error.code=code;Object.assign(error,details);throw error;};

function validateCoverageAudit(coverage,envelope){
  if(coverage?.recordType!=='PRODUCT_MASTER_FORMAL_COVERAGE_ASSESSMENT')fail('V24_COVERAGE_RECORD_INVALID','Formal coverage assessment recordType is invalid');
  if(coverage.productId!==APW430_LIVE_ADJUDICATION_V24_PRODUCT_ID)fail('V24_COVERAGE_PRODUCT_MISMATCH','Formal coverage assessment product mismatch');
  if(coverage.formalMaster?.driveFileId!=='1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo')fail('V24_FORMAL_MASTER_ID_MISMATCH','Formal coverage assessment is not bound to the current APW430 Authoring Master');
  if(coverage.officialSource?.driveFileId!==envelope.sourceContext?.driveFileId)fail('V24_COVERAGE_SOURCE_MISMATCH','Formal coverage assessment source does not match LIVE Evidence source');
  const expected=new Set(envelope.candidates.map((row)=>row.id));
  const actual=new Set((coverage.candidateCoverage??[]).map((row)=>row.candidateId));
  if(expected.size!==actual.size||[...expected].some((id)=>!actual.has(id)))fail('V24_COVERAGE_CANDIDATES_INCOMPLETE','Formal coverage assessment does not cover the exact LIVE candidate set');
  if((coverage.candidateCoverage??[]).some((row)=>row.decision!=='ACCEPT'))fail('V24_COVERAGE_DECISION_MISMATCH','All Phase 4 candidates must have an explicit ACCEPT assessment');
  if(coverage.summary?.formalMutationRequired!==0)fail('V24_FORMAL_MUTATION_UNEXPECTED','Phase 4 formal coverage assessment must not require a formal workbook mutation');
  return true;
}

export function runApw430LiveEvidenceAdjudicationV24({
  sourceBatchPath=path.resolve('docs/notebooklm/live/BATCH-GEMINI-APW430-LIVE-20260904-E2E.json'),
  coverageAuditPath=path.resolve('data/master-change-control/audits/APW430_LIVE_EVIDENCE_FORMAL_COVERAGE_20260904.json'),
  artifactDir=path.resolve('artifacts/product-master-v24/apw430'),
  at=new Date().toISOString()
}={}){
  const raw=fs.readFileSync(sourceBatchPath,'utf8');
  const envelope=JSON.parse(raw);
  const coverage=readJson(coverageAuditPath);
  if(envelope.transportType!=='EVIDENCE_CANDIDATE_BATCH'||envelope.batchId!==APW430_LIVE_ADJUDICATION_V24_BATCH_ID)fail('V24_BATCH_INVALID','Expected audited APW430 LIVE Evidence Candidate batch');
  if(envelope.productId!==APW430_LIVE_ADJUDICATION_V24_PRODUCT_ID)fail('V24_PRODUCT_MISMATCH','Expected APW430 LIVE Evidence product');
  if(envelope.producer?.mode!=='LIVE_EXTERNAL')fail('V24_NOT_LIVE_EXTERNAL','Phase 4 input must be the audited LIVE_EXTERNAL batch');
  if(envelope.candidates?.length!==5)fail('V24_CANDIDATE_COUNT_INVALID',`Expected 5 LIVE candidates, got ${envelope.candidates?.length??0}`);
  validateCoverageAudit(coverage,envelope);

  const inboxDir=path.join(artifactDir,'evidence-inbox');
  const changeControlDir=path.join(artifactDir,'change-control');
  fs.rmSync(inboxDir,{recursive:true,force:true});
  fs.rmSync(changeControlDir,{recursive:true,force:true});
  fs.mkdirSync(artifactDir,{recursive:true});

  const imported=persistGeminiTransport(raw,{
    rootDir:inboxDir,
    expectedProductId:APW430_LIVE_ADJUDICATION_V24_PRODUCT_ID,
    importedAt:at
  });
  if(!imported.pass)fail('V24_INBOX_IMPORT_FAILED','Audited LIVE Evidence batch failed Evidence Inbox import',{errors:imported.errors});

  const adjudications=[];
  for(const candidate of envelope.candidates){
    const reason=ACCEPT_REASONS[candidate.id];
    if(!reason)fail('V24_REVIEW_REASON_MISSING',`No Phase 4 review reason is defined for ${candidate.id}`);
    const review=persistCandidateUnderReview({
      rootDir:inboxDir,batchId:envelope.batchId,candidateId:candidate.id,at,by:'CHATGPT'
    });
    if(!review.pass)fail('V24_REVIEW_TRANSITION_FAILED',`Could not move ${candidate.id} to UNDER_REVIEW`,{errors:review.errors});
    const adjudicated=adjudicatePersistedCandidate({
      rootDir:inboxDir,batchId:envelope.batchId,candidateId:candidate.id,
      decision:'ACCEPT',reason,adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',
      canonicalEvidenceId:canonicalEvidenceId(candidate.id),at
    });
    if(!adjudicated.pass)fail('V24_ADJUDICATION_FAILED',`Could not ACCEPT ${candidate.id}`,{errors:adjudicated.errors});
    adjudications.push({
      candidateId:candidate.id,decision:adjudicated.decision,adjudicationId:adjudicated.adjudicationId,
      canonicalEvidenceId:adjudicated.canonicalEvidence?.id??null
    });
  }

  const state=loadEvidenceAdjudicationStore(inboxDir);
  const acceptedEvidence=state.canonicalEvidence;
  if(acceptedEvidence.length!==5)fail('V24_CANONICAL_EVIDENCE_COUNT_INVALID',`Expected 5 promoted Canonical Evidence records, got ${acceptedEvidence.length}`);

  const baseMaster=structuredClone(APW430_OFFICIAL_EVIDENCE_POC);
  const changes=acceptedEvidence.map((record)=>({operation:'ADD_RECORD',collection:'evidence',record}));
  const proposalResult=createProductMasterChangeProposal({
    id:APW430_LIVE_ADJUDICATION_V24_PROPOSAL_ID,
    productId:APW430_LIVE_ADJUDICATION_V24_PRODUCT_ID,
    baseMaster,changes,evidenceIds:acceptedEvidence.map((row)=>row.id),
    sourceBatchIds:[envelope.batchId],openBlockingPending:0,
    createdBy:'CHATGPT',at,
    summary:'Add 5 ChatGPT-adjudicated APW430 LIVE Gemini Canonical Evidence records to the Control Plane Product Master only. Current formal workbook coverage was separately verified; this proposal does not authorize formal workbook, Runtime, or Production writes.'
  });
  if(!proposalResult.pass)fail('V24_CHANGE_PROPOSAL_FAILED','Could not create controlled Evidence-only Product Master Change Proposal',{errors:proposalResult.errors});
  const proposal=proposalResult.proposal;
  const proposalPath=persistProductMasterChangeProposal(proposal,{rootDir:changeControlDir});

  const selfApproval=approveProductMasterChangeProposal(proposal,{
    approverType:'CHATGPT',approvedBy:'CHATGPT',note:'Negative control: ChatGPT must not approve its own Product Master change.',at,
    expectedProposalFingerprint:proposal.proposalFingerprint
  });
  const unapprovedApply=applyApprovedProductMasterChangeProposal({
    proposal,baseMaster,openBlockingPending:0,mode:'STAGING',at,appliedBy:'SYSTEM'
  });
  const selfApprovalBlocked=!selfApproval.pass&&selfApproval.errors.some((row)=>row.code==='MASTER_CHANGE_HUMAN_APPROVAL_REQUIRED');
  const unapprovedApplyBlocked=!unapprovedApply.pass&&unapprovedApply.errors.some((row)=>row.code==='MASTER_CHANGE_APPROVAL_REQUIRED');
  if(!selfApprovalBlocked)fail('V24_SELF_APPROVAL_NOT_BLOCKED','ChatGPT self-approval negative control did not fail closed');
  if(!unapprovedApplyBlocked)fail('V24_UNAPPROVED_APPLY_NOT_BLOCKED','Unapproved STAGING apply negative control did not fail closed');

  const queue=buildProductMasterReviewQueue({
    evidenceInboxDir:inboxDir,changeControlDir,productId:APW430_LIVE_ADJUDICATION_V24_PRODUCT_ID,generatedAt:at
  });
  const candidateItems=queue.items.filter((row)=>row.kind==='EVIDENCE_CANDIDATE');
  const proposalItems=queue.items.filter((row)=>row.kind==='MASTER_CHANGE_PROPOSAL');
  const evidenceQueueClosed=candidateItems.length===5&&candidateItems.every((row)=>row.reviewStatus==='APPROVED'&&!row.actionable&&row.nextAction==='NONE');
  const proposalHumanRequired=proposalItems.length===1&&proposalItems[0].reviewStatus==='HUMAN_REQUIRED'&&proposalItems[0].actionable&&proposalItems[0].authority==='HUMAN';
  if(!evidenceQueueClosed)fail('V24_EVIDENCE_QUEUE_NOT_CLOSED','Accepted Evidence Candidates did not leave the actionable Evidence review queue');
  if(!proposalHumanRequired)fail('V24_PROPOSAL_AUTHORITY_INVALID','Controlled proposal is not exposed as HUMAN_REQUIRED');

  const report={
    reportVersion:'2.4',
    recordType:'APW430_LIVE_EVIDENCE_ADJUDICATION_REPORT',
    status:'EVIDENCE_ACCEPTED_PROPOSAL_AWAITING_HUMAN_APPROVAL',
    productId:APW430_LIVE_ADJUDICATION_V24_PRODUCT_ID,
    sourceBatchId:envelope.batchId,
    producerMode:envelope.producer.mode,
    sourceContext:envelope.sourceContext,
    acceptedCanonicalEvidence:acceptedEvidence.length,
    rejectedEvidence:0,pendingEvidence:0,
    adjudications,
    formalCoverageAssessment:{
      assessmentId:coverage.assessmentId,
      formalMaster:coverage.formalMaster,
      formalAlreadyRepresented:coverage.summary.formalAlreadyRepresented,
      formalSchemaGapNonMutating:coverage.summary.formalSchemaGapNonMutating,
      formalMutationRequired:coverage.summary.formalMutationRequired,
      candidateCoverage:coverage.candidateCoverage
    },
    proposal:{
      id:proposal.id,status:proposal.status,approvalPolicy:proposal.approvalPolicy,
      riskLevel:proposal.riskLevel,proposalFingerprint:proposal.proposalFingerprint,
      baseMasterFingerprint:productMasterFingerprint(baseMaster),
      changeScope:'CONTROL_PLANE_EVIDENCE_ONLY',changeCount:proposal.changes.length,
      proposalPath:path.relative(process.cwd(),proposalPath)
    },
    reviewQueue:{
      total:queue.summary.total,actionable:queue.summary.actionable,
      evidenceApproved:candidateItems.length,
      masterChangeHumanRequired:proposalItems.length,
      authorityBoundary:queue.authorityBoundary
    },
    negativeControls:{chatgptSelfApprovalBlocked:selfApprovalBlocked,unapprovedApplyBlocked},
    writes:{
      canonicalEvidenceStoreWritePerformed:true,
      formalProductMasterWritePerformed:false,
      runtimeWritePerformed:false,
      productionWritePerformed:false,
      googleSheetMutationCount:0
    },
    gates:{
      LIVE_AUDITED_BATCH:'PASS',
      OFFICIAL_SOURCE_REVIEW:'PASS',
      EVIDENCE_ADJUDICATION:'PASS',
      CANONICAL_EVIDENCE_5:acceptedEvidence.length===5?'PASS':'FAIL',
      FORMAL_COVERAGE_ASSESSMENT:'PASS',
      FORMAL_MUTATION_REQUIRED:coverage.summary.formalMutationRequired,
      CHANGE_PROPOSAL_CREATED:proposal.status==='PROPOSED'?'PASS':'FAIL',
      HUMAN_APPROVAL_REQUIRED:proposal.approvalPolicy==='HUMAN_REQUIRED'?'PASS':'FAIL',
      CHATGPT_SELF_APPROVAL_BLOCKED:selfApprovalBlocked?'PASS':'FAIL',
      UNAPPROVED_APPLY_BLOCKED:unapprovedApplyBlocked?'PASS':'FAIL',
      REVIEW_QUEUE:evidenceQueueClosed&&proposalHumanRequired?'PASS':'FAIL',
      FORMAL_PRODUCT_MASTER_WRITE:'0',
      RUNTIME_WRITE:'0',
      PRODUCTION_WRITE:'0'
    }
  };

  writeJson(path.join(artifactDir,'adjudication-state.json'),state);
  writeJson(path.join(artifactDir,'formal-coverage-assessment.json'),coverage);
  writeJson(path.join(artifactDir,'proposal.json'),proposal);
  writeJson(path.join(artifactDir,'review-queue.json'),queue);
  writeJson(path.join(artifactDir,'phase4-report.json'),report);

  return{pass:true,artifactDir,report,proposal,state,queue};
}
