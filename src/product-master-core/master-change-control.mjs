import crypto from'node:crypto';
import fs from'node:fs';
import path from'node:path';

export const MASTER_CHANGE_PROPOSAL_SCHEMA_VERSION='1.0';
export const MASTER_CHANGE_ALLOWED_COLLECTIONS=new Set(['fields','productNodes','evidence','dependencyRules','pending','phases']);
export const MASTER_CHANGE_ALLOWED_OPERATIONS=new Set(['ADD_RECORD','UPDATE_RECORD']);

const err=(code,message,details={})=>({code,message,...details});
const clone=(value)=>structuredClone(value);
const sortDeep=(value)=>{
  if(Array.isArray(value))return value.map(sortDeep);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,sortDeep(value[key])]));
  return value;
};
export const stableJson=(value)=>JSON.stringify(sortDeep(value));
export const sha256=(value)=>crypto.createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
export const productMasterFingerprint=(master)=>`sha256:${sha256(master)}`;

function masterProductId(master){
  return master?.product?.id??master?.productId??null;
}

function coreProposalPayload(proposal){
  const copy=clone(proposal);
  delete copy.status;
  delete copy.approval;
  delete copy.rejection;
  delete copy.applied;
  delete copy.proposalFingerprint;
  return copy;
}

export function proposalFingerprint(proposal){
  return `sha256:${sha256(coreProposalPayload(proposal))}`;
}

function validateChange(change,baseMaster){
  const errors=[];
  if(!change||typeof change!=='object'||Array.isArray(change))return[err('MASTER_CHANGE_INVALID','Change must be an object')];
  if(!MASTER_CHANGE_ALLOWED_OPERATIONS.has(change.operation))errors.push(err('MASTER_CHANGE_OPERATION_FORBIDDEN',`Unsupported change operation: ${change.operation}`));
  if(!MASTER_CHANGE_ALLOWED_COLLECTIONS.has(change.collection))errors.push(err('MASTER_CHANGE_COLLECTION_FORBIDDEN',`Unsupported Product Master collection: ${change.collection}`));
  const collection=Array.isArray(baseMaster?.[change.collection])?baseMaster[change.collection]:[];
  if(change.operation==='ADD_RECORD'){
    if(!change.record||typeof change.record!=='object'||Array.isArray(change.record))errors.push(err('MASTER_CHANGE_ADD_RECORD_REQUIRED','ADD_RECORD requires record object'));
    else if(!change.record.id)errors.push(err('MASTER_CHANGE_RECORD_ID_REQUIRED','ADD_RECORD record.id is required'));
    else if(collection.some((row)=>row?.id===change.record.id))errors.push(err('MASTER_CHANGE_RECORD_ID_CONFLICT',`Record already exists in ${change.collection}: ${change.record.id}`));
  }
  if(change.operation==='UPDATE_RECORD'){
    if(!change.recordId)errors.push(err('MASTER_CHANGE_UPDATE_ID_REQUIRED','UPDATE_RECORD requires recordId'));
    else if(!collection.some((row)=>row?.id===change.recordId))errors.push(err('MASTER_CHANGE_UPDATE_TARGET_NOT_FOUND',`UPDATE_RECORD target not found in ${change.collection}: ${change.recordId}`));
    if(!change.patch||typeof change.patch!=='object'||Array.isArray(change.patch))errors.push(err('MASTER_CHANGE_PATCH_REQUIRED','UPDATE_RECORD requires patch object'));
    if(change.patch?.id&&change.patch.id!==change.recordId)errors.push(err('MASTER_CHANGE_ID_MUTATION_FORBIDDEN','UPDATE_RECORD cannot change record id'));
  }
  return errors;
}

function proposedEvidenceIds(changes){
  return new Set(changes.filter((row)=>row.operation==='ADD_RECORD'&&row.collection==='evidence').map((row)=>row.record?.id).filter(Boolean));
}

function validateEvidenceDependencies({baseMaster,changes,evidenceIds}){
  const known=new Set([...(baseMaster.evidence??[]).map((row)=>row.id),...proposedEvidenceIds(changes)]);
  return evidenceIds.filter((id)=>!known.has(id)).map((id)=>err('MASTER_CHANGE_EVIDENCE_UNKNOWN',`Proposal references Evidence that is not present in the base Master or proposed additions: ${id}`,{evidenceId:id}));
}

export function createProductMasterChangeProposal({
  id,productId,baseMaster,changes=[],evidenceIds=[],sourceBatchIds=[],openBlockingPending=0,
  createdBy='CHATGPT',at=new Date().toISOString(),summary='',approvalPolicy='HUMAN_REQUIRED'
}={}){
  const errors=[];
  if(!id)errors.push(err('MASTER_CHANGE_PROPOSAL_ID_REQUIRED','Proposal id is required'));
  if(!baseMaster||typeof baseMaster!=='object'||Array.isArray(baseMaster))errors.push(err('MASTER_CHANGE_BASE_MASTER_REQUIRED','Base Product Master object is required'));
  const actualProductId=masterProductId(baseMaster);
  const resolvedProductId=productId??actualProductId;
  if(!resolvedProductId)errors.push(err('MASTER_CHANGE_PRODUCT_ID_REQUIRED','Product id is required'));
  if(actualProductId&&resolvedProductId&&actualProductId!==resolvedProductId)errors.push(err('MASTER_CHANGE_PRODUCT_MISMATCH',`Base Master product ${actualProductId} does not match proposal product ${resolvedProductId}`));
  if(!Array.isArray(changes)||changes.length===0)errors.push(err('MASTER_CHANGE_EMPTY','At least one Product Master change is required'));
  if(!Number.isInteger(openBlockingPending)||openBlockingPending<0)errors.push(err('MASTER_CHANGE_BLOCKING_COUNT_INVALID','openBlockingPending must be a non-negative integer'));
  if(approvalPolicy!=='HUMAN_REQUIRED')errors.push(err('MASTER_CHANGE_APPROVAL_POLICY_FORBIDDEN','v1.1 requires HUMAN_REQUIRED approval policy'));
  if(baseMaster&&typeof baseMaster==='object'&&Array.isArray(changes))for(const change of changes)errors.push(...validateChange(change,baseMaster));
  if(baseMaster&&Array.isArray(evidenceIds))errors.push(...validateEvidenceDependencies({baseMaster,changes,evidenceIds}));
  if(errors.length)return{pass:false,status:'PROPOSAL_REJECTED',errors};

  const riskLevel=changes.some((row)=>row.operation==='UPDATE_RECORD')?'HIGH':'MEDIUM';
  const proposal={
    proposalSchemaVersion:MASTER_CHANGE_PROPOSAL_SCHEMA_VERSION,
    recordType:'PRODUCT_MASTER_CHANGE_PROPOSAL',id,status:'PROPOSED',productId:resolvedProductId,
    target:{baseMasterFingerprint:productMasterFingerprint(baseMaster)},
    summary,changes:clone(changes),evidenceIds:[...new Set(evidenceIds)],sourceBatchIds:[...new Set(sourceBatchIds)],
    gateSnapshot:{openBlockingPending},riskLevel,approvalPolicy,createdAt:at,createdBy
  };
  proposal.proposalFingerprint=proposalFingerprint(proposal);
  return{pass:true,status:'PROPOSAL_CREATED',proposal,errors:[]};
}

export function approveProductMasterChangeProposal(proposal,{
  approverType,approvedBy,note='',at=new Date().toISOString(),expectedProposalFingerprint=null
}={}){
  const errors=[];
  if(proposal?.status!=='PROPOSED')errors.push(err('MASTER_CHANGE_NOT_PROPOSED',`Only PROPOSED changes can be approved: ${proposal?.status}`));
  if(approverType!=='HUMAN')errors.push(err('MASTER_CHANGE_HUMAN_APPROVAL_REQUIRED','Product Master change approval requires HUMAN approver'));
  if(!approvedBy)errors.push(err('MASTER_CHANGE_APPROVER_REQUIRED','approvedBy is required'));
  const actualFingerprint=proposal?proposalFingerprint(proposal):null;
  if(proposal?.proposalFingerprint!==actualFingerprint)errors.push(err('MASTER_CHANGE_PROPOSAL_TAMPERED','Proposal content fingerprint no longer matches proposalFingerprint'));
  if(expectedProposalFingerprint&&expectedProposalFingerprint!==actualFingerprint)errors.push(err('MASTER_CHANGE_APPROVAL_FINGERPRINT_MISMATCH','Approval fingerprint does not match current proposal content'));
  if(errors.length)return{pass:false,status:'APPROVAL_REJECTED',errors};
  const approved=clone(proposal);
  approved.status='APPROVED';
  approved.approval={approverType:'HUMAN',approvedBy,approvedAt:at,note,approvedProposalFingerprint:actualFingerprint};
  return{pass:true,status:'PROPOSAL_APPROVED',proposal:approved,errors:[]};
}

export function rejectProductMasterChangeProposal(proposal,{rejectedBy,reason,at=new Date().toISOString()}={}){
  if(proposal?.status!=='PROPOSED')return{pass:false,status:'REJECTION_REJECTED',errors:[err('MASTER_CHANGE_NOT_PROPOSED',`Only PROPOSED changes can be rejected: ${proposal?.status}`)]};
  if(!rejectedBy||!reason)return{pass:false,status:'REJECTION_REJECTED',errors:[err('MASTER_CHANGE_REJECTION_DETAILS_REQUIRED','rejectedBy and reason are required')]};
  const rejected=clone(proposal);
  rejected.status='REJECTED';
  rejected.rejection={rejectedBy,reason,rejectedAt:at};
  return{pass:true,status:'PROPOSAL_REJECTED_BY_APPROVER',proposal:rejected,errors:[]};
}

function applyChanges(baseMaster,changes){
  const master=clone(baseMaster);
  for(const change of changes){
    if(!Array.isArray(master[change.collection]))master[change.collection]=[];
    if(change.operation==='ADD_RECORD')master[change.collection].push(clone(change.record));
    if(change.operation==='UPDATE_RECORD'){
      const index=master[change.collection].findIndex((row)=>row?.id===change.recordId);
      master[change.collection][index]={...master[change.collection][index],...clone(change.patch),id:change.recordId};
    }
  }
  return master;
}

function duplicateIds(master){
  const duplicates=[];
  for(const collection of MASTER_CHANGE_ALLOWED_COLLECTIONS){
    if(!Array.isArray(master?.[collection]))continue;
    const seen=new Set();
    for(const row of master[collection]){
      if(!row?.id)continue;
      if(seen.has(row.id))duplicates.push({collection,id:row.id});
      seen.add(row.id);
    }
  }
  return duplicates;
}

export function applyApprovedProductMasterChangeProposal({
  proposal,baseMaster,openBlockingPending=null,validateMaster=null,mode='STAGING',at=new Date().toISOString(),appliedBy='SYSTEM'
}={}){
  const errors=[];
  if(proposal?.status!=='APPROVED')errors.push(err('MASTER_CHANGE_APPROVAL_REQUIRED',`Proposal must be APPROVED before apply: ${proposal?.status}`));
  if(proposal?.approval?.approverType!=='HUMAN')errors.push(err('MASTER_CHANGE_HUMAN_APPROVAL_REQUIRED','Approved proposal must contain HUMAN approval'));
  const currentProposalFingerprint=proposal?proposalFingerprint(proposal):null;
  if(proposal?.proposalFingerprint!==currentProposalFingerprint||proposal?.approval?.approvedProposalFingerprint!==currentProposalFingerprint)errors.push(err('MASTER_CHANGE_APPROVED_CONTENT_TAMPERED','Approved proposal content changed after approval'));
  const currentBaseFingerprint=baseMaster?productMasterFingerprint(baseMaster):null;
  if(proposal?.target?.baseMasterFingerprint!==currentBaseFingerprint)errors.push(err('MASTER_CHANGE_BASE_DRIFT','Base Product Master changed after proposal creation',{expected:proposal?.target?.baseMasterFingerprint,actual:currentBaseFingerprint}));
  const blocking=openBlockingPending??proposal?.gateSnapshot?.openBlockingPending??0;
  if(blocking>0)errors.push(err('MASTER_CHANGE_BLOCKING_PENDING_OPEN',`Product Master apply blocked by ${blocking} open BLOCKING PENDING`,{openBlockingPending:blocking}));
  if(mode==='PRODUCTION')errors.push(err('MASTER_CHANGE_PRODUCTION_ADAPTER_REQUIRED','Core v1.1 cannot directly write a production Product Master; an explicit external production adapter is required'));
  if(errors.length)return{pass:false,status:'MASTER_APPLY_REJECTED',productionMasterWritePerformed:false,errors};

  const appliedMaster=applyChanges(baseMaster,proposal.changes);
  const duplicates=duplicateIds(appliedMaster);
  if(duplicates.length)return{pass:false,status:'MASTER_APPLY_REJECTED',productionMasterWritePerformed:false,errors:[err('MASTER_CHANGE_DUPLICATE_ID_AFTER_APPLY','Applied Master contains duplicate ids',{duplicates})]};
  if(validateMaster){
    const validation=validateMaster(appliedMaster);
    if(validation===false||validation?.pass===false)return{pass:false,status:'MASTER_APPLY_REJECTED',productionMasterWritePerformed:false,errors:[err('MASTER_CHANGE_POST_VALIDATION_FAILED','Applied Product Master failed post-apply validation',{validation})]};
  }
  const applied=clone(proposal);
  applied.status='APPLIED';
  applied.applied={mode:'STAGING',appliedAt:at,appliedBy,baseMasterFingerprint:currentBaseFingerprint,resultMasterFingerprint:productMasterFingerprint(appliedMaster)};
  return{pass:true,status:'STAGING_MASTER_APPLIED',proposal:applied,appliedMaster,productionMasterWritePerformed:false,errors:[]};
}

function writeAtomic(filePath,content){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}

export function persistProductMasterChangeProposal(proposal,{rootDir=path.resolve('data/master-change-control')}={}){
  if(!proposal?.id)throw new Error('Proposal id is required');
  const filePath=path.join(path.resolve(rootDir),'proposals',`${proposal.id}.json`);
  if(fs.existsSync(filePath))throw new Error(`Product Master Change Proposal already exists: ${proposal.id}`);
  writeAtomic(filePath,`${JSON.stringify(proposal,null,2)}\n`);
  return filePath;
}

export function persistAppliedStagingMaster({proposal,appliedMaster},{rootDir=path.resolve('data/master-change-control')}={}){
  if(proposal?.status!=='APPLIED')throw new Error('Only APPLIED proposal can persist a staging Master snapshot');
  const filePath=path.join(path.resolve(rootDir),'staging',`${proposal.id}.master.json`);
  writeAtomic(filePath,`${JSON.stringify(appliedMaster,null,2)}\n`);
  return filePath;
}
