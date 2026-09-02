import path from'node:path';
import{runEvidenceRoundTrip}from'../src/product-master-core/evidence-roundtrip-runner.mjs';
import{runStandardSizeSourceAuditWorkflow}from'../src/product-master-core/standard-size-source-audit-runner.mjs';
import{runTechnicalFactResolutionWorkflow}from'../src/product-master-core/technical-fact-resolution-runner.mjs';
import{PRODUCT_MASTER_WORKFLOW_REGISTRY}from'../src/product-master-core/products/index.mjs';

const productId=process.argv[2];
const stage=process.argv[3]??'evidence-roundtrip';
const artifactDir=path.resolve(process.argv[4]??`artifacts/product-master-workflow/${productId??'unknown'}/${stage}`);
if(!productId)throw new Error('Usage: node scripts/run-product-master-workflow.mjs <productId> <evidence-roundtrip|technical-facts|size-source-audit> [artifactDir]');
const profile=PRODUCT_MASTER_WORKFLOW_REGISTRY.require(productId);
const runRoundTrip=({artifactDir:dir})=>{
  if(!profile.capabilities.evidenceRoundTrip)throw new Error(`Evidence round trip is not enabled for ${productId}`);
  const round=profile.evidenceRoundTrip;
  return runEvidenceRoundTrip({
    artifactDir:dir,rawPath:path.resolve(round.rawPath),productId:profile.productId,
    knownFields:round.knownFields,nodeIds:round.nodeIds,existingCanonicalEvidence:round.existingCanonicalEvidence??[],
    adjudicationPlan:round.adjudicationPlan,expectedProducerMode:round.expectedProducerMode??'LIVE_EXTERNAL',
    issueSeverity:round.issueSeverity??'NON_BLOCKING',timeOrigin:round.timeOrigin,reportVersion:'1.4',reportLabel:'PRODUCT_MASTER_EVIDENCE_ROUNDTRIP'
  });
};

let result;
if(stage==='evidence-roundtrip')result=runRoundTrip({artifactDir});
else if(stage==='technical-facts'){
  if(!profile.capabilities.technicalFacts)throw new Error(`Technical Facts are not enabled for ${productId}`);
  result=runTechnicalFactResolutionWorkflow({
    artifactDir,productId:profile.productId,technicalFacts:profile.technicalFacts,
    runEvidenceRoundTrip:runRoundTrip,reportVersion:'1.4'
  });
}else if(stage==='size-source-audit'){
  if(!profile.capabilities.standardSizeSourceAudit)throw new Error(`Standard-size source audit is not enabled for ${productId}`);
  const audit=profile.standardSizeSourceAudit;
  result=runStandardSizeSourceAuditWorkflow({
    artifactDir,productId:profile.productId,sourceRecords:audit.sourceRecords,canonicalRecords:audit.canonicalRecords,
    sourceScopeLabel:audit.sourceScopeLabel,reportVersion:'1.5'
  });
}else throw new Error(`Unsupported Product Master workflow stage: ${stage}`);

console.log(JSON.stringify({pass:result.pass,coveragePass:result.coveragePass??null,productId,stage,artifactDir:result.artifactDir,report:result.report},null,2));
if(!result.pass)process.exitCode=1;
