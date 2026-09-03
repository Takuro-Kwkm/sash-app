import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildSizeCapabilityAuditGate,
  computeProposalFingerprint,
  validateRuleAuditDocument,
  validateChangeProposalDocument
} from '../src/product-master-core/size-capability-audit-core.mjs';

const read=(name)=>JSON.parse(fs.readFileSync(new URL(`../artifacts/size-capability-audit/${name}`,import.meta.url),'utf8'));
const readJson=(relative)=>JSON.parse(fs.readFileSync(new URL(`../${relative}`,import.meta.url),'utf8'));
const thermosLProposalPath='data/master-change-control/proposals/PMCP-LIX-SAMOSL-INNER-TILT-RANGE-20260903-001.manifest.json';
const s2hProposalPath='data/master-change-control/proposals/PMCP-LIX-SAMOS2H-CUSTOM-DIMENSION-RULESET-20260903-001.manifest.json';
const readThermosLProposal=()=>readJson(thermosLProposalPath);
const readS2HProposal=()=>readJson(s2hProposalPath);

test('generic Size Capability Audit accepts managed PENDING without hiding it',()=>{
  const gate=buildSizeCapabilityAuditGate({
    summary:{commonSalesInputContract:'FORMAL_PASS',formalMasterWritePerformed:false,productMasterChangeProposals:[]},
    standardAudit:{records:[{product_id:'SER-TEST-FUTURE',product_node:'NODE-1',coverage_status:'PENDING'}],formalMasterWritePerformed:false},
    customAudit:{formalMasterWritePerformed:false},
    pending:{blockingCount:1,items:[{id:'P-1',blocking:true}]},
    ruleAudits:[{expectedRuleCount:1,auditedRuleCount:1,records:[{rule_id:'R-1',audit_status:'MATCH'}],formalMasterWritePerformed:false}],
    proposals:[]
  });
  assert.equal(gate.integrityGate,'PASS');
  assert.equal(gate.status,'PARTIAL_PASS');
  assert.equal(gate.blockingPending,1);
  assert.equal(gate.proposalCount,0);
});

test('current Thermos L and APW431 rule audits are complete and non-mutating',()=>{
  const thermos=read('dimension-rule-audit-thermosl.json');
  const apw431=read('dimension-rule-audit-apw431.json');
  assert.deepEqual(validateRuleAuditDocument(thermos),[]);
  assert.deepEqual(validateRuleAuditDocument(apw431),[]);
  assert.equal(thermos.expectedRuleCount,50);
  assert.equal(apw431.expectedRuleCount,29);
  assert.equal(thermos.summary.MATCH,38);
  assert.equal(thermos.summary.SOURCE_GRAPH_REVIEW_REQUIRED,12);
  assert.equal(thermos.summary.RULE_MISMATCH,0);
  assert.equal(apw431.summary.MATCH,21);
  assert.equal(apw431.summary.SOURCE_GRAPH_REVIEW_REQUIRED,8);
  assert.equal(apw431.summary.RULE_MISMATCH??0,0);
});

test('CR-SL-036 applied audit uses only source-confirmed boundary points and keeps safety review',()=>{
  const thermos=read('dimension-rule-audit-thermosl.json');
  const row=thermos.records.find((item)=>item.rule_id==='CR-SL-036');
  assert.equal(row.audit_status,'MATCH');
  assert.deepEqual(row.selector_state,{window_type:'WT-SL-UCHIDAOSHI',specific_spec:'*',construction:'在来/204',leaf_configuration:'単窓'});
  assert.equal(row.unit,'mm');
  assert.equal(row.current_evaluation_type,'COMPOUND_GATE');
  assert.equal(row.current_automatic,false);
  assert.equal(row.current_W_H_dependency,'240<=W<=815:350<=H<=943; 815<W<=870:350<=H<=755; 870<W<=1690:350<=H<=500');
  assert.deepEqual(row.current_boundary_points,[[240,350],[240,943],[815,943],[815,755],[870,755],[870,500],[1690,500],[1690,350]]);
  assert.deepEqual(row.current_boundary_points,row.official_boundary_points);
  assert.equal(row.runtime_safety,'RUNTIME_SAFETY_REVIEW_REQUIRED');
  assert.equal(row.automatic_judgement_safe,false);
});

test('audit never upgrades Canonical↔Runtime equality to Official Source PASS by itself',()=>{
  const standard=read('standard-size-audit.json');
  const equalityRows=standard.records.filter((row)=>row.canonical_runtime_current_consistency?.match);
  assert.equal(equalityRows.length,65);
  assert.ok(equalityRows.every((row)=>row.coverage_status==='PENDING'));
  const verified=standard.records.find((row)=>row.product_id==='SER-LIX-SAMOSL'&&row.product_node==='WT-SL-SHUTTER-HIKI');
  assert.equal(verified.verifiedSlices[0].coverage_status,'MATCH');
  assert.equal(verified.verifiedSlices[0].official_available,97);
});

test('generic audit core contains no current product token',()=>{
  const source=fs.readFileSync(new URL('../src/product-master-core/size-capability-audit-core.mjs',import.meta.url),'utf8');
  for(const token of ['SER-LIX-SAMOS2H','SER-LIX-SAMOSL','SER-YKK-APW430','SER-YKK-APW431','サーモス','APW 430','APW 431'])assert.equal(source.includes(token),false);
});

test('historical CR-SL-036 proposal remains immutable and payload-integrity valid after external Change Control',()=>{
  const proposal=readThermosLProposal();
  assert.deepEqual(validateChangeProposalDocument(proposal),[]);
  assert.equal(proposal.proposalId,'PMCP-LIX-SAMOSL-INNER-TILT-RANGE-20260903-001');
  assert.equal(proposal.proposalFingerprint,'sha256:bf89762cd1cf88be8620b93599d2987c23d50fcb335e6c2b525f5a14175184ee');
  assert.equal(proposal.proposalFingerprintPolicy,'PRESERVED_LEGACY_PROPOSAL_SHA256');
  assert.equal(proposal.payloadIntegrityFingerprint,computeProposalFingerprint(proposal));
  assert.equal(proposal.approvalPolicy,'HUMAN_REQUIRED');
  assert.equal(proposal.approvalStatus,'PENDING');
  assert.equal(proposal.formalWorkbookWritePerformed,false);
  assert.equal(proposal.runtimeWritePerformed,false);
  assert.equal(proposal.autoApprovalPerformed,false);
  assert.equal(proposal.baseMasterFingerprint,`sha256:${proposal.baseMaster.sha256}`);
  assert.deepEqual(proposal.after.safeAutoPolygon,[[240,350],[240,943],[815,943],[815,755],[870,755],[870,500],[1690,500],[1690,350]]);
});

test('legacy proposal payload tampering is detected independently of preserved proposal identity fingerprint',()=>{
  const proposal=readThermosLProposal();
  proposal.after.safeAutoExpression='tampered';
  assert.ok(validateChangeProposalDocument(proposal).some((error)=>error.includes('payload integrity fingerprint mismatch')));
});

test('external HUMAN approval, STAGING, Production and Runtime regeneration are bound to exact Thermos L proposal',()=>{
  const id='PMCP-LIX-SAMOSL-INNER-TILT-RANGE-20260903-001';
  const approval=readJson(`data/master-change-control/approvals/${id}.approval.json`);
  const staging=readJson(`data/master-change-control/applied/${id}.staging.json`);
  const prodApproval=readJson(`data/master-change-control/production-approvals/${id}.production-approval.json`);
  const production=readJson(`data/master-change-control/production/${id}.applied.json`);
  const runtime=readJson('data/master-change-control/runtime/THERMOSL_CR_SL_036_RUNTIME_REGENERATION_V19.json');
  for(const row of [approval,staging,prodApproval,production,runtime])assert.equal(row.proposalId,id);
  assert.equal(approval.approverType,'HUMAN');
  assert.equal(staging.proposalStatus,'APPLIED');
  assert.equal(prodApproval.productionApproval,true);
  assert.equal(production.status,'PRODUCTION_APPLY_COMPLETE');
  assert.equal(production.postWriteReadback.unexpectedChangedCells,0);
  assert.equal(production.formalTarget.postWriteSha256,'cd6844218fcf0150a16cbbfa947f391aa08f5449b82ba6fc2249ccdb6894c3d3');
  assert.equal(runtime.status,'RUNTIME_REGENERATION_COMMITTED');
  assert.equal(runtime.runtimeVersion,'v1.9');
  assert.equal(runtime.runtimeProjection.directManufacturerValueEditToGenericCore,false);
});

test('S2H CUSTOM extraction classifies all 17 nodes without interpolation or writes',()=>{
  const extraction=read('dimension-rule-extraction-samos2h.json');
  assert.equal(extraction.activeProductNodeCount,17);
  assert.equal(extraction.records.length,17);
  assert.deepEqual(extraction.summary,{
    EXACT_RULE_EXTRACTED:7,
    SOURCE_GRAPH_REVIEW_REQUIRED:10,
    SOURCE_INSUFFICIENT:0,
    PENDING:0,
    TOTAL:17
  });
  assert.ok(extraction.records.every((row)=>row.source_status==='CURRENT_2026_CONTINUITY_CONFIRMED'));
  assert.ok(extraction.records.every((row)=>row.interpolated_points_added===false));
  assert.equal(extraction.formalMasterWritePerformed,false);
  assert.equal(extraction.runtimeDirectWritePerformed,false);
  const inner=extraction.records.find((row)=>row.product_node==='WT-S2H-UCHIDAOSHI');
  assert.equal(inner.exact_rule_status,'EXACT_RULE_EXTRACTED');
  assert.equal(inner.rule_payload.evaluationType,'COMPOUND_GATE');
  assert.equal(inner.rule_payload.automatic,false);
  assert.deepEqual(inner.rule_payload.safeAutoPolygon,[[240,350],[240,943],[815,943],[815,755],[870,755],[870,500],[1690,500],[1690,350]]);
  assert.equal(inner.rule_payload.interpolatedPointsAdded,false);
});

test('S2H Product Master proposal is valid, immutable pending approval, and no Runtime write occurred',()=>{
  const proposal=readS2HProposal();
  assert.deepEqual(validateChangeProposalDocument(proposal),[]);
  assert.equal(proposal.proposalId,'PMCP-LIX-SAMOS2H-CUSTOM-DIMENSION-RULESET-20260903-001');
  assert.equal(proposal.proposalFingerprint,'sha256:bd5900002f8d54d322fb7c50bb0b4b121f54a81ece7ec0e60baaffe6914df08e');
  assert.equal(proposal.proposalFingerprint,computeProposalFingerprint(proposal));
  assert.equal(proposal.baseMaster.driveFileId,'1kTRcb7UdghZl7h3lYdmnZuB7fUVUAduU');
  assert.equal(proposal.baseMaster.sha256,'8dea8b2ecec1715445db74255f591b4f2bcf404027f0006f168a585365df29d6');
  assert.equal(proposal.targetEntity,'06E_特注寸法範囲');
  assert.equal(proposal.operation,'ADD_DIMENSION_RULESET');
  assert.equal(proposal.after.activeProductNodeCount,17);
  assert.deepEqual(proposal.after.nodeClassificationSummary,{EXACT_RULE_EXTRACTED:7,SOURCE_GRAPH_REVIEW_REQUIRED:10,SOURCE_INSUFFICIENT:0,PENDING:0});
  assert.equal(proposal.after.interpolatedPointsAdded,false);
  assert.equal(proposal.status,'PROPOSED');
  assert.equal(proposal.approvalPolicy,'HUMAN_REQUIRED');
  assert.equal(proposal.approvalStatus,'PENDING');
  assert.equal(proposal.formalWorkbookWritePerformed,false);
  assert.equal(proposal.runtimeWritePerformed,false);
  assert.equal(proposal.autoApprovalPerformed,false);
});

test('full current gate has eight managed blocking PENDING and one active S2H Human Approval proposal',()=>{
  const summary=read('summary.json');
  const proposal=readS2HProposal();
  assert.deepEqual(summary.productMasterChangeProposals,['PMCP-LIX-SAMOS2H-CUSTOM-DIMENSION-RULESET-20260903-001']);
  assert.deepEqual(summary.appliedProductMasterChangeProposals,['PMCP-LIX-SAMOSL-INNER-TILT-RANGE-20260903-001']);
  const pending=read('pending.json');
  assert.equal(pending.blockingCount,8);
  assert.ok(pending.resolved.some((row)=>row.id==='PEND-SIZE-S2H-CUSTOM-001'));
  assert.equal(pending.items.some((row)=>row.id==='PEND-SIZE-S2H-CUSTOM-001'),false);
  const gate=buildSizeCapabilityAuditGate({
    summary,
    standardAudit:read('standard-size-audit.json'),
    customAudit:read('custom-capability-audit.json'),
    pending,
    ruleAudits:[read('dimension-rule-audit-thermosl.json'),read('dimension-rule-audit-apw431.json')],
    proposals:[proposal]
  });
  assert.equal(gate.integrityGate,'PASS');
  assert.equal(gate.status,'PARTIAL_PASS');
  assert.equal(gate.blockingPending,8);
  assert.equal(gate.proposalCount,1);
  assert.equal(gate.proposalApprovalGate,'HUMAN_APPROVAL_PENDING');
});
