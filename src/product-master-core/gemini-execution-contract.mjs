export const GEMINI_EXECUTION_AUDIT_SCHEMA_VERSION='1.1';
export const GEMINI_EXECUTION_AUDIT_RECORD_TYPE='PRODUCT_MASTER_GEMINI_EXECUTION';
export const GEMINI_EXECUTION_SURFACES=new Set(['ANTIGRAVITY_CLI','GOOGLE_GEMINI_API']);
export const GEMINI_EXECUTION_STATUSES=new Set(['SUCCEEDED','BLOCKED','FAILED']);

const SHA256_RE=/^[a-f0-9]{64}$/i;
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const makeError=(code,message,details={})=>({code,message,...details});
const normalizeSha=(value)=>SHA256_RE.test(String(value??'').trim())?String(value).trim().toLowerCase():null;
const safeClone=(value)=>value===undefined?undefined:structuredClone(value);

function stableJobContext(job={}){
  return{
    jobId:job.jobId??null,
    manufacturer:job.manufacturer??null,
    series:job.series??null,
    productId:job.productId??null,
    executionMode:job.executionMode??null,
    executionChannel:job.executionChannel??null,
    preferredExecutionChannel:job.preferredExecutionChannel??null,
    fallbackExecutionChannel:job.fallbackExecutionChannel??null,
    fallbackAllowed:job.fallbackAllowed??false,
    fallbackFrom:job.fallbackFrom??null,
    fallbackReason:job.fallbackReason??null,
    transportMethod:job.transportMethod??null,
    executionReference:job.executionReference??null,
    model:job.model??null
  };
}

function sourceRefs(sourceAcquisition,sourceDelivery){
  return{
    acquisition:{
      driveFileId:sourceAcquisition?.source?.driveFileId??null,
      title:sourceAcquisition?.source?.title??null,
      version:sourceAcquisition?.source?.version??null,
      acquiredSha256:sourceAcquisition?.retrieval?.acquiredSha256??null,
      identityMode:sourceAcquisition?.identity?.mode??null
    },
    delivery:{
      method:sourceDelivery?.delivery?.method??null,
      pdfPages:safeClone(sourceDelivery?.scope?.pdfPages??[]),
      printedPages:safeClone(sourceDelivery?.scope?.printedPages??[]),
      artifactSha256:sourceDelivery?.delivery?.artifactSha256??sourceDelivery?.delivery?.sourceSha256??null,
      providerAttachmentReference:sourceDelivery?.providerAttachmentReference??null
    }
  };
}

export function buildAiProGeminiExecutionAudit({job,sourceAcquisition,sourceDelivery,antigravityAudit,rawResponseSha256=null}={}){
  const errors=[];
  if(job?.executionMode!=='LIVE_EXTERNAL')errors.push(makeError('GEMINI_EXECUTION_MODE_MISMATCH','AI Pro execution audit requires LIVE_EXTERNAL Job'));
  if(job?.executionChannel!=='GEMINI_AI_PRO')errors.push(makeError('GEMINI_EXECUTION_CHANNEL_MISMATCH','AI Pro execution audit requires executionChannel=GEMINI_AI_PRO'));
  if(!nonBlank(job?.executionReference))errors.push(makeError('GEMINI_EXECUTION_REFERENCE_MISSING','AI Pro execution requires a traceable executionReference'));
  if(sourceAcquisition?.status!=='PASS'||sourceAcquisition?.executionChannel!=='GEMINI_AI_PRO')errors.push(makeError('GEMINI_EXECUTION_SOURCE_ACQUISITION_INVALID','AI Pro execution requires PASS GEMINI_AI_PRO Source Acquisition'));
  if(sourceDelivery?.status!=='PASS'||sourceDelivery?.executionChannel!=='GEMINI_AI_PRO'||sourceDelivery?.delivery?.method!=='INLINE_VERIFIED_PAGE_SCOPED_TEXT')errors.push(makeError('GEMINI_EXECUTION_SOURCE_DELIVERY_INVALID','AI Pro execution requires PASS inline scoped-text Source Delivery'));
  if(!isObject(antigravityAudit))errors.push(makeError('GEMINI_EXECUTION_SURFACE_AUDIT_MISSING','Antigravity execution audit is required'));
  const providerStatus=antigravityAudit?.status??null;
  if(providerStatus!=='SUCCESS')errors.push(makeError('GEMINI_EXECUTION_PROVIDER_STATUS_INVALID','Antigravity execution status must be SUCCESS',{actual:providerStatus}));
  if(antigravityAudit?.producerSystem!=='GEMINI_ANTIGRAVITY')errors.push(makeError('GEMINI_EXECUTION_PRODUCER_MISMATCH','Antigravity producerSystem must be GEMINI_ANTIGRAVITY',{actual:antigravityAudit?.producerSystem??null}));
  if(antigravityAudit?.authenticationMode!=='GOOGLE_AI_PRO_OAUTH')errors.push(makeError('GEMINI_EXECUTION_AUTH_MODE_MISMATCH','AI Pro execution authenticationMode must be GOOGLE_AI_PRO_OAUTH',{actual:antigravityAudit?.authenticationMode??null}));
  if((antigravityAudit?.permissionDeniedActions??[]).length)errors.push(makeError('GEMINI_EXECUTION_DENIED_ACTIONS_PRESENT','Antigravity execution attempted denied actions',{deniedActions:antigravityAudit.permissionDeniedActions}));
  const providerRawSha=normalizeSha(antigravityAudit?.structured_output_sha256);
  const expectedRawSha=normalizeSha(rawResponseSha256)??providerRawSha;
  if(!providerRawSha)errors.push(makeError('GEMINI_EXECUTION_RESPONSE_SHA_MISSING','Antigravity structured output SHA-256 is required'));
  if(rawResponseSha256&&providerRawSha&&normalizeSha(rawResponseSha256)!==providerRawSha)errors.push(makeError('GEMINI_EXECUTION_RESPONSE_SHA_MISMATCH','Antigravity output fingerprint does not match governed raw response',{expected:normalizeSha(rawResponseSha256),actual:providerRawSha}));
  if(antigravityAudit?.canonicalWritePerformed!==false||antigravityAudit?.runtimeWritePerformed!==false||antigravityAudit?.productionWritePerformed!==false)errors.push(makeError('GEMINI_EXECUTION_AUTHORITY_VIOLATION','Worker execution audit must prove no authoritative writes'));
  if(errors.length)return{pass:false,record:null,errors};

  return{pass:true,record:{
    schemaVersion:GEMINI_EXECUTION_AUDIT_SCHEMA_VERSION,
    recordType:GEMINI_EXECUTION_AUDIT_RECORD_TYPE,
    status:'SUCCEEDED',
    ...stableJobContext(job),
    surface:{
      id:'ANTIGRAVITY_CLI',
      providerSystem:'GEMINI_ANTIGRAVITY',
      authenticationMode:'GOOGLE_AI_PRO_OAUTH',
      model:job?.model??null,
      modelKnown:nonBlank(job?.model),
      modelSource:nonBlank(job?.model)?'JOB_MODEL':null,
      conversationReference:antigravityAudit?.conversation_id??null
    },
    preflight:{
      status:'PASS',
      credentialPresent:true,
      credentialSource:'GOOGLE_AI_PRO_OAUTH_SESSION',
      credentialValuePersisted:false,
      executionSurfaceAvailable:true
    },
    source:sourceRefs(sourceAcquisition,sourceDelivery),
    result:{
      providerStatus:'SUCCESS',
      rawResponseSha256:expectedRawSha,
      durationSeconds:Number.isFinite(Number(antigravityAudit?.duration_seconds))?Number(antigravityAudit.duration_seconds):null,
      turnCount:Number.isInteger(Number(antigravityAudit?.num_turns))?Number(antigravityAudit.num_turns):null,
      usage:safeClone(antigravityAudit?.usage??null),
      transientRetryCount:0
    },
    authority:{canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false},
    credentialMaterialPersisted:false
  },errors:[]};
}

export function buildApiGeminiExecutionAudit({job,sourceAcquisition,sourceDelivery,result}={}){
  const errors=[];
  if(job?.executionMode!=='LIVE_EXTERNAL')errors.push(makeError('GEMINI_EXECUTION_MODE_MISMATCH','API execution audit requires LIVE_EXTERNAL Job'));
  if(job?.executionChannel!=='GEMINI_API')errors.push(makeError('GEMINI_EXECUTION_CHANNEL_MISMATCH','API execution audit requires executionChannel=GEMINI_API'));
  if(!nonBlank(job?.executionReference))errors.push(makeError('GEMINI_EXECUTION_REFERENCE_MISSING','Gemini API execution requires a traceable executionReference'));
  if(!nonBlank(job?.model))errors.push(makeError('GEMINI_EXECUTION_MODEL_MISSING','Gemini API execution requires an explicit model'));
  if(sourceAcquisition?.status!=='PASS'||sourceAcquisition?.executionChannel!=='GEMINI_API')errors.push(makeError('GEMINI_EXECUTION_SOURCE_ACQUISITION_INVALID','API execution requires PASS GEMINI_API Source Acquisition'));
  if(sourceDelivery?.status!=='PASS'||sourceDelivery?.executionChannel!=='GEMINI_API'||sourceDelivery?.delivery?.method!=='GEMINI_FILE_ATTACHMENT')errors.push(makeError('GEMINI_EXECUTION_SOURCE_DELIVERY_INVALID','API execution requires PASS Gemini File Source Delivery'));
  const preflight=result?.credentialPreflight??null;
  if(!preflight?.pass||preflight?.status!=='READY')errors.push(makeError('GEMINI_EXECUTION_PREFLIGHT_NOT_READY','Gemini API credential/model/source preflight must be READY'));
  if(preflight?.credential?.apiKeyPresent!==true)errors.push(makeError('GEMINI_EXECUTION_API_KEY_NOT_PRESENT','Gemini API execution preflight must prove API key presence'));
  if(preflight?.safety?.apiKeyValueReturned!==false||preflight?.safety?.secretEchoAllowed!==false)errors.push(makeError('GEMINI_EXECUTION_SECRET_POLICY_INVALID','Gemini API preflight secret policy is not fail-closed'));
  const rawSha=normalizeSha(result?.rawResponseSha256);
  if(!rawSha)errors.push(makeError('GEMINI_EXECUTION_RESPONSE_SHA_MISSING','Governed Gemini API result requires rawResponseSha256'));
  if(result?.pass!==true||result?.status!=='IMPORTED')errors.push(makeError('GEMINI_EXECUTION_RESULT_NOT_SUCCESSFUL','Gemini API governed result must be imported successfully',{status:result?.status??null}));
  if(result?.canonicalWritePerformed!==false||result?.runtimeWritePerformed!==false||result?.productionWritePerformed!==false)errors.push(makeError('GEMINI_EXECUTION_AUTHORITY_VIOLATION','Worker execution must prove no authoritative writes'));
  if(errors.length)return{pass:false,record:null,errors};

  return{pass:true,record:{
    schemaVersion:GEMINI_EXECUTION_AUDIT_SCHEMA_VERSION,
    recordType:GEMINI_EXECUTION_AUDIT_RECORD_TYPE,
    status:'SUCCEEDED',
    ...stableJobContext(job),
    surface:{
      id:'GOOGLE_GEMINI_API',
      providerSystem:'GOOGLE_GENERATIVE_LANGUAGE_API',
      authenticationMode:'GEMINI_API_KEY',
      model:job.model,
      modelKnown:true,
      modelSource:preflight?.credential?.modelSource??'JOB_MODEL',
      conversationReference:null
    },
    preflight:{
      status:'PASS',
      credentialPresent:true,
      credentialSource:preflight?.credential?.apiKeySource??'ENV:GEMINI_API_KEY',
      credentialValuePersisted:false,
      executionSurfaceAvailable:true
    },
    source:sourceRefs(sourceAcquisition,sourceDelivery),
    result:{
      providerStatus:'SUCCESS',
      rawResponseSha256:rawSha,
      durationSeconds:null,
      turnCount:null,
      usage:null,
      transientRetryCount:Number.isInteger(result?.transientRetryCount)?result.transientRetryCount:0,
      transientRetryAudit:safeClone(result?.transientRetryAudit??[])
    },
    authority:{canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false},
    credentialMaterialPersisted:false
  },errors:[]};
}

export function validateGeminiExecutionAudit(record,{job=null,sourceAcquisition=null,sourceDelivery=null,rawResponseSha256=null}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[makeError('GEMINI_EXECUTION_AUDIT_INVALID','Gemini execution audit must be an object')]};
  if(record.schemaVersion!==GEMINI_EXECUTION_AUDIT_SCHEMA_VERSION)errors.push(makeError('GEMINI_EXECUTION_SCHEMA_MISMATCH','Unsupported Gemini execution audit schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==GEMINI_EXECUTION_AUDIT_RECORD_TYPE)errors.push(makeError('GEMINI_EXECUTION_RECORD_TYPE_INVALID','Unexpected Gemini execution recordType',{actual:record.recordType??null}));
  if(record.status!=='SUCCEEDED')errors.push(makeError('GEMINI_EXECUTION_STATUS_NOT_SUCCESS','Persistable execution audit must be SUCCEEDED',{actual:record.status??null}));
  if(!GEMINI_EXECUTION_SURFACES.has(record?.surface?.id))errors.push(makeError('GEMINI_EXECUTION_SURFACE_INVALID','Unsupported Gemini execution surface',{actual:record?.surface?.id??null}));
  if(record.credentialMaterialPersisted!==false||record?.preflight?.credentialValuePersisted!==false)errors.push(makeError('GEMINI_EXECUTION_SECRET_POLICY_INVALID','Execution audit must not persist credential material'));
  if(record?.authority?.canonicalWritePerformed!==false||record?.authority?.runtimeWritePerformed!==false||record?.authority?.productionWritePerformed!==false)errors.push(makeError('GEMINI_EXECUTION_AUTHORITY_VIOLATION','Execution audit must prove no authoritative writes'));
  if(!normalizeSha(record?.result?.rawResponseSha256))errors.push(makeError('GEMINI_EXECUTION_RESPONSE_SHA_INVALID','Execution audit raw response SHA-256 is invalid'));
  if(rawResponseSha256&&normalizeSha(record?.result?.rawResponseSha256)!==normalizeSha(rawResponseSha256))errors.push(makeError('GEMINI_EXECUTION_RESPONSE_SHA_MISMATCH','Execution audit response fingerprint does not match governed response',{expected:normalizeSha(rawResponseSha256),actual:normalizeSha(record?.result?.rawResponseSha256)}));
  if(job){
    for(const key of['jobId','manufacturer','series','productId','executionMode','executionChannel','preferredExecutionChannel','fallbackExecutionChannel','fallbackAllowed','fallbackFrom','fallbackReason','transportMethod','executionReference','model']){
      const expected=job[key]??(key==='fallbackAllowed'?false:null);
      const actual=record[key]??(key==='fallbackAllowed'?false:null);
      if(expected!==actual)errors.push(makeError('GEMINI_EXECUTION_JOB_CONTEXT_MISMATCH',`Execution audit ${key} does not match Job`,{field:key,expected,actual}));
    }
  }
  if(sourceAcquisition){
    const expected=sourceRefs(sourceAcquisition,sourceDelivery).acquisition;
    for(const key of['driveFileId','title','version','acquiredSha256','identityMode'])if(expected[key]!==null&&record?.source?.acquisition?.[key]!==expected[key])errors.push(makeError('GEMINI_EXECUTION_SOURCE_ACQUISITION_MISMATCH',`Execution audit acquisition.${key} mismatch`,{field:key,expected:expected[key],actual:record?.source?.acquisition?.[key]??null}));
  }
  if(sourceDelivery){
    const expected=sourceRefs(sourceAcquisition,sourceDelivery).delivery;
    for(const key of['method','artifactSha256','providerAttachmentReference'])if(expected[key]!==null&&record?.source?.delivery?.[key]!==expected[key])errors.push(makeError('GEMINI_EXECUTION_SOURCE_DELIVERY_MISMATCH',`Execution audit delivery.${key} mismatch`,{field:key,expected:expected[key],actual:record?.source?.delivery?.[key]??null}));
    const actualPages=record?.source?.delivery?.pdfPages??[];
    if(JSON.stringify(actualPages)!==JSON.stringify(expected.pdfPages))errors.push(makeError('GEMINI_EXECUTION_SOURCE_SCOPE_MISMATCH','Execution audit delivery PDF scope mismatch',{expected:expected.pdfPages,actual:actualPages}));
  }
  return{pass:errors.length===0,errors};
}
