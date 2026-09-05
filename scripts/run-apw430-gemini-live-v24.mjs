import crypto from'node:crypto';
import fs from'node:fs';
import path from'node:path';
import{createGeminiJob,extractGeminiResponseText,validateBridgeTransport}from'../src/product-master-core/gemini-execution-bridge.mjs';
import{inspectGeminiLivePreflight}from'../src/product-master-core/gemini-live-preflight.mjs';
import{verifyGeminiFileAttachment}from'../src/product-master-core/gemini-file-verify.mjs';
import{validateScopedSourceEquivalenceProof}from'../src/product-master-core/gemini-source-equivalence.mjs';
import{persistGeminiTransport}from'../src/product-master-core/evidence-inbox-store.mjs';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';
import{CANONICAL_FIELD_NAMES}from'../src/product-master-core/canonical-fields.mjs';
import{redactGeminiSecrets}from'../src/product-master-core/gemini-file-upload.mjs';

const SOURCE={type:'OFFICIAL_PDF',driveFileId:'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9',title:'202607_YKKAP_APW430_商品カタログ.pdf',version:'202607'};
const AUTHORITATIVE_SHA256='a3b130d2227af07808c36d74528592ab76f52b122057d831d5fef5aa34b246be';
const AUTHORITATIVE_PAGE_COUNT=140;
const PDF_PAGES=[71,72,73];
const PRINTED_PAGES=[69,70,71];
const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const artifactDir=path.resolve(value('artifact-dir')??'artifacts/gemini-live-v24/apw430');
const evidenceInboxDir=path.join(artifactDir,'evidence-inbox');
const changeControlDir=path.resolve('data/master-change-control');
const model=process.env.GEMINI_MODEL??'gemini-3.8-flash';
const apiKey=process.env.GEMINI_API_KEY??null;
const geminiFileUri=process.env.GEMINI_FILE_URI??null;
const attachmentSha256=process.env.GEMINI_ATTACHMENT_SOURCE_SHA256??AUTHORITATIVE_SHA256;
const proofFile=process.env.GEMINI_SOURCE_EQUIVALENCE_PROOF_FILE??null;
const nowIso=()=>new Date().toISOString();
const sha256=(value)=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
const safety={canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false};

let proof=null;
if(attachmentSha256!==AUTHORITATIVE_SHA256&&proofFile){
  try{proof=JSON.parse(fs.readFileSync(path.resolve(proofFile),'utf8'));}
  catch(cause){console.log(JSON.stringify({pass:false,status:'BLOCKED',gate:'SOURCE_SCOPE_EQUIVALENCE_GATE',...safety,errors:[{code:'SOURCE_EQUIVALENCE_PROOF_READ_FAILED',message:cause?.message??String(cause)}]},null,2));process.exit(4);}
}
const sourceEquivalence=validateScopedSourceEquivalenceProof({proof,authoritativeSource:{...SOURCE,sha256:AUTHORITATIVE_SHA256,pageCount:AUTHORITATIVE_PAGE_COUNT},attachmentSourceSha256:attachmentSha256,expectedPdfPages:PDF_PAGES,expectedPrintedPages:PRINTED_PAGES});
if(!sourceEquivalence.pass){console.log(JSON.stringify({pass:false,status:'BLOCKED',gate:'SOURCE_SCOPE_EQUIVALENCE_GATE',source:SOURCE,authoritativeSourceSha256:AUTHORITATIVE_SHA256,attachmentSourceSha256:attachmentSha256,...safety,errors:sourceEquivalence.errors},null,2));process.exit(4);}

const equivalencePrompt=sourceEquivalence.mode==='SCOPED_CONTENT_EQUIVALENCE'
  ?'The attached current YKK AP official retrieval PDF is byte-different from the historical Drive evidence file, but PDF pages 71-73 have passed exact normalized-text SHA-256 and rendered-pixel SHA-256 equivalence against that authoritative Drive source. Use only PDF pages 71-73 / printed pages 69-71 for evidence extraction.'
  :'The attached PDF is byte-identical to the authoritative Drive evidence file.';
const created=createGeminiJob({
  job_id:`GJOB-APW430-LIVE-${new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}`,
  job_type:'EVIDENCE_EXTRACTION',manufacturer:'YKK AP',series:'APW430',product_id:'SER-YKK-APW430',
  task:'Run one APW430 LIVE_EXTERNAL evidence extraction through the controlled responseSchema runner.',
  prompt:[
    'Read the attached YKK AP APW430 official product catalog and extract a small, auditable set of atomic evidence candidates from printed pages 69-71 only.',equivalencePrompt,
    'Return exactly one EVIDENCE_CANDIDATE_BATCH matching the response schema. Do not rename any field.',
    'Set producer.system=GEMINI_NOTEBOOKLM and producer.mode=LIVE_EXTERNAL. Every candidate uses sourceSystem=GEMINI_NOTEBOOKLM, producerMode=LIVE_EXTERNAL, status=SUBMITTED.',
    `Use sourceContext exactly as type=${SOURCE.type}, driveFileId=${SOURCE.driveFileId}, title=${SOURCE.title}, version=${SOURCE.version}.`,
    'Each candidate source must include the same provenance plus printedPage, pdfPage and locatorText.',
    'Do not approve Product Master changes. Do not write Canonical, Runtime, Production, or Registry data.'
  ].join(' '),
  source_context:SOURCE,source_drive_file_ids:[SOURCE.driveFileId],page_scope:PDF_PAGES,printed_page_scope:PRINTED_PAGES,
  source_attachment:{gemini_file_uri:geminiFileUri,mime_type:'application/pdf',source_sha256:attachmentSha256},
  metadata:{sourceEquivalence:sourceEquivalence.audit},expected_transport_type:'EVIDENCE_CANDIDATE_BATCH',expected_schema_version:'1.0',execution_mode:'LIVE_EXTERNAL',model,requested_by:'CHATGPT'
});
if(!created.pass){console.log(JSON.stringify({pass:false,status:'JOB_INVALID',...safety,errors:created.errors},null,2));process.exit(2);}
const job=created.job;
const preflight=inspectGeminiLivePreflight({env:{...process.env,GEMINI_API_KEY:apiKey??'',GEMINI_MODEL:model,GEMINI_FILE_URI:geminiFileUri??''},argv:args,jobModel:model,sourceAttachment:job.sourceAttachment,requireSource:true});
if(!preflight.pass){console.log(JSON.stringify({pass:false,status:'BLOCKED',jobId:job.jobId,model,credentialPreflight:preflight,sourceEquivalence:sourceEquivalence.audit,...safety,errors:preflight.errors},null,2));process.exit(3);}

const verified=await verifyGeminiFileAttachment({geminiFileUri:job.sourceAttachment.geminiFileUri,expectedSha256:job.sourceAttachment.sourceSha256,apiKey});
if(!verified.pass){console.log(JSON.stringify({pass:false,status:verified.status,jobId:job.jobId,model,credentialPreflight:preflight,sourceAttachmentAudit:verified.audit??null,sourceEquivalence:sourceEquivalence.audit,...safety,errors:verified.errors},null,2));process.exit(verified.status==='BLOCKED'?3:1);}

const sourceProperties={type:{type:'STRING',enum:[SOURCE.type]},driveFileId:{type:'STRING',enum:[SOURCE.driveFileId]},title:{type:'STRING',enum:[SOURCE.title]},version:{type:'STRING',enum:[SOURCE.version]}};
const candidateSourceProperties={...sourceProperties,printedPage:{type:'INTEGER'},pdfPage:{type:'INTEGER'},locatorText:{type:'STRING'}};
const canonicalFields=[...CANONICAL_FIELD_NAMES];
const responseSchema={
  type:'OBJECT',
  properties:{
    transportSchemaVersion:{type:'STRING',enum:['1.0']},
    transportType:{type:'STRING',enum:['EVIDENCE_CANDIDATE_BATCH']},
    batchId:{type:'STRING',description:'Unique batch id beginning with BATCH-'},
    generatedAt:{type:'STRING',description:'ISO 8601 timestamp'},
    producer:{type:'OBJECT',properties:{system:{type:'STRING',enum:['GEMINI_NOTEBOOKLM']},mode:{type:'STRING',enum:['LIVE_EXTERNAL']}},required:['system','mode']},
    productId:{type:'STRING',enum:['SER-YKK-APW430']},
    sourceContext:{type:'OBJECT',properties:sourceProperties,required:['type','driveFileId','title','version']},
    candidates:{type:'ARRAY',items:{type:'OBJECT',properties:{
      recordType:{type:'STRING',enum:['EVIDENCE_CANDIDATE']},candidateSchemaVersion:{type:'STRING',enum:['1.0']},id:{type:'STRING'},sourceSystem:{type:'STRING',enum:['GEMINI_NOTEBOOKLM']},producerMode:{type:'STRING',enum:['LIVE_EXTERNAL']},status:{type:'STRING',enum:['SUBMITTED']},productId:{type:'STRING',enum:['SER-YKK-APW430']},title:{type:'STRING'},subjectField:{type:'STRING',enum:canonicalFields},claim:{type:'STRING'},proposedStrength:{type:'STRING',enum:['EXPLICIT','DERIVED','SUPPORTING']},productNodeIds:{type:'ARRAY',items:{type:'STRING'}},source:{type:'OBJECT',properties:candidateSourceProperties,required:['type','driveFileId','title','version','printedPage','pdfPage','locatorText']}
    },required:['recordType','candidateSchemaVersion','id','sourceSystem','producerMode','status','productId','subjectField','claim','proposedStrength','productNodeIds','source']}},
    issues:{type:'ARRAY',items:{type:'OBJECT',properties:{id:{type:'STRING'},type:{type:'STRING',enum:['SOURCE_AMBIGUOUS','LOCATOR_UNRESOLVED','CLAIM_TOO_BROAD','SOURCE_CONFLICT','OTHER']},subjectField:{type:'STRING',enum:canonicalFields},question:{type:'STRING'}},required:['id','type','question']}}
  },
  required:['transportSchemaVersion','transportType','batchId','generatedAt','producer','productId','sourceContext','candidates','issues']
};

const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),60000);
let providerResponse=null;
let rawResponse=null;
try{
  const contract=`${job.prompt}\nReturn JSON only. Match responseSchema exactly. No Markdown.`;
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
    method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey},signal:controller.signal,
    body:JSON.stringify({contents:[{role:'user',parts:[{text:contract},{fileData:{mimeType:'application/pdf',fileUri:job.sourceAttachment.geminiFileUri}}]}],generationConfig:{responseMimeType:'application/json',responseSchema}})
  });
  providerResponse=redactGeminiSecrets(await response.json().catch(()=>null),[apiKey]);
  if(!response.ok){
    console.log(JSON.stringify({pass:false,status:'FAILED',jobId:job.jobId,model,credentialPreflight:preflight,sourceAttachmentAudit:verified.audit,sourceEquivalence:sourceEquivalence.audit,providerHttpStatus:response.status,providerError:providerResponse?.error??null,rawResponseSha256:null,transportGate:'FAIL',evidenceInboxGate:'FAIL',queueVisible:false,...safety,errors:[{code:'GEMINI_API_ERROR',message:providerResponse?.error?.message??`Gemini API HTTP ${response.status}`}]},null,2));
    process.exit(1);
  }
  rawResponse=extractGeminiResponseText(providerResponse);
}catch(cause){
  console.log(JSON.stringify({pass:false,status:'FAILED',jobId:job.jobId,model,credentialPreflight:preflight,sourceAttachmentAudit:verified.audit,sourceEquivalence:sourceEquivalence.audit,rawResponseSha256:null,transportGate:'FAIL',evidenceInboxGate:'FAIL',queueVisible:false,...safety,errors:[{code:cause?.name==='AbortError'?'GEMINI_TIMEOUT':'GEMINI_EXECUTION_FAILED',message:redactGeminiSecrets(cause?.message??String(cause),[apiKey])}]},null,2));
  process.exit(1);
}finally{clearTimeout(timer);}

if(!rawResponse){console.log(JSON.stringify({pass:false,status:'FAILED',jobId:job.jobId,model,credentialPreflight:preflight,sourceAttachmentAudit:verified.audit,sourceEquivalence:sourceEquivalence.audit,rawResponseSha256:null,transportGate:'FAIL',evidenceInboxGate:'FAIL',queueVisible:false,...safety,errors:[{code:'GEMINI_RESPONSE_TEXT_MISSING',message:'Gemini response did not contain text output'}]},null,2));process.exit(1);}
const rawResponseSha256=sha256(rawResponse);
const transportValidation=validateBridgeTransport(rawResponse,job,{expectedProductId:job.productId});
if(!transportValidation.pass){console.log(JSON.stringify({pass:false,status:'REJECTED_AT_TRANSPORT',jobId:job.jobId,model,credentialPreflight:preflight,sourceAttachmentAudit:verified.audit,sourceEquivalence:sourceEquivalence.audit,rawResponseSha256,transportGate:'FAIL',evidenceInboxGate:'NOT_EXECUTED',queueVisible:false,...safety,errors:transportValidation.errors},null,2));process.exit(1);}
const importedAt=nowIso();
const inboxImport=persistGeminiTransport(rawResponse,{rootDir:evidenceInboxDir,allowDuplicateClaims:false,importedAt,expectedProductId:job.productId});
if(!inboxImport.pass){console.log(JSON.stringify({pass:false,status:inboxImport.status,jobId:job.jobId,model,credentialPreflight:preflight,sourceAttachmentAudit:verified.audit,sourceEquivalence:sourceEquivalence.audit,rawResponseSha256,transportGate:'PASS',evidenceInboxGate:'FAIL',queueVisible:false,...safety,errors:inboxImport.errors},null,2));process.exit(1);}
const reviewQueue=buildProductMasterReviewQueue({evidenceInboxDir,changeControlDir,productId:job.productId});
const output={pass:true,status:'IMPORTED',jobId:job.jobId,model,source:SOURCE,authoritativeSourceSha256:AUTHORITATIVE_SHA256,attachmentSourceSha256:attachmentSha256,sourceEquivalence:sourceEquivalence.audit,credentialPreflight:preflight,sourceAttachmentAudit:verified.audit,rawResponseSha256,normalizedBatchId:inboxImport.batch.id,transportGate:'PASS',evidenceInboxGate:'PASS',queueVisible:Boolean(reviewQueue.records?.length),queueRecordCount:reviewQueue.records?.length??0,...safety,errors:[]};
fs.mkdirSync(artifactDir,{recursive:true});
fs.writeFileSync(path.join(artifactDir,'live-roundtrip-result.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
if(!output.queueVisible)process.exitCode=1;
