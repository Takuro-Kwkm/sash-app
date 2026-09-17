import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFormalCustomDimensionSafety } from '../src/catalog/runtime-master/formal-custom-dimension-safety.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

function fakeResult(selection, dimensionResult = null) {
  return {
    selection,
    fields: [],
    notices: [],
    manualWarnings: [],
    validation: { status: 'VALID', errors: [], missingRequiredFields: [] },
    dimensionResult,
    orderReady: true,
  };
}

test('formal custom dimension safety blocks COMPOUND_GATE outside explicit outer bounds', () => {
  const dimensions = {
    custom_dimension_rules: [{
      id: 'CR-TEST-1',
      productNode: 'W-1',
      selector: { window_type: 'W-1' },
      evaluationType: 'COMPOUND_GATE',
      geometryRule: { type: 'AUTO_RECT+COMPONENT', outer: '400<=W<=780;450<=H<=1570' },
      runtimeSafety: 'RUNTIME_SAFETY_REVIEW_REQUIRED',
    }],
  };
  const result = applyFormalCustomDimensionSafety(fakeResult({
    window_type: 'W-1', size_mode: 'CUSTOM', custom_width: 900, custom_height: 1000,
  }), dimensions);
  assert.equal(result.dimensionResult.status, 'BLOCK');
  assert.equal(result.validation.status, 'INVALID');
  assert.equal(result.orderReady, false);
});

test('formal custom dimension safety keeps bounded COMPOUND_GATE inside range as REVIEW_REQUIRED', () => {
  const dimensions = {
    custom_dimension_rules: [{
      id: 'CR-TEST-2',
      productNode: 'W-1',
      selector: { window_type: 'W-1' },
      evaluationType: 'COMPOUND_GATE',
      geometryRule: { type: 'AUTO_RECT', bounds: '400<=W<=780;450<=H<=1570' },
      runtimeSafety: 'RUNTIME_SAFETY_REVIEW_REQUIRED',
    }],
  };
  const result = applyFormalCustomDimensionSafety(fakeResult({
    window_type: 'W-1', size_mode: 'CUSTOM', custom_width: 600, custom_height: 1000,
  }), dimensions);
  assert.equal(result.dimensionResult.status, 'REVIEW_REQUIRED');
  assert.equal(result.validation.status, 'MANUAL_CHECK');
  assert.equal(result.orderReady, false);
});

test('formal custom dimension safety does not invent bounds for SOURCE_GRAPH_GATE', () => {
  const dimensions = {
    custom_dimension_rules: [{
      id: 'CR-TEST-3',
      productNode: 'W-1',
      selector: { window_type: 'W-1' },
      evaluationType: 'SOURCE_GRAPH_GATE',
      geometryRule: { type: 'SOURCE_GRAPH_GATE', reason: 'primary source graph required' },
      runtimeSafety: 'RUNTIME_SAFETY_REVIEW_REQUIRED',
    }],
  };
  const result = applyFormalCustomDimensionSafety(fakeResult({
    window_type: 'W-1', size_mode: 'CUSTOM', custom_width: 9999, custom_height: 9999,
  }), dimensions);
  assert.equal(result.dimensionResult.status, 'REVIEW_REQUIRED');
  assert.equal(result.validation.status, 'MANUAL_CHECK');
});

async function reachCustom(productId, windowType) {
  const selection = { window_type: windowType, size_mode: 'CUSTOM' };
  for (let pass = 0; pass < 30; pass += 1) {
    const result = await resolveRuntimeAppProduct(productId, selection);
    const customWidth = result.fields.find((field) => field.key === 'custom_width');
    const customHeight = result.fields.find((field) => field.key === 'custom_height');
    if (customWidth && customHeight) return { selection, result };

    const sizeMode = result.fields.find((field) => field.key === 'size_mode');
    if (sizeMode?.values?.some((choice) => choice.value === 'CUSTOM')) selection.size_mode = 'CUSTOM';

    const next = result.fields.find((field) =>
      field.required && selection[field.key] === undefined && field.dataType !== 'NUMBER' && field.values?.length);
    if (!next) {
      const optionalSelector = result.fields.find((field) =>
        selection[field.key] === undefined && field.dataType !== 'NUMBER' && field.key !== 'size' &&
        field.key !== 'size_mode' && field.values?.length);
      if (!optionalSelector) throw new Error(`${productId}/${windowType}: unable to reach CUSTOM inputs`);
      selection[optionalSelector.key] = optionalSelector.values[0].value;
    } else {
      selection[next.key] = next.values[0].value;
    }
  }
  throw new Error(`${productId}/${windowType}: CUSTOM traversal did not converge`);
}

test('APW430 formal numeric outer boundary is REVIEW inside and BLOCK outside', async () => {
  const windowType = 'SWT-YKK-APW430-TATE-OP-SINGLE';
  const { selection } = await reachCustom('SER-YKK-APW430', windowType);

  const inside = await resolveRuntimeAppProduct('SER-YKK-APW430', {
    ...selection, size_mode: 'CUSTOM', custom_width: 600, custom_height: 1000,
  });
  assert.equal(inside.dimensionResult?.status, 'REVIEW_REQUIRED');
  assert.equal(inside.orderReady, false);

  const outside = await resolveRuntimeAppProduct('SER-YKK-APW430', {
    ...selection, size_mode: 'CUSTOM', custom_width: 900, custom_height: 1000,
  });
  assert.equal(outside.dimensionResult?.status, 'BLOCK');
  assert.equal(outside.orderReady, false);
});

test('APW431 single formal custom match remains REVIEW_REQUIRED, never order-ready PASS', async () => {
  const { selection } = await reachCustom('SER-YKK-APW431', 'W431-001');
  const result = await resolveRuntimeAppProduct('SER-YKK-APW431', {
    ...selection, size_mode: 'CUSTOM', custom_width: 1200, custom_height: 1800,
  });
  assert.notEqual(result.dimensionResult?.status, 'PASS');
  assert.ok(['REVIEW_REQUIRED', 'BLOCK', 'BLOCKED'].includes(result.dimensionResult?.status));
  assert.equal(result.orderReady, false);
});

test('S2H TF/TFT formal shorthand expands to real specific-spec metadata', async () => {
  const { selection } = await reachCustom('SER-LIX-SAMOS2H', 'WT-S2H-TATE-SUBERI');
  const handleField = (await resolveRuntimeAppProduct('SER-LIX-SAMOS2H', selection)).fields
    .find((field) => field.key === 'handle_configuration');
  const tf = handleField?.values?.find((choice) => String(choice.value).includes('TF-') || String(choice.value).includes('TFT-'));
  assert.ok(tf, 'TF/TFT handle configuration should be reachable from formal Runtime');
  const result = await resolveRuntimeAppProduct('SER-LIX-SAMOS2H', {
    ...selection,
    handle_configuration: tf.value,
    size_mode: 'CUSTOM',
    custom_width: 500,
    custom_height: 1000,
  });
  assert.equal(result.dimensionResult?.status, 'REVIEW_REQUIRED');
});

test('S2H broken vented service-door formal selector stays fail-closed', async () => {
  const { selection } = await reachCustom('SER-LIX-SAMOS2H', 'WT-S2H-KATTEGUCHI-VENT-FS');
  const result = await resolveRuntimeAppProduct('SER-LIX-SAMOS2H', {
    ...selection,
    size_mode: 'CUSTOM',
    custom_width: 600,
    custom_height: 1600,
  });
  assert.equal(result.dimensionResult?.status, 'BLOCK');
});
