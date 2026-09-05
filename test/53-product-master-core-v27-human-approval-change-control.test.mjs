import test from'node:test';
import assert from'node:assert/strict';
import{
  createProductMasterChangeProposal,proposalFingerprint,productMasterFingerprint
}from'../src/product-master-core/master-change-control.mjs';
import{buildHumanApprovalProvenance,validateHumanApprovalProvenance}from'../src/product-master-core/human-approval-provenance.mjs';
import{
  openGovernedChangeControl,validateGovernedChangeControlEntry,applyGovernedApprovedProductMasterChangeProposal
}from'../src/product-master-core/change-control-entry-gate.mjs';

function fixture(){
  const baseMaster={
    product:{id:'SER-HUMAN-001'},fields:[],productNodes:[],evidence:[],dependencyRules:[],pending:[],phases:[]
  };
  const canonicalEvidence={
    schemaVersion:'1.0',id:'EVID-HUMAN-001',productId:'SER-HUMAN-001',status:'VERIFIED',strength:'EXPLICIT',title:'Human gate evidence',subjectField:'window_type',claim:'Official source confirms the reviewed value.',productNodeIds:[],
    source:{type:'OFFICIAL_PDF',driveFileId:'DRIVE-HUMAN-001',title:'official.pdf',printedPage:1,pdfPage:1,locatorText:'reviewed value'},
    adjudication:{extractedBy:'GEMINI_ANTIGRAVITY',adjudicatedBy:'CHATGPT',adjudicatorType:'CHATGPT',status:'ACCEPTED',reason:'Verified against official source',sourceCandidateId:'CAND-HUMAN-001'},
    provenance:{candidateId:'CAND-HUMAN-001',candidateSourceSystem:'GEMINI_ANTIGRAVITY',producerMode:'LIVE_EXTERNAL'}
  };
  const created=createProductMasterChangeProposal({
    id:'PMCP-HUMAN-001',productId:'SER-HUMAN-001',baseMaster,
    changes:[{operation:'ADD_RECORD',collection:'evidence',record:canonicalEvidence}],
    evidenceIds:[canonicalEvidence.id],sourceBatchIds:['BATCH-HUMAN-001'],openBlockingPending:0,
    createdBy:'CHATGPT',at:'2026-09-05T11:00:00Z',summary:'Add one independently adjudicated Canonical Evidence record.'
  });
  assert.equal(created.pass,true,created.errors?.[0]?.message);
  const proposal=created.proposal;
  const reviewProvenance={
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_EVIDENCE_REVIEW_PROVENANCE',status:'PASS',governed:true,
    batchId:'BATCH-HUMAN-001',candidateId:'CAND-HUMAN-001',productId:'SER-HUMAN-001',candidateFingerprint:'fingerprint',batchRawSha256:'a'.repeat(64),
    executionChannel:'GEMINI_AI_PRO',executionReference:'GITHUB_ACTIONS_RUN:repo:human:1'
  };
  const adjudicationStore={
    canonicalEvidence:[canonicalEvidence],
    adjudications:[{id:'ADJ-CAND-HUMAN-001',batchId:'BATCH-HUMAN-001',candidateId:'CAND-HUMAN-001',decision:'ACCEPT',adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',reviewProvenance}],
    candidateStates:[{batchId:'BATCH-HUMAN-001',candidateId:'CAND-HUMAN-001',status:'ADJUDICATED',adjudicationId:'ADJ-CAND-HUMAN-001',reviewProvenance}],
    pending:[]
  };
  const reviewQueue={
    reviewQueueSchemaVersion:'1.0',recordType:'PRODUCT_MASTER_REVIEW_QUEUE',generatedAt:'2026-09-05T11:01:00Z',
    items:[{
      queueId:'RQ:EVIDENCE:BATCH-HUMAN-001:CAND-HUMAN-001',kind:'EVIDENCE_CANDIDATE',productId:'SER-HUMAN-001',sourceId:'CAND-HUMAN-001',sourceStatus:'ADJUDICATED',sourceDecision:'ACCEPT',reviewStatus:'APPROVED',actionable:false,authority:null,nextAction:'NONE',
      refs:{batchId:'BATCH-HUMAN-001',candidateId:'CAND-HUMAN-001',adjudicationId:'ADJ-CAND-HUMAN-001',reviewProvenance,provenanceErrors:[]}
    }],
    authorityBoundary:{evidenceAdjudication:'CHATGPT_OR_HUMAN',transportIssueResolution:'CHATGPT_OR_HUMAN',geminiAdjudicationAllowed:false,masterChangeApproval:'HUMAN_REQUIRED',queueMutationAuthority:'NONE',productionMasterAutoWrite:false,runtimeAutoWrite:false}
  };
  const approval={
    approvalSchemaVersion:'1.1',recordType:'PRODUCT_MASTER_CHANGE_APPROVAL',proposalId:proposal.id,
    proposalFingerprint:proposal.proposalFingerprint,baseMasterFingerprint:proposal.target.baseMasterFingerprint,
    approverType:'HUMAN',approvedBy:'HUMAN_USER_EXPLICIT_APPROVAL',approvedAt:'2026-09-05T11:02:00Z',
    approvalSource:'CHAT_CONVERSATION_EXPLICIT_COMMAND',approvalReference:'User explicitly approved PMCP-HUMAN-001 for staging.',
    scope:'APPROVE_AND_STAGE_ONLY',productionApproval:false
  };
  return{baseMaster,canonicalEvidence,proposal,reviewQueue,adjudicationStore,approval};
}

test('v2.7 Human Approval Provenance binds Proposal, Canonical Evidence, adjudication and Review provenance',()=>{
  const f=fixture();
  const built=buildHumanApprovalProvenance(f);
  assert.equal(built.pass,true,built.errors?.[0]?.message);
  assert.equal(built.record.status,'PASS');
  assert.equal(built.record.proposalId,f.proposal.id);
  assert.equal(built.record.proposalFingerprint,proposalFingerprint(f.proposal));
  assert.equal(built.record.baseMasterFingerprint,productMasterFingerprint(f.baseMaster));
  assert.deepEqual(built.record.reviewBinding.canonicalEvidenceIds,['EVID-HUMAN-001']);
  assert.deepEqual(built.record.reviewBinding.adjudicationIds,['ADJ-CAND-HUMAN-001']);
  assert.equal(built.record.reviewBinding.bindings[0].reviewProvenanceStatus,'PASS');
  assert.equal(built.record.approval.approverType,'HUMAN');
  assert.equal(built.record.authority.geminiApprovalAllowed,false);
  assert.equal(built.record.authority.chatgptHumanImpersonationAllowed,false);
});

test('v2.7 ChatGPT, Gemini or automation cannot impersonate the Human approver',()=>{
  for(const approvedBy of['CHATGPT','GEMINI_API','SYSTEM','AUTOMATION']){
    const f=fixture();
    f.approval.approvedBy=approvedBy;
    const built=buildHumanApprovalProvenance(f);
    assert.equal(built.pass,false,approvedBy);
    assert.ok(built.errors.some((row)=>row.code==='HUMAN_APPROVAL_IDENTITY_INVALID'),approvedBy);
  }
  const f=fixture();
  f.approval.approverType='GEMINI';
  const built=buildHumanApprovalProvenance(f);
  assert.equal(built.pass,false);
  assert.ok(built.errors.some((row)=>row.code==='HUMAN_APPROVAL_ACTOR_INVALID'));
});

test('v2.7 Human approval cannot bind a stale or blocked Review Queue',()=>{
  const f=fixture();
  const built=buildHumanApprovalProvenance(f);
  assert.equal(built.pass,true);
  f.reviewQueue.items[0].reviewStatus='BLOCKED';
  f.reviewQueue.items[0].actionable=true;
  f.reviewQueue.items[0].nextAction='INSPECT_EVIDENCE_PROVENANCE';
  const validation=validateHumanApprovalProvenance(built.record,f);
  assert.equal(validation.pass,false);
  assert.ok(validation.errors.some((row)=>['HUMAN_APPROVAL_REVIEW_ITEM_NOT_APPROVED','HUMAN_APPROVAL_REVIEW_BATCH_BLOCKED','HUMAN_APPROVAL_PROVENANCE_REVIEW_STALE'].includes(row.code)));
});

test('v2.7 explicit Human approval opens Change Control and is fingerprint-bound',()=>{
  const f=fixture();
  const built=buildHumanApprovalProvenance(f);
  assert.equal(built.pass,true);
  const opened=openGovernedChangeControl({...f,humanApprovalProvenance:built.record});
  assert.equal(opened.pass,true,opened.errors?.[0]?.message);
  assert.equal(opened.status,'CHANGE_CONTROL_OPEN');
  assert.equal(opened.humanApprovalGate.status,'PASS');
  assert.equal(opened.approvedProposal.status,'APPROVED');
  assert.equal(opened.approvedProposal.approval.approverType,'HUMAN');
  assert.equal(opened.approvedProposal.approval.approvalSource,'CHAT_CONVERSATION_EXPLICIT_COMMAND');
  assert.equal(opened.approvedProposal.approval.productionApproval,false);
  assert.ok(opened.approvedProposal.approval.humanApprovalProvenanceFingerprint.startsWith('sha256:'));
});

test('v2.7 Proposal or Base Master drift after approval closes Change Control',()=>{
  const f=fixture();
  const built=buildHumanApprovalProvenance(f);
  const opened=openGovernedChangeControl({...f,humanApprovalProvenance:built.record});
  assert.equal(opened.pass,true);

  const staleProposal=structuredClone(opened.approvedProposal);
  staleProposal.summary='Changed after approval';
  const proposalGate=validateGovernedChangeControlEntry({...f,approvedProposal:staleProposal,humanApprovalProvenance:built.record,humanApprovalGate:opened.humanApprovalGate});
  assert.equal(proposalGate.pass,false);
  assert.ok(proposalGate.errors.some((row)=>['HUMAN_APPROVAL_PROVENANCE_PROPOSAL_STALE','CHANGE_CONTROL_GATE_PROPOSAL_STALE'].includes(row.code)));

  const staleMaster=structuredClone(f.baseMaster);
  staleMaster.fields.push({id:'FIELD-DRIFT'});
  const baseGate=validateGovernedChangeControlEntry({...f,baseMaster:staleMaster,approvedProposal:opened.approvedProposal,humanApprovalProvenance:built.record,humanApprovalGate:opened.humanApprovalGate});
  assert.equal(baseGate.pass,false);
  assert.ok(baseGate.errors.some((row)=>['HUMAN_APPROVAL_PROVENANCE_BASE_MASTER_DRIFT','CHANGE_CONTROL_GATE_BASE_MASTER_STALE'].includes(row.code)));
});

test('v2.7 governed Human approval permits STAGING only and never Production or Runtime auto-write',()=>{
  const f=fixture();
  const built=buildHumanApprovalProvenance(f);
  const opened=openGovernedChangeControl({...f,humanApprovalProvenance:built.record});
  assert.equal(opened.pass,true);
  const applied=applyGovernedApprovedProductMasterChangeProposal({
    ...f,approvedProposal:opened.approvedProposal,humanApprovalProvenance:built.record,humanApprovalGate:opened.humanApprovalGate,
    mode:'STAGING',openBlockingPending:0,at:'2026-09-05T11:03:00Z',validateMaster:(master)=>({pass:master.evidence.some((row)=>row.id==='EVID-HUMAN-001')})
  });
  assert.equal(applied.pass,true,applied.errors?.[0]?.message);
  assert.equal(applied.humanApprovalGate,'PASS');
  assert.equal(applied.changeControlGate,'PASS');
  assert.equal(applied.proposal.status,'APPLIED');
  assert.equal(applied.productionMasterWritePerformed,false);
  assert.equal(applied.runtimeWritePerformed,false);

  const production=applyGovernedApprovedProductMasterChangeProposal({
    ...f,approvedProposal:opened.approvedProposal,humanApprovalProvenance:built.record,humanApprovalGate:opened.humanApprovalGate,mode:'PRODUCTION'
  });
  assert.equal(production.pass,false);
  assert.ok(production.errors.some((row)=>row.code==='CHANGE_CONTROL_STAGING_ONLY'));
});
