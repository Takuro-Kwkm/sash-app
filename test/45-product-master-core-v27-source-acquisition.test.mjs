import test from'node:test';
import assert from'node:assert/strict';
import crypto from'node:crypto';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{
  SOURCE_ACQUISITION_SCHEMA_VERSION,
  buildSourceAcquisitionRequest,
  acquireOfficialSource,
  validateSourceAcquisitionRecord
}from'../src/product-master-core/source-acquisition.mjs';
import{persistSourceAcquisitionForBatch}from'../src/product-master-core/source-acquisition-store.mjs';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';

const pdfBytes=Buffer.from('%PDF-1.7\nmock product master source\n%%EOF\n','utf8');
const pdfSha=crypto.createHash('sha256').update(pdfBytes).digest('hex');
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'source-acquisition-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function profile(overrides={}){
  return{
    profileSchemaVersion:'1.1',recordType:'PRODUCT_MASTER_PROFILE',manufacturer:'LIXIL',series:'TEST',registrySeriesKey:'LIXIL::TEST',productId:'SER-LIXIL-TEST',
    source:{
      type:'OFFICIAL_PDF',driveFileId:'DRIVE-SOURCE-001',title:'official.pdf',version:'202609',
      officialDetailUrl:'https://example.invalid/detail',officialDownloadUrl:'https://example.invalid/source.pdf',
      authoritativeSha256:pdfSha,pageCount:20
    },
    extraction:{pageScope:[6,7,8],printedPageScope:[4,5,6],canonicalFieldScope:['window_type']},
    ...overrides
  };
}

function fetchFor(bytes=pdfBytes){
  return async()=>({
    ok:true,status:200,url:'https://cdn.example.invalid/final.pdf',
    headers:{get:(name)=>name.toLowerCase()==='content-type'?'application/pdf':null},
    arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)
  });
}

test('v2.7 Source Acquisition request is channel-aware and scope-bounded',()=>{
  const built=buildSourceAcquisitionRequest(profile(),{executionChannel:'GEMINI_AI_PRO'});
  assert.equal(built.pass,true);
  assert.equal(built.request.schemaVersion,SOURCE_ACQUISITION_SCHEMA_VERSION);
  assert.equal(built.request.executionChannel,'GEMINI_AI_PRO');
  assert.deepEqual(built.request.scope.pdfPages,[6,7,8]);
  assert.deepEqual(built.request.scope.printedPages,[4,5,6]);

  const broken=profile();
  broken.extraction.pageScope=[21];
  broken.extraction.printedPageScope=[19];
  const blocked=buildSourceAcquisitionRequest(broken,{executionChannel:'GEMINI_AI_PRO'});
  assert.equal(blocked.pass,false);
  assert.ok(blocked.errors.some((row)=>row.code==='SOURCE_ACQUISITION_PDF_SCOPE_OUT_OF_RANGE'));
});

test('v2.7 exact official bytes produce FULL_BYTE_IDENTITY without credential material',async t=>{
  const root=fixtureRoot(t);
  const out=path.join(root,'official.pdf');
  const result=await acquireOfficialSource(profile(),{
    executionChannel:'GEMINI_API',outputPath:out,fetchImpl:fetchFor()
  });
  assert.equal(result.pass,true);
  assert.equal(result.record.status,'PASS');
  assert.equal(result.record.executionChannel,'GEMINI_API');
  assert.equal(result.record.identity.mode,'FULL_BYTE_IDENTITY');
  assert.equal(result.record.identity.fullDocumentByteIdentity,true);
  assert.equal(result.record.retrieval.acquiredSha256,pdfSha);
  assert.equal(result.record.source.driveFileId,'DRIVE-SOURCE-001');
  assert.equal(result.record.credentialMaterialPersisted,false);
  assert.deepEqual(fs.readFileSync(out),pdfBytes);
  assert.equal(validateSourceAcquisitionRecord(result.record,{profile:profile()}).pass,true);
});

test('v2.7 byte mismatch fails closed unless explicit scoped equivalence proof exists',async()=>{
  const changed=Buffer.from('%PDF-1.7\nchanged bytes\n%%EOF\n','utf8');
  const result=await acquireOfficialSource(profile(),{
    executionChannel:'GEMINI_AI_PRO',fetchImpl:fetchFor(changed)
  });
  assert.equal(result.pass,false);
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.errors.some((row)=>row.code==='SOURCE_EQUIVALENCE_PROOF_REQUIRED'));
});

test('v2.7 Source Acquisition provenance persists into Inbox and Review Queue refs',async t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const change=path.join(root,'change');
  fs.mkdirSync(path.join(inbox,'batches'),{recursive:true});
  fs.mkdirSync(change,{recursive:true});
  const batchId='BATCH-SOURCE-ACQ-V27-001';
  const envelope={
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId,generatedAt:'2026-09-05T05:00:00Z',
    producer:{system:'GEMINI_ANTIGRAVITY',mode:'LIVE_EXTERNAL'},productId:'SER-LIXIL-TEST',
    sourceContext:{type:'OFFICIAL_PDF',driveFileId:'DRIVE-SOURCE-001',title:'official.pdf',version:'202609'},
    candidates:[{
      recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-SOURCE-ACQ-V27-001',sourceSystem:'GEMINI_ANTIGRAVITY',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:'SER-LIXIL-TEST',
      subjectField:'window_type',claim:'Scoped official source contains an explicit window type.',proposedStrength:'EXPLICIT',productNodeIds:[],
      source:{type:'OFFICIAL_PDF',driveFileId:'DRIVE-SOURCE-001',title:'official.pdf',version:'202609',printedPage:4,pdfPage:6,locatorText:'window type'}
    }],issues:[]
  };
  fs.writeFileSync(path.join(inbox,'batches',`${batchId}.json`),`${JSON.stringify(envelope)}\n`);
  fs.writeFileSync(path.join(inbox,'manifest.json'),`${JSON.stringify({
    inboxSchemaVersion:'1.0',recordType:'EVIDENCE_INBOX_MANIFEST',updatedAt:'2026-09-05T05:00:01Z',
    batches:[{batchId,importedAt:'2026-09-05T05:00:01Z',generatedAt:envelope.generatedAt,producer:envelope.producer,productId:envelope.productId,sourceContext:envelope.sourceContext,executionContext:{workerContractVersion:'1.1',executionMode:'LIVE_EXTERNAL',executionChannel:'GEMINI_AI_PRO'},relativePath:`batches/${batchId}.json`,rawSha256:'x',candidateIds:['CAND-SOURCE-ACQ-V27-001'],issueIds:[],candidateFingerprints:[]}]
  },null,2)}\n`);

  const acquired=await acquireOfficialSource(profile(),{executionChannel:'GEMINI_AI_PRO',fetchImpl:fetchFor()});
  assert.equal(acquired.pass,true);
  const job={executionChannel:'GEMINI_AI_PRO',sourceContext:envelope.sourceContext};
  const persisted=persistSourceAcquisitionForBatch({evidenceInboxDir:inbox,batchId,record:acquired.record,job});
  assert.equal(persisted.pass,true);
  const manifest=JSON.parse(fs.readFileSync(path.join(inbox,'manifest.json'),'utf8'));
  assert.equal(manifest.batches[0].executionContext.sourceAcquisition.status,'PASS');
  assert.equal(manifest.batches[0].executionContext.sourceAcquisition.identity.mode,'FULL_BYTE_IDENTITY');

  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-TEST'});
  const item=queue.items.find((row)=>row.kind==='EVIDENCE_CANDIDATE');
  assert.ok(item);
  assert.equal(item.refs.executionContext.sourceAcquisition.executionChannel,'GEMINI_AI_PRO');
  assert.equal(item.refs.executionContext.sourceAcquisition.source.driveFileId,'DRIVE-SOURCE-001');
});
