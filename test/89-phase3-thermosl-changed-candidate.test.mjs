import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { prepareThermosLCandidate, OPTION, SOURCE_HASH } from '../scripts/production/thermosl-option-change.mjs';
import { adaptProductModuleRuntimeV1 } from '../src/catalog/runtime-master/product-module-runtime-adapter.mjs';
import { applyFormalRuntimeJsonTransform } from '../src/catalog/runtime-master/formal-runtime-json-transform.mjs';

const compressed = readFileSync(new URL('../src/catalog/runtime-master-packages/lixil-thermosl-v0.7-r2/LIXIL_サーモスL_runtime_v0.7-R2.json.br.b64.parts/part-00', import.meta.url), 'utf8');
const baseline = brotliDecompressSync(Buffer.from(compressed.replace(/\s+/g, ''), 'base64'));
assert.equal(createHash('sha256').update(baseline).digest('hex'), 'e0b84fd83a1a2e3c078db357c67ac7bb751b34860c05a2321e1466c5cad97525');
const source = { sha256: SOURCE_HASH, sourceId: '1nxDq-qDTb3Gi_s8qPT6d3WpT5MzahCSe' };
const candidate = prepareThermosLCandidate(baseline, source);
const document = JSON.parse(candidate.bytes);
const ui = adaptProductModuleRuntimeV1({ documents: { RUNTIME_JSON_PACKAGE: document } }, { productModuleRole: 'RUNTIME_JSON_PACKAGE' }).uiResolver;
const selection = (shutter_type, extra = {}) => ({ window_type: 'WT-SL-SHUTTER-HIKI', shutter_type, ...extra });
const choice = (result) => result.fields.find((r) => r.key === 'options')?.values.find((r) => r.value === OPTION);

test('real ThermosL baseline preserves all existing module facts and adds exactly one scoped option/evidence', () => {
  const before = JSON.parse(baseline).product_module;
  const after = structuredClone(document.product_module);
  assert.equal(after.allowedValues.pop().value, OPTION);
  assert.equal(after.evidence.pop().id, candidate.evidence.id);
  assert.deepEqual(after, before);
  assert.equal(document.formal_closure.human_adoption, 'PENDING');
  assert.equal(document.package_version, 'v0.7-R3-WORKING');
});

test('official evidence bound candidate is deterministic and transforms the real runtime with target hash verification', () => {
  assert.deepEqual(prepareThermosLCandidate(baseline, source).bytes, candidate.bytes);
  assert.deepEqual(applyFormalRuntimeJsonTransform(baseline, Buffer.from(JSON.stringify(candidate.transform))), candidate.bytes);
  assert.throws(() => prepareThermosLCandidate(baseline, { ...source, sha256: 'wrong' }));
});

test('new option is selectable only for manual standard and remains subject to confirmation', () => {
  assert.equal(choice(ui(selection('SP-SL-SHUT-M-STD')))?.status, 'MANUAL_CHECK');
  for (const spec of ['SP-SL-SHUT-M-WIND', 'SP-SL-SHUT-E-STD', 'SP-SL-SHUT-E-WIND', 'SP-SL-SHUT-E-VENT']) assert.equal(choice(ui(selection(spec))), undefined);
});

test('new selection produces confirmation warning and is cleared when changing to an ineligible shutter', () => {
  const accepted = ui(selection('SP-SL-SHUT-M-STD', { options: [OPTION] }));
  assert.ok(accepted.selection.options.includes(OPTION));
  assert.ok(accepted.manualWarnings.some((message) => message.includes('代替進入口')));
  const changed = ui({ ...accepted.selection, shutter_type: 'SP-SL-SHUT-M-WIND' });
  assert.ok(!changed.selection.options?.includes(OPTION));
});

test('existing flat attachment and new entrance specification remain distinct through selection storage readback', () => {
  const accepted = ui(selection('SP-SL-SHUT-M-STD', { options: ['OP-SL-FLAT-SKIRT', OPTION] }));
  const restored = ui(JSON.parse(JSON.stringify(accepted.selection)));
  assert.deepEqual(restored.selection.options, accepted.selection.options);
  assert.ok(restored.selection.options.includes('OP-SL-FLAT-SKIRT'));
  assert.ok(restored.selection.options.includes(OPTION));
});
