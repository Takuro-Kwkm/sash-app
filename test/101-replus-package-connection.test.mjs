import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Replus admission has seven same-byte Formal components and denies content/release execution', () => {
  const p = JSON.parse(readFileSync('contracts/production/replus/profile.v1.json'));
  assert.equal(p.components.length, 7);
  assert.equal(p.mutation_policy, 'NONE');
  assert.equal(p.admitted_target_gate, 'REPLUS_PACKAGE_AUDITED');
  assert.equal(p.components.filter(x => x.component_version === 'v1.1').length, 1);
  for (const op of ['PRODUCT_MASTER_BUILD','PRODUCT_MASTER_CHANGE','FORMAL_CHANGE_ADOPTION','RUNTIME_UI_CHANGE','RELEASE']) {
    assert.ok(p.unsupported_operations[op]);
  }
});

test('existing-package audit preserves the independently registered pending products', () => {
  const config = JSON.parse(readFileSync('contracts/production/work-connections.v2.json'));
  const v = JSON.parse(readFileSync('contracts/production/validator-registry.v2.json'));
  const p = config.products.find(x => x.product_id === 'NATIVE_REGISTRY:LIXIL::リプラス');
  assert.equal(p.existing_package_profile.mutation_policy, 'NONE');
  assert.equal(v.products[p.product_id].scope, 'EXISTING_PACKAGE_AUDIT_ONLY');
  assert.equal(config.products.find(x => x.product_id === 'NATIVE_REGISTRY:LIXIL::サーモスA').connection_state, 'ADAPTER_PENDING');
});
