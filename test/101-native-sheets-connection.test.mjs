import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
test('native package connections keep identity and QA_READY boundaries',()=>{
 const connections=read('contracts/production/work-connections.v2.json').products.filter(row=>row.native_adapter==='scripts/production/sheet-package-change.py');
 assert.ok(connections.length);
 for (const connection of connections) {
 assert.equal(connection.default_gate,'QA_READY');
 const profile=read(connection.change_profile.path);
 assert.equal(profile.product_id,connection.product_id);
 assert.equal(profile.formal_mutations,0);assert.equal(profile.runtime_ui_mutations,0);
 assert.equal(profile.shared_engine,'scripts/production-work.py');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,connection.change_profile.path))).digest('hex'),connection.change_profile.sha256);
 if (profile.baseline_kind==='EXISTING_FORMAL_JSON') {
  assert.equal(profile.schema,'NATIVE_JSON_PACKAGE_CHANGE_PROFILE_V1');
  assert.equal(profile.baseline_revision,connection.current_formal_version);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,profile.domain_adapter.path))).digest('hex'),profile.domain_adapter.sha256);
 } else {
  assert.ok(profile.native_sheets.length);
  assert.equal(profile.native_sheets.length,new Set(profile.native_sheets).size);
 }
 assert.equal(connection.build_profile.mode,'EXISTING_FORMAL_SUCCESSOR');
 }
});
test('pending products retain fail-closed contracts',()=>{
 for(const connection of read('contracts/production/work-connections.v2.json').products.filter(row=>row.connection_state!=='CONNECTED')){
  assert.equal(connection.safe_failure.state,'FAIL_CLOSED');assert.equal(connection.safe_failure.fallback,false);assert.equal(connection.safe_failure.writes,0);
 }
});
