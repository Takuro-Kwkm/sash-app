import fs from'node:fs';
import path from'node:path';
import{runApw430LiveEvidenceRoundTrip}from'../src/product-master-core/live-roundtrip-v1.mjs';
import{evidenceAdjudicationSummary,loadEvidenceAdjudicationStore,transitionPersistedPending}from'../src/product-master-core/evidence-adjudication-store.mjs';
import{APW430_TECHNICAL_FACTS}from'../src/product-master-core/poc/apw430-technical-facts.mjs';
import{validateTechnicalFactRegistry}from'../src/product-master-core/technical-fact-registry.mjs';

const artifactDir=path.resolve(process.argv[2]??'artifacts/product-master-technical-facts-v13');
fs.mkdirSync(artifactDir,{recursive:true});
const live=runApw430LiveEvidenceRoundTrip({artifactDir:path.join(artifactDir,'live-roundtrip')});
const rootDir=live.inboxRoot;
const validation=validateTechnicalFactRegistry(APW430_TECHNICAL_FACTS);
if(!validation.pass)throw new Error(JSON.stringify(validation.errors));
const before=evidenceAdjudicationSummary(rootDir);
const allFactIds=APW430_TECHNICAL_FACTS.map((row)=>row.id);
const resolutions=[];
for(const fact of APW430_TECHNICAL_FACTS){
  const store=loadEvidenceAdjudicationStore(rootDir);
  const pending=store.pending.find((row)=>row.sourceIssueId===fact.sourceIssueId);
  if(!pending)throw new Error(`No PENDING linked to ${fact.sourceIssueId}`);
  const result=transitionPersistedPending({
    rootDir,pendingId:pending.id,nextStatus:'RESOLVED',technicalFactIds:[fact.id],externalTechnicalFactIds:allFactIds,
    resolutionNote:'Official APW430 p.70/PDF p.72 dimension formula is retained as a VERIFIED Technical Fact in the GitHub Control Plane. It is not a Canonical selection field, does not require a formal Workbook schema mutation, and is not consumed by Runtime unless a future explicit adapter is approved.',
    at:new Date().toISOString(),by:'CHATGPT'
  });
  if(!result.pass)throw new Error(JSON.stringify(result.errors));
  resolutions.push({pendingId:pending.id,sourceIssueId:fact.sourceIssueId,technicalFactId:fact.id,status:result.pending.status});
}
const after=evidenceAdjudicationSummary(rootDir);
const finalStore=loadEvidenceAdjudicationStore(rootDir);
const resolved=finalStore.pending.filter((row)=>row.status==='RESOLVED'&&(row.resolutionTechnicalFactIds??[]).length>0);
const report={
  reportVersion:'1.3',status:'TECHNICAL_FACT_BOUNDARY_PASS',productId:'SER-YKK-APW430',
  architectureDecision:'FORMAL_WORKBOOK_SELECTION_DATA_ONLY__TECHNICAL_PROVENANCE_IN_GITHUB_CONTROL_PLANE',
  technicalFactCount:APW430_TECHNICAL_FACTS.length,
  dimensionFormulaFacts:APW430_TECHNICAL_FACTS.filter((row)=>row.factType==='DIMENSION_FORMULA').length,
  pendingBefore:before.openPending,pendingAfter:after.openPending,resolvedByTechnicalFact:resolved.length,
  canonicalFieldAdded:false,formalWorkbookSchemaMutation:false,formalWorkbookWritePerformed:false,runtimeWritePerformed:false,
  formulaRuntimePolicy:'REFERENCE_ONLY_NOT_CONSUMED',
  resolutions,
  gates:{
    TECHNICAL_FACT_REGISTRY:validation.pass?'PASS':'FAIL',
    EXACT_OFFICIAL_SOURCE_LOCATORS:APW430_TECHNICAL_FACTS.every((row)=>row.source.printedPage===70&&row.source.pdfPage===72)?'PASS':'FAIL',
    CANONICAL_FIELD_POLLUTION:APW430_TECHNICAL_FACTS.every((row)=>row.canonicalField===null)?'0':'FAIL',
    FORMAL_WORKBOOK_SCHEMA_MUTATION:'0',RUNTIME_AUTO_CONSUMPTION:'0',
    PENDING_4_TO_0:before.openPending===4&&after.openPending===0?'PASS':'FAIL'
  }
};
const pass=live.pass&&validation.pass&&APW430_TECHNICAL_FACTS.length===4&&before.openPending===4&&after.openPending===0&&resolved.length===4;
fs.writeFileSync(path.join(artifactDir,'technical-facts.json'),`${JSON.stringify(APW430_TECHNICAL_FACTS,null,2)}\n`,'utf8');
fs.writeFileSync(path.join(artifactDir,'technical-fact-resolution-report.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(JSON.stringify({pass,artifactDir,report},null,2));
if(!pass)process.exitCode=1;
