import{validateProductMasterCore}from'./validator.mjs';

export function evaluatePhaseGate(master,{phaseId=master?.gatePolicy?.phaseId}={}){
  const validation=validateProductMasterCore(master);
  const phase=(master?.phases??[]).find((row)=>row.id===phaseId)??null;
  const openBlockingPending=(master?.pending??[]).filter((row)=>row.status==='OPEN'&&row.severity==='BLOCKING');
  const evidenceConflicts=(master?.evidence??[]).filter((row)=>row.status==='CONFLICT');
  const criteria={
    validationPass:validation.pass,
    phasePresent:Boolean(phase),
    blockingPendingZero:openBlockingPending.length===0,
    evidenceConflictZero:evidenceConflicts.length===0
  };
  const pass=Object.values(criteria).every(Boolean);
  return{
    id:master?.gatePolicy?.id??'UNSPECIFIED_GATE',phaseId,status:pass?'PASS':'BLOCKED',pass,criteria,
    counts:{openBlockingPending:openBlockingPending.length,evidenceConflicts:evidenceConflicts.length,validationErrors:validation.errors.length},
    validation
  };
}
