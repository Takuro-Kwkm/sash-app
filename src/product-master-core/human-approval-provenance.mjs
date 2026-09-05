import{proposalFingerprint,productMasterFingerprint,stableJson,sha256}from'./master-change-control.mjs';

export const HUMAN_APPROVAL_PROVENANCE_SCHEMA_VERSION='1.1';
export const HUMAN_APPROVAL_PROVENANCE_RECORD_TYPE='PRODUCT_MASTER_HUMAN_APPROVAL_PROVENANCE';
export const HUMAN_APPROVAL_SOURCES=new Set([
  'CHAT_CONVERSATION_EXPLICIT_COMMAND','HUMAN_REVIEW_UI','SIGNED_APPROVAL_RECORD','MANUAL_CONTROL_PLANE'
]);

const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const error=(code,message,details={})=>({code,message,...details});
const unique=(rows)=>[...new Set(rows.filter(Boolean))];
const stableHash=(value)=>`sha256:${sha256(stableJson(value))}`;
const forbiddenIdentity=(value)=>/^(CHATGPT|SYSTEM|AUTOMATION|GEMINI(?:_|$)|GEMINI_AI_PRO|GEMINI_API)/i.test(String(value??'').trim());

function canonicalEvidenceById(adjudicationStore){
  return new Map((adjudicationStore?.canonicalEvidence??[]).map((row)=>[row.id,row]));
}
function adjudicationByCandidate(adjudicationStore){
  return new Map((adjudicationStore?.adjudications??[]).map((row)=>[row.candidateId,row]));
}
function stateByCandidate(adjudicationStore){
  return new Map((adjudicationStore?.candidateStates??[]).map((row)=>[`${row.batchId??''}|${row.candidateId}`,row]));
}
function relevantQueueItems(reviewQueue,sourceBatchIds){
  const ids=new Set(sourceBatchIds??[]);
  return(reviewQueue?.items??[]).filter((row)=>ids.has(row.refs?.batchId)&&['EVIDENCE_CANDIDATE','EVIDENCE_TRANSPORT_ISSUE'].includes(row.kind));
}

export function buildHumanApprovalProvenance({
  proposal,approval,reviewQueue,adjudicationStore,baseMaster=null
}={}){
  const errors=[];
  if(!isObject(proposal))errors.push(error('HUMAN_APPROVAL_PROPOSAL_REQUIRED','Human Approval Provenance requires a Product Master Change Proposal'));
  if(!isObject(approval))errors.push(error('HUMAN_APPROVAL_RECORD_REQUIRED','Human Approval Provenance requires an explicit Human approval record'));
  if(!isObject(reviewQueue)||reviewQueue.recordType!=='PRODUCT_MASTER_REVIEW_QUEUE')errors.push(error('HUMAN_APPROVAL_REVIEW_QUEUE_REQUIRED','Human Approval Provenance requires Unified Review Queue input'));
  if(!isObject(adjudicationStore))errors.push(error('HUMAN_APPROVAL_ADJUDICATION_STORE_REQUIRED','Human Approval Provenance requires Evidence Adjudication state'));
  if(errors.length)return{pass:false,record:null,errors};

  const actualProposalFingerprint=proposalFingerprint(proposal);
  if(proposal.status!=='PROPOSED')errors.push(error('HUMAN_APPROVAL_PROPOSAL_STATUS_INVALID','Human approval provenance can only be created for a PROPOSED change',{actual:proposal.status??null}));
  if(proposal.approvalPolicy!=='HUMAN_REQUIRED')errors.push(error('HUMAN_APPROVAL_POLICY_INVALID','Proposal approvalPolicy must be HUMAN_REQUIRED',{actual:proposal.approvalPolicy??null}));
  if(proposal.proposalFingerprint!==actualProposalFingerprint)errors.push(error('HUMAN_APPROVAL_PROPOSAL_TAMPERED','Proposal content no longer matches proposalFingerprint'));
  if(approval.recordType!=='PRODUCT_MASTER_CHANGE_APPROVAL')errors.push(error('HUMAN_APPROVAL_RECORD_TYPE_INVALID','Approval recordType must be PRODUCT_MASTER_CHANGE_APPROVAL',{actual:approval.recordType??null}));
  if(approval.approverType!=='HUMAN')errors.push(error('HUMAN_APPROVAL_ACTOR_INVALID','Only HUMAN can approve a Product Master Change Proposal',{actual:approval.approverType??null}));
  if(!nonBlank(approval.approvedBy)||forbiddenIdentity(approval.approvedBy))errors.push(error('HUMAN_APPROVAL_IDENTITY_INVALID','approvedBy must identify an explicit Human actor and cannot be ChatGPT, Gemini, SYSTEM, or automation',{actual:approval.approvedBy??null}));
  if(!HUMAN_APPROVAL_SOURCES.has(approval.approvalSource))errors.push(error('HUMAN_APPROVAL_SOURCE_INVALID','approvalSource must identify an explicit Human approval surface',{actual:approval.approvalSource??null}));
  if(!nonBlank(approval.approvedAt))errors.push(error('HUMAN_APPROVAL_TIMESTAMP_REQUIRED','approvedAt is required'));
  if(!nonBlank(approval.approvalReference??approval.requestedAction))errors.push(error('HUMAN_APPROVAL_REFERENCE_REQUIRED','Approval must retain an explicit Human action reference or requestedAction'));
  if(approval.proposalId!==proposal.id)errors.push(error('HUMAN_APPROVAL_PROPOSAL_ID_MISMATCH','Approval proposalId does not match Proposal',{expected:proposal.id,actual:approval.proposalId??null}));
  if(approval.proposalFingerprint!==actualProposalFingerprint)errors.push(error('HUMAN_APPROVAL_PROPOSAL_FINGERPRINT_MISMATCH','Approval proposalFingerprint does not match current Proposal',{expected:actualProposalFingerprint,actual:approval.proposalFingerprint??null}));
  if(approval.baseMasterFingerprint!==proposal.target?.baseMasterFingerprint)errors.push(error('HUMAN_APPROVAL_BASE_FINGERPRINT_MISMATCH','Approval baseMasterFingerprint does not match Proposal target',{expected:proposal.target?.baseMasterFingerprint??null,actual:approval.baseMasterFingerprint??null}));
  if(baseMaster&&productMasterFingerprint(baseMaster)!==proposal.target?.baseMasterFingerprint)errors.push(error('HUMAN_APPROVAL_BASE_MASTER_DRIFT','Base Product Master changed before approval provenance was built',{expected:proposal.target?.baseMasterFingerprint??null,actual:productMasterFingerprint(baseMaster)}));

  const evidenceMap=canonicalEvidenceById(adjudicationStore);
  const auditMap=adjudicationByCandidate(adjudicationStore);
  const stateMap=stateByCandidate(adjudicationStore);
  const reviewBindings=[];
  const evidenceIds=unique(proposal.evidenceIds??[]);
  for(const evidenceId of evidenceIds){
    const evidence=evidenceMap.get(evidenceId);
    if(!evidence){errors.push(error('HUMAN_APPROVAL_CANONICAL_EVIDENCE_MISSING','Proposal Evidence is not present in adjudicated Canonical Evidence',{evidenceId}));continue;}
    if(evidence.status!=='VERIFIED'||evidence.adjudication?.status!=='ACCEPTED')errors.push(error('HUMAN_APPROVAL_EVIDENCE_NOT_ACCEPTED','Proposal Evidence must be VERIFIED and ACCEPTED before Human approval',{evidenceId,status:evidence.status??null,adjudicationStatus:evidence.adjudication?.status??null}));
    if(['GEMINI','GEMINI_AI_PRO','GEMINI_API','GEMINI_ANTIGRAVITY','GEMINI_NOTEBOOKLM'].includes(evidence.adjudication?.adjudicatorType))errors.push(error('HUMAN_APPROVAL_GEMINI_ADJUDICATION_FORBIDDEN','Gemini cannot adjudicate Canonical Evidence',{evidenceId,adjudicatorType:evidence.adjudication?.adjudicatorType}));
    const candidateId=evidence.adjudication?.sourceCandidateId??evidence.provenance?.candidateId??null;
    const audit=candidateId?auditMap.get(candidateId):null;
    if(!candidateId||audit?.decision!=='ACCEPT')errors.push(error('HUMAN_APPROVAL_ACCEPT_AUDIT_MISSING','Canonical Evidence must trace to an ACCEPT adjudication audit',{evidenceId,candidateId}));
    const queueItem=(reviewQueue.items??[]).find((row)=>row.kind==='EVIDENCE_CANDIDATE'&&row.sourceId===candidateId&&row.productId===proposal.productId);
    if(!queueItem){errors.push(error('HUMAN_APPROVAL_REVIEW_ITEM_MISSING','Canonical Evidence source Candidate is missing from Unified Review Queue',{evidenceId,candidateId}));continue;}
    if(queueItem.reviewStatus!=='APPROVED'||queueItem.sourceDecision!=='ACCEPT')errors.push(error('HUMAN_APPROVAL_REVIEW_ITEM_NOT_APPROVED','Proposal Evidence source Candidate must be APPROVED/ACCEPT in Unified Review Queue',{evidenceId,candidateId,reviewStatus:queueItem.reviewStatus??null,sourceDecision:queueItem.sourceDecision??null}));
    const reviewProvenance=queueItem.refs?.reviewProvenance??stateMap.get(`${queueItem.refs?.batchId??''}|${candidateId}`)?.reviewProvenance??audit?.reviewProvenance??null;
    if(reviewProvenance?.governed===true&&reviewProvenance.status!=='PASS')errors.push(error('HUMAN_APPROVAL_REVIEW_PROVENANCE_NOT_PASS','Governed Candidate review provenance must be PASS before Human approval',{evidenceId,candidateId,status:reviewProvenance?.status??null}));
    if((queueItem.refs?.provenanceErrors??[]).length)errors.push(error('HUMAN_APPROVAL_REVIEW_PROVENANCE_ERRORS','Candidate review provenance contains errors',{evidenceId,candidateId,provenanceErrors:queueItem.refs.provenanceErrors}));
    reviewBindings.push({
      evidenceId,candidateId,batchId:queueItem.refs?.batchId??null,adjudicationId:audit?.id??queueItem.refs?.adjudicationId??null,
      reviewStatus:queueItem.reviewStatus,reviewProvenanceStatus:reviewProvenance?.status??'LEGACY_COMPATIBLE',
      reviewProvenanceFingerprint:reviewProvenance?stableHash(reviewProvenance):null
    });
  }

  const sourceBatchIds=unique(proposal.sourceBatchIds??[]);
  const batchItems=relevantQueueItems(reviewQueue,sourceBatchIds);
  for(const item of batchItems){
    if(item.reviewStatus==='BLOCKED')errors.push(error('HUMAN_APPROVAL_REVIEW_BATCH_BLOCKED','Proposal source batch contains a BLOCKED Review Queue item',{batchId:item.refs?.batchId??null,kind:item.kind,sourceId:item.sourceId}));
  }
  const openBlocking=(adjudicationStore.pending??[]).filter((row)=>sourceBatchIds.includes(row.sourceBatchId??row.reviewProvenance?.batchId)&&row.severity==='BLOCKING'&&['OPEN','INVESTIGATING'].includes(row.status));
  if(openBlocking.length)errors.push(error('HUMAN_APPROVAL_BLOCKING_PENDING_OPEN','Human approval cannot open Change Control while source batches contain BLOCKING PENDING',{pendingIds:openBlocking.map((row)=>row.id)}));
  if(proposal.gateSnapshot?.openBlockingPending>0)errors.push(error('HUMAN_APPROVAL_PROPOSAL_BLOCKING_PENDING','Proposal snapshot contains open BLOCKING PENDING',{openBlockingPending:proposal.gateSnapshot.openBlockingPending}));

  if(errors.length)return{pass:false,record:null,errors};
  const sortedBindings=[...reviewBindings].sort((a,b)=>`${a.evidenceId}|${a.candidateId}`.localeCompare(`${b.evidenceId}|${b.candidateId}`));
  const relevantQueueSnapshot=batchItems.map((row)=>({
    queueId:row.queueId,kind:row.kind,sourceId:row.sourceId,reviewStatus:row.reviewStatus,sourceDecision:row.sourceDecision??null,
    batchId:row.refs?.batchId??null,pendingId:row.refs?.pendingId??null,reviewProvenance:row.refs?.reviewProvenance??null
  })).sort((a,b)=>a.queueId.localeCompare(b.queueId));
  const record={
    schemaVersion:HUMAN_APPROVAL_PROVENANCE_SCHEMA_VERSION,
    recordType:HUMAN_APPROVAL_PROVENANCE_RECORD_TYPE,
    status:'PASS',proposalId:proposal.id,productId:proposal.productId,
    proposalFingerprint:actualProposalFingerprint,baseMasterFingerprint:proposal.target.baseMasterFingerprint,
    approval:{
      approverType:'HUMAN',approvedBy:approval.approvedBy,approvedAt:approval.approvedAt,approvalSource:approval.approvalSource,
      approvalReference:approval.approvalReference??approval.requestedAction,scope:approval.scope??null,productionApproval:approval.productionApproval===true
    },
    reviewBinding:{
      reviewQueueSchemaVersion:reviewQueue.reviewQueueSchemaVersion??null,
      reviewQueueGeneratedAt:reviewQueue.generatedAt??null,
      sourceBatchIds,
      canonicalEvidenceIds:evidenceIds,
      adjudicationIds:unique(sortedBindings.map((row)=>row.adjudicationId)),
      bindings:sortedBindings,
      relevantQueueFingerprint:stableHash(relevantQueueSnapshot),
      openBlockingPending:0
    },
    authority:{humanApprovalVerified:true,geminiApprovalAllowed:false,chatgptHumanImpersonationAllowed:false,changeControlWriteAllowed:true,productionMasterAutoWrite:false,runtimeAutoWrite:false}
  };
  return{pass:true,record,errors:[]};
}

export function validateHumanApprovalProvenance(record,{proposal,approval=null,reviewQueue=null,adjudicationStore=null,baseMaster=null}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[error('HUMAN_APPROVAL_PROVENANCE_INVALID','Human Approval Provenance must be an object')]};
  if(record.schemaVersion!==HUMAN_APPROVAL_PROVENANCE_SCHEMA_VERSION)errors.push(error('HUMAN_APPROVAL_PROVENANCE_SCHEMA_INVALID','Unsupported Human Approval Provenance schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==HUMAN_APPROVAL_PROVENANCE_RECORD_TYPE)errors.push(error('HUMAN_APPROVAL_PROVENANCE_TYPE_INVALID','Unexpected Human Approval Provenance recordType',{actual:record.recordType??null}));
  if(record.status!=='PASS')errors.push(error('HUMAN_APPROVAL_PROVENANCE_NOT_PASS','Persistable Human Approval Provenance must be PASS',{actual:record.status??null}));
  if(record.approval?.approverType!=='HUMAN'||forbiddenIdentity(record.approval?.approvedBy))errors.push(error('HUMAN_APPROVAL_PROVENANCE_ACTOR_INVALID','Human Approval Provenance must retain a valid HUMAN actor'));
  if(record.authority?.geminiApprovalAllowed!==false||record.authority?.chatgptHumanImpersonationAllowed!==false||record.authority?.changeControlWriteAllowed!==true)errors.push(error('HUMAN_APPROVAL_PROVENANCE_AUTHORITY_INVALID','Human Approval Provenance authority boundary is invalid'));
  if(record.authority?.productionMasterAutoWrite!==false||record.authority?.runtimeAutoWrite!==false)errors.push(error('HUMAN_APPROVAL_PROVENANCE_AUTO_WRITE_FORBIDDEN','Human approval must not auto-write Production Master or Runtime'));
  if(proposal){
    const currentFingerprint=proposalFingerprint(proposal);
    if(record.proposalId!==proposal.id||record.productId!==proposal.productId)errors.push(error('HUMAN_APPROVAL_PROVENANCE_PROPOSAL_BINDING_MISMATCH','Human Approval Provenance proposal binding changed'));
    if(record.proposalFingerprint!==currentFingerprint||proposal.proposalFingerprint!==currentFingerprint)errors.push(error('HUMAN_APPROVAL_PROVENANCE_PROPOSAL_STALE','Proposal fingerprint changed after Human approval',{approved:record.proposalFingerprint??null,current:currentFingerprint}));
    if(record.baseMasterFingerprint!==proposal.target?.baseMasterFingerprint)errors.push(error('HUMAN_APPROVAL_PROVENANCE_BASE_BINDING_MISMATCH','Human Approval Provenance base Master binding changed'));
  }
  if(baseMaster&&record.baseMasterFingerprint!==productMasterFingerprint(baseMaster))errors.push(error('HUMAN_APPROVAL_PROVENANCE_BASE_MASTER_DRIFT','Base Product Master changed after Human approval',{approved:record.baseMasterFingerprint,actual:productMasterFingerprint(baseMaster)}));
  if(approval){
    if(record.approval?.approvedBy!==approval.approvedBy||record.approval?.approvedAt!==approval.approvedAt||record.approval?.approvalSource!==approval.approvalSource)errors.push(error('HUMAN_APPROVAL_PROVENANCE_APPROVAL_BINDING_MISMATCH','Explicit Human approval record changed after provenance was created'));
  }
  if(reviewQueue&&adjudicationStore&&proposal&&approval){
    const rebuilt=buildHumanApprovalProvenance({proposal,approval,reviewQueue,adjudicationStore,baseMaster});
    if(!rebuilt.pass)errors.push(...rebuilt.errors);
    else{
      if(record.reviewBinding?.relevantQueueFingerprint!==rebuilt.record.reviewBinding.relevantQueueFingerprint)errors.push(error('HUMAN_APPROVAL_PROVENANCE_REVIEW_STALE','Relevant Review Queue state changed after Human approval',{approved:record.reviewBinding?.relevantQueueFingerprint??null,current:rebuilt.record.reviewBinding.relevantQueueFingerprint}));
      if(stableHash(record.reviewBinding?.bindings??[])!==stableHash(rebuilt.record.reviewBinding.bindings))errors.push(error('HUMAN_APPROVAL_PROVENANCE_EVIDENCE_BINDING_STALE','Evidence/adjudication bindings changed after Human approval'));
    }
  }
  return{pass:errors.length===0,errors};
}
