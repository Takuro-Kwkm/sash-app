import path from'node:path';
import{runApw430LiveEvidenceRoundTrip}from'../src/product-master-core/live-roundtrip-v1.mjs';
import{runTechnicalFactResolutionWorkflow}from'../src/product-master-core/technical-fact-resolution-runner.mjs';
import{APW430_PRODUCT_MASTER_WORKFLOW}from'../src/product-master-core/products/apw430/workflow.mjs';

const artifactDir=path.resolve(process.argv[2]??'artifacts/product-master-technical-facts-v13');
const result=runTechnicalFactResolutionWorkflow({
  artifactDir,
  productId:APW430_PRODUCT_MASTER_WORKFLOW.productId,
  technicalFacts:APW430_PRODUCT_MASTER_WORKFLOW.technicalFacts,
  runEvidenceRoundTrip:({artifactDir:roundtripDir})=>runApw430LiveEvidenceRoundTrip({artifactDir:roundtripDir}),
  expectedPendingBefore:4,
  reportVersion:'1.3',
  resolutionNote:'Official APW430 p.70/PDF p.72 dimension formula is retained as a VERIFIED Technical Fact in the GitHub Control Plane. It is not a Canonical selection field, does not require a formal Workbook schema mutation, and is not consumed by Runtime unless a future explicit adapter is approved.'
});
console.log(JSON.stringify({pass:result.pass,artifactDir:result.artifactDir,report:result.report},null,2));
if(!result.pass)process.exitCode=1;
