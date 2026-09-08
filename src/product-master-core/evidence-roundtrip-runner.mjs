import fs from'node:fs';
import path from'node:path';
import{persistGeminiTransport}from'./evidence-inbox-store.mjs';
import{
  adjudicatePersistedCandidate,evidenceAdjudicationSummary,loadEvidenceAdjudicationStore,
  persistCandidateUnderReview
}from'./evidence-adjudication-store.mjs';
import{inspectCanonicalEvidenceOverlap}from'./evidence-overlap.mjs';
import{registerPersistedTransportIssue}from'./transport-issue-lifecycle.mjs';

const defaultPendingId=(batchId,index)=>`PEND-${batchId.replace(/^BATCH-/,'')}-ISSUE-${String(index+1).padStart(3,'0')}`;
const defaultAtFactory=(origin)=>{
  const start=Date.parse(origin);
  if(!Number.isFinite(start))throw new Error(`Invalid round-trip time origin: ${origin}`);
  return(offsetSeconds)=>new Date(start+offsetSeconds*1000).toISOString();
};
const countPlan=(plan)=>Object.values(plan).reduce((out,row)=>{
  out[row.decision]=(out[row.decision]??0)+1;
  return out;
},{ACCEPT:0,REJECT:0,PENDING:0});

export function runEvidenceRoundTrip({
  artifactDir,
  rawPath,
  productId,
  knownFields,
  nodeIds,
  existingCanonicalEvidence=[],
  adjudicationPlan,
  expectedProducerMode='LIVE_EXTERNAL',
  issueSeverity='NON_BLOCKING',
  pendingIdFactory=defaultPendingId,
  timeOrigin='2026-09-02T06:10:00Z',
  reportVersion='1.0',
  reportLabel='LIVE_ROUNDTRIP'
}={}){
  if(!artifactDir)throw new Error('artifactDir is required');
  if(!rawPath)throw new Error('rawPath is required');
  if(!productId)throw new Error('productId is required');
  if(!knownFields)throw new Error('knownFields is required');
  if(!nodeIds)throw new Error('nodeIds is required');
  if(!adjudicationPlan||typeof adjudicationPlan!=='object')throw new Error('adjudicationPlan is required');

  const absoluteArtifactDir=path.resolve(artifactDir);
  const absoluteRawPath=path.resolve(rawPath);
  const inboxRoot=path.join(absoluteArtifactDir,'evidence-inbox');
  fs.mkdirSync(absoluteArtifactDir,{recursive:true});
  const raw=fs.readFileSync(absoluteRawPath,'utf8');
  const envelope=JSON.parse(raw);
  if(envelope.productId!==productId)throw new Error(`Unexpected round-trip productId: ${envelope.productId}; expected ${productId}`);
  if(envelope.producer?.mode!==expectedProducerMode)throw new Error(`Round trip requires producer mode ${expectedProducerMode}: ${envelope.producer?.mode}`);
  const candidates=envelope.candidates??[];
  const issues=envelope.issues??[];
  const planCounts=countPlan(adjudicationPlan);
  if(Object.keys(adjudicationPlan).length!==candidates.length)throw new Error(`Adjudication plan count ${Object.keys(adjudicationPlan).length} does not match Candidate count ${candidates.length}`);

  const at=defaultAtFactory(timeOrigin);
  const existingBefore=JSON.stringify(existingCanonicalEvidence);
  const persisted=persistGeminiTransport(raw,{rootDir:inboxRoot,expectedProductId:productId,knownFields,nodeIds});
  if(!persisted.pass)throw new Error(`Evidence batch persistence failed: ${JSON.stringify(persisted.errors)}`);
  const rawPreserved=fs.readFileSync(persisted.batchPath,'utf8')===raw;
  if(!rawPreserved)throw new Error('Persistent Inbox mutated the raw external batch');

  const rows=[];
  for(let index=0;index<candidates.length;index+=1){
    const candidate=candidates[index];
    const plan=adjudicationPlan[candidate.id];
    if(!plan)throw new Error(`No adjudication plan for Candidate ${candidate.id}`);
    const overlap=inspectCanonicalEvidenceOverlap(candidate,existingCanonicalEvidence);
    const reviewed=persistCandidateUnderReview({rootDir:inboxRoot,batchId:envelope.batchId,candidateId:candidate.id,at:at(index*2),by:'CHATGPT'});
    if(!reviewed.pass)throw new Error(`Review transition failed for ${candidate.id}: ${JSON.stringify(reviewed.errors)}`);
    const adjudicated=adjudicatePersistedCandidate({
      rootDir:inboxRoot,batchId:envelope.batchId,candidateId:candidate.id,
      decision:plan.decision,reason:plan.reason,canonicalEvidenceId:plan.canonicalEvidenceId??null,
      pendingId:plan.pendingId??null,pendingSeverity:plan.pendingSeverity??'NON_BLOCKING',pendingQuestion:plan.pendingQuestion??null,
      existingCanonicalEvidence,knownFields,nodeIds,adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',at:at(index*2+1)
    });
    if(!adjudicated.pass)throw new Error(`Adjudication failed for ${candidate.id}: ${JSON.stringify(adjudicated.errors)}`);
    rows.push({
      candidateId:candidate.id,subjectField:candidate.subjectField,decision:plan.decision,
      canonicalEvidenceId:adjudicated.canonicalEvidence?.id??null,
      existingCanonicalExactDuplicate:overlap.exactDuplicate,
      existingCanonicalSourceRegionOverlap:overlap.sourceRegionOverlap,
      overlappingEvidenceIds:overlap.sourceRegionOverlaps.map((row)=>row.evidenceId),reason:plan.reason
    });
  }

  const transportIssueRows=[];
  for(let index=0;index<issues.length;index+=1){
    const issue=issues[index];
    const severity=typeof issueSeverity==='function'?issueSeverity(issue,index,envelope):issueSeverity;
    const linked=registerPersistedTransportIssue({
      rootDir:inboxRoot,batchId:envelope.batchId,issueId:issue.id,
      pendingId:pendingIdFactory(envelope.batchId,index,issue),severity,at:at(candidates.length*2+index),by:'CHATGPT'
    });
    if(!linked.pass)throw new Error(`Transport issue lifecycle link failed for ${issue.id}: ${JSON.stringify(linked.errors)}`);
    transportIssueRows.push({issueId:issue.id,pendingId:linked.pending.id,status:linked.pending.status,severity:linked.pending.severity,subjectField:issue.subjectField,type:issue.type});
  }

  const state=loadEvidenceAdjudicationStore(inboxRoot);
  const summary=evidenceAdjudicationSummary(inboxRoot);
  const decisions={ACCEPT:rows.filter((row)=>row.decision==='ACCEPT').length,REJECT:rows.filter((row)=>row.decision==='REJECT').length,PENDING:rows.filter((row)=>row.decision==='PENDING').length};
  const overlapCandidateIds=rows.filter((row)=>row.existingCanonicalSourceRegionOverlap||row.existingCanonicalExactDuplicate).map((row)=>row.candidateId);
  const redundantRejectedIds=rows.filter((row)=>row.decision==='REJECT'&&row.existingCanonicalSourceRegionOverlap).map((row)=>row.candidateId);
  const uniqueAcceptedFromOverlapIds=rows.filter((row)=>row.decision==='ACCEPT'&&row.existingCanonicalSourceRegionOverlap).map((row)=>row.candidateId);
  const existingCanonicalUnmodified=JSON.stringify(existingCanonicalEvidence)===existingBefore;
  const allTransportIssuesLinked=transportIssueRows.length===issues.length&&transportIssueRows.every((row)=>row.status==='OPEN');
  const expectedPending=issues.length+planCounts.PENDING;
  const openPendingRows=state.pending.filter((row)=>['OPEN','INVESTIGATING'].includes(row.status));
  const blockingPending=openPendingRows.filter((row)=>row.severity==='BLOCKING').length;
  const nonBlockingPending=openPendingRows.filter((row)=>row.severity==='NON_BLOCKING').length;
  const pass=rawPreserved&&summary.candidateStates===candidates.length&&summary.adjudications===candidates.length&&summary.canonicalEvidence===planCounts.ACCEPT&&
    decisions.ACCEPT===planCounts.ACCEPT&&decisions.REJECT===planCounts.REJECT&&decisions.PENDING===planCounts.PENDING&&existingCanonicalUnmodified&&
    allTransportIssuesLinked&&summary.pending===expectedPending&&summary.openPending===expectedPending;
  const fullProductionGate=!pass?'FAIL':blockingPending>0?'BLOCKED_BY_PENDING':summary.openPending>0?'PASS_WITH_NON_BLOCKING_PENDING':'PASS';
  const gates={
    EXTERNAL_INPUT:envelope.producer?.mode===expectedProducerMode?'PASS':'FAIL',RAW_PRESERVATION:rawPreserved?'PASS':'FAIL',
    [`REVIEW_${candidates.length}_OF_${candidates.length}`]:summary.candidateStates===candidates.length?'PASS':'FAIL',
    [`ADJUDICATION_${candidates.length}_OF_${candidates.length}`]:summary.adjudications===candidates.length?'PASS':'FAIL',
    [`ACCEPT_${planCounts.ACCEPT}_REJECT_${planCounts.REJECT}`]:decisions.ACCEPT===planCounts.ACCEPT&&decisions.REJECT===planCounts.REJECT?'PASS':'FAIL',
    [`CANONICAL_PROMOTION_${planCounts.ACCEPT}`]:summary.canonicalEvidence===planCounts.ACCEPT?'PASS':'FAIL',
    EXISTING_CANONICAL_IMMUTABLE:existingCanonicalUnmodified?'PASS':'FAIL',
    [`TRANSPORT_ISSUES_LINKED_${issues.length}_OF_${issues.length}`]:allTransportIssuesLinked?'PASS':'FAIL',
    OPEN_BLOCKING_PENDING:blockingPending,OPEN_NON_BLOCKING_PENDING:nonBlockingPending,PRODUCTION_MASTER_AUTO_WRITE:'0',RUNTIME_AUTO_WRITE:'0'
  };
  const report={
    reportVersion,status:pass?`${reportLabel}_PASS`:'FAIL',fullProductionGate,batchId:envelope.batchId,producer:envelope.producer,productId:envelope.productId,
    rawSourcePath:path.relative(process.cwd(),absoluteRawPath),rawPreserved,transport:{candidateCount:candidates.length,issueCount:issues.length},
    adjudication:{...summary,decisions},
    existingCanonical:{count:existingCanonicalEvidence.length,unmodified:existingCanonicalUnmodified,sourceRegionOverlapCandidateIds:overlapCandidateIds,redundantRejectedIds,uniqueAcceptedFromOverlapIds},
    transportIssues:{linked:transportIssueRows.length,blocking:transportIssueRows.filter((row)=>row.severity==='BLOCKING').length,nonBlocking:transportIssueRows.filter((row)=>row.severity==='NON_BLOCKING').length,rows:transportIssueRows},
    productionMasterWritePerformed:false,runtimeWritePerformed:false,transportIssueLifecycle:'CONNECTED_TO_PERSISTENT_PENDING',candidateResults:rows,gates
  };
  fs.writeFileSync(path.join(absoluteArtifactDir,'report.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
  if(!pass)throw new Error(`Evidence round trip gate failed: ${JSON.stringify(report.gates)}`);
  return{pass,artifactDir:absoluteArtifactDir,inboxRoot,report,state};
}
