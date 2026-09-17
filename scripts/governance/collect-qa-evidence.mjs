import { existsSync } from 'node:fs';
import { currentExactHead, readJson, sha256File, writeJson } from './governance-lib.mjs';

const head = currentExactHead();
const review = readJson('artifacts/governance/human-flow-review.json');
const pre = readJson('artifacts/governance/pre-review-gate-evidence.json');
if (review.exact_head !== head || pre.exact_head !== head) throw new Error(`Exact HEAD mismatch while collecting QA evidence: ${head}`);
if (pre.runtime_snapshot_id !== review.runtime_snapshot_id) throw new Error('Runtime snapshot mismatch between review artifact and gate evidence.');

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
    command: 'node scripts/governance/generate-human-flow-review.mjs',
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
  schema_version:'1.0.0',
  generated_at: generatedAt,
  exact_head: head,
  runtime_snapshot_id: review.runtime_snapshot_id,
  entries,
  rejected
};
writeJson('artifacts/governance/qa-evidence-manifest.json', manifest);
writeJson('artifacts/governance/qa-evidence-summary.json', {
  exact_head: head,
  runtime_snapshot_id: review.runtime_snapshot_id,
  accepted_current_head_entries: entries.filter((row) => row.exact_head === head && row.authoritative_for_current_head !== false).length,
  rejected_count: rejected.length,
  rejected
});
console.log(`QA_EVIDENCE_CURRENT_HEAD=${entries.filter((row) => row.exact_head === head && row.authoritative_for_current_head !== false).length}`);
console.log(`QA_EVIDENCE_REJECTED=${rejected.length}`);
