import crypto from'node:crypto';
import{parseGeminiTransportJson}from'./gemini-transport.mjs';
import{persistGeminiTransport}from'./evidence-inbox-store.mjs';
import{buildProductMasterReviewQueue}from'./review-queue.mjs';

export const GEMINI_JOB_SCHEMA_VERSION='1.0';
export const GEMINI_JOB_EXECUTION_MODES=new Set(['MOCK','LIVE_EXTERNAL','REPLAY']);
export const GEMINI_JOB_STATUSES=new Set([
  'CREATED','QUEUED','RUNNING','SUCCEEDED','FAILED','BLOCKED','IMPORTED','REJECTED_AT_TRANSPORT','REJECTED_AT_INBOX'
]);

const nowIso=()=>new Date().toISOString();
const sha256=(value)=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const safeClone=(value)=>structuredClone(value);

function makeError(code,message,details={}){return{code,message,...details};}
function transition(status,at=nowIso(),details={}){return{status,at,...details};}
function safeJobId(){
  return`GJOB-${crypto.randomUUID().replaceAll('-','').slice(0,20).toUpperCase()}`;
}

export function createGeminiJob(input={}, {requestedAt=nowIso()}={}){
  const sourceContext=input.source_context??input.sourceContext??{};
  const job={
    jobSchemaVersion:GEMINI_JOB_SCHEMA_VERSION,
    recordType:'GEMINI_PRODUCT_MASTER_JOB',
    jobId:input.job_id??input.jobId??safeJobId(),
    jobType:input.job_type??input.jobType??'EVIDENCE_EXTRACTION',
    manufacturer:input.manufacturer??null,
    series:input.series??null,
    productId:input.product_id??input.productId??null,
    task:input.task??null,
    prompt:input.prompt??null,
    sourceContext:safeClone(sourceContext),
    expectedTransportType:input.expected_transport_type??input.expectedTransportType??'EVIDENCE_CANDIDATE_BATCH',
    expectedSchemaVersion:input.expected_schema_version??input.expectedSchemaVersion??'1.0',
    requestedAt:input.requested_at??input.requestedAt??requestedAt,
    requestedBy:input.requested_by??input.requestedBy??'CHATGPT',
    executionMode:input.execution_mode??input.executionMode??'MOCK',
    model:input.model??null,
    sourceDriveFileIds:safeClone(input.source_drive_file_ids??input.sourceDriveFileIds??[]),
    pageScope:safeClone(input.page_scope??input.pageScope??null),
    printedPageScope:safeClone(input.printed_page_scope??input.printedPageScope??null),
    canonicalFieldScope:safeClone(input.canonical_field_scope??input.canonicalFieldScope??[]),
    productNodeIds:safeClone(input.product_node_ids??input.productNodeIds??[]),
    evidenceRequirements:safeClone(input.evidence_requirements??input.evidenceRequirements??null),
    sourceAttachment:safeClone(input.source_attachment??input.sourceAttachment??null),
    metadata:safeClone(input.metadata??{}),
    status:'CREATED',
    transitions:[transition('CREATED',input.requested_at??input.requestedAt??requestedAt)]
  };
  const errors=[];
  if(!job.jobId)errors.push(makeError('GEMINI_JOB_ID_MISSING','job_id is required'));
  if(!job.manufacturer)errors.push(makeError('GEMINI_JOB_MANUFACTURER_MISSING','manufacturer is required'));
  if(!job.series)errors.push(makeError('GEMINI_JOB_SERIES_MISSING','series is required'));
  if(!job.productId)errors.push(makeError('GEMINI_JOB_PRODUCT_ID_MISSING','product_id is required'));
  if(!job.task)errors.push(makeError('GEMINI_JOB_TASK_MISSING','task is required'));
  if(!job.prompt)errors.push(makeError('GEMINI_JOB_PROMPT_MISSING','prompt is required'));
  if(!isObject(job.sourceContext))errors.push(makeError('GEMINI_JOB_SOURCE_CONTEXT_INVALID','source_context must be an object'));
  if(!GEMINI_JOB_EXECUTION_MODES.has(job.executionMode))errors.push(makeError('GEMINI_JOB_EXECUTION_MODE_INVALID',`Unsupported execution mode: ${job.executionMode}`));
  return{pass:errors.length===0,job:errors.length?null:job,errors};
}

function withTransition(job,status,details={}){
  const next=safeClone(job);
  next.status=status;
  next.transitions=[...(next.transitions??[]),transition(status,nowIso(),details)];
  return next;
}

export function extractGeminiResponseText(response){
  if(typeof response==='string')return response;
  if(!isObject(response))return null;
  if(typeof response.text==='string')return response.text;
  const parts=response.candidates?.[0]?.content?.parts??[];
  const text=parts.map((part)=>part?.text).filter((value)=>typeof value==='string').join('');
  return text||null;
}

export function validateBridgeTransport(raw,job,options={}){
  const parsed=parseGeminiTransportJson(raw,{expectedProductId:job.productId,...options});
  if(!parsed.pass)return{pass:false,envelope:null,errors:parsed.errors};
  const errors=[];
  const envelope=parsed.envelope;
  if(envelope.transportType!==job.expectedTransportType){
    errors.push(makeError('BRIDGE_TRANSPORT_TYPE_MISMATCH',`Expected ${job.expectedTransportType}, received ${envelope.transportType}`));
  }
  if(envelope.transportSchemaVersion!==job.expectedSchemaVersion){
    errors.push(makeError('BRIDGE_TRANSPORT_SCHEMA_MISMATCH',`Expected schema ${job.expectedSchemaVersion}, received ${envelope.transportSchemaVersion}`));
  }
  const expectedSource=job.sourceContext??{};
  const actualSource=envelope.sourceContext??{};
  for(const key of['type','driveFileId','title']){
    if(expectedSource[key]!==undefined&&expectedSource[key]!==null&&actualSource[key]!==expectedSource[key]){
      errors.push(makeError('BRIDGE_SOURCE_CONTEXT_MISMATCH',`sourceContext.${key} does not match Gemini Job`,{field:key,expected:expectedSource[key],actual:actualSource[key]??null}));
    }
  }
  if(expectedSource.version&&actualSource.version!==expectedSource.version){
    errors.push(makeError('BRIDGE_SOURCE_CONTEXT_MISMATCH','sourceContext.version does not match Gemini Job',{field:'version',expected:expectedSource.version,actual:actualSource.version??null}));
  }
  return{pass:errors.length===0,envelope:errors.length?null:envelope,errors};
}

function liveBlockReason(job,{apiKey,model}){
  if(!apiKey)return makeError('GEMINI_API_KEY_UNAVAILABLE','GEMINI_API_KEY is not available');
  if(!model)return makeError('GEMINI_MODEL_UNAVAILABLE','GEMINI_MODEL or job.model is required for LIVE_EXTERNAL');
  if(job.sourceContext?.type==='OFFICIAL_PDF'&&!job.sourceAttachment?.geminiFileUri){
    return makeError('GEMINI_SOURCE_ATTACHMENT_UNAVAILABLE','LIVE_EXTERNAL OFFICIAL_PDF extraction requires source_attachment.gemini_file_uri; Drive fileId is provenance only');
  }
  return null;
}

function liveParts(job){
  const contract=[
    job.prompt,
    '',
    'Return only one pure JSON object.',
    `transportType must be ${job.expectedTransportType}.`,
    `transportSchemaVersion must be ${job.expectedSchemaVersion}.`,
    `productId must be ${job.productId}.`,
    'Do not use Markdown code fences.'
  ].join('\n');
  const parts=[{text:contract}];
  if(job.sourceAttachment?.geminiFileUri){
    parts.push({fileData:{mimeType:job.sourceAttachment.mimeType??'application/pdf',fileUri:job.sourceAttachment.geminiFileUri}});
  }
  return parts;
}

export async function executeGeminiJob(job,{
  mockResponse=null,
  replayResponse=null,
  apiKey=process.env.GEMINI_API_KEY??null,
  model=job?.model??process.env.GEMINI_MODEL??null,
  fetchImpl=globalThis.fetch,
  timeoutMs=60000
}={}){
  let working=withTransition(job,'QUEUED');
  working=withTransition(working,'RUNNING');
  if(working.executionMode==='MOCK'){
    if(typeof mockResponse!=='string')return{pass:false,job:withTransition(working,'BLOCKED',{reason:'MOCK_RESPONSE_REQUIRED'}),rawResponse:null,errors:[makeError('MOCK_RESPONSE_REQUIRED','MOCK execution requires mockResponse string')]};
    return{pass:true,job:withTransition(working,'SUCCEEDED'),rawResponse:mockResponse,providerResponse:null,errors:[]};
  }
  if(working.executionMode==='REPLAY'){
    if(typeof replayResponse!=='string')return{pass:false,job:withTransition(working,'BLOCKED',{reason:'REPLAY_RESPONSE_REQUIRED'}),rawResponse:null,errors:[makeError('REPLAY_RESPONSE_REQUIRED','REPLAY execution requires replayResponse string')]};
    return{pass:true,job:withTransition(working,'SUCCEEDED'),rawResponse:replayResponse,providerResponse:null,errors:[]};
  }
  const blocked=liveBlockReason(working,{apiKey,model});
  if(blocked)return{pass:false,job:withTransition(working,'BLOCKED',{reason:blocked.code}),rawResponse:null,errors:[blocked]};
  if(typeof fetchImpl!=='function')return{pass:false,job:withTransition(working,'BLOCKED',{reason:'FETCH_UNAVAILABLE'}),rawResponse:null,errors:[makeError('FETCH_UNAVAILABLE','No fetch implementation is available for LIVE_EXTERNAL')]};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response=await fetchImpl(url,{
      method:'POST',
      headers:{'content-type':'application/json','x-goog-api-key':apiKey},
      signal:controller.signal,
      body:JSON.stringify({
        contents:[{role:'user',parts:liveParts(working)}],
        generationConfig:{responseMimeType:'application/json'}
      })
    });
    const providerResponse=await response.json().catch(()=>null);
    if(!response.ok){
      const message=providerResponse?.error?.message??`Gemini API HTTP ${response.status}`;
      return{pass:false,job:withTransition(working,'FAILED',{reason:'GEMINI_API_ERROR'}),rawResponse:null,providerResponse,errors:[makeError('GEMINI_API_ERROR',message,{httpStatus:response.status})]};
    }
    const rawResponse=extractGeminiResponseText(providerResponse);
    if(!rawResponse)return{pass:false,job:withTransition(working,'FAILED',{reason:'GEMINI_RESPONSE_TEXT_MISSING'}),rawResponse:null,providerResponse,errors:[makeError('GEMINI_RESPONSE_TEXT_MISSING','Gemini response did not contain text output')]};
    return{pass:true,job:withTransition(working,'SUCCEEDED'),rawResponse,providerResponse,errors:[]};
  }catch(cause){
    const code=cause?.name==='AbortError'?'GEMINI_TIMEOUT':'GEMINI_EXECUTION_FAILED';
    return{pass:false,job:withTransition(working,'FAILED',{reason:code}),rawResponse:null,errors:[makeError(code,cause?.message??String(cause))]};
  }finally{
    clearTimeout(timer);
  }
}

export async function runGeminiProductMasterBridge(job,{
  evidenceInboxDir='data/evidence-inbox',
  changeControlDir='data/master-change-control',
  transportOptions={},
  allowDuplicateClaims=false,
  importedAt=nowIso(),
  ...executionOptions
}={}){
  const execution=await executeGeminiJob(job,executionOptions);
  const safety={canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false};
  if(!execution.pass)return{pass:false,status:execution.job.status,job:execution.job,rawResponseSha256:null,transportValidation:null,inboxImport:null,reviewQueue:null,...safety,errors:execution.errors};
  const raw=execution.rawResponse;
  const rawResponseSha256=sha256(raw);
  const transportValidation=validateBridgeTransport(raw,execution.job,transportOptions);
  if(!transportValidation.pass){
    const rejected=withTransition(execution.job,'REJECTED_AT_TRANSPORT',{rawResponseSha256});
    return{pass:false,status:'REJECTED_AT_TRANSPORT',job:rejected,rawResponseSha256,transportValidation,inboxImport:null,reviewQueue:null,...safety,errors:transportValidation.errors};
  }
  const inboxImport=persistGeminiTransport(raw,{rootDir:evidenceInboxDir,allowDuplicateClaims,importedAt,...transportOptions,expectedProductId:execution.job.productId});
  if(!inboxImport.pass){
    const rejectedStatus=inboxImport.status==='REJECTED_AT_TRANSPORT_BOUNDARY'?'REJECTED_AT_TRANSPORT':'REJECTED_AT_INBOX';
    const rejected=withTransition(execution.job,rejectedStatus,{rawResponseSha256,inboxStatus:inboxImport.status});
    return{pass:false,status:rejectedStatus,job:rejected,rawResponseSha256,transportValidation,inboxImport,reviewQueue:null,...safety,errors:inboxImport.errors};
  }
  const imported=withTransition(execution.job,'IMPORTED',{rawResponseSha256,batchId:inboxImport.batch.id});
  const reviewQueue=buildProductMasterReviewQueue({evidenceInboxDir,changeControlDir,productId:imported.productId});
  return{
    pass:true,status:'IMPORTED',job:imported,rawResponseSha256,
    responseReceivedAt:importedAt,normalizedBatchId:inboxImport.batch.id,
    transportValidation,inboxImport,reviewQueue,...safety,errors:[]
  };
}
