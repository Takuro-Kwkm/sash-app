import { readFileSync } from 'node:fs';
import { appRuntimeIntegrationRegistry } from '../../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { loadRegisteredRuntime, runtimeMasterInventory } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../../src/catalog/runtime-master/formal-product-runtime-loader.mjs';
import { adaptProductModuleRuntimeV1 } from '../../src/catalog/runtime-master/product-module-runtime-adapter.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { applyRuntimeUiCategoryOrder } from '../../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
import { currentExactHead, readJson, writeJson } from './governance-lib.mjs';

const head = currentExactHead();
const review = readJson('artifacts/governance/human-flow-review.json');
if (review.exact_head !== head) throw new Error(`Coverage verifier exact HEAD mismatch: ${review.exact_head} != ${head}`);

const uniq = (values) => [...new Set(values.filter(Boolean).map(String))];
const keyOf = (definition = {}) => String(definition.field_name ?? definition.key ?? '').trim();
const integrationByKey = new Map(appRuntimeIntegrationRegistry.map((row) => [row.registrySeriesKey, row]));

function normalizedField(definition = {}, index = 0) {
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
    selectionMode: definition.selection_mode ?? definition.selectionMode,
    selection_mode: definition.selection_mode ?? definition.selectionMode,
    showReadOnly: definition.show_read_only ?? definition.showReadOnly,
    show_read_only: definition.show_read_only ?? definition.showReadOnly,
    required: definition.required ?? definition.is_required ?? definition.required_field ?? null,
    dependsOn: definition.depends_on ?? definition.dependsOn ?? definition.parent_fields ?? definition.parentFields ?? null,
  };
}

function productModuleUserFacing(definition = {}) {
  const key = String(definition.key ?? '').trim();
  if (!key || key === 'construction') return false;
  if (definition.internal === true || definition.technical === true || definition.userSelectable === false) return false;
  if (definition.selectionMode === 'DERIVED' || definition.applicability === 'INTERNAL_RESOLVED') return false;
  return true;
}

function mapKeys(definitions, integration, errors) {
  const keys = [];
  for (const [index, definition] of definitions.entries()) {
    const normalized = normalizedField(definition, index);
    if (!normalized.key) continue;
    try {
      const [mapped] = applyRuntimeUiCategoryOrder([normalized], integration);
      if (mapped?.key) keys.push(mapped.key);
    } catch (error) {
      errors.push({ series: integration.registrySeriesKey, issue: 'SOURCE_FIELD_MAPPING_FAILED', key: normalized.key, code: error.code ?? null, message: error.message });
    }
  }
  return uniq(keys);
}

async function directSourceKeys(integration, errors) {
  const runtime = await loadRegisteredRuntime(integration.manufacturer, integration.series);
  if (runtime?.master?.fields?.length) return { source: 'NORMALIZED_MASTER_DIRECT', keys: mapKeys(runtime.master.fields, integration, errors) };

  if (integration.adapterType === 'PRODUCT_MODULE_RUNTIME_V1') {
    const entry = runtimeMasterInventory.find((row) => row.manufacturer === integration.manufacturer && row.series === integration.series);
    if (!entry) throw new Error(`Runtime Master entry missing: ${integration.registrySeriesKey}`);
    const runtimePackage = await loadFormalProductRuntimePackage(entry);
    const adapted = adaptProductModuleRuntimeV1(runtimePackage, entry);
    const definitions = (adapted.productModule?.specificationDefinitions ?? []).filter(productModuleUserFacing);
    return { source: 'FORMAL_PRODUCT_MODULE_DIRECT', keys: mapKeys(definitions, integration, errors) };
  }

  const pathByAdapter = {
    APW430_FORMAL_SPLIT_V1: 'src/catalog/runtime-master/apw430-formal-split-v1-adapter.mjs',
    APW431_FORMAL_SPLIT_V1: 'src/catalog/runtime-master/apw431-formal-split-v1-adapter.mjs',
  };
  const path = pathByAdapter[integration.adapterType];
  if (path) {
    const source = readFileSync(path, 'utf8');
    const definitions = [];
    const seen = new Set();
    const regex = /\bfield\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]/g;
    for (const match of source.matchAll(regex)) {
      if (seen.has(match[1])) continue;
      seen.add(match[1]);
      definitions.push({ key: match[1], displayLabel: match[2], runtimeIncluded: true });
    }
    return { source: 'ADAPTER_LITERAL_DIRECT', keys: mapKeys(definitions, integration, errors) };
  }

  return { source: 'NO_DIRECT_SOURCE_UNIVERSE', keys: [] };
}

const failures = [];
const seriesResults = [];
for (const series of review.series ?? []) {
  const integration = integrationByKey.get(series.registry_series_key);
  if (!integration) {
    failures.push({ series: series.registry_series_key, issue: 'APP_RUNTIME_INTEGRATION_NOT_FOUND' });
    continue;
  }

  const artifactUnion = uniq((series.windows ?? []).flatMap((window) => (window.slots ?? []).map((slot) => slot.key)));
  const source = await directSourceKeys(integration, failures);
  const baselineUnion = new Set();
  const perWindowMissing = [];
  for (const window of series.windows ?? []) {
    let result;
    try {
      result = await resolveRuntimeAppProduct(integration.id, { window_type: window.window_id });
    } catch (error) {
      failures.push({ series: series.registry_series_key, window: window.window_id, issue: 'BASELINE_RESOLVE_FAILED', code: error.code ?? null, message: error.message });
      continue;
    }
    const baselineKeys = uniq((result.fields ?? []).map((field) => field.key));
    baselineKeys.forEach((key) => baselineUnion.add(key));
    const windowArtifactKeys = new Set((window.slots ?? []).map((slot) => slot.key));
    const missing = baselineKeys.filter((key) => !windowArtifactKeys.has(key));
    if (missing.length) perWindowMissing.push({ window_id: window.window_id, keys: missing });
  }

  const expected = uniq([...source.keys, ...baselineUnion]);
  const missingSource = source.keys.filter((key) => !artifactUnion.includes(key));
  const missingExpected = expected.filter((key) => !artifactUnion.includes(key));
  if (missingSource.length) failures.push({ series: series.registry_series_key, issue: 'DIRECT_SOURCE_FIELD_MISSING_FROM_ARTIFACT', keys: missingSource });
  if (missingExpected.length) failures.push({ series: series.registry_series_key, issue: 'EXPECTED_FIELD_MISSING_FROM_ARTIFACT', keys: missingExpected });
  if (perWindowMissing.length) failures.push({ series: series.registry_series_key, issue: 'BASELINE_VISIBLE_FIELD_MISSING_PER_WINDOW', windows: perWindowMissing });

  seriesResults.push({
    registry_series_key: series.registry_series_key,
    series: series.series,
    adapter_type: integration.adapterType,
    source: source.source,
    source_field_count: source.keys.length,
    baseline_union_field_count: baselineUnion.size,
    expected_union_field_count: expected.length,
    artifact_union_field_count: artifactUnion.length,
    missing_source_fields: missingSource,
    missing_expected_fields: missingExpected,
    per_window_missing: perWindowMissing,
    status: missingSource.length === 0 && missingExpected.length === 0 && perWindowMissing.length === 0 ? 'PASS' : 'FAIL',
  });
}

if (review.field_coverage?.status !== 'PASS') failures.push({ issue: 'BUILDER_FIELD_COVERAGE_NOT_PASS', actual: review.field_coverage?.status ?? null });
if ((review.field_coverage?.missing_after_count ?? 0) !== 0) failures.push({ issue: 'BUILDER_REPORTS_MISSING_FIELDS_AFTER_RECONCILIATION', count: review.field_coverage?.missing_after_count });

const result = {
  schema_version: '1.0.0',
  exact_head: head,
  review_artifact_identity: review.review_artifact_identity,
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  series_count: seriesResults.length,
  series: seriesResults,
  failures,
};
writeJson('artifacts/governance/human-flow-field-coverage-verification.json', result);
console.log(`HUMAN_FLOW_FIELD_COVERAGE_VERIFICATION=${result.status}`);
console.log(`HUMAN_FLOW_FIELD_COVERAGE_FAILURES=${failures.length}`);
if (result.status !== 'PASS') process.exitCode = 42;
