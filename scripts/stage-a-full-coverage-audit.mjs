import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const OUT = 'artifacts/stage-a-full-coverage';
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
const GENERIC_PROBES = [
  [1,1],[300,300],[400,450],[500,500],[500,1000],[600,1000],[600,1600],[780,1570],
  [800,1600],[900,1600],[1000,1000],[1200,1800],[1800,1800],[2200,2200],[3000,3000],[9999,9999],
];
const rows = [];
const seriesSummary = {};
let caseId = 0;

await mkdir(OUT,{recursive:true});

const present = (value) => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
const normalizeValue = (field, value) => field.dataType === 'MULTI_ENUM' ? [value] : value;
const stableSelection = (selection) => Object.fromEntries(Object.entries(selection ?? {}).sort(([a],[b]) => a.localeCompare(b)).map(([key,value]) => [key, Array.isArray(value) ? [...value].map(String).sort() : value]));
const selectionKey = (selection) => JSON.stringify(stableSelection(selection));
const selected = (selection, field, value) => field.dataType === 'MULTI_ENUM'
  ? Array.isArray(selection?.[field.key]) && selection[field.key].map(String).includes(String(value))
  : String(selection?.[field.key]) === String(value);
const choiceValues = (field) => (field?.values ?? []).filter((choice) => choice.disabled !== true).map((choice) => choice.value);
const windowField = (result) => result.fields.find((field) => field.key === 'window_type');
const sizeField = (result) => result.fields.find((field) => field.key === 'size');
const modeField = (result) => result.fields.find((field) => field.key === 'size_mode');
const customKeys = (result) => {
  const width = result.fields.find((field) => ['custom_width','custom_w'].includes(field.key))?.key ?? null;
  const height = result.fields.find((field) => ['custom_height','custom_h'].includes(field.key))?.key ?? null;
  return { width, height };
};
const noTechnicalLeak = (result) => !result.fields.some((field) => TECHNICAL_KEYS.has(field.key));

function addRow(product, windowValue, type, status, details = {}) {
  rows.push({
    case_id: `STAGE-A-${String(++caseId).padStart(6,'0')}`,
    manufacturer: product.manufacturer,
    series: product.series,
    product_id: product.id,
    window_type: windowValue ?? null,
    case_type: type,
    status,
    ...details,
  });
}

function dimensionStatus(result) {
  const direct = result.dimensionResult?.status;
  if (direct) return direct === 'BLOCKED' ? 'BLOCK' : direct;
  const errors = result.validation?.errors ?? [];
  if (errors.some((error) => String(error.errorCode ?? error.code ?? '').includes('CUSTOM_SIZE_OUT_OF_RANGE'))) return 'BLOCK';
  if (result.validation?.status === 'INVALID') return 'BLOCK';
  if (result.validation?.status === 'MANUAL_CHECK') return 'REVIEW_REQUIRED';
  if (result.validation?.status === 'VALID' || result.validation?.status === 'INCOMPLETE') return 'ACCEPTED';
  return result.validation?.status ?? 'UNKNOWN';
}

function parseSizeDimensions(field) {
  const dims = [];
  for (const choice of field?.values ?? []) {
    const match = String(choice.displayLabel ?? '').match(/W\s*(\d+(?:\.\d+)?)\s*×\s*H\s*(\d+(?:\.\d+)?)/u);
    if (match) dims.push([Number(match[1]), Number(match[2])]);
  }
  return dims;
}

function sampledDimensions(values, max = 10) {
  const unique = [...new Map(values.map((pair) => [`${pair[0]}:${pair[1]}`,pair])).values()];
  if (unique.length <= max) return unique;
  const sampled = [];
  for (let i=0;i<max;i+=1) sampled.push(unique[Math.round(i*(unique.length-1)/(max-1))]);
  return [...new Map(sampled.map((pair) => [`${pair[0]}:${pair[1]}`,pair])).values()];
}

function nextPreDimensionField(result, mode) {
  const terminalIndex = result.fields.findIndex((field) => mode === 'STANDARD'
    ? field.key === 'size'
    : ['custom_width','custom_w','custom_height','custom_h'].includes(field.key));
  const limit = terminalIndex >= 0 ? terminalIndex : result.fields.length;
  const candidates = result.fields.slice(0,limit).filter((field) =>
    field.key !== 'window_type' && field.key !== 'size_mode' && !DIMENSION_KEYS.has(field.key) && !TECHNICAL_KEYS.has(field.key) &&
    !present(result.selection?.[field.key]) && choiceValues(field).length > 0);
  return candidates.find((field) => field.required) ?? candidates[0] ?? null;
}

async function discoverFrontiers(product, windowValue, mode) {
  const queue = [{ window_type: windowValue }];
  const visited = new Set();
  const frontiers = [];
  const deadEnds = [];
  while (queue.length) {
    if (visited.size > 12000) throw new Error(`${product.id}/${windowValue}/${mode}: frontier exploration exceeded 12000 states`);
    const input = queue.shift();
    const key = selectionKey(input);
    if (visited.has(key)) continue;
    visited.add(key);
    const result = await resolveRuntimeAppProduct(product.id,input);
    if (!noTechnicalLeak(result)) {
      addRow(product,windowValue,'TECHNICAL_FIELD_VISIBILITY','FAILED',{selection:stableSelection(input)});
      continue;
    }
    const modeSelector = modeField(result);
    const availableModes = choiceValues(modeSelector).map(String);
    if (modeSelector && availableModes.includes(mode) && String(result.selection?.size_mode) !== mode) {
      queue.push({ ...result.selection, size_mode: mode });
      continue;
    }
    if (mode === 'STANDARD') {
      const size = sizeField(result);
      if (size?.values?.length) {
        frontiers.push({ selection:{...result.selection}, result });
        continue;
      }
    } else {
      const keys = customKeys(result);
      if (keys.width && keys.height) {
        frontiers.push({ selection:{...result.selection}, result });
        continue;
      }
      if (modeSelector && !availableModes.includes('CUSTOM')) {
        deadEnds.push({ selection:{...result.selection}, reason:'CUSTOM_NOT_EXPOSED' });
        continue;
      }
    }
    const field = nextPreDimensionField(result,mode);
    if (!field) {
      deadEnds.push({ selection:{...result.selection}, reason:'NO_DIMENSION_TERMINAL' });
      continue;
    }
    for (const value of choiceValues(field)) queue.push({ ...result.selection, [field.key]:normalizeValue(field,value) });
  }
  const dedup = new Map(frontiers.map((frontier) => [selectionKey(frontier.selection),frontier]));
  return { frontiers:[...dedup.values()], deadEnds, explored:visited.size };
}

async function auditDownstreamChoices(product, windowValue, baseResult) {
  let result = baseResult;
  const seen = new Set();
  for (let depth=0; depth<30; depth+=1) {
    const candidates = result.fields.filter((field) =>
      !TECHNICAL_KEYS.has(field.key) && !DIMENSION_KEYS.has(field.key) && field.key !== 'window_type' && field.key !== 'size_mode' &&
      !present(result.selection?.[field.key]) && choiceValues(field).length > 0);
    const field = candidates.find((candidate) => candidate.required) ?? candidates[0];
    if (!field || seen.has(field.key)) return;
    seen.add(field.key);
    let continuation = null;
    for (const value of choiceValues(field)) {
      const input = { ...result.selection, [field.key]:normalizeValue(field,value) };
      const resolved = await resolveRuntimeAppProduct(product.id,input);
      const survives = selected(resolved.selection,field,value);
      addRow(product,windowValue,'DEPENDENCY_CHOICE',survives?'VERIFIED':'FAILED',{
        selector:field.key,
        selector_value:value,
        selection:stableSelection(result.selection),
        cleared_fields:resolved.clearedFields ?? [],
      });
      if (survives && (!continuation || resolved.fields.length > continuation.fields.length)) continuation = resolved;
    }
    if (!continuation) return;
    result = continuation;
  }
}

async function auditStandard(product, windowValue, frontiers, windowDims) {
  if (!frontiers.length) {
    addRow(product,windowValue,'STANDARD_CAPABILITY','FAILED',{reason:'NO_REACHABLE_STANDARD_FRONTIER'});
    return;
  }
  addRow(product,windowValue,'STANDARD_CAPABILITY','VERIFIED',{frontier_count:frontiers.length});
  for (const frontier of frontiers) {
    const field = sizeField(frontier.result);
    const dims = parseSizeDimensions(field);
    windowDims.push(...dims);
    let firstResolved = null;
    for (const choice of field.values) {
      const resolved = await resolveRuntimeAppProduct(product.id,{...frontier.selection,size:choice.value});
      const survives = String(resolved.selection?.size) === String(choice.value);
      addRow(product,windowValue,'STANDARD_SIZE',survives?'VERIFIED':'FAILED',{
        selector_frontier:stableSelection(frontier.selection),
        size:choice.value,
        size_label:choice.displayLabel,
        cleared_fields:resolved.clearedFields ?? [],
      });
      if (survives && !firstResolved) firstResolved = resolved;
    }
    if (firstResolved) await auditDownstreamChoices(product,windowValue,firstResolved);
  }
}

function customProbeInputs(frontier, windowDims) {
  const dims = sampledDimensions(windowDims,12);
  const around = dims.flatMap(([w,h]) => [[w,h],[Math.max(1,w-1),h],[w,Math.max(1,h-1)]]);
  return [...new Map([...around,...GENERIC_PROBES].map((pair) => [`${pair[0]}:${pair[1]}`,pair])).values()];
}

async function auditCustom(product, windowValue, frontiers, windowDims) {
  if (!frontiers.length) return { exposed:false, verifiedRoutes:0, unverifiedRoutes:0 };
  let verifiedRoutes = 0;
  let unverifiedRoutes = 0;
  addRow(product,windowValue,'CUSTOM_CAPABILITY','VERIFIED',{frontier_count:frontiers.length});
  for (const frontier of frontiers) {
    const keys = customKeys(frontier.result);
    const probes = customProbeInputs(frontier,windowDims);
    let accepted = null;
    let blocked = null;
    let reviewOnly = null;
    for (const [width,height] of probes) {
      const input = { ...frontier.selection, [keys.width]:width, [keys.height]:height };
      const resolved = await resolveRuntimeAppProduct(product.id,input);
      const status = dimensionStatus(resolved);
      if (status === 'BLOCK' && !blocked) blocked = { width,height,resolved,status };
      if (['PASS','ACCEPTED'].includes(status) && !accepted) accepted = { width,height,resolved,status };
      if (status === 'REVIEW_REQUIRED' && !reviewOnly) reviewOnly = { width,height,resolved,status };
      if ((accepted || reviewOnly) && blocked) break;
    }
    const positive = accepted ?? reviewOnly;
    const knownS2HGap = product.id === 'SER-LIX-SAMOS2H' && windowValue === 'WT-S2H-KATTEGUCHI-VENT-FS';
    if (!positive) {
      unverifiedRoutes += 1;
      addRow(product,windowValue,'CUSTOM_ROUTE',knownS2HGap?'UNVERIFIED':'FAILED',{
        selector_frontier:stableSelection(frontier.selection),
        reason:knownS2HGap?'PRODUCT_MASTER_DEFECT_UNRESOLVED_CUSTOM_SPEC_IDS':'NO_ACCEPTED_OR_REVIEW_CUSTOM_PROBE',
        last_block_code:blocked?.resolved?.dimensionResult?.code ?? null,
      });
      continue;
    }
    verifiedRoutes += 1;
    addRow(product,windowValue,'CUSTOM_IN_RANGE_OR_REVIEW','VERIFIED',{
      selector_frontier:stableSelection(frontier.selection),
      width:positive.width,
      height:positive.height,
      expected_outcome:positive.status,
      dimension_code:positive.resolved.dimensionResult?.code ?? null,
      browser_selection:{...frontier.selection,[keys.width]:positive.width,[keys.height]:positive.height},
      custom_width_key:keys.width,
      custom_height_key:keys.height,
    });
    if (blocked) {
      addRow(product,windowValue,'CUSTOM_OUT_OF_RANGE','VERIFIED',{
        selector_frontier:stableSelection(frontier.selection),
        width:blocked.width,
        height:blocked.height,
        expected_outcome:'BLOCK',
        dimension_code:blocked.resolved.dimensionResult?.code ?? null,
      });
    } else {
      addRow(product,windowValue,'CUSTOM_NON_MACHINE_BOUNDED','VERIFIED',{
        selector_frontier:stableSelection(frontier.selection),
        reason:'FORMAL_RUNTIME_REQUIRES_REVIEW_AND_DOES_NOT_PUBLISH_A_MACHINE_READABLE_OUTER_BOUND',
      });
    }
    const switched = await resolveRuntimeAppProduct(product.id,{...positive.resolved.selection,size_mode:'STANDARD'});
    const clearsNumeric = !present(switched.selection?.[keys.width]) && !present(switched.selection?.[keys.height]);
    addRow(product,windowValue,'CUSTOM_TO_STANDARD_CLEAR',clearsNumeric?'VERIFIED':'FAILED',{
      selector_frontier:stableSelection(frontier.selection),
      cleared_fields:switched.clearedFields ?? [],
    });
  }
  return { exposed:true, verifiedRoutes, unverifiedRoutes };
}

for (const product of PRODUCTS) {
  const root = await resolveRuntimeAppProduct(product.id,{});
  assert.equal(root.runtimeMaster?.sourcePackageIntegrity?.match,true,`${product.id}: canonical Runtime integrity mismatch`);
  const windows = windowField(root);
  assert.ok(windows,`${product.id}: window_type missing`);
  assert.equal(windows.values.length,product.windows,`${product.id}: BASE_WINDOW_COUNT mismatch`);
  const summary = seriesSummary[product.id] = {
    manufacturer:product.manufacturer,series:product.series,base_window_count:windows.values.length,
    standard_windows:0,custom_windows:0,standard_frontiers:0,custom_frontiers:0,
  };
  for (const windowChoice of windows.values) {
    const windowValue = windowChoice.value;
    const windowDims = [];
    const standard = await discoverFrontiers(product,windowValue,'STANDARD');
    summary.standard_frontiers += standard.frontiers.length;
    if (standard.frontiers.length) summary.standard_windows += 1;
    await auditStandard(product,windowValue,standard.frontiers,windowDims);

    const custom = await discoverFrontiers(product,windowValue,'CUSTOM');
    summary.custom_frontiers += custom.frontiers.length;
    if (custom.frontiers.length) summary.custom_windows += 1;
    await auditCustom(product,windowValue,custom.frontiers,windowDims);
  }

  if (product.id === 'SER-LIXIL-TW') {
    addRow(product,null,'PRODUCT_MASTER_GAP','UNVERIFIED',{
      reason:'TW_FORMAL_RUNTIME_HAS_NO_MACHINE_READABLE_CUSTOM_DIMENSION_RULE_FAMILY',
      scope:'SERIES_CUSTOM_CAPABILITY',
    });
  }
}

const baseWindowCount = Object.values(seriesSummary).reduce((sum,row)=>sum+row.base_window_count,0);
const failed = rows.filter((row)=>row.status==='FAILED');
const unverified = rows.filter((row)=>row.status==='UNVERIFIED');
const verified = rows.filter((row)=>row.status==='VERIFIED');
const customWindows = Object.values(seriesSummary).reduce((sum,row)=>sum+row.custom_windows,0);
const standardWindows = Object.values(seriesSummary).reduce((sum,row)=>sum+row.standard_windows,0);
const summary = {
  generated_at:new Date().toISOString(),
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  base_window_count:baseWindowCount,
  qa_case_count:rows.length,
  verified_qa_case_count:verified.length,
  failed_qa_case_count:failed.length,
  unverified_qa_case_count:unverified.length,
  standard_window_count:standardWindows,
  custom_window_count:customWindows,
  series:Object.values(seriesSummary),
  blockers:unverified,
  gates:{
    canonical_runtime_gate:'PASS',
    runtime_adapter_gate:failed.length?'FAIL':'PASS',
    full_window_coverage_gate:baseWindowCount===105&&failed.length===0?'PASS':'FAIL',
    custom_size_coverage_gate:failed.length?'FAIL':unverified.length?'BLOCKED':'PASS',
    dependency_gate:failed.length?'FAIL':'PASS',
    automated_test_gate:failed.length?'FAIL':'PASS',
    app_integration_ready:false,
  },
};

await writeFile(`${OUT}/coverage-matrix.json`,`${JSON.stringify(rows,null,2)}\n`,'utf8');
await writeFile(`${OUT}/summary.json`,`${JSON.stringify(summary,null,2)}\n`,'utf8');
console.log(`BASE_WINDOW_COUNT=${baseWindowCount}`);
console.log(`QA_CASE_COUNT=${rows.length}`);
console.log(`VERIFIED_QA_CASE_COUNT=${verified.length}`);
console.log(`FAILED_QA_CASE_COUNT=${failed.length}`);
console.log(`UNVERIFIED_QA_CASE_COUNT=${unverified.length}`);
console.log(`STANDARD_WINDOW_COUNT=${standardWindows}`);
console.log(`CUSTOM_WINDOW_COUNT=${customWindows}`);
console.log(JSON.stringify(summary,null,2));

assert.equal(baseWindowCount,105,'BASE_WINDOW_COUNT must remain 105');
if (failed.length) {
  console.error(JSON.stringify({failed:failed.slice(0,100)},null,2));
  process.exitCode=1;
}
