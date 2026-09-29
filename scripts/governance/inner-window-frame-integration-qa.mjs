import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {runtimeAppIntegrationInventory} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {loadRegisteredRuntime} from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
const out='artifacts/inner-window-frame-integration';mkdirSync(out,{recursive:true});
const expected=JSON.parse(readFileSync('docs/qa/inner-window-canonical-frame/runtime-identities.json'));
const current=runtimeAppIntegrationInventory();const identities=[];
for(const row of expected){const integration=current.find(p=>p.id===row.id);assert.ok(integration);for(const key of ['packageVersion','sourceHash','status','canonicalRuntimeReference'])assert.deepEqual(integration[key],row.current[key],`${row.id}:${key}`);identities.push({id:row.id,packageVersion:integration.packageVersion,sourceHash:integration.sourceHash,unchangedFromPreviousApp:row.unchanged});}
const fields=['frame_spec','upper_frame_spec','lower_frame_spec','fukashi_presence','fukashi_sides','fukashi_depth','fukashi_reinforcement'];
for(const [manufacturer,series] of [['LIXIL','インプラス'],['YKK AP','ウチリモ 内窓']]){const r=await loadRegisteredRuntime(manufacturer,series);assert.ok(r.normalizedManifest.formalPass&&r.sourcePackageIntegrity.match);assert.deepEqual(r.master.innerWindowFrameContract.canonical_field_order,fields);assert.equal(new Set(r.master.fields.map(f=>f.field_name)).size,r.master.fields.length);assert.ok(r.sourcePackageIntegrity.files.every(f=>f.match));}
const run=spawnSync(process.execPath,['--test','--test-reporter=tap','test/87-inner-window-canonical-frame.test.mjs'],{encoding:'utf8'});writeFileSync(`${out}/canonical-tests.tap`,run.stdout+run.stderr);assert.equal(run.status,0,run.stdout+run.stderr);
const report={status:'PASS',scope:'INNER_WINDOW_CANONICAL_FRAME_R3_AFFECTED_SCOPE',exactHead:process.env.HEAD_SHA??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks:Number(/# tests (\d+)/.exec(run.stdout)?.[1]),failures:Number(/# fail (\d+)/.exec(run.stdout)?.[1]),affected_legacy_pass_imported:0,identities,commonFields:fields,humanFlowReview:'PENDING',appIntegrationReady:false};writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
