import { currentExactHead, readJson, writeJson } from './governance-lib.mjs';
import { expectedFieldUniverse, integrationByRegistryKey } from './runtime-field-coverage.mjs';

const head = currentExactHead();
const review = readJson('artifacts/governance/human-flow-review.json');
if (review.exact_head !== head) throw new Error(`Coverage verifier exact HEAD mismatch: ${review.exact_head} != ${head}`);

const uniq = (values) => [...new Set(values.filter(Boolean).map(String))];
const keysOf = (fields = []) => uniq(fields.map((field) => field?.key ?? field?.field_name));

const failures = [];
const seriesResults = [];
const snapshot = readJson('project-governance/runtime-snapshot.json');
const expectedSeries = snapshot.entries.map(row => row.registry_series_key);
const actualSeries = (review.series ?? []).map(row => row.registry_series_key);
if (new Set(actualSeries).size !== actualSeries.length) failures.push({issue:'DUPLICATE_SERIES'});
for (const key of expectedSeries) if (!actualSeries.includes(key)) failures.push({issue:'SOURCE_SERIES_MISSING_FROM_ARTIFACT',series:key});
for (const key of actualSeries) if (!expectedSeries.includes(key)) failures.push({issue:'UNREGISTERED_ARTIFACT_SERIES',series:key});
if (review.base_window_count !== (review.series ?? []).reduce((sum,s)=>sum+(s.windows?.length ?? 0),0)) failures.push({issue:'BASE_WINDOW_COUNT_MISMATCH'});


for (const series of review.series ?? []) {
  const integration = integrationByRegistryKey(series.registry_series_key);
  if (!integration) {
    failures.push({ series: series.registry_series_key, issue: 'APP_RUNTIME_INTEGRATION_NOT_FOUND' });
    continue;
  }

  const expected = await expectedFieldUniverse(integration, series.windows ?? []);
  const sourceKeys = keysOf(expected.sourceFields);
  const adapterKeys = keysOf(expected.adapterFields);
  const artifactKeys = uniq((series.windows ?? []).flatMap((window) => (window.slots ?? []).map((slot) => slot.key)));
  const excludedKeys = keysOf((expected.excludedSourceFields ?? []).map((row) => row.field));

  for (const error of expected.sourceMappingErrors ?? []) {
    failures.push({
      series: series.registry_series_key,
      issue: 'AUTHORITATIVE_SOURCE_FIELD_MAPPING_FAILED',
      key: error.key,
      code: error.code ?? null,
      message: error.message,
    });
  }
  for (const error of expected.baselineErrors ?? []) {
    failures.push({
      series: series.registry_series_key,
      issue: 'BASELINE_RESOLVE_FAILED',
      window: error.window_id,
      code: error.code ?? null,
      message: error.message,
    });
  }

  const sourceMissingFromAdapter = sourceKeys.filter((key) => !adapterKeys.includes(key));
  const adapterMissingFromArtifact = adapterKeys.filter((key) => !artifactKeys.includes(key));
  const artifactOutsideAdapter = artifactKeys.filter((key) => !adapterKeys.includes(key));

  if (sourceMissingFromAdapter.length) {
    failures.push({
      series: series.registry_series_key,
      issue: 'AUTHORITATIVE_SOURCE_FIELD_MISSING_FROM_ADAPTER',
      keys: sourceMissingFromAdapter,
    });
  }
  if (adapterMissingFromArtifact.length) {
    failures.push({
      series: series.registry_series_key,
      issue: 'ADAPTER_FIELD_MISSING_FROM_ARTIFACT',
      keys: adapterMissingFromArtifact,
    });
  }

  const perWindowMissing = [];
  for (const window of series.windows ?? []) {
    const baselineKeys = keysOf(expected.baselineByWindow.get(window.window_id) ?? []);
    const artifactWindowKeys = new Set((window.slots ?? []).map((slot) => slot.key));
    const missing = baselineKeys.filter((key) => !artifactWindowKeys.has(key));
    if (missing.length) perWindowMissing.push({ window_id: window.window_id, keys: missing });
  }
  if (perWindowMissing.length) {
    failures.push({
      series: series.registry_series_key,
      issue: 'BASELINE_VISIBLE_FIELD_MISSING_PER_WINDOW',
      windows: perWindowMissing,
    });
  }

  const builderSeries = (review.field_coverage?.series ?? []).find((row) => row.registry_series_key === series.registry_series_key);
  if (!builderSeries) {
    failures.push({ series: series.registry_series_key, issue: 'BUILDER_SERIES_COVERAGE_RECORD_MISSING' });
  } else {
    const builderMismatch = [];
    if (builderSeries.source_field_count !== sourceKeys.length) builderMismatch.push({ field: 'source_field_count', builder: builderSeries.source_field_count, verifier: sourceKeys.length });
    if (builderSeries.expected_union_field_count !== adapterKeys.length) builderMismatch.push({ field: 'expected_union_field_count', builder: builderSeries.expected_union_field_count, verifier: adapterKeys.length });
    if (builderSeries.artifact_field_count_after !== artifactKeys.length) builderMismatch.push({ field: 'artifact_field_count_after', builder: builderSeries.artifact_field_count_after, verifier: artifactKeys.length });
    if (builderMismatch.length) failures.push({ series: series.registry_series_key, issue: 'BUILDER_VERIFIER_FIELD_UNIVERSE_DRIFT', mismatches: builderMismatch });
  }

  const status = (expected.sourceMappingErrors?.length ?? 0) === 0
    && (expected.baselineErrors?.length ?? 0) === 0
    && sourceMissingFromAdapter.length === 0
    && adapterMissingFromArtifact.length === 0
    && perWindowMissing.length === 0
      ? 'PASS'
      : 'FAIL';

  seriesResults.push({
    registry_series_key: series.registry_series_key,
    series: series.series,
    adapter_type: integration.adapterType,
    source: expected.source,
    invariant: 'AUTHORITATIVE_SOURCE_FIELD_UNIVERSE_SUBSET_ADAPTER_FIELD_UNIVERSE_SUBSET_ARTIFACT_FIELD_UNIVERSE',
    raw_source_field_count: keysOf(expected.rawSourceFields).length,
    explicitly_excluded_source_field_count: excludedKeys.length,
    explicitly_excluded_source_fields: excludedKeys,
    authoritative_source_field_count: sourceKeys.length,
    adapter_field_count: adapterKeys.length,
    artifact_field_count: artifactKeys.length,
    source_missing_from_adapter: sourceMissingFromAdapter,
    adapter_missing_from_artifact: adapterMissingFromArtifact,
    artifact_outside_adapter: artifactOutsideAdapter,
    per_window_missing: perWindowMissing,
    status,
  });
}

if (review.field_coverage?.status !== 'PASS') failures.push({ issue: 'BUILDER_FIELD_COVERAGE_NOT_PASS', actual: review.field_coverage?.status ?? null });
if ((review.field_coverage?.missing_after_count ?? 0) !== 0) failures.push({ issue: 'BUILDER_REPORTS_MISSING_FIELDS_AFTER_RECONCILIATION', count: review.field_coverage?.missing_after_count });

const result = {
  schema_version: '2.0.0',
  exact_head: head,
  review_artifact_identity: review.review_artifact_identity,
  invariant: 'AUTHORITATIVE_SOURCE_FIELD_UNIVERSE_SUBSET_ADAPTER_FIELD_UNIVERSE_SUBSET_ARTIFACT_FIELD_UNIVERSE',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  series_count: seriesResults.length,
  series: seriesResults,
  failures,
};
writeJson('artifacts/governance/human-flow-field-coverage-verification.json', result);
console.log(`HUMAN_FLOW_FIELD_COVERAGE_VERIFICATION=${result.status}`);
console.log(`HUMAN_FLOW_FIELD_COVERAGE_FAILURES=${failures.length}`);
if (result.status !== 'PASS') process.exitCode = 42;
