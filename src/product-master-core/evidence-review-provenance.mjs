import{evidenceClaimFingerprint}from'./evidence-inbox-store.mjs';

export const EVIDENCE_REVIEW_PROVENANCE_SCHEMA_VERSION='1.1';
export const EVIDENCE_REVIEW_PROVENANCE_RECORD_TYPE='PRODUCT_MASTER_EVIDENCE_REVIEW_PROVENANCE';

const SHA256_RE=/^[a-f0-9]{64}$/i;
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const normalizeSha=(value)=>SHA256_RE.test(String(value??'').trim())?String(value).trim().toLowerCase():null;
const error=(code,message,details={})=>({code,message,...details});

function sameSource(expected={},actual={}){
  const mismatches=[];
  for(const key of['type','driveFileId','title','version']){
    if(expected?.[key]!==undefined&&expected?.[key]!==null&&actual?.[key]!==expected[key])mismatches.push({field:key,expected:expected[key],actual:actual?.[key]??null});
  }
  return mismatches;
}

function legacyRecord(batch,candidate,executionContext=null){
  return{
    schemaVersion:EVIDENCE_REVIEW_PROVENANCE_SCHEMA_VERSION,
    recordType:EVIDENCE_REVIEW_PROVENANCE_RECORD_TYPE,
    status:'LEGACY_COMPATIBLE',
    governed:false,
    batchId:batch.batchId,
    candidateId:candidate.id,
    productId:candidate.productId??batch.productId??null,
    candidateFingerprint:evidenceClaimFingerprint(candidate),
    batchRawSha256:normalizeSha(batch.rawSha256),
    sourceContext:structuredClone(batch.sourceContext??candidate.source??{}),
    workerContractVersion:executionContext?.workerContractVersion??null,
    executionChannel:executionContext?.executionChannel??null,
    executionReference:executionContext?.executionReference??null,
    transportProvenance:null,
    legacyReason:executionContext?'BATCH_PREDATES_GOVERNED_TRANSPORT_PROVENANCE':'BATCH_PREDATES_EXECUTION_PROVENANCE'
  };
}

export function buildEvidenceReviewProvenance({batch,candidate}={}){
  const errors=[];
  if(!isObject(batch)||!batch.batchId)errors.push(error('REVIEW_PROVENANCE_BATCH_INVALID','Evidence review provenance requires a persisted Inbox batch'));
  if(!isObject(candidate)||!candidate.id)errors.push(error('REVIEW_PROVENANCE_CANDIDATE_INVALID','Evidence review provenance requires a candidate'));
  if(errors.length)return{pass:false,record:null,errors};

  const executionContext=batch.executionContext??null;
  const hasGovernedTransport=isObject(executionContext?.transportProvenance);

  if(!hasGovernedTransport){
    if(Array.isArray(batch.candidateIds)&&batch.candidateIds.length>0&&!batch.candidateIds.includes(candidate.id))errors.push(error('REVIEW_PROVENANCE_CANDIDATE_NOT_REGISTERED','Candidate is not registered in the Inbox batch',{batchId:batch.batchId,candidateId:candidate.id}));
    if(batch.productId&&candidate.productId&&candidate.productId!==batch.productId)errors.push(error('REVIEW_PROVENANCE_PRODUCT_MISMATCH','Candidate productId does not match Inbox batch',{expected:batch.productId,actual:candidate.productId??null}));
    if(batch.sourceContext){
      const sourceMismatches=sameSource(batch.sourceContext,candidate.source);
      for(const mismatch of sourceMismatches)errors.push(error('REVIEW_PROVENANCE_SOURCE_MISMATCH',`Candidate source.${mismatch.field} does not match Inbox batch sourceContext`,mismatch));
    }
    return errors.length?{pass:false,record:null,errors}:{pass:true,record:legacyRecord(batch,candidate,executionContext),errors:[]};
  }

  if(!(batch.candidateIds??[]).includes(candidate.id))errors.push(error('REVIEW_PROVENANCE_CANDIDATE_NOT_REGISTERED','Candidate is not registered in the governed Inbox batch',{batchId:batch.batchId,candidateId:candidate.id}));
  if(batch.productId&&candidate.productId!==batch.productId)errors.push(error('REVIEW_PROVENANCE_PRODUCT_MISMATCH','Candidate productId does not match Inbox batch',{expected:batch.productId,actual:candidate.productId??null}));
  const sourceMismatches=sameSource(batch.sourceContext,candidate.source);
  for(const mismatch of sourceMismatches)errors.push(error('REVIEW_PROVENANCE_SOURCE_MISMATCH',`Candidate source.${mismatch.field} does not match Inbox batch sourceContext`,mismatch));

  if(executionContext.workerContractVersion!=='1.1')errors.push(error('REVIEW_PROVENANCE_WORKER_CONTRACT_INVALID','Governed Evidence review requires workerContractVersion=1.1',{actual:executionContext.workerContractVersion??null}));
  if(!['GEMINI_AI_PRO','GEMINI_API'].includes(executionContext.executionChannel))errors.push(error('REVIEW_PROVENANCE_EXECUTION_CHANNEL_INVALID','Governed Evidence review requires a known Gemini execution channel',{actual:executionContext.executionChannel??null}));
  if(!executionContext.executionReference)errors.push(error('REVIEW_PROVENANCE_EXECUTION_REFERENCE_MISSING','Governed Evidence review requires executionReference'));
  if(executionContext.sourceAcquisition?.status!=='PASS')errors.push(error('REVIEW_PROVENANCE_SOURCE_ACQUISITION_NOT_PASS','Governed Evidence review requires PASS Source Acquisition'));
  if(executionContext.sourceDelivery?.status!=='PASS')errors.push(error('REVIEW_PROVENANCE_SOURCE_DELIVERY_NOT_PASS','Governed Evidence review requires PASS Source Delivery'));
  if(executionContext.geminiExecution?.status!=='SUCCEEDED')errors.push(error('REVIEW_PROVENANCE_EXECUTION_NOT_SUCCEEDED','Governed Evidence review requires SUCCEEDED Gemini Execution Audit'));
  const transport=executionContext.transportProvenance;
  if(transport?.status!=='PASS')errors.push(error('REVIEW_PROVENANCE_TRANSPORT_NOT_PASS','Governed Evidence review requires PASS Transport Provenance'));
  if(transport?.schemaVersion!=='1.1')errors.push(error('REVIEW_PROVENANCE_TRANSPORT_SCHEMA_INVALID','Governed Evidence review requires Transport Provenance schema 1.1',{actual:transport?.schemaVersion??null}));
  const batchSha=normalizeSha(batch.rawSha256);
  const transportSha=normalizeSha(transport?.rawResponseSha256);
  if(!batchSha||!transportSha||batchSha!==transportSha)errors.push(error('REVIEW_PROVENANCE_RAW_SHA_MISMATCH','Inbox batch raw SHA must equal Transport Provenance raw response SHA',{batchRawSha256:batchSha,transportRawSha256:transportSha}));
  if(transport?.transport?.batchId!==batch.batchId)errors.push(error('REVIEW_PROVENANCE_BATCH_ID_MISMATCH','Transport Provenance batchId does not match Inbox batch',{expected:batch.batchId,actual:transport?.transport?.batchId??null}));
  if(transport?.productId!==candidate.productId||transport?.transport?.productId!==candidate.productId)errors.push(error('REVIEW_PROVENANCE_TRANSPORT_PRODUCT_MISMATCH','Transport Provenance productId does not match Candidate',{candidateProductId:candidate.productId,provenanceProductId:transport?.productId??null,transportProductId:transport?.transport?.productId??null}));
  const transportSourceMismatches=sameSource(batch.sourceContext,transport?.transport?.sourceContext??{});
  for(const mismatch of transportSourceMismatches)errors.push(error('REVIEW_PROVENANCE_TRANSPORT_SOURCE_MISMATCH',`Transport Provenance sourceContext.${mismatch.field} does not match Inbox batch`,mismatch));
  if(errors.length)return{pass:false,record:null,errors};

  return{pass:true,record:{
    schemaVersion:EVIDENCE_REVIEW_PROVENANCE_SCHEMA_VERSION,
    recordType:EVIDENCE_REVIEW_PROVENANCE_RECORD_TYPE,
    status:'PASS',governed:true,
    batchId:batch.batchId,candidateId:candidate.id,productId:candidate.productId,candidateFingerprint:evidenceClaimFingerprint(candidate),
    batchRawSha256:batchSha,sourceContext:structuredClone(batch.sourceContext??candidate.source??{}),
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

export function validateEvidenceReviewProvenance(record,{batch=null,candidate=null}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[error('REVIEW_PROVENANCE_RECORD_INVALID','Evidence review provenance must be an object')]};
  if(record.schemaVersion!==EVIDENCE_REVIEW_PROVENANCE_SCHEMA_VERSION)errors.push(error('REVIEW_PROVENANCE_SCHEMA_INVALID','Unsupported Evidence review provenance schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==EVIDENCE_REVIEW_PROVENANCE_RECORD_TYPE)errors.push(error('REVIEW_PROVENANCE_RECORD_TYPE_INVALID','Unexpected Evidence review provenance recordType',{actual:record.recordType??null}));
  if(!['PASS','LEGACY_COMPATIBLE'].includes(record.status))errors.push(error('REVIEW_PROVENANCE_STATUS_INVALID','Evidence review provenance status is invalid',{actual:record.status??null}));
  if(record.status==='PASS'&&record.governed!==true)errors.push(error('REVIEW_PROVENANCE_GOVERNED_FLAG_INVALID','PASS review provenance must be governed=true'));
  if(record.status==='LEGACY_COMPATIBLE'&&record.governed!==false)errors.push(error('REVIEW_PROVENANCE_LEGACY_FLAG_INVALID','Legacy-compatible review provenance must be governed=false'));
  if(batch){
    if(record.batchId!==batch.batchId)errors.push(error('REVIEW_PROVENANCE_BATCH_BINDING_MISMATCH','Review provenance batch binding changed',{expected:batch.batchId,actual:record.batchId??null}));
    if(record.batchRawSha256!==(normalizeSha(batch.rawSha256)))errors.push(error('REVIEW_PROVENANCE_BATCH_SHA_BINDING_MISMATCH','Review provenance raw batch SHA changed',{expected:normalizeSha(batch.rawSha256),actual:record.batchRawSha256??null}));
  }
  if(candidate){
    if(record.candidateId!==candidate.id)errors.push(error('REVIEW_PROVENANCE_CANDIDATE_BINDING_MISMATCH','Review provenance candidate binding changed',{expected:candidate.id,actual:record.candidateId??null}));
    const fingerprint=evidenceClaimFingerprint(candidate);
    if(record.candidateFingerprint!==fingerprint)errors.push(error('REVIEW_PROVENANCE_CANDIDATE_FINGERPRINT_MISMATCH','Review provenance candidate fingerprint changed',{expected:fingerprint,actual:record.candidateFingerprint??null}));
  }
  return{pass:errors.length===0,errors};
}
