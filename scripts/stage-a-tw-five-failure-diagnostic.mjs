import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const OUT = process.env.STAGE_A_TW_FAILURE_DIAGNOSTIC_OUT ?? 'artifacts/stage-a-tw-five-failure-diagnostic';
const HEAD_SHA = process.env.HEAD_SHA ?? null;
const PRODUCT_ID = 'SER-LIXIL-TW';
const RULE_WINDOWS = ['SWT-LIX-TW-TERRACE-DOOR','SWT-LIX-TW-SAIHU-KATTEGUCHI','SWT-LIX-TW-KATTEGUCHI'];
const PERF_WINDOWS = ['SWT-LIX-TW-HIGH-YOKO','SWT-LIX-TW-SHUT-HIKI'];
const HANDLED_CONDITION_KEYS = new Set(['窓種適用','建て方/区分','障子枚数','実寸W(mm)','ガラス大分類','電動仕様','選択状態']);
const SPEC_FIELDS = ['shutter_type','operation_type','grille_type','door_grille_type','handing','operator_position'];
const stable = (value) => Array.isArray(value) ? value.map(stable) : (!value || typeof value !== 'object' ? value : Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])));
const stableJson = (value) => JSON.stringify(stable(value));
const hash = (value) => createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
const enabled = (field) => (field?.values ?? []).filter((choice)=>choice.disabled !== true).map((choice)=>choice.value);
const unique = (values) => [...new Set(values)];

const runtime = await loadRegisteredRuntime('LIXIL','TW');
if (!runtime?.master) throw new Error('TW runtime master unavailable');
const master = runtime.master;
const allRules = master.sourceRows?.optionDependencies ?? [];

function normalizeRule(row) {
  const conditionKey = String(row['条件項目'] ?? '');
  const trigger = row['トリガーoption_id'];
  const target = row['対象option_id'];
  const handled = HANDLED_CONDITION_KEYS.has(conditionKey);
  const scalarTrigger = trigger === undefined || trigger === null || trigger === '' || trigger === '-' || ['string','number','boolean'].includes(typeof trigger);
  const hasTrigger = !(trigger === undefined || trigger === null || trigger === '' || trigger === '-');
  return {
    target: target ?? null,
    trigger: trigger ?? null,
    action: row['アクション'] ?? null,
    condition_key: conditionKey || null,
    condition_value: row['条件値'] ?? null,
    handled_by_canonical_engine: handled,
    ignored_by_canonical_engine: !handled,
    scalar_trigger: scalarTrigger,
    interaction_arity: hasTrigger ? 2 : 1,
    runtime_effect_class: !handled ? 'IGNORED_CONDITION_KEY' : hasTrigger ? 'PAIRWISE_TRIGGER_TARGET' : 'UNARY_TARGET_DENIAL',
  };
}

const ruleDiagnostics = RULE_WINDOWS.map((windowType) => {
  const rows = allRules.filter((row) => row?.active !== false && row['アクション'] === '選択不可' && String(row['対象シリーズ窓種ID'] ?? '').split('|').includes(windowType));
  const normalized = rows.map(normalizeRule);
  return {
    window_type: windowType,
    row_count: normalized.length,
    handled_row_count: normalized.filter((row)=>row.handled_by_canonical_engine).length,
    ignored_row_count: normalized.filter((row)=>row.ignored_by_canonical_engine).length,
    unary_row_count: normalized.filter((row)=>row.handled_by_canonical_engine && row.interaction_arity===1).length,
    pairwise_row_count: normalized.filter((row)=>row.handled_by_canonical_engine && row.interaction_arity===2).length,
    non_scalar_trigger_count: normalized.filter((row)=>!row.scalar_trigger).length,
    condition_keys: unique(normalized.map((row)=>row.condition_key)).sort(),
    rows: normalized,
    digest: hash(normalized),
  };
});

async function collectSpecFields(windowType) {
  const root = await resolveRuntimeAppProduct(PRODUCT_ID,{window_type:windowType});
  const rootFields = new Map((root.fields ?? []).map((field)=>[field.key,field]));
  const initial = {};
  for (const key of SPEC_FIELDS) {
    const values = enabled(rootFields.get(key));
    if (values.length) initial[key] = values;
  }
  const sizeMode = rootFields.get('size_mode');
  const base = { window_type:windowType };
  if (enabled(sizeMode).includes('STANDARD')) base.size_mode='STANDARD';
  const withMode = await resolveRuntimeAppProduct(PRODUCT_ID,base);
  const panelValues = enabled((withMode.fields ?? []).find((field)=>field.key==='panel_count'));
  const contexts = panelValues.length ? panelValues.map((panel_count)=>({...base,panel_count})) : [base];
  const sizeContexts=[];
  for (const context of contexts) {
    const resolved = await resolveRuntimeAppProduct(PRODUCT_ID,context);
    const sizes = enabled((resolved.fields ?? []).find((field)=>field.key==='size'));
    for (const size of sizes) sizeContexts.push({...context,size});
  }
  const observed = new Map(SPEC_FIELDS.map((key)=>[key,new Set()]));
  for (const [key,values] of Object.entries(initial)) for (const value of values) observed.get(key).add(String(value));
  for (const context of sizeContexts) {
    const resolved = await resolveRuntimeAppProduct(PRODUCT_ID,context);
    for (const key of SPEC_FIELDS) for (const value of enabled((resolved.fields ?? []).find((field)=>field.key===key))) observed.get(key).add(String(value));
  }
  const fields=[];
  for (const key of SPEC_FIELDS) {
    const values=[...observed.get(key)].sort();
    if (!values.length) continue;
    const groups = new Map();
    for (const value of values) {
      const behavior = (key==='operation_type' || key==='shutter_type')
        ? { electrical_class:String(value).includes('ELE') ? 'ELE' : 'NON_ELE' }
        : { identity:String(value) };
      const classKey=stableJson(behavior);
      if (!groups.has(classKey)) groups.set(classKey,{behavior,members:[]});
      groups.get(classKey).members.push(value);
    }
    fields.push({field:key,raw_value_count:values.length,behavior_class_count:groups.size,classes:[...groups.values()].map((group)=>({...group,member_count:group.members.length}))});
  }
  return {window_type:windowType,size_context_count:sizeContexts.length,fields};
}

const performanceDiagnostics=[];
for (const windowType of PERF_WINDOWS) performanceDiagnostics.push(await collectSpecFields(windowType));

const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  diagnostic_only:true,
  runtime_manifest_sha256:runtime.entry?.runtimeManifestSha256 ?? null,
  rule_windows:ruleDiagnostics,
  performance_windows:performanceDiagnostics,
  conclusion:'Exact Runtime diagnostic for the five failed TW windows. Rule rows are classified by the condition keys actually implemented by canonical-workbook-runtime-engine.mjs. Performance-window spec values are exhaustively collected from root and every STANDARD size context; operation/shutter values are partitioned only by the exact ELE/non-ELE predicate used by option resolution. No Product Master mutation.',
  gate_status:{qa_population_gate:'BLOCKED_DIAGNOSTIC_ONLY',app_integration_ready:false,release_input_gate:'BLOCKED'},
};
await mkdir(OUT,{recursive:true});
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log('TW_FIVE_FAILURE_DIAGNOSTIC=COMPLETE');
for (const row of ruleDiagnostics) console.log(`RULE_WINDOW window=${row.window_type} rows=${row.row_count} handled=${row.handled_row_count} ignored=${row.ignored_row_count} unary=${row.unary_row_count} pairwise=${row.pairwise_row_count} nonscalar=${row.non_scalar_trigger_count} keys=${row.condition_keys.join(',')}`);
for (const row of performanceDiagnostics) {
  for (const field of row.fields) console.log(`PERF_WINDOW window=${row.window_type} field=${field.field} raw=${field.raw_value_count} classes=${field.behavior_class_count} groups=${field.classes.map((group)=>`${stableJson(group.behavior)}:${group.member_count}`).join('|')}`);
}
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
