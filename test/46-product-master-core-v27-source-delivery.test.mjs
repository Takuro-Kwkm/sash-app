import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{
  buildAiProScopedTextDelivery,
  buildGeminiApiAttachmentDelivery,
  validateSourceDeliveryRecord
}from'../src/product-master-core/source-delivery-contract.mjs';
import{persistSourceDeliveryForBatch}from'../src/product-master-core/source-delivery-store.mjs';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';

const SHA_A='a'.repeat(64);
const SHA_B='b'.repeat(64);
const SHA_C='c'.repeat(64);
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'source-delivery-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function acquisition(channel='GEMINI_AI_PRO'){
  return{
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_SOURCE_ACQUISITION',status:'PASS',
    manufacturer:'LIXIL',series:'TEST',productId:'SER-LIXIL-TEST',executionChannel:channel,
    source:{type:'OFFICIAL_PDF',driveFileId:'DRIVE-SOURCE-001',title:'official.pdf',version:'202609',officialDownloadUrl:'https://example.invalid/source.pdf',officialDetailUrl:'https://example.invalid/detail',authoritativeSha256:SHA_A,pageCount:20},
    scope:{pdfPages:[6,7,8],printedPages:[4,5,6],canonicalFields:['window_type']},
    retrieval:{method:'OFFICIAL_DOWNLOAD_URL',requestedUrl:'https://example.invalid/source.pdf',resolvedUrl:'https://cdn.example.invalid/final.pdf',referer:'https://example.invalid/detail',contentType:'application/pdf',sizeBytes:4096,acquiredSha256:SHA_A},
    identity:{mode:'FULL_BYTE_IDENTITY',fullDocumentByteIdentity:true,authoritativeSha256:SHA_A,acquiredSha256:SHA_A,scopedContentEquivalence:{mode:'FULL_BYTE_IDENTITY'}},
    scopeValidation:{pdfScopeWithinAuthoritativePageCount:true,printedToPdfMappingComplete:true},
    localArtifact:{persisted:true,fileName:'official-source.pdf'},credentialMaterialPersisted:false
  };
}

function scopeAudit(overrides={}){
  return{
    extractor:'pypdf',extractorVersion:'6.0.0',pdfPageCount:20,pageScope:[6,7,8],
    pageAudit:[
      {pdfPage:6,characters:100,sha256:SHA_A},
      {pdfPage:7,characters:110,sha256:SHA_B},
      {pdfPage:8,characters:120,sha256:SHA_C}
    ],scopeTextSha256:SHA_B,scopeTextBytes:330,...overrides
  };
}

test('v2.7 AI Pro Source Delivery binds exact requested scope and scoped-text fingerprint',()=>{
  const sourceAcquisition=acquisition('GEMINI_AI_PRO');
  const built=buildAiProScopedTextDelivery({sourceAcquisition,scopeAudit:scopeAudit(),executionReference:'GITHUB_ACTIONS_RUN:repo:1:1'});
  assert.equal(built.pass,true);
  assert.equal(built.record.executionChannel,'GEMINI_AI_PRO');
  assert.equal(built.record.delivery.method,'INLINE_VERIFIED_PAGE_SCOPED_TEXT');
  assert.equal(built.record.delivery.artifactSha256,SHA_B);
  assert.deepEqual(built.record.scope.pdfPages,[6,7,8]);
  assert.equal(built.record.source.acquiredSha256,SHA_A);
  assert.equal(built.record.credentialMaterialPersisted,false);
  assert.equal(validateSourceDeliveryRecord(built.record,{sourceAcquisition}).pass,true);
});

test('v2.7 AI Pro Source Delivery fails closed on scope mismatch',()=>{
  const sourceAcquisition=acquisition('GEMINI_AI_PRO');
  const built=buildAiProScopedTextDelivery({sourceAcquisition,scopeAudit:scopeAudit({pageScope:[6,7]})});
  assert.equal(built.pass,false);
  assert.ok(built.errors.some((row)=>row.code==='SOURCE_DELIVERY_PDF_SCOPE_MISMATCH'));
});

test('v2.7 Gemini API Source Delivery binds verified attachment to acquired PDF bytes',()=>{
  const sourceAcquisition=acquisition('GEMINI_API');
  const built=buildGeminiApiAttachmentDelivery({
    sourceAcquisition,
    sourceAttachmentAudit:{sourceSha256:SHA_A,fileSizeBytes:4096,mimeType:'application/pdf',providerFileName:'files/abc',geminiFileUri:'https://generativelanguage.googleapis.com/v1beta/files/abc',providerState:'ACTIVE'},
    sourceAttachment:{geminiFileUri:'https://generativelanguage.googleapis.com/v1beta/files/abc',providerFileName:'files/abc'},
    executionReference:'GITHUB_ACTIONS_RUN:repo:2:1'
  });
  assert.equal(built.pass,true);
  assert.equal(built.record.executionChannel,'GEMINI_API');
  assert.equal(built.record.delivery.method,'GEMINI_FILE_ATTACHMENT');
  assert.equal(built.record.delivery.sourceSha256,SHA_A);
  assert.equal(built.record.providerAttachmentReference,'https://generativelanguage.googleapis.com/v1beta/files/abc');
  assert.equal(built.record.credentialMaterialPersisted,false);
  assert.equal(validateSourceDeliveryRecord(built.record,{sourceAcquisition}).pass,true);
});

test('v2.7 Gemini API Source Delivery fails closed when uploaded attachment fingerprint differs',()=>{
  const sourceAcquisition=acquisition('GEMINI_API');
  const built=buildGeminiApiAttachmentDelivery({
    sourceAcquisition,
    sourceAttachmentAudit:{sourceSha256:SHA_B,fileSizeBytes:4096,mimeType:'application/pdf',geminiFileUri:'https://generativelanguage.googleapis.com/v1beta/files/bad'},
    sourceAttachment:{geminiFileUri:'https://generativelanguage.googleapis.com/v1beta/files/bad'}
  });
  assert.equal(built.pass,false);
  assert.ok(built.errors.some((row)=>row.code==='SOURCE_DELIVERY_ATTACHMENT_SHA_MISMATCH'));
});

test('v2.7 Source Delivery provenance persists into Inbox and Review Queue refs',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const change=path.join(root,'change');
  fs.mkdirSync(path.join(inbox,'batches'),{recursive:true});
  fs.mkdirSync(change,{recursive:true});
  const batchId='BATCH-SOURCE-DELIVERY-V27-001';
  const sourceContext={type:'OFFICIAL_PDF',driveFileId:'DRIVE-SOURCE-001',title:'official.pdf',version:'202609'};
  const envelope={
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId,generatedAt:'2026-09-05T05:20:00Z',
    producer:{system:'GEMINI_ANTIGRAVITY',mode:'LIVE_EXTERNAL'},productId:'SER-LIXIL-TEST',sourceContext,
    candidates:[{
      recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-SOURCE-DELIVERY-V27-001',sourceSystem:'GEMINI_ANTIGRAVITY',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:'SER-LIXIL-TEST',
      subjectField:'window_type',claim:'Scoped source explicitly names a window type.',proposedStrength:'EXPLICIT',productNodeIds:[],
      source:{...sourceContext,printedPage:4,pdfPage:6,locatorText:'window type'}
    }],issues:[]
  };
  fs.writeFileSync(path.join(inbox,'batches',`${batchId}.json`),`${JSON.stringify(envelope)}\n`);
  fs.writeFileSync(path.join(inbox,'manifest.json'),`${JSON.stringify({
    inboxSchemaVersion:'1.0',recordType:'EVIDENCE_INBOX_MANIFEST',updatedAt:'2026-09-05T05:20:01Z',
    batches:[{batchId,importedAt:'2026-09-05T05:20:01Z',generatedAt:envelope.generatedAt,producer:envelope.producer,productId:envelope.productId,sourceContext,executionContext:{workerContractVersion:'1.1',executionMode:'LIVE_EXTERNAL',executionChannel:'GEMINI_AI_PRO',executionReference:'GITHUB_ACTIONS_RUN:repo:1:1',sourceAcquisition:acquisition('GEMINI_AI_PRO')},relativePath:`batches/${batchId}.json`,rawSha256:'x',candidateIds:['CAND-SOURCE-DELIVERY-V27-001'],issueIds:[],candidateFingerprints:[]}]
  },null,2)}\n`);
  const sourceAcquisition=acquisition('GEMINI_AI_PRO');
  const built=buildAiProScopedTextDelivery({sourceAcquisition,scopeAudit:scopeAudit(),executionReference:'GITHUB_ACTIONS_RUN:repo:1:1'});
  assert.equal(built.pass,true);
  const persisted=persistSourceDeliveryForBatch({
    evidenceInboxDir:inbox,batchId,record:built.record,
    job:{executionChannel:'GEMINI_AI_PRO',executionReference:'GITHUB_ACTIONS_RUN:repo:1:1'},sourceAcquisition
  });
  assert.equal(persisted.pass,true);
  const manifest=JSON.parse(fs.readFileSync(path.join(inbox,'manifest.json'),'utf8'));
  assert.equal(manifest.batches[0].executionContext.sourceDelivery.status,'PASS');
  assert.equal(manifest.batches[0].executionContext.sourceDelivery.delivery.method,'INLINE_VERIFIED_PAGE_SCOPED_TEXT');
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-LIXIL-TEST'});
  const item=queue.items.find((row)=>row.kind==='EVIDENCE_CANDIDATE');
  assert.ok(item);
  assert.equal(item.refs.executionContext.sourceDelivery.status,'PASS');
  assert.equal(item.refs.executionContext.sourceDelivery.source.driveFileId,'DRIVE-SOURCE-001');
});
