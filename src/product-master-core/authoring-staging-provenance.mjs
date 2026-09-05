import{proposalFingerprint,productMasterFingerprint,stableJson,sha256}from'./master-change-control.mjs';

export const AUTHORING_STAGING_PROVENANCE_SCHEMA_VERSION='1.1';
export const AUTHORING_STAGING_PROVENANCE_RECORD_TYPE='PRODUCT_MASTER_AUTHORING_STAGING_PROVENANCE';

const error=(code,message,details={})=>({code,message,...details});
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const stableHash=(value)=>`sha256:${sha256(stableJson(value))}`;

export function buildAuthoringStagingProvenance({
  appliedProposal,baseMaster,appliedMaster,humanApprovalProvenance,humanApprovalReviewGateBinding,humanApprovalGate,
  validation={pass:true},at=new Date().toISOString(),appliedBy='CHATGPT_CONTROL_PLANE'
}={}){
  const errors=[];
  if(!isObject(appliedProposal)||appliedProposal.status!=='APPLIED')errors.push(error('AUTHORING_STAGING_APPLIED_PROPOSAL_REQUIRED','Authoring STAGING provenance requires an APPLIED proposal',{actual:appliedProposal?.status??null}));
  if(!isObject(baseMaster))errors.push(error('AUTHORING_STAGING_BASE_MASTER_REQUIRED','Authoring STAGING provenance requires the exact Base Master'));
  if(!isObject(appliedMaster))errors.push(error('AUTHORING_STAGING_RESULT_MASTER_REQUIRED','Authoring STAGING provenance requires the applied STAGING Master'));
  if(!isObject(humanApprovalProvenance)||humanApprovalProvenance.status!=='PASS'||humanApprovalProvenance.recordType!=='PRODUCT_MASTER_HUMAN_APPROVAL_PROVENANCE')errors.push(error('AUTHORING_STAGING_HUMAN_APPROVAL_INVALID','Authoring STAGING provenance requires PASS Human Approval Provenance'));
  if(!isObject(humanApprovalReviewGateBinding)||humanApprovalReviewGateBinding.status!=='PASS'||humanApprovalReviewGateBinding.recordType!=='PRODUCT_MASTER_HUMAN_APPROVAL_REVIEW_GATE_BINDING')errors.push(error('AUTHORING_STAGING_REVIEW_GATE_BINDING_INVALID','Authoring STAGING provenance requires PASS Human Approval Review Gate Binding'));
  if(!isObject(humanApprovalGate)||humanApprovalGate.status!=='PASS'||humanApprovalGate.recordType!=='PRODUCT_MASTER_CHANGE_CONTROL_ENTRY_GATE')errors.push(error('AUTHORING_STAGING_CHANGE_CONTROL_GATE_INVALID','Authoring STAGING provenance requires PASS Change Control Entry Gate'));
  if(validation===false||validation?.pass===false)errors.push(error('AUTHORING_STAGING_POST_VALIDATION_FAILED','Applied STAGING Master must pass post-apply validation',{validation}));
  if(errors.length)return{pass:false,record:null,errors};

  const baseFingerprint=productMasterFingerprint(baseMaster);
  const resultFingerprint=productMasterFingerprint(appliedMaster);
  const currentProposalFingerprint=proposalFingerprint(appliedProposal);
  if(appliedProposal.proposalFingerprint!==currentProposalFingerprint)errors.push(error('AUTHORING_STAGING_PROPOSAL_TAMPERED','Applied proposal no longer matches proposalFingerprint',{expected:appliedProposal.proposalFingerprint??null,actual:currentProposalFingerprint}));
  if(appliedProposal.approval?.approverType!=='HUMAN')errors.push(error('AUTHORING_STAGING_HUMAN_APPROVAL_REQUIRED','Applied proposal must retain HUMAN approval'));
  if(appliedProposal.applied?.mode!=='STAGING')errors.push(error('AUTHORING_STAGING_MODE_INVALID','Authoring STAGING provenance can only be created from STAGING apply',{actual:appliedProposal.applied?.mode??null}));
  if(appliedProposal.applied?.baseMasterFingerprint!==baseFingerprint)errors.push(error('AUTHORING_STAGING_BASE_FINGERPRINT_MISMATCH','Applied proposal base fingerprint does not match Base Master',{expected:baseFingerprint,actual:appliedProposal.applied?.baseMasterFingerprint??null}));
  if(appliedProposal.applied?.resultMasterFingerprint!==resultFingerprint)errors.push(error('AUTHORING_STAGING_RESULT_FINGERPRINT_MISMATCH','Applied proposal result fingerprint does not match STAGING Master',{expected:resultFingerprint,actual:appliedProposal.applied?.resultMasterFingerprint??null}));
  if(humanApprovalProvenance.proposalId!==appliedProposal.id||humanApprovalProvenance.proposalFingerprint!==currentProposalFingerprint)errors.push(error('AUTHORING_STAGING_HUMAN_APPROVAL_BINDING_MISMATCH','Human Approval Provenance is not bound to the applied Proposal'));
  if(humanApprovalProvenance.baseMasterFingerprint!==baseFingerprint)errors.push(error('AUTHORING_STAGING_HUMAN_APPROVAL_BASE_MISMATCH','Human Approval Provenance is not bound to the exact Base Master'));
  const approvalFingerprint=stableHash(humanApprovalProvenance);
  const reviewBindingFingerprint=stableHash(humanApprovalReviewGateBinding);
  if(appliedProposal.approval?.humanApprovalProvenanceFingerprint!==approvalFingerprint)errors.push(error('AUTHORING_STAGING_APPROVAL_PROVENANCE_FINGERPRINT_MISMATCH','Applied proposal approval is not bound to current Human Approval Provenance'));
  if(appliedProposal.approval?.humanApprovalReviewGateBindingFingerprint!==reviewBindingFingerprint)errors.push(error('AUTHORING_STAGING_REVIEW_BINDING_FINGERPRINT_MISMATCH','Applied proposal approval is not bound to current Review Queue Gate set'));
  if(humanApprovalGate.humanApprovalProvenanceFingerprint!==approvalFingerprint)errors.push(error('AUTHORING_STAGING_CHANGE_GATE_APPROVAL_MISMATCH','Change Control Gate is bound to different Human Approval Provenance'));
  if(humanApprovalGate.humanApprovalReviewGateBindingFingerprint!==reviewBindingFingerprint)errors.push(error('AUTHORING_STAGING_CHANGE_GATE_REVIEW_MISMATCH','Change Control Gate is bound to different Review Queue Gate set'));
  if(humanApprovalGate.baseMasterFingerprint!==baseFingerprint)errors.push(error('AUTHORING_STAGING_CHANGE_GATE_BASE_MISMATCH','Change Control Gate is bound to a different Base Master'));
  if(errors.length)return{pass:false,record:null,errors};

  const record={
    schemaVersion:AUTHORING_STAGING_PROVENANCE_SCHEMA_VERSION,
    recordType:AUTHORING_STAGING_PROVENANCE_RECORD_TYPE,
    status:'PASS',stage:'STAGING_CANDIDATE',proposalId:appliedProposal.id,productId:appliedProposal.productId,
    proposalFingerprint:currentProposalFingerprint,baseMasterFingerprint:baseFingerprint,resultMasterFingerprint:resultFingerprint,
    changeSetFingerprint:stableHash(appliedProposal.changes??[]),
    humanApprovalProvenanceFingerprint:approvalFingerprint,
    humanApprovalReviewGateBindingFingerprint:reviewBindingFingerprint,
    changeControlGateFingerprint:stableHash(humanApprovalGate),
    reviewQueueGateSetFingerprint:humanApprovalReviewGateBinding.reviewQueueGateSetFingerprint,
    applied:{mode:'STAGING',at:appliedProposal.applied?.appliedAt??at,by:appliedProposal.applied?.appliedBy??appliedBy},
    validation:{status:'PASS',fingerprint:stableHash(validation)},
    authority:{authoringStagingCandidate:true,canonicalMasterWritePerformed:false,productionMasterWritePerformed:false,runtimeWritePerformed:false,registryWritePerformed:false,formalPass:false}
  };
  return{pass:true,record,errors:[]};
}

export function validateAuthoringStagingProvenance(record,{
  appliedProposal=null,baseMaster=null,appliedMaster=null,humanApprovalProvenance=null,humanApprovalReviewGateBinding=null,humanApprovalGate=null
}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[error('AUTHORING_STAGING_PROVENANCE_INVALID','Authoring STAGING provenance must be an object')]};
  if(record.schemaVersion!==AUTHORING_STAGING_PROVENANCE_SCHEMA_VERSION)errors.push(error('AUTHORING_STAGING_SCHEMA_INVALID','Unsupported Authoring STAGING provenance schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==AUTHORING_STAGING_PROVENANCE_RECORD_TYPE)errors.push(error('AUTHORING_STAGING_TYPE_INVALID','Unexpected Authoring STAGING provenance recordType',{actual:record.recordType??null}));
  if(record.status!=='PASS'||record.stage!=='STAGING_CANDIDATE')errors.push(error('AUTHORING_STAGING_STATUS_INVALID','Persistable Authoring STAGING provenance must be PASS/STAGING_CANDIDATE',{status:record.status??null,stage:record.stage??null}));
  const authority=record.authority??{};
  if(authority.authoringStagingCandidate!==true||authority.canonicalMasterWritePerformed!==false||authority.productionMasterWritePerformed!==false||authority.runtimeWritePerformed!==false||authority.registryWritePerformed!==false||authority.formalPass!==false)errors.push(error('AUTHORING_STAGING_AUTHORITY_INVALID','Authoring STAGING provenance must remain non-canonical and non-formal'));
  if(appliedProposal&&baseMaster&&appliedMaster&&humanApprovalProvenance&&humanApprovalReviewGateBinding&&humanApprovalGate){
    const rebuilt=buildAuthoringStagingProvenance({appliedProposal,baseMaster,appliedMaster,humanApprovalProvenance,humanApprovalReviewGateBinding,humanApprovalGate,validation:{pass:true}});
    if(!rebuilt.pass)errors.push(...rebuilt.errors);
    else{
      const keys=['proposalId','productId','proposalFingerprint','baseMasterFingerprint','resultMasterFingerprint','changeSetFingerprint','humanApprovalProvenanceFingerprint','humanApprovalReviewGateBindingFingerprint','changeControlGateFingerprint','reviewQueueGateSetFingerprint'];
      for(const key of keys)if(record[key]!==rebuilt.record[key])errors.push(error('AUTHORING_STAGING_BINDING_STALE',`Authoring STAGING provenance ${key} changed`,{field:key,expected:rebuilt.record[key],actual:record[key]??null}));
    }
  }
  return{pass:errors.length===0,errors};
}
