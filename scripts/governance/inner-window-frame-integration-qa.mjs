import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {runtimeAppIntegrationInventory} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {loadRegisteredRuntime} from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
const out='artifacts/inner-window-frame-integration';mkdirSync(out,{recursive:true});
const expected=JSON.parse(readFileSync('docs/qa/inner-window-canonical-frame/runtime-identities.json'));
const current=runtimeAppIntegrationInventory();const identities=[];
const adoption=JSON.parse(readFileSync('changes/lixil-tw-202610/runtime-identity-adoption.json'));
assert.equal(adoption.scope_product_id,'SER-LIXIL-TW');assert.equal(adoption.status,'FORMAL_ADOPTED');
assert.equal(adoption.central_commit,'6efc459f231fd5bd254c36ab9b8d3c6d589da51a');
const ewAdoption=JSON.parse(readFileSync('changes/lixil-ew-202610/runtime-identity-adoption.json'));
assert.equal(ewAdoption.scope_product_id,'SER-LIX-EW');assert.equal(ewAdoption.status,'FORMAL_ADOPTED');
assert.equal(ewAdoption.central_commit,'0e500aed262edf82a40aa4e3786952efefad7be9');
const thermosAdoption=JSON.parse(readFileSync('changes/lixil-thermosl-is8900/runtime-identity-adoption.json'));
assert.equal(thermosAdoption.scope_product_id,'SER-LIX-SAMOSL');
if(thermosAdoption.status!=='FORMAL_ADOPTED'){
 assert.equal(thermosAdoption.status,'PROPOSED_PENDING_HUMAN');
 assert.equal(process.env.GITHUB_EVENT_NAME,'pull_request','Proposed product adoption cannot pass main CI');
}else{
 assert.ok(thermosAdoption.human_decision_ref&&thermosAdoption.native_formal_readback,'Formal adoption requires external decision/native readback');
 const root='contracts/production/formal-state/';
 const formal=JSON.parse(readFileSync(root+'current/SER-LIX-SAMOSL.json','utf8'));
 assert.equal(formal.revision,thermosAdoption.after.packageVersion);
 assert.equal(formal.lifecycle_state,'FORMAL');assert.equal(formal.source_scope,'ONE_OPTION_ONLY');
 for(const [path,expectedHash] of Object.entries(formal.artifacts))assert.equal(createHash('sha256').update(readFileSync(root+path)).digest('hex'),expectedHash,path);
 const decision=JSON.parse(readFileSync(root+formal.human_decision.path,'utf8'));
 assert.equal(decision.actor_kind,'HUMAN');assert.equal(decision.decision,'APPROVED');
 assert.equal(decision.payload_sha256,'c1d77775ffe456e441d73606256af4bfd1ceb2503f6d0de3cfd7722ba774a75a');
 assert.equal(decision.decision_ref,thermosAdoption.human_decision_ref);assert.equal(decision.decision_ref,formal.human_decision.decision_ref);
 const receipt=JSON.parse(readFileSync('changes/lixil-thermosl-is8900/native-formal-receipt.json','utf8'));
 assert.equal(receipt.status,'POST_SAVE_VERIFIED');assert.equal(receipt.decision_ref,decision.decision_ref);
 assert.equal(receipt.registry_entry.package_version,formal.revision);
}
for(const row of expected){
 const integration=current.find(p=>p.id===row.id);assert.ok(integration);
 const scopedAdoption=row.id===adoption.scope_product_id?adoption:row.id===ewAdoption.scope_product_id?ewAdoption:row.id===thermosAdoption.scope_product_id?thermosAdoption:null;
 const changed=Boolean(scopedAdoption);
 if(changed)assert.deepEqual(scopedAdoption.before,row.current,`Frozen previous ${row.id} identity`);
 let pinned=changed?scopedAdoption.after:row.current;
 if(row.id==='SER-YKK-APW431'&&integration.sourceHash!==pinned.sourceHash){
  const base='src/catalog/runtime-master-packages/ykkap-apw431-v1.2/';const previous=readFileSync(base+'runtime_manifest.json');const repaired=readFileSync(base+'runtime_manifest.metadata-repair-v1.json');
  assert.equal(createHash('sha256').update(previous).digest('hex'),pinned.sourceHash,'Fixed historical APW431 metadata');
  assert.equal(createHash('sha256').update(repaired).digest('hex'),'54ab51e9936ef6d249a16e3a9b4a31dd934cd176e2c081b2cf64f53b340ec57f','Acquired canonical MR1 metadata');
  assert.deepEqual(JSON.parse(repaired.toString('utf8').replace(/^\uFEFF/,'')).runtime_files,JSON.parse(previous.toString('utf8').replace(/^\uFEFF/,'')).runtime_files,'APW431 payload facts must remain byte-identical');
  pinned={...pinned,sourceHash:'54ab51e9936ef6d249a16e3a9b4a31dd934cd176e2c081b2cf64f53b340ec57f'};
 }
 for(const key of ['packageVersion','sourceHash','status','canonicalRuntimeReference'])assert.deepEqual(integration[key],pinned[key],`${row.id}:${key}`);
 if(changed){const runtime=await loadRegisteredRuntime('LIXIL',row.id===ewAdoption.scope_product_id?'EW':row.id===thermosAdoption.scope_product_id?'サーモスL':'TW');const nativeThermos=row.id===thermosAdoption.scope_product_id;assert.ok((nativeThermos?runtime.normalizedManifest.formal_pass:runtime.normalizedManifest.formalPass)&&runtime.sourcePackageIntegrity.match);assert.equal(runtime.sourcePackageIntegrity.files[0].actual,scopedAdoption.runtime_sha256);assert.equal(nativeThermos?runtime.normalizedManifest.package_version:runtime.normalizedManifest.packageVersion,pinned.packageVersion);}
 identities.push({id:row.id,packageVersion:integration.packageVersion,sourceHash:integration.sourceHash,unchangedFromPreviousApp:changed?false:row.unchanged,...(changed?{declaredSourceAdoption:scopedAdoption.work_id}:{})});
}
const fields=['frame_spec','upper_frame_spec','lower_frame_spec','fukashi_presence','fukashi_sides','fukashi_depth','fukashi_reinforcement'];
for(const [manufacturer,series] of [['LIXIL','インプラス'],['YKK AP','ウチリモ 内窓']]){const r=await loadRegisteredRuntime(manufacturer,series);assert.ok(r.normalizedManifest.formalPass&&r.sourcePackageIntegrity.match);assert.deepEqual(r.master.innerWindowFrameContract.canonical_field_order,fields);assert.equal(new Set(r.master.fields.map(f=>f.field_name)).size,r.master.fields.length);assert.ok(r.sourcePackageIntegrity.files.every(f=>f.match));}
const run=spawnSync(process.execPath,['--test','--test-reporter=tap','test/87-inner-window-canonical-frame.test.mjs'],{encoding:'utf8'});writeFileSync(`${out}/canonical-tests.tap`,run.stdout+run.stderr);assert.equal(run.status,0,run.stdout+run.stderr);
const report={status:'PASS',scope:'INNER_WINDOW_CANONICAL_FRAME_R5_AFFECTED_SCOPE',exactHead:process.env.HEAD_SHA??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks:Number(/# tests (\d+)/.exec(run.stdout)?.[1]),failures:Number(/# fail (\d+)/.exec(run.stdout)?.[1]),affected_legacy_pass_imported:0,identities,commonFields:fields,humanFlowReview:'PENDING',appIntegrationReady:false};writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
