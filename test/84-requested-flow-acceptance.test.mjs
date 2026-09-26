import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { evaluateCanonicalWorkbookRuntime } from '../src/catalog/runtime-master/canonical-workbook-runtime-engine.mjs';

const VENT_DOOR = /採風.*勝手口|勝手口.*採風/u;
const RAW_COMPOSITION = /(?:\d+\s*-\s*Ar\d+|Ar\d+\s*-\s*LowE\d+|LowE\d+\s*-\s*Ar\d+)/iu;

const field = (result, key) => result.fields.find((row) => row.key === key) ?? null;
const selectableValues = (row) => (row?.values ?? []).filter((choice) => choice.disabled !== true);

async function windowValueByLabel(productId, pattern) {
  const initial = await resolveRuntimeAppProduct(productId, {});
  const windows = field(initial, 'window_type');
  assert.ok(windows, `${productId}: window_type missing`);
  const hit = windows.values.find((row) => pattern.test(String(row.displayLabel ?? row.label ?? row.value)));
  assert.ok(hit, `${productId}: target window not found for ${pattern}`);
  return hit.value;
}

function preferredValue(row) {
  const choices = selectableValues(row);
  if (!choices.length) return undefined;
  if (row.key === 'size_mode') return (choices.find((choice) => choice.value === 'STANDARD') ?? choices[0]).value;
  if (row.key === 'screen_presence') return (choices.find((choice) => ['NONE','なし','NO'].includes(String(choice.value))) ?? choices[0]).value;
  return choices[0].value;
}

async function advanceUntil(productId, baseSelection, targetKey, max = 50) {
  let result = await resolveRuntimeAppProduct(productId, baseSelection);
  for (let step = 0; step < max; step += 1) {
    const target = field(result, targetKey);
    if (target?.values?.length) return { result, target };
    const next = result.fields.find((row) => row?.values?.length && !row.readOnly && row.key !== targetKey && row.dataType !== 'NUMBER' && row.dataType !== 'TEXT' && result.selection?.[row.key] === undefined);
    assert.ok(next, `${productId}: unable to reach ${targetKey}; fields=${result.fields.map((row) => row.key).join(',')}`);
    const value = preferredValue(next);
    assert.notEqual(value, undefined, `${productId}:${next.key}: no selectable value`);
    result = await resolveRuntimeAppProduct(productId, { ...result.selection, [next.key]: value });
  }
  throw new Error(`${productId}: ${targetKey} did not appear within ${max} transitions`);
}

async function advanceThroughPrerequisites(productId, baseSelection, targetKey, overrides = {}, max = 60) {
  let result = await resolveRuntimeAppProduct(productId, baseSelection);
  for (let step = 0; step < max; step += 1) {
    const targetIndex = result.fields.findIndex((row) => row.key === targetKey);
    if (targetIndex >= 0) {
      const prior = result.fields.slice(0, targetIndex).find((row) => row?.values?.length && !row.readOnly && row.dataType !== 'NUMBER' && row.dataType !== 'TEXT' && result.selection?.[row.key] === undefined);
      if (!prior) {
        const target = result.fields[targetIndex];
        if (target?.values?.length) return { result, target };
      } else {
        const requested = overrides[prior.key];
        const choices = selectableValues(prior);
        const value = requested ?? preferredValue(prior);
        assert.ok(choices.some((choice) => choice.value === value), `${productId}:${prior.key}: requested prerequisite ${String(value)} is not selectable; choices=${choices.map((choice) => choice.value).join(',')}`);
        result = await resolveRuntimeAppProduct(productId, { ...result.selection, [prior.key]: value });
        continue;
      }
    }
    const next = result.fields.find((row) => row?.values?.length && !row.readOnly && row.key !== targetKey && row.dataType !== 'NUMBER' && row.dataType !== 'TEXT' && result.selection?.[row.key] === undefined);
    assert.ok(next, `${productId}: unable to reach ${targetKey} through prerequisite flow; fields=${result.fields.map((row) => row.key).join(',')}`);
    const requested = overrides[next.key];
    const choices = selectableValues(next);
    const value = requested ?? preferredValue(next);
    assert.ok(choices.some((choice) => choice.value === value), `${productId}:${next.key}: requested prerequisite ${String(value)} is not selectable; choices=${choices.map((choice) => choice.value).join(',')}`);
    result = await resolveRuntimeAppProduct(productId, { ...result.selection, [next.key]: value });
  }
  throw new Error(`${productId}: ${targetKey} prerequisite flow did not converge within ${max} transitions`);
}

async function completeRequired(productId, baseSelection, max = 60) {
  let result = await resolveRuntimeAppProduct(productId, baseSelection);
  for (let step = 0; step < max; step += 1) {
    const missing = result.fields.find((row) => row.required && result.selection?.[row.key] === undefined && row.values?.length && !row.readOnly);
    if (!missing) return result;
    const value = preferredValue(missing);
    assert.notEqual(value, undefined, `${productId}:${missing.key}: no selectable value`);
    result = await resolveRuntimeAppProduct(productId, { ...result.selection, [missing.key]: value });
  }
  throw new Error(`${productId}: required flow did not converge`);
}

function assertNoRawComposition(result, label) {
  for (const row of result.fields.filter((candidate) => candidate.semanticStage === 'GLAZING' || candidate.key.startsWith('glass_'))) {
    for (const choice of row.values ?? []) {
      const text = String(choice.displayLabel ?? choice.label ?? choice.value);
      assert.doesNotMatch(text, RAW_COMPOSITION, `${label}:${row.key}: raw technical composition leaked: ${text}`);
    }
  }
}

function assertGlazingOrder(result, label) {
  const keys = result.fields.map((row) => row.key);
  const expected = ['glass_base','glass_type','glass_detail','glass_function','glass_spacer','glass_air_layer'];
  let prior = -1;
  for (const key of expected) {
    const index = keys.indexOf(key);
    if (index < 0) continue;
    assert.ok(index > prior, `${label}: glazing order inverted at ${key}: ${keys.join(' > ')}`);
    prior = index;
  }
}

const appearanceLabels = (row) => selectableValues(row).map((choice) => String(choice.displayLabel ?? choice.label ?? choice.value));

function assertAppearanceLabelSet(labels, label) {
  assert.ok(labels.some((text) => /透明/u.test(text)), `${label}: transparent glass missing: ${labels.join(' / ')}`);
  assert.ok(labels.some((text) => /型板|型/u.test(text)), `${label}: patterned glass missing: ${labels.join(' / ')}`);
  assert.ok(labels.some((text) => /フロスト/u.test(text)), `${label}: frosted glass missing: ${labels.join(' / ')}`);
}

async function assertSixGrilles(productId, label) {
  const windowType = await windowValueByLabel(productId, VENT_DOOR);
  const result = await resolveRuntimeAppProduct(productId, { window_type: windowType });
  const grille = field(result, 'door_grille_type');
  assert.ok(grille, `${label}: door_grille_type must be user-facing for the ventilation back door; window=${windowType}; fields=${result.fields.map((row) => row.key).join(',')}`);
  const choices = selectableValues(grille);
  assert.equal(choices.length, 6, `${label}: expected six grille choices, got ${choices.length}: ${choices.map((row) => row.displayLabel ?? row.value).join(' / ')}`);
  for (const choice of choices) {
    const changed = await resolveRuntimeAppProduct(productId, { ...result.selection, door_grille_type: choice.value });
    assert.equal(changed.selection.door_grille_type, choice.value, `${label}: grille selection did not stick`);
    assert.ok(field(changed, 'size_mode'), `${label}: grille selection must continue into SIZE stage`);
  }
}

test('TW Product Master one-field candidate repair exposes six grille choices without UI hardcode', async () => {
  const loaded = await loadRegisteredRuntime('LIXIL', 'TW');
  const candidate = structuredClone(loaded.master);
  const windowType = 'SWT-LIX-TW-SAIHU-KATTEGUCHI';
  const win = candidate.provider.windows.find((row) => row.id === windowType);
  assert.ok(win, 'TW candidate window row missing');
  win.spec_type = '網付格子種類';
  const initial = evaluateCanonicalWorkbookRuntime(candidate, { window_type:windowType });
  const grille = initial.fields.door_grille_type;
  assert.equal(grille.visibility, 'SHOW');
  assert.equal(grille.allowed_values.length, 6);
  for (const value of grille.allowed_values) {
    const changed = evaluateCanonicalWorkbookRuntime(candidate, { window_type:windowType, door_grille_type:value });
    assert.equal(changed.fields.door_grille_type.value, value);
    assert.equal(changed.fields.size_mode.visibility, 'SHOW');
  }
});

test('requested flow: current formal TW ventilation back door exposes all six formal grille choices', async () => {
  const productId = 'SER-LIXIL-TW';
  const windowType = await windowValueByLabel(productId, VENT_DOOR);
  const loaded = await loadRegisteredRuntime('LIXIL', 'TW');
  const master = loaded.master;
  const win = master.provider.windows.find((row) => row.id === windowType);
  assert.ok(win, `TW: formal window row missing for ${windowType}`);
  const grilleSpecs = (master.sourceRows?.specs ?? []).filter((row) => row['固有仕様種別'] === '網付格子種類');
  const scoped = grilleSpecs.filter((row) => row['窓種ID'] === win.common_window_id);
  assert.equal(scoped.length, 6, `TW PRODUCT_MASTER_GAP: expected six formal 網付格子種類 rows for common_window_id=${win.common_window_id}, got ${scoped.length}`);
  assert.equal(win.spec_type, '網付格子種類', `TW PRODUCT_MASTER_DEFECT: ventilation back-door window.spec_type=${win.spec_type}, expected 網付格子種類`);
  await assertSixGrilles(productId, 'TW');
});

test('requested flow: ThermosL ventilation back door exposes all six formal grille choices', async () => {
  await assertSixGrilles('SER-LIX-SAMOSL', 'ThermosL');
});

test('requested flow: Samos2H ventilation back-door glass semantics follow formal size-level availability', async () => {
  const productId = 'SER-LIX-SAMOS2H';
  const windowType = await windowValueByLabel(productId, VENT_DOOR);

  const simpleStep = await advanceThroughPrerequisites(productId, { window_type:windowType }, 'glass_type', { size:'SZ-S2H-02235' });
  assert.equal(simpleStep.result.selection.size, 'SZ-S2H-02235');
  assertGlazingOrder(simpleStep.result, 'Samos2H-simple-step');
  assertNoRawComposition(simpleStep.result, 'Samos2H-simple-step');
  const simpleLabels = appearanceLabels(simpleStep.target);
  assertAppearanceLabelSet(simpleLabels, 'Samos2H simple-step formal size');

  const standard = await advanceThroughPrerequisites(productId, { window_type:windowType }, 'glass_type', { size:'SZ-S2H-02241' });
  assert.equal(standard.result.selection.size, 'SZ-S2H-02241');
  assertGlazingOrder(standard.result, 'Samos2H-standard');
  assertNoRawComposition(standard.result, 'Samos2H-standard');
  const standardLabels = appearanceLabels(standard.target);
  assert.ok(standardLabels.some((text) => /型板|型/u.test(text)), `Samos2H standard size: patterned glass missing: ${standardLabels.join(' / ')}`);
  assert.ok(standardLabels.some((text) => /フロスト/u.test(text)), `Samos2H standard size: frosted glass missing: ${standardLabels.join(' / ')}`);
  assert.ok(!standardLabels.some((text) => /透明/u.test(text)), `Samos2H standard size: transparent must remain unavailable per formal size condition: ${standardLabels.join(' / ')}`);

  const transparent = selectableValues(simpleStep.target).find((choice) => /透明/u.test(String(choice.displayLabel ?? choice.label ?? choice.value)));
  assert.ok(transparent, 'Samos2H simple-step: transparent branch missing');
  const afterType = await resolveRuntimeAppProduct(productId, { ...simpleStep.result.selection, glass_type:transparent.value });
  const detail = field(afterType, 'glass_detail');
  assert.ok(detail?.values?.length, 'Samos2H: glass_detail must follow glass_type');
  assert.ok(appearanceLabels(detail).some((text) => /Low-E|クリア|グリーン|一般複層/u.test(text)), `Samos2H: Low-E/color detail missing: ${appearanceLabels(detail).join(' / ')}`);
  assertNoRawComposition(afterType, 'Samos2H-after-type');
});

test('requested flow: ThermosL glass UI is semantic and does not leak raw pane composition strings', async () => {
  const productId = 'SER-LIX-SAMOSL';
  const windowType = await windowValueByLabel(productId, VENT_DOOR);
  const reached = await advanceThroughPrerequisites(productId, { window_type:windowType }, 'glass_type');
  assertAppearanceLabelSet(appearanceLabels(reached.target), 'ThermosL');
  assertGlazingOrder(reached.result, 'ThermosL');
  assertNoRawComposition(reached.result, 'ThermosL');
});

test('requested flow: EW CUSTOM keeps semantic glass type, accepts in-range and blocks out-of-range dimensions', async () => {
  const productId = 'SER-LIX-EW';
  const base = { window_type:'WT-EW-SOTODAOSHI', window_spec:'SP-EW-Y-1', size_mode:'CUSTOM', custom_w:500, custom_h:400 };
  const reached = await advanceUntil(productId, base, 'glass_type');
  assertAppearanceLabelSet(appearanceLabels(reached.target), 'EW CUSTOM');
  assertGlazingOrder(reached.result, 'EW CUSTOM');
  assertNoRawComposition(reached.result, 'EW CUSTOM');
  assert.notEqual(reached.result.validation.status, 'INVALID', 'EW CUSTOM 500x400 must remain in-range');
  const blocked = await resolveRuntimeAppProduct(productId, { ...reached.result.selection, custom_w:499 });
  assert.equal(blocked.validation.status, 'INVALID', 'EW CUSTOM W499 must fail closed');
  assert.ok(blocked.validation.errors.some((row) => row.errorCode === 'CUSTOM_SIZE_OUT_OF_RANGE'), 'EW CUSTOM out-of-range error missing');
});

test('requested flow: STANDARD/CUSTOM transitions and upstream window changes clear stale downstream state', async () => {
  const productId = 'SER-LIXIL-TW';
  let result = await completeRequired(productId, { window_type:'SWT-LIX-TW-UNIT-HIKI' });
  assert.ok(result.selection.size, 'TW representative STANDARD size missing');
  result = await resolveRuntimeAppProduct(productId, { ...result.selection, size_mode:'CUSTOM' });
  assert.equal(result.selection.size, undefined, 'STANDARD size must clear when switching to CUSTOM');
  assert.ok(result.clearedFields.some((row) => row.field === 'size'), 'size clear evidence missing');
  assert.ok(field(result, 'custom_width') && field(result, 'custom_height'), 'CUSTOM W/H fields must appear');
  result = await resolveRuntimeAppProduct(productId, { ...result.selection, custom_width:1000, custom_height:1000 });
  result = await resolveRuntimeAppProduct(productId, { ...result.selection, size_mode:'STANDARD' });
  assert.equal(result.selection.custom_width, undefined, 'custom_width must clear when switching back to STANDARD');
  assert.equal(result.selection.custom_height, undefined, 'custom_height must clear when switching back to STANDARD');
  assert.ok(result.clearedFields.some((row) => row.field === 'custom_width'));
  assert.ok(result.clearedFields.some((row) => row.field === 'custom_height'));
  result = await completeRequired(productId, { window_type:'SWT-LIX-TW-UNIT-HIKI' });
  const changed = await resolveRuntimeAppProduct(productId, { ...result.selection, window_type:'SWT-LIX-TW-FIX-IN-MADO' });
  for (const key of ['size','exterior_color','interior_color','glass_base','glass_type','glass_detail','glass_function','option']) {
    assert.equal(changed.selection[key], undefined, `upstream window change must clear ${key}`);
  }
});
