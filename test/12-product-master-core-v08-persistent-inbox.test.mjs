import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import test from'node:test';
import assert from'node:assert/strict';
import{APW430_GEMINI_INBOX_POC}from'../src/product-master-core/poc/apw430-gemini-inbox-poc.mjs';
import{APW430_GEMINI_TRANSPORT_FIXTURE}from'../src/product-master-core/poc/apw430-gemini-transport-poc.mjs';
import{createGlobalInboxRecordId,loadEvidenceInboxManifest,persistGeminiTransport}from'../src/product-master-core/evidence-inbox-store.mjs';

const knownFields=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.fields);
const nodeIds=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.productNodes.map((row)=>row.id));
const transportOpts={expectedProductId:'SER-YKK-APW430',knownFields,nodeIds};

function makeBatch(namespace,{claim='FIX窓のテラスタイプはアングル付枠のみの設定となる。'}={}){
  const row=structuredClone(APW430_GEMINI_TRANSPORT_FIXTURE);
  row.batchId=`BATCH-SIM-APW430-FIX-${namespace}`;
  row.generatedAt=`2026-09-02T05:${String(namespace).padStart(2,'0')}:00Z`;
  row.candidates[0].id=createGlobalInboxRecordId(row.batchId,'CAND',1);
  row.candidates[0].claim=claim;
  row.issues[0].id=createGlobalInboxRecordId(row.batchId,'ISSUE',1);
  return row;
}

function withInbox(t){
  const rootDir=fs.mkdtempSync(path.join(os.tmpdir(),'sash-evidence-inbox-'));
  t.after(()=>fs.rmSync(rootDir,{recursive:true,force:true}));
  return rootDir;
}

test('v0.8 persists raw Gemini transport plus manifest without Canonical write',(t)=>{
  const rootDir=withInbox(t);
  const batch=makeBatch(1);
  const raw=JSON.stringify(batch,null,2);
  const report=persistGeminiTransport(raw,{rootDir,importedAt:'2026-09-02T05:10:00Z',...transportOpts});
  assert.equal(report.pass,true,JSON.stringify(report.errors));
  assert.equal(report.status,'PERSISTED_TO_EVIDENCE_INBOX');
  assert.equal(report.canonicalWritePerformed,false);
  assert.equal(fs.readFileSync(report.batchPath,'utf8'),raw,'raw transport bytes must be preserved exactly');
  const manifest=loadEvidenceInboxManifest(rootDir);
  assert.equal(manifest.batches.length,1);
  assert.equal(manifest.batches[0].batchId,batch.batchId);
  assert.deepEqual(manifest.batches[0].candidateIds,[batch.candidates[0].id]);
  assert.equal(manifest.batches[0].candidateFingerprints.length,1);
});

test('v0.8 rejects duplicate batchId',(t)=>{
  const rootDir=withInbox(t);
  const batch=makeBatch(2);
  const raw=JSON.stringify(batch);
  assert.equal(persistGeminiTransport(raw,{rootDir,...transportOpts}).pass,true);
  const second=persistGeminiTransport(raw,{rootDir,...transportOpts});
  assert.equal(second.pass,false);
  assert.ok(second.errors.some((row)=>row.code==='INBOX_BATCH_ID_CONFLICT'));
});

test('v0.8 enforces record id uniqueness across persisted batches',(t)=>{
  const rootDir=withInbox(t);
  const first=makeBatch(3);
  const second=makeBatch(4,{claim:'FIX窓の窓タイプは在来工法に対応している。'});
  second.candidates[0].id=first.candidates[0].id;
  assert.equal(persistGeminiTransport(JSON.stringify(first),{rootDir,...transportOpts}).pass,true);
  const report=persistGeminiTransport(JSON.stringify(second),{rootDir,...transportOpts});
  assert.equal(report.pass,false);
  assert.ok(report.errors.some((row)=>row.code==='INBOX_GLOBAL_RECORD_ID_CONFLICT'));
});

test('v0.8 detects duplicate semantic source claims even when ids differ',(t)=>{
  const rootDir=withInbox(t);
  const first=makeBatch(5);
  const second=makeBatch(6);
  assert.notEqual(first.candidates[0].id,second.candidates[0].id);
  assert.equal(persistGeminiTransport(JSON.stringify(first),{rootDir,...transportOpts}).pass,true);
  const report=persistGeminiTransport(JSON.stringify(second),{rootDir,...transportOpts});
  assert.equal(report.pass,false);
  assert.ok(report.errors.some((row)=>row.code==='INBOX_DUPLICATE_CLAIM'));
});

test('v0.8 can explicitly retain duplicate claims for audit while preserving unique ids',(t)=>{
  const rootDir=withInbox(t);
  const first=makeBatch(7);
  const second=makeBatch(8);
  assert.equal(persistGeminiTransport(JSON.stringify(first),{rootDir,...transportOpts}).pass,true);
  const report=persistGeminiTransport(JSON.stringify(second),{rootDir,allowDuplicateClaims:true,...transportOpts});
  assert.equal(report.pass,true,JSON.stringify(report.errors));
  assert.equal(loadEvidenceInboxManifest(rootDir).batches.length,2);
});

test('v0.8 accepts a genuinely distinct claim in a new batch',(t)=>{
  const rootDir=withInbox(t);
  const first=makeBatch(9);
  const second=makeBatch(10,{claim:'FIX窓の窓タイプは在来工法に対応している。'});
  second.candidates[0].subjectField='construction';
  second.candidates[0].productNodeIds=['NODE-YKK-APW430-FIX-MADO'];
  assert.equal(persistGeminiTransport(JSON.stringify(first),{rootDir,...transportOpts}).pass,true);
  const report=persistGeminiTransport(JSON.stringify(second),{rootDir,...transportOpts});
  assert.equal(report.pass,true,JSON.stringify(report.errors));
  assert.equal(loadEvidenceInboxManifest(rootDir).batches.length,2);
});

test('global id helper namespaces candidate and issue ids by batch',()=>{
  const batchId='BATCH-GEMINI-APW430-FIX-20260902T043858Z';
  assert.equal(createGlobalInboxRecordId(batchId,'CAND',1),'CAND-GEMINI-APW430-FIX-20260902T043858Z-001');
  assert.equal(createGlobalInboxRecordId(batchId,'ISSUE',12),'ISSUE-GEMINI-APW430-FIX-20260902T043858Z-012');
});
