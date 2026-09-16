import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../src/catalog/catalog-adapter.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';
import { createProductModuleGlassManufacturability } from '../src/catalog/runtime-master/product-module-glass-manufacturability.mjs';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

async function thermosRuntime() {
  const entry = getRuntimeMasterEntry('LIXIL', 'サーモスL');
  const runtimePackage = await loadFormalProductRuntimePackage(entry);
  const module = runtimePackage.documents[entry.productModuleRole].product_module;
  return { module, evaluator:createProductModuleGlassManufacturability(module, createCatalog([module])) };
}

test('ThermosL R2 classifies the full 1,644 SAFE STANDARD population without auto-pass', async () => {
  const { module, evaluator } = await thermosRuntime();
  assert.equal(module.standardSizeRecords.length, 1644);
  assert.equal(evaluator.directStandardCount, 523);
  assert.equal(evaluator.numericRuleCount, 24);
  const counts = { ALLOWED:0, BLOCK:0, ESTIMATE_CONFIRM_REQUIRED:0 };
  for (const size of module.standardSizeRecords) {
    const result = evaluator.evaluate({
      window_type:size.windowTypeId,
      specific_spec:size.specificationId,
      size_mode:'STANDARD',
      size:size.id,
      glass_function:'SAFE',
    });
    assert.ok(result?.status in counts, `${size.id}: unresolved SAFE classification`);
    counts[result.status] += 1;
    if (result.status === 'ESTIMATE_CONFIRM_REQUIRED') assert.equal(result.confirmationRoute, 'LIXIL見積システム');
  }
  assert.deepEqual(counts, { ALLOWED:517, BLOCK:6, ESTIMATE_CONFIRM_REQUIRED:1121 });
});

test('ThermosL R2 fail-closed precedence keeps official blocks out of ECR', async () => {
  const { evaluator } = await thermosRuntime();
  assert.equal(evaluator.evaluate({ glass_function:'SAFE_MILKY', glass_type:'FROST' }).status, 'BLOCK');
  assert.equal(evaluator.evaluate({ glass_function:'SAFE_MILKY', glass_type:'PATTERN' }).status, 'BLOCK');
  assert.equal(evaluator.evaluate({ glass_detail:'LOWE_HISOLAR' }).status, 'BLOCK');
  assert.equal(evaluator.evaluate({ window_type:'WT-SL-YOKO-SUBERI', glass_function:'BLIND' }).status, 'BLOCK');
  assert.equal(evaluator.evaluate({ window_type:'WT-SL-TATE-SUBERI', specific_spec:'SP-SL-TATE-OP', glass_function:'BLIND' }).status, 'BLOCK');
  assert.equal(evaluator.evaluate({ window_type:'WT-SL-HIKICHIGAI', glass_function:'BLIND', glass_opening_width:1641, glass_opening_height:1000 }).status, 'BLOCK');
  const supported = evaluator.evaluate({ window_type:'WT-SL-HIKICHIGAI', glass_function:'BLIND', glass_opening_width:1640, glass_opening_height:1900 });
  assert.equal(supported.status, 'ESTIMATE_CONFIRM_REQUIRED');
  assert.equal(supported.confirmationRoute, 'LIXIL見積システム');
});

test('ThermosL R2 UI hides High Solar and does not let its series-scoped rule block ordinary glass', async () => {
  const selection = {
    window_type:'WT-SL-HIKICHIGAI', size_mode:'STANDARD', size:'SZ-SL-000001',
    exterior_color:'H', interior_color:'T', screen_presence:'なし', glass_base:'LOWE',
    glass_type:'CLEAR', glass_detail:'LOWE_CLEAR', glass_spacer:'ALUMINUM', glass_air_layer:'ARGON',
  };
  const result = await resolveRuntimeAppProduct('SER-LIX-SAMOSL', selection);
  const detail = result.fields.find((field) => field.key === 'glass_detail');
  assert.ok(detail);
  assert.ok(!detail.values.some((choice) => choice.value === 'LOWE_HISOLAR'));
  assert.equal(result.glassManufacturability, null);
  assert.equal(result.validation.status, 'VALID');
  assert.equal(result.validation.errors.length, 0);
});

test('ThermosL R2 UI preserves direct SAFE ALLOWED/BLOCK and residual manual confirmation', async () => {
  const base = { window_type:'WT-SL-HIKICHIGAI', size_mode:'STANDARD', glass_function:'SAFE' };
  const allowed = await resolveRuntimeAppProduct('SER-LIX-SAMOSL', { ...base, size:'SZ-SL-000001' });
  assert.equal(allowed.glassManufacturability.status, 'ALLOWED');
  assert.ok(!allowed.manualWarnings.some((message) => message.includes('安全合わせガラスの最終製作可否')));
  const blocked = await resolveRuntimeAppProduct('SER-LIX-SAMOSL', { ...base, size:'SZ-SL-000100' });
  assert.equal(blocked.glassManufacturability.status, 'BLOCK');
  assert.ok(blocked.validation.errors.some((error) => error.errorCode === 'GLASS_MANUFACTURABILITY_BLOCK'));
  const residual = await resolveRuntimeAppProduct('SER-LIX-SAMOSL', { ...base, size:'SZ-SL-000524' });
  assert.equal(residual.glassManufacturability.status, 'ESTIMATE_CONFIRM_REQUIRED');
  assert.equal(residual.glassManufacturability.confirmationRoute, 'LIXIL見積システム');
  assert.notEqual(residual.validation.status, 'VALID');
});
