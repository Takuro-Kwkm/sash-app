import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import crypto from'node:crypto';
import{validateBridgeTransport}from'../src/product-master-core/gemini-execution-bridge.mjs';
import{buildAiProGeminiExecutionAudit}from'../src/product-master-core/gemini-execution-contract.mjs';
import{
  evaluateTransportPreInboxGuard,
  persistGeminiTransportAfterPreInboxGuard
}from'../src/product-master-core/transport-pre-inbox-guard.mjs';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';

const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'transport-pre-inbox-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function job(){
  return{
    jobId:'GJOB-PRE-INBOX-AIPRO',manufacturer:'LIXIL',series:'TEST',productId:'SER-LIXIL-TEST',
    workerContractVersion:'1.1',executionMode:'LIVE_EXTERNAL',executionChannel:'GEMINI_AI_PRO',preferredExecutionChannel:'GEMINI_AI_PRO',fallbackExecutionChannel:'GEMINI_API',fallbackAllowed:false,fallbackFrom:null,fallbackReason:null,
    transportMethod:'GEMINI_AI_PRO_STRUCTURED_HANDOFF',executionReference:'GITHUB_ACTIONS_RUN:repo:123:1',model:null,
    expectedTransportType:'EVIDENCE_CANDIDATE_BATCH',expectedSchemaVersion:'1.0',
    sourceContext:{type:'OFFICIAL_PDF',driveFileId:'DRIVE-001',title:'official.pdf',version:'202609'}
  };
}

function acquisition(){
  return{
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_SOURCE_ACQUISITION',status:'PASS',manufacturer:'LIXIL',series:'TEST',productId:'SER-LIXIL-TEST',executionChannel:'GEMINI_AI_PRO',
    source:{type:'OFFICIAL_PDF',driveFileId:'DRIVE-001',title:'official.pdf',version:'202609'},
    scope:{pdfPages:[6],printedPages:[4],canonicalFields:['window_type']},
    retrieval:{acquiredSha256:'a'.repeat(64)},identity:{mode:'FULL_BYTE_IDENTITY'},credentialMaterialPersisted:false
  };
}

function delivery(){
  return{
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_SOURCE_DELIVERY',status:'PASS',executionChannel:'GEMINI_AI_PRO',executionReference:job().executionReference,
    source:{driveFileId:'DRIVE-001',title:'official.pdf',version:'202609',acquiredSha256:'a'.repeat(64),identityMode:'FULL_BYTE_IDENTITY'},
    scope:{pdfPages:[6],printedPages:[4],canonicalFields:['window_type']},
    delivery:{method:'INLINE_VERIFIED_PAGE_SCOPED_TEXT',evidenceDeliveryMode:'INLINE_VERIFIED_PAGE_SCOPED_TEXT',artifactSha256:'b'.repeat(64),artifactBytes:100,pageAudit:[]},
    providerAttachmentReference:null,credentialMaterialPersisted:false
  };
}

function envelope({producer='GEMINI_ANTIGRAVITY'}={}){
  const sourceContext={type:'OFFICIAL_PDF',driveFileId:'DRIVE-001',title:'official.pdf',version:'202609'};
  return{
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId:'BATCH-PRE-INBOX-001',generatedAt:'2026-09-05T09:00:00Z',producer:{system:producer,mode:'LIVE_EXTERNAL'},productId:'SER-LIXIL-TEST',sourceContext,
    candidates:[{recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-PRE-INBOX-001',sourceSystem:producer,producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:'SER-LIXIL-TEST',subjectField:'window_type',claim:'Official source explicitly identifies the window type.',proposedStrength:'EXPLICIT',productNodeIds:[],source:{...sourceContext,printedPage:4,pdfPage:6,locatorText:'window type'}}],issues:[]
  };
}

function executionAudit(raw){
  const built=buildAiProGeminiExecutionAudit({
    job:job(),sourceAcquisition:acquisition(),sourceDelivery:delivery(),rawResponseSha256:sha256(raw),
    antigravityAudit:{status:'SUCCESS',structured_output_sha256:sha256(raw),authenticationMode:'GOOGLE_AI_PRO_OAUTH',producerSystem:'GEMINI_ANTIGRAVITY',permissionDeniedActions:[],canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false}
  });
  assert.equal(built.pass,true);
  return built.record;
}

test('v2.7 Pre-Inbox Guard binds Execution Audit to Transport and persists provenance before review',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const change=path.join(root,'change');
  fs.mkdirSync(change,{recursive:true});
  const raw=`${JSON.stringify(envelope())}\n`;
  const validation=validateBridgeTransport(raw,job());
  assert.equal(validation.pass,true);
  const persisted=persistGeminiTransportAfterPreInboxGuard(raw,{
    job:job(),transportValidation:validation,sourceAcquisition:acquisition(),sourceDelivery:delivery(),geminiExecution:executionAudit(raw),rootDir:inbox
  });
  assert.equal(persisted.pass,true);
  assert.equal(persisted.preInboxGuard.record.evidenceInboxWriteAllowed,true);
  assert.equal(persisted.transportProvenance.status,'PASS');
  assert.equal(persisted.transportProvenance.rawResponseSha256,sha256(raw));
  assert.equal(persisted.transportProvenance.transport.batchId,'BATCH-PRE-INBOX-001');

  const manifest=JSON.parse(fs.readFileSync(path.join(inbox,'manifest.json'),'utf8'));
  const ctx=manifest.batches[0].executionContext;
  assert.equal(ctx.geminiExecution.status,'SUCCEEDED');
  assert.equal(ctx.transportProvenance.status,'PASS');
  assert.equal(ctx.transportProvenance.executionBinding.rawResponseSha256,sha256(raw));
  assert.equal(ctx.transportProvenance.normalizedEnvelopeSha256,persisted.transportProvenance.normalizedEnvelopeSha256);

  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-TEST'});
  const item=queue.items.find((row)=>row.kind==='EVIDENCE_CANDIDATE');
  assert.ok(item);
  assert.equal(item.refs.executionContext.transportProvenance.status,'PASS');
  assert.equal(item.refs.executionContext.transportProvenance.transport.batchId,'BATCH-PRE-INBOX-001');
});

test('v2.7 Pre-Inbox Guard fails closed before manifest write when Execution Audit response hash differs',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const raw=`${JSON.stringify(envelope())}\n`;
  const validation=validateBridgeTransport(raw,job());
  const audit=executionAudit(raw);
  audit.result.rawResponseSha256='f'.repeat(64);
  const persisted=persistGeminiTransportAfterPreInboxGuard(raw,{
    job:job(),transportValidation:validation,sourceAcquisition:acquisition(),sourceDelivery:delivery(),geminiExecution:audit,rootDir:inbox
  });
  assert.equal(persisted.pass,false);
  assert.equal(persisted.status,'BLOCKED_AT_PRE_INBOX_GUARD');
  assert.equal(persisted.preInboxGuard.record.evidenceInboxWriteAllowed,false);
  assert.ok(persisted.errors.some((row)=>row.code==='GEMINI_EXECUTION_RESPONSE_SHA_MISMATCH'));
  assert.equal(fs.existsSync(path.join(inbox,'manifest.json')),false);
});

test('v2.7 Pre-Inbox Guard rejects producer/channel mismatch before Evidence Inbox persistence',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const raw=`${JSON.stringify(envelope({producer:'GEMINI_NOTEBOOKLM'}))}\n`;
  const validation=validateBridgeTransport(raw,job());
  assert.equal(validation.pass,true);
  const audit=executionAudit(raw);
  const guard=evaluateTransportPreInboxGuard({job:job(),raw,transportValidation:validation,sourceAcquisition:acquisition(),sourceDelivery:delivery(),geminiExecution:audit});
  assert.equal(guard.pass,false);
  assert.ok(guard.errors.some((row)=>row.code==='TRANSPORT_PROVENANCE_PRODUCER_CHANNEL_MISMATCH'));
  const persisted=persistGeminiTransportAfterPreInboxGuard(raw,{job:job(),transportValidation:validation,sourceAcquisition:acquisition(),sourceDelivery:delivery(),geminiExecution:audit,rootDir:inbox});
  assert.equal(persisted.pass,false);
  assert.equal(fs.existsSync(path.join(inbox,'manifest.json')),false);
});
