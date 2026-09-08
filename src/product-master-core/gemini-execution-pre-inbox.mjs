import{
  GEMINI_EXECUTION_AUDIT_SCHEMA_VERSION,
  GEMINI_EXECUTION_AUDIT_RECORD_TYPE,
  validateGeminiExecutionAudit
}from'./gemini-execution-contract.mjs';

const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const safeClone=(value)=>value===undefined?undefined:structuredClone(value);
const makeError=(code,message,details={})=>({code,message,...details});

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

export function buildApiGeminiExecutionAuditPreInbox({job,sourceAcquisition,sourceDelivery,result}={}){
  const errors=[];
  if(job?.executionMode!=='LIVE_EXTERNAL')errors.push(makeError('GEMINI_EXECUTION_MODE_MISMATCH','API pre-Inbox execution audit requires LIVE_EXTERNAL Job'));
  if(job?.executionChannel!=='GEMINI_API')errors.push(makeError('GEMINI_EXECUTION_CHANNEL_MISMATCH','API pre-Inbox execution audit requires executionChannel=GEMINI_API'));
  if(!nonBlank(job?.executionReference))errors.push(makeError('GEMINI_EXECUTION_REFERENCE_MISSING','Gemini API execution requires a traceable executionReference'));
  if(!nonBlank(job?.model))errors.push(makeError('GEMINI_EXECUTION_MODEL_MISSING','Gemini API execution requires an explicit model'));
  if(sourceAcquisition?.status!=='PASS'||sourceAcquisition?.executionChannel!=='GEMINI_API')errors.push(makeError('GEMINI_EXECUTION_SOURCE_ACQUISITION_INVALID','API execution requires PASS GEMINI_API Source Acquisition'));
  if(sourceDelivery?.status!=='PASS'||sourceDelivery?.executionChannel!=='GEMINI_API'||sourceDelivery?.delivery?.method!=='GEMINI_FILE_ATTACHMENT')errors.push(makeError('GEMINI_EXECUTION_SOURCE_DELIVERY_INVALID','API execution requires PASS Gemini File Source Delivery'));
  const preflight=result?.credentialPreflight??null;
  if(!preflight?.pass||preflight?.status!=='READY')errors.push(makeError('GEMINI_EXECUTION_PREFLIGHT_NOT_READY','Gemini API credential/model/source preflight must be READY'));
  if(preflight?.credential?.apiKeyPresent!==true)errors.push(makeError('GEMINI_EXECUTION_API_KEY_NOT_PRESENT','Gemini API execution preflight must prove API key presence'));
  if(preflight?.safety?.apiKeyValueReturned!==false||preflight?.safety?.secretEchoAllowed!==false)errors.push(makeError('GEMINI_EXECUTION_SECRET_POLICY_INVALID','Gemini API preflight secret policy is not fail-closed'));
  if(result?.pass!==true||result?.status!=='TRANSPORT_VALIDATED')errors.push(makeError('GEMINI_EXECUTION_PRE_INBOX_RESULT_INVALID','Pre-Inbox API result must be TRANSPORT_VALIDATED before Evidence Inbox persistence',{status:result?.status??null}));
  if(!nonBlank(result?.rawResponseSha256))errors.push(makeError('GEMINI_EXECUTION_RESPONSE_SHA_MISSING','Governed Gemini API pre-Inbox result requires rawResponseSha256'));
  if(result?.canonicalWritePerformed!==false||result?.runtimeWritePerformed!==false||result?.productionWritePerformed!==false)errors.push(makeError('GEMINI_EXECUTION_AUTHORITY_VIOLATION','Worker execution must prove no authoritative writes'));
  if(errors.length)return{pass:false,record:null,errors};

  const record={
    schemaVersion:GEMINI_EXECUTION_AUDIT_SCHEMA_VERSION,
    recordType:GEMINI_EXECUTION_AUDIT_RECORD_TYPE,
    status:'SUCCEEDED',
    jobId:job.jobId,
    manufacturer:job.manufacturer,
    series:job.series,
    productId:job.productId,
    executionMode:job.executionMode,
    executionChannel:job.executionChannel,
    preferredExecutionChannel:job.preferredExecutionChannel??null,
    fallbackExecutionChannel:job.fallbackExecutionChannel??null,
    fallbackAllowed:job.fallbackAllowed??false,
    fallbackFrom:job.fallbackFrom??null,
    fallbackReason:job.fallbackReason??null,
    transportMethod:job.transportMethod??null,
    executionReference:job.executionReference,
    model:job.model,
    surface:{
      id:'GOOGLE_GEMINI_API',providerSystem:'GOOGLE_GENERATIVE_LANGUAGE_API',authenticationMode:'GEMINI_API_KEY',
      model:job.model,modelKnown:true,modelSource:preflight?.credential?.modelSource??'JOB_MODEL',conversationReference:null
    },
    preflight:{
      status:'PASS',credentialPresent:true,credentialSource:preflight?.credential?.apiKeySource??'ENV:GEMINI_API_KEY',credentialValuePersisted:false,executionSurfaceAvailable:true
    },
    source:sourceRefs(sourceAcquisition,sourceDelivery),
    result:{
      providerStatus:'SUCCESS',rawResponseSha256:result.rawResponseSha256,durationSeconds:null,turnCount:null,usage:null,
      transientRetryCount:Number.isInteger(result?.transientRetryCount)?result.transientRetryCount:0,
      transientRetryAudit:safeClone(result?.transientRetryAudit??[]),
      lifecycleStage:'PRE_INBOX_TRANSPORT_VALIDATED'
    },
    authority:{canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false},
    credentialMaterialPersisted:false
  };
  const validation=validateGeminiExecutionAudit(record,{job,sourceAcquisition,sourceDelivery,rawResponseSha256:result.rawResponseSha256});
  return validation.pass?{pass:true,record,errors:[]}:{pass:false,record:null,errors:validation.errors};
}
