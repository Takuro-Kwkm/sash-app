import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';
import { loadRegisteredRuntime, runtimeMasterInventory } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { appRuntimeIntegrationRegistry } from '../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import {
  NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY,
  semanticSlotForNewConstructionField,
} from '../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
import { auditCanonicalGlazingField } from '../src/catalog/runtime-master/canonical-window-semantic-schema.mjs';
import { createProductModuleGlazingBridge } from '../src/catalog/runtime-master/product-module-glazing-normalizer.mjs';

const TARGET_SLOTS = new Set(['glass_type','glass_detail','glass_function']);
const active = (row) => row?.active !== false && row?.['有効'] !== false && row?.status !== 'INACTIVE' && row?.runtime_selectable !== false && row?.runtimeSelectable !== false && row?.user_selectable !== false && row?.userSelectable !== false;
const labelOf = (row) => String(row?.display_label ?? row?.displayLabel ?? row?.['表示名'] ?? row?.label ?? row?.metadata?.displayLabel ?? row?.canonical_value ?? row?.value ?? row?.option_id ?? row?.appearance_id ?? '').trim();
const integrationKey = (manufacturer, series) => `${manufacturer}::${series}`;

function dedupeChoices(rows = []) {
  const seen = new Set();
  const choices = [];
  for (const row of rows) {
    const label = labelOf(row);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    choices.push({ value: row.canonical_value ?? row.value ?? row.option_id ?? row.appearance_id ?? label, displayLabel: label });
  }
  return choices;
}

function auditFields(entry, fields, sourceKind) {
  const audits = [];
  for (const field of fields) {
    if (!TARGET_SLOTS.has(field.semanticSlot)) continue;
    const audit = auditCanonicalGlazingField({ key:field.key, semanticSlot:field.semanticSlot, values:field.values });
    audits.push({
      sourceKind,
      key: field.key,
      semanticSlot: field.semanticSlot,
      valueCount: field.values.length,
      recognized: audit.recognized,
      unknown: audit.unknown,
      issues: audit.issues,
    });
  }
  return audits;
}

async function normalizedMasterFields(entry) {
  const runtime = await loadRegisteredRuntime(entry.manufacturer, entry.series);
  const master = runtime?.master;
  if (!master?.fields || !master?.values) return null;
  return master.fields.map((definition) => {
    const key = definition.field_name ?? definition.key;
    const semanticSlot = semanticSlotForNewConstructionField(key);
    const rows = master.values.filter((row) => active(row) && (row.field_name ?? row.specificationKey) === key);
    return { key, semanticSlot, values:dedupeChoices(rows) };
  });
}

async function productModuleFields(entry) {
  const runtimePackage = await loadFormalProductRuntimePackage(entry);
  const document = runtimePackage.documents[entry.productModuleRole]
    ?? runtimePackage.documents.RUNTIME_JSON_PACKAGE
    ?? runtimePackage.documents.runtime_master
    ?? runtimePackage.documents.RUNTIME_MASTER;
  const module = document?.product_module;
  if (!module?.specificationDefinitions || !module?.allowedValues) return null;
  const fields = module.specificationDefinitions.map((definition) => {
    const key = definition.key;
    const semanticSlot = semanticSlotForNewConstructionField(key);
    const rows = module.allowedValues.filter((row) => active(row) && row.specificationKey === key);
    return { key, semanticSlot, values:dedupeChoices(rows).map((choice) => ({
      ...choice,
      runtimeValueRow: rows.find((row) => Object.is(row.canonical_value ?? row.value ?? row.option_id ?? row.appearance_id ?? labelOf(row), choice.value)),
    })) };
  });
  return createProductModuleGlazingBridge(module).normalizeFields(fields).map((field) => ({
    ...field,
    semanticSlot:semanticSlotForNewConstructionField(field.key),
  }));
}

async function apwSplitFields(entry) {
  const runtimePackage = await loadFormalProductRuntimePackage(entry);
  const options = runtimePackage.documents.OPTIONS;
  if (!options) return [];
  if (entry.adapterType === 'APW430_FORMAL_SPLIT_V1') {
    return [
      { key:'glass_type', semanticSlot:'glass_type', values:dedupeChoices((options.glass_appearances ?? []).filter(active)) },
      { key:'glass_function', semanticSlot:'glass_function', values:dedupeChoices((options.glass_additional_options ?? []).filter(active)) },
    ];
  }
  // APW431 formal split exposes only glass_base. There is no formal glass_type/detail/function axis to audit.
  return [];
}

async function fieldsForEntry(entry) {
  if (entry.adapterType === 'PRODUCT_MODULE_RUNTIME_V1') return { sourceKind:'PRODUCT_MODULE', fields:await productModuleFields(entry) };
  if (entry.adapterType === 'APW430_FORMAL_SPLIT_V1' || entry.adapterType === 'APW431_FORMAL_SPLIT_V1') return { sourceKind:'FORMAL_SPLIT', fields:await apwSplitFields(entry) };
  const fields = await normalizedMasterFields(entry);
  return { sourceKind:'NORMALIZED_MASTER', fields:fields ?? [] };
}

export async function runGlobalWindowRuntimeSemanticAudit() {
  // Select the audit population declaratively from the UI integration registry.
  // INNER_WINDOW products such as Uchirimo/Inplus must never enter the
  // new-construction glazing semantic audit merely because of a series-name filter.
  const newConstructionKeys = new Set(
    appRuntimeIntegrationRegistry
      .filter((row) => row.uiCategory === NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY)
      .map((row) => integrationKey(row.manufacturer, row.series)),
  );
  const entries = runtimeMasterInventory.filter((entry) => newConstructionKeys.has(integrationKey(entry.manufacturer, entry.series)));
  const integrations = [];
  let issueCount = 0;
  for (const entry of entries) {
    const { sourceKind, fields } = await fieldsForEntry(entry);
    const audits = auditFields(entry, fields, sourceKind);
    const issues = audits.flatMap((field) => field.issues.map((issue) => ({ field:field.key, semanticSlot:field.semanticSlot, ...issue })));
    issueCount += issues.length;
    integrations.push({
      manufacturer:entry.manufacturer,
      series:entry.series,
      adapterType:entry.adapterType,
      sourceKind,
      auditedFieldCount:audits.length,
      audits,
      issueCount:issues.length,
      issues,
      status:issues.length ? 'SEMANTIC_REVIEW_REQUIRED' : 'PASS',
    });
  }
  return {
    model:'GLOBAL_WINDOW_RUNTIME_SEMANTIC_AUDIT_V1',
    productMasterMutation:0,
    integrationCount:integrations.length,
    issueCount,
    integrations,
    gate:issueCount ? 'CANONICAL_SLOT_SCHEMA_GATE=BLOCKED_RUNTIME_SEMANTICS' : 'CANONICAL_SLOT_SCHEMA_GATE=PASS_RUNTIME_SEMANTICS',
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await runGlobalWindowRuntimeSemanticAudit();
  console.log(JSON.stringify(report, null, 2));
}
