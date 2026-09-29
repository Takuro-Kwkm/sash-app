import { existsSync } from 'node:fs';
import { readJson } from './governance-lib.mjs';

const resultPath = 'artifacts/governance/gate-results.json';
if (!existsSync(resultPath)) {
  console.error('GATE_RESULTS_MISSING');
  process.exit(1);
}
const results = readJson(resultPath);
const state = readJson('project-governance/project-state.json');
const computed = results.release?.status;
if (state.flags?.release_input_gate === 'PASS' && computed !== 'PASS') {
  console.error('RELEASE_INPUT_GATE=FAIL_FALSE_PASS_DECLARATION');
  process.exit(1);
}
if (state.flags?.app_integration_ready === true && results.gates?.APP_INTEGRATION_READY?.status !== 'PASS') {
  console.error('APP_INTEGRATION_READY=FAIL_FALSE_READY_DECLARATION');
  process.exit(1);
}
if (process.argv.includes('--strict') && computed !== 'PASS') {
  console.error('RELEASE_INPUT_GATE=BLOCKED');
  console.error(JSON.stringify(results.release));
  process.exit(2);
}
console.log(`RELEASE_INPUT_GATE=${computed}`);
