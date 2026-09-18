import { existsSync, mkdirSync } from 'node:fs';
import { currentExactHead, readJson, sha256File, writeJson } from './governance-lib.mjs';

const head=currentExactHead();
const review=readJson('artifacts/governance/human-flow-review.json');
if(review.exact_head!==head)throw new Error(`Human review artifact HEAD mismatch: ${review.exact_head} != ${head}`);

const requireJson=(path)=>{
  if(!existsSync(path))throw new Error(`POST_HUMAN_EVIDENCE_MISSING: ${path}`);
  return readJson(path);
};
const requireMarker=(path)=>{
  const row=requireJson(path);
  if(row.exact_head!==head||row.status!=='PASS')throw new Error(`POST_HUMAN_MARKER_INVALID: ${path}`);
  return row;
};
const artifact=(path)=>{
  if(!existsSync(path))throw new Error(`POST_HUMAN_ARTIFACT_MISSING: ${path}`);
  const sha256=sha256File(path);
  if(!sha256)throw new Error(`POST_HUMAN_ARTIFACT_HASH_MISSING: ${path}`);
  return {path,sha256};
};

const unit=requireMarker('artifacts/governance/post-human/global-flow-unit.json');
const automated=requireMarker('artifacts/governance/post-human/full-repository-regression.json');
const browserFlow=requireMarker('artifacts/governance/post-human/browser-flow-qa.json');
const regression=requireMarker('artifacts/governance/post-human/regression-gate.json');
const repository=requireMarker('artifacts/governance/post-human/repository-gate.json');

const custom=requireJson('artifacts/stage-a-custom-transition-proof-v4/report.json');
if(custom.exact_head_sha!==head||custom.status!=='PASS'||custom.gate_status?.custom_size_coverage_gate!=='PASS')throw new Error('CUSTOM_SIZE_DIRECT_EVIDENCE_INVALID');

const stageBrowser=requireJson('artifacts/stage-a-full-browser-qa/report.json');
if(stageBrowser.exact_head_sha!==head||stageBrowser.status!=='PASS'||stageBrowser.gate_status?.full_browser_qa_gate!=='PASS')throw new Error('STAGE_A_FULL_BROWSER_DIRECT_EVIDENCE_INVALID');

const flowBrowser=requireJson('artifacts/global-window-selection-flow-browser-qa/report.json');
if(flowBrowser.status!=='PASS'||(flowBrowser.consoleErrors??[]).length||(flowBrowser.pageErrors??[]).length||(flowBrowser.failedResponses??[]).length)throw new Error('GLOBAL_FLOW_BROWSER_DIRECT_EVIDENCE_INVALID');

const inplusBrowser=requireJson('artifacts/inplus-v04r2-global-flow-full-coverage-browser-qa/report.json');
if(inplusBrowser.status!=='PASS'||inplusBrowser.unverifiedQaCaseCount!==0||inplusBrowser.verifiedQaCaseCount!==inplusBrowser.logicalQaCaseCount)throw new Error('INPLUS_BROWSER_DIRECT_EVIDENCE_INVALID');

const raw={
  unit:artifact('artifacts/governance/post-human/global-flow-unit.tap'),
  automated:artifact('artifacts/governance/post-human/full-repository-regression.log'),
  custom:artifact('artifacts/stage-a-custom-transition-proof-v4/report.json'),
  stage_browser:artifact('artifacts/stage-a-full-browser-qa/report.json'),
  flow_browser:artifact('artifacts/global-window-selection-flow-browser-qa/report.json'),
  inplus_browser:artifact('artifacts/inplus-v04r2-global-flow-full-coverage-browser-qa/report.json'),
  browser_marker:artifact('artifacts/governance/post-human/browser-flow-qa.json'),
  regression_marker:artifact('artifacts/governance/post-human/regression-gate.json'),
  repository_marker:artifact('artifacts/governance/post-human/repository-gate.json')
};

const summaryPath='artifacts/governance/post-human/global-flow-proof-summary.json';
writeJson(summaryPath,{
  schema_version:'1.0.0',
  exact_head:head,
  runtime_snapshot_id:review.runtime_snapshot_id,
  status:'PASS_PARTIAL_POST_HUMAN_EVIDENCE',
  direct_proofs:{
    FULL_FLOW_SIGNATURE_COVERAGE_GATE:{status:'PASS',source:raw.unit},
    FLOW_TRANSITION_GATE:{status:'PASS',source:raw.unit},
    CUSTOM_SIZE_COVERAGE_GATE:{status:'PASS',source:raw.custom,selector_context_count:custom.selector_context_count,evaluation_count:custom.evaluation_count},
    AUTOMATED_TEST_GATE:{status:'PASS',source:raw.automated},
    FULL_BROWSER_FLOW_QA_GATE:{status:'PASS',sources:[raw.flow_browser,raw.inplus_browser,raw.browser_marker],inplus_logical_qa_case_count:inplusBrowser.logicalQaCaseCount,inplus_unverified_qa_case_count:inplusBrowser.unverifiedQaCaseCount},
    REGRESSION_GATE:{status:'PASS',sources:[raw.automated,raw.browser_marker,raw.regression_marker]},
    REPOSITORY_GATE:{status:'PASS',source:raw.repository_marker}
  },
  deliberately_not_claimed:{
    FULL_WINDOW_COVERAGE_GATE:'No direct all-target-selector population evidence imported yet.',
    DEPENDENCY_GATE:'No direct all-target dependency population evidence imported yet.',
    UI_FLOW_GATE:'No direct all-target UI-flow population evidence imported yet.',
    FULL_BROWSER_QA_GATE:'Exterior 105-window and Inplus exhaustive browser evidence exist, but Uchirimo all-base-window Browser coverage is not directly proven yet.'
  }
});
const summarySha=sha256File(summaryPath);
const now=new Date().toISOString();
const proven=[
  'FULL_FLOW_SIGNATURE_COVERAGE_GATE',
  'FLOW_TRANSITION_GATE',
  'CUSTOM_SIZE_COVERAGE_GATE',
  'AUTOMATED_TEST_GATE',
  'FULL_BROWSER_FLOW_QA_GATE',
  'REGRESSION_GATE',
  'REPOSITORY_GATE'
];
const entries=proven.map((gate_id)=>({
  id:`${gate_id}-${head.slice(0,12)}-DIRECT_POST_HUMAN`,
  gate_id,
  outcome:'PASS',
  exact_head:head,
  runtime_snapshot_id:review.runtime_snapshot_id,
  artifact:summaryPath,
  artifact_sha256:summarySha,
  command:'Global Window Selection Flow Gate direct post-Human execution',
  scope:'Direct current-head execution evidence validated from generated QA artifacts/logs; no unproven gate is inferred.',
  recorded_at:now,
  authoritative_for_current_head:true
}));
mkdirSync('artifacts/governance/evidence-inputs',{recursive:true});
writeJson('artifacts/governance/evidence-inputs/global-flow.json',{
  schema_version:'2.0.0',
  exact_head:head,
  runtime_snapshot_id:review.runtime_snapshot_id,
  entries,
  deliberately_not_claimed:['FULL_WINDOW_COVERAGE_GATE','DEPENDENCY_GATE','UI_FLOW_GATE','FULL_BROWSER_QA_GATE']
});
writeJson('artifacts/governance/evidence-inputs/index.json',{files:['artifacts/governance/evidence-inputs/global-flow.json']});
console.log(`GLOBAL_FLOW_STANDARD_EVIDENCE_COUNT=${entries.length}`);
console.log('GLOBAL_FLOW_UNPROVEN_GATES=FULL_WINDOW_COVERAGE_GATE,DEPENDENCY_GATE,UI_FLOW_GATE,FULL_BROWSER_QA_GATE');
