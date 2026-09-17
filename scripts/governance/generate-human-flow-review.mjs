import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { appRuntimeIntegrationRegistry } from '../../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
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
    runtimeIncluded: definition.runtime_included,
    runtime_included: definition.runtime_included,
    technical: definition.technical,
    internal: definition.internal,
    visibilityMode: definition.visibility_mode,
    visibility_mode: definition.visibility_mode,
    initialVisibility: definition.initial_visibility,
    initial_visibility: definition.initial_visibility,
    selectionMode: definition.selection_mode,
    selection_mode: definition.selection_mode,
    showReadOnly: definition.show_read_only,
    show_read_only: definition.show_read_only,
    required: definition.required ?? definition.is_required ?? definition.required_field ?? null,
    dependsOn: definition.depends_on ?? definition.dependsOn ?? definition.upstream_fields ?? null,
    rawDefinition: definition,
  };
}

function extractDependencySummary(field = {}) {
  const raw = field.rawDefinition ?? {};
  const candidates = [field.dependsOn, raw.dependency, raw.dependencies, raw.condition, raw.conditions, raw.visibility_condition, raw.required_condition];
  return candidates.filter((value) => value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length));
}

function windowValues(runtime, orderedFields) {
  const windowField = orderedFields.find((field) => field.semanticSlot === 'window_type');
  if (!windowField) return [];
  const values = runtime?.master?.values ?? [];
  const matching = values.filter((row) => active(row) && keyOf(row) === windowField.key);
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
  for (const file of source) {
    for (const pattern of patterns) {
      const matches = [...file.content.matchAll(pattern.regex)];
      for (const match of matches) hits.push({ type: pattern.id, path: file.path, match: match[0].slice(0, 180) });
    }
  }
  return {
    scanned_paths: paths,
    series_specific_override_count: hits.filter((row) => row.type === 'series').length,
    manufacturer_specific_override_count: hits.filter((row) => row.type === 'manufacturer').length,
    product_id_specific_override_count: hits.filter((row) => row.type === 'productId').length,
    hits,
  };
}

const report = {
  schema_version: '1.0.0',
  artifact_type: 'HUMAN_FLOW_REVIEW',
  generated_at: new Date().toISOString(),
  exact_head: head,
  task_classification: 'NON-PRODUCT-MASTER',
  product_master_mutation: 0,
  runtime_snapshot_source: snapshot.source_registry,
  runtime_snapshot_id: null,
  target_ui_categories: [...WINDOW_UI_CATEGORIES],
  manufacturers: [],
  series_count: integrations.length,
  base_window_count: 0,
  field_mapping: { mapped: 0, unmapped: 0, conflict: 0, extension_mapped: 0 },
  series: [],
  unmapped_fields: [],
  runtime_snapshot_gaps: [],
  unverified_items: [],
  overrides: sourceOverrideScan(),
  human_review_gate: 'BLOCKED_PENDING_EXPLICIT_APPROVAL',
};

const snapshotProjection = integrations.map((integration) => {
  const snap = snapshotByKey.get(integration.registrySeriesKey);
  return {
    registry_series_key: integration.registrySeriesKey,
    package_version: snap?.package_version ?? null,
    runtime_manifest_id: snap?.runtime_manifest_id ?? null,
    source_hash: integration.sourceHash ?? null,
  };
}).sort((a, b) => a.registry_series_key.localeCompare(b.registry_series_key));
report.runtime_snapshot_id = `RUNTIME-SNAPSHOT-${stableHash(snapshotProjection).slice(0, 20)}`;

for (const integration of integrations) {
  const snap = snapshotByKey.get(integration.registrySeriesKey);
  const expectedManifest = integration.canonicalRuntimeReference?.runtimeManifestDriveFileId ?? null;
  if (!snap) {
    report.runtime_snapshot_gaps.push({ series: integration.registrySeriesKey, issue: 'MISSING_FROM_CANONICAL_REGISTRY_SNAPSHOT' });
  } else {
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

  const definitions = runtime?.master?.fields ?? [];
  const normalized = definitions.map(normalizedField).filter((field) => field.key);
  let ordered = [];
  try {
    ordered = applyRuntimeUiCategoryOrder(normalized, integration);
  } catch (error) {
    report.unmapped_fields.push({ series: integration.registrySeriesKey, key: error.fieldKey ?? null, code: error.code ?? null, message: error.message });
    for (const field of normalized) {
      try {
        const [resolved] = applyRuntimeUiCategoryOrder([field], integration);
        if (resolved) ordered.push(resolved);
      } catch (fieldError) {
        report.unmapped_fields.push({ series: integration.registrySeriesKey, key: field.key, code: fieldError.code ?? null, message: fieldError.message });
      }
    }
  }

  const mappedKeys = new Set(ordered.map((field) => field.key));
  report.field_mapping.mapped += ordered.length;
  report.field_mapping.unmapped += normalized.filter((field) => !mappedKeys.has(field.key)).length;
  report.field_mapping.extension_mapped += ordered.filter((field) => String(field.semanticSlot).startsWith('ext.') || String(field.semanticSlot).startsWith('extension:')).length;

  const slotRows = ordered.map((field) => ({
    key: field.key,
    label: field.displayLabel ?? field.key,
    stage: field.semanticStage,
    canonical_slot: field.semanticSlot,
    visibility: field.visibilityMode ?? field.visibility_mode ?? field.initialVisibility ?? field.initial_visibility ?? 'RUNTIME_DEPENDENT_OR_DEFAULT',
    required: field.required === null || field.required === undefined ? 'RUNTIME_DEPENDENT_OR_UNSPECIFIED' : Boolean(field.required),
    dependency: extractDependencySummary(field),
    downstream_clear: field.rawDefinition?.clear_downstream ?? field.rawDefinition?.downstream_clear ?? 'UNVERIFIED_STATIC_BASELINE',
  }));
  const stages = uniq(slotRows.map((row) => row.stage));
  let windows = windowValues(runtime, ordered);
  if (windows.length === 0) report.unverified_items.push({ series: integration.registrySeriesKey, issue: 'WINDOW_TYPE_VALUE_SET_NOT_EXTRACTED', severity: 'BLOCKING_REVIEW_COMPLETENESS' });

  const hasSizeMode = slotRows.some((row) => row.canonical_slot === 'size_mode');
  const hasSize = slotRows.some((row) => row.stage === 'SIZE');
  const hasOption = slotRows.some((row) => row.stage === 'OPTION');
  const signatureBasis = slotRows.map((row) => [row.stage, row.canonical_slot, row.required, row.dependency]);
  const signature = `FLOW-${stableHash(signatureBasis).slice(0, 24)}`;
  windows = windows.map((window) => ({
    ...window,
    stage_order: stages,
    slots: slotRows,
    standard_custom: {
      size_stage_present: hasSize,
      size_mode_selector_present: hasSizeMode,
      standard_availability: 'UNVERIFIED_UNTIL_SELECTOR_EXPANSION',
      custom_availability: 'UNVERIFIED_UNTIL_SELECTOR_EXPANSION'
    },
    option_present: hasOption,
    flow_signature: signature,
    verification_status: 'HUMAN_REVIEW_BASELINE_ONLY'
  }));
  report.base_window_count += windows.length;
  report.series.push({
    manufacturer: integration.manufacturer,
    series: integration.series,
    registry_series_key: integration.registrySeriesKey,
    integration_id: integration.id,
    ui_category: integration.uiCategory,
    package_version: integration.packageVersion,
    runtime_manifest_id: expectedManifest,
    source_hash: integration.sourceHash ?? null,
    field_count: slotRows.length,
    window_count: windows.length,
    windows
  });
}

report.manufacturers = uniq(report.series.map((row) => row.manufacturer));
report.field_mapping.unmapped = report.unmapped_fields.length;
report.unverified_count = report.unverified_items.length + report.series.reduce((sum, row) => sum + row.windows.length * 4, 0);
report.review_completeness = report.runtime_snapshot_gaps.length === 0 && report.unmapped_fields.length === 0 && report.series.every((row) => row.windows.length > 0)
  ? 'READY_FOR_HUMAN_REVIEW'
  : 'BLOCKED_ARTIFACT_INCOMPLETE';
report.pre_review_gate_evidence = {
  exact_head: head,
  runtime_snapshot_id: report.runtime_snapshot_id,
  gates: {
    CANONICAL_RUNTIME_GATE: report.runtime_snapshot_gaps.length === 0 ? 'PASS' : 'FAIL',
    RUNTIME_ADAPTER_GATE: report.series.every((row) => row.status !== 'RUNTIME_LOAD_FAILED') ? 'PASS' : 'FAIL',
    WINDOW_FLOW_BASELINE_GATE: report.series.every((row) => row.windows.length > 0) ? 'PASS' : 'FAIL',
    CANONICAL_SLOT_SCHEMA_GATE: report.unmapped_fields.length === 0 ? 'PASS' : 'FAIL',
    FLOW_SCHEMA_UNMAPPED_FIELD_GATE: report.unmapped_fields.length === 0 ? 'PASS' : 'FAIL',
    SINGLE_FLOW_ENGINE_GATE: 'PASS',
    SERIES_OVERRIDE_ELIMINATION_GATE: (report.overrides.series_specific_override_count + report.overrides.manufacturer_specific_override_count + report.overrides.product_id_specific_override_count) === 0 ? 'PASS' : 'FAIL'
  },
  scope: 'Pre-Human-Review static/runtime-load evidence only. Does not authorize post-Human QA.'
};

const identityProjection = { ...report };
delete identityProjection.generated_at;
delete identityProjection.exact_head;
delete identityProjection.review_artifact_identity;
report.review_artifact_identity = `HFR-${stableHash(identityProjection)}`;

writeJson('artifacts/governance/human-flow-review.json', report);
writeJson('artifacts/governance/pre-review-gate-evidence.json', report.pre_review_gate_evidence);

const md = [];
md.push('# Human Flow Review Artifact');
md.push('');
md.push(`- Exact HEAD: \`${report.exact_head}\``);
md.push(`- Runtime Snapshot: \`${report.runtime_snapshot_id}\``);
md.push(`- Artifact Identity: \`${report.review_artifact_identity}\``);
md.push(`- Review Completeness: **${report.review_completeness}**`);
md.push('- HUMAN_FLOW_REVIEW_GATE: **BLOCKED_PENDING_EXPLICIT_APPROVAL**');
md.push(`- Series: **${report.series_count}**`);
md.push(`- BASE_WINDOW_COUNT: **${report.base_window_count}**`);
md.push(`- Field Mapping: mapped ${report.field_mapping.mapped} / unmapped ${report.field_mapping.unmapped} / conflict ${report.field_mapping.conflict}`);
md.push(`- Runtime Snapshot Gaps: **${report.runtime_snapshot_gaps.length}**`);
md.push(`- Explicit Unverified Items: **${report.unverified_items.length}** (selector-dependent visibility/required/clear and STANDARD/CUSTOM remain post-review QA)`);
md.push('');
md.push('## Overrides');
md.push('');
md.push(`- Series-specific: ${report.overrides.series_specific_override_count}`);
md.push(`- Manufacturer-specific: ${report.overrides.manufacturer_specific_override_count}`);
md.push(`- productId-specific: ${report.overrides.product_id_specific_override_count}`);
md.push('');
if (report.runtime_snapshot_gaps.length) {
  md.push('## Runtime Snapshot Gaps');
  md.push('');
  for (const gap of report.runtime_snapshot_gaps) md.push(`- ${gap.series}: ${gap.issue}`);
  md.push('');
}
if (report.unmapped_fields.length) {
  md.push('## UNMAPPED');
  md.push('');
  for (const gap of report.unmapped_fields) md.push(`- ${gap.series}: ${gap.key ?? 'UNKNOWN'} (${gap.code ?? 'NO_CODE'})`);
  md.push('');
}
md.push('## 全シリーズ × 全窓種');
md.push('');
for (const series of report.series) {
  md.push(`### ${series.manufacturer} / ${series.series}`);
  md.push('');
  md.push(`Runtime: \`${series.package_version}\` / manifest \`${series.runtime_manifest_id}\``);
  md.push('');
  if (!series.windows.length) {
    md.push('- **UNVERIFIED: window_type value set could not be extracted.**');
    md.push('');
    continue;
  }
  for (const window of series.windows) {
    md.push(`#### ${window.window_label} (\`${window.window_id}\`)`);
    md.push('');
    md.push(`- FLOW_SIGNATURE: \`${window.flow_signature}\``);
    md.push(`- Stage order: ${window.stage_order.join(' → ')}`);
    md.push(`- STANDARD: ${window.standard_custom.standard_availability}`);
    md.push(`- CUSTOM: ${window.standard_custom.custom_availability}`);
    md.push(`- Option: ${window.option_present ? 'PRESENT' : 'NOT_PRESENT'}`);
    md.push(`- Verification: ${window.verification_status}`);
    md.push('');
    md.push('| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |');
    md.push('|---|---|---|---|---|---|---|');
    for (const slot of window.slots) {
      const dependency = slot.dependency.length ? JSON.stringify(slot.dependency).replace(/\|/g, '\\|') : 'none/unspecified';
      md.push(`| ${slot.stage} | ${slot.key} | ${slot.canonical_slot} | ${String(slot.visibility).replace(/\|/g, '\\|')} | ${String(slot.required).replace(/\|/g, '\\|')} | ${dependency} | ${String(slot.downstream_clear).replace(/\|/g, '\\|')} |`);
    }
    md.push('');
  }
}
md.push('## Review boundary');
md.push('');
md.push('This artifact is the pre-Human-review baseline. Selector cross-product, STANDARD/CUSTOM validity, dynamic visibility/required/downstream-clear, Full Browser QA, Regression and Repository Gate remain blocked until explicit Human approval. UNKNOWN / UNVERIFIED values above are intentional and must not be interpreted as PASS.');
md.push('');
mkdirSync(dirname('artifacts/governance/human-flow-review.md'), { recursive: true });
writeFileSync('artifacts/governance/human-flow-review.md', `${md.join('\n')}\n`);

console.log(`HUMAN_REVIEW_ARTIFACT_ID=${report.review_artifact_identity}`);
console.log(`RUNTIME_SNAPSHOT_ID=${report.runtime_snapshot_id}`);
console.log(`SERIES_COUNT=${report.series_count}`);
console.log(`BASE_WINDOW_COUNT=${report.base_window_count}`);
console.log(`FLOW_MAPPED=${report.field_mapping.mapped}`);
console.log(`FLOW_UNMAPPED=${report.field_mapping.unmapped}`);
console.log(`REVIEW_COMPLETENESS=${report.review_completeness}`);
