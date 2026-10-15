import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { evaluateCondition } from '../../src/catalog/runtime-master/runtime-condition.mjs';
import { evaluateConfiguration, applySelection } from '../../src/catalog/runtime-master/generic-rule-engine.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((rows, value, index, values) => index % 2 ? rows : [...rows, [value.slice(2), values[index + 1]]], []));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const input = JSON.parse(fs.readFileSync(args.input));
const bytes = fs.readFileSync(input.candidate.path);
assert.equal(digest(bytes), input.candidate.sha256);
const candidate = JSON.parse(bytes);
const results = [];
function check(id, action) {
  try { action(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', reason: error.message }); }
}
const at = (value, pointer) => pointer.split('/').slice(1).reduce((object, key) => object[key.replaceAll('~1', '/').replaceAll('~0', '~')], value);
for (const test of input.assertions) check(test.id, () => {
  const actual = at(candidate, test.path);
  if (test.operation === 'equals') assert.deepEqual(actual, test.expected);
  else if (test.operation === 'length') assert.equal(actual.length, test.expected);
  else if (test.operation === 'unique') assert.equal(new Set(actual.map(row => test.keys.map(key => JSON.stringify(row[key])).join('|'))).size, actual.length);
  else if (test.operation === 'contains') assert.ok(actual.some(row => Object.entries(test.expected).every(([key, value]) => Object.is(row[key], value))));
  else if (test.operation === 'prefix_hash') assert.equal(digest(JSON.stringify(actual.slice(0,test.length))),test.expected);
  else throw new Error('Unsupported QA assertion');
});
for (const test of input.business_cases) check(test.id, () => {
  const state = { fields: Object.fromEntries(Object.entries(test.input).map(([key, value]) => [key, { value, state: 'SELECTED' }])) };
  const matched = candidate.reviewed_rules.filter(rule => evaluateCondition(rule.conditions, state));
  assert.deepEqual(matched.map(rule => rule.rule_id).sort(), [...test.expected_rules].sort());
  const blocked = matched.some(rule => rule.effect === 'BLOCK');
  const confirmations = matched.filter(rule => rule.effect === 'ESTIMATE_CONFIRM').map(rule => rule.confirmation_id).sort();
  assert.equal(blocked, test.expected_blocked);
  assert.deepEqual(confirmations, [...test.expected_confirmations].sort());
  if (test.expected_handoff) for (const confirmationId of confirmations) {
    const gap = candidate.confirmations.find(item => item.gap_id === confirmationId);
    assert.ok(gap?.handoff_question && gap?.confirmation_owner);
    assert.equal(gap.automatic_orderability, false);
  }
});
for (const test of input.reset_cases ?? []) check(test.id, () => {
  const current=evaluateConfiguration(input.qa_projection,test.before);
  const next=applySelection(input.qa_projection,current,test.field,test.value);
  for (const [field, expected] of Object.entries(test.expected)) assert.deepEqual(next.fields[field].value,expected);
  if (test.rejected_value !== undefined) assert.throws(()=>applySelection(input.qa_projection,next,test.rejected_field,test.rejected_value),{code:'SELECTION_NOT_ALLOWED'});
});
const report = { status: results.every(item => item.status === 'PASS') ? 'PASS' : 'FAIL', executed: true,
  candidate_sha256: input.candidate_authoring_sha256, product_master_sha256: digest(bytes),
  business_scope: 'SALES_ESTIMATE_REQUEST', passed: results.filter(item => item.status === 'PASS').length,
  failed: results.filter(item => item.status === 'FAIL').length, tests: results,
  rule_evaluator: 'EXISTING_COMMON_RUNTIME_CONDITION', runtime_ui_adoption: 'NOT_EXECUTED' };
fs.writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n');
process.exitCode = report.status === 'PASS' ? 0 : 2;
