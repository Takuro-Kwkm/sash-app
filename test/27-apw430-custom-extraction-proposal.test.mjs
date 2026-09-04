import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {computeProposalFingerprint,validateChangeProposalDocument} from '../src/product-master-core/size-capability-audit-core.mjs';

const read=(relative)=>JSON.parse(fs.readFileSync(new URL(`../${relative}`,import.meta.url),'utf8'));
const proposalId='PMCP-YKK-APW430-CUSTOM-DIMENSION-RULESET-20260903-001';
const fingerprint='sha256:894ca2e99cfd482b0093bfbc1d1763383a8e01c5c8614d75ac1560938ae5eb78';
const s2hStandardProposalId='PMCP-LIX-SAMOS2H-STANDARD-SOURCE-CORRECTION-20260904-001';

test('APW430 CUSTOM historical extraction classifies all 25 active Product Nodes without interpolation',()=>{
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

test('APW430 Product Master proposal remains immutable after external HUMAN application',()=>{
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

test('APW430 external HUMAN approval, STAGING, Production and Runtime are bound to exact proposal',()=>{
  const approval=read(`data/master-change-control/approvals/${proposalId}.approval.json`);
  const staging=read(`data/master-change-control/applied/${proposalId}.staging.json`);
  const prodApproval=read(`data/master-change-control/production-approvals/${proposalId}.production-approval.json`);
  const preview=read(`data/master-change-control/production-previews/${proposalId}.production-preview.json`);
  const production=read(`data/master-change-control/production/${proposalId}.applied.json`);
  const runtime=read('data/master-change-control/runtime/APW430_CUSTOM_RUNTIME_REGENERATION_V10.json');
  for(const row of [approval,staging,prodApproval,preview,production,runtime])assert.equal(row.proposalId,proposalId);
  assert.equal(approval.approverType,'HUMAN');
  assert.equal(approval.proposalFingerprint,fingerprint);
  assert.equal(staging.proposalStatus,'APPLIED');
  assert.equal(staging.after.formalRows,25);
  assert.equal(staging.after.automaticTrue,0);
  assert.equal(prodApproval.productionApproval,true);
  assert.equal(production.status,'PRODUCTION_APPLY_COMPLETE');
  assert.equal(production.formalTarget.postWriteDriveRevisionId,'13');
  assert.equal(production.postWriteReadback.dimensionRuleCount,25);
  assert.equal(production.postWriteReadback.exactRuleExtracted,20);
  assert.equal(production.postWriteReadback.sourceGraphReviewRequired,5);
  assert.equal(production.postWriteReadback.unexpectedChangedExistingSheets,0);
  assert.equal(production.postWriteReadback.semanticFingerprint,'sha256:1940a1ce7b768ccd2cc0fa1f44ebc1e3ba65e26c40089d618b0b837607ae6966');
  assert.equal(runtime.status,'RUNTIME_REGENERATION_COMMITTED');
  assert.equal(runtime.runtimeVersion,'v1.0');
  assert.equal(runtime.sourceOfTruth,'FORMAL_PRODUCT_MASTER');
  assert.equal(runtime.runtimeProjection.dimensionRuleCount,25);
  assert.equal(runtime.runtimeProjection.dimensionAuto,0);
  assert.equal(runtime.runtimeProjection.dimensionReview,25);
  assert.equal(runtime.runtimeProjection.directManufacturerValueEditToGenericCore,false);
});

test('APW430 remains resolved after S2H STANDARD proposal is formally applied',()=>{
  const pending=read('artifacts/size-capability-audit/pending.json');
  const summary=read('artifacts/size-capability-audit/summary.json');
  const gate=read('artifacts/size-capability-audit/gate-report.json');
  assert.equal(pending.blockingCount,6);
  assert.ok(pending.resolved.some((row)=>row.id==='PEND-SIZE-APW430-CUSTOM-001'));
  assert.ok(pending.resolved.some((row)=>row.id==='PEND-SIZE-S2H-STANDARD-001'));
  assert.deepEqual(summary.productMasterChangeProposals,[]);
  assert.ok(summary.appliedProductMasterChangeProposals.includes(proposalId));
  assert.ok(summary.appliedProductMasterChangeProposals.includes(s2hStandardProposalId));
  assert.equal(summary.apw430CustomExtraction.status,'FORMAL_MASTER_APPLIED_RUNTIME_REGENERATED');
  assert.equal(summary.apw430CustomExtraction.runtimeDimensionRules,25);
  assert.equal(summary.samos2hStandardEnumeration.status,'FORMAL_MASTER_APPLIED_RUNTIME_REGENERATED');
  assert.equal(summary.samos2hStandardEnumeration.applied.selectable,2140);
  assert.equal(gate.status,'PARTIAL_PASS');
  assert.equal(gate.integrityGate,'PASS');
  assert.equal(gate.blockingPending,6);
  assert.equal(gate.proposalCount,0);
  assert.equal(gate.proposalApprovalGate,'NO_PROPOSAL_PENDING');
});
