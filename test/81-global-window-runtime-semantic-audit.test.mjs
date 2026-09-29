import test from 'node:test';
import assert from 'node:assert/strict';
import { runGlobalWindowRuntimeSemanticAudit } from '../scripts/global-window-runtime-semantic-audit.mjs';

test('actual formal new-construction Runtime semantic audit covers all six integrations read-only', async () => {
  const report = await runGlobalWindowRuntimeSemanticAudit();
  assert.equal(report.model, 'GLOBAL_WINDOW_RUNTIME_SEMANTIC_AUDIT_V1');
  assert.equal(report.productMasterMutation, 0);
  assert.equal(report.integrationCount, 6);
  assert.deepEqual(report.integrations.map((row) => row.series).sort((a,b)=>a.localeCompare(b,'ja')), ['APW430','APW431','EW','TW','サーモスL','サーモスⅡ-H'].sort((a,b)=>a.localeCompare(b,'ja')));
  assert.equal(report.issueCount, 0);
  assert.equal(report.gate, 'CANONICAL_SLOT_SCHEMA_GATE=PASS_RUNTIME_SEMANTICS');
  assert.ok(report.integrations.every((row) => row.status === 'PASS'));
  console.log(`GLOBAL_WINDOW_RUNTIME_SEMANTIC_AUDIT=${JSON.stringify(report)}`);
});
