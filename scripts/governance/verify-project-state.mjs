import { currentBranch, readJson } from './governance-lib.mjs';

const state = readJson('project-governance/project-state.json');
const definitions = readJson('project-governance/gate-definition.json');
const evidence = readJson('project-governance/evidence-manifest.json');
const execution = readJson('project-governance/execution-path-state.json');

const errors = [];
const required = ['schema_version', 'project', 'repository', 'branch', 'task_classification', 'product_master_mutation', 'phase', 'human_review'];
for (const key of required) if (state[key] === undefined || state[key] === null) errors.push(`project-state missing ${key}`);

if (state.task_classification !== 'NON-PRODUCT-MASTER') errors.push('governance lane must remain NON-PRODUCT-MASTER');
if (state.product_master_mutation !== 0) errors.push('PRODUCT_MASTER_MUTATION must remain 0');
if (!Array.isArray(definitions.gate_order) || definitions.gate_order.length === 0) errors.push('gate_order must be non-empty');
if (!definitions.gates?.HUMAN_FLOW_REVIEW_GATE) errors.push('HUMAN_FLOW_REVIEW_GATE definition missing');
if (!Array.isArray(evidence.entries)) errors.push('evidence entries must be an array');
if (execution.rules?.local_git_https_auth_default !== 'CLOSED') errors.push('LOCAL_GIT_HTTPS_AUTH must be CLOSED by default');

const human = state.human_review;
const approvalFields = [human.reviewed_exact_head, human.review_artifact_identity, human.human_approval_reference];
const completeApproval = approvalFields.every(Boolean);
const emptyApproval = approvalFields.every((value) => !value);
if (!completeApproval && !emptyApproval) errors.push('human review approval fields must be all present or all empty');
if (human.status === 'PASS' && !completeApproval) errors.push('HUMAN_FLOW_REVIEW_GATE cannot PASS without all approval fields');
if (human.status !== 'PASS' && completeApproval) errors.push('complete human approval fields require human_review.status=PASS');
if (state.flags?.release_input_gate === 'PASS' && human.status !== 'PASS') errors.push('RELEASE_INPUT_GATE cannot PASS before HUMAN_FLOW_REVIEW_GATE');
if (state.flags?.app_integration_ready === true && human.status !== 'PASS') errors.push('APP_INTEGRATION_READY cannot be true before HUMAN_FLOW_REVIEW_GATE');

const branch = currentBranch();
if (branch && branch !== 'HEAD' && branch !== state.branch && process.env.GITHUB_ACTIONS === 'true') errors.push(`branch mismatch: expected ${state.branch}, got ${branch}`);

if (errors.length) {
  console.error('PROJECT_STATE_GATE=FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('PROJECT_STATE_GATE=PASS');
console.log(`TASK_CLASSIFICATION=${state.task_classification}`);
console.log(`PRODUCT_MASTER_MUTATION=${state.product_master_mutation}`);
console.log(`HUMAN_FLOW_REVIEW_DECLARED=${human.status}`);
