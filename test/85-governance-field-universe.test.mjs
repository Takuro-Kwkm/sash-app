import test from 'node:test';
import assert from 'node:assert/strict';
import { appRuntimeIntegrationRegistry } from '../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { authoritativeSourceUniverse, expectedFieldUniverse } from '../scripts/governance/runtime-field-coverage.mjs';

const byRegistryKey = (key) => {
  const integration = appRuntimeIntegrationRegistry.find((row) => row.registrySeriesKey === key);
  assert.ok(integration, `missing integration ${key}`);
  return integration;
};
const keys = (rows = []) => new Set(rows.map((row) => row?.key ?? row?.field_name).filter(Boolean));
const excludedKeys = (rows = []) => new Set(rows.map((row) => row?.field?.key ?? row?.field?.field_name).filter(Boolean));
const assertSubset = (left, right, label) => {
  for (const key of left) assert.ok(right.has(key), `${label}: ${key}`);
};

const IDENTITY_FIELDS = ['manufacturer', 'series', 'product_category'];
const INPLUS_CONDITIONAL_FIELDS = [
  'size_class', 'reverse_handing', 'order_width', 'order_height',
  'sash_midrail', 'crescent_position', 'fukashi_spec', 'joint_layout',
  'lowe_color', 'cavity_fill', 'supply_form', 'glass_detail',
  'decorative_pattern', 'spacer',
];

test('inner-window authoritative source classifier excludes only hidden identity/context fields', async () => {
  for (const registryKey of ['YKK AP::ウチリモ 内窓', 'LIXIL::インプラス']) {
    const source = await authoritativeSourceUniverse(byRegistryKey(registryKey));
    const authoritative = keys(source.sourceFields);
    const excluded = excludedKeys(source.excludedFields);

    for (const key of IDENTITY_FIELDS) {
      assert.ok(excluded.has(key), `${registryKey}: ${key} must be explicitly excluded`);
      assert.ok(!authoritative.has(key), `${registryKey}: ${key} must not enter authoritative UI universe`);
    }
    assert.deepEqual(source.mappingErrors, [], `${registryKey}: source mapping must be closed`);
  }
});

test('Inplus conditionally hidden selectors remain in the authoritative UI field universe', async () => {
  const integration = byRegistryKey('LIXIL::インプラス');
  const source = await authoritativeSourceUniverse(integration);
  const authoritative = keys(source.sourceFields);
  const mapped = keys(source.mappedFields);

  for (const key of INPLUS_CONDITIONAL_FIELDS) {
    assert.ok(authoritative.has(key), `Inplus authoritative source lost conditional selector ${key}`);
    assert.ok(mapped.has(key), `Inplus adapter field universe lost conditional selector ${key}`);
  }
});

test('governance enforces Authoritative Source Field Universe subset Adapter Field Universe', async () => {
  for (const registryKey of ['YKK AP::ウチリモ 内窓', 'LIXIL::インプラス']) {
    const integration = byRegistryKey(registryKey);
    const expected = await expectedFieldUniverse(integration, []);
    const source = keys(expected.sourceFields);
    const adapter = keys(expected.adapterFields);

    assert.deepEqual(expected.sourceMappingErrors, [], `${registryKey}: authoritative field cannot fail adapter mapping`);
    assertSubset(source, adapter, `${registryKey}: source field missing from adapter universe`);
  }
});
