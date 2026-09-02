import crypto from'node:crypto';

const clone=(value)=>structuredClone(value);
const sortDeep=(value)=>{
  if(Array.isArray(value))return value.map(sortDeep);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,sortDeep(value[key])]));
  return value;
};
const stableJson=(value)=>JSON.stringify(sortDeep(value));
const sha256=(value)=>crypto.createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const err=(code,message,details={})=>({code,message,...details});

export const PRODUCTION_PREVIEW_SCHEMA_VERSION='1.0';
export const PRODUCTION_MATCH_CLASSES=new Set([
  'EXACT_PRESENT','EVIDENCE_ENRICHMENT_ONLY','SCHEMA_GAP_NON_MUTATING','MUTATION_REQUIRED','CONFLICT','UNRESOLVED'
]);

function corePreviewPayload(preview){
  const copy=clone(preview);
  delete copy.previewFingerprint;
  delete copy.productionApproval;
  return copy;
}
export const productionPreviewFingerprint=(preview)=>`sha256:${sha256(corePreviewPayload(preview))}`;

export function validateProductionTargetSnapshot(snapshot,{expectedFileId=null,expectedTitle=null,expectedModifiedTime=null}={}){
  const errors=[];
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))errors.push(err('PRODUCTION_TARGET_REQUIRED','Production target snapshot is required'));
  if(snapshot?.recordType!=='PRODUCT_MASTER_PRODUCTION_TARGET_SNAPSHOT')errors.push(err('PRODUCTION_TARGET_TYPE_INVALID','Production target snapshot recordType is invalid'));
  if(!snapshot?.fileId)errors.push(err('PRODUCTION_TARGET_FILE_ID_REQUIRED','Production target fileId is required'));
  if(expectedFileId&&snapshot?.fileId!==expectedFileId)errors.push(err('PRODUCTION_TARGET_FILE_ID_MISMATCH','Production target fileId does not match the expected formal Master',{expected:expectedFileId,actual:snapshot?.fileId}));
  if(expectedTitle&&snapshot?.title!==expectedTitle)errors.push(err('PRODUCTION_TARGET_TITLE_MISMATCH','Production target title does not match the expected formal Master',{expected:expectedTitle,actual:snapshot?.title}));
  if(expectedModifiedTime&&snapshot?.modifiedTime!==expectedModifiedTime)errors.push(err('PRODUCTION_TARGET_DRIFT','Production target modifiedTime changed after snapshot',{expected:expectedModifiedTime,actual:snapshot?.modifiedTime}));
  if(!Array.isArray(snapshot?.formalRecords))errors.push(err('PRODUCTION_TARGET_RECORDS_REQUIRED','formalRecords must be an array'));
  return{pass:errors.length===0,status:errors.length?'PRODUCTION_TARGET_REJECTED':'PRODUCTION_TARGET_VALID',errors};
}

export function createProductionDiffPreview({
  id,proposalId,productId,stagingResultMasterFingerprint,expectedStagingResultMasterFingerprint,
  targetSnapshot,evidenceMappings=[],openBlockingPending=0,openNonBlockingPending=0,
  createdBy='CHATGPT',at=new Date().toISOString(),summary=''
}={}){
  const errors=[];
  if(!id)errors.push(err('PRODUCTION_PREVIEW_ID_REQUIRED','Production preview id is required'));
  if(!proposalId)errors.push(err('PRODUCTION_PROPOSAL_ID_REQUIRED','Source Product Master Change Proposal id is required'));
  if(!productId)errors.push(err('PRODUCTION_PRODUCT_ID_REQUIRED','productId is required'));
  if(stagingResultMasterFingerprint!==expectedStagingResultMasterFingerprint)errors.push(err('PRODUCTION_STAGING_FINGERPRINT_MISMATCH','STAGING Master fingerprint does not match the approved staging result',{expected:expectedStagingResultMasterFingerprint,actual:stagingResultMasterFingerprint}));
  if(!Number.isInteger(openBlockingPending)||openBlockingPending<0)errors.push(err('PRODUCTION_BLOCKING_PENDING_INVALID','openBlockingPending must be a non-negative integer'));
  if(openBlockingPending>0)errors.push(err('PRODUCTION_BLOCKING_PENDING_OPEN',`Production preview blocked by ${openBlockingPending} open BLOCKING PENDING`,{openBlockingPending}));
  const targetValidation=validateProductionTargetSnapshot(targetSnapshot);
  if(!targetValidation.pass)errors.push(...targetValidation.errors);
  if(!Array.isArray(evidenceMappings))errors.push(err('PRODUCTION_EVIDENCE_MAPPINGS_REQUIRED','evidenceMappings must be an array'));
  for(const mapping of evidenceMappings??[]){
    if(!mapping?.evidenceId)errors.push(err('PRODUCTION_EVIDENCE_ID_REQUIRED','Every production mapping requires evidenceId'));
    if(!PRODUCTION_MATCH_CLASSES.has(mapping?.classification))errors.push(err('PRODUCTION_MATCH_CLASS_INVALID',`Invalid production mapping classification: ${mapping?.classification}`));
  }
  if(errors.length)return{pass:false,status:'PRODUCTION_PREVIEW_REJECTED',errors};

  const formalMutations=evidenceMappings.filter((row)=>row.classification==='MUTATION_REQUIRED').flatMap((row)=>row.formalMutations??[]);
  const conflicts=evidenceMappings.filter((row)=>row.classification==='CONFLICT');
  const unresolved=evidenceMappings.filter((row)=>row.classification==='UNRESOLVED');
  const nonMutating=evidenceMappings.filter((row)=>['EXACT_PRESENT','EVIDENCE_ENRICHMENT_ONLY','SCHEMA_GAP_NON_MUTATING'].includes(row.classification));
  const blocked=conflicts.length>0||unresolved.length>0;
  const status=blocked?'BLOCKED':formalMutations.length>0?'READY_FOR_HUMAN_PRODUCTION_APPROVAL':'NO_FORMAL_MUTATION_REQUIRED';
  const preview={
    previewSchemaVersion:PRODUCTION_PREVIEW_SCHEMA_VERSION,recordType:'PRODUCT_MASTER_PRODUCTION_PREVIEW',
    id,status,proposalId,productId,summary,createdAt:at,createdBy,
    staging:{resultMasterFingerprint:stagingResultMasterFingerprint},
    productionTarget:{fileId:targetSnapshot.fileId,title:targetSnapshot.title,version:targetSnapshot.version,modifiedTime:targetSnapshot.modifiedTime,snapshotFingerprint:targetSnapshot.snapshotFingerprint},
    pendingSnapshot:{openBlockingPending,openNonBlockingPending},
    evidenceMappings:clone(evidenceMappings),
    diff:{evidenceMappingCount:evidenceMappings.length,nonMutatingEvidenceCount:nonMutating.length,formalMutationCount:formalMutations.length,conflictCount:conflicts.length,unresolvedCount:unresolved.length,formalMutations:clone(formalMutations)},
    approvalPolicy:{productionWriteApproval:formalMutations.length>0?'HUMAN_REQUIRED':'NOT_APPLICABLE_NO_WRITE',approvalScope:'EXACT_PREVIEW_FINGERPRINT'},
    productionWritePlanned:formalMutations.length>0,
    productionWritePerformed:false,
    runtimeWritePerformed:false
  };
  preview.previewFingerprint=productionPreviewFingerprint(preview);
  return{pass:!blocked,status,preview,errors:blocked?[...conflicts.map((row)=>err('PRODUCTION_MAPPING_CONFLICT','Production mapping conflicts with formal Master',{evidenceId:row.evidenceId})),...unresolved.map((row)=>err('PRODUCTION_MAPPING_UNRESOLVED','Production mapping is unresolved',{evidenceId:row.evidenceId}))]:[]};
}

export function approveProductionDiffPreview(preview,{
  approverType,approvedBy,expectedPreviewFingerprint,note='',at=new Date().toISOString()
}={}){
  const errors=[];
  if(preview?.status!=='READY_FOR_HUMAN_PRODUCTION_APPROVAL')errors.push(err('PRODUCTION_APPROVAL_NOT_REQUIRED_OR_NOT_READY',`Production approval is only valid for READY_FOR_HUMAN_PRODUCTION_APPROVAL previews: ${preview?.status}`));
  if(approverType!=='HUMAN')errors.push(err('PRODUCTION_HUMAN_APPROVAL_REQUIRED','Production write requires HUMAN approval'));
  if(!approvedBy)errors.push(err('PRODUCTION_APPROVER_REQUIRED','approvedBy is required'));
  const actual=preview?productionPreviewFingerprint(preview):null;
  if(preview?.previewFingerprint!==actual)errors.push(err('PRODUCTION_PREVIEW_TAMPERED','Production preview content no longer matches previewFingerprint'));
  if(expectedPreviewFingerprint&&expectedPreviewFingerprint!==actual)errors.push(err('PRODUCTION_APPROVAL_FINGERPRINT_MISMATCH','Production approval fingerprint does not match current preview'));
  if(errors.length)return{pass:false,status:'PRODUCTION_APPROVAL_REJECTED',errors};
  const approved=clone(preview);
  approved.status='PRODUCTION_APPROVED';
  approved.productionApproval={approverType:'HUMAN',approvedBy,approvedAt:at,note,approvedPreviewFingerprint:actual};
  return{pass:true,status:'PRODUCTION_APPROVED',preview:approved,errors:[]};
}

export function finalizeNoOpProductionPreview(preview,{finalizedBy='CHATGPT_CONTROL_PLANE',at=new Date().toISOString()}={}){
  const errors=[];
  if(preview?.status!=='NO_FORMAL_MUTATION_REQUIRED')errors.push(err('PRODUCTION_NOOP_NOT_ALLOWED',`Only NO_FORMAL_MUTATION_REQUIRED preview can be finalized without a production write: ${preview?.status}`));
  if(preview?.diff?.formalMutationCount!==0)errors.push(err('PRODUCTION_NOOP_MUTATION_PRESENT','No-op finalization is forbidden when formal mutations exist'));
  if(preview?.productionWritePerformed)errors.push(err('PRODUCTION_NOOP_WRITE_ALREADY_PERFORMED','No-op preview cannot report a production write'));
  if(errors.length)return{pass:false,status:'PRODUCTION_NOOP_REJECTED',errors};
  const finalized=clone(preview);
  finalized.status='PRODUCTION_SYNCED_NO_OP';
  finalized.finalization={finalizedAt:at,finalizedBy,reason:'STAGING evidence is already represented by the formal Product Master; no formal cell mutation is required.'};
  finalized.productionWritePerformed=false;
  return{pass:true,status:'PRODUCTION_SYNCED_NO_OP',preview:finalized,errors:[]};
}

export function buildProductionWriteSet(preview){
  const errors=[];
  if(preview?.status!=='PRODUCTION_APPROVED')errors.push(err('PRODUCTION_APPROVAL_REQUIRED','Production write set requires PRODUCTION_APPROVED preview'));
  const actual=preview?productionPreviewFingerprint(preview):null;
  if(preview?.previewFingerprint!==actual||preview?.productionApproval?.approvedPreviewFingerprint!==actual)errors.push(err('PRODUCTION_APPROVED_PREVIEW_TAMPERED','Approved production preview changed after approval'));
  if((preview?.diff?.formalMutationCount??0)<=0)errors.push(err('PRODUCTION_WRITESET_EMPTY','Production write set requires at least one formal mutation'));
  if(errors.length)return{pass:false,status:'PRODUCTION_WRITESET_REJECTED',productionWritePerformed:false,errors};
  return{pass:true,status:'PRODUCTION_WRITESET_READY',writeSet:{previewId:preview.id,previewFingerprint:actual,target:clone(preview.productionTarget),mutations:clone(preview.diff.formalMutations)},productionWritePerformed:false,errors:[]};
}
