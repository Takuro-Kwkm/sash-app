import crypto from'node:crypto';
import{buildWorkerExecutionContext}from'./worker-execution-contract.mjs';
import{validateGeminiExecutionAudit}from'./gemini-execution-contract.mjs';
import{buildTransportProvenance,validateTransportProvenance}from'./transport-provenance-contract.mjs';
import{persistGeminiTransport}from'./evidence-inbox-store.mjs';

export const TRANSPORT_PRE_INBOX_GUARD_SCHEMA_VERSION='1.0';
export const TRANSPORT_PRE_INBOX_GUARD_RECORD_TYPE='PRODUCT_MASTER_TRANSPORT_PRE_INBOX_GUARD';

const sha256=(value)=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
const makeError=(code,message,details={})=>({code,message,...details});

export function evaluateTransportPreInboxGuard({
  job,
  raw,
  transportValidation,
  sourceAcquisition=null,
  sourceDelivery=null,
  geminiExecution=null
}={}){
  const rawResponseSha256=sha256(raw);
  const errors=[];

  if(!job||job.executionMode!=='LIVE_EXTERNAL')errors.push(makeError('PRE_INBOX_LIVE_JOB_REQUIRED','Pre-Inbox Guard requires a LIVE_EXTERNAL Gemini Job'));
  if(transportValidation?.pass!==true||!transportValidation?.envelope)errors.push(makeError('PRE_INBOX_TRANSPORT_VALIDATION_REQUIRED','Transport must pass Bridge validation before Pre-Inbox Guard'));
  if(!sourceAcquisition||sourceAcquisition.status!=='PASS')errors.push(makeError('PRE_INBOX_SOURCE_ACQUISITION_REQUIRED','PASS Source Acquisition provenance is required before Evidence Inbox persistence'));
  if(!sourceDelivery||sourceDelivery.status!=='PASS')errors.push(makeError('PRE_INBOX_SOURCE_DELIVERY_REQUIRED','PASS Source Delivery provenance is required before Evidence Inbox persistence'));
  if(!geminiExecution)errors.push(makeError('PRE_INBOX_GEMINI_EXECUTION_REQUIRED','Gemini Execution Audit is required before Evidence Inbox persistence'));

  let executionValidation=null;
  if(geminiExecution){
    executionValidation=validateGeminiExecutionAudit(geminiExecution,{
      job,sourceAcquisition,sourceDelivery,rawResponseSha256
    });
    if(!executionValidation.pass)errors.push(...executionValidation.errors);
  }

  let provenanceBuild=null;
  let provenanceValidation=null;
  if(errors.length===0){
    provenanceBuild=buildTransportProvenance({
      job,rawResponseSha256,transportValidation,geminiExecution
    });
    if(!provenanceBuild.pass)errors.push(...provenanceBuild.errors);
  }
  if(errors.length===0){
    provenanceValidation=validateTransportProvenance(provenanceBuild.record,{
      job,rawResponseSha256,transportValidation,geminiExecution
    });
    if(!provenanceValidation.pass)errors.push(...provenanceValidation.errors);
  }

  if(errors.length)return{
    pass:false,
    status:'BLOCKED',
    record:{
      schemaVersion:TRANSPORT_PRE_INBOX_GUARD_SCHEMA_VERSION,
      recordType:TRANSPORT_PRE_INBOX_GUARD_RECORD_TYPE,
      status:'BLOCKED',
      jobId:job?.jobId??null,
      rawResponseSha256,
      transportProvenance:null,
      evidenceInboxWriteAllowed:false
    },
    executionValidation,
    transportProvenanceValidation:provenanceValidation,
    errors
  };

  return{
    pass:true,
    status:'PASS',
    record:{
      schemaVersion:TRANSPORT_PRE_INBOX_GUARD_SCHEMA_VERSION,
      recordType:TRANSPORT_PRE_INBOX_GUARD_RECORD_TYPE,
      status:'PASS',
      jobId:job.jobId,
      rawResponseSha256,
      transportProvenance:provenanceBuild.record,
      evidenceInboxWriteAllowed:true
    },
    executionValidation,
    transportProvenanceValidation:provenanceValidation,
    errors:[]
  };
}

export function persistGeminiTransportAfterPreInboxGuard(raw,{
  job,
  transportValidation,
  sourceAcquisition,
  sourceDelivery,
  geminiExecution,
  rootDir,
  allowDuplicateClaims=false,
  importedAt=new Date().toISOString(),
  ...transportOptions
}={}){
  const guard=evaluateTransportPreInboxGuard({
    job,raw,transportValidation,sourceAcquisition,sourceDelivery,geminiExecution
  });
  if(!guard.pass)return{
    pass:false,
    status:'BLOCKED_AT_PRE_INBOX_GUARD',
    preInboxGuard:guard,
    inboxImport:null,
    canonicalWritePerformed:false,
    runtimeWritePerformed:false,
    productionWritePerformed:false,
    errors:guard.errors
  };

  const executionContext={
    ...buildWorkerExecutionContext(job),
    sourceAcquisition:structuredClone(sourceAcquisition),
    sourceDelivery:structuredClone(sourceDelivery),
    geminiExecution:structuredClone(geminiExecution),
    transportProvenance:structuredClone(guard.record.transportProvenance)
  };
  const inboxImport=persistGeminiTransport(raw,{
    rootDir,allowDuplicateClaims,importedAt,executionContext,...transportOptions,
    expectedProductId:job.productId
  });
  if(!inboxImport.pass)return{
    pass:false,
    status:inboxImport.status,
    preInboxGuard:guard,
    inboxImport,
    executionContext,
    canonicalWritePerformed:false,
    runtimeWritePerformed:false,
    productionWritePerformed:false,
    errors:inboxImport.errors
  };
  return{
    pass:true,
    status:'PERSISTED_TO_EVIDENCE_INBOX',
    preInboxGuard:guard,
    inboxImport,
    executionContext,
    rawResponseSha256:guard.record.rawResponseSha256,
    transportProvenance:guard.record.transportProvenance,
    normalizedBatchId:inboxImport.batch.id,
    canonicalWritePerformed:false,
    runtimeWritePerformed:false,
    productionWritePerformed:false,
    errors:[]
  };
}
