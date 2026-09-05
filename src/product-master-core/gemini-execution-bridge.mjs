import crypto from'node:crypto';
import{parseGeminiTransportJson}from'./gemini-transport.mjs';
import{persistGeminiTransport}from'./evidence-inbox-store.mjs';
import{buildProductMasterReviewQueue}from'./review-queue.mjs';
import{uploadGeminiFileFromPath,redactGeminiSecrets}from'./gemini-file-upload.mjs';
import{CANONICAL_FIELD_NAMES}from'./canonical-fields.mjs';
import{
  WORKER_EXECUTION_CONTRACT_VERSION,
  normalizeWorkerExecutionContract,
  buildWorkerExecutionContext
}from'./worker-execution-contract.mjs';
import{routeGeminiExecutionChannel}from'./execution-channel-router.mjs';

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
function safeJobId(){return`GJOB-${crypto.randomUUID().replaceAll('-','').slice(0,20).toUpperCase()}`;}
function normalizeSourceAttachment(input){
  if(input===null||input===undefined)return null;
  if(!isObject(input))return input;
  return{
    geminiFileUri:input.gemini_file_uri??input.geminiFileUri??null,
    mimeType:input.mime_type??input.mimeType??'application/pdf',
    sourceSha256:input.source_sha256??input.sourceSha256??null
  };
}

export function createGeminiJob(input={}, {requestedAt=nowIso()}={}){
  const sourceContext=input.source_context??input.sourceContext??{};
  const sourceAttachmentInput=input.source_attachment??input.sourceAttachment??null;
  const workerContractVersion=input.worker_contract_version??input.workerContractVersion??null;
  const worker=workerContractVersion===WORKER_EXECUTION_CONTRACT_VERSION
    ?normalizeWorkerExecutionContract(input,{requireLiveChannel:true})
    :{pass:true,contract:{
      workerContractVersion:null,
      executionChannel:input.execution_channel??input.executionChannel??null,
      preferredExecutionChannel:input.preferred_execution_channel??input.preferredExecutionChannel??null,
      fallbackExecutionChannel:input.fallback_execution_channel??input.fallbackExecutionChannel??null,
      fallbackAllowed:input.fallback_allowed??input.fallbackAllowed??false,
      transportMethod:input.transport_method??input.transportMethod??null,
      executionReference:input.execution_reference??input.executionReference??null,
      fallbackFrom:input.fallback_from??input.fallbackFrom??null,
      fallbackReason:input.fallback_reason??input.fallbackReason??null
    },errors:[]};
  if(!worker.pass)return{pass:false,job:null,errors:worker.errors};
  const contract=worker.contract;
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
    workerContractVersion:contract.workerContractVersion,
    executionMode:input.execution_mode??input.executionMode??'MOCK',
    executionChannel:contract.executionChannel,
    preferredExecutionChannel:contract.preferredExecutionChannel,
    fallbackExecutionChannel:contract.fallbackExecutionChannel,
    fallbackAllowed:contract.fallbackAllowed,
    fallbackFrom:contract.fallbackFrom,
    fallbackReason:contract.fallbackReason,
    transportMethod:contract.transportMethod,
    executionReference:contract.executionReference,
    model:input.model??null,
    sourceDriveFileIds:safeClone(input.source_drive_file_ids??input.sourceDriveFileIds??[]),
    pageScope:safeClone(input.page_scope??input.pageScope??null),
    printedPageScope:safeClone(input.printed_page_scope??input.printedPageScope??null),
    canonicalFieldScope:safeClone(input.canonical_field_scope??input.canonicalFieldScope??[]),
    productNodeIds:safeClone(input.product_node_ids??input.productNodeIds??[]),
    evidenceRequirements:safeClone(input.evidence_requirements??input.evidenceRequirements??null),
    sourceAttachment:safeClone(normalizeSourceAttachment(sourceAttachmentInput)),
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
  else{
    if(!job.sourceContext.type)errors.push(makeError('GEMINI_JOB_SOURCE_TYPE_MISSING','source_context.type is required'));
    if(!job.sourceContext.driveFileId)errors.push(makeError('GEMINI_JOB_SOURCE_FILE_ID_MISSING','source_context.driveFileId is required'));
    if(!job.sourceContext.title)errors.push(makeError('GEMINI_JOB_SOURCE_TITLE_MISSING','source_context.title is required'));
  }
  if(job.sourceAttachment!==null&&!isObject(job.sourceAttachment))errors.push(makeError('GEMINI_JOB_SOURCE_ATTACHMENT_INVALID','source_attachment must be an object when supplied'));
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
  if(envelope.transportType!==job.expectedTransportType)errors.push(makeError('BRIDGE_TRANSPORT_TYPE_MISMATCH',`Expected ${job.expectedTransportType}, received ${envelope.transportType}`));
  if(envelope.transportSchemaVersion!==job.expectedSchemaVersion)errors.push(makeError('BRIDGE_TRANSPORT_SCHEMA_MISMATCH',`Expected schema ${job.expectedSchemaVersion}, received ${envelope.transportSchemaVersion}`));
  const expectedSource=job.sourceContext??{};
  const actualSource=envelope.sourceContext??{};
  for(const key of['type','driveFileId','title']){
    if(expectedSource[key]!==undefined&&expectedSource[key]!==null&&actualSource[key]!==expectedSource[key]){
      errors.push(makeError('BRIDGE_SOURCE_CONTEXT_MISMATCH',`sourceContext.${key} does not match Gemini Job`,{field:key,expected:expectedSource[key],actual:actualSource[key]??null}));
    }
  }
  if(expectedSource.version&&actualSource.version!==expectedSource.version)errors.push(makeError('BRIDGE_SOURCE_CONTEXT_MISMATCH','sourceContext.version does not match Gemini Job',{field:'version',expected:expectedSource.version,actual:actualSource.version??null}));
  return{pass:errors.length===0,envelope:errors.length?null:envelope,errors};
}

function liveBlockReason(job,{apiKey,model,sourceFilePath}){
  if(!apiKey)return makeError('GEMINI_API_KEY_UNAVAILABLE','GEMINI_API_KEY is not available');
  if(!model)return makeError('GEMINI_MODEL_UNAVAILABLE','GEMINI_MODEL or job.model is required for LIVE_EXTERNAL');
  if(job.sourceContext?.type==='OFFICIAL_PDF'&&!job.sourceAttachment?.geminiFileUri&&!sourceFilePath)return makeError('GEMINI_SOURCE_ATTACHMENT_UNAVAILABLE','LIVE_EXTERNAL OFFICIAL_PDF extraction requires source_attachment.gemini_file_uri or a Drive-fetched local source file path');
  return null;
}

function liveParts(job){
  const contract=[
    job.prompt,'',
    'Return exactly one object matching the response JSON schema supplied by the API request.',
    `transportType must be ${job.expectedTransportType}.`,
    `transportSchemaVersion must be ${job.expectedSchemaVersion}.`,
    `productId must be ${job.productId}.`,
    `sourceContext.type must be ${job.sourceContext?.type}.`,
    `sourceContext.driveFileId must be ${job.sourceContext?.driveFileId}.`,
    `sourceContext.title must be ${job.sourceContext?.title}.`,
    job.sourceContext?.version?`sourceContext.version must be ${job.sourceContext.version}.`:null,
    'Every candidate must use recordType=EVIDENCE_CANDIDATE, candidateSchemaVersion=1.0, sourceSystem=GEMINI_NOTEBOOKLM, producerMode=LIVE_EXTERNAL, status=SUBMITTED.',
    'Do not rename schema fields. Do not use aliases. Do not omit required envelope or candidate fields.',
    'Do not use Markdown code fences.'
  ].filter(Boolean).join('\n');
  const parts=[{text:contract}];
  if(job.sourceAttachment?.geminiFileUri)parts.push({fileData:{mimeType:job.sourceAttachment.mimeType??'application/pdf',fileUri:job.sourceAttachment.geminiFileUri}});
  return parts;
}

export function buildGeminiTransportResponseJsonSchema(job){
  const source=job.sourceContext??{};
  const subjectFieldValues=(job.canonicalFieldScope?.length?job.canonicalFieldScope:[...CANONICAL_FIELD_NAMES]).filter((value)=>typeof value==='string'&&value.length>0);
  const sourceProperties={
    type:{type:'string',enum:[source.type??'OFFICIAL_PDF']},
    driveFileId:{type:'string',enum:[source.driveFileId]},
    title:{type:'string',enum:[source.title]}
  };
  const sourceRequired=['type','driveFileId','title'];
  if(source.version){sourceProperties.version={type:'string',enum:[source.version]};sourceRequired.push('version');}
  const candidateSourceProperties={
    ...sourceProperties,
    printedPage:{type:'integer',minimum:1},
    pdfPage:{type:'integer',minimum:1},
    locatorText:{type:'string'}
  };
  const issueProperties={
    id:{type:'string'},
    type:{type:'string',enum:['SOURCE_AMBIGUOUS','LOCATOR_UNRESOLVED','CLAIM_TOO_BROAD','SOURCE_CONFLICT','OTHER']},
    question:{type:'string'}
  };
  if(subjectFieldValues.length)issueProperties.subjectField={type:'string',enum:subjectFieldValues};
  return{
    type:'object',
    additionalProperties:false,
    required:['transportSchemaVersion','transportType','batchId','generatedAt','producer','productId','sourceContext','candidates','issues'],
    properties:{
      transportSchemaVersion:{type:'string',enum:[job.expectedSchemaVersion]},
      transportType:{type:'string',enum:[job.expectedTransportType]},
      batchId:{type:'string',description:'Unique batch identifier beginning with BATCH-'},
      generatedAt:{type:'string',format:'date-time',description:'ISO 8601 generation timestamp'},
      producer:{type:'object',additionalProperties:false,required:['system','mode'],properties:{system:{type:'string',enum:['GEMINI_NOTEBOOKLM']},mode:{type:'string',enum:['LIVE_EXTERNAL']}}},
      productId:{type:'string',enum:[job.productId]},
      sourceContext:{type:'object',additionalProperties:false,required:sourceRequired,properties:sourceProperties},
      candidates:{
        type:'array',minItems:1,maxItems:8,
        items:{
          type:'object',additionalProperties:false,
          required:['recordType','candidateSchemaVersion','id','sourceSystem','producerMode','status','productId','subjectField','claim','proposedStrength','productNodeIds','source'],
          properties:{
            recordType:{type:'string',enum:['EVIDENCE_CANDIDATE']},
            candidateSchemaVersion:{type:'string',enum:['1.0']},
            id:{type:'string',description:'Unique candidate identifier beginning with CAND-'},
            sourceSystem:{type:'string',enum:['GEMINI_NOTEBOOKLM']},
            producerMode:{type:'string',enum:['LIVE_EXTERNAL']},
            status:{type:'string',enum:['SUBMITTED']},
            productId:{type:'string',enum:[job.productId]},
            title:{type:'string'},
            subjectField:{type:'string',enum:subjectFieldValues},
            claim:{type:'string'},
            proposedStrength:{type:'string',enum:['EXPLICIT','DERIVED','SUPPORTING']},
            productNodeIds:{type:'array',items:{type:'string'},maxItems:20},
            source:{type:'object',additionalProperties:false,required:[...sourceRequired,'printedPage','pdfPage','locatorText'],properties:candidateSourceProperties}
          }
        }
      },
      issues:{type:'array',maxItems:8,items:{type:'object',additionalProperties:false,required:['id','type','question'],properties:issueProperties}}
    }
  };
}

export async function executeGeminiJob(job,{
  mockResponse=null,replayResponse=null,externalResponse=null,apiKey=process.env.GEMINI_API_KEY??null,model=job?.model??process.env.GEMINI_MODEL??null,
  sourceFilePath=process.env.GEMINI_SOURCE_FILE??null,sourceUploadImpl=uploadGeminiFileFromPath,fetchImpl=globalThis.fetch,timeoutMs=60000
}={}){
  let working=withTransition(job,'QUEUED');
  working=withTransition(working,'RUNNING');
  if(working.executionMode==='MOCK'){
    if(typeof mockResponse!=='string')return{pass:false,job:withTransition(working,'BLOCKED',{reason:'MOCK_RESPONSE_REQUIRED'}),routeDecision:null,rawResponse:null,sourceAttachmentAudit:null,errors:[makeError('MOCK_RESPONSE_REQUIRED','MOCK execution requires mockResponse string')]};
    return{pass:true,job:withTransition(working,'SUCCEEDED'),routeDecision:null,rawResponse:mockResponse,providerResponse:null,sourceAttachmentAudit:null,errors:[]};
  }
  if(working.executionMode==='REPLAY'){
    if(typeof replayResponse!=='string')return{pass:false,job:withTransition(working,'BLOCKED',{reason:'REPLAY_RESPONSE_REQUIRED'}),routeDecision:null,rawResponse:null,sourceAttachmentAudit:null,errors:[makeError('REPLAY_RESPONSE_REQUIRED','REPLAY execution requires replayResponse string')]};
    return{pass:true,job:withTransition(working,'SUCCEEDED'),routeDecision:null,rawResponse:replayResponse,providerResponse:null,sourceAttachmentAudit:null,errors:[]};
  }

  let route=routeGeminiExecutionChannel(working);
  if(!route.pass)return{pass:false,job:withTransition(route.job,'BLOCKED',{reason:route.errors?.[0]?.code??'EXECUTION_CHANNEL_ROUTER_BLOCKED'}),routeDecision:route.decision,rawResponse:null,sourceAttachmentAudit:null,errors:route.errors};
  working=route.job;
  let routeDecision=route.decision;

  if(working.workerContractVersion===WORKER_EXECUTION_CONTRACT_VERSION&&working.executionChannel==='GEMINI_AI_PRO'){
    if(typeof externalResponse==='string'){
      if(!working.executionReference)return{pass:false,job:withTransition(working,'BLOCKED',{reason:'GEMINI_AI_PRO_EXECUTION_REFERENCE_MISSING'}),routeDecision,rawResponse:null,sourceAttachmentAudit:null,errors:[makeError('GEMINI_AI_PRO_EXECUTION_REFERENCE_MISSING','GEMINI_AI_PRO external handoff requires execution_reference')]};
      return{pass:true,job:withTransition(working,'SUCCEEDED'),routeDecision,rawResponse:externalResponse,providerResponse:null,sourceAttachmentAudit:null,errors:[]};
    }
    route=routeGeminiExecutionChannel(working,{unavailableChannel:'GEMINI_AI_PRO',reason:'GEMINI_AI_PRO_EXECUTION_SURFACE_UNAVAILABLE'});
    routeDecision=route.decision;
    if(!route.pass)return{pass:false,job:withTransition(route.job,'BLOCKED',{reason:route.errors?.[0]?.code??'EXECUTION_CHANNEL_ROUTER_BLOCKED',routeDecision}),routeDecision,rawResponse:null,sourceAttachmentAudit:null,errors:route.errors};
    working=withTransition(route.job,'RUNNING',{fallbackFrom:route.job.fallbackFrom,fallbackReason:route.job.fallbackReason,executionChannel:route.job.executionChannel,routeDecision});
  }

  const executionModel=working.model??model??null;
  if(executionModel&&!working.model)working.model=executionModel;
  const blocked=liveBlockReason(working,{apiKey,model:executionModel,sourceFilePath});
  if(blocked)return{pass:false,job:withTransition(working,'BLOCKED',{reason:blocked.code}),routeDecision,rawResponse:null,sourceAttachmentAudit:null,errors:[blocked]};
  if(typeof fetchImpl!=='function')return{pass:false,job:withTransition(working,'BLOCKED',{reason:'FETCH_UNAVAILABLE'}),routeDecision,rawResponse:null,sourceAttachmentAudit:null,errors:[makeError('FETCH_UNAVAILABLE','No fetch implementation is available for LIVE_EXTERNAL')]};
  if(working.workerContractVersion===WORKER_EXECUTION_CONTRACT_VERSION&&working.executionChannel!=='GEMINI_API')return{pass:false,job:withTransition(working,'BLOCKED',{reason:'GEMINI_API_EXECUTION_CHANNEL_REQUIRED'}),routeDecision,rawResponse:null,sourceAttachmentAudit:null,errors:[makeError('GEMINI_API_EXECUTION_CHANNEL_REQUIRED',`Direct Gemini API execution requires execution_channel=GEMINI_API, received ${working.executionChannel??'null'}`)]};
  if(working.workerContractVersion===WORKER_EXECUTION_CONTRACT_VERSION&&!working.executionReference)working.executionReference=`GEMINI_API_JOB:${working.jobId}`;
  let sourceAttachmentAudit=null;
  if(working.sourceContext?.type==='OFFICIAL_PDF'&&!working.sourceAttachment?.geminiFileUri){
    const upload=await sourceUploadImpl({
      filePath:sourceFilePath,apiKey,mimeType:working.sourceAttachment?.mimeType??'application/pdf',expectedSha256:working.sourceAttachment?.sourceSha256??null,fetchImpl,timeoutMs
    });
    sourceAttachmentAudit=upload.audit??null;
    if(!upload.pass){
      const status=upload.status==='BLOCKED'?'BLOCKED':'FAILED';
      return{pass:false,job:withTransition(working,status,{reason:upload.errors?.[0]?.code??'GEMINI_FILE_UPLOAD_FAILED'}),routeDecision,rawResponse:null,sourceAttachmentAudit,errors:upload.errors??[]};
    }
    working.sourceAttachment={...(working.sourceAttachment??{}),...upload.attachment};
  }
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(executionModel)}:generateContent`;
    const responseJsonSchema=buildGeminiTransportResponseJsonSchema(working);
    const response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey},signal:controller.signal,body:JSON.stringify({contents:[{role:'user',parts:liveParts(working)}],generationConfig:{responseMimeType:'application/json',responseJsonSchema}})});
    const providerResponse=redactGeminiSecrets(await response.json().catch(()=>null),[apiKey]);
    if(!response.ok){
      const message=redactGeminiSecrets(providerResponse?.error?.message??`Gemini API HTTP ${response.status}`,[apiKey]);
      return{pass:false,job:withTransition(working,'FAILED',{reason:'GEMINI_API_ERROR'}),routeDecision,rawResponse:null,providerResponse,sourceAttachmentAudit,errors:[makeError('GEMINI_API_ERROR',message,{httpStatus:response.status})]};
    }
    const rawResponse=extractGeminiResponseText(providerResponse);
    if(!rawResponse)return{pass:false,job:withTransition(working,'FAILED',{reason:'GEMINI_RESPONSE_TEXT_MISSING'}),routeDecision,rawResponse:null,providerResponse,sourceAttachmentAudit,errors:[makeError('GEMINI_RESPONSE_TEXT_MISSING','Gemini response did not contain text output')]};
    return{pass:true,job:withTransition(working,'SUCCEEDED'),routeDecision,rawResponse,providerResponse,sourceAttachmentAudit,errors:[]};
  }catch(cause){
    const code=cause?.name==='AbortError'?'GEMINI_TIMEOUT':'GEMINI_EXECUTION_FAILED';
    return{pass:false,job:withTransition(working,'FAILED',{reason:code}),routeDecision,rawResponse:null,sourceAttachmentAudit,errors:[makeError(code,redactGeminiSecrets(cause?.message??String(cause),[apiKey]))]};
  }finally{clearTimeout(timer);}
}

export async function runGeminiProductMasterBridge(job,{
  evidenceInboxDir='data/evidence-inbox',changeControlDir='data/master-change-control',transportOptions={},allowDuplicateClaims=false,importedAt=nowIso(),...executionOptions
}={}){
  const execution=await executeGeminiJob(job,executionOptions);
  const safety={canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false};
  if(!execution.pass)return{pass:false,status:execution.job.status,job:execution.job,routeDecision:execution.routeDecision??null,rawResponseSha256:null,sourceAttachmentAudit:execution.sourceAttachmentAudit??null,transportValidation:null,inboxImport:null,reviewQueue:null,...safety,errors:execution.errors};
  const raw=execution.rawResponse;
  const rawResponseSha256=sha256(raw);
  const transportValidation=validateBridgeTransport(raw,execution.job,transportOptions);
  if(!transportValidation.pass){
    const rejected=withTransition(execution.job,'REJECTED_AT_TRANSPORT',{rawResponseSha256});
    return{pass:false,status:'REJECTED_AT_TRANSPORT',job:rejected,routeDecision:execution.routeDecision??null,rawResponseSha256,sourceAttachmentAudit:execution.sourceAttachmentAudit??null,transportValidation,inboxImport:null,reviewQueue:null,...safety,errors:transportValidation.errors};
  }
  const executionContext=buildWorkerExecutionContext(execution.job);
  const inboxImport=persistGeminiTransport(raw,{rootDir:evidenceInboxDir,allowDuplicateClaims,importedAt,executionContext,...transportOptions,expectedProductId:execution.job.productId});
  if(!inboxImport.pass){
    const rejectedStatus=inboxImport.status==='REJECTED_AT_TRANSPORT_BOUNDARY'?'REJECTED_AT_TRANSPORT':'REJECTED_AT_INBOX';
    const rejected=withTransition(execution.job,rejectedStatus,{rawResponseSha256,inboxStatus:inboxImport.status});
    return{pass:false,status:rejectedStatus,job:rejected,routeDecision:execution.routeDecision??null,rawResponseSha256,sourceAttachmentAudit:execution.sourceAttachmentAudit??null,transportValidation,inboxImport,reviewQueue:null,...safety,errors:inboxImport.errors};
  }
  const imported=withTransition(execution.job,'IMPORTED',{rawResponseSha256,batchId:inboxImport.batch.id});
  const reviewQueue=buildProductMasterReviewQueue({evidenceInboxDir,changeControlDir,productId:imported.productId});
  return{pass:true,status:'IMPORTED',job:imported,routeDecision:execution.routeDecision??null,executionContext,rawResponseSha256,responseReceivedAt:importedAt,normalizedBatchId:inboxImport.batch.id,sourceAttachmentAudit:execution.sourceAttachmentAudit??null,transportValidation,inboxImport,reviewQueue,...safety,errors:[]};
}
