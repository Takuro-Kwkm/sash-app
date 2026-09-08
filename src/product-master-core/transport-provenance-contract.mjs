import crypto from'node:crypto';

export const TRANSPORT_PROVENANCE_SCHEMA_VERSION='1.1';
export const TRANSPORT_PROVENANCE_RECORD_TYPE='PRODUCT_MASTER_TRANSPORT_PROVENANCE';

const SHA256_RE=/^[a-f0-9]{64}$/i;
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const makeError=(code,message,details={})=>({code,message,...details});
const normalizeSha=(value)=>SHA256_RE.test(String(value??'').trim())?String(value).trim().toLowerCase():null;
const sha256=(value)=>crypto.createHash('sha256').update(String(value??'')).digest('hex');

function stableValue(value){
  if(Array.isArray(value))return value.map(stableValue);
  if(isObject(value))return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,stableValue(value[key])]));
  return value;
}

export function stableJsonSha256(value){return sha256(JSON.stringify(stableValue(value)));}

function expectedProducerForChannel(channel){
  if(channel==='GEMINI_AI_PRO')return'GEMINI_ANTIGRAVITY';
  if(channel==='GEMINI_API')return'GEMINI_NOTEBOOKLM';
  return null;
}

export function buildTransportProvenance({job,rawResponseSha256,transportValidation,geminiExecution}={}){
  const errors=[];
  const rawSha=normalizeSha(rawResponseSha256);
  const executionSha=normalizeSha(geminiExecution?.result?.rawResponseSha256);
  const envelope=transportValidation?.envelope??null;
  if(!job||job.executionMode!=='LIVE_EXTERNAL')errors.push(makeError('TRANSPORT_PROVENANCE_LIVE_JOB_REQUIRED','Transport provenance v1.1 requires a LIVE_EXTERNAL Gemini Job'));
  if(!['GEMINI_AI_PRO','GEMINI_API'].includes(job?.executionChannel))errors.push(makeError('TRANSPORT_PROVENANCE_CHANNEL_INVALID','Transport provenance requires GEMINI_AI_PRO or GEMINI_API executionChannel',{actual:job?.executionChannel??null}));
  if(!nonBlank(job?.executionReference))errors.push(makeError('TRANSPORT_PROVENANCE_EXECUTION_REFERENCE_MISSING','Transport provenance requires executionReference'));
  if(!nonBlank(job?.transportMethod))errors.push(makeError('TRANSPORT_PROVENANCE_METHOD_MISSING','Transport provenance requires transportMethod'));
  if(!rawSha)errors.push(makeError('TRANSPORT_PROVENANCE_RAW_SHA_INVALID','rawResponseSha256 must be a SHA-256 value'));
  if(geminiExecution?.status!=='SUCCEEDED')errors.push(makeError('TRANSPORT_PROVENANCE_EXECUTION_NOT_SUCCEEDED','Gemini Execution Audit must be SUCCEEDED'));
  if(geminiExecution?.executionChannel!==job?.executionChannel)errors.push(makeError('TRANSPORT_PROVENANCE_EXECUTION_CHANNEL_MISMATCH','Gemini Execution Audit channel does not match Job',{expected:job?.executionChannel??null,actual:geminiExecution?.executionChannel??null}));
  if(geminiExecution?.executionReference!==job?.executionReference)errors.push(makeError('TRANSPORT_PROVENANCE_EXECUTION_REFERENCE_MISMATCH','Gemini Execution Audit executionReference does not match Job',{expected:job?.executionReference??null,actual:geminiExecution?.executionReference??null}));
  if(!executionSha||executionSha!==rawSha)errors.push(makeError('TRANSPORT_PROVENANCE_EXECUTION_SHA_MISMATCH','Gemini Execution Audit raw response fingerprint must equal Transport raw response fingerprint',{expected:rawSha,actual:executionSha}));
  if(transportValidation?.pass!==true||!isObject(envelope))errors.push(makeError('TRANSPORT_PROVENANCE_TRANSPORT_NOT_VALIDATED','Transport envelope must pass Bridge validation before provenance can be built'));
  if(envelope){
    if(envelope.transportSchemaVersion!==job?.expectedSchemaVersion)errors.push(makeError('TRANSPORT_PROVENANCE_SCHEMA_MISMATCH','Transport schema does not match Job',{expected:job?.expectedSchemaVersion??null,actual:envelope.transportSchemaVersion??null}));
    if(envelope.transportType!==job?.expectedTransportType)errors.push(makeError('TRANSPORT_PROVENANCE_TYPE_MISMATCH','Transport type does not match Job',{expected:job?.expectedTransportType??null,actual:envelope.transportType??null}));
    if(envelope.productId!==job?.productId)errors.push(makeError('TRANSPORT_PROVENANCE_PRODUCT_MISMATCH','Transport productId does not match Job',{expected:job?.productId??null,actual:envelope.productId??null}));
    const expectedProducer=expectedProducerForChannel(job?.executionChannel);
    if(expectedProducer&&envelope.producer?.system!==expectedProducer)errors.push(makeError('TRANSPORT_PROVENANCE_PRODUCER_CHANNEL_MISMATCH','Transport producer.system does not match actual execution channel',{executionChannel:job?.executionChannel,expectedProducer,actualProducer:envelope.producer?.system??null}));
    if(envelope.producer?.mode!=='LIVE_EXTERNAL')errors.push(makeError('TRANSPORT_PROVENANCE_PRODUCER_MODE_INVALID','LIVE transport producer.mode must be LIVE_EXTERNAL',{actual:envelope.producer?.mode??null}));
    const expectedSource=job?.sourceContext??{};
    const actualSource=envelope.sourceContext??{};
    for(const key of['type','driveFileId','title','version']){
      if(expectedSource[key]!==undefined&&expectedSource[key]!==null&&actualSource[key]!==expectedSource[key])errors.push(makeError('TRANSPORT_PROVENANCE_SOURCE_MISMATCH',`Transport sourceContext.${key} does not match Job`,{field:key,expected:expectedSource[key],actual:actualSource[key]??null}));
    }
  }
  if(geminiExecution?.credentialMaterialPersisted!==false)errors.push(makeError('TRANSPORT_PROVENANCE_EXECUTION_SECRET_POLICY_INVALID','Gemini Execution Audit must prove credentialMaterialPersisted=false'));
  if(geminiExecution?.authority?.canonicalWritePerformed!==false||geminiExecution?.authority?.runtimeWritePerformed!==false||geminiExecution?.authority?.productionWritePerformed!==false)errors.push(makeError('TRANSPORT_PROVENANCE_EXECUTION_AUTHORITY_VIOLATION','Gemini Execution Audit must prove no authoritative writes'));
  if(errors.length)return{pass:false,record:null,errors};

  return{pass:true,record:{
    schemaVersion:TRANSPORT_PROVENANCE_SCHEMA_VERSION,
    recordType:TRANSPORT_PROVENANCE_RECORD_TYPE,
    status:'PASS',
    jobId:job.jobId,
    manufacturer:job.manufacturer,
    series:job.series,
    productId:job.productId,
    executionChannel:job.executionChannel,
    executionReference:job.executionReference,
    transportMethod:job.transportMethod,
    rawResponseSha256:rawSha,
    normalizedEnvelopeSha256:stableJsonSha256(envelope),
    transport:{
      schemaVersion:envelope.transportSchemaVersion,
      type:envelope.transportType,
      batchId:envelope.batchId,
      generatedAt:envelope.generatedAt,
      producer:structuredClone(envelope.producer),
      productId:envelope.productId,
      sourceContext:structuredClone(envelope.sourceContext),
      candidateCount:envelope.candidates.length,
      issueCount:envelope.issues.length
    },
    executionBinding:{
      executionAuditSchemaVersion:geminiExecution.schemaVersion??null,
      executionAuditRecordType:geminiExecution.recordType??null,
      executionSurface:geminiExecution.surface?.id??null,
      rawResponseSha256:executionSha
    },
    credentialMaterialPersisted:false,
    authority:{canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false}
  },errors:[]};
}

export function validateTransportProvenance(record,{job=null,rawResponseSha256=null,transportValidation=null,geminiExecution=null}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[makeError('TRANSPORT_PROVENANCE_RECORD_INVALID','Transport provenance record must be an object')]};
  if(record.schemaVersion!==TRANSPORT_PROVENANCE_SCHEMA_VERSION)errors.push(makeError('TRANSPORT_PROVENANCE_SCHEMA_VERSION_INVALID','Unsupported Transport provenance schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==TRANSPORT_PROVENANCE_RECORD_TYPE)errors.push(makeError('TRANSPORT_PROVENANCE_RECORD_TYPE_INVALID','Unexpected Transport provenance recordType',{actual:record.recordType??null}));
  if(record.status!=='PASS')errors.push(makeError('TRANSPORT_PROVENANCE_STATUS_NOT_PASS','Persistable Transport provenance must be PASS',{actual:record.status??null}));
  if(record.credentialMaterialPersisted!==false)errors.push(makeError('TRANSPORT_PROVENANCE_SECRET_POLICY_INVALID','Transport provenance must declare credentialMaterialPersisted=false'));
  if(record?.authority?.canonicalWritePerformed!==false||record?.authority?.runtimeWritePerformed!==false||record?.authority?.productionWritePerformed!==false)errors.push(makeError('TRANSPORT_PROVENANCE_AUTHORITY_VIOLATION','Transport provenance must prove no authoritative writes'));
  const rawSha=normalizeSha(rawResponseSha256);
  if(rawSha&&record.rawResponseSha256!==rawSha)errors.push(makeError('TRANSPORT_PROVENANCE_RAW_SHA_MISMATCH','Transport provenance rawResponseSha256 mismatch',{expected:rawSha,actual:record.rawResponseSha256??null}));
  if(job){
    for(const key of['jobId','manufacturer','series','productId','executionChannel','executionReference','transportMethod']){
      const expected=job[key]??null;
      const actual=record[key]??null;
      if(expected!==actual)errors.push(makeError('TRANSPORT_PROVENANCE_JOB_CONTEXT_MISMATCH',`Transport provenance ${key} does not match Job`,{field:key,expected,actual}));
    }
  }
  const envelope=transportValidation?.envelope??null;
  if(envelope){
    const expectedEnvelopeSha=stableJsonSha256(envelope);
    if(record.normalizedEnvelopeSha256!==expectedEnvelopeSha)errors.push(makeError('TRANSPORT_PROVENANCE_ENVELOPE_SHA_MISMATCH','Normalized Transport envelope fingerprint mismatch',{expected:expectedEnvelopeSha,actual:record.normalizedEnvelopeSha256??null}));
    if(record.transport?.batchId!==envelope.batchId)errors.push(makeError('TRANSPORT_PROVENANCE_BATCH_MISMATCH','Transport provenance batchId mismatch',{expected:envelope.batchId,actual:record.transport?.batchId??null}));
  }
  const executionSha=normalizeSha(geminiExecution?.result?.rawResponseSha256);
  if(executionSha&&record.executionBinding?.rawResponseSha256!==executionSha)errors.push(makeError('TRANSPORT_PROVENANCE_EXECUTION_BINDING_MISMATCH','Transport provenance execution fingerprint mismatch',{expected:executionSha,actual:record.executionBinding?.rawResponseSha256??null}));
  return{pass:errors.length===0,errors};
}
