import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSizeCapabilityAuditGate,computeProposalFingerprint,validateRuleAuditDocument,validateChangeProposalDocument} from '../src/product-master-core/size-capability-audit-core.mjs';

const read=(name)=>JSON.parse(fs.readFileSync(new URL(`../artifacts/size-capability-audit/${name}`,import.meta.url),'utf8'));
const readJson=(relative)=>JSON.parse(fs.readFileSync(new URL(`../${relative}`,import.meta.url),'utf8'));
const proposal=(id)=>readJson(`data/master-change-control/proposals/${id}.manifest.json`);

const THERMOSL='PMCP-LIX-SAMOSL-INNER-TILT-RANGE-20260903-001';
const S2H_CUSTOM='PMCP-LIX-SAMOS2H-CUSTOM-DIMENSION-RULESET-20260903-001';
const APW430_CUSTOM='PMCP-YKK-APW430-CUSTOM-DIMENSION-RULESET-20260903-001';
const S2H_STANDARD='PMCP-LIX-SAMOS2H-STANDARD-SOURCE-CORRECTION-20260904-001';

test('generic Size Capability Audit accepts managed PENDING without hiding it',()=>{
  const gate=buildSizeCapabilityAuditGate({summary:{commonSalesInputContract:'FORMAL_PASS',formalMasterWritePerformed:false,productMasterChangeProposals:[]},standardAudit:{records:[{product_id:'SER-TEST',product_node:'NODE',coverage_status:'PENDING'}],formalMasterWritePerformed:false},customAudit:{formalMasterWritePerformed:false},pending:{blockingCount:1,items:[{id:'P1',blocking:true}]},ruleAudits:[{expectedRuleCount:1,auditedRuleCount:1,records:[{rule_id:'R1',audit_status:'MATCH'}],formalMasterWritePerformed:false}],proposals:[]});
  assert.equal(gate.integrityGate,'PASS');assert.equal(gate.status,'PARTIAL_PASS');assert.equal(gate.blockingPending,1);assert.equal(gate.proposalCount,0);
});

test('current Thermos L and APW431 rule audits remain complete and safe',()=>{
  const thermos=read('dimension-rule-audit-thermosl.json'),apw431=read('dimension-rule-audit-apw431.json');
  assert.deepEqual(validateRuleAuditDocument(thermos),[]);assert.deepEqual(validateRuleAuditDocument(apw431),[]);
  assert.equal(thermos.expectedRuleCount,50);assert.equal(thermos.summary.MATCH,38);assert.equal(thermos.summary.SOURCE_GRAPH_REVIEW_REQUIRED,12);assert.equal(thermos.summary.RULE_MISMATCH,0);
  assert.equal(apw431.expectedRuleCount,29);assert.equal(apw431.summary.MATCH,21);assert.equal(apw431.summary.SOURCE_GRAPH_REVIEW_REQUIRED,8);assert.equal(apw431.summary.RULE_MISMATCH??0,0);
});

test('generic audit core contains no current product token',()=>{
  const source=fs.readFileSync(new URL('../src/product-master-core/size-capability-audit-core.mjs',import.meta.url),'utf8');
  for(const token of ['SER-LIX-SAMOS2H','SER-LIX-SAMOSL','SER-YKK-APW430','SER-YKK-APW431','サーモス','APW 430','APW 431'])assert.equal(source.includes(token),false);
});

test('all historical proposal manifests remain immutable after external applications',()=>{
  const expected={
    [THERMOSL]:'sha256:bf89762cd1cf88be8620b93599d2987c23d50fcb335e6c2b525f5a14175184ee',
    [S2H_CUSTOM]:'sha256:bd5900002f8d54d322fb7c50bb0b4b121f54a81ece7ec0e60baaffe6914df08e',
    [APW430_CUSTOM]:'sha256:894ca2e99cfd482b0093bfbc1d1763383a8e01c5c8614d75ac1560938ae5eb78',
    [S2H_STANDARD]:'sha256:b141224a4dc0981eee4d8c82574cc8b52e5b75e8ba70b1809053e9c9c27793d8'
  };
  for(const [id,fingerprint] of Object.entries(expected)){
    const row=proposal(id);assert.deepEqual(validateChangeProposalDocument(row),[]);assert.equal(row.proposalFingerprint,fingerprint);assert.equal(row.status,'PROPOSED');assert.equal(row.approvalPolicy,'HUMAN_REQUIRED');assert.equal(row.approvalStatus,'PENDING');assert.equal(row.formalWorkbookWritePerformed,false);assert.equal(row.runtimeWritePerformed,false);assert.equal(row.autoApprovalPerformed,false);
    if(row.payloadIntegrityFingerprint)assert.equal(row.payloadIntegrityFingerprint,computeProposalFingerprint(row));
  }
});

test('S2H STANDARD official enumeration and evidence remain the immutable pre-apply basis',()=>{
  const enumeration=read('standard-source-enumeration-samos2h.json'),evidence=read('evidence-samos2h-standard.json');
  assert.equal(enumeration.activeProductNodeCount,17);assert.equal(enumeration.summary.officialRecordCount,2309);assert.equal(enumeration.summary.MATCH,1985);assert.equal(enumeration.summary.VALUE_MISMATCH,312);assert.equal(enumeration.summary.MISSING_IN_MASTER,12);assert.equal(enumeration.summary.SOURCE_INSUFFICIENT,0);
  assert.equal(enumeration.enumerationMethod.wHCartesianGenerationPerformed,false);assert.equal(enumeration.enumerationMethod.callCodeDimensionInferencePerformed,false);
  assert.equal(evidence.evidenceRecords.length,3);assert.equal(evidence.evidenceRecords[0].affectedCount,310);assert.equal(evidence.evidenceRecords[0].affectedSizeIdsSha256,'sha256:a08ae7d11409cc1f123a42e5a2287dd943c4d6f1595fd072722372efeb03e4db');assert.equal(evidence.evidenceRecords[1].records.length,2);assert.equal(evidence.evidenceRecords[2].projectedSizeIds.length,12);
});

test('S2H STANDARD HUMAN approval, STAGING, preview, production and Runtime v1.1 are bound to the exact proposal',()=>{
  const p=proposal(S2H_STANDARD),approval=readJson(`data/master-change-control/approvals/${S2H_STANDARD}.approval.json`),staging=readJson(`data/master-change-control/applied/${S2H_STANDARD}.staging.json`),preview=readJson(`data/master-change-control/production-previews/${S2H_STANDARD}.production-preview.json`),prodApproval=readJson(`data/master-change-control/production-approvals/${S2H_STANDARD}.production-approval.json`),production=readJson(`data/master-change-control/production/${S2H_STANDARD}.applied.json`),runtime=readJson('data/master-change-control/runtime/SAMOS2H_STANDARD_RUNTIME_REGENERATION_V11.json');
  for(const row of [approval,staging,preview,prodApproval,production,runtime])assert.equal(row.proposalId,S2H_STANDARD);
  assert.equal(approval.approverType,'HUMAN');assert.equal(approval.proposalFingerprint,p.proposalFingerprint);assert.equal(staging.proposalStatus,'APPLIED');assert.equal(staging.after.standardSizeRows,2309);assert.equal(staging.after.selectableRows,2140);assert.equal(staging.after.inactiveRows,169);assert.equal(staging.unexpectedChangedNonTargetSheets,0);
  assert.equal(preview.status,'PRODUCTION_WRITE_PREVIEW_READY');assert.equal(prodApproval.productionApproval,true);assert.equal(production.status,'PRODUCTION_APPLY_COMPLETE');assert.equal(production.formalTarget.postWriteSha256,'9d4a0812cadc6d804a8e8db77ad0e4b042d674e62b9ef9edfcd2afcab9c9e5a6');assert.equal(production.postWriteReadback.standardSizeRows,2309);assert.equal(production.postWriteReadback.selectableRows,2140);assert.equal(production.postWriteReadback.inactiveRows,169);assert.equal(production.postWriteReadback.unexpectedChangedNonTargetSheets,0);
  assert.equal(runtime.status,'RUNTIME_REGENERATION_COMMITTED');assert.equal(runtime.runtimeVersion,'v1.1');assert.equal(runtime.sourceOfTruth,'FORMAL_PRODUCT_MASTER');assert.equal(runtime.runtimeProjection.standardSizeRows,2309);assert.equal(runtime.runtimeProjection.selectableRows,2140);assert.equal(runtime.runtimeProjection.inactiveRows,169);assert.equal(runtime.runtimeProjection.directManufacturerValueEditToGenericCore,false);
});

test('S2H STANDARD applied audit proves current formal and Runtime equality',()=>{
  const applied=read('standard-size-audit-samos2h-applied.json');
  assert.equal(applied.status,'FORMAL_MASTER_APPLIED_RUNTIME_REGENERATED');assert.equal(applied.activeProductNodes,17);assert.equal(applied.formalMaster.sha256,'9d4a0812cadc6d804a8e8db77ad0e4b042d674e62b9ef9edfcd2afcab9c9e5a6');assert.equal(applied.formalMaster.standardSizeRows,2309);assert.equal(applied.formalMaster.selectableRows,2140);assert.equal(applied.formalMaster.inactiveRows,169);assert.equal(applied.canonicalRuntime.canonicalSelectableRows,2140);assert.equal(applied.canonicalRuntime.runtimeSelectableRows,2140);assert.equal(applied.canonicalRuntime.match,true);assert.equal(applied.postApplyOfficialComparison.remainingValueMismatch,0);assert.equal(applied.postApplyOfficialComparison.remainingMissingInMaster,0);
});

test('current audit gate has six unrelated blockers and no active Product Master proposal',()=>{
  const summary=read('summary.json'),pending=read('pending.json'),gateFile=read('gate-report.json');
  assert.equal(summary.blockingPendingCount,6);assert.deepEqual(summary.productMasterChangeProposals,[]);assert.ok(summary.appliedProductMasterChangeProposals.includes(S2H_STANDARD));assert.equal(summary.samos2hStandardEnumeration.status,'FORMAL_MASTER_APPLIED_RUNTIME_REGENERATED');assert.equal(summary.samos2hStandardEnumeration.applied.selectable,2140);
  assert.equal(pending.blockingCount,6);assert.ok(pending.resolved.some((row)=>row.id==='PEND-SIZE-S2H-STANDARD-001'));assert.equal(pending.items.some((row)=>row.id==='PEND-SIZE-S2H-STANDARD-001'),false);
  const computed=buildSizeCapabilityAuditGate({summary,standardAudit:read('standard-size-audit.json'),customAudit:read('custom-capability-audit.json'),pending,ruleAudits:[read('dimension-rule-audit-thermosl.json'),read('dimension-rule-audit-apw431.json')],proposals:[]});
  for(const gate of [computed,gateFile]){assert.equal(gate.integrityGate,'PASS');assert.equal(gate.status,'PARTIAL_PASS');assert.equal(gate.blockingPending,6);assert.equal(gate.proposalCount,0);assert.equal(gate.proposalApprovalGate,'NO_PROPOSAL_PENDING');}
});

test('previous applied CUSTOM and Thermos L change controls remain valid',()=>{
  const checks=[[S2H_CUSTOM,'data/master-change-control/runtime/SAMOS2H_CUSTOM_RUNTIME_REGENERATION_V10.json',17],[APW430_CUSTOM,'data/master-change-control/runtime/APW430_CUSTOM_RUNTIME_REGENERATION_V10.json',25],[THERMOSL,'data/master-change-control/runtime/THERMOSL_CR_SL_036_RUNTIME_REGENERATION_V19.json',null]];
  for(const [id,runtimePath,count] of checks){const approval=readJson(`data/master-change-control/approvals/${id}.approval.json`),production=readJson(`data/master-change-control/production/${id}.applied.json`),runtime=readJson(runtimePath);assert.equal(approval.approverType,'HUMAN');assert.equal(production.status,'PRODUCTION_APPLY_COMPLETE');assert.equal(runtime.status,'RUNTIME_REGENERATION_COMMITTED');if(count!==null)assert.equal(runtime.runtimeProjection.dimensionRuleCount,count);assert.equal(runtime.runtimeProjection.directManufacturerValueEditToGenericCore,false);}
});
