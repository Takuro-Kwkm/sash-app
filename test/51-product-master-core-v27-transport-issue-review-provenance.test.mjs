import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import crypto from'node:crypto';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';
import{registerPersistedTransportIssue}from'../src/product-master-core/transport-issue-lifecycle.mjs';
import{loadEvidenceAdjudicationStore,transitionPersistedPending}from'../src/product-master-core/evidence-adjudication-store.mjs';

const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'transport-issue-review-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function writeInbox(root,{governed=true,corruptTransportSha=false,batchId='BATCH-ISSUE-REVIEW-001'}={}){
  const inbox=path.join(root,'inbox');
  const batches=path.join(inbox,'batches');
  fs.mkdirSync(batches,{recursive:true});
  const sourceContext={type:'OFFICIAL_PDF',driveFileId:'DRIVE-ISSUE-001',title:'official-issue.pdf',version:'202609'};
  const envelope={
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId,generatedAt:'2026-09-05T10:00:00Z',producer:{system:'GEMINI_ANTIGRAVITY',mode:'LIVE_EXTERNAL'},productId:'SER-LIXIL-ISSUE-TEST',sourceContext,
    candidates:[],issues:[{id:'ISSUE-REVIEW-001',type:'MISSING_EVIDENCE',subjectField:'window_type',question:'Confirm whether this window type is explicitly supported.',sourceHint:'PDF page 12'}]
  };
  const raw=`${JSON.stringify(envelope)}\n`;
  const rawSha=sha256(raw);
  fs.writeFileSync(path.join(batches,`${batchId}.json`),raw);
  const executionContext=governed?{
    workerContractVersion:'1.1',executionMode:'LIVE_EXTERNAL',executionChannel:'GEMINI_AI_PRO',preferredExecutionChannel:'GEMINI_AI_PRO',fallbackExecutionChannel:'GEMINI_API',fallbackAllowed:false,fallbackFrom:null,fallbackReason:null,transportMethod:'GEMINI_AI_PRO_STRUCTURED_HANDOFF',executionReference:'GITHUB_ACTIONS_RUN:repo:issue:1',model:null,
    sourceAcquisition:{status:'PASS'},sourceDelivery:{status:'PASS'},geminiExecution:{status:'SUCCEEDED'},
    transportProvenance:{
      schemaVersion:'1.1',recordType:'PRODUCT_MASTER_TRANSPORT_PROVENANCE',status:'PASS',productId:'SER-LIXIL-ISSUE-TEST',executionChannel:'GEMINI_AI_PRO',executionReference:'GITHUB_ACTIONS_RUN:repo:issue:1',
      rawResponseSha256:corruptTransportSha?'f'.repeat(64):rawSha,normalizedEnvelopeSha256:'e'.repeat(64),
      transport:{batchId,productId:'SER-LIXIL-ISSUE-TEST',sourceContext,producer:{system:'GEMINI_ANTIGRAVITY',mode:'LIVE_EXTERNAL'}},
      executionBinding:{executionSurface:'ANTIGRAVITY_CLI',rawResponseSha256:corruptTransportSha?'f'.repeat(64):rawSha}
    }
  }:null;
  const entry={batchId,importedAt:'2026-09-05T10:01:00Z',generatedAt:envelope.generatedAt,producer:envelope.producer,productId:envelope.productId,sourceContext,relativePath:`batches/${batchId}.json`,rawSha256:rawSha,candidateIds:[],issueIds:['ISSUE-REVIEW-001'],candidateFingerprints:[]};
  if(executionContext)entry.executionContext=executionContext;
  fs.writeFileSync(path.join(inbox,'manifest.json'),`${JSON.stringify({inboxSchemaVersion:'1.0',recordType:'EVIDENCE_INBOX_MANIFEST',updatedAt:'2026-09-05T10:01:00Z',batches:[entry]},null,2)}\n`);
  return{inbox,rawSha,batchId};
}

test('v2.7 governed Transport Issue is visible, provenance-bound, linked to PENDING and resolvable',t=>{
  const root=fixtureRoot(t);
  const {inbox,rawSha,batchId}=writeInbox(root);
  const change=path.join(root,'change');
  fs.mkdirSync(change,{recursive:true});

  let queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-ISSUE-TEST'});
  let item=queue.items.find((row)=>row.kind==='EVIDENCE_TRANSPORT_ISSUE');
  assert.ok(item);
  assert.equal(item.reviewStatus,'NEEDS_REVIEW');
  assert.equal(item.sourceStatus,'UNLINKED');
  assert.equal(item.nextAction,'LINK_TRANSPORT_ISSUE_TO_PENDING');
  assert.equal(item.refs.reviewProvenance.status,'PASS');
  assert.equal(item.refs.reviewProvenance.governed,true);
  assert.equal(item.refs.reviewProvenance.batchRawSha256,rawSha);
  assert.equal(item.refs.reviewProvenance.executionChannel,'GEMINI_AI_PRO');
  assert.equal(queue.summary.byKind.EVIDENCE_TRANSPORT_ISSUE,1);

  const linked=registerPersistedTransportIssue({rootDir:inbox,batchId,issueId:'ISSUE-REVIEW-001',pendingId:'PEND-ISSUE-REVIEW-001',severity:'BLOCKING',at:'2026-09-05T10:02:00Z',by:'CHATGPT'});
  assert.equal(linked.pass,true,linked.errors?.[0]?.message);
  assert.equal(linked.reviewProvenance.status,'PASS');
  assert.equal(linked.pending.reviewProvenance.batchRawSha256,rawSha);
  assert.equal(linked.pending.severity,'BLOCKING');

  queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-ISSUE-TEST'});
  item=queue.items.find((row)=>row.kind==='EVIDENCE_TRANSPORT_ISSUE');
  assert.equal(item.reviewStatus,'NEEDS_REVIEW');
  assert.equal(item.sourceStatus,'OPEN');
  assert.equal(item.nextAction,'RESOLVE_TRANSPORT_ISSUE_PENDING');
  assert.equal(item.refs.pendingId,'PEND-ISSUE-REVIEW-001');
  assert.equal(item.refs.reviewProvenance.status,'PASS');

  const resolved=transitionPersistedPending({rootDir:inbox,pendingId:'PEND-ISSUE-REVIEW-001',nextStatus:'RESOLVED',technicalFactIds:['TF-ISSUE-REVIEW-001'],externalTechnicalFactIds:['TF-ISSUE-REVIEW-001'],resolutionNote:'Verified by an independent official source review.',at:'2026-09-05T10:03:00Z',by:'CHATGPT'});
  assert.equal(resolved.pass,true,resolved.errors?.[0]?.message);
  queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-ISSUE-TEST'});
  item=queue.items.find((row)=>row.kind==='EVIDENCE_TRANSPORT_ISSUE');
  assert.equal(item.reviewStatus,'RESOLVED');
  assert.equal(item.actionable,false);
  assert.equal(item.nextAction,'NONE');
  assert.equal(queue.authorityBoundary.transportIssueResolution,'CHATGPT_OR_HUMAN');
  assert.equal(queue.authorityBoundary.geminiAdjudicationAllowed,false);
});

test('v2.7 corrupted governed Transport Issue provenance blocks queue and PENDING linkage',t=>{
  const root=fixtureRoot(t);
  const {inbox,batchId}=writeInbox(root,{corruptTransportSha:true});
  const change=path.join(root,'change');
  fs.mkdirSync(change,{recursive:true});
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-ISSUE-TEST'});
  const item=queue.items.find((row)=>row.kind==='EVIDENCE_TRANSPORT_ISSUE');
  assert.equal(item.reviewStatus,'BLOCKED');
  assert.equal(item.nextAction,'INSPECT_EVIDENCE_PROVENANCE');
  assert.ok(item.refs.provenanceErrors.some((row)=>row.code==='TRANSPORT_ISSUE_REVIEW_RAW_SHA_MISMATCH'));

  const linked=registerPersistedTransportIssue({rootDir:inbox,batchId,issueId:'ISSUE-REVIEW-001',pendingId:'PEND-ISSUE-BLOCKED'});
  assert.equal(linked.pass,false);
  assert.equal(linked.status,'TRANSPORT_ISSUE_PROVENANCE_BLOCKED');
  assert.equal(fs.existsSync(path.join(inbox,'adjudication-state.json')),false);
});

test('v2.7 legacy Transport Issue remains reviewable without mutating historical PENDING shape',t=>{
  const root=fixtureRoot(t);
  const {inbox,batchId}=writeInbox(root,{governed:false,batchId:'BATCH-ISSUE-LEGACY'});
  const change=path.join(root,'change');
  fs.mkdirSync(change,{recursive:true});
  let queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-ISSUE-TEST'});
  let item=queue.items.find((row)=>row.kind==='EVIDENCE_TRANSPORT_ISSUE');
  assert.equal(item.reviewStatus,'NEEDS_REVIEW');
  assert.equal(item.refs.reviewProvenance.status,'LEGACY_COMPATIBLE');
  assert.equal(item.refs.reviewProvenance.governed,false);
  assert.equal(item.refs.reviewProvenance.executionChannel,null);

  const linked=registerPersistedTransportIssue({rootDir:inbox,batchId,issueId:'ISSUE-REVIEW-001',pendingId:'PEND-ISSUE-LEGACY',at:'2026-09-05T10:04:00Z'});
  assert.equal(linked.pass,true);
  assert.equal(linked.reviewProvenance.status,'LEGACY_COMPATIBLE');
  assert.equal(linked.pending.reviewProvenance,undefined);
  const store=loadEvidenceAdjudicationStore(inbox);
  assert.equal(store.pending[0].reviewProvenance,undefined);

  queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-ISSUE-TEST'});
  item=queue.items.find((row)=>row.kind==='EVIDENCE_TRANSPORT_ISSUE');
  assert.equal(item.refs.reviewProvenance.status,'LEGACY_COMPATIBLE');
  assert.equal(item.sourceStatus,'OPEN');
});
