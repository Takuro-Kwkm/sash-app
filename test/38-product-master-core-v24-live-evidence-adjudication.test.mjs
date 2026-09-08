import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import test from'node:test';
import{
  APW430_LIVE_ADJUDICATION_V24_PROPOSAL_ID,
  runApw430LiveEvidenceAdjudicationV24
}from'../src/product-master-core/live-evidence-adjudication-v24.mjs';

const FIXTURE=path.resolve('docs/notebooklm/live/BATCH-GEMINI-APW430-LIVE-20260904-E2E.json');
const COVERAGE=path.resolve('data/master-change-control/audits/APW430_LIVE_EVIDENCE_FORMAL_COVERAGE_20260904.json');
const run=()=>runApw430LiveEvidenceAdjudicationV24({
  sourceBatchPath:FIXTURE,coverageAuditPath:COVERAGE,
  artifactDir:fs.mkdtempSync(path.join(os.tmpdir(),'apw430-v24-')),
  at:'2026-09-04T11:30:00Z'
});

test('v24 adjudicates all five audited LIVE APW430 candidates as accepted Canonical Evidence',()=>{
  const result=run();
  assert.equal(result.pass,true);
  assert.equal(result.report.acceptedCanonicalEvidence,5);
  assert.equal(result.report.rejectedEvidence,0);
  assert.equal(result.report.pendingEvidence,0);
  assert.equal(result.state.adjudications.length,5);
  assert.equal(result.state.canonicalEvidence.length,5);
  assert.deepEqual(new Set(result.state.adjudications.map((row)=>row.decision)),new Set(['ACCEPT']));
  assert.deepEqual(new Set(result.state.adjudications.map((row)=>row.adjudicatorType)),new Set(['CHATGPT']));
  assert.ok(result.state.canonicalEvidence.every((row)=>row.status==='VERIFIED'));
  assert.ok(result.state.canonicalEvidence.every((row)=>row.adjudication?.status==='ACCEPTED'));
});

test('v24 binds the exact audited LIVE batch and official APW430 Drive source',()=>{
  const result=run();
  assert.equal(result.report.sourceBatchId,'BATCH-202607-APW430-P69-71');
  assert.equal(result.report.producerMode,'LIVE_EXTERNAL');
  assert.equal(result.report.sourceContext.type,'OFFICIAL_PDF');
  assert.equal(result.report.sourceContext.driveFileId,'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9');
  assert.equal(result.report.formalCoverageAssessment.formalMaster.driveFileId,'1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo');
});

test('v24 formal coverage is explicit: four already represented and one schema-gap non-mutating',()=>{
  const result=run();
  assert.equal(result.report.formalCoverageAssessment.formalAlreadyRepresented,4);
  assert.equal(result.report.formalCoverageAssessment.formalSchemaGapNonMutating,1);
  assert.equal(result.report.formalCoverageAssessment.formalMutationRequired,0);
  const gap=result.report.formalCoverageAssessment.candidateCoverage.find((row)=>row.candidateId==='EC-APW430-FIX-004');
  assert.equal(gap.formalDisposition,'FORMAL_SCHEMA_GAP_NON_MUTATING');
  assert.equal(result.report.writes.formalProductMasterWritePerformed,false);
  assert.equal(result.report.writes.runtimeWritePerformed,false);
  assert.equal(result.report.writes.productionWritePerformed,false);
  assert.equal(result.report.writes.googleSheetMutationCount,0);
});

test('v24 creates an Evidence-only controlled proposal but keeps human approval mandatory',()=>{
  const result=run();
  assert.equal(result.proposal.id,APW430_LIVE_ADJUDICATION_V24_PROPOSAL_ID);
  assert.equal(result.proposal.status,'PROPOSED');
  assert.equal(result.proposal.approvalPolicy,'HUMAN_REQUIRED');
  assert.equal(result.proposal.changes.length,5);
  assert.ok(result.proposal.changes.every((row)=>row.operation==='ADD_RECORD'&&row.collection==='evidence'));
  assert.equal(result.report.proposal.changeScope,'CONTROL_PLANE_EVIDENCE_ONLY');
  assert.equal(result.report.negativeControls.chatgptSelfApprovalBlocked,true);
  assert.equal(result.report.negativeControls.unapprovedApplyBlocked,true);
});

test('v24 closes Evidence review items and exposes only the proposal as HUMAN_REQUIRED actionable work',()=>{
  const result=run();
  const candidates=result.queue.items.filter((row)=>row.kind==='EVIDENCE_CANDIDATE');
  const proposals=result.queue.items.filter((row)=>row.kind==='MASTER_CHANGE_PROPOSAL');
  assert.equal(candidates.length,5);
  assert.ok(candidates.every((row)=>row.reviewStatus==='APPROVED'&&!row.actionable&&row.nextAction==='NONE'));
  assert.equal(proposals.length,1);
  assert.equal(proposals[0].reviewStatus,'HUMAN_REQUIRED');
  assert.equal(proposals[0].authority,'HUMAN');
  assert.equal(proposals[0].actionable,true);
  assert.equal(result.queue.authorityBoundary.evidenceAdjudication,'CHATGPT_OR_HUMAN');
  assert.equal(result.queue.authorityBoundary.masterChangeApproval,'HUMAN_REQUIRED');
  assert.equal(result.queue.authorityBoundary.queueMutationAuthority,'NONE');
  assert.equal(result.queue.authorityBoundary.productionMasterAutoWrite,false);
  assert.equal(result.queue.authorityBoundary.runtimeAutoWrite,false);
});
