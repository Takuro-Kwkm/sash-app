import test from'node:test';
import assert from'node:assert/strict';
import{evaluateGeminiAiProWorkerLiveness}from'../src/product-master-core/worker-liveness.mjs';

const now=Date.parse('2026-09-06T07:00:00Z');
const baseRun={
  id:123,
  status:'completed',
  conclusion:'success',
  head_branch:'feat/catalog-recovery-v2',
  head_sha:'abc123',
  created_at:'2026-09-06T06:30:00Z',
  updated_at:'2026-09-06T06:31:00Z',
  html_url:'https://github.com/Takuro-Kwkm/sash-app/actions/runs/123'
};

test('v3.1 liveness passes for a fresh successful self-hosted smoke run',()=>{
  const out=evaluateGeminiAiProWorkerLiveness({runs:[baseRun],now,expectedBranch:'feat/catalog-recovery-v2'});
  assert.equal(out.status,'PASS');
  assert.equal(out.livenessGate,'PASS_HEALTHY');
  assert.deepEqual(out.blockers,[]);
});

test('v3.1 liveness allows a newly queued run only within the grace window',()=>{
  const out=evaluateGeminiAiProWorkerLiveness({
    runs:[{...baseRun,status:'queued',conclusion:null,created_at:'2026-09-06T06:50:00Z'}],
    now,
    queueGraceMinutes:20,
    expectedBranch:'feat/catalog-recovery-v2'
  });
  assert.equal(out.status,'WAITING');
  assert.equal(out.livenessGate,'WAITING_WITHIN_GRACE');
});

test('v3.1 liveness fails closed when a queued run is stuck beyond grace',()=>{
  const out=evaluateGeminiAiProWorkerLiveness({
    runs:[{...baseRun,status:'queued',conclusion:null,created_at:'2026-09-06T06:20:00Z'}],
    now,
    queueGraceMinutes:20,
    expectedBranch:'feat/catalog-recovery-v2'
  });
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('SMOKE_RUN_STUCK'));
});

test('v3.1 liveness fails closed for a stale last success',()=>{
  const out=evaluateGeminiAiProWorkerLiveness({
    runs:[{...baseRun,created_at:'2026-09-06T04:00:00Z'}],
    now,
    maxAgeMinutes:90,
    expectedBranch:'feat/catalog-recovery-v2'
  });
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('LAST_SUCCESS_STALE'));
});

test('v3.1 liveness fails closed after a failed smoke run',()=>{
  const out=evaluateGeminiAiProWorkerLiveness({
    runs:[{...baseRun,conclusion:'failure'}],
    now,
    expectedBranch:'feat/catalog-recovery-v2'
  });
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('LAST_SMOKE_NOT_SUCCESS'));
});

test('v3.1 liveness never grants Product Master mutation authority',()=>{
  const out=evaluateGeminiAiProWorkerLiveness({runs:[baseRun],now,expectedBranch:'feat/catalog-recovery-v2'});
  assert.deepEqual(out.authority,{
    canonicalWriteAllowed:false,
    authoringWriteAllowed:false,
    runtimeWriteAllowed:false,
    registryWriteAllowed:false,
    productionWriteAllowed:false
  });
});
