import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import crypto from'node:crypto';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';
import{persistCandidateUnderReview,adjudicatePersistedCandidate,loadEvidenceAdjudicationStore}from'../src/product-master-core/evidence-adjudication-store.mjs';

const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'evidence-review-provenance-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function envelope(batchId='BATCH-REVIEW-001'){
  const sourceContext={type:'OFFICIAL_PDF',driveFileId:'DRIVE-REVIEW-001',title:'official.pdf',version:'202609'};
  return{
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId,generatedAt:'2026-09-05T09:00:00Z',producer:{system:'GEMINI_ANTIGRAVITY',mode:'LIVE_EXTERNAL'},productId:'SER-LIXIL-TEST',sourceContext,
    candidates:[{recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-REVIEW-001',sourceSystem:'GEMINI_ANTIGRAVITY',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:'SER-LIXIL-TEST',title:'Window type',subjectField:'window_type',claim:'Official source explicitly identifies a window type.',proposedStrength:'EXPLICIT',productNodeIds:[],source:{...sourceContext,printedPage:4,pdfPage:6,locatorText:'window type'}}],issues:[]
  };
}

function writeInbox(root,{governed=true,corruptTransportSha=false,batchId='BATCH-REVIEW-001'}={}){
  const inbox=path.join(root,'inbox');
  const batches=path.join(inbox,'batches');
  fs.mkdirSync(batches,{recursive:true});
  const env=envelope(batchId);
  const raw=`${JSON.stringify(env)}\n`;
  const rawSha=sha256(raw);
  fs.writeFileSync(path.join(batches,`${batchId}.json`),raw);
  const executionContext=governed?{
    workerContractVersion:'1.1',executionMode:'LIVE_EXTERNAL',executionChannel:'GEMINI_AI_PRO',preferredExecutionChannel:'GEMINI_AI_PRO',fallbackExecutionChannel:'GEMINI_API',fallbackAllowed:false,fallbackFrom:null,fallbackReason:null,transportMethod:'GEMINI_AI_PRO_STRUCTURED_HANDOFF',executionReference:'GITHUB_ACTIONS_RUN:repo:review:1',model:null,
    sourceAcquisition:{status:'PASS'},sourceDelivery:{status:'PASS'},geminiExecution:{status:'SUCCEEDED'},
    transportProvenance:{
      schemaVersion:'1.1',recordType:'PRODUCT_MASTER_TRANSPORT_PROVENANCE',status:'PASS',productId:'SER-LIXIL-TEST',executionChannel:'GEMINI_AI_PRO',executionReference:'GITHUB_ACTIONS_RUN:repo:review:1',
      rawResponseSha256:corruptTransportSha?'f'.repeat(64):rawSha,normalizedEnvelopeSha256:'e'.repeat(64),
      transport:{batchId,productId:'SER-LIXIL-TEST',sourceContext:{...env.sourceContext},producer:{system:'GEMINI_ANTIGRAVITY',mode:'LIVE_EXTERNAL'}},
      executionBinding:{executionSurface:'ANTIGRAVITY_CLI',rawResponseSha256:corruptTransportSha?'f'.repeat(64):rawSha}
    }
  }:null;
  const entry={batchId,importedAt:'2026-09-05T09:01:00Z',generatedAt:env.generatedAt,producer:env.producer,productId:env.productId,sourceContext:env.sourceContext,relativePath:`batches/${batchId}.json`,rawSha256:rawSha,candidateIds:['CAND-REVIEW-001'],issueIds:[],candidateFingerprints:[]};
  if(executionContext)entry.executionContext=executionContext;
  fs.writeFileSync(path.join(inbox,'manifest.json'),`${JSON.stringify({inboxSchemaVersion:'1.0',recordType:'EVIDENCE_INBOX_MANIFEST',updatedAt:'2026-09-05T09:01:00Z',batches:[entry]},null,2)}\n`);
  return{inbox,rawSha};
}

test('v2.7 governed Evidence review binds adjudication and Canonical Evidence to Transport provenance',t=>{
  const root=fixtureRoot(t);
  const {inbox,rawSha}=writeInbox(root);
  const change=path.join(root,'change');
  fs.mkdirSync(change,{recursive:true});

  let queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-TEST'});
  let item=queue.items.find((row)=>row.kind==='EVIDENCE_CANDIDATE');
  assert.equal(item.reviewStatus,'SUBMITTED');
  assert.equal(item.refs.reviewProvenance.status,'PASS');
  assert.equal(item.refs.reviewProvenance.governed,true);
  assert.equal(item.refs.reviewProvenance.batchRawSha256,rawSha);
  assert.equal(item.refs.reviewProvenance.executionChannel,'GEMINI_AI_PRO');

  const review=persistCandidateUnderReview({rootDir:inbox,batchId:'BATCH-REVIEW-001',candidateId:'CAND-REVIEW-001',at:'2026-09-05T09:02:00Z',by:'CHATGPT'});
  assert.equal(review.pass,true);
  assert.equal(review.reviewProvenance.status,'PASS');

  const accepted=adjudicatePersistedCandidate({rootDir:inbox,batchId:'BATCH-REVIEW-001',candidateId:'CAND-REVIEW-001',decision:'ACCEPT',adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',reason:'Source locator and claim are explicit and consistent.',canonicalEvidenceId:'EVID-REVIEW-001',at:'2026-09-05T09:03:00Z'});
  assert.equal(accepted.pass,true,accepted.errors?.[0]?.message);
  assert.equal(accepted.reviewProvenance.status,'PASS');
  assert.equal(accepted.canonicalEvidence.provenance.reviewProvenance.batchRawSha256,rawSha);
  assert.equal(accepted.canonicalEvidence.provenance.reviewProvenance.transportProvenance.batchId,'BATCH-REVIEW-001');

  const store=loadEvidenceAdjudicationStore(inbox);
  assert.equal(store.adjudications[0].reviewProvenance.status,'PASS');
  assert.equal(store.adjudications[0].adjudicatorType,'CHATGPT');
  assert.equal(store.canonicalEvidence[0].provenance.reviewProvenance.executionChannel,'GEMINI_AI_PRO');

  queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-TEST'});
  item=queue.items.find((row)=>row.kind==='EVIDENCE_CANDIDATE');
  assert.equal(item.reviewStatus,'APPROVED');
  assert.equal(item.refs.reviewProvenance.status,'PASS');
  assert.equal(queue.authorityBoundary.evidenceAdjudication,'CHATGPT_OR_HUMAN');
  assert.equal(queue.authorityBoundary.geminiAdjudicationAllowed,false);
  assert.equal(queue.authorityBoundary.masterChangeApproval,'HUMAN_REQUIRED');
});

test('v2.7 corrupted governed Transport provenance blocks Review Queue and adjudication',t=>{
  const root=fixtureRoot(t);
  const {inbox}=writeInbox(root,{corruptTransportSha:true});
  const change=path.join(root,'change');
  fs.mkdirSync(change,{recursive:true});
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-TEST'});
  const item=queue.items.find((row)=>row.kind==='EVIDENCE_CANDIDATE');
  assert.equal(item.reviewStatus,'BLOCKED');
  assert.equal(item.nextAction,'INSPECT_EVIDENCE_PROVENANCE');
  assert.ok(item.refs.provenanceErrors.some((row)=>row.code==='REVIEW_PROVENANCE_RAW_SHA_MISMATCH'));

  const review=persistCandidateUnderReview({rootDir:inbox,batchId:'BATCH-REVIEW-001',candidateId:'CAND-REVIEW-001'});
  assert.equal(review.pass,false);
  assert.equal(review.status,'REVIEW_PROVENANCE_BLOCKED');
  const adjudicated=adjudicatePersistedCandidate({rootDir:inbox,batchId:'BATCH-REVIEW-001',candidateId:'CAND-REVIEW-001',decision:'REJECT',adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',reason:'Test rejection'});
  assert.equal(adjudicated.pass,false);
  assert.equal(adjudicated.status,'ADJUDICATION_PROVENANCE_BLOCKED');
  assert.equal(fs.existsSync(path.join(inbox,'adjudication-state.json')),false);
});

test('v2.7 legacy Inbox remains reviewable without invented execution channel',t=>{
  const root=fixtureRoot(t);
  const {inbox}=writeInbox(root,{governed:false,batchId:'BATCH-LEGACY-REVIEW'});
  const change=path.join(root,'change');
  fs.mkdirSync(change,{recursive:true});
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-TEST'});
  const item=queue.items.find((row)=>row.kind==='EVIDENCE_CANDIDATE');
  assert.equal(item.reviewStatus,'SUBMITTED');
  assert.equal(item.refs.reviewProvenance.status,'LEGACY_COMPATIBLE');
  assert.equal(item.refs.reviewProvenance.governed,false);
  assert.equal(item.refs.reviewProvenance.executionChannel,null);
  assert.equal(item.refs.reviewProvenance.executionReference,null);

  const rejected=adjudicatePersistedCandidate({rootDir:inbox,batchId:'BATCH-LEGACY-REVIEW',candidateId:'CAND-REVIEW-001',decision:'REJECT',adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',reason:'Legacy candidate lacks sufficient support.'});
  assert.equal(rejected.pass,true);
  assert.equal(rejected.reviewProvenance.status,'LEGACY_COMPATIBLE');
  assert.equal(rejected.reviewProvenance.executionChannel,null);
});

test('v2.7 Gemini cannot become Evidence adjudicator even with valid provenance',t=>{
  const root=fixtureRoot(t);
  const {inbox}=writeInbox(root);
  const result=adjudicatePersistedCandidate({rootDir:inbox,batchId:'BATCH-REVIEW-001',candidateId:'CAND-REVIEW-001',decision:'REJECT',adjudicatorType:'GEMINI',adjudicatedBy:'GEMINI',reason:'Worker self-approval must be forbidden.'});
  assert.equal(result.pass,false);
  assert.equal(result.status,'ADJUDICATION_REJECTED');
  assert.ok(result.errors.some((row)=>row.code==='ADJUDICATION_DECISION_INVALID'));
  assert.equal(fs.existsSync(path.join(inbox,'adjudication-state.json')),false);
});
