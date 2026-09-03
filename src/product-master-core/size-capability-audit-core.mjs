import { createHash } from 'node:crypto';
export const RULE_AUDIT_STATUSES=Object.freeze(new Set([
  'MATCH','RULE_MISMATCH','SOURCE_GRAPH_REVIEW_REQUIRED','SOURCE_MISSING','SELECTOR_MISMATCH','PENDING'
]));

export const STANDARD_AUDIT_STATUSES=Object.freeze(new Set([
  'MATCH','MISSING_IN_CANONICAL','CANONICAL_INACTIVE','EXTRA_IN_CANONICAL','MISSING_IN_RUNTIME','EXTRA_IN_RUNTIME','PENDING'
]));

const writesDetected=(document)=>Boolean(document?.formalMasterWritePerformed||document?.formalWorkbookWritePerformed||document?.runtimeWritePerformed||document?.runtimeManufacturerDataWritePerformed||document?.autoMutationPerformed);

export function validateRuleAuditDocument(document){
  const errors=[];
  if(!document||typeof document!=='object')return['rule audit document missing'];
  if(!Number.isInteger(document.expectedRuleCount)||!Number.isInteger(document.auditedRuleCount))errors.push('rule counts must be integers');
  if(document.expectedRuleCount!==document.auditedRuleCount)errors.push(`rule count mismatch: expected ${document.expectedRuleCount}, audited ${document.auditedRuleCount}`);
  if(!Array.isArray(document.records))errors.push('rule audit records missing');
  else {
    if(document.records.length!==document.auditedRuleCount)errors.push('rule audit record length mismatch');
    const ids=new Set();
    for(const row of document.records){
      if(!row?.rule_id)errors.push('rule_id missing');
      else if(ids.has(row.rule_id))errors.push(`duplicate rule_id: ${row.rule_id}`);
      else ids.add(row.rule_id);
      if(!RULE_AUDIT_STATUSES.has(row?.audit_status))errors.push(`invalid rule status: ${row?.audit_status}`);
    }
  }
  if(writesDetected(document))errors.push('audit document must be non-mutating');
  return errors;
}

export function validateStandardAuditDocument(document){
  const errors=[];
  if(!document||!Array.isArray(document.records))return['standard audit records missing'];
  for(const row of document.records){
    if(!row?.product_id||!row?.product_node)errors.push('standard audit identity missing');
    if(!STANDARD_AUDIT_STATUSES.has(row?.coverage_status))errors.push(`invalid standard coverage status: ${row?.coverage_status}`);
    if(row.coverage_status==='MATCH'){
      for(const key of ['official_available','canonical_match','runtime_match'])if(!Number.isInteger(row[key]))errors.push(`MATCH row ${row.product_node} missing integer ${key}`);
    }
  }
  if(writesDetected(document))errors.push('standard audit must be non-mutating');
  return errors;
}

export function validatePendingDocument(document){
  const errors=[];
  if(!document||!Array.isArray(document.items))return['pending registry missing'];
  const ids=new Set();
  for(const row of document.items){
    if(!row?.id)errors.push('pending id missing');
    else if(ids.has(row.id))errors.push(`duplicate pending id: ${row.id}`);
    else ids.add(row.id);
    if(typeof row?.blocking!=='boolean')errors.push(`pending ${row?.id??'?'} blocking flag missing`);
  }
  const blocking=document.items.filter((row)=>row.blocking).length;
  if(document.blockingCount!==blocking)errors.push(`blocking count mismatch: declared ${document.blockingCount}, actual ${blocking}`);
  return errors;
}

const stable=(value)=>{
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};

export function computeProposalFingerprint(document){
  const payload=structuredClone(document??{});
  delete payload.proposalFingerprint;
  return `sha256:${createHash('sha256').update(stable(payload)).digest('hex')}`;
}

export function validateChangeProposalDocument(document){
  const errors=[];
  if(!document||typeof document!=='object')return['change proposal missing'];
  if(!document.proposalId)errors.push('proposalId missing');
  if(document.status!=='PROPOSED')errors.push(`proposal ${document.proposalId??'?'} status must be PROPOSED`);
  if(document.approvalPolicy!=='HUMAN_REQUIRED')errors.push(`proposal ${document.proposalId??'?'} approvalPolicy must be HUMAN_REQUIRED`);
  if(document.approvalStatus!=='PENDING')errors.push(`proposal ${document.proposalId??'?'} approvalStatus must be PENDING`);
  if(writesDetected(document)||document.autoApprovalPerformed)errors.push(`proposal ${document.proposalId??'?'} must be non-mutating and unapproved`);
  const expected=computeProposalFingerprint(document);
  if(document.proposalFingerprint!==expected)errors.push(`proposal ${document.proposalId??'?'} fingerprint mismatch`);
  return errors;
}

export function buildSizeCapabilityAuditGate({summary,standardAudit,customAudit,pending,ruleAudits=[],proposals=[]}){
  const errors=[];
  if(summary?.commonSalesInputContract!=='FORMAL_PASS')errors.push('Common Sash Sales Input Contract is not FORMAL_PASS');
  if(writesDetected(summary)||writesDetected(customAudit))errors.push('manufacturer data mutation detected inside audit scope');
  errors.push(...validateStandardAuditDocument(standardAudit));
  errors.push(...validatePendingDocument(pending));
  for(const document of ruleAudits)errors.push(...validateRuleAuditDocument(document));
  for(const document of proposals)errors.push(...validateChangeProposalDocument(document));
  const blockingPending=pending?.items?.filter((row)=>row.blocking).length??0;
  const managedPending=blockingPending>0;
  const status=errors.length?'FAIL':managedPending?'PARTIAL_PASS':'FORMAL_PASS';
  return {
    schemaVersion:'1.0',recordType:'SASH_SIZE_CAPABILITY_AUDIT_GATE',status,
    integrityGate:errors.length?'FAIL':'PASS',managedPendingGate:managedPending?'OPEN_MANAGED':'CLOSED',
    blockingPending,errors,
    formalMasterWritePerformed:false,runtimeManufacturerDataWritePerformed:false,autoMutationPerformed:false
  };
}
