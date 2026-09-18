import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { GLOBAL_WINDOW_STAGE_ORDER, FRAME_ANGLE_CANONICAL_VALUES, FRAME_ANGLE_CLASSIFICATIONS } from '../../src/catalog/runtime-master/canonical-window-semantic-schema.mjs';
import { currentExactHead, readJson, writeJson } from './governance-lib.mjs';
import { expectedFieldUniverse, integrationByRegistryKey } from './runtime-field-coverage.mjs';

await import('./generate-human-flow-review.mjs');

const head = currentExactHead();
const reviewPath = 'artifacts/governance/human-flow-review.json';
const prePath = 'artifacts/governance/pre-review-gate-evidence.json';
const review = readJson(reviewPath);
if (review.exact_head !== head) throw new Error(`Human review artifact exact HEAD mismatch: ${review.exact_head} != ${head}`);

const stableHash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stageRank = new Map(GLOBAL_WINDOW_STAGE_ORDER.map((stage, index) => [stage, index]));
const uniq = (values) => [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))];
const keyList = (fields = []) => uniq(fields.map((field) => field?.key));

function dependencyFor(field = {}) {
  const raw = field.rawDefinition ?? {};
  const candidates = [field.parentFields, field.dependsOn, raw.parent_fields, raw.parentFields, raw.depends_on, raw.dependsOn, raw.upstream_fields];
  for (const value of candidates) if (Array.isArray(value) && value.length) return value;
  for (const value of candidates) if (value !== null && value !== undefined && value !== '') return [value];
  return [];
}

function slotRow(field, visible = null) {
  return {
    key: field.key,
    label: visible?.displayLabel ?? field.displayLabel ?? field.label ?? field.key,
    stage: field.semanticStage,
    canonical_slot: field.semanticSlot,
    visibility: visible ? 'VISIBLE_AFTER_WINDOW_TYPE_SELECTION' : 'RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED',
    required: visible ? Boolean(visible.required) : field.required === null || field.required === undefined ? 'RUNTIME_DEPENDENT_OR_UNSPECIFIED' : Boolean(field.required),
    classification: visible?.classification ?? visible?.selectionMode ?? field.selectionMode ?? field.selection_mode ?? (visible ? 'USER_SELECTABLE_OR_CONDITIONAL_UNVERIFIED' : 'RUNTIME_CLASSIFICATION_UNVERIFIED'),
    allowed_values: visible ? (visible.values ?? []).filter((choice) => choice.disabled !== true).map((choice) => choice.value) : [],
    dependency: visible?.parentFields?.length ? visible.parentFields : dependencyFor(field),
    downstream_clear: 'UNVERIFIED_POST_HUMAN_QA',
    source_coverage: 'AUTHORITATIVE_OR_BASELINE_UNIVERSE',
  };
}

function frameAngleState(slots = [], runtimeProperties = [], previous = null) {
  const slot = slots.find((row) => row.canonical_slot === 'frame_angle' || row.key === 'frame_angle') ?? null;
  const property = runtimeProperties.find((row) => row.canonical_slot === 'frame_angle' || row.key === 'frame_angle') ?? null;
  if (!slot && !property) return previous ?? {
    canonical_slot: 'frame_angle', stage: 'CONFIGURATION', canonical_values: [...FRAME_ANGLE_CANONICAL_VALUES],
    runtime_presence: 'ABSENT_FROM_FORMAL_RUNTIME', classification: 'NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED',
    visibility: 'ABSENT_FROM_FORMAL_RUNTIME', required: false, allowed_values: [], invalid_canonical_values: [], fixed_value: null,
    dependency: [], downstream_clear: 'NOT_APPLICABLE_OR_UNVERIFIED', standard_custom_impact: 'NO_RUNTIME_PROJECTION_TO_EVALUATE', inference_used: false,
  };
  const allowed = [...new Set((slot?.allowed_values ?? previous?.allowed_values ?? []).map((value) => String(value)))];
  const classification = property?.classification ?? slot?.classification ?? previous?.classification ?? 'RUNTIME_CLASSIFICATION_UNVERIFIED';
  return {
    ...(previous ?? {}),
    canonical_slot: 'frame_angle', stage: 'CONFIGURATION', canonical_values: [...FRAME_ANGLE_CANONICAL_VALUES],
    runtime_presence: 'PRESENT',
    classification: FRAME_ANGLE_CLASSIFICATIONS.includes(classification) ? classification : 'RUNTIME_CLASSIFICATION_UNVERIFIED',
    visibility: slot?.visibility ?? previous?.visibility ?? 'HIDDEN_SELECTOR_RUNTIME_PROPERTY',
    required: slot?.required ?? previous?.required ?? false,
    allowed_values: allowed,
    invalid_canonical_values: allowed.filter((value) => !FRAME_ANGLE_CANONICAL_VALUES.includes(value)),
    fixed_value: property?.classification === 'FIXED' ? property.value ?? previous?.fixed_value ?? null : previous?.fixed_value ?? null,
    dependency: slot?.dependency ?? previous?.dependency ?? [],
    downstream_clear: slot?.downstream_clear ?? previous?.downstream_clear ?? 'UNVERIFIED_POST_HUMAN_QA',
    standard_custom_impact: previous?.standard_custom_impact ?? 'UNVERIFIED_POST_HUMAN_QA',
    inference_used: false,
  };
}

function recomputeWindow(window, expectedFields, baselineFields) {
  const expectedOrder = new Map(expectedFields.map((field, index) => [field.key, index]));
  const baselineByKey = new Map((baselineFields ?? []).map((field) => [field.key, field]));
  const rows = new Map((window.slots ?? []).map((row) => [row.key, { ...row }]));

  for (const field of expectedFields) {
    if (!rows.has(field.key)) rows.set(field.key, slotRow(field, baselineByKey.get(field.key) ?? null));
  }

  const orderedRows = [...rows.values()].sort((a, b) => {
    const ar = expectedOrder.has(a.key) ? expectedOrder.get(a.key) : Number.MAX_SAFE_INTEGER;
    const br = expectedOrder.has(b.key) ? expectedOrder.get(b.key) : Number.MAX_SAFE_INTEGER;
    if (ar !== br) return ar - br;
    const as = stageRank.get(a.stage) ?? Number.MAX_SAFE_INTEGER;
    const bs = stageRank.get(b.stage) ?? Number.MAX_SAFE_INTEGER;
    return as - bs || String(a.key).localeCompare(String(b.key));
  });

  const stages = uniq(orderedRows.map((row) => row.stage)).sort((a, b) => (stageRank.get(a) ?? 999) - (stageRank.get(b) ?? 999));
  const signatureBasis = orderedRows.map((row) => [row.stage, row.canonical_slot, row.visibility, row.required, row.dependency]);
  const previous = window.standard_custom ?? {};
  return {
    ...window,
    stage_order: stages,
    slots: orderedRows,
    frame_angle: frameAngleState(orderedRows, window.runtime_properties ?? [], window.frame_angle ?? null),
    standard_custom: {
      ...previous,
      size_stage_present: orderedRows.some((row) => row.stage === 'SIZE'),
      size_mode_selector_present: orderedRows.some((row) => row.canonical_slot === 'size_mode'),
    },
    option_present: orderedRows.some((row) => row.stage === 'OPTION'),
    flow_signature: `FLOW-${stableHash(signatureBasis).slice(0, 24)}`,
  };
}

const coverageSeries = [];
const coverageFailures = [];
const coverageWarnings = [];
const stageMatrix = [];

for (const series of review.series) {
  const integration = integrationByRegistryKey(series.registry_series_key);
  if (!integration) {
    const failure = { series: series.registry_series_key, issue: 'APP_RUNTIME_INTEGRATION_NOT_FOUND' };
    coverageFailures.push(failure);
    coverageSeries.push({ series: series.registry_series_key, status: 'FAIL', ...failure });
    continue;
  }

  const expected = await expectedFieldUniverse(integration, series.windows ?? []);
  for (const error of expected.sourceMappingErrors) {
    const row = { series: series.registry_series_key, issue: 'AUTHORITATIVE_SOURCE_FIELD_UNMAPPED', ...error };
    coverageFailures.push(row);
    if (!review.unmapped_fields.some((item) => item.series === row.series && item.key === row.key)) review.unmapped_fields.push(row);
  }
  for (const error of expected.baselineErrors) coverageFailures.push({ series: series.registry_series_key, issue: 'WINDOW_BASELINE_RESOLVE_FAILED_IN_COVERAGE', ...error });

  const expectedKeys = keyList(expected.expectedFields);
  const sourceKeys = keyList(expected.sourceFields);
  const baselineKeys = keyList(expected.baselineFields);
  const beforeKeys = uniq((series.windows ?? []).flatMap((window) => (window.slots ?? []).map((slot) => slot.key)));
  const missingBefore = expectedKeys.filter((key) => !beforeKeys.includes(key));

  series.windows = (series.windows ?? []).map((window) => recomputeWindow(window, expected.expectedFields, expected.baselineByWindow.get(window.window_id) ?? []));
  const afterKeys = uniq(series.windows.flatMap((window) => (window.slots ?? []).map((slot) => slot.key)));
  const missingAfter = expectedKeys.filter((key) => !afterKeys.includes(key));
  const unexpectedAfter = afterKeys.filter((key) => !expectedKeys.includes(key));
  if (missingAfter.length) coverageFailures.push({ series: series.registry_series_key, issue: 'EXPECTED_FIELD_MISSING_FROM_ARTIFACT', keys: missingAfter });
  if (unexpectedAfter.length) coverageWarnings.push({ series: series.registry_series_key, issue: 'ARTIFACT_FIELD_NOT_IN_SOURCE_OR_BASELINE_UNION', keys: unexpectedAfter });

  const perWindowMissing = [];
  for (const window of series.windows) {
    const baselineKeysForWindow = keyList(expected.baselineByWindow.get(window.window_id) ?? []);
    const artifactKeysForWindow = (window.slots ?? []).map((slot) => slot.key);
    const missing = baselineKeysForWindow.filter((key) => !artifactKeysForWindow.includes(key));
    if (missing.length) perWindowMissing.push({ window_id: window.window_id, keys: missing });
  }
  if (perWindowMissing.length) coverageFailures.push({ series: series.registry_series_key, issue: 'BASELINE_VISIBLE_FIELD_MISSING_PER_WINDOW', windows: perWindowMissing });

  series.field_count = afterKeys.length;
  series.field_universe_source = `${series.field_universe_source ?? 'UNKNOWN'}+SOURCE_COVERAGE_V2`;
  series.source_field_coverage = {
    status: missingAfter.length === 0 && expected.sourceMappingErrors.length === 0 && expected.baselineErrors.length === 0 && perWindowMissing.length === 0 ? 'PASS' : 'FAIL',
    authoritative_source: expected.source,
    source_field_count: sourceKeys.length,
    baseline_union_field_count: baselineKeys.length,
    expected_union_field_count: expectedKeys.length,
    artifact_field_count_before: beforeKeys.length,
    artifact_field_count_after: afterKeys.length,
    missing_before: missingBefore,
    missing_after: missingAfter,
    unexpected_after: unexpectedAfter,
  };

  coverageSeries.push({
    registry_series_key: series.registry_series_key,
    manufacturer: series.manufacturer,
    series: series.series,
    adapter_type: series.adapter_type,
    ...series.source_field_coverage,
  });

  const byStage = {};
  for (const stage of GLOBAL_WINDOW_STAGE_ORDER) byStage[stage] = [];
  for (const field of expected.expectedFields) {
    if (!field.semanticStage || !field.semanticSlot) continue;
    byStage[field.semanticStage] = uniq([...(byStage[field.semanticStage] ?? []), field.semanticSlot]);
  }
  stageMatrix.push({ series: series.series, registry_series_key: series.registry_series_key, stages: byStage });
}

review.schema_version = '1.2.0';
review.field_mapping.unmapped = review.unmapped_fields.length;
review.field_mapping.mapped = review.series.reduce((sum, series) => sum + (series.field_count ?? 0), 0);
review.field_coverage = {
  schema_version: '1.0.0',
  status: coverageFailures.length === 0 ? 'PASS' : 'FAIL',
  exact_head: head,
  series_count: coverageSeries.length,
  total_expected_fields: coverageSeries.reduce((sum, row) => sum + (row.expected_union_field_count ?? 0), 0),
  missing_before_count: coverageSeries.reduce((sum, row) => sum + (row.missing_before?.length ?? 0), 0),
  missing_after_count: coverageSeries.reduce((sum, row) => sum + (row.missing_after?.length ?? 0), 0),
  series: coverageSeries,
  failures: coverageFailures,
  warnings: coverageWarnings,
};

for (const failure of coverageFailures) {
  if (!review.unverified_items.some((item) => item.series === failure.series && item.issue === failure.issue)) {
    review.unverified_items.push({ ...failure, severity: 'BLOCKING_REVIEW_COMPLETENESS' });
  }
}

const blockingUnverified = review.unverified_items.filter((row) => row.severity === 'BLOCKING_REVIEW_COMPLETENESS');
const frameAngleWindows = review.series.flatMap((series) => series.windows.map((window) => ({ series: series.registry_series_key, window: window.window_id, ...(window.frame_angle ?? {}) })));
review.frame_angle_summary = {
  canonical_slot: 'frame_angle', stage: 'CONFIGURATION', canonical_values: [...FRAME_ANGLE_CANONICAL_VALUES],
  window_count: frameAngleWindows.length,
  runtime_present_count: frameAngleWindows.filter((row) => row.runtime_presence === 'PRESENT').length,
  absent_or_unverified_count: frameAngleWindows.filter((row) => row.runtime_presence !== 'PRESENT').length,
  invalid_canonical_value_count: frameAngleWindows.reduce((sum, row) => sum + (row.invalid_canonical_values?.length ?? 0), 0),
  inference_used: false,
};
review.unverified_count = review.unverified_items.length + review.frame_angle_summary.absent_or_unverified_count + review.series.reduce((sum, series) => sum + series.windows.reduce((windowSum, window) => windowSum + window.slots.filter((slot) => String(slot.visibility).includes('UNVERIFIED') || String(slot.required).includes('UNSPECIFIED') || String(slot.downstream_clear).includes('UNVERIFIED')).length, 0), 0);
review.review_completeness = review.runtime_snapshot_gaps.length === 0 && review.unmapped_fields.length === 0 && blockingUnverified.length === 0 && review.field_coverage.status === 'PASS' && review.series.every((series) => series.windows.length > 0 && series.field_count > 0)
  ? 'READY_FOR_HUMAN_REVIEW' : 'BLOCKED_ARTIFACT_INCOMPLETE';

review.pre_review_gate_evidence.gates.WINDOW_FLOW_BASELINE_GATE = review.series.every((series) => series.windows.length > 0 && series.field_count > 0) && review.field_coverage.status === 'PASS' ? 'PASS' : 'FAIL';
review.pre_review_gate_evidence.gates.CANONICAL_SLOT_SCHEMA_GATE = review.unmapped_fields.length === 0 && review.field_coverage.status === 'PASS' ? 'PASS' : 'FAIL';
review.pre_review_gate_evidence.gates.FLOW_SCHEMA_UNMAPPED_FIELD_GATE = review.unmapped_fields.length === 0 && review.field_coverage.status === 'PASS' ? 'PASS' : 'FAIL';
review.pre_review_gate_evidence.scope = 'Pre-Human-Review Runtime identity, authoritative source-field coverage, adapter/baseline field-universe reconciliation and per-window structural baseline evidence. Dynamic selector combinations remain explicitly UNVERIFIED until post-Human QA.';

const identityProjection = { ...review };
delete identityProjection.generated_at;
delete identityProjection.exact_head;
delete identityProjection.review_artifact_identity;
review.review_artifact_identity = `HFR-${stableHash(identityProjection)}`;

writeJson(reviewPath, review);
writeJson(prePath, review.pre_review_gate_evidence);
writeJson('artifacts/governance/human-flow-field-coverage.json', review.field_coverage);
writeJson('artifacts/governance/series-field-stage-matrix.json', { exact_head: head, stages: GLOBAL_WINDOW_STAGE_ORDER, series: stageMatrix });

const md = [];
md.push('# Human Flow Review Artifact', '', `- Exact HEAD: \`${review.exact_head}\``, `- Runtime Snapshot: \`${review.runtime_snapshot_id}\``, `- Artifact Identity: \`${review.review_artifact_identity}\``, `- Review Completeness: **${review.review_completeness}**`, '- HUMAN_FLOW_REVIEW_GATE: **BLOCKED_PENDING_EXPLICIT_APPROVAL**', `- Series: **${review.series_count}**`, `- BASE_WINDOW_COUNT: **${review.base_window_count}**`, `- Field Mapping: mapped ${review.field_mapping.mapped} / unmapped ${review.field_mapping.unmapped} / conflict ${review.field_mapping.conflict}`, `- Source Field Coverage: **${review.field_coverage.status}** / missing before repair ${review.field_coverage.missing_before_count} / missing after repair ${review.field_coverage.missing_after_count}`, `- Runtime Snapshot Gaps: **${review.runtime_snapshot_gaps.length}**`, `- Explicit Unverified Records: **${review.unverified_items.length}** / total unresolved slot properties ${review.unverified_count}`, '');

md.push('## frame_angle Canonical Coverage', '', `- Canonical values: ${review.frame_angle_summary.canonical_values.join(' / ')}`, `- Runtime present: **${review.frame_angle_summary.runtime_present_count} / ${review.frame_angle_summary.window_count}**`, `- Absent / N/A-or-gap unverified: **${review.frame_angle_summary.absent_or_unverified_count}**`, `- Invalid canonical values: **${review.frame_angle_summary.invalid_canonical_value_count}**`, '- UI inference used: **false**', '');
md.push('## Series Field Coverage', '', '| Series | Source | Source fields | Baseline union | Expected union | Before | After | Missing after |', '|---|---|---:|---:|---:|---:|---:|---:|');
for (const row of coverageSeries) md.push(`| ${row.series ?? row.registry_series_key ?? 'UNKNOWN'} | ${row.authoritative_source ?? 'N/A'} | ${row.source_field_count ?? 'N/A'} | ${row.baseline_union_field_count ?? 'N/A'} | ${row.expected_union_field_count ?? 'N/A'} | ${row.artifact_field_count_before ?? 'N/A'} | ${row.artifact_field_count_after ?? 'N/A'} | ${Array.isArray(row.missing_after) ? row.missing_after.length : 'N/A'} |`);
md.push('');

md.push('## Series × Stage / Canonical Slot Matrix', '', '| Series | PRODUCT | OPENING | CONFIGURATION | SIZE | FINISH | SCREEN | GLAZING | INSTALLATION_SURVEY | OPTION |', '|---|---|---|---|---|---|---|---|---|---|');
for (const row of stageMatrix) {
  const cell = (stage) => (row.stages[stage]?.length ? row.stages[stage].join(', ') : '—');
  md.push(`| ${row.series} | ${cell('PRODUCT')} | ${cell('OPENING')} | ${cell('CONFIGURATION')} | ${cell('SIZE')} | ${cell('FINISH')} | ${cell('SCREEN')} | ${cell('GLAZING')} | ${cell('INSTALLATION_SURVEY')} | ${cell('OPTION')} |`);
}
md.push('');

if (coverageFailures.length) {
  md.push('## BLOCKING Field Coverage Failures', '');
  for (const failure of coverageFailures) md.push(`- ${failure.series}: ${failure.issue}${failure.keys?.length ? ` → ${failure.keys.join(', ')}` : ''}`);
  md.push('');
}
if (coverageWarnings.length) {
  md.push('## Field Coverage Warnings', '');
  for (const warning of coverageWarnings) md.push(`- ${warning.series}: ${warning.issue}${warning.keys?.length ? ` → ${warning.keys.join(', ')}` : ''}`);
  md.push('');
}

md.push('## Overrides', '', `- Series-specific: ${review.overrides.series_specific_override_count}`, `- Manufacturer-specific: ${review.overrides.manufacturer_specific_override_count}`, `- productId-specific: ${review.overrides.product_id_specific_override_count}`, '');
if (review.runtime_snapshot_gaps.length) { md.push('## Runtime Snapshot Gaps', ''); for (const gap of review.runtime_snapshot_gaps) md.push(`- ${gap.series}: ${gap.issue}`); md.push(''); }
if (review.unmapped_fields.length) { md.push('## UNMAPPED', ''); for (const gap of review.unmapped_fields) md.push(`- ${gap.series}: ${gap.key ?? 'UNKNOWN'} (${gap.code ?? 'NO_CODE'})`); md.push(''); }
md.push('## UNVERIFIED', '');
for (const item of review.unverified_items) md.push(`- ${item.series}${item.window ? ` / ${item.window}` : ''}: ${item.issue} [${item.severity}]`);
md.push('', '## 全シリーズ × 全窓種', '');
for (const series of review.series) {
  md.push(`### ${series.manufacturer} / ${series.series}`, '', `Runtime: \`${series.package_version}\` / manifest \`${series.runtime_manifest_id}\``, `Adapter: \`${series.adapter_type}\` / field universe: \`${series.field_universe_source}\``, `Field coverage: **${series.source_field_coverage?.status ?? 'UNVERIFIED'}** / expected ${series.source_field_coverage?.expected_union_field_count ?? 'n/a'} / artifact ${series.source_field_coverage?.artifact_field_count_after ?? 'n/a'}`, '');
  if (!series.windows.length) { md.push('- **UNVERIFIED: window_type value set could not be extracted.**', ''); continue; }
  for (const window of series.windows) {
    md.push(`#### ${window.window_label} (\`${window.window_id}\`)`, '', `- FLOW_SIGNATURE: \`${window.flow_signature}\``, `- Stage order: ${window.stage_order.join(' → ')}`, `- STANDARD: ${window.standard_custom.standard_availability}`, `- CUSTOM: ${window.standard_custom.custom_availability}`, `- Option: ${window.option_present ? 'PRESENT_OR_CONDITIONAL' : 'NOT_PRESENT_IN_AUTHORITATIVE_UNIVERSE'}`, `- Verification: ${window.verification_status}`, '', '| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |', '|---|---|---|---|---|---|---|');
    for (const slot of window.slots) {
      const dependency = slot.dependency?.length ? JSON.stringify(slot.dependency).replace(/\|/g, '\\|') : 'none/unspecified';
      md.push(`| ${slot.stage} | ${slot.key} | ${slot.canonical_slot} | ${String(slot.visibility).replace(/\|/g, '\\|')} | ${String(slot.required).replace(/\|/g, '\\|')} | ${dependency} | ${String(slot.downstream_clear).replace(/\|/g, '\\|')} |`);
    }
    md.push(`- frame_angle: classification=${window.frame_angle?.classification ?? 'UNVERIFIED'} / visibility=${window.frame_angle?.visibility ?? 'UNVERIFIED'} / allowed=${(window.frame_angle?.allowed_values ?? []).join(', ') || '—'} / fixed=${window.frame_angle?.fixed_value ?? '—'} / dependency=${JSON.stringify(window.frame_angle?.dependency ?? [])} / clear=${window.frame_angle?.downstream_clear ?? 'UNVERIFIED'} / STANDARD-CUSTOM=${window.frame_angle?.standard_custom_impact ?? 'UNVERIFIED'}`);
    if (window.runtime_properties?.length) {
      md.push('', '**Fixed / Derived Runtime Properties (not selectors)**', '', '| Stage | Runtime property | Canonical Slot | classification | value / rule |', '|---|---|---|---|---|');
      for (const property of window.runtime_properties) {
        const detail = property.value ?? property.rule ?? property.source ?? 'derived from formal Runtime';
        md.push(`| ${property.stage ?? 'UNMAPPED_RUNTIME_PROPERTY'} | ${property.key} | ${property.canonical_slot ?? '—'} | ${property.classification} | ${String(detail).replace(/\|/g, '\\|')} |`);
      }
    }
    md.push('');
  }
}
md.push('## Review boundary', '', 'This artifact is built from the union of authoritative source field definitions and per-window baseline Runtime fields, then reconciled against the rendered Human Review field universe. Any authoritative or baseline-visible field omission is a blocking completeness failure. Selector-dependent visibility/required/dependency/downstream-clear and STANDARD/CUSTOM validity remain explicitly UNVERIFIED until post-Human Full Coverage QA.', '');
mkdirSync(dirname('artifacts/governance/human-flow-review.md'), { recursive: true });
writeFileSync('artifacts/governance/human-flow-review.md', `${md.join('\n')}\n`);

console.log(`HUMAN_REVIEW_ARTIFACT_ID=${review.review_artifact_identity}`);
console.log(`HUMAN_REVIEW_FIELD_COVERAGE=${review.field_coverage.status}`);
console.log(`HUMAN_REVIEW_FIELD_MISSING_BEFORE=${review.field_coverage.missing_before_count}`);
console.log(`HUMAN_REVIEW_FIELD_MISSING_AFTER=${review.field_coverage.missing_after_count}`);
console.log(`REVIEW_COMPLETENESS=${review.review_completeness}`);
if (review.field_coverage.status !== 'PASS') console.error(`HUMAN_REVIEW_FIELD_COVERAGE_FAILURE_DETAILS=${JSON.stringify(review.field_coverage.failures)}`);
if (review.field_coverage.status !== 'PASS') process.exitCode = 41;
