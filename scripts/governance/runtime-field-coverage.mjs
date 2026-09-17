import { readFileSync } from 'node:fs';
import { appRuntimeIntegrationRegistry } from '../../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { loadRegisteredRuntime, runtimeMasterInventory } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../../src/catalog/runtime-master/formal-product-runtime-loader.mjs';
import { adaptProductModuleRuntimeV1 } from '../../src/catalog/runtime-master/product-module-runtime-adapter.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { applyRuntimeUiCategoryOrder } from '../../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';

const keyOf = (definition = {}) => String(definition.field_name ?? definition.key ?? '').trim();

export function normalizedField(definition = {}, index = 0) {
  const key = keyOf(definition);
  return {
    key,
    field_name: key,
    domain: definition.domain ?? null,
    displayLabel: definition.display_label ?? definition.displayLabel ?? definition.label ?? key,
    displayOrder: Number(definition.display_order ?? definition.displayOrder ?? index + 1),
    runtimeIncluded: definition.runtime_included ?? definition.runtimeIncluded,
    runtime_included: definition.runtime_included ?? definition.runtimeIncluded,
    technical: definition.technical,
    internal: definition.internal,
    visibilityMode: definition.visibility_mode ?? definition.visibilityMode,
    visibility_mode: definition.visibility_mode ?? definition.visibilityMode,
    initialVisibility: definition.initial_visibility ?? definition.initialVisibility,
    initial_visibility: definition.initial_visibility ?? definition.initialVisibility,
    selectionMode: definition.selection_mode ?? definition.selectionMode,
    selection_mode: definition.selection_mode ?? definition.selectionMode,
    showReadOnly: definition.show_read_only ?? definition.showReadOnly,
    show_read_only: definition.show_read_only ?? definition.showReadOnly,
    required: definition.required ?? definition.is_required ?? definition.required_field ?? null,
    dependsOn: definition.depends_on ?? definition.dependsOn ?? definition.upstream_fields ?? definition.parent_fields ?? definition.parentFields ?? null,
    rawDefinition: definition,
  };
}

function productModuleUserFacing(definition = {}) {
  const key = String(definition.key ?? '').trim();
  if (!key || key === 'construction') return false;
  if (definition.internal === true || definition.technical === true || definition.userSelectable === false) return false;
  if (definition.selectionMode === 'DERIVED' || definition.applicability === 'INTERNAL_RESOLVED') return false;
  return true;
}

function literalAdapterFields(integration) {
  const pathByAdapter = {
    APW430_FORMAL_SPLIT_V1: 'src/catalog/runtime-master/apw430-formal-split-v1-adapter.mjs',
    APW431_FORMAL_SPLIT_V1: 'src/catalog/runtime-master/apw431-formal-split-v1-adapter.mjs',
  };
  const path = pathByAdapter[integration.adapterType];
  if (!path) return [];
  const source = readFileSync(path, 'utf8');
  const fields = [];
  const seen = new Set();
  const regex = /\bfield\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]/g;
  for (const match of source.matchAll(regex)) {
    const key = match[1];
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push(normalizedField({ key, displayLabel: match[2], runtimeIncluded: true }, fields.length));
  }
  return fields;
}

function mapDefinitions(definitions, integration) {
  const mapped = [];
  const errors = [];
  for (const field of definitions) {
    try {
      const [resolved] = applyRuntimeUiCategoryOrder([field], integration);
      if (resolved) mapped.push(resolved);
    } catch (error) {
      errors.push({ key: field.key, code: error.code ?? null, message: error.message });
    }
  }
  let ordered = mapped;
  try {
    ordered = applyRuntimeUiCategoryOrder(mapped, integration);
  } catch (error) {
    errors.push({ key: error.fieldKey ?? null, code: error.code ?? null, message: error.message });
  }
  return { fields: ordered, errors };
}

async function productModuleDefinitions(integration) {
  const entry = runtimeMasterInventory.find((row) => row.manufacturer === integration.manufacturer && row.series === integration.series);
  if (!entry) throw new Error(`Runtime Master entry missing for ${integration.registrySeriesKey}`);
  const runtimePackage = await loadFormalProductRuntimePackage(entry);
  const adapted = adaptProductModuleRuntimeV1(runtimePackage, entry);
  return (adapted.productModule?.specificationDefinitions ?? []).filter(productModuleUserFacing).map(normalizedField).filter((field) => field.key);
}

export async function authoritativeSourceUniverse(integration) {
  const runtime = await loadRegisteredRuntime(integration.manufacturer, integration.series);
  let source = 'NORMALIZED_MASTER';
  let definitions = (runtime?.master?.fields ?? []).map(normalizedField).filter((field) => field.key);

  if (!definitions.length && integration.adapterType === 'PRODUCT_MODULE_RUNTIME_V1') {
    source = 'FORMAL_PRODUCT_MODULE_DEFINITIONS';
    definitions = await productModuleDefinitions(integration);
  }
  if (!definitions.length) {
    const literal = literalAdapterFields(integration);
    if (literal.length) {
      source = 'ADAPTER_LITERAL_FIELD_UNIVERSE';
      definitions = literal;
    }
  }

  const mapped = mapDefinitions(definitions, integration);
  return { source, definitions, mappedFields: mapped.fields, mappingErrors: mapped.errors };
}

export async function baselineFieldUniverse(integration, windows = []) {
  const byWindow = new Map();
  const union = new Map();
  const errors = [];
  for (const window of windows) {
    try {
      const result = await resolveRuntimeAppProduct(integration.id, { window_type: window.window_id });
      const fields = result?.fields ?? [];
      byWindow.set(window.window_id, fields);
      for (const field of fields) if (field?.key && !union.has(field.key)) union.set(field.key, field);
    } catch (error) {
      errors.push({ window_id: window.window_id, code: error.code ?? null, message: error.message });
      byWindow.set(window.window_id, []);
    }
  }
  return { byWindow, fields: [...union.values()], errors };
}

export async function expectedFieldUniverse(integration, windows = []) {
  const source = await authoritativeSourceUniverse(integration);
  const baseline = await baselineFieldUniverse(integration, windows);
  const union = new Map();
  for (const field of source.mappedFields) if (field?.key) union.set(field.key, field);
  for (const field of baseline.fields) if (field?.key && !union.has(field.key)) union.set(field.key, field);
  let ordered = [...union.values()];
  try {
    ordered = applyRuntimeUiCategoryOrder(ordered, integration);
  } catch {
    // Per-field mapping errors are already captured from the authoritative source.
  }
  return {
    source: source.source,
    sourceFields: source.mappedFields,
    sourceMappingErrors: source.mappingErrors,
    baselineFields: baseline.fields,
    baselineByWindow: baseline.byWindow,
    baselineErrors: baseline.errors,
    expectedFields: ordered,
  };
}

export function integrationByRegistryKey(registrySeriesKey) {
  return appRuntimeIntegrationRegistry.find((row) => row.registrySeriesKey === registrySeriesKey) ?? null;
}
