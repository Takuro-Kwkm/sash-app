import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{inspectGeminiLivePreflight}from'../src/product-master-core/gemini-live-preflight.mjs';
import{verifyGeminiFileAttachment}from'../src/product-master-core/gemini-file-verify.mjs';
import{runVerifiedGeminiLiveJob}from'../src/product-master-core/gemini-live-verified-runner.mjs';
import{createGeminiJob}from'../src/product-master-core/gemini-execution-bridge.mjs';

const SOURCE={type:'OFFICIAL_PDF',driveFileId:'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9',title:'202607_YKKAP_APW430_商品カタログ.pdf',version:'202607'};
const SHA='a3b130d2227af07808c36d74528592ab76f52b122057d831d5fef5aa34b246be';
const SHA_B64=Buffer.from(SHA,'hex').toString('base64');
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'gemini-live-v22-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};
const transport=()=>JSON.stringify({
  transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId:'BATCH-LIVE-V22-001',generatedAt:'2026-09-04T06:30:00Z',
  producer:{system:'GEMINI_NOTEBOOKLM',mode:'LIVE_EXTERNAL'},productId:'SER-YKK-APW430',sourceContext:SOURCE,
  candidates:[{recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-LIVE-V22-001',sourceSystem:'GEMINI_NOTEBOOKLM',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:'SER-YKK-APW430',title:'APW430 FIX evidence',subjectField:'window_type',claim:'FIX窓には窓タイプが設定される。',proposedStrength:'EXPLICIT',productNodeIds:[],source:{...SOURCE,printedPage:69,pdfPage:71,locatorText:'FIX窓'}}],issues:[]
});
const makeJob=()=>createGeminiJob({
  job_id:'GJOB-LIVE-V22',job_type:'EVIDENCE_EXTRACTION',manufacturer:'YKK AP',series:'APW430',product_id:'SER-YKK-APW430',task:'Extract evidence',prompt:'Return pure transport JSON.',source_context:SOURCE,
  source_attachment:{gemini_file_uri:'files/APW430-live-v22',mime_type:'application/pdf',source_sha256:SHA},execution_mode:'LIVE_EXTERNAL',model:'gemini-test',requested_by:'CHATGPT'
}).job;
const okJson=(payload)=>({ok:true,status:200,json:async()=>payload});

test('v2.2 preflight blocks missing credential and never returns a secret value',()=>{
  const result=inspectGeminiLivePreflight({env:{GEMINI_MODEL:'gemini-test',GEMINI_FILE_URI:'files/APW430'},argv:[],jobModel:'gemini-test',sourceAttachment:{gemini_file_uri:'files/APW430'}});
  assert.equal(result.pass,false);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.credential.apiKeyPresent,false);
  assert.equal(JSON.stringify(result).includes('apiKeyValue'),false);
  assert.equal(result.errors.some((row)=>row.code==='GEMINI_API_KEY_UNAVAILABLE'),true);
});

test('v2.2 preflight forbids API key CLI arguments even when environment credential exists',()=>{
  const secret='SECRET-V22';
  const result=inspectGeminiLivePreflight({env:{GEMINI_API_KEY:secret,GEMINI_MODEL:'gemini-test',GEMINI_FILE_URI:'files/APW430'},argv:[`--api-key=${secret}`],jobModel:'gemini-test',sourceAttachment:{gemini_file_uri:'files/APW430'}});
  assert.equal(result.pass,false);
  assert.equal(result.errors.some((row)=>row.code==='GEMINI_SECRET_CLI_FORBIDDEN'),true);
  assert.equal(JSON.stringify(result).includes(secret),false);
});

test('v2.2 preflight accepts environment credential with explicit model and verified-source route',()=>{
  const secret='SECRET-V22-READY';
  const result=inspectGeminiLivePreflight({env:{GEMINI_API_KEY:secret,GEMINI_MODEL:'gemini-test',GEMINI_FILE_URI:'files/APW430'},argv:[],jobModel:'gemini-test',sourceAttachment:{gemini_file_uri:'files/APW430'}});
  assert.equal(result.pass,true);
  assert.equal(result.status,'READY');
  assert.equal(result.credential.apiKeyPresent,true);
  assert.equal(result.credential.apiKeySource,'ENV:GEMINI_API_KEY');
  assert.equal(JSON.stringify(result).includes(secret),false);
});

test('v2.2 preflight rejects model path/url syntax',()=>{
  const result=inspectGeminiLivePreflight({env:{GEMINI_API_KEY:'SECRET',GEMINI_MODEL:'models/gemini-test',GEMINI_FILE_URI:'files/APW430'},argv:[],jobModel:'models/gemini-test',sourceAttachment:{gemini_file_uri:'files/APW430'}});
  assert.equal(result.pass,false);
  assert.equal(result.errors.some((row)=>row.code==='GEMINI_MODEL_INVALID'),true);
});

test('v2.2 preuploaded Gemini file SHA mismatch blocks before inference',async()=>{
  let calls=0;
  const fetchImpl=async()=>{calls+=1;return okJson({name:'files/APW430-live-v22',uri:'files/APW430-live-v22',state:'ACTIVE',sha256Hash:Buffer.from('0'.repeat(64),'hex').toString('base64')});};
  const result=await verifyGeminiFileAttachment({geminiFileUri:'files/APW430-live-v22',expectedSha256:SHA,apiKey:'SECRET',fetchImpl,pollIntervalMs:0});
  assert.equal(result.pass,false);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.errors[0].code,'GEMINI_FILE_SHA256_MISMATCH');
  assert.equal(calls,1);
});

test('v2.2 verified preuploaded file runs LIVE transport -> Inbox -> Queue with no master writes',async t=>{
  const root=fixtureRoot(t),calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,method:options?.method??'GET'});
    if(calls.length===1)return okJson({name:'files/APW430-live-v22',uri:'files/APW430-live-v22',state:'ACTIVE',sha256Hash:SHA_B64,mimeType:'application/pdf',sizeBytes:'33064011'});
    return okJson({candidates:[{content:{parts:[{text:transport()}]}}]});
  };
  const secret='SECRET-LIVE-V22';
  const result=await runVerifiedGeminiLiveJob(makeJob(),{apiKey:secret,model:'gemini-test',fetchImpl,evidenceInboxDir:path.join(root,'evidence'),changeControlDir:path.join(root,'change'),importedAt:'2026-09-04T06:31:00Z'});
  assert.equal(result.pass,true);
  assert.equal(result.status,'IMPORTED');
  assert.equal(result.credentialPreflight.status,'READY');
  assert.equal(result.sourceAttachmentAudit.sha256Verified,true);
  assert.equal(result.transportValidation.pass,true);
  assert.equal(result.inboxImport.pass,true);
  assert.equal(result.reviewQueue.summary.byStatus.SUBMITTED,1);
  assert.equal(result.reviewQueue.authorityBoundary.masterChangeApproval,'HUMAN_REQUIRED');
  assert.equal(result.canonicalWritePerformed,false);
  assert.equal(result.runtimeWritePerformed,false);
  assert.equal(result.productionWritePerformed,false);
  assert.equal(JSON.stringify(result).includes(secret),false);
  assert.equal(calls.length,2);
});
