import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{
  buildAiProGeminiExecutionAudit,
  buildApiGeminiExecutionAudit,
  validateGeminiExecutionAudit
}from'../src/product-master-core/gemini-execution-contract.mjs';
import{persistGeminiExecutionForBatch}from'../src/product-master-core/gemini-execution-store.mjs';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';

const SHA_A='a'.repeat(64);
const SHA_B='b'.repeat(64);
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'gemini-execution-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function job(channel='GEMINI_AI_PRO'){
  return{
    jobId:`GJOB-EXEC-${channel}`,manufacturer:'LIXIL',series:'TEST',productId:'SER-LIXIL-TEST',
    executionMode:'LIVE_EXTERNAL',executionChannel:channel,preferredExecutionChannel:'GEMINI_AI_PRO',fallbackExecutionChannel:'GEMINI_API',fallbackAllowed:false,
    fallbackFrom:null,fallbackReason:null,transportMethod:channel==='GEMINI_AI_PRO'?'GEMINI_AI_PRO_STRUCTURED_HANDOFF':'GEMINI_API_DIRECT_RESPONSE',
    executionReference:`GITHUB_ACTIONS_RUN:repo:${channel}:1`,model:channel==='GEMINI_API'?'gemini-3.8-flash':null
  };
}

function acquisition(channel='GEMINI_AI_PRO'){
  return{
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_SOURCE_ACQUISITION',status:'PASS',manufacturer:'LIXIL',series:'TEST',productId:'SER-LIXIL-TEST',executionChannel:channel,
    source:{type:'OFFICIAL_PDF',driveFileId:'DRIVE-SOURCE-001',title:'official.pdf',version:'202609',officialDownloadUrl:'https://example.invalid/source.pdf',officialDetailUrl:'https://example.invalid/detail',authoritativeSha256:SHA_A,pageCount:20},
    scope:{pdfPages:[6,7,8],printedPages:[4,5,6],canonicalFields:['window_type']},
    retrieval:{method:'OFFICIAL_DOWNLOAD_URL',requestedUrl:'https://example.invalid/source.pdf',resolvedUrl:'https://cdn.example.invalid/final.pdf',referer:'https://example.invalid/detail',contentType:'application/pdf',sizeBytes:4096,acquiredSha256:SHA_A},
    identity:{mode:'FULL_BYTE_IDENTITY',fullDocumentByteIdentity:true,authoritativeSha256:SHA_A,acquiredSha256:SHA_A,scopedContentEquivalence:{mode:'FULL_BYTE_IDENTITY'}},
    scopeValidation:{pdfScopeWithinAuthoritativePageCount:true,printedToPdfMappingComplete:true},localArtifact:{persisted:true,fileName:'official-source.pdf'},credentialMaterialPersisted:false
  };
}

function delivery(channel='GEMINI_AI_PRO'){
  const aiPro=channel==='GEMINI_AI_PRO';
  return{
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_SOURCE_DELIVERY',status:'PASS',executionChannel:channel,executionReference:job(channel).executionReference,
    source:{driveFileId:'DRIVE-SOURCE-001',title:'official.pdf',version:'202609',acquiredSha256:SHA_A,identityMode:'FULL_BYTE_IDENTITY'},
    scope:{pdfPages:[6,7,8],printedPages:[4,5,6],canonicalFields:['window_type']},
    delivery:aiPro
      ?{method:'INLINE_VERIFIED_PAGE_SCOPED_TEXT',evidenceDeliveryMode:'INLINE_VERIFIED_PAGE_SCOPED_TEXT',artifactSha256:SHA_B,artifactBytes:300,pageAudit:[],extractor:'pypdf',extractorVersion:'6.0.0'}
      :{method:'GEMINI_FILE_ATTACHMENT',evidenceDeliveryMode:'VERIFIED_PDF_FILE_ATTACHMENT_WITH_SCOPED_PROMPT',sourceSha256:SHA_A,fileSizeBytes:4096,mimeType:'application/pdf',providerFileName:'files/abc',providerState:'ACTIVE'},
    providerAttachmentReference:aiPro?null:'https://generativelanguage.googleapis.com/v1beta/files/abc',credentialMaterialPersisted:false
  };
}

test('v2.7 AI Pro execution audit preserves unknown model and binds provider output fingerprint',()=>{
  const j=job('GEMINI_AI_PRO');
  const built=buildAiProGeminiExecutionAudit({
    job:j,sourceAcquisition:acquisition('GEMINI_AI_PRO'),sourceDelivery:delivery('GEMINI_AI_PRO'),rawResponseSha256:SHA_A,
    antigravityAudit:{status:'SUCCESS',conversation_id:'conv-1',duration_seconds:12.5,num_turns:1,usage:{input_tokens:100},structured_output_sha256:SHA_A,authenticationMode:'GOOGLE_AI_PRO_OAUTH',producerSystem:'GEMINI_ANTIGRAVITY',permissionDeniedActions:[],canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false}
  });
  assert.equal(built.pass,true);
  assert.equal(built.record.status,'SUCCEEDED');
  assert.equal(built.record.executionChannel,'GEMINI_AI_PRO');
  assert.equal(built.record.surface.id,'ANTIGRAVITY_CLI');
  assert.equal(built.record.surface.model,null);
  assert.equal(built.record.surface.modelKnown,false);
  assert.equal(built.record.preflight.credentialValuePersisted,false);
  assert.equal(built.record.result.rawResponseSha256,SHA_A);
  assert.equal(built.record.source.delivery.artifactSha256,SHA_B);
  assert.equal(built.record.authority.canonicalWritePerformed,false);
  assert.equal(validateGeminiExecutionAudit(built.record,{job:j,sourceAcquisition:acquisition('GEMINI_AI_PRO'),sourceDelivery:delivery('GEMINI_AI_PRO'),rawResponseSha256:SHA_A}).pass,true);
});

test('v2.7 AI Pro execution audit fails closed when surface output hash differs from governed response',()=>{
  const built=buildAiProGeminiExecutionAudit({
    job:job('GEMINI_AI_PRO'),sourceAcquisition:acquisition('GEMINI_AI_PRO'),sourceDelivery:delivery('GEMINI_AI_PRO'),rawResponseSha256:SHA_A,
    antigravityAudit:{status:'SUCCESS',structured_output_sha256:SHA_B,authenticationMode:'GOOGLE_AI_PRO_OAUTH',producerSystem:'GEMINI_ANTIGRAVITY',permissionDeniedActions:[],canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false}
  });
  assert.equal(built.pass,false);
  assert.ok(built.errors.some((row)=>row.code==='GEMINI_EXECUTION_RESPONSE_SHA_MISMATCH'));
});

test('v2.7 Gemini API execution audit requires explicit model and READY credential preflight',()=>{
  const j=job('GEMINI_API');
  const result={
    pass:true,status:'IMPORTED',rawResponseSha256:SHA_B,transientRetryCount:1,transientRetryAudit:[{attempt:1,httpStatus:503,delayMs:1000,reason:'GEMINI_API_ERROR'}],
    credentialPreflight:{pass:true,status:'READY',credential:{apiKeyPresent:true,apiKeySource:'ENV:GEMINI_API_KEY',model:'gemini-3.8-flash',modelSource:'JOB_MODEL'},safety:{apiKeyCliAllowed:false,apiKeyValueReturned:false,secretEchoAllowed:false}},
    canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false
  };
  const built=buildApiGeminiExecutionAudit({job:j,sourceAcquisition:acquisition('GEMINI_API'),sourceDelivery:delivery('GEMINI_API'),result});
  assert.equal(built.pass,true);
  assert.equal(built.record.surface.id,'GOOGLE_GEMINI_API');
  assert.equal(built.record.surface.model,'gemini-3.8-flash');
  assert.equal(built.record.surface.modelKnown,true);
  assert.equal(built.record.preflight.credentialPresent,true);
  assert.equal(built.record.preflight.credentialValuePersisted,false);
  assert.equal(built.record.result.transientRetryCount,1);
  assert.equal(built.record.source.delivery.providerAttachmentReference,'https://generativelanguage.googleapis.com/v1beta/files/abc');

  const noModel={...j,model:null};
  const blocked=buildApiGeminiExecutionAudit({job:noModel,sourceAcquisition:acquisition('GEMINI_API'),sourceDelivery:delivery('GEMINI_API'),result});
  assert.equal(blocked.pass,false);
  assert.ok(blocked.errors.some((row)=>row.code==='GEMINI_EXECUTION_MODEL_MISSING'));
});

test('v2.7 Gemini execution audit persists into Inbox and Review Queue refs',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const change=path.join(root,'change');
  fs.mkdirSync(path.join(inbox,'batches'),{recursive:true});
  fs.mkdirSync(change,{recursive:true});
  const batchId='BATCH-GEMINI-EXEC-V27-001';
  const sourceContext={type:'OFFICIAL_PDF',driveFileId:'DRIVE-SOURCE-001',title:'official.pdf',version:'202609'};
  const envelope={
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId,generatedAt:'2026-09-05T05:40:00Z',producer:{system:'GEMINI_ANTIGRAVITY',mode:'LIVE_EXTERNAL'},productId:'SER-LIXIL-TEST',sourceContext,
    candidates:[{recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-GEMINI-EXEC-V27-001',sourceSystem:'GEMINI_ANTIGRAVITY',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:'SER-LIXIL-TEST',subjectField:'window_type',claim:'Scoped source explicitly names a window type.',proposedStrength:'EXPLICIT',productNodeIds:[],source:{...sourceContext,printedPage:4,pdfPage:6,locatorText:'window type'}}],issues:[]
  };
  fs.writeFileSync(path.join(inbox,'batches',`${batchId}.json`),`${JSON.stringify(envelope)}\n`);
  fs.writeFileSync(path.join(inbox,'manifest.json'),`${JSON.stringify({inboxSchemaVersion:'1.0',recordType:'EVIDENCE_INBOX_MANIFEST',updatedAt:'2026-09-05T05:40:01Z',batches:[{batchId,importedAt:'2026-09-05T05:40:01Z',generatedAt:envelope.generatedAt,producer:envelope.producer,productId:envelope.productId,sourceContext,executionContext:{workerContractVersion:'1.1',executionMode:'LIVE_EXTERNAL',executionChannel:'GEMINI_AI_PRO',executionReference:job('GEMINI_AI_PRO').executionReference,sourceAcquisition:acquisition('GEMINI_AI_PRO'),sourceDelivery:delivery('GEMINI_AI_PRO')},relativePath:`batches/${batchId}.json`,rawSha256:'x',candidateIds:['CAND-GEMINI-EXEC-V27-001'],issueIds:[],candidateFingerprints:[]}]},null,2)}\n`);
  const j=job('GEMINI_AI_PRO');
  const built=buildAiProGeminiExecutionAudit({job:j,sourceAcquisition:acquisition('GEMINI_AI_PRO'),sourceDelivery:delivery('GEMINI_AI_PRO'),rawResponseSha256:SHA_A,antigravityAudit:{status:'SUCCESS',structured_output_sha256:SHA_A,authenticationMode:'GOOGLE_AI_PRO_OAUTH',producerSystem:'GEMINI_ANTIGRAVITY',permissionDeniedActions:[],canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false}});
  assert.equal(built.pass,true);
  const persisted=persistGeminiExecutionForBatch({evidenceInboxDir:inbox,batchId,record:built.record,job:j,sourceAcquisition:acquisition('GEMINI_AI_PRO'),sourceDelivery:delivery('GEMINI_AI_PRO'),rawResponseSha256:SHA_A});
  assert.equal(persisted.pass,true);
  const manifest=JSON.parse(fs.readFileSync(path.join(inbox,'manifest.json'),'utf8'));
  assert.equal(manifest.batches[0].executionContext.geminiExecution.status,'SUCCEEDED');
  assert.equal(manifest.batches[0].executionContext.geminiExecution.surface.id,'ANTIGRAVITY_CLI');
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-TEST'});
  const item=queue.items.find((row)=>row.kind==='EVIDENCE_CANDIDATE');
  assert.ok(item);
  assert.equal(item.refs.executionContext.geminiExecution.status,'SUCCEEDED');
  assert.equal(item.refs.executionContext.geminiExecution.result.rawResponseSha256,SHA_A);
});
