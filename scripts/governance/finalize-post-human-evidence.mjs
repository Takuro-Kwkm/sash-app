import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { currentExactHead, sha256File, writeJson } from './governance-lib.mjs';

const head=currentExactHead();
const SOURCE_ROOT=process.env.POST_HUMAN_FINAL_SOURCE_ROOT ?? 'artifacts/post-human-final-source';
const GLOBAL_ROOT=join(SOURCE_ROOT,'global');
const NONTW_ROOT=join(SOURCE_ROOT,'nontw');
const TW_ROOT=join(SOURCE_ROOT,'tw');
const issues=[];

function jsonFiles(root){
  if(!existsSync(root))return [];
  const out=[];
  const walk=(dir)=>{
    for(const name of readdirSync(dir)){
      const path=join(dir,name);
      const stat=statSync(path);
      if(stat.isDirectory())walk(path);
      else if(name.endsWith('.json')){
        try{out.push({path,value:JSON.parse(readFileSync(path,'utf8'))});}catch{}
      }
    }
  };
  walk(root);
  return out;
}
const globalFiles=jsonFiles(GLOBAL_ROOT);
const nontwFiles=jsonFiles(NONTW_ROOT);
const twFiles=jsonFiles(TW_ROOT);
const find=(rows,predicate,label)=>{
  const hits=rows.filter(({value,path})=>{try{return predicate(value,path);}catch{return false;}});
  if(hits.length!==1){issues.push(`${label}: expected 1 artifact, found ${hits.length}`);return null;}
  return hits[0];
};
const exact=(value)=>value?.exact_head===head||value?.exactHead===head||value?.exact_head_sha===head;

const baseProof=find(globalFiles,(v)=>v?.schema_version==='1.0.0'&&v?.gates?.FULL_FLOW_SIGNATURE_COVERAGE_GATE&&Array.isArray(v?.deliberately_not_claimed),'base post-Human proof');
const globalBrowser=find(globalFiles,(v)=>v?.integrationCount===8&&v?.windowCoverageChecks===226&&v?.viewportResults,'global browser flow report');
const inplus=find(globalFiles,(v)=>v?.logicalQaCaseCount===1148&&v?.browserStateChecksTotal===3350,'Inplus exhaustive browser report');
const stageA=find(globalFiles,(v)=>v?.model_version==='STAGE_A_FULL_BROWSER_QA_V1_SYMBOLIC_EQUIVALENCE_BOUND','Stage A full browser report');
const uchirimoSelector=find(globalFiles,(v)=>v?.proof_model==='UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXHAUSTIVE_V1','Uchirimo selector proof');
const uchirimoBrowser=find(globalFiles,(v)=>v?.desktop?.manufacturerSelection==='PASS'&&v?.mobile?.manufacturerSelection==='PASS','Uchirimo browser report');
const dependencyDirect=find(globalFiles,(v)=>v?.gate==='DEPENDENCY_GATE'&&v?.status==='PASS','Dependency direct proof');
const uiDirect=find(globalFiles,(v)=>v?.gate==='UI_FLOW_GATE'&&v?.status==='PASS','UI flow direct proof');
const nontw=find(nontwFiles,(v)=>v?.status==='NONTW_80_WINDOW_DISCRETE_EXACT_PASS','Non-TW 80-window exact aggregate');
const tw=find(twFiles,(v)=>v?.status==='TW_25_WINDOW_DISCRETE_COUNT_COMPONENT_CANDIDATE_COMPLETE','TW 25-window exact aggregate');

const checks={
  base:Boolean(baseProof&&exact(baseProof.value)&&['FULL_WINDOW_COVERAGE_GATE','DEPENDENCY_GATE','UI_FLOW_GATE','FULL_BROWSER_QA_GATE'].every((id)=>baseProof.value.deliberately_not_claimed.includes(id))),
  globalBrowser:Boolean(globalBrowser&&exact(globalBrowser.value)&&globalBrowser.value.status==='PASS'&&globalBrowser.value.integrationCount===8&&globalBrowser.value.windowCoverageChecks===226),
  inplus:Boolean(inplus&&exact(inplus.value)&&inplus.value.status==='PASS'&&inplus.value.verifiedQaCaseCount===1148&&inplus.value.unverifiedQaCaseCount===0&&inplus.value.browserStateChecksTotal===3350),
  stageA:Boolean(stageA&&exact(stageA.value)&&stageA.value.status==='PASS'&&stageA.value.gate_status?.full_browser_qa_gate==='PASS'&&stageA.value.viewports?.desktop?.base_windows?.count===105&&stageA.value.viewports?.smartphone?.base_windows?.count===105&&stageA.value.viewports?.desktop?.custom_contexts?.checked===137&&stageA.value.viewports?.smartphone?.custom_contexts?.checked===137),
  uchirimoSelector:Boolean(uchirimoSelector&&exact(uchirimoSelector.value)&&uchirimoSelector.value.status==='PASS'&&uchirimoSelector.value.window_type_count===4&&uchirimoSelector.value.unverified_discrete_selector_case_count===0),
  uchirimoBrowser:Boolean(uchirimoBrowser&&exact(uchirimoBrowser.value)&&uchirimoBrowser.value.status==='PASS'&&uchirimoBrowser.value.desktop?.status==='PASS'&&uchirimoBrowser.value.mobile?.status==='PASS'&&!(uchirimoBrowser.value.consoleErrors??[]).length&&!(uchirimoBrowser.value.pageErrors??[]).length&&!(uchirimoBrowser.value.failedResponses??[]).length),
  dependencyDirect:Boolean(dependencyDirect&&exact(dependencyDirect.value)),
  uiDirect:Boolean(uiDirect&&exact(uiDirect.value)),
  nontw:Boolean(nontw&&nontw.value.exact_head_sha===head&&nontw.value.report_count===80&&nontw.value.counted_window_count===80&&nontw.value.unverified_window_count===0),
  tw:Boolean(tw&&tw.value.exact_head_sha===head&&tw.value.report_count===25&&tw.value.counted_window_count===25&&tw.value.unverified_window_count===0),
};
for(const [key,pass] of Object.entries(checks))if(!pass)issues.push(`${key}: direct current-head evidence did not satisfy the final contract`);

const baseGateIds=[
  'FULL_FLOW_SIGNATURE_COVERAGE_GATE','FLOW_TRANSITION_GATE','CUSTOM_SIZE_COVERAGE_GATE',
  'AUTOMATED_TEST_GATE','FULL_BROWSER_FLOW_QA_GATE','REGRESSION_GATE','REPOSITORY_GATE'
];
const baseGates={};
if(checks.base){
  for(const id of baseGateIds){
    const row=baseProof.value.gates?.[id];
    if(row?.status==='PASS')baseGates[id]=row;
    else issues.push(`base proof missing PASS for ${id}`);
  }
}
const fullWindowPass=checks.nontw&&checks.tw&&checks.inplus&&checks.uchirimoSelector;
const dependencyPass=fullWindowPass&&checks.dependencyDirect;
const uiFlowPass=dependencyPass&&checks.uiDirect&&checks.globalBrowser;
const fullBrowserPass=checks.stageA&&checks.inplus&&checks.uchirimoBrowser&&checks.globalBrowser&&checks.uchirimoSelector;

const gateProofs={
  ...baseGates,
  ...(fullWindowPass?{
    FULL_WINDOW_COVERAGE_GATE:{
      status:'PASS',
      series_count:8,
      base_window_count:113,
      exterior_exact_window_count:105,
      inplus_logical_qa_case_count:1148,
      uchirimo_terminal_selector_context_count:uchirimoSelector.value.terminal_context_count,
      unverified_qa_case_count:0,
    }
  }:{}),
  ...(dependencyPass?{
    DEPENDENCY_GATE:{
      status:'PASS',
      direct_gate_test:dependencyDirect.path,
      exhaustive_population_sources:['Non-TW 80 exact','TW 25 exact','Inplus 1148 exhaustive','Uchirimo reachable discrete selector exhaustive'],
    }
  }:{}),
  ...(uiFlowPass?{
    UI_FLOW_GATE:{
      status:'PASS',
      direct_gate_test:uiDirect.path,
      browser_window_checks:226,
      global_window_count:113,
    }
  }:{}),
  ...(fullBrowserPass?{
    FULL_BROWSER_QA_GATE:{
      status:'PASS',
      exterior_base_windows_per_viewport:105,
      exterior_custom_contexts_per_viewport:137,
      inplus_logical_cases:1148,
      uchirimo_discrete_selector_contexts:uchirimoSelector.value.terminal_context_count,
      global_window_checks:226,
      desktop_smartphone:true,
    }
  }:{}),
};

const sourceRows=[baseProof,globalBrowser,inplus,stageA,uchirimoSelector,uchirimoBrowser,dependencyDirect,uiDirect,nontw,tw].filter(Boolean);
const sources=Object.fromEntries(sourceRows.map((row)=>[row.path,{sha256:sha256File(row.path)}]));
const proof={
  schema_version:'1.0.0',
  exact_head:head,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  generated_at:new Date().toISOString(),
  status:Object.keys(gateProofs).length===11?'PASS':'BLOCKED',
  checks,
  issues:[...new Set(issues)],
  gates:gateProofs,
  sources,
};
mkdirSync('artifacts/governance/evidence-inputs',{recursive:true});
const proofPath='artifacts/governance/post-human-final-proof.json';
writeJson(proofPath,proof);
const proofHash=sha256File(proofPath);
const review=JSON.parse(readFileSync('artifacts/governance/human-flow-review.json','utf8'));
const now=new Date().toISOString();
const entries=Object.entries(gateProofs).filter(([,row])=>row.status==='PASS').map(([gate_id])=>({
  id:`${gate_id}-${head.slice(0,12)}-POST_HUMAN_FINAL`,
  gate_id,
  outcome:'PASS',
  exact_head:head,
  runtime_snapshot_id:review.runtime_snapshot_id,
  artifact:proofPath,
  artifact_sha256:proofHash,
  command:'Project Governance Gate -> final-post-human-evidence',
  scope:'Final current-head evidence aggregation after Human Review, Heavy QA, exact exterior selector proofs, exhaustive inner-window evidence, browser evidence, regression and repository identity checks.',
  recorded_at:now,
  authoritative_for_current_head:true,
}));
writeJson('artifacts/governance/evidence-inputs/final.json',{
  schema_version:'1.0.0',
  exact_head:head,
  runtime_snapshot_id:review.runtime_snapshot_id,
  entries,
  status:proof.status,
  issues:proof.issues,
});
writeJson('artifacts/governance/evidence-inputs/index.json',{files:['artifacts/governance/evidence-inputs/final.json']});

let qaCaseCount=null;
if(fullWindowPass){
  try{
    qaCaseCount=(
      BigInt(nontw.value.exact_discrete_terminal_context_count??'0')+
      BigInt(tw.value.tw_exact_discrete_terminal_context_count??'0')+
      BigInt(uchirimoSelector.value.terminal_context_count??0)+
      BigInt(inplus.value.logicalQaCaseCount??0)
    ).toString();
  }catch{}
}
writeJson('artifacts/governance/post-human-coverage-summary.json',{
  schema_version:'1.0.0',
  exact_head:head,
  status:fullWindowPass?'PASS':'BLOCKED',
  series_count:8,
  base_window_count:113,
  qa_case_count:qaCaseCount,
  unverified_qa_case_count:fullWindowPass?0:1,
  sources:{
    nontw:nontw?.path??null,
    tw:tw?.path??null,
    inplus:inplus?.path??null,
    uchirimo:uchirimoSelector?.path??null,
  },
});
console.log(`POST_HUMAN_FINAL_EVIDENCE=${proof.status}`);
console.log(`FINAL_EVIDENCE_PASS_COUNT=${entries.length}`);
console.log(`UNVERIFIED_QA_CASE_COUNT=${fullWindowPass?0:1}`);
if(proof.issues.length)console.log(`FINAL_EVIDENCE_BLOCKERS=${proof.issues.join(' | ')}`);
