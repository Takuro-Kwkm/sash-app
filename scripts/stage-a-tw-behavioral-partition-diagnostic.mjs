import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const OUT = process.env.STAGE_A_TW_PARTITION_OUT ?? 'artifacts/stage-a-tw-behavioral-partition-diagnostic';
const HEAD_SHA = process.env.HEAD_SHA ?? null;
const TARGET = process.env.STAGE_A_TARGET_WINDOW ?? 'SWT-LIX-TW-TATE-GREMON-TF';
const PRODUCT_ID = 'SER-LIXIL-TW';

const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : (!value || typeof value !== 'object'
    ? value
    : Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, stable(v)])));
const stableJson = (value) => JSON.stringify(stable(value));
const hash = (value) => createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
const unique = (values) => [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))];
const enabled = (field) => (field?.values ?? []).filter((choice) => choice.disabled !== true).map((choice) => choice.value);

function panelCount(row) {
  if (String(row?.configuration ?? '').includes('4枚建') || /-4(?:$|\D)/.test(String(row?.nominal_w ?? ''))) return '4枚建';
  return '2枚建';
}

function categoryColumn(category) {
  return category === 'トリプルガラス' ? 'トリプル適用' : category === 'Low-E複層ガラス' ? 'ペア適用' : null;
}

function dimensionCondition(condition, dimensions) {
  const text = String(condition ?? '').normalize('NFKC')
    .replaceAll('≦','<=').replaceAll('≧','>=').replaceAll('≤','<=').replaceAll('≥','>=')
    .replace(/\s+/g,'');
  let saw = false;
  const comparisons = [];
  for (const match of text.matchAll(/(W|H)(<=|>=|<|>)(\d+(?:\.\d+)?)/gi)) comparisons.push([match[1], match[2], match[3]]);
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)(<=|>=|<|>)(W|H)/gi)) {
    const inverted = ({ '<':'>', '>':'<', '<=':'>=', '>=':'<=' })[match[2]];
    comparisons.push([match[3], inverted, match[1]]);
  }
  for (const [axis, operator, rawRight] of comparisons) {
    saw = true;
    const left = dimensions[axis.toUpperCase()];
    const right = Number(rawRight);
    if (!Number.isFinite(left)) return null;
    if (!({ '<':left<right, '>':left>right, '<=':left<=right, '>=':left>=right })[operator]) return false;
  }
  return saw ? true : null;
}

function filterSpecsByFormalRules(master, windowRow, sizeRow) {
  const specType = windowRow?.spec_type;
  if (!specType) return [];
  const specs = (master.sourceRows?.specs ?? []).filter((row) => row['窓種ID'] === windowRow.common_window_id && row['固有仕様種別'] === specType);
  const rules = (master.sourceRows?.specDimensionRules ?? []).filter((row) => row['シリーズ窓種ID'] === windowRow.id);
  const denied = new Set(rules.filter((row) => row['ルール種別'] === 'WINDOW_TYPE_DENY').map((row) => row['固有仕様ID']));
  let result = specs.filter((row) => !denied.has(row.spec_id));
  const allowOnly = rules.filter((row) => row['ルール種別'] === 'SIZE_ALLOW_ONLY' && row['size_id/条件'] === sizeRow.id);
  if (allowOnly.length) result = result.filter((row) => allowOnly.some((rule) => rule['固有仕様ID'] === row.spec_id));
  else {
    const dimensionRules = rules.filter((row) => row['ルール種別'] === 'DIMENSION_ALLOW');
    if (dimensionRules.length) {
      result = result.filter((row) => {
        const rule = dimensionRules.find((candidate) => candidate['固有仕様ID'] === row.spec_id);
        if (!rule) return false;
        const w = Number(sizeRow.actual_w), h = Number(sizeRow.actual_h);
        return (!rule['最小W'] || w >= Number(rule['最小W'])) && (!rule['最大W'] || w <= Number(rule['最大W'])) &&
          (!rule['最小H'] || h >= Number(rule['最小H'])) && (!rule['最大H'] || h <= Number(rule['最大H'])) &&
          (!rule['H/W上限'] || h / w <= Number(rule['H/W上限']));
      });
    }
  }
  return result.map((row) => row.spec_id).sort();
}

function groupRows(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const behavior = keyFn(row);
    const key = stableJson(behavior);
    if (!groups.has(key)) groups.set(key, { behavior, members: [] });
    groups.get(key).members.push(row);
  }
  return [...groups.values()].map((group) => ({
    behavior: group.behavior,
    member_count: group.members.length,
    member_ids: group.members.map((row) => row.id ?? row.value ?? row).map(String).sort(),
  })).sort((a,b) => stableJson(a.behavior).localeCompare(stableJson(b.behavior)));
}

const runtime = await loadRegisteredRuntime('LIXIL','TW');
if (!runtime?.master) throw new Error('TW runtime master unavailable');
const master = runtime.master;
const windowRow = (master.provider?.windows ?? []).find((row) => row.id === TARGET && row.active !== false);
if (!windowRow) throw new Error(`TW target window not found: ${TARGET}`);

const root = await resolveRuntimeAppProduct(PRODUCT_ID, { window_type: TARGET });
const sizeModeField = (root.fields ?? []).find((field) => field.key === 'size_mode');
const baseSelection = { window_type: TARGET };
if (enabled(sizeModeField).includes('STANDARD')) baseSelection.size_mode = 'STANDARD';
const withMode = await resolveRuntimeAppProduct(PRODUCT_ID, baseSelection);
const panelField = (withMode.fields ?? []).find((field) => field.key === 'panel_count');
const panels = enabled(panelField);
const sizeIds = new Set();
if (panels.length) {
  for (const panel of panels) {
    const resolved = await resolveRuntimeAppProduct(PRODUCT_ID, { ...baseSelection, panel_count: panel });
    for (const value of enabled((resolved.fields ?? []).find((field) => field.key === 'size'))) sizeIds.add(String(value));
  }
} else {
  for (const value of enabled((withMode.fields ?? []).find((field) => field.key === 'size'))) sizeIds.add(String(value));
}

const sizeById = new Map((master.provider?.sizes ?? []).map((row) => [String(row.id), row]));
const sizeRows = [...sizeIds].map((id) => sizeById.get(id)).filter(Boolean);
const relevantOptionRules = (master.sourceRows?.optionDependencies ?? []).filter((row) =>
  row?.active !== false && row['アクション'] === '選択不可' && String(row['対象シリーズ窓種ID'] ?? '').split('|').includes(TARGET));
const wConditions = unique(relevantOptionRules.filter((row) => row['条件項目'] === '実寸W(mm)').map((row) => String(row['条件値'] ?? ''))).sort();

const sizeGroups = groupRows(sizeRows, (row) => {
  const W = Number(row.actual_w), H = Number(row.actual_h);
  const configuration = String(row.configuration ?? '');
  const optionWVector = Object.fromEntries(wConditions.map((condition) => [condition, dimensionCondition(`W${condition}`, { W, H })]));
  return {
    panel_count: panelCount(row),
    spec_allowed_ids: filterSpecsByFormalRules(master, windowRow, row),
    screen_midrail_class: configuration.startsWith('マド') ? 'MADO_FORCE_NO_MIDRAIL' : 'GENERAL',
    option_terrace_class: configuration.includes('テラス') ? 'TERRACE' : 'NON_TERRACE',
    derived_option_height_class: configuration.includes('大壁和室') ? 'OOYA_WASHITSU' : configuration.includes('マド') ? (H < 571 ? 'MADO_H_LT_571' : 'MADO_H_GE_571') : configuration.includes('テラス') ? 'TERRACE' : 'OTHER',
    option_w_predicates: optionWVector,
  };
});

const applicability = (master.sourceRows?.glassApplicability ?? []).find((row) => row['シリーズ窓種ID'] === TARGET);
const glassBases = unique((master.provider?.glass ?? []).filter((row) => row.active !== false).map((row) => row.category)).filter((category) => {
  if (!applicability) return false;
  return (category === 'トリプルガラス' ? applicability['トリプルガラス'] : applicability['複層ガラス']) === '可';
});

const glassTypePartitions = [];
const glassDetailPartitions = [];
for (const base of glassBases) {
  const column = categoryColumn(base);
  const types = (master.sourceRows?.glassTypes ?? []).filter((row) => row[column] === '可' || row[column] === '要照合').map((row) => row.appearance_id);
  const typeRows = types.map((value) => ({ id: value, value }));
  const typeGroups = groupRows(typeRows, (row) => {
    const functions = (master.sourceRows?.glassFunctions ?? [])
      .filter((item) => item[column] === '可' || item[column] === '要照合')
      .filter((item) => row.value !== 'GLA-TW-MILKY' || item.option_id === 'GLF-TW-SAFE-LAM')
      .map((item) => item.option_id).sort();
    return { glass_function_allowed_ids: functions };
  });
  glassTypePartitions.push({ glass_base: base, raw_value_count: typeRows.length, behavior_class_count: typeGroups.length, classes: typeGroups });

  const baseRows = (master.provider?.glass ?? []).filter((row) => row.active !== false && row.category === base);
  const details = unique(baseRows.map((row) => row.low_e));
  const detailRows = details.map((value) => ({ id: value, value }));
  const detailGroups = groupRows(detailRows, (row) => {
    const rows = baseRows.filter((item) => item.low_e === row.value);
    const spacers = unique(rows.map((item) => item.spacer)).sort();
    return {
      spacer_to_gas: Object.fromEntries(spacers.map((spacer) => [spacer, unique(rows.filter((item) => item.spacer === spacer).map((item) => item.gas)).sort()])),
    };
  });
  glassDetailPartitions.push({ glass_base: base, raw_value_count: detailRows.length, behavior_class_count: detailGroups.length, classes: detailGroups });
}

const optionRuleShape = relevantOptionRules.map((row) => ({
  target: row['対象option_id'],
  trigger: row['トリガーoption_id'],
  condition_key: row['条件項目'],
  condition_value: row['条件値'],
}));

const report = {
  exact_head_sha: HEAD_SHA,
  task_classification: 'NON-PRODUCT-MASTER',
  product_master_mutation: 0,
  diagnostic_only: true,
  proof_model_version: 'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1',
  projection_model_version: 'TW_BEHAVIORAL_PARTITION_DIAGNOSTIC_V1',
  runtime_manifest_sha256: runtime.entry?.runtimeManifestSha256 ?? null,
  product_id: PRODUCT_ID,
  window_type: TARGET,
  size_partition: {
    ui_exposed_standard_size_count: sizeRows.length,
    behavior_class_count: sizeGroups.length,
    compression_ratio: sizeRows.length ? Number((sizeGroups.length / sizeRows.length).toFixed(6)) : null,
    option_w_conditions: wConditions,
    classes: sizeGroups,
    digest: hash(sizeGroups),
  },
  glass_type_partitions: glassTypePartitions.map((row) => ({ ...row, digest: hash(row.classes) })),
  glass_detail_partitions: glassDetailPartitions.map((row) => ({ ...row, digest: hash(row.classes) })),
  option_rule_shape: {
    active_selection_denial_rule_count: optionRuleShape.length,
    digest: hash(optionRuleShape),
    rows: optionRuleShape,
  },
  conclusion: 'Diagnostic only. These are exact partitions of all UI-exposed STANDARD sizes and all Runtime-declared glass type/detail values for the target window. No sampling and no Product Master mutation. They are evidence for a future weighted behavioral-projection counter, not a coverage PASS.',
  gate_status: {
    qa_population_gate: 'BLOCKED_DIAGNOSTIC_ONLY',
    custom_size_coverage_gate: 'BLOCKED_CONTINUOUS_PARTITION_NOT_PROVEN',
    app_integration_ready: false,
    release_input_gate: 'BLOCKED',
  },
};

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`TW_PARTITION_DIAGNOSTIC=COMPLETE`);
console.log(`WINDOW=${TARGET}`);
console.log(`UI_EXPOSED_STANDARD_SIZE_COUNT=${report.size_partition.ui_exposed_standard_size_count}`);
console.log(`SIZE_BEHAVIOR_CLASS_COUNT=${report.size_partition.behavior_class_count}`);
for (const row of report.glass_type_partitions) console.log(`GLASS_TYPE_PARTITION base=${row.glass_base} raw=${row.raw_value_count} classes=${row.behavior_class_count}`);
for (const row of report.glass_detail_partitions) console.log(`GLASS_DETAIL_PARTITION base=${row.glass_base} raw=${row.raw_value_count} classes=${row.behavior_class_count}`);
console.log(`OPTION_RULE_COUNT=${report.option_rule_shape.active_selection_denial_rule_count}`);
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
