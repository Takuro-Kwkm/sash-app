import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSizeCapabilityAuditGate,validateRuleAuditDocument} from '../src/product-master-core/size-capability-audit-core.mjs';

const read=(name)=>JSON.parse(fs.readFileSync(new URL(`../artifacts/size-capability-audit/${name}`,import.meta.url),'utf8'));

test('generic Size Capability Audit accepts managed PENDING without hiding it',()=>{
  const gate=buildSizeCapabilityAuditGate({
    summary:{commonSalesInputContract:'FORMAL_PASS',formalMasterWritePerformed:false},
    standardAudit:{records:[{product_id:'SER-TEST-FUTURE',product_node:'NODE-1',coverage_status:'PENDING'}],formalMasterWritePerformed:false},
    customAudit:{formalMasterWritePerformed:false},
    pending:{blockingCount:1,items:[{id:'P-1',blocking:true}]},
    ruleAudits:[{expectedRuleCount:1,auditedRuleCount:1,records:[{rule_id:'R-1',audit_status:'MATCH'}],formalMasterWritePerformed:false}]
  });
  assert.equal(gate.integrityGate,'PASS');
  assert.equal(gate.status,'PARTIAL_PASS');
  assert.equal(gate.blockingPending,1);
});

test('current Thermos L and APW431 rule audits are complete and non-mutating',()=>{
  const thermos=read('dimension-rule-audit-thermosl.json');
  const apw431=read('dimension-rule-audit-apw431.json');
  assert.deepEqual(validateRuleAuditDocument(thermos),[]);
  assert.deepEqual(validateRuleAuditDocument(apw431),[]);
  assert.equal(thermos.expectedRuleCount,50);
  assert.equal(apw431.expectedRuleCount,29);
  assert.equal(thermos.summary.RULE_MISMATCH,1);
  assert.equal(apw431.summary.SOURCE_GRAPH_REVIEW_REQUIRED,8);
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
