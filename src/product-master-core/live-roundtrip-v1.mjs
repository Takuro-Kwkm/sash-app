import path from'node:path';
import{runEvidenceRoundTrip}from'./evidence-roundtrip-runner.mjs';
import{APW430_PRODUCT_MASTER_WORKFLOW}from'./products/apw430/workflow.mjs';

export function runApw430LiveEvidenceRoundTrip({
  artifactDir=path.resolve('artifacts/product-master-live-v1'),
  rawPath=path.resolve(APW430_PRODUCT_MASTER_WORKFLOW.evidenceRoundTrip.rawPath)
}={}){
  const round=APW430_PRODUCT_MASTER_WORKFLOW.evidenceRoundTrip;
  return runEvidenceRoundTrip({
    artifactDir,rawPath,productId:APW430_PRODUCT_MASTER_WORKFLOW.productId,
    knownFields:round.knownFields,nodeIds:round.nodeIds,existingCanonicalEvidence:round.existingCanonicalEvidence,
    adjudicationPlan:round.adjudicationPlan,expectedProducerMode:round.expectedProducerMode,
    issueSeverity:round.issueSeverity,timeOrigin:round.timeOrigin,reportVersion:'1.0-R1',reportLabel:'LIVE_ROUNDTRIP'
  });
}
