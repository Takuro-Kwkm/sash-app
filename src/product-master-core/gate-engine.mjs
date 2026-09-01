import{validateProductMasterCore}from'./validator.mjs';
import{isVerifiedOfficialEvidence}from'./evidence-schema.mjs';
import{isUnresolvedPending}from'./pending-lifecycle.mjs';

export function evaluatePhaseGate(master,{phaseId=master?.gatePolicy?.phaseId}={}){
  const validation=validateProductMasterCore(master);
  const phase=(master?.phases??[]).find((row)=>row.id===phaseId)??null;
  const openBlockingPending=(master?.pending??[]).filter((row)=>isUnresolvedPending(row)&&row.severity==='BLOCKING');
  const evidenceConflicts=(master?.evidence??[]).filter((row)=>row.status==='CONFLICT');
  const evidenceById=new Map((master?.evidence??[]).map((row)=>[row.id,row]));
  const activeRules=(master?.dependencyRules??[]).filter((row)=>row.status!=='INACTIVE');
  const rulesMissingOfficialEvidence=activeRules.filter((rule)=>!(rule.evidenceIds??[]).some((id)=>isVerifiedOfficialEvidence(evidenceById.get(id))));
  const criteria={
    validationPass:validation.pass,
    phasePresent:Boolean(phase),
    blockingPendingZero:openBlockingPending.length===0,
    evidenceConflictZero:evidenceConflicts.length===0
  };
  if(master?.gatePolicy?.requireOfficialEvidence===true)criteria.officialEvidenceComplete=rulesMissingOfficialEvidence.length===0;
  const pass=Object.values(criteria).every(Boolean);
  return{
    id:master?.gatePolicy?.id??'UNSPECIFIED_GATE',phaseId,status:pass?'PASS':'BLOCKED',pass,criteria,
    counts:{openBlockingPending:openBlockingPending.length,evidenceConflicts:evidenceConflicts.length,validationErrors:validation.errors.length,rulesMissingOfficialEvidence:rulesMissingOfficialEvidence.length},
    validation
  };
}
