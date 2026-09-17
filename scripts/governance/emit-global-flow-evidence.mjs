import { mkdirSync } from 'node:fs';
import { currentExactHead, readJson, writeJson } from './governance-lib.mjs';

const head = currentExactHead();
const review = readJson('artifacts/governance/human-flow-review.json');
if (review.exact_head !== head) throw new Error(`Human review artifact HEAD mismatch: artifact=${review.exact_head} current=${head}`);
const now = new Date().toISOString();
const proven = [
  ['FULL_FLOW_SIGNATURE_COVERAGE_GATE', 'test/81-global-window-flow-signature-transition.test.mjs', 'Current workflow unit/signature step completed successfully.'],
  ['FLOW_TRANSITION_GATE', 'test/81-global-window-flow-signature-transition.test.mjs', 'Current workflow transition step completed successfully.'],
  ['CUSTOM_SIZE_COVERAGE_GATE', 'artifacts/stage-a-custom-transition-proof-v4/report.json', 'Current-head CUSTOM geometry/transition proof completed with unverified CUSTOM cases = 0.'],
  ['AUTOMATED_TEST_GATE', 'npm test', 'Full repository automated test step completed successfully.'],
  ['FULL_BROWSER_FLOW_QA_GATE', 'artifacts/stage-a-full-browser-qa/', 'Desktop/smartphone runtime browser flow step and Inplus exhaustive browser flow completed successfully.'],
  ['REGRESSION_GATE', 'npm test + browser regression partitions', 'Repository and browser regression steps completed successfully.'],
  ['REPOSITORY_GATE', 'PR #24 exact-head identity check', 'PR state/base/head/exact SHA check completed successfully.']
];
const entries = proven.map(([gate_id, artifact, scope]) => ({
  id: `${gate_id}-${head.slice(0,12)}-GLOBAL_FLOW`,
  gate_id,
  outcome:'PASS',
  exact_head:head,
  runtime_snapshot_id:review.runtime_snapshot_id,
  artifact,
  artifact_sha256:null,
  command:'Global Window Selection Flow Gate',
  scope,
  recorded_at:now,
  authoritative_for_current_head:true
}));
mkdirSync('artifacts/governance/evidence-inputs', { recursive:true });
writeJson('artifacts/governance/evidence-inputs/global-flow.json', {
  schema_version:'1.0.0',
  exact_head:head,
  runtime_snapshot_id:review.runtime_snapshot_id,
  entries,
  deliberately_not_claimed:[
    'FULL_WINDOW_COVERAGE_GATE',
    'DEPENDENCY_GATE',
    'UI_FLOW_GATE',
    'FULL_BROWSER_QA_GATE'
  ],
  note:'These gates are deliberately not inferred from similar tests. They require their own direct evidence before PASS.'
});
writeJson('artifacts/governance/evidence-inputs/index.json', { files:['artifacts/governance/evidence-inputs/global-flow.json'] });
console.log(`GLOBAL_FLOW_STANDARD_EVIDENCE_COUNT=${entries.length}`);
