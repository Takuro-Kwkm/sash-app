import { readJson, writeJson } from './governance-lib.mjs';

const review = readJson('artifacts/governance/human-flow-review.json');
const gates = readJson('artifacts/governance/gate-results.json');
const evidence = readJson('artifacts/governance/qa-evidence-summary.json');
const humanStatus = gates.gates?.HUMAN_FLOW_REVIEW_GATE?.status ?? 'BLOCKED';
const gateOrder = readJson('project-governance/gate-definition.json').gate_order;
const firstNotPass = gateOrder.find((gate) => gates.gates?.[gate]?.status !== 'PASS') ?? 'COMPLETE';
const postReviewAuthorized = humanStatus === 'PASS';

const ledger = {
  schema_version:'1.0.0',
  generated_at:new Date().toISOString(),
  RUNTIME_SNAPSHOT_ID:review.runtime_snapshot_id,
  EXACT_HEAD:review.exact_head,
  SERIES_COUNT:review.series_count,
  SERIES_VERIFIED:review.series.filter((row) => row.status !== 'RUNTIME_LOAD_FAILED').length,
  BASE_WINDOW_COUNT:review.base_window_count,
  WINDOW_VERIFIED:review.series.reduce((sum,row)=>sum+row.windows.filter((window)=>window.verification_status !== 'UNVERIFIED').length,0),
  FLOW_SIGNATURE_COUNT:new Set(review.series.flatMap((row)=>row.windows.map((window)=>window.flow_signature))).size,
  MAPPED_FIELD_COUNT:review.field_mapping.mapped,
  UNMAPPED_FIELD_COUNT:review.field_mapping.unmapped,
  CONFLICT_FIELD_COUNT:review.field_mapping.conflict,
  QA_CASE_COUNT:postReviewAuthorized ? null : 0,
  PASS_COUNT:postReviewAuthorized ? null : 0,
  FAIL_COUNT:postReviewAuthorized ? null : 0,
  BLOCKED_COUNT:postReviewAuthorized ? null : 0,
  UNVERIFIED_QA_CASE_COUNT:null,
  DESKTOP_BROWSER_VERIFIED:false,
  SMARTPHONE_BROWSER_VERIFIED:false,
  HUMAN_FLOW_REVIEW_GATE:humanStatus,
  CURRENT_GATE:firstNotPass,
  BLOCKER:humanStatus !== 'PASS' ? 'Explicit Human Flow Review approval required before post-review QA.' : null,
  NEXT_ACTION:humanStatus !== 'PASS' ? 'Present exact-head Human Flow Review Artifact and record explicit user approval.' : 'Run authorized post-review Full Coverage QA pipeline.',
  APP_INTEGRATION_READY:gates.gates?.APP_INTEGRATION_READY?.status === 'PASS',
  RELEASE_INPUT_GATE:gates.release?.status ?? 'BLOCKED',
  REVIEW_ARTIFACT_IDENTITY:review.review_artifact_identity,
  REVIEW_COMPLETENESS:review.review_completeness,
  EVIDENCE_ACCEPTED:evidence.accepted_current_head_entries,
  EVIDENCE_REJECTED:evidence.rejected_count
};
writeJson('artifacts/governance/progress-ledger.json', ledger);
console.log(`CURRENT_GATE=${ledger.CURRENT_GATE}`);
console.log(`HUMAN_FLOW_REVIEW_GATE=${ledger.HUMAN_FLOW_REVIEW_GATE}`);
console.log(`APP_INTEGRATION_READY=${ledger.APP_INTEGRATION_READY ? 'TRUE':'FALSE'}`);
console.log(`RELEASE_INPUT_GATE=${ledger.RELEASE_INPUT_GATE}`);
