import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{createGeminiJob,executeGeminiJob,runGeminiProductMasterBridge}from'../src/product-master-core/gemini-execution-bridge.mjs';

const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'gemini-bridge-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};
const source={type:'OFFICIAL_PDF',driveFileId:'DRIVE-PDF-001',title:'Official Product.pdf',version:'202609'};
const jobInput=(mode='MOCK')=>({job_id:`GJOB-TEST-${mode}`,job_type:'EVIDENCE_EXTRACTION',manufacturer:'YKK AP',series:'TEST',product_id:'SER-TEST',task:'Extract official evidence',prompt:'Extract the requested evidence.',source_context:source,expected_transport_type:'EVIDENCE_CANDIDATE_BATCH',expected_schema_version:'1.0',execution_mode:mode,requested_by:'CHATGPT'});
const transport=(overrides={})=>JSON.stringify({
  transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId:'BATCH-TEST-001',generatedAt:'2026-09-04T05:00:00Z',
  producer:{system:'GEMINI_NOTEBOOKLM',mode:'SIMULATED_FIXTURE'},productId:'SER-TEST',sourceContext:source,
  candidates:[{recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-TEST-001',sourceSystem:'GEMINI_NOTEBOOKLM',producerMode:'SIMULATED_FIXTURE',status:'SUBMITTED',productId:'SER-TEST',title:'FIX type',subjectField:'window_type',claim:'FIX is configured.',proposedStrength:'EXPLICIT',productNodeIds:[],source:{...source,printedPage:1,pdfPage:1,locatorText:'FIX'}}],
  issues:[],...overrides
});

test('v2.0 creates a generic Gemini Job with explicit lifecycle and authority-neutral metadata',()=>{
  const created=createGeminiJob(jobInput());
  assert.equal(created.pass,true);
  assert.equal(created.job.status,'CREATED');
  assert.equal(created.job.productId,'SER-TEST');
  assert.equal(created.job.expectedTransportType,'EVIDENCE_CANDIDATE_BATCH');
  assert.deepEqual(created.job.transitions.map((row)=>row.status),['CREATED']);
});

test('v2.0 Job requires traceable source context and normalizes snake_case source_attachment',()=>{
  const invalid=createGeminiJob({...jobInput(),source_context:{}});
  assert.equal(invalid.pass,false);
  assert.equal(invalid.errors.some((row)=>row.code==='GEMINI_JOB_SOURCE_FILE_ID_MISSING'),true);
  const live=createGeminiJob({...jobInput('LIVE_EXTERNAL'),source_attachment:{gemini_file_uri:'files/test-pdf',mime_type:'application/pdf'}});
  assert.equal(live.pass,true);
  assert.equal(live.job.sourceAttachment.geminiFileUri,'files/test-pdf');
  assert.equal(live.job.sourceAttachment.mimeType,'application/pdf');
});

test('v2.0 MOCK round trip imports valid Transport into Evidence Inbox and Review Queue without Master writes',async t=>{
  const root=fixtureRoot(t),evidence=path.join(root,'evidence'),change=path.join(root,'change');
  const created=createGeminiJob(jobInput()).job;
  const result=await runGeminiProductMasterBridge(created,{evidenceInboxDir:evidence,changeControlDir:change,mockResponse:transport(),importedAt:'2026-09-04T05:01:00Z'});
  assert.equal(result.pass,true);
  assert.equal(result.status,'IMPORTED');
  assert.equal(result.inboxImport.status,'PERSISTED_TO_EVIDENCE_INBOX');
  assert.equal(result.reviewQueue.summary.byStatus.SUBMITTED,1);
  assert.equal(result.canonicalWritePerformed,false);
  assert.equal(result.runtimeWritePerformed,false);
  assert.equal(result.productionWritePerformed,false);
  assert.equal(fs.existsSync(path.join(change,'proposals')),false);
});

test('v2.0 invalid JSON and wrong product are rejected at Transport boundary',async t=>{
  const root=fixtureRoot(t),job=createGeminiJob(jobInput()).job;
  const invalid=await runGeminiProductMasterBridge(job,{evidenceInboxDir:path.join(root,'a'),changeControlDir:path.join(root,'c'),mockResponse:'{invalid'});
  assert.equal(invalid.status,'REJECTED_AT_TRANSPORT');
  const wrong=await runGeminiProductMasterBridge(job,{evidenceInboxDir:path.join(root,'b'),changeControlDir:path.join(root,'d'),mockResponse:transport({productId:'SER-WRONG'})});
  assert.equal(wrong.status,'REJECTED_AT_TRANSPORT');
  assert.equal(wrong.canonicalWritePerformed,false);
});

test('v2.0 duplicate batch is rejected at Inbox and does not create duplicate candidates',async t=>{
  const root=fixtureRoot(t),evidence=path.join(root,'evidence'),job=createGeminiJob(jobInput()).job;
  const first=await runGeminiProductMasterBridge(job,{evidenceInboxDir:evidence,changeControlDir:path.join(root,'change'),mockResponse:transport()});
  const second=await runGeminiProductMasterBridge(job,{evidenceInboxDir:evidence,changeControlDir:path.join(root,'change'),mockResponse:transport()});
  assert.equal(first.pass,true);
  assert.equal(second.pass,false);
  assert.equal(second.status,'REJECTED_AT_INBOX');
  const manifest=JSON.parse(fs.readFileSync(path.join(evidence,'manifest.json'),'utf8'));
  assert.equal(manifest.batches.length,1);
});

test('v2.0 LIVE_EXTERNAL fails closed when credentials or source attachment are unavailable',async()=>{
  const job=createGeminiJob(jobInput('LIVE_EXTERNAL')).job;
  const noKey=await executeGeminiJob(job,{apiKey:null,model:'gemini-test'});
  assert.equal(noKey.pass,false);
  assert.equal(noKey.job.status,'BLOCKED');
  assert.equal(noKey.errors[0].code,'GEMINI_API_KEY_UNAVAILABLE');
  const noAttachment=await executeGeminiJob(job,{apiKey:'not-a-real-secret',model:'gemini-test'});
  assert.equal(noAttachment.pass,false);
  assert.equal(noAttachment.errors[0].code,'GEMINI_SOURCE_ATTACHMENT_UNAVAILABLE');
});

test('v2.0 LIVE_EXTERNAL timeout fails safely without Product Master writes',async()=>{
  const job=createGeminiJob({...jobInput('LIVE_EXTERNAL'),source_attachment:{gemini_file_uri:'files/test-pdf',mime_type:'application/pdf'}}).job;
  const fetchImpl=async(_url,{signal})=>new Promise((_resolve,reject)=>{
    const abort=()=>{const error=new Error('aborted');error.name='AbortError';reject(error);};
    if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
  });
  const result=await executeGeminiJob(job,{apiKey:'not-a-real-secret',model:'gemini-test',fetchImpl,timeoutMs:1});
  assert.equal(result.pass,false);
  assert.equal(result.job.status,'FAILED');
  assert.equal(result.errors[0].code,'GEMINI_TIMEOUT');
});

test('v2.0 Replay of stored APW430 LIVE Evidence reaches Review Queue and stays non-authoritative',async t=>{
  const root=fixtureRoot(t);
  const replayPath=path.resolve('docs/notebooklm/live/BATCH-GEMINI-APW430-FIX-20260901213858.json');
  const replay=fs.readFileSync(replayPath,'utf8');
  const envelope=JSON.parse(replay);
  const created=createGeminiJob({
    job_id:'GJOB-APW430-REPLAY-20260904',job_type:'EVIDENCE_EXTRACTION',manufacturer:'YKK AP',series:'APW430',product_id:'SER-YKK-APW430',
    task:'Replay existing Gemini Evidence',prompt:'Replay existing validated Gemini Evidence.',source_context:envelope.sourceContext,
    expected_transport_type:'EVIDENCE_CANDIDATE_BATCH',expected_schema_version:'1.0',execution_mode:'REPLAY',requested_by:'CHATGPT'
  }).job;
  const result=await runGeminiProductMasterBridge(created,{evidenceInboxDir:path.join(root,'evidence'),changeControlDir:path.join(root,'change'),replayResponse:replay,importedAt:'2026-09-04T05:02:00Z'});
  assert.equal(result.pass,true);
  assert.equal(result.normalizedBatchId,envelope.batchId);
  assert.equal(result.reviewQueue.summary.byKind.EVIDENCE_CANDIDATE,envelope.candidates.length);
  assert.equal(result.reviewQueue.authorityBoundary.masterChangeApproval,'HUMAN_REQUIRED');
  assert.equal(result.reviewQueue.authorityBoundary.productionMasterAutoWrite,false);
});
