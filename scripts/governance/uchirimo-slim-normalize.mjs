import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { getRuntimeMasterEntry } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { adaptUchirimoTabularV1 } from '../../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import { normalizeUchirimoGlassMatrix, compareUchirimoGlassSemantics } from '../../src/catalog/runtime-master/uchirimo-slim-canonical.mjs';
import { normalizeGlassSpecifications, projectGlassSpecifications } from '../../src/catalog/runtime-master/uchirimo-glass-rule-model.mjs';

const out = process.env.UCHIRIMO_SLIM_OUT ?? 'artifacts/uchirimo-slim';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const entry = getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓');
const pkg = await loadCanonicalWorkbookRuntimePackage(entry);
if (!pkg.integrity.match) throw new Error('FORMAL_RUNTIME_INTEGRITY_FAILED');
const role = Object.keys(pkg.documents).find((name) => pkg.documents[name]?.glass_node_matrix);
const formal = pkg.documents[role];
const matrixSlim = normalizeUchirimoGlassMatrix(formal);
const slim = normalizeGlassSpecifications(matrixSlim);
const projectedGlass = projectGlassSpecifications(slim);
const equivalence = compareUchirimoGlassSemantics(formal, slim);
if (equivalence.status !== 'PASS') throw new Error(`SLIM_EQUIVALENCE_FAILED:${JSON.stringify(equivalence)}`);
const slimPackage = { ...pkg, documents: { ...pkg.documents, [role]: slim } };
const old = adaptUchirimoTabularV1(pkg);
const candidate = adaptUchirimoTabularV1(slimPackage);
const seed = { room_specification: 'residential', window_type: 'sliding_window',
  sash_configuration: 'two_panel', size_class: 'window', glass_family: 'insulating_glass' };
const measure = (adapter, iterations) => {
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) adapter.resolver(seed);
  return Math.round((performance.now() - start) * 1000) / 1000;
};
const legacyRows = formal.glass_node_matrix.length;
const profileStatuses = slim.glass_compatibility_profiles.reduce((n, row) => n + row.node_statuses.length, 0);
const slimCompatibilityRows = slim.glass_compatibility_profiles.length + profileStatuses;
const candidateBody = {
  schema_version: 'UCHIRIMO_SLIM_CANONICAL_CANDIDATE_V2',
  lifecycle: 'WORKING_CANDIDATE_NOT_FORMAL',
  source_formal: { product_master_file_id: '11p2SkAXYNAAJwWYGBjmWOTVO6rZquyJf',
    runtime_manifest_file_id: entry.runtimeManifestDriveFileId, runtime_manifest_sha256: pkg.integrity.actual,
    package_version: entry.masterVersion },
  canonical: slim,
};
mkdirSync(out, { recursive: true });
const candidateBytes = Buffer.from(JSON.stringify(candidateBody, null, 2) + '\n');
writeFileSync(`${out}/uchirimo-slim-working-candidate.json`, candidateBytes);
const report = {
  task: 'UCHIRIMO_SLIM_CANONICAL_NORMALIZATION', source_formal: candidateBody.source_formal,
  source_integrity: 'PASS', legacy_reference: 'UNCHANGED_FORMAL_RUNTIME_AND_FORMAL_WORKBOOK',
  classification: { base_nodes: formal.product_nodes.length, glass_specs: formal.glass_specs.length,
    legacy_cartesian_derived_rows: legacyRows, independent_node_glass_pair_facts: 0,
    retained_glass_configurations: projectedGlass.length,
    glass_model: Object.fromEntries(['base', 'decoration', 'cavity', 'assessment', 'rules', 'identities'].map((key) => [key, slim.glass_rule_model[key].length])),
    compatibility_profiles: slim.glass_compatibility_profiles.length,
    profile_node_dispositions: profileStatuses, dependency_rules: slim.dependency_rules.length,
    size_constraints: slim.glass_size_rules?.length ?? 0,
    installation_rules: slim.installation_rules?.length ?? 0,
    evidence_rows: slim.evidence.length, manual_check_routes: pkg.documents.judgment_engine?.manual_check_routes?.length ?? null },
  equivalence,
  physical_rows: { before_compatibility: legacyRows, after_compatibility: slimCompatibilityRows,
    compatibility_rows_removed: legacyRows - slimCompatibilityRows,
    compatibility_reduction_percent: Math.round((1 - slimCompatibilityRows / legacyRows) * 10000) / 100,
    before_nodes_glass_compatibility: formal.product_nodes.length + formal.glass_specs.length + legacyRows,
    after_nodes_glass_compatibility: slim.product_nodes.length + ['base', 'decoration', 'cavity', 'assessment', 'rules', 'identities'].reduce((n, key) => n + slim.glass_rule_model[key].length, 0) + slimCompatibilityRows,
    before_glass_spec_size_and_allowed_rows: formal.glass_specs.length + formal.glass_size_mapping.length + formal.allowed_values.filter((row) => row.field_name === 'glass_spec_id').length,
    after_glass_model_rows: ['base', 'decoration', 'cavity', 'assessment', 'rules', 'identities'].reduce((n, key) => n + slim.glass_rule_model[key].length, 0),
    derived_projection_descriptors: 1 },
  runtime_smoke: { candidate_adapter_loaded: Boolean(candidate.master), same_eligible_glass_sets: formal.product_nodes.every((node) =>
    JSON.stringify(old.master.glassSpecsByNodeId.get(node.node_id).map((glass) => glass.glass_spec_id)) ===
    JSON.stringify(candidate.master.glassSpecsByNodeId.get(node.node_id).map((glass) => glass.glass_spec_id))) },
  benchmark_local: { iterations: 1000, warmup: 100,
    before_ms: null, after_ms: null, note: 'Local adapter resolver microbenchmark only; no V12 shard completion or timeout claim' },
  qa_current: { formal_runtime_changed: false, active_controller_changed: false,
    recurring_shard_count_reduction_verified: false, existing_pass_carry_forward: 'UNCHANGED_EXISTING_EVIDENCE',
    residual_controller_qa: 'NOT_EXECUTED_ON_CANDIDATE' },
  gate: { slim_normalization: 'PASS', semantic_equivalence: 'PASS', qa_complexity_reduction: 'BLOCKED',
    formal_adoption: 'BLOCKED_PENDING_RECURRING_QA_PERFORMANCE_AND_RESIDUAL_E2E' },
  candidate_sha256: sha(candidateBytes),
};
measure(old, 100); measure(candidate, 100);
report.benchmark_local.before_ms = measure(old, 1000);
report.benchmark_local.after_ms = measure(candidate, 1000);
if (!report.runtime_smoke.same_eligible_glass_sets) throw new Error('SLIM_RUNTIME_GLASS_CANDIDATE_MISMATCH');
writeFileSync(`${out}/uchirimo-slim-migration-report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ out, sha256: report.candidate_sha256, equivalence, physical_rows: report.physical_rows,
  benchmark_local: report.benchmark_local, gate: report.gate }, null, 2));
