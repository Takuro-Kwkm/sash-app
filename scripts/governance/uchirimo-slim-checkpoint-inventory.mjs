import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getRuntimeMasterEntry } from './uchirimo-frozen-migration-entry.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { CONTROLLER_CONTRACT_VERSION, sha256 } from './uchirimo-v11-recovery-controller.mjs';
import { checkpointCoverage, parentPopulationHash, validateCheckpoint } from './uchirimo-controller-checkpoint.mjs';

// Read-only inventory. No checkpoint is rebound to this branch, and no selector
// PASS is imported from the FORMAL execution dependency into the Slim candidate.
const repo = process.env.GITHUB_REPOSITORY ?? 'Takuro-Kwkm/sash-app';
const baseBranch = process.env.UCHIRIMO_V12_BASE_BRANCH ?? 'feat/new-construction-runtime-ui-v16-20260910';
const baseHead = process.env.UCHIRIMO_V12_BASE_HEAD ?? 'db2280c7ee15c0426dc0d4d154ac17f394dd16c5';
const planPath = process.env.UCHIRIMO_V12_PARENT_PLAN ?? 'artifacts/uchirimo-slim/checkpoint-inventory-plan/all-partitions.json';
const output = process.env.UCHIRIMO_SLIM_CHECKPOINT_OUT ?? 'artifacts/uchirimo-slim/checkpoint-inventory.json';
const localBundle = process.env.UCHIRIMO_SLIM_CHECKPOINT_BUNDLE;
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const api = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const assert = (ok, code) => { if (!ok) throw new Error(code); };

async function request(path, binary = false) {
  assert(token, 'CHECKPOINT_GITHUB_TOKEN_REQUIRED');
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${api}/repos/${repo}/${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28' }, redirect: 'follow',
    });
    if (response.ok) return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
    if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error(`CHECKPOINT_GITHUB_HTTP_${response.status}:${path}`);
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw new Error(`CHECKPOINT_GITHUB_RETRIES_EXHAUSTED:${path}`);
}

function readBundle(bytes, temporary) {
  const file = join(temporary, `${digest(bytes)}.zip`);
  writeFileSync(file, bytes);
  const entries = execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).trim().split('\n');
  const result = {};
  for (const name of ['controller-state.json', 'recovery-units.json', 'split-certificates.json', 'parent-status.json']) {
    const matches = entries.filter((path) => path === name || path.endsWith(`/${name}`));
    assert(matches.length === 1, `CHECKPOINT_BUNDLE_FILE_COUNT_${name}`);
    result[name] = JSON.parse(execFileSync('unzip', ['-p', file, matches[0]], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
  }
  return {
    state: result['controller-state.json'], unitsEnvelope: result['recovery-units.json'],
    certificatesEnvelope: result['split-certificates.json'], parentsEnvelope: result['parent-status.json'],
  };
}

function summary(bundle, provenance, plan, runtimeHash) {
  const { state, unitsEnvelope, certificatesEnvelope, parentsEnvelope } = bundle;
  assert(state.exact_head === baseHead, 'CHECKPOINT_BASE_HEAD_MISMATCH');
  const population = parentPopulationHash(plan);
  const expected = { runtime_manifest_sha256: runtimeHash,
    execution_fingerprint: state.execution_fingerprint,
    planner_fingerprint: sha256({ controller_contract_version: CONTROLLER_CONTRACT_VERSION, parent_population_sha256: population }) };
  validateCheckpoint({ ...bundle, plan, expected });
  const units = Object.values(unitsEnvelope.units);
  const parents = Object.values(parentsEnvelope.parents);
  const counts = Object.fromEntries([...new Set(units.map((unit) => unit.state))].sort().map((status) => [status, units.filter((unit) => unit.state === status).length]));
  const parentStatuses = Object.fromEntries([...new Set(parents.map((parent) => parent.status))].sort().map((status) => [status, parents.filter((parent) => parent.status === status).length]));
  assert(counts.PASS === state.pass_unit_count, 'CHECKPOINT_PASS_COUNT_DRIFT');
  assert(parentStatuses.OPEN === state.open_parent_count, 'CHECKPOINT_OPEN_COUNT_DRIFT');
  return { provenance, generation: state.generation, exact_head: state.exact_head,
    source_state_sha256: state.current_state_sha256, runtime_manifest_sha256: state.runtime_manifest_sha256,
    execution_fingerprint: state.execution_fingerprint, planner_fingerprint: state.planner_fingerprint,
    parent_population_sha256: population, closed_parent_count: state.closed_parent_count,
    open_parent_count: state.open_parent_count, pass_unit_count: state.pass_unit_count,
    pending_normal_count: state.pending_normal_count, pending_heavy_count: state.pending_heavy_count,
    split_required_count: state.split_required_count, blocked_counts: state.blocked_counts,
    unit_states: counts, parent_statuses: parentStatuses,
    total_recovery_units: units.length, total_split_certificates: Object.keys(certificatesEnvelope.certificates).length,
    next_action: state.next_action, bundle };
}

const plan = JSON.parse(readFileSync(planPath, 'utf8'));
assert(plan.status === 'PASS' && plan.partitions?.length === 3956, 'CHECKPOINT_PLAN_INVALID');
const entry = getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓');
const pkg = await loadCanonicalWorkbookRuntimePackage(entry);
assert(pkg.integrity.match, 'CHECKPOINT_RUNTIME_INTEGRITY_FAIL');
const temporary = mkdtempSync(join(tmpdir(), 'uchirimo-slim-inventory-'));
try {
  const candidates = [];
  let runsScanned = 0, artifactsScanned = 0;
  if (localBundle) {
    const bytes = readFileSync(localBundle);
    candidates.push(summary(readBundle(bytes, temporary), { source: 'OFFLINE_VERIFIED_BUNDLE', archive_sha256: digest(bytes) }, plan, pkg.integrity.actual));
  } else {
    assert(/^[0-9a-f]{40}$/.test(baseHead), 'CHECKPOINT_BASE_HEAD_INVALID');
    const listing = await request(`actions/workflows/project-governance-gate.yml/runs?branch=${encodeURIComponent(baseBranch)}&per_page=100`);
    const runs = listing.workflow_runs ?? [];
    runsScanned = runs.length;
    const name = new RegExp(`^uchirimo-v12-controller-state-${baseHead}-g[0-9]+$`);
    for (const run of runs) {
      if (run.head_sha !== baseHead) continue;
      for (let page = 1; ; page++) {
        const pageData = await request(`actions/runs/${run.id}/artifacts?per_page=100&page=${page}`);
        const rows = pageData.artifacts ?? [];
        artifactsScanned += rows.length;
        for (const artifact of rows) {
          if (!name.test(artifact.name) || artifact.expired) continue;
          assert(/^sha256:[0-9a-f]{64}$/.test(artifact.digest ?? ''), 'CHECKPOINT_ARCHIVE_DIGEST_MISSING');
          const bytes = await request(`actions/artifacts/${artifact.id}/zip`, true);
          assert(`sha256:${digest(bytes)}` === artifact.digest, 'CHECKPOINT_ARCHIVE_DIGEST_MISMATCH');
          const provenance = { source: 'GITHUB_ACTIONS_VERIFIED', run_id: run.id, run_head: run.head_sha,
            artifact_id: artifact.id, artifact_name: artifact.name, archive_digest: artifact.digest,
            created_at: artifact.created_at };
          candidates.push(summary(readBundle(bytes, temporary), provenance, plan, pkg.integrity.actual));
        }
        if (rows.length < 100 || page * 100 >= (pageData.total_count ?? 0)) break;
      }
    }
  }
  assert(candidates.length > 0, 'CHECKPOINT_INVENTORY_EMPTY');
  candidates.sort((a, b) => String(b.provenance.created_at ?? '').localeCompare(String(a.provenance.created_at ?? '')));
  const compatible = candidates.filter((row) => row.execution_fingerprint === candidates[0].execution_fingerprint && row.planner_fingerprint === candidates[0].planner_fingerprint);
  assert(compatible.length === candidates.length, 'CHECKPOINT_EXECUTION_LINEAGES_DIFFER');
  const selected = candidates.find((candidate) => candidates.every((prior) => candidate === prior || checkpointCoverage(candidate.bundle, prior.bundle).dominates));
  assert(selected, 'CHECKPOINT_PROGRESS_INCOMPARABLE');
  const currentParents = selected.bundle.parentsEnvelope.parents;
  const partitionClassification = plan.partitions.map((partition) => {
    const active = currentParents[partition.partition_key];
    assert(active?.parent_shard_index === partition.shard, 'CHECKPOINT_CLASSIFICATION_PARENT_MISMATCH');
    return { shard: partition.shard, partition_key: partition.partition_key,
      active_v12_status: active.status,
      active_v12_class: active.status === 'OPEN' ? 'RESIDUAL_RECHECK_REQUIRED' : 'SAFE_CARRY_FORWARD',
      slim_candidate_class: 'RESIDUAL_RECHECK_REQUIRED' };
  });
  const activeCarry = partitionClassification.filter((row) => row.active_v12_class === 'SAFE_CARRY_FORWARD').length;
  assert(activeCarry === selected.closed_parent_count && partitionClassification.length - activeCarry === selected.open_parent_count,
    'CHECKPOINT_CLASSIFICATION_COUNTER_MISMATCH');
  const publicRow = ({ bundle, ...row }) => row;
  const report = { schema_version: 'UCHIRIMO_SLIM_V12_READ_ONLY_INVENTORY_V1', status: 'PASS',
    scope: localBundle ? 'OFFLINE_CHECKPOINT_VALIDATION' : 'LATEST_DOMINATING_CHECKPOINT_IN_FIRST_100_BASE_BRANCH_RUNS',
    base_branch: baseBranch, base_head: baseHead, runs_scanned: runsScanned, artifacts_scanned: artifactsScanned,
    validated_checkpoint_count: candidates.length, selected: publicRow(selected),
    other_checkpoints: candidates.filter((row) => row !== selected).map((row) => ({ provenance: row.provenance,
      generation: row.generation, closed_parent_count: row.closed_parent_count, pass_unit_count: row.pass_unit_count })),
    carry_forward_classification: {
      active_v12: { safe_carry_forward_parent_count: activeCarry,
        equivalence_carry_forward_parent_count: 0,
        residual_recheck_required_parent_count: selected.open_parent_count,
        pending_recovery_unit_count: selected.pending_normal_count + selected.pending_heavy_count + selected.split_required_count },
      slim_candidate: { safe_carry_forward_parent_count: 0,
        equivalence_carry_forward_parent_count: 0,
        residual_recheck_required_parent_count: partitionClassification.length,
        reason: 'SELECTOR_EXECUTION_DEPENDENCIES_CHANGED; CANDIDATE PARENT EQUIVALENCE NOT PROVEN' },
      selector_execution_count: 0, active_checkpoint_mutation: false,
      partition_classification: partitionClassification,
    },
  };
  mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, scope: report.scope, checkpoints: candidates.length,
    selected_run_id: selected.provenance.run_id ?? null, selected_generation: selected.generation,
    closed: selected.closed_parent_count, pass_units: selected.pass_unit_count,
    active_open_parents: selected.open_parent_count,
    active_pending_units: report.carry_forward_classification.active_v12.pending_recovery_unit_count,
    slim_parent_recheck: report.carry_forward_classification.slim_candidate.residual_recheck_required_parent_count }));
} finally { rmSync(temporary, { recursive: true, force: true }); }
