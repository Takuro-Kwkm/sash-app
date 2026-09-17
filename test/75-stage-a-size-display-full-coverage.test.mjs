import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';

const PRODUCTS = [
  { id:'SER-LIX-SAMOS2H', manufacturer:'LIXIL', series:'サーモスⅡ-H', windows:17 },
  { id:'SER-LIX-SAMOSL', manufacturer:'LIXIL', series:'サーモスL', windows:17 },
  { id:'SER-LIX-EW', manufacturer:'LIXIL', series:'EW', windows:15 },
  { id:'SER-LIXIL-TW', manufacturer:'LIXIL', series:'TW', windows:25 },
  { id:'SER-YKK-APW430', manufacturer:'YKK AP', series:'APW430', windows:25 },
  { id:'SER-YKK-APW431', manufacturer:'YKK AP', series:'APW431', windows:6 },
];

const TECHNICAL_KEYS = new Set(['construction','legacyConstruction','legacyConfiguration','internal_construction']);
const DIMENSION_KEYS = new Set(['size','custom_width','custom_height','custom_w','custom_h']);
const present = (value) => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
const normalizeValue = (field, value) => field.dataType === 'MULTI_ENUM' ? [value] : value;
const stableSelection = (selection) => Object.fromEntries(Object.entries(selection ?? {}).sort(([a],[b]) => a.localeCompare(b)).map(([key,value]) => [key, Array.isArray(value) ? [...value].map(String).sort() : value]));
const selectionKey = (selection) => JSON.stringify(stableSelection(selection));
const choiceValues = (field) => (field?.values ?? []).filter((choice) => choice.disabled !== true).map((choice) => choice.value);
const sizeField = (result) => result.fields.find((field) => field.key === 'size');
const modeField = (result) => result.fields.find((field) => field.key === 'size_mode');

function nextPreDimensionField(result) {
  const terminalIndex = result.fields.findIndex((field) => field.key === 'size');
  const limit = terminalIndex >= 0 ? terminalIndex : result.fields.length;
  const candidates = result.fields.slice(0,limit).filter((field) =>
    field.key !== 'window_type' && field.key !== 'size_mode' && !DIMENSION_KEYS.has(field.key) && !TECHNICAL_KEYS.has(field.key) &&
    !present(result.selection?.[field.key]) && choiceValues(field).length > 0);
  return candidates.find((field) => field.required) ?? candidates[0] ?? null;
}

async function discoverStandardFrontiers(product, windowValue) {
  const queue = [{ window_type: windowValue }];
  const visited = new Set();
  const frontiers = [];
  const deadEnds = [];
  while (queue.length) {
    if (visited.size > 12000) throw new Error(`${product.id}/${windowValue}: STANDARD frontier exploration exceeded 12000 states`);
    const input = queue.shift();
    const key = selectionKey(input);
    if (visited.has(key)) continue;
    visited.add(key);
    const result = await resolveRuntimeAppProduct(product.id,input);
    const technical = result.fields.find((field) => TECHNICAL_KEYS.has(field.key));
    assert.equal(technical,undefined,`${product.series}/${windowValue}: technical field leaked into UI: ${technical?.key}`);
    const mode = modeField(result);
    const modes = choiceValues(mode).map(String);
    if (mode && modes.includes('STANDARD') && String(result.selection?.size_mode) !== 'STANDARD') {
      queue.push({ ...result.selection, size_mode:'STANDARD' });
      continue;
    }
    if (mode && modes.length && !modes.includes('STANDARD')) {
      deadEnds.push({ selection:stableSelection(result.selection), reason:'STANDARD_NOT_EXPOSED_IN_RUNTIME' });
      continue;
    }
    const upstream = nextPreDimensionField(result);
    if (upstream) {
      for (const value of choiceValues(upstream)) queue.push({ ...result.selection, [upstream.key]:normalizeValue(upstream,value) });
      continue;
    }
    const size = sizeField(result);
    if (size?.values?.length) {
      frontiers.push({ selection:stableSelection(result.selection), field:size });
      continue;
    }
    deadEnds.push({ selection:stableSelection(result.selection), reason:'NO_STANDARD_SIZE_TERMINAL' });
  }
  return { frontiers:[...new Map(frontiers.map((row)=>[selectionKey(row.selection),row])).values()], deadEnds, explored:visited.size };
}

function exactSourceCode(row) {
  if (!row || typeof row !== 'object') return null;
  for (const key of ['callCode','call_code','sizeCode','size_code','呼称寸法']) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) return String(row[key]).trim();
  }
  const id = String(row.id ?? row.size_id ?? row.value_id ?? row.canonical_value ?? '');
  const five = id.match(/(?:^|[-_])(\d{5})$/);
  if (five) return five[1];
  const wRaw = row.nominal_w ?? row.nominalW ?? row.call_w ?? row.callW ?? row['呼称W'];
  const hRaw = row.nominal_h ?? row.nominalH ?? row.call_h ?? row.callH ?? row['呼称H'];
  const w = wRaw === undefined || wRaw === null ? '' : String(wRaw).trim();
  const h = hRaw === undefined || hRaw === null ? '' : String(hRaw).trim();
  if (!w || !h) return null;
  if (w.includes('-')) return `${w}-${h}`;
  if ((typeof wRaw === 'string' && /^0\d+/.test(w)) || (typeof hRaw === 'string' && /^0\d+/.test(h))) return `${w}${h}`;
  if (id.endsWith(`-${w}-${h}`)) return `${w}-${h}`;
  return null;
}

function sourceSizeMap(runtime) {
  const map = new Map();
  const candidates = [
    ...(runtime?.master?.provider?.sizes ?? []),
    ...(runtime?.master?.canonicalWorkbook?.sizes ?? []),
    ...(runtime?.master?.sizes ?? []),
  ];
  for (const row of candidates) {
    for (const key of ['id','size_id','value_id','canonical_value']) {
      const value = row?.[key];
      if (value !== undefined && value !== null && value !== '') map.set(String(value),row);
    }
  }
  return map;
}

function assertSizeFrontier(product, windowValue, frontier, sourceById) {
  const labels = new Map();
  for (const choice of frontier.field.values) {
    const context = `${product.series}/${windowValue}/${JSON.stringify(frontier.selection)}/${choice.value}`;
    const label = String(choice.displayLabel ?? '');
    const match = label.match(/^(\S+) ｜ W (\d+) × H (\d+)$/u);
    assert.ok(match,`${context}: malformed STANDARD size label: ${label}`);
    const [,callCode,w,h] = match;
    assert.ok(choice.sizeMetadata,`${context}: sizeMetadata missing`);
    assert.equal(String(choice.sizeMetadata.callCode),callCode,`${context}: label call code and sizeMetadata.callCode differ`);
    assert.equal(Number(choice.sizeMetadata.actualW),Number(w),`${context}: label W and sizeMetadata.actualW differ`);
    assert.equal(Number(choice.sizeMetadata.actualH),Number(h),`${context}: label H and sizeMetadata.actualH differ`);
    const prior = labels.get(label);
    assert.equal(prior,undefined,`${product.series}/${windowValue}/${JSON.stringify(frontier.selection)}: duplicate visible size label ${label} from ${prior} and ${choice.value}`);
    labels.set(label,choice.value);
    const source = sourceById.get(String(choice.value));
    const formalCode = exactSourceCode(source);
    if (formalCode) assert.equal(callCode,formalCode,`${context}: formal Runtime call code ${formalCode} was not preserved`);
  }
}

test('Stage A size display full coverage: all 6 series × all 105 windows × all STANDARD selector frontiers', async () => {
  let baseWindows = 0;
  let standardWindows = 0;
  let frontierCount = 0;
  let sizeChoiceCount = 0;
  const perSeries = [];
  for (const product of PRODUCTS) {
    const runtime = await loadRegisteredRuntime(product.manufacturer,product.series);
    const initial = await resolveRuntimeAppProduct(product.id,{});
    const windows = initial.fields.find((field)=>field.key==='window_type')?.values ?? [];
    assert.equal(windows.length,product.windows,`${product.series}: window count drift`);
    const sourceById = sourceSizeMap(runtime);
    let seriesStandardWindows = 0;
    let seriesFrontiers = 0;
    let seriesSizes = 0;
    for (const window of windows) {
      baseWindows += 1;
      const discovery = await discoverStandardFrontiers(product,window.value);
      if (!discovery.frontiers.length) {
        assert.ok(discovery.deadEnds.length > 0,`${product.series}/${window.value}: no STANDARD frontier and no explicit dead end`);
        continue;
      }
      standardWindows += 1;
      seriesStandardWindows += 1;
      for (const frontier of discovery.frontiers) {
        frontierCount += 1;
        seriesFrontiers += 1;
        sizeChoiceCount += frontier.field.values.length;
        seriesSizes += frontier.field.values.length;
        assertSizeFrontier(product,window.value,frontier,sourceById);
      }
    }
    perSeries.push({series:product.series,baseWindows:windows.length,standardWindows:seriesStandardWindows,frontiers:seriesFrontiers,sizeChoices:seriesSizes});
  }
  assert.equal(baseWindows,105,'Stage A BASE_WINDOW_COUNT must remain 105');
  assert.equal(standardWindows,103,'Stage A STANDARD_WINDOW_COUNT must remain 103');
  assert.ok(frontierCount > 0);
  assert.ok(sizeChoiceCount > 0);
  console.log('STAGE_A_SIZE_DISPLAY_FULL_COVERAGE=' + JSON.stringify({baseWindows,standardWindows,frontierCount,sizeChoiceCount,perSeries}));
});
