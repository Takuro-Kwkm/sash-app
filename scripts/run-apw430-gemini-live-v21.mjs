import path from'node:path';
import{createGeminiJob,runGeminiProductMasterBridge}from'../src/product-master-core/gemini-execution-bridge.mjs';

const SOURCE={type:'OFFICIAL_PDF',driveFileId:'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9',title:'202607_YKKAP_APW430_商品カタログ.pdf',version:'202607'};
const SOURCE_SHA256='a3b130d2227af07808c36d74528592ab76f52b122057d831d5fef5aa34b246be';
const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const sourceFile=value('source-file')??process.env.GEMINI_SOURCE_FILE??null;
const artifactDir=path.resolve(value('artifact-dir')??'artifacts/gemini-live-v21/apw430');
const evidenceInboxDir=path.join(artifactDir,'evidence-inbox');
const changeControlDir=path.resolve('data/master-change-control');
const model=process.env.GEMINI_MODEL??null;
const created=createGeminiJob({
  job_id:`GJOB-APW430-LIVE-${new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}`,
  job_type:'EVIDENCE_EXTRACTION',manufacturer:'YKK AP',series:'APW430',product_id:'SER-YKK-APW430',
  task:'Run one APW430 LIVE_EXTERNAL evidence extraction through the controlled bridge.',
  prompt:[
    'Read the attached YKK AP APW430 official product catalog and extract a small, auditable set of atomic evidence candidates from printed pages 69-71 only.',
    'Return exactly one pure JSON EVIDENCE_CANDIDATE_BATCH using transportSchemaVersion 1.0 and productId SER-YKK-APW430.',
    'Set producer.system to GEMINI_NOTEBOOKLM and producer.mode to LIVE_EXTERNAL. Every candidate must use sourceSystem GEMINI_NOTEBOOKLM and producerMode LIVE_EXTERNAL.',
    `Use sourceContext exactly as type=${SOURCE.type}, driveFileId=${SOURCE.driveFileId}, title=${SOURCE.title}, version=${SOURCE.version}.`,
    'Each candidate must cite that OFFICIAL_PDF and include printedPage, pdfPage and locatorText.',
    'Do not approve Product Master changes, do not write Canonical data, and do not generate Runtime data.'
  ].join(' '),
  source_context:SOURCE,source_drive_file_ids:[SOURCE.driveFileId],printed_page_scope:[69,70,71],
  source_attachment:{mime_type:'application/pdf',source_sha256:SOURCE_SHA256},
  expected_transport_type:'EVIDENCE_CANDIDATE_BATCH',expected_schema_version:'1.0',execution_mode:'LIVE_EXTERNAL',model,requested_by:'CHATGPT'
});
if(!created.pass){console.log(JSON.stringify({pass:false,status:'JOB_INVALID',errors:created.errors},null,2));process.exitCode=2;}
else{
  const result=await runGeminiProductMasterBridge(created.job,{evidenceInboxDir,changeControlDir,sourceFilePath:sourceFile?path.resolve(sourceFile):null});
  console.log(JSON.stringify({
    pass:result.pass,status:result.status,jobId:created.job.jobId,model:model??'BLOCKED',source:SOURCE,sourceSha256:SOURCE_SHA256,
    sourceAttachmentAudit:result.sourceAttachmentAudit??null,rawResponseSha256:result.rawResponseSha256??null,normalizedBatchId:result.normalizedBatchId??null,
    transportGate:result.transportValidation?.pass===true?'PASS':result.status==='BLOCKED'?'BLOCKED':'FAIL',
    evidenceInboxGate:result.inboxImport?.pass===true?'PASS':result.status==='BLOCKED'?'BLOCKED':'FAIL',
    queueVisible:Boolean(result.reviewQueue?.records?.length),canonicalWritePerformed:result.canonicalWritePerformed,runtimeWritePerformed:result.runtimeWritePerformed,productionWritePerformed:result.productionWritePerformed,errors:result.errors
  },null,2));
  if(!result.pass)process.exitCode=result.status==='BLOCKED'?3:1;
}
