import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import crypto from'node:crypto';
import{buildAiProScopedTextDelivery}from'../src/product-master-core/source-delivery-contract.mjs';
import{buildAiProGeminiExecutionAudit}from'../src/product-master-core/gemini-execution-contract.mjs';
import{runGovernedGeminiV11}from'../src/product-master-core/governed-gemini-v11-runner.mjs';

const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'governed-v11-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function job(channel){
  return{
    jobSchemaVersion:'1.0',recordType:'GEMINI_PRODUCT_MASTER_JOB',jobId:`GJOB-GOV-${channel}`,jobType:'EVIDENCE_EXTRACTION',
    manufacturer:'LIXIL',series:'TEST',productId:'SER-LIXIL-TEST',task:'Extract evidence',prompt:'Extract only explicit evidence.',
    workerContractVersion:'1.1',executionMode:'LIVE_EXTERNAL',executionChannel:channel,preferredExecutionChannel:'GEMINI_AI_PRO',fallbackExecutionChannel:'GEMINI_API',fallbackAllowed:false,fallbackFrom:null,fallbackReason:null,
    transportMethod:channel==='GEMINI_AI_PRO'?'GEMINI_AI_PRO_STRUCTURED_HANDOFF':'GEMINI_API_DIRECT_RESPONSE',executionReference:`GITHUB_ACTIONS_RUN:repo:${channel}:1`,model:channel==='GEMINI_API'?'gemini-3.8-flash':null,
    expectedTransportType:'EVIDENCE_CANDIDATE_BATCH',expectedSchemaVersion:'1.0',
    sourceContext:{type:'OFFICIAL_PDF',driveFileId:'DRIVE-001',title:'official.pdf',version:'202609'},sourceAttachment:null,
    canonicalFieldScope:['window_type'],productNodeIds:[],transitions:[{status:'CREATED',at:'2026-09-05T09:00:00Z'}]
  };
}

function acquisition(channel,{sizeBytes=100}={}){
  const acquiredSha='a'.repeat(64);
  return{
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_SOURCE_ACQUISITION',status:'PASS',manufacturer:'LIXIL',series:'TEST',productId:'SER-LIXIL-TEST',executionChannel:channel,
    source:{type:'OFFICIAL_PDF',driveFileId:'DRIVE-001',title:'official.pdf',version:'202609',officialDownloadUrl:'https://example.invalid/source.pdf',officialDetailUrl:'https://example.invalid/detail',authoritativeSha256:acquiredSha,pageCount:20},
    scope:{pdfPages:[6],printedPages:[4],canonicalFields:['window_type']},
    retrieval:{method:'OFFICIAL_DOWNLOAD_URL',requestedUrl:'https://example.invalid/source.pdf',resolvedUrl:'https://cdn.example.invalid/source.pdf',referer:'https://example.invalid/detail',contentType:'application/pdf',sizeBytes,acquiredSha256:acquiredSha},
    identity:{mode:'FULL_BYTE_IDENTITY',fullDocumentByteIdentity:true,authoritativeSha256:acquiredSha,acquiredSha256:acquiredSha,scopedContentEquivalence:{mode:'FULL_BYTE_IDENTITY'}},
    scopeValidation:{pdfScopeWithinAuthoritativePageCount:true,printedToPdfMappingComplete:true},localArtifact:{persisted:true,fileName:'official-source.pdf'},credentialMaterialPersisted:false
  };
}

function envelope(channel,batchId){
  const producer=channel==='GEMINI_AI_PRO'?'GEMINI_ANTIGRAVITY':'GEMINI_NOTEBOOKLM';
  const sourceContext={type:'OFFICIAL_PDF',driveFileId:'DRIVE-001',title:'official.pdf',version:'202609'};
  return{
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId,generatedAt:'2026-09-05T09:00:00Z',producer:{system:producer,mode:'LIVE_EXTERNAL'},productId:'SER-LIXIL-TEST',sourceContext,
    candidates:[{recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:`CAND-${batchId}`,sourceSystem:producer,producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:'SER-LIXIL-TEST',subjectField:'window_type',claim:'Official source explicitly identifies a window type.',proposedStrength:'EXPLICIT',productNodeIds:[],source:{...sourceContext,printedPage:4,pdfPage:6,locatorText:'window type'}}],issues:[]
  };
}

test('v2.7 governed AI Pro runner commits only after execution and transport provenance pass',async t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const change=path.join(root,'change');
  fs.mkdirSync(change,{recursive:true});
  const j=job('GEMINI_AI_PRO');
  const acq=acquisition('GEMINI_AI_PRO');
  const builtDelivery=buildAiProScopedTextDelivery({
    sourceAcquisition:acq,executionReference:j.executionReference,
    scopeAudit:{pageScope:[6],scopeTextSha256:'b'.repeat(64),scopeTextBytes:123,pageAudit:[{pdfPage:6,characters:123,sha256:'c'.repeat(64)}],extractor:'pypdf',extractorVersion:'6.0.0'}
  });
  assert.equal(builtDelivery.pass,true);
  const raw=`${JSON.stringify(envelope('GEMINI_AI_PRO','BATCH-GOV-AIPRO-001'))}\n`;
  const builtExecution=buildAiProGeminiExecutionAudit({
    job:j,sourceAcquisition:acq,sourceDelivery:builtDelivery.record,rawResponseSha256:sha256(raw),
    antigravityAudit:{status:'SUCCESS',structured_output_sha256:sha256(raw),authenticationMode:'GOOGLE_AI_PRO_OAUTH',producerSystem:'GEMINI_ANTIGRAVITY',permissionDeniedActions:[],canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false}
  });
  assert.equal(builtExecution.pass,true);
  const result=await runGovernedGeminiV11(j,{
    sourceAcquisition:acq,sourceDelivery:builtDelivery.record,geminiExecution:builtExecution.record,externalResponse:raw,evidenceInboxDir:inbox,changeControlDir:change
  });
  assert.equal(result.pass,true);
  assert.equal(result.status,'IMPORTED');
  assert.equal(result.preInboxGuard.status,'PASS');
  assert.equal(result.transportProvenance.status,'PASS');
  assert.equal(result.executionContext.transportProvenance.transport.batchId,'BATCH-GOV-AIPRO-001');
  const manifest=JSON.parse(fs.readFileSync(path.join(inbox,'manifest.json'),'utf8'));
  assert.equal(manifest.batches.length,1);
  assert.equal(manifest.batches[0].executionContext.transportProvenance.status,'PASS');
  const item=result.reviewQueue.items.find((row)=>row.kind==='EVIDENCE_CANDIDATE');
  assert.ok(item);
  assert.equal(item.refs.executionContext.transportProvenance.transport.batchId,'BATCH-GOV-AIPRO-001');
});

test('v2.7 governed AI Pro runner blocks before Inbox when execution audit fingerprint is stale',async t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const j=job('GEMINI_AI_PRO');
  const acq=acquisition('GEMINI_AI_PRO');
  const delivery=buildAiProScopedTextDelivery({sourceAcquisition:acq,executionReference:j.executionReference,scopeAudit:{pageScope:[6],scopeTextSha256:'b'.repeat(64),scopeTextBytes:123,pageAudit:[{pdfPage:6,characters:123,sha256:'c'.repeat(64)}]}}).record;
  const raw=`${JSON.stringify(envelope('GEMINI_AI_PRO','BATCH-GOV-AIPRO-STALE'))}\n`;
  const exec=buildAiProGeminiExecutionAudit({job:j,sourceAcquisition:acq,sourceDelivery:delivery,rawResponseSha256:sha256(raw),antigravityAudit:{status:'SUCCESS',structured_output_sha256:sha256(raw),authenticationMode:'GOOGLE_AI_PRO_OAUTH',producerSystem:'GEMINI_ANTIGRAVITY',permissionDeniedActions:[],canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false}}).record;
  exec.result.rawResponseSha256='f'.repeat(64);
  const result=await runGovernedGeminiV11(j,{sourceAcquisition:acq,sourceDelivery:delivery,geminiExecution:exec,externalResponse:raw,evidenceInboxDir:inbox,changeControlDir:path.join(root,'change')});
  assert.equal(result.pass,false);
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.errors.some((row)=>row.code==='GEMINI_EXECUTION_RESPONSE_SHA_MISMATCH'));
  assert.equal(fs.existsSync(path.join(inbox,'manifest.json')),false);
});

test('v2.7 governed Gemini API runner stops at Transport, builds provenance, then commits Inbox',async t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const change=path.join(root,'change');
  fs.mkdirSync(change,{recursive:true});
  const sourceFile=path.join(root,'official.pdf');
  fs.writeFileSync(sourceFile,Buffer.from('%PDF-test'));
  const j=job('GEMINI_API');
  const acq=acquisition('GEMINI_API',{sizeBytes:100});
  const raw=`${JSON.stringify(envelope('GEMINI_API','BATCH-GOV-API-001'))}\n`;
  const sourceUploadImpl=async()=>({
    pass:true,status:'ACTIVE',
    attachment:{geminiFileUri:'https://generativelanguage.googleapis.com/v1beta/files/abc',mimeType:'application/pdf',providerFileName:'files/abc'},
    audit:{sourceSha256:'a'.repeat(64),fileSizeBytes:100,mimeType:'application/pdf',providerFileName:'files/abc',providerState:'ACTIVE',geminiFileUri:'https://generativelanguage.googleapis.com/v1beta/files/abc'},errors:[]
  });
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:raw}]}}]})});
  const result=await runGovernedGeminiV11(j,{
    sourceAcquisition:acq,evidenceInboxDir:inbox,changeControlDir:change,apiKey:'test-api-key',model:j.model,sourceFilePath:sourceFile,sourceUploadImpl,fetchImpl,timeoutMs:1000
  });
  assert.equal(result.pass,true,result.errors?.[0]?.message);
  assert.equal(result.status,'IMPORTED');
  assert.equal(result.sourceDeliveryContext.delivery.method,'GEMINI_FILE_ATTACHMENT');
  assert.equal(result.geminiExecutionContext.result.lifecycleStage,'PRE_INBOX_TRANSPORT_VALIDATED');
  assert.equal(result.geminiExecutionContext.result.rawResponseSha256,sha256(raw));
  assert.equal(result.transportProvenance.executionChannel,'GEMINI_API');
  assert.equal(result.transportProvenance.transport.producer.system,'GEMINI_NOTEBOOKLM');
  const manifest=JSON.parse(fs.readFileSync(path.join(inbox,'manifest.json'),'utf8'));
  const ctx=manifest.batches[0].executionContext;
  assert.equal(ctx.sourceDelivery.status,'PASS');
  assert.equal(ctx.geminiExecution.status,'SUCCEEDED');
  assert.equal(ctx.transportProvenance.status,'PASS');
});
