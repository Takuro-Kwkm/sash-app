import { evaluateConfiguration } from './generic-rule-engine.mjs';
import { getRuntimeMasterEntry, loadRegisteredRuntime, runtimeMasterInventory } from './runtime-master-registry.mjs';
import { appRuntimeIntegrationRegistry } from './app-runtime-integration-registry.mjs';
import {
  NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY,
  applyRuntimeUiCategoryOrder,
  formatAndSortStandardSizeChoices,
} from './new-construction-sash-runtime-ui-contract.mjs';

const integrationKey = (manufacturer, series) => `${manufacturer}::${series}`;
const generatedProductId = (manufacturer, series) => `RUNTIME-${manufacturer}-${series}`.replace(/[^A-Za-z0-9._-]+/g, '-');
const metadataByKey = new Map(appRuntimeIntegrationRegistry.map((row) => [integrationKey(row.manufacturer, row.series), row]));

function labelFrom(row, fallback) {
  if (!row || typeof row !== 'object') return fallback;
  for (const key of ['display_label', 'displayLabel', 'display_name_ja', 'display_name', 'label_ja', 'label', 'name_ja', 'name']) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return String(row[key]);
  }
  return fallback;
}

function humanizeFieldName(name) {
  return String(name).split('_').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function registeredIntegration(entry) {
  const metadata = metadataByKey.get(integrationKey(entry.manufacturer, entry.series));
  return Object.freeze({
    id: metadata?.id ?? generatedProductId(entry.manufacturer, entry.series),
    manufacturer: entry.manufacturer,
    series: entry.series,
    displayName: metadata?.displayName ?? entry.series,
    productCategory: metadata?.productCategory ?? null,
    uiCategory: metadata?.uiCategory ?? null,
    registrySeriesKey: metadata?.registrySeriesKey ?? integrationKey(entry.manufacturer, entry.series),
    source: 'RUNTIME_MASTER',
    status: 'READY',
    selectable: true,
    blockReason: null,
    masterVersion: entry.masterVersion,
    packageVersion: metadata?.packageVersion ?? entry.masterVersion,
    schemaVersion: entry.schemaVersion,
    sourceHash: metadata?.sourceHash ?? entry.sourceZipSha256 ?? entry.runtimeManifestSha256 ?? null,
    adapterType: metadata?.adapterType ?? entry.adapterType ?? 'XE_ZIP_V1',
    canonicalRuntimeReference: metadata?.canonicalRuntimeReference ?? null,
  });
}

function blockedCandidate(metadata) {
  return Object.freeze({
    ...metadata,
    source: 'RUNTIME_MASTER',
    status: 'BLOCKED_RUNTIME_NOT_REGISTERED',
    selectable: false,
    blockReason: metadata.blockReason ?? '正式Runtime packageがRuntime Master Registryに未登録のため選択できません。',
    masterVersion: null,
  });
}

export function runtimeAppIntegrationInventory() {
  const rows = runtimeMasterInventory.map(registeredIntegration);
  const registeredKeys = new Set(runtimeMasterInventory.map((entry) => integrationKey(entry.manufacturer, entry.series)));
  for (const metadata of appRuntimeIntegrationRegistry) {
    if (!registeredKeys.has(integrationKey(metadata.manufacturer, metadata.series))) rows.push(blockedCandidate(metadata));
  }
  return rows.sort((a, b) => a.manufacturer.localeCompare(b.manufacturer, 'ja') || a.series.localeCompare(b.series, 'ja'));
}

export function getRuntimeAppIntegration(productId) {
  return runtimeAppIntegrationInventory().find((row) => row.id === productId) ?? null;
}

function valueRowsFor(master, fieldName) {
  return master.values.filter((row) => row.field_name === fieldName && row.status === 'CURRENT' && row.runtime_selectable !== false);
}

function coerceScalar(def, raw, candidates = []) {
  if (raw === null || raw === undefined || raw === '') return raw;
  const exact = candidates.find((candidate) => Object.is(candidate, raw));
  if (exact !== undefined) return exact;
  const byString = candidates.find((candidate) => String(candidate) === String(raw));
  if (byString !== undefined) return byString;
  if (def.data_type === 'boolean') {
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
  }
  if (def.data_type === 'integer') {
    const n = Number(raw);
    return Number.isInteger(n) ? n : raw;
  }
  if (def.data_type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  return raw;
}

export function normalizeRuntimeSelection(master, selection = {}) {
  const definitions = new Map(master.fields.map((def) => [def.field_name, def]));
  const normalized = {};
  for (const [fieldName, raw] of Object.entries(selection ?? {})) {
    const def = definitions.get(fieldName);
    if (!def || def.runtime_included === false) continue;
    const candidates = valueRowsFor(master, fieldName).map((row) => row.canonical_value);
    if (Array.isArray(raw)) normalized[fieldName] = raw.map((value) => coerceScalar(def, value, candidates));
    else normalized[fieldName] = coerceScalar(def, raw, candidates);
  }
  return normalized;
}

function dataTypeFor(def) {
  if (def.data_type === 'integer' || def.data_type === 'number') return 'NUMBER';
  if (def.data_type === 'array') return 'MULTI_ENUM';
  if (def.data_type === 'string') return 'TEXT';
  return 'ENUM';
}

function choicesFor(master, def, fieldState, integration) {
  if (def.data_type === 'boolean') return [
    { value: true, displayLabel: 'はい', manualCheck: false, disabled: false },
    { value: false, displayLabel: 'いいえ', manualCheck: false, disabled: false },
  ];
  if (!['enum','array'].includes(def.data_type)) return [];
  const rows = valueRowsFor(master, def.field_name);
  const byValue = new Map(rows.map((row) => [JSON.stringify(row.canonical_value), row]));
  const choices = (fieldState.allowed_values ?? []).filter((value) => {
    const row = byValue.get(JSON.stringify(value));
    return row?.user_selectable !== false || fieldState.readOnly || def.show_read_only === true;
  }).map((value) => {
    const row = byValue.get(JSON.stringify(value));
    return {
      value,
      displayLabel: labelFrom(row, String(value)),
      manualCheck: Boolean(row?.manual_check ?? row?.manualCheck),
      disabled: row?.user_selectable === false,
      runtimeValueRow: row,
    };
  });
  if (integration.uiCategory === NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY && def.field_name === 'size') {
    return formatAndSortStandardSizeChoices(choices);
  }
  return choices.map(({ runtimeValueRow, ...choice }) => choice);
}

function warningText(value) {
  if (typeof value === 'string') return value;
  if (value?.message) return String(value.message);
  if (value?.code) return String(value.code);
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function toRuntimeUiResult(master, state, integration, sourcePackageIntegrity = null) {
  const visible = [];
  for (const [index, def] of master.fields.entries()) {
    const fieldState = state.fields[def.field_name];
    if (!fieldState || fieldState.visibility === 'HIDE' || def.runtime_included === false) continue;
    if ((def.selection_mode === 'DERIVED' || def.selection_mode === 'FIXED') && def.show_read_only !== true) continue;
    visible.push({
      key: def.field_name,
      displayLabel: fieldState.display_label ?? labelFrom(def, humanizeFieldName(def.field_name)),
      displayOrder: Number(def.display_order ?? def.displayOrder ?? index + 1),
      dataType: dataTypeFor(def),
      unit: fieldState.unit ?? def.unit ?? null,
      required: Boolean(fieldState.required),
      values: choicesFor(master, def, fieldState, integration),
      selectionMode: def.selection_mode,
      runtimeState: fieldState.state,
      readOnly: Boolean(fieldState.readOnly) || (def.selection_mode === 'AUTO_RESOLVE' && fieldState.allowed_values?.length === 1),
      parentFields: def.parent_fields ?? [],
    });
  }
  const orderedVisible = applyRuntimeUiCategoryOrder(visible, integration);
  const selection = Object.fromEntries(Object.entries(state.fields)
    .filter(([, fieldState]) => fieldState.value !== null && fieldState.value !== undefined)
    .map(([name, fieldState]) => {
      if (!Array.isArray(fieldState.value)) return [name, fieldState.value];
      const selectable = new Set(valueRowsFor(master, name).filter((row) => row.user_selectable !== false).map((row) => row.canonical_value));
      return [name, fieldState.value.filter((value) => selectable.has(value))];
    })
    .filter(([, value]) => !Array.isArray(value) || value.length));
  const errors = (state.errors ?? []).map((error) => ({
    errorCode: error.code ?? 'RUNTIME_VALIDATION_ERROR',
    field: error.field ?? null,
    message: error.message ?? (error.field ? `${error.field}: ${error.code ?? '入力値が成立しません'}` : warningText(error)),
  }));
  return {
    productId: integration.id,
    manufacturer: integration.manufacturer,
    series: integration.series,
    source: 'RUNTIME_MASTER',
    status: integration.status,
    selection,
    dependencyFields: master.fields.map((def) => ({ key: def.field_name, parentFields: def.parent_fields ?? [] })),
    fields: orderedVisible,
    notices: [
      ...((state.order_ready ?? master.capabilities?.orderReady) === false
        ? ['ORDER_READY = false：営業見積入力用です。発注確定にはメーカー確認が必要です。'] : []),
      ...(state.warnings ?? []).map(warningText),
      ...(state.derived_entities ?? []).map(row => `${({ REQUIRES: '必要', ENABLES: '有効', FIXES: '固定' })[row.relationship]}: ${row.displayLabel}${row.note ? `（${row.note}）` : ''}`),
      ...((state.derived_options ?? []).length ? [`自動適用オプション: ${(state.derived_options ?? []).map((id) => labelFrom(master.values.find((row) => row.field_name === 'option' && row.canonical_value === id), id)).join('、')}`] : []),
    ],
    manualWarnings: [
      ...(state.manual_warnings ?? []),
      ...(state.matched_invalid_rules ?? []).map((ruleId) => `成立不可Rule: ${ruleId}`),
    ],
    validation: {
      status: state.status,
      errors,
      missingRequiredFields: [...(state.missing_required_fields ?? [])],
    },
    derivedEntities: state.derived_entities ?? [],
    derivedComponents: [...(state.derived_components ?? [])].sort(),
    derivedOptions: [...(state.derived_options ?? [])].sort(),
    clearedFields: [...(state.cleared_fields ?? [])],
    optionCodeResults: state.option_code_results ?? [],
    optionCodeLinkageCount: state.option_code_linkage_count ?? 0,
    runtimeCapabilities: master.capabilities ?? null,
    dimensionResult: state.dimension_result ?? null,
    orderReady: state.order_ready ?? master.capabilities?.orderReady ?? null,
    runtimeMaster: {
      masterVersion: integration.masterVersion,
      packageVersion: integration.packageVersion,
      schemaVersion: integration.schemaVersion,
      adapterType: integration.adapterType,
      sourceHash: integration.sourceHash,
      canonicalRuntimeReference: integration.canonicalRuntimeReference,
      sourcePackageIntegrity: sourcePackageIntegrity ? {
        expected: sourcePackageIntegrity.expected,
        actual: sourcePackageIntegrity.actual,
        match: sourcePackageIntegrity.match,
        manifestDriveFileId: sourcePackageIntegrity.manifestDriveFileId ?? null,
        files: sourcePackageIntegrity.files ?? null,
      } : null,
    },
  };
}

export async function resolveRuntimeAppProduct(productId, selection = {}) {
  const integration = getRuntimeAppIntegration(productId);
  if (!integration) {
    const error = new Error(`Unknown Runtime app product: ${productId}`);
    error.code = 'RUNTIME_APP_PRODUCT_NOT_FOUND';
    throw error;
  }
  if (!integration.selectable) {
    const error = new Error(integration.blockReason ?? `Runtime app product is blocked: ${productId}`);
    error.code = 'RUNTIME_MASTER_NOT_REGISTERED';
    error.integration = integration;
    throw error;
  }
  const entry = getRuntimeMasterEntry(integration.manufacturer, integration.series);
  if (!entry) {
    const error = new Error(`Runtime Master Registry entry disappeared: ${integration.manufacturer}/${integration.series}`);
    error.code = 'RUNTIME_MASTER_NOT_REGISTERED';
    throw error;
  }
  const runtime = await loadRegisteredRuntime(integration.manufacturer, integration.series);
  if (!runtime) {
    const error = new Error(`Runtime Master could not be loaded: ${integration.manufacturer}/${integration.series}`);
    error.code = 'RUNTIME_MASTER_LOAD_FAILED';
    throw error;
  }
  const normalized = normalizeRuntimeSelection(runtime.master, selection);
  const state = runtime.resolver ? runtime.resolver(normalized) : evaluateConfiguration(runtime.master, normalized);
  return toRuntimeUiResult(runtime.master, state, integration, runtime.sourcePackageIntegrity);
}
