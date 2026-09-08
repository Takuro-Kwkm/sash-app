import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{APW430_GEMINI_INBOX_POC}from'../src/product-master-core/poc/apw430-gemini-inbox-poc.mjs';
import{persistGeminiTransport}from'../src/product-master-core/evidence-inbox-store.mjs';
import{
  adjudicatePersistedCandidate,evidenceAdjudicationSummary,loadEvidenceAdjudicationStore,
  persistCandidateUnderReview,transitionPersistedPending
}from'../src/product-master-core/evidence-adjudication-store.mjs';

const PRODUCT_ID='SER-YKK-APW430';
const SOURCE={type:'OFFICIAL_PDF',driveFileId:'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9',title:'202607_YKKAP_APW430_商品カタログ.pdf',version:'202607'};
const knownFields=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.fields);
const nodeIds=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.productNodes.map((row)=>row.id));
const transportOptions={expectedProductId:PRODUCT_ID,knownFields,nodeIds};

function makeTransport(suffix,{claim='FIX窓のテラスタイプはアングル付枠のみの設定となる。',subjectField='construction'}={}){
  const batchId=`BATCH-GEMINI-APW430-V09-${suffix}`;
  return{
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId,generatedAt:'2026-09-02T05:10:00Z',
    producer:{system:'GEMINI_NOTEBOOKLM',mode:'LIVE_EXTERNAL'},productId:PRODUCT_ID,sourceContext:SOURCE,
    candidates:[{
      recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:`CAND-GEMINI-APW430-V09-${suffix}-001`,
      sourceSystem:'GEMINI_NOTEBOOKLM',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:PRODUCT_ID,
      title:`APW430 v0.9 candidate ${suffix}`,subjectField,claim,proposedStrength:'EXPLICIT',
      productNodeIds:['NODE-YKK-APW430-FIX-TR-ZAIRAI','NODE-YKK-APW430-FIX-TR-204'],
      source:{...SOURCE,printedPage:70,pdfPage:72,locatorText:'テラスタイプはアングル付枠のみの設定'}
    }],issues:[]
  };
}

function setup(t,suffix,options={}){
  const rootDir=fs.mkdtempSync(path.join(os.tmpdir(),`sash-v09-${suffix}-`));
  t.after(()=>fs.rmSync(rootDir,{recursive:true,force:true}));
  const envelope=makeTransport(suffix,options);
  const raw=JSON.stringify(envelope,null,2);
  const persisted=persistGeminiTransport(raw,{rootDir,...transportOptions});
  assert.equal(persisted.pass,true,JSON.stringify(persisted.errors));
  return{rootDir,envelope,raw,persisted,candidateId:envelope.candidates[0].id,batchId:envelope.batchId};
}

test('v0.9 persists SUBMITTED -> UNDER_REVIEW without mutating raw Gemini batch',t=>{
  const{rootDir,raw,persisted,candidateId,batchId}=setup(t,'REVIEW');
  const reviewed=persistCandidateUnderReview({rootDir,batchId,candidateId,at:'2026-09-02T05:11:00Z',by:'CHATGPT'});
  assert.equal(reviewed.pass,true,JSON.stringify(reviewed.errors));
  assert.equal(reviewed.candidateStatus,'UNDER_REVIEW');
  const state=loadEvidenceAdjudicationStore(rootDir);
  assert.equal(state.candidateStates[0].status,'UNDER_REVIEW');
  assert.deepEqual(state.candidateStates[0].history,[{from:'SUBMITTED',to:'UNDER_REVIEW',at:'2026-09-02T05:11:00Z',by:'CHATGPT'}]);
  assert.equal(fs.readFileSync(persisted.batchPath,'utf8'),raw);
});

test('v0.9 ACCEPT durably promotes only adjudicated Candidate to VERIFIED Canonical Evidence',t=>{
  const{rootDir,candidateId,batchId}=setup(t,'ACCEPT');
  assert.equal(persistCandidateUnderReview({rootDir,batchId,candidateId}).pass,true);
  const result=adjudicatePersistedCandidate({
    rootDir,batchId,candidateId,decision:'ACCEPT',canonicalEvidenceId:'EV-V09-ACCEPT-001',
    reason:'Official PDF locator and atomic claim were independently checked.',knownFields,nodeIds,
    at:'2026-09-02T05:12:00Z'
  });
  assert.equal(result.pass,true,JSON.stringify(result.errors));
  assert.equal(result.status,'CANONICAL_EVIDENCE_PROMOTED');
  assert.equal(result.canonicalEvidence.status,'VERIFIED');
  assert.equal(result.canonicalWritePerformed,true);
  assert.equal(result.productionMasterWritePerformed,false);
  const state=loadEvidenceAdjudicationStore(rootDir);
  assert.equal(state.canonicalEvidence.length,1);
  assert.equal(state.canonicalEvidence[0].adjudication.sourceCandidateId,candidateId);
  assert.equal(state.adjudications[0].decision,'ACCEPT');
  assert.equal(state.candidateStates[0].status,'ADJUDICATED');
});

test('v0.9 REJECT keeps durable audit and creates no Canonical Evidence',t=>{
  const{rootDir,candidateId,batchId}=setup(t,'REJECT');
  const result=adjudicatePersistedCandidate({rootDir,batchId,candidateId,decision:'REJECT',reason:'Claim is not accepted for Canonical use.'});
  assert.equal(result.pass,true,JSON.stringify(result.errors));
  assert.equal(result.status,'CANDIDATE_REJECTED_WITH_AUDIT');
  const state=loadEvidenceAdjudicationStore(rootDir);
  assert.equal(state.adjudications.length,1);
  assert.equal(state.adjudications[0].decision,'REJECT');
  assert.equal(state.canonicalEvidence.length,0);
  assert.equal(state.candidateStates[0].status,'ADJUDICATED');
});

test('v0.9 PENDING is linked to persistent lifecycle and RESOLVED requires known Evidence',t=>{
  const{rootDir,candidateId,batchId}=setup(t,'PENDING');
  const adjudicated=adjudicatePersistedCandidate({
    rootDir,batchId,candidateId,decision:'PENDING',pendingId:'PEND-V09-001',pendingSeverity:'BLOCKING',
    pendingQuestion:'Confirm exact frame applicability.',reason:'Additional verification is required.'
  });
  assert.equal(adjudicated.pass,true,JSON.stringify(adjudicated.errors));
  assert.equal(adjudicated.pending.status,'OPEN');
  const investigating=transitionPersistedPending({rootDir,pendingId:'PEND-V09-001',nextStatus:'INVESTIGATING',at:'2026-09-02T05:13:00Z'});
  assert.equal(investigating.pass,true,JSON.stringify(investigating.errors));
  const unknown=transitionPersistedPending({
    rootDir,pendingId:'PEND-V09-001',nextStatus:'RESOLVED',evidenceIds:['EV-NOT-KNOWN'],resolutionNote:'test'
  });
  assert.equal(unknown.pass,false);
  assert.ok(unknown.errors.some((row)=>row.code==='PENDING_RESOLUTION_EVIDENCE_UNKNOWN'));
  const resolved=transitionPersistedPending({
    rootDir,pendingId:'PEND-V09-001',nextStatus:'RESOLVED',evidenceIds:['EV-EXTERNAL-VERIFIED'],externalCanonicalEvidenceIds:['EV-EXTERNAL-VERIFIED'],
    resolutionNote:'Resolved against independently verified external Canonical Evidence.',at:'2026-09-02T05:14:00Z'
  });
  assert.equal(resolved.pass,true,JSON.stringify(resolved.errors));
  assert.equal(resolved.pending.status,'RESOLVED');
  assert.deepEqual(resolved.pending.resolutionEvidenceIds,['EV-EXTERNAL-VERIFIED']);
});

test('v0.9 Canonical promotion rejects semantic duplicate already promoted from another Inbox batch',t=>{
  const first=setup(t,'DUPA');
  const secondEnvelope=makeTransport('DUPB');
  const secondRaw=JSON.stringify(secondEnvelope,null,2);
  const secondPersist=persistGeminiTransport(secondRaw,{rootDir:first.rootDir,allowDuplicateClaims:true,...transportOptions});
  assert.equal(secondPersist.pass,true,JSON.stringify(secondPersist.errors));
  const firstAccepted=adjudicatePersistedCandidate({
    rootDir:first.rootDir,batchId:first.batchId,candidateId:first.candidateId,decision:'ACCEPT',canonicalEvidenceId:'EV-V09-DUP-A',
    reason:'First verified source claim.',knownFields,nodeIds
  });
  assert.equal(firstAccepted.pass,true,JSON.stringify(firstAccepted.errors));
  const duplicate=adjudicatePersistedCandidate({
    rootDir:first.rootDir,batchId:secondEnvelope.batchId,candidateId:secondEnvelope.candidates[0].id,decision:'ACCEPT',canonicalEvidenceId:'EV-V09-DUP-B',
    reason:'Second extraction of same source claim.',knownFields,nodeIds
  });
  assert.equal(duplicate.pass,false);
  assert.equal(duplicate.status,'CANONICAL_PROMOTION_REJECTED');
  assert.ok(duplicate.errors.some((row)=>row.code==='CANONICAL_EVIDENCE_DUPLICATE_CLAIM'));
});

test('v0.9 Canonical promotion also checks pre-existing external Canonical Evidence',t=>{
  const{rootDir,envelope,candidateId,batchId}=setup(t,'EXTDUP');
  const candidate=envelope.candidates[0];
  const external={
    schemaVersion:'1.0',id:'EV-EXTERNAL-SAME-CLAIM',productId:candidate.productId,status:'VERIFIED',strength:'EXPLICIT',
    title:'Existing Canonical Evidence',subjectField:candidate.subjectField,claim:candidate.claim,productNodeIds:[...candidate.productNodeIds],source:{...candidate.source},
    adjudication:{adjudicatedBy:'HUMAN'}
  };
  const duplicate=adjudicatePersistedCandidate({
    rootDir,batchId,candidateId,decision:'ACCEPT',canonicalEvidenceId:'EV-V09-EXTDUP',reason:'Attempt duplicate promotion.',
    existingCanonicalEvidence:[external],knownFields,nodeIds
  });
  assert.equal(duplicate.pass,false);
  assert.ok(duplicate.errors.some((row)=>row.code==='CANONICAL_EVIDENCE_DUPLICATE_CLAIM'));
  assert.equal(loadEvidenceAdjudicationStore(rootDir).canonicalEvidence.length,0);
});

test('v0.9 keeps Gemini/NotebookLM unable to self-adjudicate persistent Canonical Evidence',t=>{
  const{rootDir,candidateId,batchId}=setup(t,'SELFAUTH');
  const result=adjudicatePersistedCandidate({
    rootDir,batchId,candidateId,decision:'ACCEPT',canonicalEvidenceId:'EV-V09-FORBIDDEN',reason:'Self adjudication attempt.',
    adjudicatorType:'GEMINI_NOTEBOOKLM',adjudicatedBy:'GEMINI_NOTEBOOKLM',knownFields,nodeIds
  });
  assert.equal(result.pass,false);
  assert.equal(result.status,'ADJUDICATION_REJECTED');
  assert.ok(result.errors.some((row)=>row.code==='ADJUDICATION_DECISION_INVALID'));
  assert.equal(loadEvidenceAdjudicationStore(rootDir).canonicalEvidence.length,0);
});

test('v0.9 summary exposes durable decisions, Canonical promotions and unresolved PENDING counts',t=>{
  const{rootDir,candidateId,batchId}=setup(t,'SUMMARY');
  const result=adjudicatePersistedCandidate({
    rootDir,batchId,candidateId,decision:'PENDING',pendingId:'PEND-V09-SUMMARY',reason:'Need follow-up.'
  });
  assert.equal(result.pass,true,JSON.stringify(result.errors));
  const summary=evidenceAdjudicationSummary(rootDir);
  assert.equal(summary.candidateStates,1);
  assert.equal(summary.statuses.ADJUDICATED,1);
  assert.equal(summary.adjudications,1);
  assert.equal(summary.decisions.PENDING,1);
  assert.equal(summary.canonicalEvidence,0);
  assert.equal(summary.pending,1);
  assert.equal(summary.openPending,1);
});
