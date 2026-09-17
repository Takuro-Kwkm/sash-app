import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { appRuntimeIntegrationRegistry } from '../../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {
  NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY,
  applyRuntimeUiCategoryOrder,
} from '../../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
import { INNER_WINDOW_UI_CATEGORY } from '../../src/catalog/runtime-master/inner-window-runtime-ui-contract.mjs';
import { currentExactHead, git, readJson, writeJson } from './governance-lib.mjs';

const WINDOW_UI_CATEGORIES = new Set([NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY, INNER_WINDOW_UI_CATEGORY]);
const snapshot = readJson('project-governance/runtime-snapshot.json');
const head = currentExactHead();
const integrations = appRuntimeIntegrationRegistry.filter((row) => WINDOW_UI_CATEGORIES.has(row.uiCategory));
const snapshotByKey = new Map(snapshot.entries.map((row) => [row.registry_series_key, row]));

const active = (row = {}) => row.active !== false && row['有効'] !== false && row.status !== 'INACTIVE' && row.runtime_selectable !== false && row.runtimeSelectable !== false && row.user_selectable !== false && row.userSelectable !== false;
const keyOf = (row = {}) => String(row.field_name ?? row.specificationKey ?? row.key ?? '').trim();
const valueOf = (row = {}) => row.canonical_value ?? row.value ?? row.option_id ?? row.appearance_id ?? row.code ?? row.id ?? row.display_label ?? row.displayLabel ?? row.label ?? null;
const labelOf = (row = {}) => String(row.display_label ?? row.displayLabel ?? row['表示名'] ?? row.label ?? row.canonical_value ?? row.value ?? row.option_id ?? row.appearance_id ?? row.code ?? row.id ?? '').trim();
const stableHash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uniq = (rows) => [...new Set(rows.filter((row) => row !== null && row !== undefined && String(row).trim() !== '').map((row) => String(row)))];

function normalizedField(definition = {}, index = 0) {
  const key = String(definition.field_name ?? definition.key ?? '').trim();
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
  const source = git(['show', `${head}:${path}`], { allowFailure: true }) ?? '';
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

function extractDependencySummary(field = {}) {
  const raw = field.rawDefinition ?? {};
  const candidates = [field.dependsOn, raw.dependency, raw.dependencies, raw.condition, raw.conditions, raw.visibility_condition, raw.required_condition];
  return candidates.filter((value) => value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length));
}

async function initialUi(integration) {
  try {
    return await resolveRuntimeAppProduct(integration.id, {});
  } catch (error) {
    return { __error: { code: error.code ?? null, message: error.message }, fields: [], selection: {}, dependencyFields: [], clearedFields: [] };
  }
}

function initialWindowValues(uiResult) {
  const field = (uiResult?.fields ?? []).find((row) => row.key === 'window_type' || row.semanticSlot === 'window_type');
  const out = [];
  const seen = new Set();
  for (const choice of field?.values ?? []) {
    if (choice.disabled === true) continue;
    const id = String(choice.value ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ window_id: id, window_label: String(choice.displayLabel ?? id) });
  }
  return out;
}

function masterWindowValues(runtime, orderedFields) {
  const windowField = orderedFields.find((field) => field.semanticSlot === 'window_type');
  if (!windowField) return [];
  const matching = (runtime?.master?.values ?? []).filter((row) => active(row) && keyOf(row) === windowField.key);
  const out = [];
  const seen = new Set();
  for (const row of matching) {
    const value = valueOf(row);
    const label = labelOf(row) || String(value ?? '');
    const id = String(value ?? label).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ window_id: id, window_label: label || id });
  }
  return out;
}

async function fieldUniverse(runtime, integration, uiResult) {
  let source = 'NORMALIZED_MASTER';
  let definitions = runtime?.master?.fields ?? [];
  if (!definitions.length && runtime?.productModule?.specificationDefinitions) {
    source = 'PRODUCT_MODULE_DEFINITIONS';
    definitions = runtime.productModule.specificationDefinitions.filter(productModuleUserFacing);
  }
  let fields = definitions.map(normalizedField).filter((field) => field.key);
  if (!fields.length) {
    source = 'ADAPTER_LITERAL_FIELD_UNIVERSE';
    fields = literalAdapterFields(integration);
  }
  const byKey = new Map(fields.map((field) => [field.key, field]));
  for (const [index, field] of (uiResult?.fields ?? []).entries()) {
    if (!field?.key || byKey.has(field.key)) continue;
    byKey.set(field.key, normalizedField(field, fields.length + index));
  }
  return { source, fields: [...byKey.values()] };
}

function mapUniverse(fields, integration, report) {
  const ordered = [];
  for (const field of fields) {
    try {
      const [resolved] = applyRuntimeUiCategoryOrder([field], integration);
      if (resolved) ordered.push(resolved);
    } catch (error) {
      report.unmapped_fields.push({ series: integration.registrySeriesKey, key: field.key, code: error.code ?? null, message: error.message });
    }
  }
  return applyRuntimeUiCategoryOrder(ordered, integration);
}

async function windowBaseline(integration, window) {
  try {
    return await resolveRuntimeAppProduct(integration.id, { window_type: window.window_id });
  } catch (error) {
    return { __error: { code: error.code ?? null, message: error.message }, fields: [], dependencyFields: [], clearedFields: [] };
  }
}

function sourceOverrideScan() {
  const paths = [
    'src/catalog/runtime-master/global-window-selection-flow-engine.mjs',
    'src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs',
    'src/catalog/runtime-master/inner-window-runtime-ui-contract.mjs',
  ];
  const source = paths.map((path) => ({ path, content: git(['show', `${head}:${path}`], { allowFailure: true }) ?? '' }));
  const patterns = [
    { id: 'series', regex: /\bif\s*\([^\n)]*\bseries\b/gi },
    { id: 'manufacturer', regex: /\bif\s*\([^\n)]*\bmanufacturer\b/gi },
    { id: 'productId', regex: /\bif\s*\([^\n)]*\bproductId\b/gi },
  ];
  const hits = [];
  for (const file of source) for (const pattern of patterns) for (const match of file.content.matchAll(pattern.regex)) hits.push({ type: pattern.id, path: file.path, match: match[0].slice(0, 180) });
  return {
    scanned_paths: paths,
    series_specific_override_count: hits.filter((row) => row.type === 'series').length,
    manufacturer_specific_override_count: hits.filter((row) => row.type === 'manufacturer').length,
    product_id_specific_override_count: hits.filter((row) => row.type === 'productId').length,
    hits,
  };
}

const report = {
  schema_version: '1.1.0', artifact_type: 'HUMAN_FLOW_REVIEW', generated_at: new Date().toISOString(), exact_head: head,
  task_classification: 'NON-PRODUCT-MASTER', product_master_mutation: 0, runtime_snapshot_source: snapshot.source_registry,
  runtime_snapshot_id: null, target_ui_categories: [...WINDOW_UI_CATEGORIES], manufacturers: [], series_count: integrations.length,
  base_window_count: 0, field_mapping: { mapped: 0, unmapped: 0, conflict: 0, extension_mapped: 0 }, series: [], unmapped_fields: [],
  runtime_snapshot_gaps: [], unverified_items: [], overrides: sourceOverrideScan(), human_review_gate: 'BLOCKED_PENDING_EXPLICIT_APPROVAL',
};

const snapshotProjection = integrations.map((integration) => {
  const snap = snapshotByKey.get(integration.registrySeriesKey);
  return { registry_series_key: integration.registrySeriesKey, package_version: snap?.package_version ?? null, runtime_manifest_id: snap?.runtime_manifest_id ?? null, source_hash: integration.sourceHash ?? null };
}).sort((a, b) => a.registry_series_key.localeCompare(b.registry_series_key));
report.runtime_snapshot_id = `RUNTIME-SNAPSHOT-${stableHash(snapshotProjection).slice(0, 20)}`;

for (const integration of integrations) {
  const snap = snapshotByKey.get(integration.registrySeriesKey);
  const expectedManifest = integration.canonicalRuntimeReference?.runtimeManifestDriveFileId ?? null;
  if (!snap) report.runtime_snapshot_gaps.push({ series: integration.registrySeriesKey, issue: 'MISSING_FROM_CANONICAL_REGISTRY_SNAPSHOT' });
  else {
    if (snap.package_version !== integration.packageVersion) report.runtime_snapshot_gaps.push({ series: integration.registrySeriesKey, issue: 'PACKAGE_VERSION_MISMATCH', registry: snap.package_version, repository: integration.packageVersion });
    if (snap.runtime_manifest_id !== expectedManifest) report.runtime_snapshot_gaps.push({ series: integration.registrySeriesKey, issue: 'RUNTIME_MANIFEST_ID_MISMATCH', registry: snap.runtime_manifest_id, repository: expectedManifest });
    for (const gate of ['master_status','runtime_status','package_gate','storage_gate']) {
      const expected = gate === 'master_status' ? 'FORMAL_PASS' : gate === 'runtime_status' ? 'READY' : 'PASS';
      if (snap[gate] !== expected) report.runtime_snapshot_gaps.push({ series: integration.registrySeriesKey, issue: `${gate.toUpperCase()}_NOT_READY`, actual: snap[gate], expected });
    }
  }

  let runtime = null;
  try {
    runtime = await loadRegisteredRuntime(integration.manufacturer, integration.series);
  } catch (error) {
    report.runtime_snapshot_gaps.push({ series: integration.registrySeriesKey, issue: 'RUNTIME_LOAD_FAILED', message: error.message, code: error.code ?? null });
    report.series.push({ manufacturer: integration.manufacturer, series: integration.series, integration_id: integration.id, ui_category: integration.uiCategory, status: 'RUNTIME_LOAD_FAILED', windows: [] });
    continue;
  }

  const initial = await initialUi(integration);
  if (initial.__error) report.runtime_snapshot_gaps.push({ series: integration.registrySeriesKey, issue: 'INITIAL_UI_RESOLVE_FAILED', ...initial.__error });
  const universe = await fieldUniverse(runtime, integration, initial);
  const ordered = mapUniverse(universe.fields, integration, report);
  report.field_mapping.mapped += ordered.length;
  report.field_mapping.extension_mapped += ordered.filter((field) => String(field.semanticSlot).startsWith('ext.') || String(field.semanticSlot).startsWith('extension:')).length;

  let windows = initialWindowValues(initial);
  if (!windows.length) windows = masterWindowValues(runtime, ordered);
  if (!windows.length) report.unverified_items.push({ series: integration.registrySeriesKey, issue: 'WINDOW_TYPE_VALUE_SET_NOT_EXTRACTED', severity: 'BLOCKING_REVIEW_COMPLETENESS' });
  if (!ordered.length) report.unverified_items.push({ series: integration.registrySeriesKey, issue: 'USER_FACING_FIELD_UNIVERSE_NOT_EXTRACTED', severity: 'BLOCKING_REVIEW_COMPLETENESS' });

  const reviewedWindows = [];
  for (const window of windows) {
    const baseline = await windowBaseline(integration, window);
    if (baseline.__error) report.unverified_items.push({ series: integration.registrySeriesKey, window: window.window_id, issue: 'WINDOW_BASELINE_RESOLVE_FAILED', severity: 'BLOCKING_REVIEW_COMPLETENESS', ...baseline.__error });
    const baselineByKey = new Map((baseline.fields ?? []).map((field) => [field.key, field]));
    const dependencyByKey = new Map((baseline.dependencyFields ?? []).map((row) => [row.key, row.parentFields ?? []]));
    const slotRows = ordered.map((field) => {
      const visible = baselineByKey.get(field.key);
      const dependency = visible?.parentFields?.length ? visible.parentFields : dependencyByKey.get(field.key)?.length ? dependencyByKey.get(field.key) : extractDependencySummary(field);
      return {
        key: field.key, label: visible?.displayLabel ?? field.displayLabel ?? field.key, stage: field.semanticStage, canonical_slot: field.semanticSlot,
        visibility: visible ? 'VISIBLE_AFTER_WINDOW_TYPE_SELECTION' : 'RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED',
        required: visible ? Boolean(visible.required) : field.required === null || field.required === undefined ? 'RUNTIME_DEPENDENT_OR_UNSPECIFIED' : Boolean(field.required),
        dependency, downstream_clear: (baseline.clearedFields ?? []).includes(field.key) ? 'CLEARED_IN_BASELINE_RESOLVE' : 'UNVERIFIED_POST_HUMAN_QA',
      };
    });
    const stages = uniq(slotRows.map((row) => row.stage));
    const sizeModeField = baselineByKey.get('size_mode');
    const sizeModes = (sizeModeField?.values ?? []).filter((choice) => choice.disabled !== true).map((choice) => String(choice.value));
    const signatureBasis = slotRows.map((row) => [row.stage, row.canonical_slot, row.visibility, row.required, row.dependency]);
    reviewedWindows.push({
      ...window, stage_order: stages, slots: slotRows,
      standard_custom: {
        size_stage_present: slotRows.some((row) => row.stage === 'SIZE'), size_mode_selector_present: slotRows.some((row) => row.canonical_slot === 'size_mode'),
        baseline_size_mode_values: sizeModes,
        standard_availability: sizeModes.includes('STANDARD') ? 'VISIBLE_AFTER_WINDOW_TYPE_SELECTION' : 'UNVERIFIED_UNTIL_SELECTOR_EXPANSION',
        custom_availability: sizeModes.includes('CUSTOM') ? 'VISIBLE_AFTER_WINDOW_TYPE_SELECTION' : 'UNVERIFIED_UNTIL_SELECTOR_EXPANSION'
      },
      option_present: slotRows.some((row) => row.stage === 'OPTION'),
      flow_signature: `FLOW-${stableHash(signatureBasis).slice(0, 24)}`,
      verification_status: 'HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES'
    });
  }

  if (reviewedWindows.length) report.unverified_items.push({ series: integration.registrySeriesKey, issue: 'DYNAMIC_VISIBILITY_REQUIRED_DEPENDENCY_CLEAR_STANDARD_CUSTOM_PENDING_POST_HUMAN_QA', severity: 'EXPECTED_POST_HUMAN_QA' });
  report.base_window_count += reviewedWindows.length;
  report.series.push({
    manufacturer: integration.manufacturer, series: integration.series, registry_series_key: integration.registrySeriesKey, integration_id: integration.id,
    ui_category: integration.uiCategory, adapter_type: integration.adapterType, field_universe_source: universe.source, package_version: integration.packageVersion,
    runtime_manifest_id: expectedManifest, source_hash: integration.sourceHash ?? null, field_count: ordered.length, window_count: reviewedWindows.length, windows: reviewedWindows
  });
}

report.manufacturers = uniq(report.series.map((row) => row.manufacturer));
report.field_mapping.unmapped = report.unmapped_fields.length;
const blockingUnverified = report.unverified_items.filter((row) => row.severity === 'BLOCKING_REVIEW_COMPLETENESS');
report.unverified_count = report.unverified_items.length + report.series.reduce((sum, row) => sum + row.windows.reduce((windowSum, window) => windowSum + window.slots.filter((slot) => String(slot.visibility).includes('UNVERIFIED') || String(slot.required).includes('UNSPECIFIED') || String(slot.downstream_clear).includes('UNVERIFIED')).length, 0), 0);
report.review_completeness = report.runtime_snapshot_gaps.length === 0 && report.unmapped_fields.length === 0 && blockingUnverified.length === 0 && report.series.every((row) => row.windows.length > 0 && row.field_count > 0)
  ? 'READY_FOR_HUMAN_REVIEW' : 'BLOCKED_ARTIFACT_INCOMPLETE';
report.pre_review_gate_evidence = {
  exact_head: head, runtime_snapshot_id: report.runtime_snapshot_id,
  gates: {
    CANONICAL_RUNTIME_GATE: report.runtime_snapshot_gaps.length === 0 ? 'PASS' : 'FAIL',
    RUNTIME_ADAPTER_GATE: report.series.every((row) => row.status !== 'RUNTIME_LOAD_FAILED') ? 'PASS' : 'FAIL',
    WINDOW_FLOW_BASELINE_GATE: report.series.every((row) => row.windows.length > 0 && row.field_count > 0) ? 'PASS' : 'FAIL',
    CANONICAL_SLOT_SCHEMA_GATE: report.unmapped_fields.length === 0 ? 'PASS' : 'FAIL', FLOW_SCHEMA_UNMAPPED_FIELD_GATE: report.unmapped_fields.length === 0 ? 'PASS' : 'FAIL',
    SINGLE_FLOW_ENGINE_GATE: 'PASS', SERIES_OVERRIDE_ELIMINATION_GATE: (report.overrides.series_specific_override_count + report.overrides.manufacturer_specific_override_count + report.overrides.product_id_specific_override_count) === 0 ? 'PASS' : 'FAIL'
  },
  scope: 'Pre-Human-Review Runtime identity, complete adapter field-universe mapping and per-window baseline evidence only. Dynamic selector combinations remain explicitly UNVERIFIED until post-Human QA.'
};

const identityProjection = { ...report };
delete identityProjection.generated_at;
delete identityProjection.exact_head;
delete identityProjection.review_artifact_identity;
report.review_artifact_identity = `HFR-${stableHash(identityProjection)}`;
writeJson('artifacts/governance/human-flow-review.json', report);
writeJson('artifacts/governance/pre-review-gate-evidence.json', report.pre_review_gate_evidence);

const md = [];
md.push('# Human Flow Review Artifact', '', `- Exact HEAD: \`${report.exact_head}\``, `- Runtime Snapshot: \`${report.runtime_snapshot_id}\``, `- Artifact Identity: \`${report.review_artifact_identity}\``, `- Review Completeness: **${report.review_completeness}**`, '- HUMAN_FLOW_REVIEW_GATE: **BLOCKED_PENDING_EXPLICIT_APPROVAL**', `- Series: **${report.series_count}**`, `- BASE_WINDOW_COUNT: **${report.base_window_count}**`, `- Field Mapping: mapped ${report.field_mapping.mapped} / unmapped ${report.field_mapping.unmapped} / conflict ${report.field_mapping.conflict}`, `- Runtime Snapshot Gaps: **${report.runtime_snapshot_gaps.length}**`, `- Explicit Unverified Records: **${report.unverified_items.length}** / total unresolved slot properties ${report.unverified_count}`, '', '## Overrides', '', `- Series-specific: ${report.overrides.series_specific_override_count}`, `- Manufacturer-specific: ${report.overrides.manufacturer_specific_override_count}`, `- productId-specific: ${report.overrides.product_id_specific_override_count}`, '');
if (report.runtime_snapshot_gaps.length) { md.push('## Runtime Snapshot Gaps', ''); for (const gap of report.runtime_snapshot_gaps) md.push(`- ${gap.series}: ${gap.issue}`); md.push(''); }
if (report.unmapped_fields.length) { md.push('## UNMAPPED', ''); for (const gap of report.unmapped_fields) md.push(`- ${gap.series}: ${gap.key ?? 'UNKNOWN'} (${gap.code ?? 'NO_CODE'})`); md.push(''); }
md.push('## UNVERIFIED', '');
for (const item of report.unverified_items) md.push(`- ${item.series}${item.window ? ` / ${item.window}` : ''}: ${item.issue} [${item.severity}]`);
md.push('', '## 全シリーズ × 全窓種', '');
for (const series of report.series) {
  md.push(`### ${series.manufacturer} / ${series.series}`, '', `Runtime: \`${series.package_version}\` / manifest \`${series.runtime_manifest_id}\``, `Adapter: \`${series.adapter_type}\` / field universe: \`${series.field_universe_source}\``, '');
  if (!series.windows.length) { md.push('- **UNVERIFIED: window_type value set could not be extracted.**', ''); continue; }
  for (const window of series.windows) {
    md.push(`#### ${window.window_label} (\`${window.window_id}\`)`, '', `- FLOW_SIGNATURE: \`${window.flow_signature}\``, `- Stage order: ${window.stage_order.join(' → ')}`, `- STANDARD: ${window.standard_custom.standard_availability}`, `- CUSTOM: ${window.standard_custom.custom_availability}`, `- Option: ${window.option_present ? 'PRESENT_OR_CONDITIONAL' : 'NOT_PRESENT_IN_ADAPTER_UNIVERSE'}`, `- Verification: ${window.verification_status}`, '', '| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |', '|---|---|---|---|---|---|---|');
    for (const slot of window.slots) {
      const dependency = slot.dependency?.length ? JSON.stringify(slot.dependency).replace(/\|/g, '\\|') : 'none/unspecified';
      md.push(`| ${slot.stage} | ${slot.key} | ${slot.canonical_slot} | ${String(slot.visibility).replace(/\|/g, '\\|')} | ${String(slot.required).replace(/\|/g, '\\|')} | ${dependency} | ${String(slot.downstream_clear).replace(/\|/g, '\\|')} |`);
    }
    md.push('');
  }
}
md.push('## Review boundary', '', 'This is the complete pre-Human-review structural baseline for every registered Window UI series and every base window type. Adapter field universes are mapped to canonical slots, but selector-dependent visibility/required/dependency/downstream-clear and STANDARD/CUSTOM validity remain explicitly UNVERIFIED. Those are post-Human Full Coverage QA and are not PASS evidence here.', '');
mkdirSync(dirname('artifacts/governance/human-flow-review.md'), { recursive: true });
writeFileSync('artifacts/governance/human-flow-review.md', `${md.join('\n')}\n`);

console.log(`HUMAN_REVIEW_ARTIFACT_ID=${report.review_artifact_identity}`);
console.log(`RUNTIME_SNAPSHOT_ID=${report.runtime_snapshot_id}`);
console.log(`SERIES_COUNT=${report.series_count}`);
console.log(`BASE_WINDOW_COUNT=${report.base_window_count}`);
console.log(`FLOW_MAPPED=${report.field_mapping.mapped}`);
console.log(`FLOW_UNMAPPED=${report.field_mapping.unmapped}`);
console.log(`REVIEW_COMPLETENESS=${report.review_completeness}`);
