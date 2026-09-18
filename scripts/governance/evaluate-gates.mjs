import { existsSync } from 'node:fs';
import { currentExactHead, git, readJson, relevantChangesSince, sha256File, writeJson } from './governance-lib.mjs';

const state = readJson('project-governance/project-state.json');
const definitions = readJson('project-governance/gate-definition.json');
const manifestPath = process.env.GOVERNANCE_EVIDENCE_MANIFEST || 'project-governance/evidence-manifest.json';
const manifest = readJson(manifestPath);
const head = currentExactHead();
const reviewArtifact = existsSync('artifacts/governance/human-flow-review.json') ? readJson('artifacts/governance/human-flow-review.json') : null;
const currentRuntimeSnapshotId = reviewArtifact?.runtime_snapshot_id ?? null;
const result = {
  schema_version: '1.1.0',
  generated_at: new Date().toISOString(),
  repository: state.repository,
  branch: state.branch,
  exact_head: head,
  runtime_snapshot_id: currentRuntimeSnapshotId,
  task_classification: state.task_classification,
  product_master_mutation: state.product_master_mutation,
  gates: {},
  human_review: {},
  release: {}
};

function latestCurrentHeadEvidence(gateId) {
  return [...manifest.entries].reverse().find((entry) =>
    entry.gate_id === gateId
    && entry.exact_head === head
    && entry.authoritative_for_current_head !== false
    && entry.artifact_sha256 && sha256File(entry.artifact) === entry.artifact_sha256
    && (definitions.gates[gateId]?.requires_runtime_snapshot_identity ? !!currentRuntimeSnapshotId && entry.runtime_snapshot_id === currentRuntimeSnapshotId : (!entry.runtime_snapshot_id || entry.runtime_snapshot_id === currentRuntimeSnapshotId))
  ) || null;
}

const humanDef = definitions.gates.HUMAN_FLOW_REVIEW_GATE;
const human = existsSync('artifacts/governance/human-approval-observation.json') ? readJson('artifacts/governance/human-approval-observation.json') : state.human_review;
const approvalComplete = [human.reviewed_exact_head, human.review_artifact_identity, human.human_approval_reference].every(Boolean);
let relevantChanges = [];
let humanStatus = 'BLOCKED';
let humanReason = 'explicit human approval is not recorded';
if (human.status === 'PASS' && approvalComplete) {
  const reviewedCommit = git(['rev-parse', '--verify', `${human.reviewed_exact_head}^{commit}`], {allowFailure:true});
  const reviewedCommitExists = reviewedCommit === human.reviewed_exact_head;
  const reviewedIsAncestor = reviewedCommitExists && git(['merge-base', '--is-ancestor', human.reviewed_exact_head, head], {allowFailure:true}) !== null;
  const currentArtifactExists = reviewArtifact?.exact_head === head;
  if (!reviewedCommitExists || !reviewedIsAncestor || !currentArtifactExists) {
    humanStatus = 'REOPEN';
    humanReason = 'recorded Human approval cannot be safely related to the current exact HEAD review artifact';
  } else {
    relevantChanges = relevantChangesSince(human.reviewed_exact_head, humanDef.reopen_paths, head);
    const sameHead = human.reviewed_exact_head === head;
    const sameHeadArtifactIdentityMatches = !sameHead || reviewArtifact?.review_artifact_identity === human.review_artifact_identity;
    if (relevantChanges.length === 0 && sameHeadArtifactIdentityMatches) {
      humanStatus = 'PASS';
      humanReason = sameHead
        ? 'explicit approval recorded, artifact identity matches, and no Human-Review-relevant source changed since reviewed_exact_head'
        : 'explicit approval retained because the reviewed commit is an ancestor of current HEAD and no Human-Review-relevant source changed';
    } else {
      humanStatus = 'REOPEN';
      humanReason = relevantChanges.length
        ? 'Human-Review-relevant source changed after the reviewed exact HEAD'
        : 'recorded Human approval does not match the reviewed exact-head artifact identity';
    }
  }
}
result.human_review = {
  status: humanStatus,
  reason: humanReason,
  reviewed_exact_head: human.reviewed_exact_head,
  review_artifact_identity: human.review_artifact_identity,
  current_review_artifact_identity: reviewArtifact?.review_artifact_identity ?? null,
  human_approval_reference: human.human_approval_reference,
  relevant_changes_since_review: relevantChanges
};

const humanIndex = definitions.gate_order.indexOf('HUMAN_FLOW_REVIEW_GATE');
for (const [index, gateId] of definitions.gate_order.entries()) {
  const def = definitions.gates[gateId];
  const prerequisiteFailures = (def.prerequisites ?? []).filter(id => result.gates[id]?.status !== 'PASS');
  if (prerequisiteFailures.length) {
    result.gates[gateId] = {status:'BLOCKED', reason:'prerequisites not PASS', blocking_gates:prerequisiteFailures};
    continue;
  }
  if (gateId === 'HUMAN_FLOW_REVIEW_GATE') {
    result.gates[gateId] = { status: humanStatus, reason: humanReason };
    continue;
  }
  if (def.type === 'automatic') {
    if (index > humanIndex && humanStatus !== 'PASS') {
      result.gates[gateId] = { status: 'BLOCKED', reason: 'post-Human-review gate is not authorized before HUMAN_FLOW_REVIEW_GATE=PASS' };
      continue;
    }
    const evidence = latestCurrentHeadEvidence(gateId);
    result.gates[gateId] = evidence
      ? { status: evidence.outcome, evidence_id: evidence.id, exact_head: evidence.exact_head, runtime_snapshot_id: evidence.runtime_snapshot_id ?? null }
      : { status: 'UNVERIFIED', reason: 'no authoritative evidence for current exact HEAD and Runtime Snapshot' };
    continue;
  }
  if (gateId === 'GLOBAL_WINDOW_SELECTION_FLOW_GATE') {
    const componentIds = definitions.gate_order.slice(0, definitions.gate_order.indexOf(gateId));
    const failed = componentIds.filter((id) => result.gates[id]?.status !== 'PASS');
    result.gates[gateId] = failed.length === 0
      ? { status: 'PASS', reason: 'all prerequisite flow gates PASS' }
      : { status: 'BLOCKED', reason: 'prerequisite gates not PASS', blocking_gates: failed };
    continue;
  }
  if (gateId === 'APP_INTEGRATION_READY') {
    const flow = result.gates.GLOBAL_WINDOW_SELECTION_FLOW_GATE?.status;
    const required = ['FULL_WINDOW_COVERAGE_GATE', 'CUSTOM_SIZE_COVERAGE_GATE', 'FULL_BROWSER_FLOW_QA_GATE', 'FULL_BROWSER_QA_GATE', 'REGRESSION_GATE', 'REPOSITORY_GATE'];
    const failed = required.filter((id) => result.gates[id]?.status !== 'PASS');
    result.gates[gateId] = flow === 'PASS' && failed.length === 0 && humanStatus === 'PASS'
      ? { status: 'PASS', reason: 'Human Review, flow and integration gates PASS' }
      : { status: 'BLOCKED', reason: 'integration prerequisites not PASS', blocking_gates: [...new Set([...(humanStatus === 'PASS' ? [] : ['HUMAN_FLOW_REVIEW_GATE']), ...failed])] };
  }
}

const releaseReq = definitions.release_requirements;
const releaseBlocking = releaseReq.required_pass_gates.filter((id) => result.gates[id]?.status !== 'PASS');
const unverifiedCount = state.metrics?.unverified_qa_case_count ?? null;
if (unverifiedCount !== releaseReq.unverified_qa_case_count_must_equal) releaseBlocking.push('UNVERIFIED_QA_CASE_COUNT');
const releaseFields = releaseReq.required_release_input.filter((field) => !human[field]);
result.release = {
  status: releaseBlocking.length === 0 && releaseFields.length === 0 ? 'PASS' : 'BLOCKED',
  blocking_gates: [...new Set(releaseBlocking)],
  missing_release_input: releaseFields,
  unverified_qa_case_count: unverifiedCount
};

writeJson('artifacts/governance/gate-results.json', result);
console.log(`CURRENT_EXACT_HEAD=${head}`);
console.log(`RUNTIME_SNAPSHOT_ID=${currentRuntimeSnapshotId ?? 'UNSET'}`);
console.log(`HUMAN_FLOW_REVIEW_GATE=${humanStatus}`);
console.log(`POST_HUMAN_REVIEW_AUTHORIZED=${humanStatus === 'PASS' ? 'TRUE' : 'FALSE'}`);
console.log(`RELEASE_INPUT_GATE=${result.release.status}`);
