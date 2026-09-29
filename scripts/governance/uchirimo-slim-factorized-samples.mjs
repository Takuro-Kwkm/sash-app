import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {loadSlimQaRuntime} from './uchirimo-slim-runtime-support.mjs';
import {createFactorizedRunner} from './uchirimo-slim-factorized-selector.mjs';
const {runtime,resolve}=loadSlimQaRuntime(),rows=[];
for(const[name,legacyCount,legacyStates]of [['heavy-shard-3795.json',430230528,35203],['heavy-shard-3796.json',1871880192,152397],['residual-3797-g9.json',1871880192,152397]]){
 const fixture=JSON.parse(readFileSync(`test/fixtures/uchirimo-slim/${name}`)),seed=JSON.parse(fixture.partition_seed_json);
 for(const c of JSON.parse(fixture.decision_constraints_json)){assert.equal(c.decision.kind,'VALUE');seed[c.field_key]=c.decision.value;}
 const row={...fixture,partition_seed_json:JSON.stringify(seed)},runner=createFactorizedRunner(runtime,resolve),r=runner.run(row);
 assert.equal(r.logical_configurations,String(legacyCount),'REFERENCE_LOGICAL_COUNT_MISMATCH');
 rows.push({fixture:name,status:'PASS',logical_configurations:r.logical_configurations,legacy_v3_states:legacyStates,...runner.metrics()});
}
const out=process.env.UCHIRIMO_FACTORIZED_SAMPLES_OUT??'artifacts/uchirimo-slim/factorized-samples.json';mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});writeFileSync(out,JSON.stringify({status:'PASS',scope:'THREE_FIXED_MIGRATION_SAMPLES_NOT_GLOBAL_PROOF',rows},null,2)+'\n');console.log(JSON.stringify(rows));
