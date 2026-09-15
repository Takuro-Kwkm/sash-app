import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';

const HEAD_SHA = process.env.HEAD_SHA ?? null;
const ROOT = process.env.STAGE_A_TW_CONSOLIDATION_EVIDENCE_ROOT ?? 'artifacts/stage-a-tw-25-window-exact-head-consolidation/evidence';
const OUT = process.env.STAGE_A_TW_CONSOLIDATION_OUT ?? 'artifacts/stage-a-tw-25-window-exact-head-consolidation';
const BASE_HEAD = '2a2bfb2643b186ff4881f26d3b54873ede1137da';
const V2_HEAD = 'ae899912c661b9f602b951101f56cd8a9cbb8dd9';
const V3_HEAD = 'e560afdc62f33d23cc2f6a520031766a0f43f579';
const EXPECTED_RUNTIME_HASH = 'c4980f45fdf57afe1512f2ca42da0eca53d9facc1f555734f7d89b347a808ee0';
const EXPECTED_BASE_EVIDENCE_DIGEST = '349ed850b19d8053af35aea07a65d376d38e0e96c1de77e299a9044c573d2002';
const EXPECTED_TOTAL = 8493556499711262784n;
const EXPECTED_CUSTOM_PENDING = 64n;

const provenance = {
  baseline:{run_id:34920668737,artifact_id:10378051565,artifact_digest:'sha256:e3a6e35ed35dcbddd02a4cf03206ceb479a6ca37fcca52e210c2035467f992e7',head:BASE_HEAD,model:'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V1'},
  high:{run_id:34921354690,artifact_id:10378191658,artifact_digest:'sha256:f5e77527b489eab1a1fd785a5d66dd6a144ef1e31d8a9e671a59d208252b3d4b',head:V2_HEAD,model:'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V2_RECOVERY'},
  terrace:{run_id:34921354690,artifact_id:10377734642,artifact_digest:'sha256:c4dcec09d12d8c8f97732f303f68070f1ecafa6d2ab5496f64efcd3ccf7fcf9c',head:V2_HEAD,model:'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V2_RECOVERY'},
  saihu:{run_id:34921354690,artifact_id:10378081881,artifact_digest:'sha256:d33b61fd98eb36a99244bb87f26d6e2607c91e1026ca9f3d688056da80b02cc4',head:V2_HEAD,model:'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V2_RECOVERY'},
  katte:{run_id:34921354690,artifact_id:10378376082,artifact_digest:'sha256:1c4e6a2427a6229672bb10dd1aabc67a8837b7823f1d82645929138dca224e3e',head:V2_HEAD,model:'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V2_RECOVERY'},
  shut:{run_id:34921919705,artifact_id:10378846321,artifact_digest:'sha256:7314e019fe6a63965aa860600cc0c7d5eed2ea2ea29af8ebbe41280ac1a77e01',head:V3_HEAD,model:'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V3_COLOR_RECOVERY'},
};

const recoveredExpected = new Map([
  ['high','SWT-LIX-TW-HIGH-YOKO'],
  ['terrace','SWT-LIX-TW-TERRACE-DOOR'],
  ['saihu','SWT-LIX-TW-SAIHU-KATTEGUCHI'],
  ['katte','SWT-LIX-TW-KATTEGUCHI'],
  ['shut','SWT-LIX-TW-SHUT-HIKI'],
]);

function findReports(dir) {
  const out=[];
  const walk=(path)=>{
    for (const name of readdirSync(path)) {
      const item=join(path,name);
      if (statSync(item).isDirectory()) walk(item);
      else if (name==='report.json') out.push(item);
    }
  };
  walk(dir);
  return out;
}
function sha256File(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function readSingleReport(slot) {
  const dir=join(ROOT,slot);
  const reports=findReports(dir);
  if (reports.length !== 1) throw new Error(`${slot}: expected one report.json, got ${reports.length}`);
  return {path:reports[0],digest:sha256File(reports[0]),report:JSON.parse(readFileSync(reports[0],'utf8'))};
}
function requireEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }

const runtime=await loadRegisteredRuntime('LIXIL','TW');
requireEqual(runtime?.entry?.runtimeManifestSha256,EXPECTED_RUNTIME_HASH,'current runtime manifest hash');

const baselineEntry=readSingleReport('baseline');
const baseline=baselineEntry.report;
requireEqual(baseline.exact_head_sha,BASE_HEAD,'baseline exact head');
requireEqual(baseline.proof_model_version,'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1','baseline proof model');
requireEqual(baseline.projection_model_version,'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V1','baseline projection model');
requireEqual(baseline.runtime_manifest_sha256,EXPECTED_RUNTIME_HASH,'baseline runtime hash');
requireEqual(baseline.evidence_digest,EXPECTED_BASE_EVIDENCE_DIGEST,'baseline evidence digest');
requireEqual(Number(baseline.expected_window_count),25,'baseline expected window count');
requireEqual(Number(baseline.report_count),25,'baseline report count');

const recovered=new Map();
const evidenceReports={baseline:{report_digest:`sha256:${baselineEntry.digest}`,...provenance.baseline}};
for (const [slot,window] of recoveredExpected) {
  const entry=readSingleReport(slot), report=entry.report, meta=provenance[slot];
  requireEqual(report.exact_head_sha,meta.head,`${slot} exact head`);
  requireEqual(report.proof_model_version,'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1',`${slot} proof model`);
  requireEqual(report.projection_model_version,meta.model,`${slot} projection model`);
  requireEqual(report.runtime_manifest_sha256,EXPECTED_RUNTIME_HASH,`${slot} runtime hash`);
  requireEqual(report.window_type,window,`${slot} window`);
  requireEqual(report.status,'COUNTED_CANDIDATE',`${slot} status`);
  requireEqual(Number(report.projection_mismatch_count ?? 0),0,`${slot} projection mismatch count`);
  if (report.blocker) throw new Error(`${slot}: blocker present ${JSON.stringify(report.blocker)}`);
  if (!report.exact_discrete_terminal_context_count) throw new Error(`${slot}: missing terminal count`);
  recovered.set(window,report);
  evidenceReports[slot]={report_digest:`sha256:${entry.digest}`,...meta};
}

const expectedRecovered=[...recoveredExpected.values()].sort();
const baselineBlocked=(baseline.blocker_rows ?? []).map((row)=>row.window_type).sort();
requireEqual(JSON.stringify(baselineBlocked),JSON.stringify(expectedRecovered),'baseline blocker window set');

const finalRows=[];
for (const row of baseline.windows ?? []) {
  const replacement=recovered.get(row.window_type);
  if (replacement) {
    finalRows.push({
      window_type:row.window_type,
      terminal:String(replacement.exact_discrete_terminal_context_count),
      custom_pending:String(replacement.custom_pending_context_count ?? '0'),
      evidence_head:replacement.exact_head_sha,
      projection_model_version:replacement.projection_model_version,
      status:'COUNTED_CANDIDATE',
    });
  } else {
    requireEqual(row.status,'COUNTED_CANDIDATE',`baseline retained ${row.window_type} status`);
    if (!row.terminal) throw new Error(`baseline retained ${row.window_type}: missing terminal count`);
    finalRows.push({
      window_type:row.window_type,
      terminal:String(row.terminal),
      custom_pending:String(row.custom_pending ?? '0'),
      evidence_head:BASE_HEAD,
      projection_model_version:'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V1',
      status:'COUNTED_CANDIDATE',
    });
  }
}

const uniqueWindows=new Set(finalRows.map((row)=>row.window_type));
requireEqual(finalRows.length,25,'final row count');
requireEqual(uniqueWindows.size,25,'final unique window count');
const total=finalRows.reduce((sum,row)=>sum+BigInt(row.terminal),0n);
const custom=finalRows.reduce((sum,row)=>sum+BigInt(row.custom_pending),0n);
requireEqual(total,EXPECTED_TOTAL,'TW exact terminal total');
requireEqual(custom,EXPECTED_CUSTOM_PENDING,'TW custom pending total');

const currentSourceIdentity={
  runtime_manifest_sha256:runtime.entry.runtimeManifestSha256,
  master_version:runtime.entry.masterVersion,
  schema_version:runtime.entry.schemaVersion,
  adapter_type:runtime.entry.adapterType,
};
const evidenceDigest=createHash('sha256').update(JSON.stringify({HEAD_SHA,currentSourceIdentity,evidenceReports,finalRows})).digest('hex');
const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  proof_model_version:'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1',
  consolidation_model_version:'TW_25_WINDOW_EXACT_HEAD_EVIDENCE_CONSOLIDATION_V1',
  current_source_identity:currentSourceIdentity,
  source_invariance_gate:'PASS_BY_WORKFLOW_GIT_DIFF',
  expected_window_count:25,
  counted_window_count:25,
  unverified_window_count:0,
  tw_exact_discrete_terminal_context_count:total.toString(),
  tw_custom_pending_context_count:custom.toString(),
  evidence_reports:evidenceReports,
  evidence_digest:evidenceDigest,
  windows:finalRows.sort((a,b)=>a.window_type.localeCompare(b.window_type)),
  status:'TW_25_WINDOW_DISCRETE_EXACT_HEAD_CONSOLIDATED_PASS',
  gate_status:{
    tw_discrete_population_gate:'PASS',
    qa_population_gate:'BLOCKED_OTHER_SERIES_AND_CONTINUOUS_PROOF_PENDING',
    custom_size_coverage_gate:'BLOCKED_CONTINUOUS_PARTITION_NOT_PROVEN',
    app_integration_ready:false,
    release_input_gate:'BLOCKED',
  },
  note:'Current-head consolidation only. Constituent exact-count evidence is reused only because the workflow independently proves that TW Runtime/UI source and each constituent proof implementation are unchanged between the evidence heads and this exact HEAD. This does not prove continuous CUSTOM partitions or the other 80 Stage A windows.',
};
mkdirSync(OUT,{recursive:true});
writeFileSync(join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`TW_25_CONSOLIDATION_STATUS=${report.status}`);
console.log(`TW_WINDOW_COUNT=${report.counted_window_count}`);
console.log(`TW_UNVERIFIED_WINDOW_COUNT=${report.unverified_window_count}`);
console.log(`TW_EXACT_DISCRETE_TERMINAL_CONTEXT_COUNT=${report.tw_exact_discrete_terminal_context_count}`);
console.log(`TW_CUSTOM_PENDING_CONTEXT_COUNT=${report.tw_custom_pending_context_count}`);
console.log(`TW_EVIDENCE_DIGEST=${report.evidence_digest}`);
console.log('TW_DISCRETE_POPULATION_GATE=PASS');
console.log('QA_POPULATION_GATE=BLOCKED_OTHER_SERIES_AND_CONTINUOUS_PROOF_PENDING');
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
