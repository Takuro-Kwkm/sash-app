import { mkdir, writeFile } from 'node:fs/promises';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const OUT = process.env.STAGE_A_SAMOS_OPTIONS_DIAG_OUT ?? 'artifacts/stage-a-samos-options-self-reference-diagnostic';
const HEAD_SHA = process.env.HEAD_SHA ?? null;
const TARGET_FIELD = 'options';

const SERIES = [
  { manufacturer: 'LIXIL', series: 'サーモスⅡ-H', product_id: 'SER-LIX-SAMOS2H' },
  { manufacturer: 'LIXIL', series: 'サーモスL', product_id: 'SER-LIX-SAMOSL' },
];

function selectorMentions(selector, key) {
  if (!selector || typeof selector !== 'object') return false;
  if (Array.isArray(selector)) return selector.some((one) => selectorMentions(one, key));
  for (const [name, value] of Object.entries(selector)) {
    if (name === key) return true;
    if (['any','anyOf','all','allOf','not'].includes(name) && selectorMentions(value, key)) return true;
  }
  return false;
}

function predicatesFor(selector, key, path = '$') {
  const out = [];
  if (!selector || typeof selector !== 'object') return out;
  if (Array.isArray(selector)) {
    selector.forEach((one, index) => out.push(...predicatesFor(one, key, `${path}[${index}]`)));
    return out;
  }
  for (const [name, value] of Object.entries(selector)) {
    if (name === key) out.push({ path: `${path}.${name}`, predicate: value });
    if (['any','anyOf','all','allOf','not'].includes(name)) out.push(...predicatesFor(value, key, `${path}.${name}`));
  }
  return out;
}

function scanRuleSets(node, key, path = '$.ruleSets', rows = []) {
  if (!node || typeof node !== 'object') return rows;
  if (Array.isArray(node)) {
    node.forEach((one, index) => scanRuleSets(one, key, `${path}[${index}]`, rows));
    return rows;
  }
  const selectorHit = selectorMentions(node.selector, key);
  const whenHit = selectorMentions(node.when, key);
  if (selectorHit || whenHit) {
    rows.push({
      path,
      id: node.id ?? node.rule_id ?? node.ruleId ?? null,
      type: node.type ?? node.rule_type ?? null,
      selector: selectorHit ? node.selector : null,
      when: whenHit ? node.when : null,
      predicates: [
        ...(selectorHit ? predicatesFor(node.selector, key, `${path}.selector`) : []),
        ...(whenHit ? predicatesFor(node.when, key, `${path}.when`) : []),
      ],
      mode: node.mode ?? node.evaluation ?? null,
      action: node.action ?? node.effect?.type ?? null,
      effect: node.effect ?? null,
      targetField: node.targetField ?? node.target_field ?? null,
      targetValue: node.targetValue ?? node.target_value ?? null,
    });
  }
  for (const [name, value] of Object.entries(node)) {
    if (name === 'selector' || name === 'when') continue;
    scanRuleSets(value, key, `${path}.${name}`, rows);
  }
  return rows;
}

function summarizeModule(module) {
  const definitions = (module.specificationDefinitions ?? [])
    .filter((def) => def.key === TARGET_FIELD && selectorMentions(def.selector, TARGET_FIELD))
    .map((def) => ({
      kind: 'definition', id: def.id ?? def.key ?? null, selector: def.selector,
      predicates: predicatesFor(def.selector, TARGET_FIELD),
      dataType: def.dataType ?? def.data_type ?? null,
      required: def.required ?? null,
    }));

  const allowedValues = (module.allowedValues ?? [])
    .filter((row) => row.specificationKey === TARGET_FIELD && selectorMentions(row.selector, TARGET_FIELD))
    .map((row) => ({
      kind: 'allowed_value', id: row.id ?? null, value: row.value ?? null,
      selector: row.selector, predicates: predicatesFor(row.selector, TARGET_FIELD),
      status: row.status ?? null, userSelectable: row.userSelectable ?? null,
    }));

  const requiredRules = (module.requiredFieldRules ?? [])
    .filter((row) => row.specificationKey === TARGET_FIELD && selectorMentions(row.selector, TARGET_FIELD))
    .map((row) => ({
      kind: 'required_rule', id: row.id ?? null, selector: row.selector,
      predicates: predicatesFor(row.selector, TARGET_FIELD), required: row.required ?? row.value ?? null,
    }));

  const dependencies = (module.dependencies ?? [])
    .filter((dep) => selectorMentions(dep.when, TARGET_FIELD))
    .map((dep) => ({
      kind: 'dependency', id: dep.id ?? dep.rule_id ?? dep.ruleId ?? null,
      when: dep.when, predicates: predicatesFor(dep.when, TARGET_FIELD),
      mode: dep.mode ?? dep.evaluation ?? null,
      action: dep.action ?? dep.effect?.type ?? null,
      effect: dep.effect ?? null,
      targetField: dep.targetField ?? null,
      targetValue: dep.targetValue ?? null,
      targetValuePrefix: dep.targetValuePrefix ?? null,
      priority: dep.priority ?? null,
    }));

  const ruleSetRefs = scanRuleSets(module.ruleSets ?? [], TARGET_FIELD);
  const v3RefCount = definitions.length + allowedValues.length + requiredRules.length + dependencies.length + (ruleSetRefs.length ? 1 : 0);
  const exactRefCount = definitions.length + allowedValues.length + requiredRules.length + dependencies.length + ruleSetRefs.length;

  const optionDefinition = (module.specificationDefinitions ?? []).find((def) => def.key === TARGET_FIELD) ?? null;
  const optionRows = (module.allowedValues ?? []).filter((row) => row.specificationKey === TARGET_FIELD && row.status !== 'INACTIVE');

  return {
    target_field: TARGET_FIELD,
    option_definition: optionDefinition ? {
      key: optionDefinition.key,
      dataType: optionDefinition.dataType ?? optionDefinition.data_type ?? null,
      required: optionDefinition.required ?? null,
      selectionMode: optionDefinition.selectionMode ?? optionDefinition.selection_mode ?? null,
    } : null,
    option_value_count: optionRows.length,
    option_values: optionRows.map((row) => row.value),
    v3_source_ref_count: v3RefCount,
    exact_source_ref_count: exactRefCount,
    refs: { definitions, allowedValues, requiredRules, dependencies, ruleSetRefs },
  };
}

await mkdir(OUT, { recursive: true });
const series = [];
for (const cfg of SERIES) {
  const entry = getRuntimeMasterEntry(cfg.manufacturer, cfg.series);
  if (!entry) throw new Error(`${cfg.series}: runtime registry entry missing`);
  const pkg = await loadFormalProductRuntimePackage(entry);
  const preferred = entry.productModuleRole && pkg.documents?.[entry.productModuleRole];
  const doc = preferred ?? Object.values(pkg.documents ?? {}).find((value) => value?.product_module);
  const module = doc?.product_module;
  if (!module) throw new Error(`${cfg.series}: product_module missing`);
  const summary = summarizeModule(module);
  const row = {
    ...cfg,
    runtime_manifest_sha256: entry.runtimeManifestSha256 ?? null,
    package_version: entry.masterVersion ?? null,
    ...summary,
  };
  series.push(row);
  console.log(`SAMOS_OPTIONS_SELF_REF series=${cfg.series} v3_refs=${row.v3_source_ref_count} exact_refs=${row.exact_source_ref_count} option_values=${row.option_value_count}`);
  for (const [kind, refs] of Object.entries(row.refs)) {
    for (const ref of refs) console.log(`SAMOS_OPTIONS_REF series=${cfg.series} kind=${kind} ref=${JSON.stringify(ref)}`);
  }
}

const report = {
  exact_head_sha: HEAD_SHA,
  task_classification: 'NON-PRODUCT-MASTER',
  product_master_mutation: 0,
  diagnostic_model: 'SAMOS_OPTIONS_SELF_REFERENCE_SOURCE_AUDIT_V1',
  series,
  gate_status: {
    samos_terminal_multi_model_gate: 'DIAGNOSTIC_ONLY',
    nontw_discrete_population_gate: 'BLOCKED',
    app_integration_ready: false,
    release_input_gate: 'BLOCKED',
  },
};
await writeFile(`${OUT}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log('SAMOS_OPTIONS_SELF_REFERENCE_DIAGNOSTIC=PASS');
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
