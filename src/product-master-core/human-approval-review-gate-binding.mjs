import{stableJson,sha256}from'./master-change-control.mjs';

export const HUMAN_APPROVAL_REVIEW_GATE_BINDING_SCHEMA_VERSION='1.1';
export const HUMAN_APPROVAL_REVIEW_GATE_BINDING_RECORD_TYPE='PRODUCT_MASTER_HUMAN_APPROVAL_REVIEW_GATE_BINDING';

const error=(code,message,details={})=>({code,message,...details});
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const stableHash=(value)=>`sha256:${sha256(stableJson(value))}`;
const unique=(rows)=>[...new Set((rows??[]).filter(Boolean))];

function validateReviewGateRecord(record,{productId,batchId}={}){
  const errors=[];
  if(!isObject(record))return[error('HUMAN_APPROVAL_REVIEW_GATE_INVALID','Review Queue Gate record must be an object',{batchId})];
  if(record.schemaVersion!=='1.1')errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_SCHEMA_INVALID','Review Queue Gate must use schema 1.1',{batchId,actual:record.schemaVersion??null}));
  if(record.recordType!=='PRODUCT_MASTER_REVIEW_QUEUE_VALIDATION')errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_TYPE_INVALID','Review Queue Gate recordType must be PRODUCT_MASTER_REVIEW_QUEUE_VALIDATION',{batchId,actual:record.recordType??null}));
  if(record.status!=='PASS')errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_NOT_PASS','Review Queue Gate must be PASS before Human approval',{batchId,actual:record.status??null}));
  if(record.productId!==productId)errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_PRODUCT_MISMATCH','Review Queue Gate productId does not match Proposal',{batchId,expected:productId,actual:record.productId??null}));
  if(record.batchId!==batchId)errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_BATCH_MISMATCH','Review Queue Gate batchId does not match Proposal source batch',{expected:batchId,actual:record.batchId??null}));
  if(!record.jobId)errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_JOB_MISSING','Review Queue Gate must retain the governed Gemini Job id',{batchId}));
  if(!Number.isInteger(record.candidateCount)||record.candidateCount<0)errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_CANDIDATE_COUNT_INVALID','Review Queue Gate candidateCount must be a non-negative integer',{batchId,actual:record.candidateCount??null}));
  if(!Number.isInteger(record.transportIssueCount)||record.transportIssueCount<0)errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_ISSUE_COUNT_INVALID','Review Queue Gate transportIssueCount must be a non-negative integer',{batchId,actual:record.transportIssueCount??null}));
  if(record.evidenceQueueItemCount!==(record.candidateCount??0)+(record.transportIssueCount??0))errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_COVERAGE_COUNT_INVALID','Review Queue Gate evidence item count must cover every Candidate and Transport Issue',{batchId,candidateCount:record.candidateCount??null,transportIssueCount:record.transportIssueCount??null,evidenceQueueItemCount:record.evidenceQueueItemCount??null}));
  const authority=record.authority??{};
  if(authority.evidenceAdjudication!=='CHATGPT_OR_HUMAN')errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_EVIDENCE_AUTHORITY_INVALID','Review Queue Gate evidence authority must be CHATGPT_OR_HUMAN',{batchId,actual:authority.evidenceAdjudication??null}));
  if(authority.transportIssueResolution!=='CHATGPT_OR_HUMAN')errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_ISSUE_AUTHORITY_INVALID','Review Queue Gate issue authority must be CHATGPT_OR_HUMAN',{batchId,actual:authority.transportIssueResolution??null}));
  if(authority.geminiAdjudicationAllowed!==false)errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_GEMINI_AUTHORITY_OPEN','Review Queue Gate must explicitly keep Gemini adjudication disabled',{batchId}));
  if(authority.masterChangeApproval!=='HUMAN_REQUIRED')errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_MASTER_APPROVAL_INVALID','Review Queue Gate must require Human Master change approval',{batchId,actual:authority.masterChangeApproval??null}));
  if(authority.queueMutationAuthority!=='NONE'||authority.productionMasterAutoWrite!==false||authority.runtimeAutoWrite!==false)errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_WRITE_AUTHORITY_OPEN','Review Queue Gate must remain read-only with Production/Runtime auto-write disabled',{batchId}));
  return errors;
}

export function buildHumanApprovalReviewGateBinding({proposal,humanApprovalProvenance,reviewQueueValidations=[]}={}){
  const errors=[];
  if(!isObject(proposal))errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_PROPOSAL_REQUIRED','Review Gate binding requires the Product Master Change Proposal'));
  if(!isObject(humanApprovalProvenance)||humanApprovalProvenance.recordType!=='PRODUCT_MASTER_HUMAN_APPROVAL_PROVENANCE'||humanApprovalProvenance.status!=='PASS')errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_APPROVAL_PROVENANCE_REQUIRED','Review Gate binding requires PASS Human Approval Provenance'));
  if(!Array.isArray(reviewQueueValidations))errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_VALIDATIONS_INVALID','reviewQueueValidations must be an array'));
  if(errors.length)return{pass:false,record:null,errors};
  if(humanApprovalProvenance.proposalId!==proposal.id||humanApprovalProvenance.productId!==proposal.productId)errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_PROPOSAL_MISMATCH','Human Approval Provenance does not match Proposal'));
  if(humanApprovalProvenance.proposalFingerprint!==proposal.proposalFingerprint)errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_PROPOSAL_FINGERPRINT_MISMATCH','Human Approval Provenance is bound to a different Proposal fingerprint'));

  const sourceBatchIds=unique(proposal.sourceBatchIds);
  const bindings=[];
  for(const batchId of sourceBatchIds){
    const matches=reviewQueueValidations.filter((row)=>row?.batchId===batchId);
    if(matches.length!==1){
      errors.push(error(matches.length===0?'HUMAN_APPROVAL_REVIEW_GATE_MISSING':'HUMAN_APPROVAL_REVIEW_GATE_DUPLICATE',matches.length===0?'Every Proposal source batch requires exactly one PASS Review Queue Gate':'A Proposal source batch has multiple Review Queue Gate records',{batchId,count:matches.length}));
      continue;
    }
    const record=matches[0];
    const gateErrors=validateReviewGateRecord(record,{productId:proposal.productId,batchId});
    errors.push(...gateErrors);
    if(!gateErrors.length)bindings.push({
      batchId,jobId:record.jobId,candidateCount:record.candidateCount,transportIssueCount:record.transportIssueCount,evidenceQueueItemCount:record.evidenceQueueItemCount,
      reviewQueueGateFingerprint:stableHash(record)
    });
  }
  const unexpected=reviewQueueValidations.filter((row)=>row?.batchId&&!sourceBatchIds.includes(row.batchId));
  if(unexpected.length)errors.push(error('HUMAN_APPROVAL_REVIEW_GATE_UNEXPECTED_BATCH','Review Gate binding includes batches not referenced by the Proposal',{batchIds:unexpected.map((row)=>row.batchId)}));
  if(errors.length)return{pass:false,record:null,errors};

  const ordered=[...bindings].sort((a,b)=>a.batchId.localeCompare(b.batchId));
  return{pass:true,record:{
    schemaVersion:HUMAN_APPROVAL_REVIEW_GATE_BINDING_SCHEMA_VERSION,
    recordType:HUMAN_APPROVAL_REVIEW_GATE_BINDING_RECORD_TYPE,
    status:'PASS',proposalId:proposal.id,productId:proposal.productId,proposalFingerprint:proposal.proposalFingerprint,
    humanApprovalProvenanceFingerprint:stableHash(humanApprovalProvenance),
    sourceBatchIds,
    reviewQueueGates:ordered,
    reviewQueueGateSetFingerprint:stableHash(ordered),
    authority:{reviewQueueGateRequired:true,geminiApprovalAllowed:false,humanApprovalRequired:true,changeControlOpenAllowed:true,productionMasterAutoWrite:false,runtimeAutoWrite:false}
  },errors:[]};
}

export function validateHumanApprovalReviewGateBinding(record,{proposal,humanApprovalProvenance,reviewQueueValidations=[]}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[error('HUMAN_APPROVAL_REVIEW_BINDING_INVALID','Human Approval Review Gate Binding must be an object')]};
  if(record.schemaVersion!==HUMAN_APPROVAL_REVIEW_GATE_BINDING_SCHEMA_VERSION)errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_SCHEMA_INVALID','Unsupported Human Approval Review Gate Binding schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==HUMAN_APPROVAL_REVIEW_GATE_BINDING_RECORD_TYPE)errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_TYPE_INVALID','Unexpected Human Approval Review Gate Binding recordType',{actual:record.recordType??null}));
  if(record.status!=='PASS')errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_NOT_PASS','Persistable Human Approval Review Gate Binding must be PASS',{actual:record.status??null}));
  if(record.authority?.reviewQueueGateRequired!==true||record.authority?.geminiApprovalAllowed!==false||record.authority?.humanApprovalRequired!==true||record.authority?.changeControlOpenAllowed!==true)errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_AUTHORITY_INVALID','Human Approval Review Gate Binding authority boundary is invalid'));
  if(record.authority?.productionMasterAutoWrite!==false||record.authority?.runtimeAutoWrite!==false)errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_AUTO_WRITE_FORBIDDEN','Review Gate binding cannot enable Production Master or Runtime auto-write'));
  if(proposal&&humanApprovalProvenance){
    const rebuilt=buildHumanApprovalReviewGateBinding({proposal,humanApprovalProvenance,reviewQueueValidations});
    if(!rebuilt.pass)errors.push(...rebuilt.errors);
    else{
      if(record.proposalId!==rebuilt.record.proposalId||record.productId!==rebuilt.record.productId||record.proposalFingerprint!==rebuilt.record.proposalFingerprint)errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_PROPOSAL_STALE','Review Gate binding is bound to a stale Proposal'));
      if(record.humanApprovalProvenanceFingerprint!==rebuilt.record.humanApprovalProvenanceFingerprint)errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_APPROVAL_STALE','Review Gate binding is bound to stale Human Approval Provenance'));
      if(record.reviewQueueGateSetFingerprint!==rebuilt.record.reviewQueueGateSetFingerprint)errors.push(error('HUMAN_APPROVAL_REVIEW_BINDING_GATE_SET_STALE','Review Queue Gate set changed after Human approval'));
    }
  }
  return{pass:errors.length===0,errors};
}
