import fs from'node:fs';
import path from'node:path';
import{createGeminiJob}from'../src/product-master-core/gemini-execution-bridge.mjs';
import{runVerifiedGeminiLiveJob}from'../src/product-master-core/gemini-live-verified-runner.mjs';
import{validateScopedSourceEquivalenceProof}from'../src/product-master-core/gemini-source-equivalence.mjs';

const SOURCE={type:'OFFICIAL_PDF',driveFileId:'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9',title:'202607_YKKAP_APW430_商品カタログ.pdf',version:'202607'};
const AUTHORITATIVE_SHA256='a3b130d2227af07808c36d74528592ab76f52b122057d831d5fef5aa34b246be';
const AUTHORITATIVE_PAGE_COUNT=140;
const PDF_PAGES=[71,72,73];
const PRINTED_PAGES=[69,70,71];
const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const sourceFile=value('source-file')??process.env.GEMINI_SOURCE_FILE??null;
const artifactDir=path.resolve(value('artifact-dir')??'artifacts/gemini-live-v21/apw430');
const evidenceInboxDir=path.join(artifactDir,'evidence-inbox');
const changeControlDir=path.resolve('data/master-change-control');
const model=process.env.GEMINI_MODEL??'gemini-3.8-flash';
const geminiFileUri=process.env.GEMINI_FILE_URI??null;
const attachmentSha256=process.env.GEMINI_ATTACHMENT_SOURCE_SHA256??AUTHORITATIVE_SHA256;
const proofFile=process.env.GEMINI_SOURCE_EQUIVALENCE_PROOF_FILE??null;
let proof=null;
if(attachmentSha256!==AUTHORITATIVE_SHA256&&proofFile){
  try{proof=JSON.parse(fs.readFileSync(path.resolve(proofFile),'utf8'));}
  catch(cause){
    console.log(JSON.stringify({pass:false,status:'BLOCKED',gate:'SOURCE_SCOPE_EQUIVALENCE_GATE',errors:[{code:'SOURCE_EQUIVALENCE_PROOF_READ_FAILED',message:cause?.message??String(cause)}]},null,2));
    process.exit(4);
  }
}
const sourceEquivalence=validateScopedSourceEquivalenceProof({
  proof,
  authoritativeSource:{...SOURCE,sha256:AUTHORITATIVE_SHA256,pageCount:AUTHORITATIVE_PAGE_COUNT},
  attachmentSourceSha256:attachmentSha256,
  expectedPdfPages:PDF_PAGES,
  expectedPrintedPages:PRINTED_PAGES
});
if(!sourceEquivalence.pass){
  console.log(JSON.stringify({pass:false,status:'BLOCKED',gate:'SOURCE_SCOPE_EQUIVALENCE_GATE',source:SOURCE,authoritativeSourceSha256:AUTHORITATIVE_SHA256,attachmentSourceSha256:attachmentSha256,errors:sourceEquivalence.errors},null,2));
  process.exit(4);
}

const equivalencePrompt=sourceEquivalence.mode==='SCOPED_CONTENT_EQUIVALENCE'
  ?'The attached current YKK AP official retrieval PDF is byte-different from the historical Drive evidence file, but PDF pages 71-73 have passed exact normalized-text SHA-256 and rendered-pixel SHA-256 equivalence against that authoritative Drive source. Use only PDF pages 71-73 / printed pages 69-71 for evidence extraction.'
  :'The attached PDF is byte-identical to the authoritative Drive evidence file.';
const created=createGeminiJob({
  job_id:`GJOB-APW430-LIVE-${new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}`,
  job_type:'EVIDENCE_EXTRACTION',manufacturer:'YKK AP',series:'APW430',product_id:'SER-YKK-APW430',
  task:'Run one APW430 LIVE_EXTERNAL evidence extraction through the controlled bridge.',
  prompt:[
    'Read the attached YKK AP APW430 official product catalog and extract a small, auditable set of atomic evidence candidates from printed pages 69-71 only.',
    equivalencePrompt,
    'Return exactly one pure JSON EVIDENCE_CANDIDATE_BATCH using transportSchemaVersion 1.0 and productId SER-YKK-APW430.',
    'Set producer.system to GEMINI_NOTEBOOKLM and producer.mode to LIVE_EXTERNAL. Every candidate must use sourceSystem GEMINI_NOTEBOOKLM and producerMode LIVE_EXTERNAL.',
    `Use sourceContext exactly as type=${SOURCE.type}, driveFileId=${SOURCE.driveFileId}, title=${SOURCE.title}, version=${SOURCE.version}.`,
    'Each candidate must cite that authoritative OFFICIAL_PDF provenance and include printedPage, pdfPage and locatorText.',
    'Do not approve Product Master changes, do not write Canonical data, and do not generate Runtime data.'
  ].join(' '),
  source_context:SOURCE,source_drive_file_ids:[SOURCE.driveFileId],page_scope:PDF_PAGES,printed_page_scope:PRINTED_PAGES,
  source_attachment:{gemini_file_uri:geminiFileUri,mime_type:'application/pdf',source_sha256:attachmentSha256},
  metadata:{sourceEquivalence:sourceEquivalence.audit},
  expected_transport_type:'EVIDENCE_CANDIDATE_BATCH',expected_schema_version:'1.0',execution_mode:'LIVE_EXTERNAL',model,requested_by:'CHATGPT'
});
if(!created.pass){console.log(JSON.stringify({pass:false,status:'JOB_INVALID',errors:created.errors},null,2));process.exitCode=2;}
else{
  const result=await runVerifiedGeminiLiveJob(created.job,{argv:args,evidenceInboxDir,changeControlDir,sourceFilePath:sourceFile?path.resolve(sourceFile):null});
  console.log(JSON.stringify({
    pass:result.pass,status:result.status,jobId:created.job.jobId,model,source:SOURCE,
    authoritativeSourceSha256:AUTHORITATIVE_SHA256,attachmentSourceSha256:attachmentSha256,sourceEquivalence:sourceEquivalence.audit,
    credentialPreflight:result.credentialPreflight??null,sourceAttachmentAudit:result.sourceAttachmentAudit??null,rawResponseSha256:result.rawResponseSha256??null,normalizedBatchId:result.normalizedBatchId??null,
    transportGate:result.transportValidation?.pass===true?'PASS':result.status==='BLOCKED'?'BLOCKED':'FAIL',
    evidenceInboxGate:result.inboxImport?.pass===true?'PASS':result.status==='BLOCKED'?'BLOCKED':'FAIL',
    queueVisible:Boolean(result.reviewQueue?.records?.length),canonicalWritePerformed:result.canonicalWritePerformed,runtimeWritePerformed:result.runtimeWritePerformed,productionWritePerformed:result.productionWritePerformed,errors:result.errors
  },null,2));
  if(!result.pass)process.exitCode=result.status==='BLOCKED'?3:1;
}
