import{stableJsonSha256}from'./transport-provenance-contract.mjs';

export const TRANSPORT_ISSUE_REVIEW_PROVENANCE_SCHEMA_VERSION='1.1';
export const TRANSPORT_ISSUE_REVIEW_PROVENANCE_RECORD_TYPE='PRODUCT_MASTER_TRANSPORT_ISSUE_REVIEW_PROVENANCE';

const SHA256_RE=/^[a-f0-9]{64}$/i;
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const normalizeSha=(value)=>SHA256_RE.test(String(value??'').trim())?String(value).trim().toLowerCase():null;
const error=(code,message,details={})=>({code,message,...details});

function issueFingerprint(issue){
  return stableJsonSha256({
    id:issue?.id??null,
    type:issue?.type??null,
    question:issue?.question??null,
    subjectField:issue?.subjectField??null,
    sourceHint:issue?.sourceHint??null
  });
}

function legacyRecord(batch,issue,executionContext=null){
  return{
    schemaVersion:TRANSPORT_ISSUE_REVIEW_PROVENANCE_SCHEMA_VERSION,
    recordType:TRANSPORT_ISSUE_REVIEW_PROVENANCE_RECORD_TYPE,
    status:'LEGACY_COMPATIBLE',
    governed:false,
    batchId:batch.batchId,
    issueId:issue.id,
    productId:batch.productId??null,
    issueFingerprint:issueFingerprint(issue),
    batchRawSha256:normalizeSha(batch.rawSha256),
    sourceContext:structuredClone(batch.sourceContext??{}),
    workerContractVersion:executionContext?.workerContractVersion??null,
    executionChannel:executionContext?.executionChannel??null,
    executionReference:executionContext?.executionReference??null,
    transportProvenance:null,
    legacyReason:executionContext?'BATCH_PREDATES_GOVERNED_TRANSPORT_PROVENANCE':'BATCH_PREDATES_EXECUTION_PROVENANCE'
  };
}

export function buildTransportIssueReviewProvenance({batch,issue}={}){
  const errors=[];
  if(!isObject(batch)||!batch.batchId)errors.push(error('TRANSPORT_ISSUE_REVIEW_BATCH_INVALID','Transport Issue review provenance requires a persisted Inbox batch'));
  if(!isObject(issue)||!issue.id)errors.push(error('TRANSPORT_ISSUE_REVIEW_ISSUE_INVALID','Transport Issue review provenance requires an issue'));
  if(errors.length)return{pass:false,record:null,errors};

  const executionContext=batch.executionContext??null;
  const hasGovernedTransport=isObject(executionContext?.transportProvenance);
  const registered=Array.isArray(batch.issueIds)?batch.issueIds.includes(issue.id):true;
  if(!registered)errors.push(error('TRANSPORT_ISSUE_REVIEW_NOT_REGISTERED','Transport Issue is not registered in the Inbox batch',{batchId:batch.batchId,issueId:issue.id}));
  if(errors.length)return{pass:false,record:null,errors};

  if(!hasGovernedTransport)return{pass:true,record:legacyRecord(batch,issue,executionContext),errors:[]};

  if(executionContext.workerContractVersion!=='1.1')errors.push(error('TRANSPORT_ISSUE_REVIEW_WORKER_CONTRACT_INVALID','Governed Transport Issue review requires workerContractVersion=1.1',{actual:executionContext.workerContractVersion??null}));
  if(!['GEMINI_AI_PRO','GEMINI_API'].includes(executionContext.executionChannel))errors.push(error('TRANSPORT_ISSUE_REVIEW_EXECUTION_CHANNEL_INVALID','Governed Transport Issue review requires a known Gemini execution channel',{actual:executionContext.executionChannel??null}));
  if(!executionContext.executionReference)errors.push(error('TRANSPORT_ISSUE_REVIEW_EXECUTION_REFERENCE_MISSING','Governed Transport Issue review requires executionReference'));
  if(executionContext.sourceAcquisition?.status!=='PASS')errors.push(error('TRANSPORT_ISSUE_REVIEW_SOURCE_ACQUISITION_NOT_PASS','Governed Transport Issue review requires PASS Source Acquisition'));
  if(executionContext.sourceDelivery?.status!=='PASS')errors.push(error('TRANSPORT_ISSUE_REVIEW_SOURCE_DELIVERY_NOT_PASS','Governed Transport Issue review requires PASS Source Delivery'));
  if(executionContext.geminiExecution?.status!=='SUCCEEDED')errors.push(error('TRANSPORT_ISSUE_REVIEW_EXECUTION_NOT_SUCCEEDED','Governed Transport Issue review requires SUCCEEDED Gemini Execution Audit'));
  const transport=executionContext.transportProvenance;
  if(transport?.status!=='PASS')errors.push(error('TRANSPORT_ISSUE_REVIEW_TRANSPORT_NOT_PASS','Governed Transport Issue review requires PASS Transport Provenance'));
  if(transport?.schemaVersion!=='1.1')errors.push(error('TRANSPORT_ISSUE_REVIEW_TRANSPORT_SCHEMA_INVALID','Governed Transport Issue review requires Transport Provenance schema 1.1',{actual:transport?.schemaVersion??null}));
  const batchSha=normalizeSha(batch.rawSha256);
  const transportSha=normalizeSha(transport?.rawResponseSha256);
  if(!batchSha||!transportSha||batchSha!==transportSha)errors.push(error('TRANSPORT_ISSUE_REVIEW_RAW_SHA_MISMATCH','Inbox batch raw SHA must equal Transport Provenance raw response SHA',{batchRawSha256:batchSha,transportRawSha256:transportSha}));
  if(transport?.transport?.batchId!==batch.batchId)errors.push(error('TRANSPORT_ISSUE_REVIEW_BATCH_ID_MISMATCH','Transport Provenance batchId does not match Inbox batch',{expected:batch.batchId,actual:transport?.transport?.batchId??null}));
  if(transport?.productId!==batch.productId||transport?.transport?.productId!==batch.productId)errors.push(error('TRANSPORT_ISSUE_REVIEW_PRODUCT_MISMATCH','Transport Provenance productId does not match Inbox batch',{batchProductId:batch.productId??null,provenanceProductId:transport?.productId??null,transportProductId:transport?.transport?.productId??null}));
  if(errors.length)return{pass:false,record:null,errors};

  return{pass:true,record:{
    schemaVersion:TRANSPORT_ISSUE_REVIEW_PROVENANCE_SCHEMA_VERSION,
    recordType:TRANSPORT_ISSUE_REVIEW_PROVENANCE_RECORD_TYPE,
    status:'PASS',governed:true,
    batchId:batch.batchId,issueId:issue.id,productId:batch.productId??null,issueFingerprint:issueFingerprint(issue),
    batchRawSha256:batchSha,sourceContext:structuredClone(batch.sourceContext??{}),
    workerContractVersion:'1.1',executionChannel:executionContext.executionChannel,executionReference:executionContext.executionReference,
    transportProvenance:{
      schemaVersion:transport.schemaVersion,
      rawResponseSha256:transport.rawResponseSha256,
      normalizedEnvelopeSha256:transport.normalizedEnvelopeSha256,
      batchId:transport.transport.batchId,
      producerSystem:transport.transport.producer?.system??null,
      executionSurface:transport.executionBinding?.executionSurface??null
    }
  },errors:[]};
}

export function validateTransportIssueReviewProvenance(record,{batch=null,issue=null}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[error('TRANSPORT_ISSUE_REVIEW_RECORD_INVALID','Transport Issue review provenance must be an object')]};
  if(record.schemaVersion!==TRANSPORT_ISSUE_REVIEW_PROVENANCE_SCHEMA_VERSION)errors.push(error('TRANSPORT_ISSUE_REVIEW_SCHEMA_INVALID','Unsupported Transport Issue review provenance schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==TRANSPORT_ISSUE_REVIEW_PROVENANCE_RECORD_TYPE)errors.push(error('TRANSPORT_ISSUE_REVIEW_RECORD_TYPE_INVALID','Unexpected Transport Issue review provenance recordType',{actual:record.recordType??null}));
  if(!['PASS','LEGACY_COMPATIBLE'].includes(record.status))errors.push(error('TRANSPORT_ISSUE_REVIEW_STATUS_INVALID','Transport Issue review provenance status is invalid',{actual:record.status??null}));
  if(record.status==='PASS'&&record.governed!==true)errors.push(error('TRANSPORT_ISSUE_REVIEW_GOVERNED_FLAG_INVALID','PASS Transport Issue review provenance must be governed=true'));
  if(record.status==='LEGACY_COMPATIBLE'&&record.governed!==false)errors.push(error('TRANSPORT_ISSUE_REVIEW_LEGACY_FLAG_INVALID','Legacy-compatible Transport Issue review provenance must be governed=false'));
  if(batch){
    if(record.batchId!==batch.batchId)errors.push(error('TRANSPORT_ISSUE_REVIEW_BATCH_BINDING_MISMATCH','Transport Issue review provenance batch binding changed',{expected:batch.batchId,actual:record.batchId??null}));
    if(record.batchRawSha256!==normalizeSha(batch.rawSha256))errors.push(error('TRANSPORT_ISSUE_REVIEW_BATCH_SHA_BINDING_MISMATCH','Transport Issue review provenance raw batch SHA changed',{expected:normalizeSha(batch.rawSha256),actual:record.batchRawSha256??null}));
  }
  if(issue){
    if(record.issueId!==issue.id)errors.push(error('TRANSPORT_ISSUE_REVIEW_ISSUE_BINDING_MISMATCH','Transport Issue review provenance issue binding changed',{expected:issue.id,actual:record.issueId??null}));
    const fingerprint=issueFingerprint(issue);
    if(record.issueFingerprint!==fingerprint)errors.push(error('TRANSPORT_ISSUE_REVIEW_FINGERPRINT_MISMATCH','Transport Issue review provenance fingerprint changed',{expected:fingerprint,actual:record.issueFingerprint??null}));
  }
  return{pass:errors.length===0,errors};
}
