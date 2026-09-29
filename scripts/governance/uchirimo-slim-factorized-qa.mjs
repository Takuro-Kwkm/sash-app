import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import { createFactorizedRunner,hash,verifySourceContract } from './uchirimo-slim-factorized-selector.mjs';
import {loadSlimQaRuntime} from './uchirimo-slim-runtime-support.mjs';
import {currentExactHead} from './governance-lib.mjs';
const out=process.env.UCHIRIMO_FACTORIZED_OUT??'artifacts/uchirimo-slim/factorized-qa';
const contract=JSON.parse(readFileSync('data/uchirimo-slim/selector-dependency-contract.json'));verifySourceContract(contract);
const {candidate,bytes,support,runtime,resolve}=loadSlimQaRuntime();
const manifestSha=support.source_integrity.actual;
mkdirSync(`${out}/components`,{recursive:true});
let plan;
if(process.env.UCHIRIMO_FACTORIZED_PLAN){
 plan=JSON.parse(readFileSync(process.env.UCHIRIMO_FACTORIZED_PLAN));assert.equal(plan.status,'PASS');assert.equal(plan.runtime_manifest_sha256,manifestSha);assert.equal(plan.partitions.length,plan.shard_count);
}else{
 const partitions=[];
 for(const node of [...candidate.canonical.product_nodes].sort((a,b)=>a.node_id.localeCompare(b.node_id))){
  const seed={room_specification:node.room,window_type:node.window_type};
  if(node.window_type==='sliding_window')for(const k of ['sash_configuration','size_class'])if(node[k])seed[k]=node[k];
  const result=resolve(seed);for(const[k,v]of Object.entries(seed))assert.equal(result.selection[k],v);
  const family=result.fields.find(f=>f.key==='glass_family');assert.ok(family?.values.length);
  for(const choice of family.values.filter(v=>!v.disabled))partitions.push({shard:partitions.length,node_id:node.node_id,room_specification:node.room,window_type:node.window_type,sash_configuration:seed.sash_configuration??'__UNSET__',size_class:seed.size_class??'__UNSET__',glass_family:choice.value,partition_seed_json:'{}',partition_key:`${node.node_id}|${choice.value}|__ROOT__`});
 }
 plan={schema:'UCHIRIMO_NORMALIZED_ROOT_PLAN_V1',status:'PASS',runtime_manifest_sha256:manifestSha,shard_count:partitions.length,partitions};
}
writeFileSync(`${out}/input-plan.json`,JSON.stringify(plan,null,2)+'\n');
const runner=createFactorizedRunner(runtime,resolve,{timeoutMs:Number(process.env.UCHIRIMO_FACTORIZED_TIMEOUT_MS??1200000),onFactor:report=>writeFileSync(`${out}/components/${report.component_key}.json`,JSON.stringify(report)+'\n')});
const selected=process.argv.slice(2).map(Number),parents=[];
try{
 for(const row of selected.length?selected.map(n=>plan.partitions[n]):plan.partitions){
  parents.push(runner.run(row));if(parents.length%25===0||selected.length||plan.shard_count<100)console.log(JSON.stringify({parent:row.shard,complete:parents.length,...runner.metrics()}));
 }
 const summary={schema:'UCHIRIMO_FACTORIZED_SELECTOR_QA_V1',status:'PASS',scope:'DISCRETE_SELECTOR_NORMAL_FORMS_WITH_DEPENDENCY_CONTRACT',exact_head:currentExactHead(),candidate_sha256:hash(bytes.toString()),runtime_manifest_sha256:manifestSha,dependency_contract_sha256:hash(contract),plan_sha256:hash(plan),parents_completed:parents.length,expected_parents:plan.shard_count,all_parent_coverage:parents.length===plan.shard_count,prior_pass_imported:0,legacy_materialized_rows_read:0,metrics:runner.metrics(),observed_peak_rss_mb:Math.round(process.resourceUsage().maxRSS/1024),continuous_dimensions:'SEPARATE_GATE_REQUIRED',formal_adoption:'NOT_GRANTED_BY_THIS_REPORT',parents};
 writeFileSync(`${out}/summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...summary,parents:undefined}));
}catch(error){writeFileSync(`${out}/failure.json`,JSON.stringify({status:'FAIL',completed:parents.length,error:error.message,stack:error.stack,metrics:runner.metrics()},null,2)+'\n');throw error;}
