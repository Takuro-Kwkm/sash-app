import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { getRuntimeMasterEntry, loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { adaptUchirimoTabularV1 } from '../../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import { getRuntimeAppIntegration, normalizeRuntimeSelection, resolveRuntimeAppProduct, toRuntimeUiResult } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';

// One complete V12 parent, using the existing root runner and the original
// partition plan. This is migration evidence, never a blanket PASS import.
const output=process.env.UCHIRIMO_SLIM_PARENT_DIFFERENTIAL_OUT??'artifacts/uchirimo-slim/parent-differential';
const plan=JSON.parse(readFileSync(process.env.UCHIRIMO_SLIM_PARENT_PLAN??'artifacts/uchirimo-slim/parent-differential-plan/all-partitions.json'));
assert.equal(plan.status,'PASS');
assert.equal(plan.shard_count,3956);
const parent=plan.partitions[Number(process.env.UCHIRIMO_SLIM_PARENT_SHARD??0)];
assert.equal(parent.shard,Number(process.env.UCHIRIMO_SLIM_PARENT_SHARD??0));
for(const [key,value] of Object.entries({
  UCHIRIMO_SELECTOR_MODE:'shard',UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'3956',
  UCHIRIMO_WINDOW_SHARD_INDEX:parent.shard,UCHIRIMO_SELECTOR_NODE_ID:parent.node_id,
  UCHIRIMO_SELECTOR_ROOM:parent.room_specification,UCHIRIMO_SELECTOR_WINDOW:parent.window_type,
  UCHIRIMO_SELECTOR_SASH:parent.sash_configuration,UCHIRIMO_SELECTOR_SIZE_CLASS:parent.size_class,
  UCHIRIMO_SELECTOR_GLASS_FAMILY:parent.glass_family,UCHIRIMO_SELECTOR_PARTITION_KEY:parent.partition_key,
  UCHIRIMO_SELECTOR_PARTITION_SEED_JSON:parent.partition_seed_json,
  UCHIRIMO_FULL_SELECTOR_OUT:output,
}))process.env[key]=String(value);
const {runShard}=await import('../uchirimo-full-selector-proof.mjs');
const candidateBytes=readFileSync('data/uchirimo-slim/working-candidate.json');
const candidate=JSON.parse(candidateBytes);
assert.equal(candidate.lifecycle,'WORKING_CANDIDATE_NOT_FORMAL');
const pkg=await loadCanonicalWorkbookRuntimePackage(getRuntimeMasterEntry('YKK AP','ウチリモ 内窓'));
assert.equal(pkg.integrity.match,true);
assert.equal(pkg.integrity.actual,candidate.source_formal.runtime_manifest_sha256);
assert.equal(plan.runtime_manifest_sha256,pkg.integrity.actual);
const role=Object.keys(pkg.documents).find(key=>pkg.documents[key]?.glass_node_matrix);
assert.ok(role);
const adapted=adaptUchirimoTabularV1({...pkg,documents:{...pkg.documents,[role]:candidate.canonical}});
const candidateRuntime={...adapted,sourcePackageIntegrity:pkg.integrity};
const integration=getRuntimeAppIntegration('SER-YKKAP-UCHIRIMO');
let matchedResponses=0;
const checkedResolve=async(product,selection)=>{
  const normalized=normalizeRuntimeSelection(adapted.master,selection);
  const actual=toRuntimeUiResult(adapted.master,adapted.resolver(normalized),integration,pkg.integrity);
  assert.deepEqual(actual,await resolveRuntimeAppProduct(product,selection));
  matchedResponses++;
  return actual;
};
const measure=async(name,options)=>{
  const started=performance.now();
  const report=await runShard({...options,out:`${output}/${name}`});
  const cases=readFileSync(`${output}/${name}/${report.case_artifact}`);
  assert.equal(createHash('sha256').update(cases).digest('hex'),report.case_artifact_sha256);
  return {report,duration_ms:Math.round((performance.now()-started)*1000)/1000};
};
const formal=await measure('formal',{loadRuntime});
const slim=await measure('slim',{loadRuntime:async()=>candidateRuntime,resolveProduct:checkedResolve});
function loadRuntime(){return loadRegisteredRuntime('YKK AP','ウチリモ 内窓');}
const comparable=['terminal_context_count','terminal_equivalence_class_count','visited_state_count',
  'transition_check_count','dependency_rejection_count','downstream_clear_event_count',
  'flow_signature_sha256s','symbolic_equivalence_check_count','symbolic_collapsed_branch_count',
  'symbolic_fallback_count','symbolic_independent_fields','case_artifact_sha256'];
for(const key of comparable)assert.deepEqual(slim.report[key],formal.report[key],`PARENT_${key}_MISMATCH`);
assert.ok(matchedResponses>0);
const summary={schema_version:'UCHIRIMO_SLIM_PARENT_DIFFERENTIAL_V1',status:'PASS',
  scope:'ONE_COMPLETE_PARENT_NOT_GLOBAL_V12_CLOSURE',parent_shard:parent.shard,
  partition_key:parent.partition_key,candidate_sha256:createHash('sha256').update(candidateBytes).digest('hex'),
  source_runtime_sha256:pkg.integrity.actual,exact_head:slim.report.exact_head,
  compared_ui_responses:matchedResponses,visited_state_count:slim.report.visited_state_count,
  terminal_context_count:slim.report.terminal_context_count,
  terminal_equivalence_class_count:slim.report.terminal_equivalence_class_count,
  terminal_artifact_sha256:slim.report.case_artifact_sha256,
  formal_duration_ms:formal.duration_ms,slim_checked_duration_ms:slim.duration_ms,
  candidate_parent_complete_count:1,parent_pass_imported_from_v12:0};
mkdirSync(output,{recursive:true});
writeFileSync(`${output}/summary.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
