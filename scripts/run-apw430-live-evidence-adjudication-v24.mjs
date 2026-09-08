import path from'node:path';
import{runApw430LiveEvidenceAdjudicationV24}from'../src/product-master-core/live-evidence-adjudication-v24.mjs';

const options={};
for(const arg of process.argv.slice(2)){
  if(arg.startsWith('--artifact-dir='))options.artifactDir=path.resolve(arg.slice('--artifact-dir='.length));
  if(arg.startsWith('--source-batch='))options.sourceBatchPath=path.resolve(arg.slice('--source-batch='.length));
  if(arg.startsWith('--coverage-audit='))options.coverageAuditPath=path.resolve(arg.slice('--coverage-audit='.length));
}
try{
  const result=runApw430LiveEvidenceAdjudicationV24(options);
  console.log(JSON.stringify({
    pass:result.pass,
    status:result.report.status,
    productId:result.report.productId,
    sourceBatchId:result.report.sourceBatchId,
    acceptedCanonicalEvidence:result.report.acceptedCanonicalEvidence,
    proposal:result.report.proposal,
    reviewQueue:result.report.reviewQueue,
    negativeControls:result.report.negativeControls,
    writes:result.report.writes,
    gates:result.report.gates,
    artifactDir:result.artifactDir
  },null,2));
}catch(error){
  console.error(JSON.stringify({pass:false,code:error.code??'V24_UNEXPECTED_ERROR',message:error.message,errors:error.errors??null},null,2));
  process.exitCode=1;
}
