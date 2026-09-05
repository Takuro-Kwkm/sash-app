import fs from'node:fs';
import path from'node:path';
import{
  evidenceAdjudicationSummary,loadEvidenceAdjudicationStore,transitionPersistedPending
}from'./evidence-adjudication-store.mjs';
import{validateTechnicalFactRegistry}from'./technical-fact-registry.mjs';

const defaultResolutionNote='Verified Technical Fact retained in the GitHub Control Plane. It is not a Canonical selection field, does not mutate the formal Workbook schema, and is not consumed by Runtime unless a future explicit adapter is separately approved.';

export function runTechnicalFactResolutionWorkflow({
  artifactDir,
  productId,
  technicalFacts,
  runEvidenceRoundTrip,
  resolutionNote=defaultResolutionNote,
  reportVersion='1.4',
  expectedPendingBefore=null
}={}){
  if(!artifactDir)throw new Error('artifactDir is required');
  if(!productId)throw new Error('productId is required');
  if(!Array.isArray(technicalFacts))throw new Error('technicalFacts must be an array');
  if(typeof runEvidenceRoundTrip!=='function')throw new Error('runEvidenceRoundTrip is required');
  const absoluteArtifactDir=path.resolve(artifactDir);
  fs.mkdirSync(absoluteArtifactDir,{recursive:true});

  const validation=validateTechnicalFactRegistry(technicalFacts);
  if(!validation.pass)throw new Error(JSON.stringify(validation.errors));
  if(technicalFacts.some((row)=>row.productId!==productId))throw new Error('Technical Fact product scope mismatch');
  const duplicateIssueIds=technicalFacts.map((row)=>row.sourceIssueId).filter((id,index,rows)=>id&&rows.indexOf(id)!==index);
  if(duplicateIssueIds.length)throw new Error(`Duplicate Technical Fact sourceIssueId: ${[...new Set(duplicateIssueIds)].join(', ')}`);

  const live=runEvidenceRoundTrip({artifactDir:path.join(absoluteArtifactDir,'evidence-roundtrip')});
  const rootDir=live.inboxRoot;
  const before=evidenceAdjudicationSummary(rootDir);
  if(expectedPendingBefore!==null&&before.openPending!==expectedPendingBefore)throw new Error(`Expected ${expectedPendingBefore} open PENDING before Technical Fact resolution, got ${before.openPending}`);

  const allFactIds=technicalFacts.map((row)=>row.id);
  const resolutions=[];
  for(const fact of technicalFacts){
    if(!fact.sourceIssueId)throw new Error(`Technical Fact ${fact.id} has no sourceIssueId for PENDING linkage`);
    const store=loadEvidenceAdjudicationStore(rootDir);
    const matches=store.pending.filter((row)=>row.sourceIssueId===fact.sourceIssueId&&['OPEN','INVESTIGATING'].includes(row.status));
    if(matches.length!==1)throw new Error(`Expected exactly one open PENDING linked to ${fact.sourceIssueId}, got ${matches.length}`);
    const pending=matches[0];
    const note=typeof resolutionNote==='function'?resolutionNote(fact,pending):resolutionNote;
    const result=transitionPersistedPending({
      rootDir,pendingId:pending.id,nextStatus:'RESOLVED',technicalFactIds:[fact.id],externalTechnicalFactIds:allFactIds,
      resolutionNote:note,at:new Date().toISOString(),by:'CHATGPT'
    });
    if(!result.pass)throw new Error(JSON.stringify(result.errors));
    resolutions.push({pendingId:pending.id,sourceIssueId:fact.sourceIssueId,technicalFactId:fact.id,status:result.pending.status});
  }

  const after=evidenceAdjudicationSummary(rootDir);
  const finalStore=loadEvidenceAdjudicationStore(rootDir);
  const resolvedIds=new Set(resolutions.map((row)=>row.pendingId));
  const resolved=finalStore.pending.filter((row)=>resolvedIds.has(row.id)&&row.status==='RESOLVED'&&(row.resolutionTechnicalFactIds??[]).length>0);
  const sourceLocatorPass=technicalFacts.every((row)=>row.source?.type==='OFFICIAL_PDF'&&row.source?.driveFileId&&Number.isInteger(row.source?.printedPage)&&Number.isInteger(row.source?.pdfPage)&&row.source?.locatorText);
  const noCanonicalPollution=technicalFacts.every((row)=>row.canonicalField===null);
  const noWorkbookAutoMutation=technicalFacts.every((row)=>row.formalWorkbookPolicy==='CONTROL_PLANE_ONLY');
  const noRuntimeAutoConsumption=technicalFacts.every((row)=>row.runtimePolicy==='REFERENCE_ONLY_NOT_CONSUMED');
  const typeCounts=Object.fromEntries([...new Set(technicalFacts.map((row)=>row.factType))].sort().map((type)=>[type,technicalFacts.filter((row)=>row.factType===type).length]));
  const expectedAfter=Math.max(0,before.openPending-technicalFacts.length);
  const pendingResolutionPass=after.openPending===expectedAfter&&resolved.length===technicalFacts.length;
  const pass=live.pass&&validation.pass&&sourceLocatorPass&&noCanonicalPollution&&noWorkbookAutoMutation&&noRuntimeAutoConsumption&&pendingResolutionPass;
  const report={
    reportVersion,status:pass?'TECHNICAL_FACT_BOUNDARY_PASS':'FAIL',productId,
    architectureDecision:'FORMAL_WORKBOOK_SELECTION_DATA_ONLY__TECHNICAL_PROVENANCE_IN_GITHUB_CONTROL_PLANE',
    technicalFactCount:technicalFacts.length,technicalFactTypeCounts:typeCounts,
    pendingBefore:before.openPending,pendingAfter:after.openPending,resolvedByTechnicalFact:resolved.length,
    canonicalFieldAdded:false,formalWorkbookSchemaMutation:false,formalWorkbookWritePerformed:false,runtimeWritePerformed:false,
    runtimePolicy:noRuntimeAutoConsumption?'REFERENCE_ONLY_NOT_CONSUMED':'MIXED',resolutions,
    gates:{
      TECHNICAL_FACT_REGISTRY:validation.pass?'PASS':'FAIL',PRODUCT_SCOPE:technicalFacts.every((row)=>row.productId===productId)?'PASS':'FAIL',
      EXACT_OFFICIAL_SOURCE_LOCATORS:sourceLocatorPass?'PASS':'FAIL',CANONICAL_FIELD_POLLUTION:noCanonicalPollution?'0':'FAIL',
      FORMAL_WORKBOOK_SCHEMA_MUTATION:noWorkbookAutoMutation?'0':'FAIL',RUNTIME_AUTO_CONSUMPTION:noRuntimeAutoConsumption?'0':'FAIL',
      PENDING_RESOLUTION:pendingResolutionPass?'PASS':'FAIL'
    }
  };
  fs.writeFileSync(path.join(absoluteArtifactDir,'technical-facts.json'),`${JSON.stringify(technicalFacts,null,2)}\n`,'utf8');
  fs.writeFileSync(path.join(absoluteArtifactDir,'technical-fact-resolution-report.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
  return{pass,artifactDir:absoluteArtifactDir,inboxRoot:rootDir,report,state:finalStore};
}
