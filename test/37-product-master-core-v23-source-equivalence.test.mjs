import test from'node:test';
import assert from'node:assert/strict';
import{validateScopedSourceEquivalenceProof,GEMINI_SOURCE_EQUIVALENCE_METHOD}from'../src/product-master-core/gemini-source-equivalence.mjs';

const DRIVE_SHA='a3b130d2227af07808c36d74528592ab76f52b122057d831d5fef5aa34b246be';
const CURRENT_SHA='a9e866a8c13c78724cd733040b7b2925bb500514d376562890698eb63697ba81';
const SOURCE={driveFileId:'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9',title:'202607_YKKAP_APW430_商品カタログ.pdf',version:'202607',sha256:DRIVE_SHA,pageCount:140};
const PDF_PAGES=[71,72,73];
const PRINTED_PAGES=[69,70,71];
const pageHashes={
  71:['6602916117cb390f57ba1bb31e30f567f7db12699a17742469054c6d167b0a13','5fafd02018cf41a29827bdb8545a9a81baec532672c3eb6d35defcfc1b0c127d'],
  72:['2ef0571d13a914b4466d94859b805315f83b298d1176a9124d5b3352ca02c024','e35a6c28a3e1607926ce2d80cd9f2a1e17d8ef307cddb99101f2b0bd852920ee'],
  73:['5c9203da0fe59eedf18ed3668a196233e545c52f63cc349c28fc337c06fbf009','faf8fe6b88add4638721e2a1bff36a2d2d75c4dd4349d553e754f92cc4d05e77']
};
const proof=()=>({
  schemaVersion:'1.0',status:'PASS',method:GEMINI_SOURCE_EQUIVALENCE_METHOD,
  authoritativeDriveSource:{...SOURCE},
  retrievalSource:{url:'https://webcatalog.ykkap.co.jp/iportal/CatalogDownload.do',catalogId:'13215550000',volumeId:'YKKAPDC1',sha256:CURRENT_SHA,pageCount:140},
  scope:{pdfPages:PDF_PAGES,printedPages:PRINTED_PAGES,evidenceScopeOnly:true,fullDocumentByteIdentity:false},
  pages:PDF_PAGES.map((pdfPage)=>({pdfPage,textSha256:pageHashes[pdfPage][0],driveTextSha256:pageHashes[pdfPage][0],textMatch:true,renderSha256:pageHashes[pdfPage][1],driveRenderSha256:pageHashes[pdfPage][1],renderMatch:true}))
});

test('v2.3 exact Drive bytes pass without scoped equivalence proof',()=>{
  const result=validateScopedSourceEquivalenceProof({authoritativeSource:SOURCE,attachmentSourceSha256:DRIVE_SHA,expectedPdfPages:PDF_PAGES,expectedPrintedPages:PRINTED_PAGES});
  assert.equal(result.pass,true);
  assert.equal(result.mode,'FULL_BYTE_IDENTITY');
  assert.equal(result.audit.fullDocumentByteIdentity,true);
});

test('v2.3 byte-different attachment blocks without scoped equivalence proof',()=>{
  const result=validateScopedSourceEquivalenceProof({authoritativeSource:SOURCE,attachmentSourceSha256:CURRENT_SHA,expectedPdfPages:PDF_PAGES,expectedPrintedPages:PRINTED_PAGES});
  assert.equal(result.pass,false);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.errors[0].code,'SOURCE_EQUIVALENCE_PROOF_REQUIRED');
});

test('v2.3 APW430 current official PDF passes only for exact verified Evidence scope',()=>{
  const result=validateScopedSourceEquivalenceProof({proof:proof(),authoritativeSource:SOURCE,attachmentSourceSha256:CURRENT_SHA,expectedPdfPages:PDF_PAGES,expectedPrintedPages:PRINTED_PAGES});
  assert.equal(result.pass,true);
  assert.equal(result.mode,'SCOPED_CONTENT_EQUIVALENCE');
  assert.equal(result.audit.fullDocumentByteIdentity,false);
  assert.equal(result.audit.evidenceScopeOnly,true);
  assert.deepEqual(result.audit.pdfPages,PDF_PAGES);
  assert.equal(result.audit.retrievalSource.sha256,CURRENT_SHA);
  assert.equal(result.audit.authoritativeDriveSource.sha256,DRIVE_SHA);
});

test('v2.3 scoped proof fails closed when one rendered page differs',()=>{
  const bad=proof();
  bad.pages[1].renderMatch=false;
  const result=validateScopedSourceEquivalenceProof({proof:bad,authoritativeSource:SOURCE,attachmentSourceSha256:CURRENT_SHA,expectedPdfPages:PDF_PAGES,expectedPrintedPages:PRINTED_PAGES});
  assert.equal(result.pass,false);
  assert.equal(result.errors.some((row)=>row.code==='SOURCE_EQUIVALENCE_RENDER_MISMATCH'),true);
});

test('v2.3 scoped proof cannot substitute a different attachment SHA',()=>{
  const other='b'.repeat(64);
  const result=validateScopedSourceEquivalenceProof({proof:proof(),authoritativeSource:SOURCE,attachmentSourceSha256:other,expectedPdfPages:PDF_PAGES,expectedPrintedPages:PRINTED_PAGES});
  assert.equal(result.pass,false);
  assert.equal(result.errors.some((row)=>row.code==='SOURCE_EQUIVALENCE_ATTACHMENT_SHA_MISMATCH'),true);
});
