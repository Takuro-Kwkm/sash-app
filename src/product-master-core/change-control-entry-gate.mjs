import{approveProductMasterChangeProposal,applyApprovedProductMasterChangeProposal,proposalFingerprint,productMasterFingerprint,stableJson,sha256}from'./master-change-control.mjs';
import{validateHumanApprovalProvenance}from'./human-approval-provenance.mjs';
import{validateHumanApprovalReviewGateBinding}from'./human-approval-review-gate-binding.mjs';
import{buildAuthoringStagingProvenance}from'./authoring-staging-provenance.mjs';

export const CHANGE_CONTROL_ENTRY_GATE_SCHEMA_VERSION='1.1';
export const CHANGE_CONTROL_ENTRY_GATE_RECORD_TYPE='PRODUCT_MASTER_CHANGE_CONTROL_ENTRY_GATE';

const error=(code,message,details={})=>({code,message,...details});
const stableHash=(value)=>`sha256:${sha256(stableJson(value))}`;
const clone=(value)=>structuredClone(value);

function proposedSnapshot(proposal){
  const next=clone(proposal);
  next.status='PROPOSED';
  delete next.approval;
  delete next.rejection;
  delete next.applied;
  return next;
}

function stageAllowed(scope){return typeof scope==='string'&&scope.includes('STAGE');}

export function openGovernedChangeControl({
  proposal,approval,humanApprovalProvenance,humanApprovalReviewGateBinding,reviewQueueValidations=[],reviewQueue,adjudicationStore,baseMaster
}={}){
  const errors=[];
  if(proposal?.status!=='PROPOSED')errors.push(error('CHANGE_CONTROL_PROPOSAL_NOT_PROPOSED','Change Control can only open from a PROPOSED proposal',{actual:proposal?.status??null}));
  const validation=validateHumanApprovalProvenance(humanApprovalProvenance,{proposal,approval,reviewQueue,adjudicationStore,baseMaster});
  if(!validation.pass)errors.push(...validation.errors);
  const reviewGateValidation=validateHumanApprovalReviewGateBinding(humanApprovalReviewGateBinding,{proposal,humanApprovalProvenance,reviewQueueValidations});
  if(!reviewGateValidation.pass)errors.push(...reviewGateValidation.errors);
  if(humanApprovalProvenance?.approval?.productionApproval===true)errors.push(error('CHANGE_CONTROL_PRODUCTION_APPROVAL_SCOPE_FORBIDDEN','Common Change Control entry does not treat Human review approval as Production Master approval'));
  if(errors.length)return{pass:false,status:'HUMAN_APPROVAL_GATE_BLOCKED',humanApprovalGate:null,approvedProposal:null,errors};

  const approved=approveProductMasterChangeProposal(proposal,{
    approverType:'HUMAN',approvedBy:approval.approvedBy,note:approval.note??approval.approvalReference??approval.requestedAction??'',
    at:approval.approvedAt,expectedProposalFingerprint:humanApprovalProvenance.proposalFingerprint
  });
  if(!approved.pass)return{pass:false,status:'HUMAN_APPROVAL_GATE_BLOCKED',humanApprovalGate:null,approvedProposal:null,errors:approved.errors};

  const provenanceFingerprint=stableHash(humanApprovalProvenance);
  const reviewGateBindingFingerprint=stableHash(humanApprovalReviewGateBinding);
  approved.proposal.approval={
    ...approved.proposal.approval,
    approvalSource:approval.approvalSource,
    approvalReference:approval.approvalReference??approval.requestedAction,
    scope:approval.scope??null,
    productionApproval:false,
    humanApprovalProvenanceFingerprint:provenanceFingerprint,
    humanApprovalReviewGateBindingFingerprint:reviewGateBindingFingerprint
  };
  const humanApprovalGate={
    schemaVersion:CHANGE_CONTROL_ENTRY_GATE_SCHEMA_VERSION,
    recordType:CHANGE_CONTROL_ENTRY_GATE_RECORD_TYPE,
    status:'PASS',proposalId:proposal.id,productId:proposal.productId,
    proposalFingerprint:proposalFingerprint(proposal),baseMasterFingerprint:productMasterFingerprint(baseMaster),
    humanApprovalProvenanceFingerprint:provenanceFingerprint,
    humanApprovalReviewGateBindingFingerprint:reviewGateBindingFingerprint,
    reviewQueueGateSetFingerprint:humanApprovalReviewGateBinding.reviewQueueGateSetFingerprint,
    approvedBy:approval.approvedBy,approvedAt:approval.approvedAt,scope:approval.scope??null,
    authority:{humanApprovalRequired:true,reviewQueueGateRequired:true,geminiApprovalAllowed:false,chatgptHumanImpersonationAllowed:false,changeControlOpen:true,productionMasterWriteAllowed:false,runtimeWriteAllowed:false}
  };
  return{pass:true,status:'CHANGE_CONTROL_OPEN',humanApprovalGate,approvedProposal:approved.proposal,errors:[]};
}

export function validateGovernedChangeControlEntry({
  approvedProposal,approval,humanApprovalProvenance,humanApprovalReviewGateBinding,reviewQueueValidations=[],humanApprovalGate,reviewQueue,adjudicationStore,baseMaster
}={}){
  const errors=[];
  if(approvedProposal?.status!=='APPROVED')errors.push(error('CHANGE_CONTROL_APPROVED_PROPOSAL_REQUIRED','Governed Change Control requires APPROVED proposal',{actual:approvedProposal?.status??null}));
  if(approvedProposal?.approval?.approverType!=='HUMAN')errors.push(error('CHANGE_CONTROL_HUMAN_APPROVAL_REQUIRED','Governed Change Control requires HUMAN approval'));
  const snapshot=approvedProposal?proposedSnapshot(approvedProposal):approvedProposal;
  const validation=validateHumanApprovalProvenance(humanApprovalProvenance,{proposal:snapshot,approval,reviewQueue,adjudicationStore,baseMaster});
  if(!validation.pass)errors.push(...validation.errors);
  const reviewGateValidation=validateHumanApprovalReviewGateBinding(humanApprovalReviewGateBinding,{proposal:snapshot,humanApprovalProvenance,reviewQueueValidations});
  if(!reviewGateValidation.pass)errors.push(...reviewGateValidation.errors);
  const currentProvenanceFingerprint=humanApprovalProvenance?stableHash(humanApprovalProvenance):null;
  const currentReviewGateBindingFingerprint=humanApprovalReviewGateBinding?stableHash(humanApprovalReviewGateBinding):null;
  if(approvedProposal?.approval?.humanApprovalProvenanceFingerprint!==currentProvenanceFingerprint)errors.push(error('CHANGE_CONTROL_APPROVAL_PROVENANCE_FINGERPRINT_MISMATCH','Approved proposal is not bound to the current Human Approval Provenance',{expected:currentProvenanceFingerprint,actual:approvedProposal?.approval?.humanApprovalProvenanceFingerprint??null}));
  if(approvedProposal?.approval?.humanApprovalReviewGateBindingFingerprint!==currentReviewGateBindingFingerprint)errors.push(error('CHANGE_CONTROL_REVIEW_GATE_BINDING_FINGERPRINT_MISMATCH','Approved proposal is not bound to the current Review Queue Gate set',{expected:currentReviewGateBindingFingerprint,actual:approvedProposal?.approval?.humanApprovalReviewGateBindingFingerprint??null}));
  if(humanApprovalGate){
    if(humanApprovalGate.status!=='PASS'||humanApprovalGate.recordType!==CHANGE_CONTROL_ENTRY_GATE_RECORD_TYPE)errors.push(error('CHANGE_CONTROL_GATE_RECORD_INVALID','Human Approval Gate record is not PASS'));
    if(humanApprovalGate.humanApprovalProvenanceFingerprint!==currentProvenanceFingerprint)errors.push(error('CHANGE_CONTROL_GATE_PROVENANCE_STALE','Human Approval Gate is bound to a different approval provenance'));
    if(humanApprovalGate.humanApprovalReviewGateBindingFingerprint!==currentReviewGateBindingFingerprint)errors.push(error('CHANGE_CONTROL_GATE_REVIEW_BINDING_STALE','Human Approval Gate is bound to a different Review Queue Gate set'));
    if(humanApprovalGate.reviewQueueGateSetFingerprint!==humanApprovalReviewGateBinding?.reviewQueueGateSetFingerprint)errors.push(error('CHANGE_CONTROL_GATE_REVIEW_GATE_SET_STALE','Human Approval Gate Review Queue Gate set fingerprint changed'));
    if(humanApprovalGate.proposalFingerprint!==proposalFingerprint(snapshot))errors.push(error('CHANGE_CONTROL_GATE_PROPOSAL_STALE','Human Approval Gate is bound to a stale Proposal fingerprint'));
    if(humanApprovalGate.baseMasterFingerprint!==productMasterFingerprint(baseMaster))errors.push(error('CHANGE_CONTROL_GATE_BASE_MASTER_STALE','Human Approval Gate is bound to a stale Base Master'));
  }
  const openBlocking=(adjudicationStore?.pending??[]).filter((row)=>humanApprovalProvenance?.reviewBinding?.sourceBatchIds?.includes(row.sourceBatchId??row.reviewProvenance?.batchId)&&row.severity==='BLOCKING'&&['OPEN','INVESTIGATING'].includes(row.status));
  if(openBlocking.length)errors.push(error('CHANGE_CONTROL_BLOCKING_PENDING_REOPENED','BLOCKING PENDING opened after Human approval',{pendingIds:openBlocking.map((row)=>row.id)}));
  return{pass:errors.length===0,status:errors.length?'CHANGE_CONTROL_ENTRY_BLOCKED':'PASS',errors};
}

export function applyGovernedApprovedProductMasterChangeProposal({
  approvedProposal,approval,humanApprovalProvenance,humanApprovalReviewGateBinding,reviewQueueValidations=[],humanApprovalGate,reviewQueue,adjudicationStore,baseMaster,
  openBlockingPending=null,validateMaster=null,mode='STAGING',at=new Date().toISOString(),appliedBy='CHATGPT_CONTROL_PLANE'
}={}){
  const gate=validateGovernedChangeControlEntry({approvedProposal,approval,humanApprovalProvenance,humanApprovalReviewGateBinding,reviewQueueValidations,humanApprovalGate,reviewQueue,adjudicationStore,baseMaster});
  if(!gate.pass)return{pass:false,status:'MASTER_APPLY_REJECTED',humanApprovalGate:'BLOCKED',changeControlGate:'BLOCKED',authoringStagingGate:'NOT_REACHED',productionMasterWritePerformed:false,runtimeWritePerformed:false,errors:gate.errors};
  if(mode!=='STAGING')return{pass:false,status:'MASTER_APPLY_REJECTED',humanApprovalGate:'PASS',changeControlGate:'BLOCKED',authoringStagingGate:'NOT_REACHED',productionMasterWritePerformed:false,runtimeWritePerformed:false,errors:[error('CHANGE_CONTROL_STAGING_ONLY','Governed common Change Control entry only permits STAGING; Production requires the later Production/Formal gate')]};
  if(!stageAllowed(humanApprovalProvenance?.approval?.scope))return{pass:false,status:'MASTER_APPLY_REJECTED',humanApprovalGate:'PASS',changeControlGate:'BLOCKED',authoringStagingGate:'NOT_REACHED',productionMasterWritePerformed:false,runtimeWritePerformed:false,errors:[error('CHANGE_CONTROL_STAGE_SCOPE_MISSING','Explicit Human approval scope does not permit STAGING',{scope:humanApprovalProvenance?.approval?.scope??null})]};
  const blocking=openBlockingPending??0;
  const applied=applyApprovedProductMasterChangeProposal({proposal:approvedProposal,baseMaster,openBlockingPending:blocking,validateMaster,mode,at,appliedBy});
  if(!applied.pass)return{...applied,humanApprovalGate:'PASS',changeControlGate:'BLOCKED',authoringStagingGate:'NOT_REACHED',runtimeWritePerformed:false};
  const stagingProvenance=buildAuthoringStagingProvenance({
    appliedProposal:applied.proposal,baseMaster,appliedMaster:applied.appliedMaster,humanApprovalProvenance,humanApprovalReviewGateBinding,humanApprovalGate,
    validation:{pass:true},at,appliedBy
  });
  if(!stagingProvenance.pass)return{
    pass:false,status:'AUTHORING_STAGING_PROVENANCE_BLOCKED',proposal:applied.proposal,appliedMaster:applied.appliedMaster,
    humanApprovalGate:'PASS',changeControlGate:'PASS',authoringStagingGate:'BLOCKED',productionMasterWritePerformed:false,runtimeWritePerformed:false,errors:stagingProvenance.errors
  };
  return{...applied,humanApprovalGate:'PASS',changeControlGate:'PASS',authoringStagingGate:'PASS',authoringStagingProvenance:stagingProvenance.record,runtimeWritePerformed:false};
}
