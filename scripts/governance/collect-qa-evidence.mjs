import { existsSync } from 'node:fs';
import { currentExactHead, readJson, sha256File, writeJson } from './governance-lib.mjs';

const head = currentExactHead();
const review = readJson('artifacts/governance/human-flow-review.json');
const pre = readJson('artifacts/governance/pre-review-gate-evidence.json');
const coverage = readJson('artifacts/governance/human-flow-field-coverage-verification.json');
if (review.exact_head !== head || pre.exact_head !== head || coverage.exact_head !== head) throw new Error(`Exact HEAD mismatch while collecting QA evidence: ${head}`);
if (pre.runtime_snapshot_id !== review.runtime_snapshot_id) throw new Error('Runtime snapshot mismatch between review artifact and gate evidence.');
if (coverage.review_artifact_identity !== review.review_artifact_identity) throw new Error('Field coverage verification does not match the current review artifact identity.');
if (coverage.status !== 'PASS') throw new Error('Human Flow source-to-artifact field coverage is not PASS.');

const base = readJson('project-governance/evidence-manifest.json');
const entries = [...(base.entries ?? [])].map((entry) => ({ ...entry, authoritative_for_current_head: entry.exact_head === head && entry.authoritative_for_current_head !== false }));
const generatedAt = new Date().toISOString();
for (const [gateId, outcome] of Object.entries(pre.gates ?? {})) {
  if (!['PASS','FAIL','BLOCKED'].includes(outcome)) throw new Error(`Unsupported gate outcome ${gateId}=${outcome}`);
  const artifact = 'artifacts/governance/human-flow-review.json';
  entries.push({
    id: `${gateId}-${head.slice(0,12)}-${review.review_artifact_identity.slice(-12)}`,
    gate_id: gateId,
    outcome,
    exact_head: head,
    runtime_snapshot_id: review.runtime_snapshot_id,
    artifact,
    artifact_sha256: sha256File(artifact),
    command: 'node scripts/governance/build-human-flow-review.mjs && node scripts/governance/verify-human-flow-field-coverage.mjs',
    scope: pre.scope,
    recorded_at: generatedAt,
    authoritative_for_current_head: true
  });
}

const optionalIndex = 'artifacts/governance/evidence-inputs/index.json';
const rejected = [];
if (existsSync(optionalIndex)) {
  const index = readJson(optionalIndex);
  for (const path of index.files ?? []) {
    if (!existsSync(path)) {
      rejected.push({ path, reason:'MISSING_EVIDENCE_FILE' });
      continue;
    }
    const evidence = readJson(path);
    if (evidence.exact_head !== head) {
      rejected.push({ path, reason:'STALE_EXACT_HEAD', exact_head:evidence.exact_head });
      continue;
    }
    if (evidence.runtime_snapshot_id && evidence.runtime_snapshot_id !== review.runtime_snapshot_id) {
      rejected.push({ path, reason:'STALE_RUNTIME_SNAPSHOT', runtime_snapshot_id:evidence.runtime_snapshot_id });
      continue;
    }
    for (const entry of evidence.entries ?? []) entries.push({ ...entry, authoritative_for_current_head:true });
  }
}

const manifest = {
  schema_version:'1.1.0',
  generated_at: generatedAt,
  exact_head: head,
  runtime_snapshot_id: review.runtime_snapshot_id,
  human_flow_field_coverage_verification: {
    status: coverage.status,
    artifact: 'artifacts/governance/human-flow-field-coverage-verification.json',
    artifact_sha256: sha256File('artifacts/governance/human-flow-field-coverage-verification.json')
  },
  entries,
  rejected
};
writeJson('artifacts/governance/qa-evidence-manifest.json', manifest);
writeJson('artifacts/governance/qa-evidence-summary.json', {
  exact_head: head,
  runtime_snapshot_id: review.runtime_snapshot_id,
  field_coverage_status: coverage.status,
  accepted_current_head_entries: entries.filter((row) => row.exact_head === head && row.authoritative_for_current_head !== false).length,
  rejected_count: rejected.length,
  rejected
});
console.log(`QA_EVIDENCE_CURRENT_HEAD=${entries.filter((row) => row.exact_head === head && row.authoritative_for_current_head !== false).length}`);
console.log(`QA_EVIDENCE_REJECTED=${rejected.length}`);
console.log(`QA_FIELD_COVERAGE=${coverage.status}`);
