import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeAppProduct as resolve, runtimeAppIntegrationInventory } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { guidedSelectionContract as contract } from '../src/ui/web/guided-selection-contract.mjs';
import { admittedGuidedProducts, guidedOpeningChoices, recommendGuidedProducts, nextGuidedQuestion, applyGuidedCandidate, reconcileGuidedAcknowledgements } from '../src/ui/web/guided-selection-engine.mjs';
const inventory = runtimeAppIntegrationInventory();
const answers = { purpose: 'new_exterior', priority: 'price', opening: 'WT-SL-HIKICHIGAI' };

test('only explicitly admitted verified Formal Runtime is a candidate; blocked/changed identities fail closed', async () => {
  assert.equal(admittedGuidedProducts(inventory).length, 1);
  const p = admittedGuidedProducts(inventory)[0];
  for (const delta of [{ status: 'PENDING' }, { selectable: false }, { sourceHash: 'wrong' }, { packageVersion: 'wrong' }]) {
    assert.deepEqual(admittedGuidedProducts([{ ...p, ...delta }]), []);
  }
  const choices = await guidedOpeningChoices({ inventory, resolve, purpose: 'new_exterior' });
  assert.equal(choices.length, 17);
  assert.ok(choices.every(c => c.label && c.value));
  assert.deepEqual((await recommendGuidedProducts({ inventory, resolve, answers: { ...answers, purpose: 'other' } })).candidates, []);
});

test('optional question acknowledgements resume unchanged and reopen after upstream edits', async () => {
  const first = await resolve('SER-LIX-SAMOSL', { window_type: answers.opening });
  assert.deepEqual(reconcileGuidedAcknowledgements(first, first, ['options']), ['options']);
  const changed = await resolve('SER-LIX-SAMOSL', { window_type: 'WT-SL-FIX-OUT' });
  assert.deepEqual(reconcileGuidedAcknowledgements(first, changed, ['options']), []);
});

test('reasons are versioned and separate from facts; price/thermal are unknown for every priority', async () => {
  for (const { value: priority } of contract.priorities) {
    const { candidates } = await recommendGuidedProducts({ inventory, resolve, answers: { ...answers, priority } });
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].comparisons.price.status, 'UNKNOWN');
    assert.equal(candidates[0].comparisons.thermal.status, 'UNKNOWN');
    assert.equal(candidates[0].dimension.status, 'UNKNOWN');
    assert.equal(candidates[0].recommendation.origin, 'INTERNAL_RECOMMENDATION');
    assert.equal(candidates[0].evidence.kind, 'FORMAL_RUNTIME');
    assert.ok(candidates[0].recommendation.updatedAt);
  }
});

test('uses exact actual dimensions; rejects oversized, absent metadata, partial and negative measurements', async () => {
  const request = { inventory, resolve, answers: { ...answers, width: 640, height: 370 } };
  const { candidates } = await recommendGuidedProducts(request);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].dimension.status, 'EXACT_STANDARD_MATCH');
  for (const dimensions of [{ width: 99999, height: 99999 }, { width: 640 }, { width: -1, height: 370 }, { width: NaN, height: 370 }]) {
    assert.equal((await recommendGuidedProducts({ ...request, answers: { ...answers, ...dimensions } })).candidates.length, 0);
  }
  const stripped = async (...args) => { const r = await resolve(...args); return { ...r, fields: r.fields.map(f => ({ ...f, values: f.values.map(({ sizeMetadata, ...v }) => v) })) }; };
  assert.equal((await recommendGuidedProducts({ ...request, resolve: stripped })).candidates.length, 0);
});

test('question progression skips answers, respects Runtime dependencies, and applies via same Resolver', async () => {
  const { candidates } = await recommendGuidedProducts({ inventory, resolve, answers });
  let r = await applyGuidedCandidate({ candidate: candidates[0], currentSelection: { exterior_color: 'H', options: ['INVALID'] }, resolve });
  assert.equal(r.selection.exterior_color, 'H');
  assert.ok(!r.selection.options?.includes('INVALID'));
  const chosen = new Set();
  for (let i = 0; i < 30; i++) {
    const f = nextGuidedQuestion(r, ['glass_function', 'options']);
    if (!f) break;
    assert.ok(!f.disabled && !chosen.has(f.key), `answered question repeated: ${f.key}`);
    chosen.add(f.key);
    assert.ok(f.values.length, f.key);
    r = await resolve(candidates[0].productId, { ...r.selection, [f.key]: f.values[0].value });
  }
  assert.equal(r.validation.missingRequiredFields.length, 0);
  assert.equal(nextGuidedQuestion(r, ['glass_function', 'options']), null);
  await assert.rejects(applyGuidedCandidate({ candidate: { ...candidates[0], identity: { sourceHash: 'wrong' } }, currentSelection: {}, resolve }));
});
