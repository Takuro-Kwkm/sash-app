import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { APW430_MODULE } from '../src/catalog/modules/apw430-module.mjs';

const lock = JSON.parse(readFileSync(
  new URL('../data/product-master-runtime-locks/ykk-ap/apw430/20260830/runtime_package_lock.json', import.meta.url),
  'utf8',
));

const digestSorted = (values) =>
  createHash('sha256').update(`${[...values].sort().join('\n')}\n`, 'utf8').digest('hex');

test('v3.0 APW430 formal Runtime lock is bound to current Authoring Master', () => {
  assert.equal(lock.manufacturer, 'YKK AP');
  assert.equal(lock.series, 'APW430');
  assert.equal(lock.product_id, 'SER-YKK-APW430');
  assert.equal(lock.package_version, '20260830');
  assert.equal(lock.authoring_file_id, '1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo');
  assert.equal(lock.formal_package_gate, 'BLOCKED');
});

test('v3.0 APW430 active window ID digest matches existing Runtime module exactly', () => {
  const moduleIds = APW430_MODULE.allowedValues
    .filter((row) => row.specificationKey === 'window_type')
    .map((row) => row.value);
  assert.equal(moduleIds.length, 25);
  assert.equal(digestSorted(moduleIds), lock.parity_digests.active_series_window_ids_sha256);
});

test('v3.0 APW430 standard size ID digest matches existing Runtime module exactly', () => {
  const moduleIds = APW430_MODULE.standardSizeRecords.map((row) => row.id);
  assert.equal(moduleIds.length, 718);
  assert.equal(digestSorted(moduleIds), lock.parity_digests.standard_size_ids_sha256);
});

test('v3.0 APW430 custom rule ID digest and safety inventory match existing Runtime module exactly', () => {
  const rules = APW430_MODULE.ruleSets.find((row) => row.type === 'DIMENSION_RULES').payload;
  assert.equal(rules.length, 25);
  assert.equal(digestSorted(rules.map((row) => row.id)), lock.parity_digests.custom_dimension_rule_ids_sha256);
  assert.equal(rules.filter((row) => row.type === 'COMPOUND_GATE').length, lock.custom_safety.compound_gate);
  assert.equal(rules.filter((row) => row.type === 'SOURCE_GRAPH_GATE').length, lock.custom_safety.source_graph_gate);
  assert.equal(rules.filter((row) => row.automatic).length, lock.custom_safety.automatic_true);
});

test('v3.0 APW430 Runtime package lock preserves formal workbook record inventories', () => {
  assert.equal(lock.record_counts.active_series_windows, 25);
  assert.equal(lock.record_counts.standard_sizes, 718);
  assert.equal(lock.record_counts.custom_dimension_rules, 25);
  assert.equal(lock.record_counts.glass_size_rules, 718);
  assert.equal(lock.record_counts.screen_size_rules, 140);
  assert.equal(lock.record_counts.spec_size_rules, 15);
  assert.equal(lock.record_counts.golden_tests, 17);
});
