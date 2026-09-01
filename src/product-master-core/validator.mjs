import{CANONICAL_FIELD_NAMES}from'./canonical-fields.mjs';
import{validateEvidenceRecord}from'./evidence-schema.mjs';
import{PENDING_STATUSES,isUnresolvedPending}from'./pending-lifecycle.mjs';

const push=(list,code,message,ref=null)=>list.push({code,message,...(ref?{ref}:{})});
const hasId=(row)=>typeof row?.id==='string'&&row.id.length>0;

export function validateProductMasterCore(master){
  const errors=[],warnings=[];
  if(!master?.product?.id)push(errors,'PRODUCT_ID_MISSING','product.id is required');
  if(!master?.coreVersion)push(errors,'CORE_VERSION_MISSING','coreVersion is required');

  const fields=new Set(master?.fields??[]);
  for(const field of fields)if(!CANONICAL_FIELD_NAMES.has(field))push(errors,'UNKNOWN_CANONICAL_FIELD',`Unknown Canonical Field: ${field}`,field);

  const collections=[['productNodes',master?.productNodes??[]],['dependencyRules',master?.dependencyRules??[]],['evidence',master?.evidence??[]],['pending',master?.pending??[]],['phases',master?.phases??[]]];
  const globalIds=new Set();
  for(const [name,rows]of collections)for(const row of rows){
    if(!hasId(row)){push(errors,'ID_MISSING',`${name} record id is required`);continue;}
    if(globalIds.has(row.id))push(errors,'DUPLICATE_CORE_ID',`Duplicate Core id: ${row.id}`,row.id);
    globalIds.add(row.id);
  }

  const nodeIds=new Set((master?.productNodes??[]).map((row)=>row.id));
  for(const node of master?.productNodes??[]){
    if(node.parentNodeId&&!nodeIds.has(node.parentNodeId))push(errors,'BROKEN_NODE_PARENT',`Missing parent node: ${node.parentNodeId}`,node.id);
  }

  const evidenceIds=new Set((master?.evidence??[]).map((row)=>row.id));
  for(const evidence of master?.evidence??[]){
    if(!evidence.title&&!evidence.source?.title)push(errors,'EVIDENCE_TITLE_MISSING','Evidence title is required',evidence.id);
    if(!evidence.status)push(errors,'EVIDENCE_STATUS_MISSING','Evidence status is required',evidence.id);
    const report=validateEvidenceRecord(evidence,{knownFields:fields,nodeIds});
    for(const item of report.errors)push(errors,item.code,item.message,evidence.id);
  }

  const ruleIds=new Set((master?.dependencyRules??[]).map((row)=>row.id));
  for(const rule of master?.dependencyRules??[]){
    if(rule.when?.productNodeId&&!nodeIds.has(rule.when.productNodeId))push(errors,'BROKEN_RULE_NODE',`Rule references missing Product Node: ${rule.when.productNodeId}`,rule.id);
    for(const field of Object.keys(rule.when?.fields??{}))if(!fields.has(field)||!CANONICAL_FIELD_NAMES.has(field))push(errors,'BROKEN_RULE_CONDITION_FIELD',`Rule condition uses unavailable field: ${field}`,rule.id);
    if(!(rule.effects?.length))push(errors,'RULE_EFFECT_MISSING','Dependency Rule requires at least one effect',rule.id);
    for(const effect of rule.effects??[]){
      if(!fields.has(effect.field)||!CANONICAL_FIELD_NAMES.has(effect.field))push(errors,'BROKEN_RULE_EFFECT_FIELD',`Rule effect uses unavailable field: ${effect.field}`,rule.id);
      if(!['SET','CLEAR','NOT_APPLICABLE'].includes(effect.operation))push(errors,'RULE_OPERATION_INVALID',`Unsupported rule operation: ${effect.operation}`,rule.id);
      if(effect.operation==='SET'&&effect.value===undefined)push(errors,'RULE_SET_VALUE_MISSING','SET effect requires value',rule.id);
    }
    for(const assertion of rule.assertions??[]){
      if(!assertion.code)push(errors,'RULE_ASSERTION_CODE_MISSING','Rule assertion requires code',rule.id);
      if(!fields.has(assertion.field)||!CANONICAL_FIELD_NAMES.has(assertion.field))push(errors,'RULE_ASSERTION_FIELD_INVALID',`Rule assertion uses unavailable field: ${assertion.field}`,rule.id);
      if(!assertion.predicate)push(errors,'RULE_ASSERTION_PREDICATE_MISSING','Rule assertion requires predicate',rule.id);
    }
    if(!(rule.evidenceIds?.length))push(errors,'RULE_EVIDENCE_MISSING','Confirmed Dependency Rule requires Evidence',rule.id);
    for(const id of rule.evidenceIds??[])if(!evidenceIds.has(id))push(errors,'BROKEN_EVIDENCE_LINK',`Rule references missing Evidence: ${id}`,rule.id);
  }

  for(const issue of master?.pending??[]){
    if(!PENDING_STATUSES.has(issue.status))push(errors,'PENDING_STATUS_INVALID',`Unsupported PENDING status: ${issue.status}`,issue.id);
    if(issue.field&&!fields.has(issue.field))push(errors,'PENDING_FIELD_INVALID',`Pending references unavailable field: ${issue.field}`,issue.id);
    if(issue.productNodeId&&!nodeIds.has(issue.productNodeId))push(errors,'PENDING_NODE_INVALID',`Pending references missing Product Node: ${issue.productNodeId}`,issue.id);
    for(const id of issue.resolutionEvidenceIds??[])if(!evidenceIds.has(id))push(errors,'PENDING_RESOLUTION_EVIDENCE_INVALID',`Pending resolution Evidence missing: ${id}`,issue.id);
    for(const id of issue.resolutionRuleIds??[])if(!ruleIds.has(id))push(errors,'PENDING_RESOLUTION_RULE_INVALID',`Pending resolution Rule missing: ${id}`,issue.id);
    if(issue.status==='RESOLVED'&&!(issue.resolutionEvidenceIds?.length))push(errors,'PENDING_RESOLUTION_EVIDENCE_REQUIRED','Resolved PENDING requires resolution Evidence',issue.id);
    if(issue.status==='RESOLVED'&&!issue.resolutionNote)push(errors,'PENDING_RESOLUTION_NOTE_REQUIRED','Resolved PENDING requires resolution note',issue.id);
  }

  const phaseIds=new Set((master?.phases??[]).map((row)=>row.id));
  if(master?.gatePolicy?.phaseId&&!phaseIds.has(master.gatePolicy.phaseId))push(errors,'GATE_PHASE_INVALID',`Gate references missing phase: ${master.gatePolicy.phaseId}`,master.gatePolicy.id);
  if((master?.pending??[]).some((row)=>isUnresolvedPending(row)&&row.severity!=='BLOCKING'))push(warnings,'OPEN_NON_BLOCKING_PENDING','Unresolved non-blocking PENDING exists');

  return{
    pass:errors.length===0,
    errors,warnings,
    metrics:{fields:fields.size,productNodes:master?.productNodes?.length??0,dependencyRules:master?.dependencyRules?.length??0,evidence:master?.evidence?.length??0,pending:master?.pending?.length??0,phases:master?.phases?.length??0}
  };
}

export function assertProductMasterCore(master){
  const report=validateProductMasterCore(master);
  if(!report.pass)throw new Error(report.errors.map((row)=>`${row.code}: ${row.message}`).join('\n'));
  return report;
}
