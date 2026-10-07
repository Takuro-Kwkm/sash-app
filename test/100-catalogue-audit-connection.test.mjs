import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('native catalogue audit admission retains exact current Formal/runtime baseline and read-only gates', () => {
  const result=spawnSync('python3',['-B','scripts/production/validate-catalogue-audit-profile.py'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).status,'PASS');
  const manifest=readFileSync('contracts/production/catalogue-audit/SER-LIX-SAMOS2H/baseline-runtime-manifest.json');
  const registry=readFileSync('src/catalog/runtime-master/app-runtime-integration-registry.mjs','utf8');
  assert.ok(registry.includes(createHash('sha256').update(manifest).digest('hex')));
});

test('a completed catalogue review never represents source or Formal adoption', () => {
  const profile=JSON.parse(readFileSync('contracts/production/catalogue-audit/SER-LIX-SAMOS2H/profile.json'));
  const review=JSON.parse(readFileSync('contracts/production/catalogue-audit/SER-LIX-SAMOS2H/review.json'));
  assert.equal(profile.mutation_policy,'NONE');
  assert.equal(profile.admitted_target_gate,'SOURCE_AUDIT_VERIFIED');
  assert.equal(review.reviewer_kind,'AI');
  assert.ok(review.scope_limits.some(limit=>limit.includes('no Human Adoption')));
  assert.deepEqual(review.compared_pdf_pages,Array.from({length:360},(_,i)=>i+1));
});
