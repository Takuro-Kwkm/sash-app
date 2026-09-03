import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {computeProposalFingerprint,validateChangeProposalDocument} from '../src/product-master-core/size-capability-audit-core.mjs';

const read=(relative)=>JSON.parse(fs.readFileSync(new URL(`../${relative}`,import.meta.url),'utf8'));
const proposalId='PMCP-YKK-APW430-CUSTOM-DIMENSION-RULESET-20260903-001';
const fingerprint='sha256:894ca2e99cfd482b0093bfbc1d1763383a8e01c5c8614d75ac1560938ae5eb78';

test('APW430 CUSTOM classifies all 25 active Product Nodes from current source without interpolation',()=>{
  const extraction=read('artifacts/size-capability-audit/dimension-rule-extraction-apw430.json');
  assert.equal(extraction.productId,'SER-YKK-APW430');
  assert.equal(extraction.activeProductNodeCount,25);
  assert.equal(extraction.records.length,25);
  assert.deepEqual(extraction.summary,{EXACT_RULE_EXTRACTED:20,SOURCE_GRAPH_REVIEW_REQUIRED:5,SOURCE_INSUFFICIENT:0,PENDING:0,TOTAL:25});
  assert.equal(extraction.source.currentContinuity,'CONFIRMED_CURRENT');
  assert.equal(extraction.formalMasterWritePerformed,false);
  assert.equal(extraction.runtimeDirectWritePerformed,false);
  assert.equal(extraction.interpolatedPointsAdded,false);
  assert.ok(extraction.records.every((row)=>row.exact_rule_status!=='PENDING'));
  assert.ok(extraction.records.every((row)=>row.rule_payload.automatic===false));
});

test('APW430 CUSTOM evidence covers 25 nodes and remains non-interpolating',()=>{
  const evidence=read('artifacts/size-capability-audit/evidence-apw430-custom.json');
  assert.equal(evidence.productId,'SER-YKK-APW430');
  assert.equal(evidence.currentCatalog.currentContinuity,'CONFIRMED_CURRENT');
  assert.equal(evidence.records.length,25);
  assert.ok(evidence.records.every((row)=>row.currentYearContinuity==='CONFIRMED_CURRENT'));
  assert.ok(evidence.records.every((row)=>row.noInterpolation===true));
});

test('APW430 Product Master proposal is immutable, human-gated and fingerprint-valid',()=>{
  const proposal=read(`data/master-change-control/proposals/${proposalId}.manifest.json`);
  assert.deepEqual(validateChangeProposalDocument(proposal),[]);
  assert.equal(proposal.proposalId,proposalId);
  assert.equal(proposal.proposalFingerprint,fingerprint);
  assert.equal(computeProposalFingerprint(proposal),fingerprint);
  assert.equal(proposal.baseMaster.driveFileId,'1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo');
  assert.equal(proposal.baseMaster.sha256,'b149cc61ea2a2ddf119286ce39b4c03737ad789e7cbab2cec9e414f1dcffccd9');
  assert.equal(proposal.targetEntity,'06C_特注寸法範囲');
  assert.equal(proposal.operation,'ADD_DIMENSION_RULESET');
  assert.equal(proposal.after.activeProductNodeCount,25);
  assert.deepEqual(proposal.after.nodeClassificationSummary,{EXACT_RULE_EXTRACTED:20,SOURCE_GRAPH_REVIEW_REQUIRED:5,SOURCE_INSUFFICIENT:0,PENDING:0});
  assert.equal(proposal.after.interpolatedPointsAdded,false);
  assert.equal(proposal.status,'PROPOSED');
  assert.equal(proposal.approvalPolicy,'HUMAN_REQUIRED');
  assert.equal(proposal.approvalStatus,'PENDING');
  assert.equal(proposal.formalWorkbookWritePerformed,false);
  assert.equal(proposal.runtimeWritePerformed,false);
  assert.equal(proposal.autoApprovalPerformed,false);
});

test('APW430 extraction resolves extraction PENDING while proposal remains the only human gate',()=>{
  const pending=read('artifacts/size-capability-audit/pending.json');
  const summary=read('artifacts/size-capability-audit/summary.json');
  const gate=read('artifacts/size-capability-audit/gate-report.json');
  assert.equal(pending.blockingCount,7);
  assert.ok(pending.resolved.some((row)=>row.id==='PEND-SIZE-APW430-CUSTOM-001'));
  assert.equal(pending.items.some((row)=>row.id==='PEND-SIZE-APW430-CUSTOM-001'),false);
  assert.deepEqual(summary.productMasterChangeProposals,[proposalId]);
  assert.equal(summary.apw430CustomExtraction.activeProductNodes,25);
  assert.equal(summary.apw430CustomExtraction.exactRuleExtracted,20);
  assert.equal(summary.apw430CustomExtraction.sourceGraphReviewRequired,5);
  assert.equal(summary.apw430CustomExtraction.pending,0);
  assert.equal(summary.apw430CustomExtraction.formalMasterWrite,false);
  assert.equal(summary.apw430CustomExtraction.runtimeDirectWrite,false);
  assert.equal(gate.status,'PARTIAL_PASS');
  assert.equal(gate.integrityGate,'PASS');
  assert.equal(gate.blockingPending,7);
  assert.equal(gate.proposalCount,1);
  assert.equal(gate.proposalApprovalGate,'HUMAN_APPROVAL_PENDING');
});
