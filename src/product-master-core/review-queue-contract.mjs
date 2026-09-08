export const REVIEW_QUEUE_VALIDATION_SCHEMA_VERSION='1.1';
export const REVIEW_QUEUE_VALIDATION_RECORD_TYPE='PRODUCT_MASTER_REVIEW_QUEUE_VALIDATION';

const error=(code,message,details={})=>({code,message,...details});
const evidenceKinds=new Set(['EVIDENCE_CANDIDATE','EVIDENCE_TRANSPORT_ISSUE']);

export function validateGovernedReviewQueue(queue,{job,transportValidation}={}){
  const errors=[];
  const envelope=transportValidation?.envelope??null;
  if(queue?.recordType!=='PRODUCT_MASTER_REVIEW_QUEUE')errors.push(error('REVIEW_QUEUE_RECORD_INVALID','Governed review boundary requires PRODUCT_MASTER_REVIEW_QUEUE'));
  if(!job||job.workerContractVersion!=='1.1'||job.executionMode!=='LIVE_EXTERNAL')errors.push(error('REVIEW_QUEUE_JOB_INVALID','Governed review boundary requires workerContractVersion=1.1 LIVE_EXTERNAL Job'));
  if(!envelope)errors.push(error('REVIEW_QUEUE_TRANSPORT_ENVELOPE_MISSING','Governed review boundary requires validated Transport envelope'));
  if(errors.length)return{pass:false,record:null,errors};

  const expectedCandidates=new Set((envelope.candidates??[]).map((row)=>row.id));
  const expectedIssues=new Set((envelope.issues??[]).map((row)=>row.id));
  const batchItems=(queue.items??[]).filter((row)=>evidenceKinds.has(row.kind)&&row.refs?.batchId===envelope.batchId);
  const candidateItems=batchItems.filter((row)=>row.kind==='EVIDENCE_CANDIDATE');
  const issueItems=batchItems.filter((row)=>row.kind==='EVIDENCE_TRANSPORT_ISSUE');

  if(candidateItems.length!==expectedCandidates.size)errors.push(error('REVIEW_QUEUE_CANDIDATE_COUNT_MISMATCH','Unified Review Queue candidate count does not match Transport envelope',{expected:expectedCandidates.size,actual:candidateItems.length,batchId:envelope.batchId}));
  if(issueItems.length!==expectedIssues.size)errors.push(error('REVIEW_QUEUE_ISSUE_COUNT_MISMATCH','Unified Review Queue Transport Issue count does not match Transport envelope',{expected:expectedIssues.size,actual:issueItems.length,batchId:envelope.batchId}));

  const seenCandidates=new Set();
  const seenIssues=new Set();
  for(const item of batchItems){
    const expected=item.kind==='EVIDENCE_CANDIDATE'?expectedCandidates:expectedIssues;
    const seen=item.kind==='EVIDENCE_CANDIDATE'?seenCandidates:seenIssues;
    if(!expected.has(item.sourceId))errors.push(error('REVIEW_QUEUE_UNEXPECTED_ITEM','Unified Review Queue contains an unexpected Evidence item',{kind:item.kind,sourceId:item.sourceId,batchId:envelope.batchId}));
    if(seen.has(item.sourceId))errors.push(error('REVIEW_QUEUE_DUPLICATE_ITEM','Unified Review Queue contains a duplicate Evidence item',{kind:item.kind,sourceId:item.sourceId,batchId:envelope.batchId}));
    seen.add(item.sourceId);
    if(item.productId!==job.productId)errors.push(error('REVIEW_QUEUE_PRODUCT_MISMATCH','Unified Review Queue item productId does not match Job',{sourceId:item.sourceId,expected:job.productId,actual:item.productId??null}));
    if(item.refs?.reviewProvenance?.status!=='PASS'||item.refs?.reviewProvenance?.governed!==true)errors.push(error('REVIEW_QUEUE_PROVENANCE_NOT_PASS','Governed Evidence item requires PASS review provenance',{kind:item.kind,sourceId:item.sourceId,status:item.refs?.reviewProvenance?.status??null}));
    if((item.refs?.provenanceErrors??[]).length)errors.push(error('REVIEW_QUEUE_PROVENANCE_ERRORS_PRESENT','Governed Evidence item exposes provenance errors',{kind:item.kind,sourceId:item.sourceId,provenanceErrors:item.refs.provenanceErrors}));
    if(item.authority==='GEMINI'||item.authority==='GEMINI_AI_PRO'||item.authority==='GEMINI_API')errors.push(error('REVIEW_QUEUE_GEMINI_AUTHORITY_FORBIDDEN','Gemini cannot hold review/adjudication authority',{kind:item.kind,sourceId:item.sourceId,authority:item.authority}));
  }

  for(const id of expectedCandidates)if(!seenCandidates.has(id))errors.push(error('REVIEW_QUEUE_CANDIDATE_MISSING','Transport Candidate is missing from Unified Review Queue',{candidateId:id,batchId:envelope.batchId}));
  for(const id of expectedIssues)if(!seenIssues.has(id))errors.push(error('REVIEW_QUEUE_ISSUE_MISSING','Transport Issue is missing from Unified Review Queue',{issueId:id,batchId:envelope.batchId}));

  const boundary=queue.authorityBoundary??{};
  if(boundary.evidenceAdjudication!=='CHATGPT_OR_HUMAN')errors.push(error('REVIEW_QUEUE_EVIDENCE_AUTHORITY_INVALID','Evidence adjudication authority must be CHATGPT_OR_HUMAN',{actual:boundary.evidenceAdjudication??null}));
  if(boundary.transportIssueResolution!=='CHATGPT_OR_HUMAN')errors.push(error('REVIEW_QUEUE_ISSUE_AUTHORITY_INVALID','Transport Issue resolution authority must be CHATGPT_OR_HUMAN',{actual:boundary.transportIssueResolution??null}));
  if(boundary.geminiAdjudicationAllowed!==false)errors.push(error('REVIEW_QUEUE_GEMINI_ADJUDICATION_OPEN','Gemini adjudication must remain disabled'));
  if(boundary.masterChangeApproval!=='HUMAN_REQUIRED')errors.push(error('REVIEW_QUEUE_MASTER_APPROVAL_INVALID','Master change approval must remain HUMAN_REQUIRED',{actual:boundary.masterChangeApproval??null}));
  if(boundary.queueMutationAuthority!=='NONE'||boundary.productionMasterAutoWrite!==false||boundary.runtimeAutoWrite!==false)errors.push(error('REVIEW_QUEUE_AUTHORITY_BOUNDARY_OPEN','Review Queue must remain read-only with no Production/Runtime auto-write'));

  if(errors.length)return{pass:false,record:null,errors};
  return{pass:true,record:{
    schemaVersion:REVIEW_QUEUE_VALIDATION_SCHEMA_VERSION,
    recordType:REVIEW_QUEUE_VALIDATION_RECORD_TYPE,
    status:'PASS',
    jobId:job.jobId,
    productId:job.productId,
    batchId:envelope.batchId,
    candidateCount:expectedCandidates.size,
    transportIssueCount:expectedIssues.size,
    evidenceQueueItemCount:batchItems.length,
    authority:{
      evidenceAdjudication:'CHATGPT_OR_HUMAN',transportIssueResolution:'CHATGPT_OR_HUMAN',geminiAdjudicationAllowed:false,
      masterChangeApproval:'HUMAN_REQUIRED',queueMutationAuthority:'NONE',productionMasterAutoWrite:false,runtimeAutoWrite:false
    }
  },errors:[]};
}
