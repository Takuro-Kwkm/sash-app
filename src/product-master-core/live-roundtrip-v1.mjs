import fs from'node:fs';
import path from'node:path';
import{persistGeminiTransport}from'./evidence-inbox-store.mjs';
import{
  adjudicatePersistedCandidate,evidenceAdjudicationSummary,loadEvidenceAdjudicationStore,
  persistCandidateUnderReview
}from'./evidence-adjudication-store.mjs';
import{inspectCanonicalEvidenceOverlap}from'./evidence-overlap.mjs';
import{registerPersistedTransportIssue}from'./transport-issue-lifecycle.mjs';
import{APW430_GEMINI_INBOX_POC}from'./poc/apw430-gemini-inbox-poc.mjs';
import{APW430_OFFICIAL_EVIDENCE_POC}from'./poc/apw430-official-evidence-poc.mjs';

const PRODUCT_ID='SER-YKK-APW430';
const DEFAULT_RAW_PATH='docs/notebooklm/live/BATCH-GEMINI-APW430-FIX-20260901213858.json';
const knownFields=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.fields);
const nodeIds=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.productNodes.map((row)=>row.id));
const existingCanonicalEvidence=APW430_OFFICIAL_EVIDENCE_POC.evidence;

const PLAN={
  'CAND-GEMINI-APW430-FIX-001':{decision:'REJECT',reason:'Existing Core Canonical Evidence EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69 already states that FIX窓 is divided into 窓タイプ and テラスタイプ; retain this extraction only as audit evidence.'},
  'CAND-GEMINI-APW430-FIX-002':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-MADO-ZAIRAI-P69',reason:'Official p.69 / PDF p.71 explicitly places FIX窓 窓タイプ under 在来工法. Existing taxonomy Evidence is from the same source region but does not make this atomic claim explicit.'},
  'CAND-GEMINI-APW430-FIX-003':{decision:'REJECT',reason:'Existing Core Canonical Evidence EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69 already states that テラスタイプ has 在来工法 and 2×4工法; do not create redundant Canonical Evidence.'},
  'CAND-GEMINI-APW430-FIX-004':{decision:'REJECT',reason:'Existing Core Canonical Evidence EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70 already states that テラスタイプ is アングル付枠 only; do not create redundant Canonical Evidence.'},
  'CAND-GEMINI-APW430-FIX-005':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H18-P71',reason:'Official p.71 / PDF p.73 explicitly lists the seven H18 在来 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-006':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H20-P71',reason:'Official p.71 / PDF p.73 explicitly lists the seven H20 在来 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-007':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H22-P71',reason:'Official p.71 / PDF p.73 explicitly lists the seven H22 在来 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-008':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H24-P71',reason:'Official p.71 / PDF p.73 explicitly lists the seven H24 在来 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-009':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-204-H18-P71',reason:'Official p.71 / PDF p.73 explicitly lists the four H18 2×4 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-010':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-204-H20-P71',reason:'Official p.71 / PDF p.73 explicitly lists the four H20 2×4 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-011':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-204-H22-P71',reason:'Official p.71 / PDF p.73 explicitly lists the four H22 2×4 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-012':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-204-H24-P71',reason:'Official p.71 / PDF p.73 explicitly lists the four H24 2×4 standard-size codes.'}
};

const isoAt=(offsetSeconds)=>new Date(Date.parse('2026-09-02T06:10:00Z')+offsetSeconds*1000).toISOString();
const pendingIdForIssue=(batchId,index)=>`PEND-${batchId.replace(/^BATCH-/,'')}-ISSUE-${String(index+1).padStart(3,'0')}`;

export function runApw430LiveEvidenceRoundTrip({
  artifactDir=path.resolve('artifacts/product-master-live-v1'),
  rawPath=path.resolve(DEFAULT_RAW_PATH)
}={}){
  const absoluteArtifactDir=path.resolve(artifactDir);
  const inboxRoot=path.join(absoluteArtifactDir,'evidence-inbox');
  fs.mkdirSync(absoluteArtifactDir,{recursive:true});
  const raw=fs.readFileSync(rawPath,'utf8');
  const envelope=JSON.parse(raw);
  if(envelope.productId!==PRODUCT_ID)throw new Error(`Unexpected live batch productId: ${envelope.productId}`);
  if(envelope.producer?.mode!=='LIVE_EXTERNAL')throw new Error(`Live v1 pilot requires LIVE_EXTERNAL producer mode: ${envelope.producer?.mode}`);
  if(envelope.candidates?.length!==12)throw new Error(`Live v1 pilot expected 12 Candidates, got ${envelope.candidates?.length}`);
  if(envelope.issues?.length!==4)throw new Error(`Live v1 pilot expected 4 transport issues, got ${envelope.issues?.length}`);

  const existingBefore=JSON.stringify(existingCanonicalEvidence);
  const persisted=persistGeminiTransport(raw,{rootDir:inboxRoot,expectedProductId:PRODUCT_ID,knownFields,nodeIds});
  if(!persisted.pass)throw new Error(`Live batch persistence failed: ${JSON.stringify(persisted.errors)}`);
  const rawPreserved=fs.readFileSync(persisted.batchPath,'utf8')===raw;
  if(!rawPreserved)throw new Error('Persistent Inbox mutated the raw LIVE_EXTERNAL batch');

  const rows=[];
  for(let index=0;index<envelope.candidates.length;index+=1){
    const candidate=envelope.candidates[index];
    const plan=PLAN[candidate.id];
    if(!plan)throw new Error(`No live adjudication plan for Candidate ${candidate.id}`);
    const overlap=inspectCanonicalEvidenceOverlap(candidate,existingCanonicalEvidence);
    const reviewed=persistCandidateUnderReview({
      rootDir:inboxRoot,batchId:envelope.batchId,candidateId:candidate.id,
      at:isoAt(index*2),by:'CHATGPT'
    });
    if(!reviewed.pass)throw new Error(`Review transition failed for ${candidate.id}: ${JSON.stringify(reviewed.errors)}`);
    const adjudicated=adjudicatePersistedCandidate({
      rootDir:inboxRoot,batchId:envelope.batchId,candidateId:candidate.id,
      decision:plan.decision,reason:plan.reason,canonicalEvidenceId:plan.canonicalEvidenceId??null,
      existingCanonicalEvidence,knownFields,nodeIds,adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',
      at:isoAt(index*2+1)
    });
    if(!adjudicated.pass)throw new Error(`Adjudication failed for ${candidate.id}: ${JSON.stringify(adjudicated.errors)}`);
    rows.push({
      candidateId:candidate.id,
      subjectField:candidate.subjectField,
      decision:plan.decision,
      canonicalEvidenceId:adjudicated.canonicalEvidence?.id??null,
      existingCanonicalExactDuplicate:overlap.exactDuplicate,
      existingCanonicalSourceRegionOverlap:overlap.sourceRegionOverlap,
      overlappingEvidenceIds:overlap.sourceRegionOverlaps.map((row)=>row.evidenceId),
      reason:plan.reason
    });
  }

  const transportIssueRows=[];
  for(let index=0;index<envelope.issues.length;index+=1){
    const issue=envelope.issues[index];
    const linked=registerPersistedTransportIssue({
      rootDir:inboxRoot,batchId:envelope.batchId,issueId:issue.id,
      pendingId:pendingIdForIssue(envelope.batchId,index),severity:'NON_BLOCKING',
      at:isoAt(30+index),by:'CHATGPT'
    });
    if(!linked.pass)throw new Error(`Transport issue lifecycle link failed for ${issue.id}: ${JSON.stringify(linked.errors)}`);
    transportIssueRows.push({issueId:issue.id,pendingId:linked.pending.id,status:linked.pending.status,severity:linked.pending.severity,subjectField:issue.subjectField,type:issue.type});
  }

  const state=loadEvidenceAdjudicationStore(inboxRoot);
  const summary=evidenceAdjudicationSummary(inboxRoot);
  const decisions={
    ACCEPT:rows.filter((row)=>row.decision==='ACCEPT').length,
    REJECT:rows.filter((row)=>row.decision==='REJECT').length,
    PENDING:rows.filter((row)=>row.decision==='PENDING').length
  };
  const overlapCandidateIds=rows.filter((row)=>row.existingCanonicalSourceRegionOverlap||row.existingCanonicalExactDuplicate).map((row)=>row.candidateId);
  const redundantRejectedIds=rows.filter((row)=>row.decision==='REJECT'&&row.existingCanonicalSourceRegionOverlap).map((row)=>row.candidateId);
  const uniqueAcceptedFromOverlapIds=rows.filter((row)=>row.decision==='ACCEPT'&&row.existingCanonicalSourceRegionOverlap).map((row)=>row.candidateId);
  const existingCanonicalUnmodified=JSON.stringify(existingCanonicalEvidence)===existingBefore;
  const allTransportIssuesLinked=transportIssueRows.length===envelope.issues.length&&transportIssueRows.every((row)=>row.status==='OPEN'&&row.severity==='NON_BLOCKING');
  const pass=rawPreserved&&summary.adjudications===12&&summary.canonicalEvidence===9&&decisions.ACCEPT===9&&decisions.REJECT===3&&decisions.PENDING===0&&overlapCandidateIds.length===4&&redundantRejectedIds.length===3&&uniqueAcceptedFromOverlapIds.length===1&&existingCanonicalUnmodified&&allTransportIssuesLinked&&summary.pending===4&&summary.openPending===4;
  const report={
    reportVersion:'1.0-R1',
    status:pass?'LIVE_ROUNDTRIP_PASS':'FAIL',
    fullProductionGate:pass?'PASS_WITH_NON_BLOCKING_PENDING':'FAIL',
    batchId:envelope.batchId,
    producer:envelope.producer,
    productId:envelope.productId,
    rawSourcePath:path.relative(process.cwd(),rawPath),
    rawPreserved,
    transport:{candidateCount:envelope.candidates.length,issueCount:envelope.issues.length},
    adjudication:{...summary,decisions},
    existingCanonical:{count:existingCanonicalEvidence.length,unmodified:existingCanonicalUnmodified,sourceRegionOverlapCandidateIds:overlapCandidateIds,redundantRejectedIds,uniqueAcceptedFromOverlapIds},
    transportIssues:{linked:transportIssueRows.length,blocking:transportIssueRows.filter((row)=>row.severity==='BLOCKING').length,nonBlocking:transportIssueRows.filter((row)=>row.severity==='NON_BLOCKING').length,rows:transportIssueRows},
    productionMasterWritePerformed:false,
    runtimeWritePerformed:false,
    transportIssueLifecycle:'CONNECTED_TO_PERSISTENT_PENDING',
    candidateResults:rows,
    gates:{
      LIVE_EXTERNAL_INPUT:envelope.producer?.mode==='LIVE_EXTERNAL'?'PASS':'FAIL',
      RAW_PRESERVATION:rawPreserved?'PASS':'FAIL',
      REVIEW_12_OF_12:summary.candidateStates===12?'PASS':'FAIL',
      ADJUDICATION_12_OF_12:summary.adjudications===12?'PASS':'FAIL',
      ACCEPT_9_REJECT_3:decisions.ACCEPT===9&&decisions.REJECT===3?'PASS':'FAIL',
      CANONICAL_PROMOTION_9:summary.canonicalEvidence===9?'PASS':'FAIL',
      EXISTING_CANONICAL_OVERLAP_PREFLIGHT:overlapCandidateIds.length===4?'PASS':'FAIL',
      REDUNDANT_CANONICAL_SUPPRESSION:redundantRejectedIds.length===3?'PASS':'FAIL',
      EXISTING_CANONICAL_IMMUTABLE:existingCanonicalUnmodified?'PASS':'FAIL',
      TRANSPORT_ISSUES_LINKED_4_OF_4:allTransportIssuesLinked?'PASS':'FAIL',
      OPEN_BLOCKING_PENDING:transportIssueRows.filter((row)=>row.severity==='BLOCKING').length,
      OPEN_NON_BLOCKING_PENDING:transportIssueRows.filter((row)=>row.severity==='NON_BLOCKING').length,
      PRODUCTION_MASTER_AUTO_WRITE:'0',
      RUNTIME_AUTO_WRITE:'0'
    }
  };
  fs.writeFileSync(path.join(absoluteArtifactDir,'report.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
  if(!pass)throw new Error(`Live v1 round trip gate failed: ${JSON.stringify(report.gates)}`);
  return{pass,artifactDir:absoluteArtifactDir,inboxRoot,report,state};
}
