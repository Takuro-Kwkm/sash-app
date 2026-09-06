import test from'node:test';
import assert from'node:assert/strict';
import{evaluateProductMasterCoreBaselineV31}from'../src/product-master-core/baseline-readiness.mjs';

const base=()=>({
  spec:{version:'1.1',secondSeriesLiveValidated:true},
  commonCore:{
    contractTestsPass:true,
    productSpecificCommonCorePaths:0,
    failClosedVerified:true,
    humanApprovalBoundaryVerified:true
  },
  secondSeriesLive:{
    status:'PASS',
    executionChannel:'GEMINI_AI_PRO',
    silentFallbackAllowed:false
  },
  workerReadiness:{runnerReadinessGate:'PASS_LIVE'},
  workerLiveness:{livenessGate:'PASS_HEALTHY'},
  authority:{
    canonicalWriteAllowed:false,
    authoringWriteAllowed:false,
    runtimeWriteAllowed:false,
    registryWriteAllowed:false,
    productionWriteAllowed:false
  },
  defaultBranchScheduleActive:false
});

test('v3.1 baseline can be fixed while scheduled monitoring deployment remains pending',()=>{
  const out=evaluateProductMasterCoreBaselineV31(base());
  assert.equal(out.status,'PASS');
  assert.equal(out.baselineGate,'PASS_BASELINE_FIXED');
  assert.equal(out.continuousMonitoringGate,'PENDING_DEFAULT_BRANCH_MERGE');
  assert.deepEqual(out.blockers,[]);
  assert.equal(out.productMasterFormalGateEvaluated,false);
});

test('v3.1 baseline reports active continuous monitoring only after default-branch deployment',()=>{
  const input=base();
  input.defaultBranchScheduleActive=true;
  const out=evaluateProductMasterCoreBaselineV31(input);
  assert.equal(out.baselineGate,'PASS_BASELINE_FIXED');
  assert.equal(out.continuousMonitoringGate,'PASS_ACTIVE');
  assert.deepEqual(out.deploymentNotes,[]);
});

test('v3.1 baseline fails closed when the second-series LIVE proof is missing',()=>{
  const input=base();
  input.secondSeriesLive.status='BLOCKED';
  const out=evaluateProductMasterCoreBaselineV31(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('SECOND_SERIES_LIVE_NOT_PASS'));
});

test('v3.1 baseline fails closed when the dedicated AI Pro worker is not LIVE ready',()=>{
  const input=base();
  input.workerReadiness.runnerReadinessGate='PASS_LOCAL';
  const out=evaluateProductMasterCoreBaselineV31(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('WORKER_READINESS_NOT_PASS_LIVE'));
});

test('v3.1 baseline fails closed when liveness is stale or unhealthy',()=>{
  const input=base();
  input.workerLiveness.livenessGate='BLOCKED';
  const out=evaluateProductMasterCoreBaselineV31(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('WORKER_LIVENESS_NOT_HEALTHY'));
});

test('v3.1 baseline rejects product-specific Common Core paths and mutation authority',()=>{
  const input=base();
  input.commonCore.productSpecificCommonCorePaths=1;
  input.authority.runtimeWriteAllowed=true;
  const out=evaluateProductMasterCoreBaselineV31(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('PRODUCT_SPECIFIC_COMMON_CORE_PATHS_PRESENT'));
  assert.ok(out.blockers.includes('MUTATION_AUTHORITY_PRESENT_IN_BASELINE_GATE'));
  assert.equal(out.authority.runtimeWriteAllowed,false);
});

test('v3.1 baseline requires explicit prohibition of silent AI Pro to API fallback',()=>{
  const input=base();
  input.secondSeriesLive.silentFallbackAllowed=true;
  const out=evaluateProductMasterCoreBaselineV31(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('SILENT_FALLBACK_NOT_PROHIBITED'));
});
