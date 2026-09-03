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
const proposalPath='../data/master-change-control/proposals/PMCP-LIX-SAMOSL-INNER-TILT-RANGE-20260903-001.manifest.json';
const readProposal=()=>JSON.parse(fs.readFileSync(new URL(proposalPath,import.meta.url),'utf8'));

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
  assert.equal(thermos.summary.MATCH,37);
  assert.equal(thermos.summary.SOURCE_GRAPH_REVIEW_REQUIRED,12);
  assert.equal(thermos.summary.RULE_MISMATCH,1);
  assert.equal(apw431.summary.MATCH,21);
  assert.equal(apw431.summary.SOURCE_GRAPH_REVIEW_REQUIRED,8);
  assert.equal(apw431.summary.RULE_MISMATCH??0,0);
});

test('CR-SL-036 mismatch retains only source-confirmed boundary points',()=>{
  const thermos=read('dimension-rule-audit-thermosl.json');
  const row=thermos.records.find((item)=>item.rule_id==='CR-SL-036');
  assert.equal(row.audit_status,'RULE_MISMATCH');
  assert.deepEqual(row.selector_state,{
    window_type:'WT-SL-UCHIDAOSHI',specific_spec:'*',construction:'在来/204',leaf_configuration:'単窓'
  });
  assert.equal(row.unit,'mm');
  assert.deepEqual(row.official_boundary_points,[
    [240,350],[240,943],[815,943],[815,755],[870,755],[870,500],[1690,500],[1690,350]
  ]);
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

test('formalized CR-SL-036 range proposal preserves legacy proposal fingerprint and validates current payload integrity',()=>{
  const proposal=readProposal();
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
  assert.equal(proposal.targetEntity,'06C_特注寸法範囲');
  assert.equal(proposal.targetRuleId,'CR-SL-036');
  assert.deepEqual(proposal.sourceEvidenceIds,['EV-SL-CUSTOM-P221-INNER-TILT']);
  assert.deepEqual(proposal.after.safeAutoPolygon,[
    [240,350],[240,943],[815,943],[815,755],[870,755],[870,500],[1690,500],[1690,350]
  ]);
});

test('legacy proposal payload tampering is detected independently of preserved proposal identity fingerprint',()=>{
  const proposal=readProposal();
  proposal.after.safeAutoExpression='tampered';
  assert.ok(validateChangeProposalDocument(proposal).some((error)=>error.includes('payload integrity fingerprint mismatch')));
});

test('full current gate loads the exact proposal declared by summary',()=>{
  const summary=read('summary.json');
  const proposal=readProposal();
  const gate=buildSizeCapabilityAuditGate({
    summary,
    standardAudit:read('standard-size-audit.json'),
    customAudit:read('custom-capability-audit.json'),
    pending:read('pending.json'),
    ruleAudits:[read('dimension-rule-audit-thermosl.json'),read('dimension-rule-audit-apw431.json')],
    proposals:[proposal]
  });
  assert.equal(gate.integrityGate,'PASS');
  assert.equal(gate.status,'PARTIAL_PASS');
  assert.equal(gate.blockingPending,10);
  assert.equal(gate.proposalCount,1);
  assert.equal(gate.proposalApprovalGate,'HUMAN_APPROVAL_PENDING');
});
