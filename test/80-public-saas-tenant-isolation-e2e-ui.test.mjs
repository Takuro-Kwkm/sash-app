import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../src/public-saas/ui/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../src/public-saas/ui/index.html',import.meta.url),'utf8');

test('Public SaaS Preview exposes a browser tenant-isolation E2E panel',()=>{
  for(const id of ['tenantIsolationCard','currentWorkspaceId','targetWorkspaceId','tenantReadTestButton','tenantWriteTestButton','tenantIsolationResult']){
    assert.match(html,new RegExp(`id=["']${id}["']`));
  }
  assert.match(html,/期待結果は403 DENIED/);
});

test('tenant isolation UI uses authenticated application APIs and only treats 403 as PASS',()=>{
  assert.match(app,/\/api\/public-saas\/work\/database\?workspace_id=/);
  assert.match(app,/\/api\/public-saas\/work\/projects/);
  assert.match(app,/S4_NEGATIVE_TEST_SHOULD_NOT_PERSIST/);
  assert.match(app,/if\(error\.status===403\)/);
  assert.match(app,/PASS \/ 403 DENIED/);
  assert.match(app,/FAIL \/ 200系で成立してしまいました/);
  assert.match(app,/INCONCLUSIVE/);
  assert.doesNotMatch(app,/service_role/i);
  assert.doesNotMatch(app,/sb_secret_/i);
});

test('tenant isolation test refuses same-workspace targets',()=>{
  assert.match(app,/if\(target===current\)/);
  assert.match(app,/自分のWorkspaceではなく、相手Workspace ID/);
});
