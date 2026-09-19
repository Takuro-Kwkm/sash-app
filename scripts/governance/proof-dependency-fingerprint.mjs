import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import {
  changedPathsBetween,
  currentExactHead,
  git,
  globToRegExp,
  parseArgs,
  readJson,
  sha256File,
  writeJson
} from './governance-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const mode = String(args.mode ?? 'fingerprint');
const family = String(args.family ?? '');
const policyPath = String(args.policy ?? 'project-governance/evidence-dependency-policy.json');
if (!family) throw new Error('PROOF_FAMILY_REQUIRED');

const policy = readJson(policyPath);
const familyDef = policy.families?.[family];
if (!familyDef) throw new Error(`UNKNOWN_PROOF_FAMILY:${family}`);
const dependencyPatterns = familyDef.dependencies ?? [];
if (!dependencyPatterns.length) throw new Error(`EMPTY_PROOF_DEPENDENCIES:${family}`);

const head = currentExactHead();
const tracked = (git(['ls-files']) || '').split('\n').map((row) => row.trim()).filter(Boolean);
const matches = tracked
  .filter((path) => dependencyPatterns.some((pattern) => globToRegExp(pattern).test(path)))
  .sort();
if (!matches.length) throw new Error(`NO_TRACKED_DEPENDENCIES_MATCHED:${family}`);

const dependencies = matches.map((path) => ({
  path,
  blob_sha: git(['rev-parse', `HEAD:${path}`])
}));
const runtimeSnapshotPath = String(familyDef.runtime_snapshot ?? 'project-governance/runtime-snapshot.json');
const runtimeSnapshotSha256 = sha256File(runtimeSnapshotPath);
if (!runtimeSnapshotSha256) throw new Error(`RUNTIME_SNAPSHOT_MISSING:${runtimeSnapshotPath}`);

const policyFamilyFingerprint = createHash('sha256')
  .update(JSON.stringify({
    family,
    proof_model_version: familyDef.proof_model_version ?? null,
    runtime_snapshot: runtimeSnapshotPath,
    dependencies: dependencyPatterns
  }))
  .digest('hex');
const dependencyFingerprint = createHash('sha256')
  .update(JSON.stringify({
    family,
    proof_model_version: familyDef.proof_model_version ?? null,
    runtime_snapshot_sha256: runtimeSnapshotSha256,
    policy_family_fingerprint: policyFamilyFingerprint,
    dependencies
  }))
  .digest('hex');

const fingerprintRecord = {
  schema_version: '1.0.0',
  family,
  current_exact_head: head,
  proof_model_version: familyDef.proof_model_version ?? null,
  dependency_fingerprint: dependencyFingerprint,
  policy_family_fingerprint: policyFamilyFingerprint,
  runtime_snapshot_sha256: runtimeSnapshotSha256,
  dependency_patterns: dependencyPatterns,
  matched_dependencies: dependencies
};

if (args.fingerprintOut) writeJson(String(args.fingerprintOut), fingerprintRecord);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `fingerprint=${dependencyFingerprint}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `family=${family}\n`);
}
console.log(`PROOF_FAMILY=${family}`);
console.log(`DEPENDENCY_FINGERPRINT=${dependencyFingerprint}`);
console.log(`DEPENDENCY_FILE_COUNT=${dependencies.length}`);

if (mode === 'fingerprint') process.exit(0);

const artifact = String(args.artifact ?? '');
const metadata = String(args.metadata ?? '');
if (!artifact || !metadata) throw new Error('ARTIFACT_AND_METADATA_REQUIRED');
const artifactHash = sha256File(artifact);
if (!artifactHash) throw new Error(`PROOF_ARTIFACT_MISSING:${artifact}`);
const proof = readJson(artifact);
const sourceExactHead = proof.exact_head ?? proof.exact_head_sha ?? proof.exactHead ?? null;
if (!sourceExactHead) throw new Error('PROOF_SOURCE_EXACT_HEAD_MISSING');
const artifactProofModel = proof.proof_model ?? proof.proof_model_version ?? null;
if (familyDef.proof_model_version && artifactProofModel !== familyDef.proof_model_version) {
  throw new Error(`PROOF_MODEL_MISMATCH:${artifactProofModel}:${familyDef.proof_model_version}`);
}

if (mode === 'stamp') {
  if (sourceExactHead !== head) throw new Error(`STAMP_SOURCE_HEAD_MISMATCH:${sourceExactHead}:${head}`);
  writeJson(metadata, {
    schema_version: '1.0.0',
    metadata_type: 'PROOF_DEPENDENCY_METADATA',
    family,
    proof_model_version: familyDef.proof_model_version ?? null,
    source_exact_head: sourceExactHead,
    source_artifact_sha256: artifactHash,
    dependency_fingerprint: dependencyFingerprint,
    policy_family_fingerprint: policyFamilyFingerprint,
    runtime_snapshot_sha256: runtimeSnapshotSha256,
    matched_dependency_count: dependencies.length,
    generated_at: new Date().toISOString()
  });
  console.log('PROOF_DEPENDENCY_METADATA=STAMPED');
  process.exit(0);
}

if (mode !== 'bind') throw new Error(`UNSUPPORTED_MODE:${mode}`);
const sourceMeta = readJson(metadata);
const checks = {
  metadata_type: sourceMeta.metadata_type === 'PROOF_DEPENDENCY_METADATA',
  family: sourceMeta.family === family,
  source_head: sourceMeta.source_exact_head === sourceExactHead,
  artifact_sha256: sourceMeta.source_artifact_sha256 === artifactHash,
  dependency_fingerprint: sourceMeta.dependency_fingerprint === dependencyFingerprint,
  policy_family_fingerprint: sourceMeta.policy_family_fingerprint === policyFamilyFingerprint,
  runtime_snapshot_sha256: sourceMeta.runtime_snapshot_sha256 === runtimeSnapshotSha256
};
const failedChecks = Object.entries(checks).filter(([, pass]) => !pass).map(([key]) => key);
if (failedChecks.length) throw new Error(`PROOF_CARRY_FORWARD_CHECK_FAILED:${failedChecks.join(',')}`);

const sourceCommit = git(['rev-parse', '--verify', `${sourceExactHead}^{commit}`], { allowFailure: true });
if (sourceCommit !== sourceExactHead) throw new Error('PROOF_SOURCE_COMMIT_NOT_AVAILABLE');
if (git(['merge-base', '--is-ancestor', sourceExactHead, head], { allowFailure: true }) === null) {
  throw new Error('PROOF_SOURCE_HEAD_NOT_ANCESTOR');
}
const changedPaths = sourceExactHead === head ? [] : changedPathsBetween(sourceExactHead, head);
const dependencyChanges = changedPaths.filter((path) =>
  dependencyPatterns.some((pattern) => globToRegExp(pattern).test(path))
);
if (dependencyChanges.length) {
  throw new Error(`PROOF_DEPENDENCY_CHANGED:${dependencyChanges.join(',')}`);
}

const bindingPath = String(args.binding ?? '');
if (!bindingPath) throw new Error('BINDING_PATH_REQUIRED');
writeJson(bindingPath, {
  schema_version: '1.0.0',
  binding_type: 'CURRENT_HEAD_PROOF_CARRY_FORWARD',
  status: 'PASS',
  family,
  proof_model_version: familyDef.proof_model_version ?? null,
  source_exact_head: sourceExactHead,
  current_exact_head: head,
  source_artifact_sha256: artifactHash,
  dependency_fingerprint: dependencyFingerprint,
  policy_family_fingerprint: policyFamilyFingerprint,
  runtime_snapshot_sha256: runtimeSnapshotSha256,
  changed_paths: changedPaths,
  dependency_changes: dependencyChanges,
  impact_decision: sourceExactHead === head ? 'DIRECT_CURRENT_HEAD' : 'NON_IMPACTING_DEPENDENCIES_UNCHANGED',
  generated_at: new Date().toISOString()
});
console.log('CURRENT_HEAD_EVIDENCE_BINDING=PASS');
console.log(`SOURCE_EXACT_HEAD=${sourceExactHead}`);
console.log(`CURRENT_EXACT_HEAD=${head}`);
console.log(`CHANGED_PATH_COUNT=${changedPaths.length}`);
