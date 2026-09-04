import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{uploadGeminiFileFromPath,sha256File}from'../src/product-master-core/gemini-file-upload.mjs';
import{createGeminiJob,executeGeminiJob,runGeminiProductMasterBridge}from'../src/product-master-core/gemini-execution-bridge.mjs';

const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'gemini-live-v21-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};
const makePdf=(root)=>{const file=path.join(root,'official.pdf');fs.writeFileSync(file,Buffer.from('%PDF-1.4\nAPW430 fixture\n%%EOF\n'));return file;};
const source={type:'OFFICIAL_PDF',driveFileId:'DRIVE-APW430-PDF',title:'202607_YKKAP_APW430_商品カタログ.pdf',version:'202607'};
const transport=()=>JSON.stringify({
  transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId:'BATCH-LIVE-V21-001',generatedAt:'2026-09-04T06:00:00Z',
  producer:{system:'GEMINI_NOTEBOOKLM',mode:'LIVE_EXTERNAL'},productId:'SER-YKK-APW430',sourceContext:source,
  candidates:[{recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-LIVE-V21-001',sourceSystem:'GEMINI_NOTEBOOKLM',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:'SER-YKK-APW430',title:'APW430 FIX evidence',subjectField:'window_type',claim:'FIX窓には窓タイプが設定される。',proposedStrength:'EXPLICIT',productNodeIds:[],source:{...source,printedPage:69,pdfPage:71,locatorText:'FIX窓'}}],issues:[]
});
const liveJob=(sha)=>createGeminiJob({
  job_id:'GJOB-LIVE-V21',job_type:'EVIDENCE_EXTRACTION',manufacturer:'YKK AP',series:'APW430',product_id:'SER-YKK-APW430',task:'Extract evidence',prompt:'Return pure transport JSON.',
  source_context:source,source_attachment:{mime_type:'application/pdf',source_sha256:sha},expected_transport_type:'EVIDENCE_CANDIDATE_BATCH',expected_schema_version:'1.0',execution_mode:'LIVE_EXTERNAL',model:'gemini-test',requested_by:'CHATGPT'
}).job;

function okJson(payload,headers={}){return{ok:true,status:200,headers:{get:(name)=>headers[name.toLowerCase()]??headers[name]??null},json:async()=>payload};}

test('v2.1 Gemini Files API upload preserves fingerprint and returns URI without secret leakage',async t=>{
  const root=fixtureRoot(t),file=makePdf(root),expected=sha256File(file),calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    if(calls.length===1)return okJson({}, {'x-goog-upload-url':'https://upload.example/session'});
    return okJson({file:{uri:'https://generativelanguage.googleapis.com/v1beta/files/APW430',mimeType:'application/pdf',name:'files/APW430',state:'ACTIVE'}});
  };
  const result=await uploadGeminiFileFromPath({filePath:file,apiKey:'SECRET-KEY-V21',expectedSha256:expected,fetchImpl});
  assert.equal(result.pass,true);
  assert.equal(result.attachment.geminiFileUri,'https://generativelanguage.googleapis.com/v1beta/files/APW430');
  assert.equal(result.audit.sourceSha256,expected);
  assert.equal(calls[0].options.headers['x-goog-api-key'],'SECRET-KEY-V21');
  assert.equal(JSON.stringify(result).includes('SECRET-KEY-V21'),false);
});

test('v2.1 wrong Drive-fetched source fingerprint blocks before upload',async t=>{
  const root=fixtureRoot(t),file=makePdf(root);let called=false;
  const result=await uploadGeminiFileFromPath({filePath:file,apiKey:'SECRET',expectedSha256:'0'.repeat(64),fetchImpl:async()=>{called=true;}});
  assert.equal(result.pass,false);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.errors[0].code,'GEMINI_SOURCE_SHA256_MISMATCH');
  assert.equal(called,false);
});

test('v2.1 unavailable local source blocks safely',async()=>{
  const result=await uploadGeminiFileFromPath({filePath:'/definitely/missing/APW430.pdf',apiKey:'SECRET',fetchImpl:async()=>{throw new Error('must not run');}});
  assert.equal(result.pass,false);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.errors[0].code,'GEMINI_SOURCE_FILE_UNAVAILABLE');
});

test('v2.1 LIVE_EXTERNAL uploads source, validates transport, imports Inbox and exposes Review Queue without master writes',async t=>{
  const root=fixtureRoot(t),file=makePdf(root),sha=sha256File(file),calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    if(calls.length===1)return okJson({}, {'x-goog-upload-url':'https://upload.example/session'});
    if(calls.length===2)return okJson({file:{uri:'files/APW430-live',mimeType:'application/pdf',name:'files/APW430-live',state:'ACTIVE'}});
    return okJson({candidates:[{content:{parts:[{text:transport()}]}}]});
  };
  const result=await runGeminiProductMasterBridge(liveJob(sha),{sourceFilePath:file,apiKey:'SECRET-LIVE-V21',fetchImpl,evidenceInboxDir:path.join(root,'evidence'),changeControlDir:path.join(root,'change'),importedAt:'2026-09-04T06:01:00Z'});
  assert.equal(result.pass,true);
  assert.equal(result.status,'IMPORTED');
  assert.equal(result.sourceAttachmentAudit.sourceSha256,sha);
  assert.equal(result.transportValidation.pass,true);
  assert.equal(result.inboxImport.pass,true);
  assert.equal(result.reviewQueue.summary.byStatus.SUBMITTED,1);
  assert.equal(result.reviewQueue.authorityBoundary.masterChangeApproval,'HUMAN_REQUIRED');
  assert.equal(result.canonicalWritePerformed,false);
  assert.equal(result.runtimeWritePerformed,false);
  assert.equal(result.productionWritePerformed,false);
  assert.equal(JSON.stringify(result).includes('SECRET-LIVE-V21'),false);
});

test('v2.1 provider error is redacted and cannot leak API key',async()=>{
  const job=createGeminiJob({
    job_id:'GJOB-REDACT-V21',job_type:'EVIDENCE_EXTRACTION',manufacturer:'YKK AP',series:'APW430',product_id:'SER-YKK-APW430',task:'Extract evidence',prompt:'Return JSON.',source_context:source,
    source_attachment:{gemini_file_uri:'files/already-uploaded',mime_type:'application/pdf'},execution_mode:'LIVE_EXTERNAL',model:'gemini-test'
  }).job;
  const secret='SECRET-REDACT-V21';
  const fetchImpl=async()=>({ok:false,status:401,json:async()=>({error:{message:`bad credential ${secret}`}})});
  const result=await executeGeminiJob(job,{apiKey:secret,fetchImpl});
  assert.equal(result.pass,false);
  assert.equal(result.errors[0].code,'GEMINI_API_ERROR');
  assert.equal(JSON.stringify(result).includes(secret),false);
  assert.equal(result.errors[0].message.includes('[REDACTED]'),true);
});
