import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const ROOT = new URL('../contracts/production/formal-state/', import.meta.url);
const current = JSON.parse(readFileSync(new URL('current/SER-LIX-SAMOSL.json', ROOT)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = p => JSON.parse(readFileSync(new URL(p, ROOT)));

test('committed current Formal resolves every accepted artifact with exact bytes and actual Human Decision', () => {
  assert.equal(current.revision, 'v0.7-R3');
  assert.equal(current.lifecycle_state, 'FORMAL');
  assert.equal(current.source_scope, 'ONE_OPTION_ONLY');
  assert.equal(Object.keys(current.artifacts).length, 10);
  for (const [path, hash] of Object.entries(current.artifacts)) {
    assert.ok(path.startsWith('formal/PHASE3-THERMOSL-IS8900-20261006/'));
    assert.equal(sha(readFileSync(new URL(path, ROOT))), hash, path);
  }
  const decision = read(current.human_decision.path);
  assert.equal(decision.actor_kind, 'HUMAN');
  assert.equal(decision.decision, 'APPROVED');
  assert.equal(decision.user_message, '採用');
  assert.equal(decision.decision_ref, current.human_decision.decision_ref);
  assert.equal(decision.payload_sha256, 'c1d77775ffe456e441d73606256af4bfd1ceb2503f6d0de3cfd7722ba774a75a');
});

test('promotion, adopted runtime identity and native readback refer to the same saved Formal revision', () => {
  const prefix = 'formal/PHASE3-THERMOSL-IS8900-20261006/';
  const promotion = read(prefix + 'promotion.json');
  assert.equal(promotion.to_version, current.revision);
  assert.equal(promotion.state, 'FORMAL');
  assert.equal(promotion.decision_path, current.human_decision.path);
  const adoption = JSON.parse(readFileSync(new URL('../changes/lixil-thermosl-is8900/runtime-identity-adoption.json', import.meta.url)));
  const receipt = JSON.parse(readFileSync(new URL('../changes/lixil-thermosl-is8900/native-formal-receipt.json', import.meta.url)));
  assert.equal(adoption.status, 'ADOPTED');
  assert.equal(adoption.after.packageVersion, current.revision);
  assert.equal(adoption.human_decision_ref, current.human_decision.decision_ref);
  assert.equal(receipt.status, 'POST_SAVE_VERIFIED');
  assert.equal(receipt.decision_ref, current.human_decision.decision_ref);
  assert.equal(receipt.registry_entry.package_version, current.revision);
});

test('short instruction connection discovers the committed successor instead of the prior frozen baseline', () => {
  const connections = JSON.parse(readFileSync(new URL('../contracts/production/work-connections.v2.json', import.meta.url)));
  const route = connections.products.find(p => p.product_id === current.product_id);
  assert.equal(route.connection_state, 'CONNECTED');
  assert.equal(route.baseline_selector.series, 'サーモスL');
  assert.equal(route.current_formal_selector, 'contracts/production/formal-state/current/SER-LIX-SAMOSL.json');
});
