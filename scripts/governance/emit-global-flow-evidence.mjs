import { mkdirSync } from 'node:fs';
import { currentExactHead, readJson, sha256File, writeJson } from './governance-lib.mjs';

const head=currentExactHead();
const review=readJson('artifacts/governance/human-flow-review.json');
if(review.exact_head!==head)throw new Error(`Human review artifact HEAD mismatch: artifact=${review.exact_head} current=${head}`);

const jsonPass=(path)=>{
  const row=readJson(path);
  if(row.status!=='PASS'||row.exact_head!==head)throw new Error(`DIRECT_GATE_EVIDENCE_NOT_PASS:${path}`);
  return {path,sha256:sha256File(path),command:row.command??null};
};
const globalBrowser=readJson('artifacts/global-window-selection-flow-browser-qa/report.json');
const inplusBrowser=readJson('artifacts/inplus-v04r2-global-flow-full-coverage-browser-qa/report.json');
const custom=readJson('artifacts/stage-a-custom-transition-proof-v4/report.json');
const stageA=readJson('artifacts/stage-a-full-browser-qa/report.json');
const repository=readJson('artifacts/governance/post-human/repository-gate.json');

if(globalBrowser.status!=='PASS'||globalBrowser.exactHead!==head)throw new Error('GLOBAL_BROWSER_CURRENT_HEAD_NOT_PASS');
if(globalBrowser.integrationCount!==8||globalBrowser.windowCoverageChecks!==226)throw new Error('FULL_WINDOW_BROWSER_COUNT_MISMATCH');
for(const viewport of ['desktop','smartphone']){
  const rows=globalBrowser.viewportResults?.[viewport]??[];
  const count=rows.reduce((sum,row)=>sum+(row.windowCount??0),0);
  if(rows.length!==8||count!==113)throw new Error(`FULL_WINDOW_BROWSER_${viewport.toUpperCase()}_MISMATCH`);
}
if((globalBrowser.consoleErrors??[]).length||(globalBrowser.pageErrors??[]).length||(globalBrowser.failedResponses??[]).length)throw new Error('GLOBAL_BROWSER_ERROR_NOT_ZERO');

if(custom.status!=='PASS'||custom.exact_head_sha!==head||custom.evidence_head_sha!==head||custom.gate_status?.custom_size_coverage_gate!=='PASS')throw new Error('CUSTOM_SIZE_EVIDENCE_NOT_PASS');
if(stageA.status!=='PASS'||stageA.exact_head_sha!==head||stageA.evidence?.evidence_head_sha!==head||stageA.gate_status?.full_browser_qa_gate!=='PASS')throw new Error('STAGE_A_FULL_BROWSER_NOT_PASS');
for(const viewport of ['desktop','smartphone']){
  if(stageA.viewports?.[viewport]?.base_windows?.count!==105||stageA.viewports?.[viewport]?.base_windows?.status!=='PASS')throw new Error(`STAGE_A_${viewport.toUpperCase()}_WINDOW_COVERAGE_MISMATCH`);
  if(stageA.viewports?.[viewport]?.custom_contexts?.checked!==137||stageA.viewports?.[viewport]?.custom_contexts?.status!=='PASS')throw new Error(`STAGE_A_${viewport.toUpperCase()}_CUSTOM_COVERAGE_MISMATCH`);
}
if((stageA.console_errors??[]).length||(stageA.page_errors??[]).length||(stageA.failed_responses??[]).length)throw new Error('STAGE_A_BROWSER_ERROR_NOT_ZERO');

if(inplusBrowser.status!=='PASS'||inplusBrowser.logicalQaCaseCount!==1148||inplusBrowser.verifiedQaCaseCount!==1148||inplusBrowser.unverifiedQaCaseCount!==0||inplusBrowser.browserStateChecksTotal!==3350)throw new Error('INPLUS_EXHAUSTIVE_BROWSER_NOT_PASS');
if(inplusBrowser.desktop?.failed!==0||inplusBrowser.mobile?.failed!==0||(inplusBrowser.consoleErrors??[]).length||(inplusBrowser.pageErrors??[]).length||(inplusBrowser.failedResponses??[]).length)throw new Error('INPLUS_BROWSER_ERROR_NOT_ZERO');
if(repository.status!=='PASS'||repository.exact_head!==head)throw new Error('REPOSITORY_GATE_PROOF_NOT_PASS');

const signature=jsonPass('artifacts/governance/post-human/global-flow-unit.json');
const dependency=jsonPass('artifacts/governance/post-human/dependency-gate.json');
const uiFlow=jsonPass('artifacts/governance/post-human/ui-flow-gate.json');
const regression=jsonPass('artifacts/governance/post-human/full-repository-regression.json');

const proofPath='artifacts/governance/post-human-global-flow-proof.json';
const proof={
  schema_version:'1.0.0',
  exact_head:head,
  runtime_snapshot_id:review.runtime_snapshot_id,
  generated_at:new Date().toISOString(),
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  gates:{
    FULL_FLOW_SIGNATURE_COVERAGE_GATE:{status:'PASS',evidence:signature},
    FLOW_TRANSITION_GATE:{status:'PASS',evidence:signature},
    FULL_WINDOW_COVERAGE_GATE:{status:'PASS',series_count:8,window_count:113,desktop_window_checks:113,smartphone_window_checks:113,evidence:'artifacts/global-window-selection-flow-browser-qa/report.json'},
    CUSTOM_SIZE_COVERAGE_GATE:{status:'PASS',selector_context_count:custom.selector_context_count,evaluation_count:custom.evaluation_count,unverified_custom_case_count:0,evidence:'artifacts/stage-a-custom-transition-proof-v4/report.json'},
    DEPENDENCY_GATE:{status:'PASS',evidence:dependency},
    UI_FLOW_GATE:{status:'PASS',evidence:uiFlow},
    AUTOMATED_TEST_GATE:{status:'PASS',evidence:regression},
    FULL_BROWSER_FLOW_QA_GATE:{status:'PASS',series_count:8,window_count:113,desktop_and_smartphone:true,evidence:'artifacts/global-window-selection-flow-browser-qa/report.json'},
    FULL_BROWSER_QA_GATE:{status:'PASS',exterior_base_windows:105,inplus_logical_cases:1148,inplus_unverified_cases:0,evidence:['artifacts/stage-a-full-browser-qa/report.json','artifacts/inplus-v04r2-global-flow-full-coverage-browser-qa/report.json','artifacts/global-window-selection-flow-browser-qa/report.json']},
    REGRESSION_GATE:{status:'PASS',evidence:regression},
    REPOSITORY_GATE:{status:'PASS',evidence:'artifacts/governance/post-human/repository-gate.json'}
  }
};
writeJson(proofPath,proof);
const proofHash=sha256File(proofPath);
const now=new Date().toISOString();
const gateIds=Object.keys(proof.gates);
const entries=gateIds.map((gate_id)=>({
  id:`${gate_id}-${head.slice(0,12)}-POST_HUMAN`,
  gate_id,
  outcome:'PASS',
  exact_head:head,
  runtime_snapshot_id:review.runtime_snapshot_id,
  artifact:proofPath,
  artifact_sha256:proofHash,
  command:'Project Governance Gate -> Global Window Selection Flow Gate',
  scope:'Direct current-head post-Human QA proof generated only after gate-specific tests, full-window desktop/smartphone browser checks, exhaustive Inplus browser QA, regression and repository identity checks all succeeded.',
  recorded_at:now,
  authoritative_for_current_head:true
}));
mkdirSync('artifacts/governance/evidence-inputs',{recursive:true});
writeJson('artifacts/governance/evidence-inputs/global-flow.json',{
  schema_version:'1.1.0',
  exact_head:head,
  runtime_snapshot_id:review.runtime_snapshot_id,
  proof_artifact:proofPath,
  proof_artifact_sha256:proofHash,
  entries
});
writeJson('artifacts/governance/evidence-inputs/index.json',{files:['artifacts/governance/evidence-inputs/global-flow.json']});
console.log(`GLOBAL_FLOW_STANDARD_EVIDENCE_COUNT=${entries.length}`);
console.log('POST_HUMAN_GLOBAL_FLOW_EVIDENCE=PASS');
