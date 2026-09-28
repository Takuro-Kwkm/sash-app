import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { currentExactHead } from './governance-lib.mjs';
import { runConstraint, recoveryIdentity, validateConstraintCaseEvidence } from './uchirimo-selector-batch-runner.mjs';
import { recoveryEvidenceNames } from './uchirimo-v11-recovery-controller.mjs';
import { getRuntimeMasterEntry } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { adaptUchirimoTabularV1 } from '../../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import { getRuntimeAppIntegration, normalizeRuntimeSelection, toRuntimeUiResult } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';

const candidatePath = 'data/uchirimo-slim/working-candidate.json';
const candidateBytes = readFileSync(candidatePath);
const candidateSha = createHash('sha256').update(candidateBytes).digest('hex');
if (candidateSha !== '81a33f01803099297a8fb9f92d512c9a2c450131b86b54186ed249fddbd8319f') {
  throw new Error('UCHIRIMO_SLIM_CANDIDATE_HASH_MISMATCH');
}
const candidate = JSON.parse(candidateBytes);
if (candidate.lifecycle !== 'WORKING_CANDIDATE_NOT_FORMAL' || candidate.canonical.glass_node_matrix) {
  throw new Error('UCHIRIMO_SLIM_CANDIDATE_LIFECYCLE_MISMATCH');
}
const entry = getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓');
const pkg = await loadCanonicalWorkbookRuntimePackage(entry);
if (!pkg.integrity.match || pkg.integrity.actual !== candidate.source_formal.runtime_manifest_sha256) {
  throw new Error('UCHIRIMO_SLIM_SOURCE_MANIFEST_MISMATCH');
}
const role = Object.keys(pkg.documents).find((name) => pkg.documents[name]?.glass_node_matrix);
const adapted = adaptUchirimoTabularV1({ ...pkg, documents: { ...pkg.documents, [role]: candidate.canonical } });
const integration = getRuntimeAppIntegration('SER-YKKAP-UCHIRIMO');
const runtime = { ...adapted, sourcePackageIntegrity: pkg.integrity };
const resolveProduct = async (_, selection) => {
  const normalized = normalizeRuntimeSelection(adapted.master, selection);
  return toRuntimeUiResult(adapted.master, adapted.resolver(normalized), integration, pkg.integrity);
};
const fixture = process.env.UCHIRIMO_SLIM_RESIDUAL_FIXTURE ?? 'test/fixtures/uchirimo-slim/heavy-shard-3795.json';
const row = JSON.parse(readFileSync(fixture));
const constraints = JSON.parse(row.decision_constraints_json);
const identity = recoveryIdentity(row, constraints);
const output = process.env.UCHIRIMO_SLIM_RESIDUAL_OUT ?? `artifacts/uchirimo-slim/residual-heavy-${row.shard}`;
mkdirSync(output, { recursive: true });
const start = performance.now();
const result = await runConstraint(row, constraints, identity, {
  out: output, expectedShards: 3956, head: currentExactHead(),
  maxStates: Number(process.env.UCHIRIMO_SLIM_MAX_STATES ?? 2000000),
  maxTerminals: 2000000, timeoutMs: Number(process.env.UCHIRIMO_SLIM_TIMEOUT_MS ?? 300000),
  loadRuntime: async () => runtime, resolveProduct,
});
if (result.status !== 'PASS') throw new Error(`UCHIRIMO_SLIM_RESIDUAL_FAIL:${result.error}`);
const names = recoveryEvidenceNames(identity);
const report = JSON.parse(readFileSync(join(output, names.report)));
const caseBytes = readFileSync(join(output, names.terminal_digests));
validateConstraintCaseEvidence(report, caseBytes);
const caseHash = createHash('sha256').update(caseBytes).digest('hex');
if (caseHash !== report.case_artifact_sha256) throw new Error('UCHIRIMO_SLIM_CASE_DIGEST_MISMATCH');
const summary = {
  schema_version: 'UCHIRIMO_SLIM_RESIDUAL_DIAGNOSTIC_V1',
  status: 'PASS', source_job_id: row.source_job_id ?? (row.shard === 3795 ? 108978046250 : null),
  source_artifact_id: row.source_artifact_id ?? null,
  source_artifact_digest: row.source_artifact_digest ?? null,
  source_shard: row.shard, source_recovery_unit_id: row.recovery_unit_id,
  candidate_sha256: candidateSha, source_runtime_sha256: pkg.integrity.actual,
  exact_head: report.exact_head, visited_state_count: report.visited_state_count,
  terminal_context_count: report.terminal_context_count,
  terminal_equivalence_class_count: report.terminal_equivalence_class_count,
  observed_peak_heap_mb: report.observed_peak_heap_mb,
  duration_ms: Math.round((performance.now() - start) * 1000) / 1000,
  terminal_artifact_sha256: caseHash,
  evidence_scope: 'WORKING_CANDIDATE_DIAGNOSTIC_ONLY_NOT_V12_CHECKPOINT_CARRY_FORWARD',
};
writeFileSync(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
