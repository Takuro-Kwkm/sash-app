import test from'node:test';
import assert from'node:assert/strict';
import{evaluateGeminiAiProWorkerReadiness}from'../src/product-master-core/worker-readiness.mjs';

const base=()=>({
  platform:'Darwin',
  arch:'arm64',
  runnerService:{running:true,detail:'Started'},
  antigravity:{available:true,path:'/Users/takuro/.local/bin/agy',version:'1.1.26'},
  sessionPolicy:{sessionCreate:false,limitLoadToSessionType:'Aqua'},
  powerPolicy:{ac:{machineSleepMinutes:0,displaySleepMinutes:10}},
  authPreflight:{status:'NOT_EVALUATED',credentialMaterialPersisted:false}
});

test('v3.1 worker readiness passes locally when the Mac stays awake while display sleep remains enabled',()=>{
  const result=evaluateGeminiAiProWorkerReadiness(base());
  assert.equal(result.status,'PASS');
  assert.equal(result.readinessLevel,'LOCAL');
  assert.equal(result.runnerReadinessGate,'PASS_LOCAL');
  assert.equal(result.powerPolicy.displaySleepAllowed,true);
  assert.equal(result.powerPolicy.ac.displaySleepMinutes,10);
  assert.deepEqual(result.blockers,[]);
});

test('v3.1 worker readiness becomes LIVE only after an explicit AI Pro auth preflight passes',()=>{
  const input=base();
  input.requireLiveAuth=true;
  input.authPreflight={status:'PASS',credentialMaterialPersisted:false};
  const result=evaluateGeminiAiProWorkerReadiness(input);
  assert.equal(result.status,'PASS');
  assert.equal(result.readinessLevel,'LIVE');
  assert.equal(result.runnerReadinessGate,'PASS_LIVE');
  assert.equal(result.authPreflight.status,'PASS');
});

test('v3.1 worker readiness fails closed when AC machine sleep is enabled',()=>{
  const input=base();
  input.powerPolicy.ac.machineSleepMinutes=1;
  const result=evaluateGeminiAiProWorkerReadiness(input);
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.blockers.includes('AC_MACHINE_SLEEP_NOT_DISABLED'));
});

test('v3.1 worker readiness fails closed when the self-hosted runner service is unavailable',()=>{
  const input=base();
  input.runnerService.running=false;
  const result=evaluateGeminiAiProWorkerReadiness(input);
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.blockers.includes('RUNNER_SERVICE_NOT_RUNNING'));
});

test('v3.1 worker readiness fails closed when Antigravity CLI is unavailable',()=>{
  const input=base();
  input.antigravity.available=false;
  const result=evaluateGeminiAiProWorkerReadiness(input);
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.blockers.includes('ANTIGRAVITY_CLI_NOT_AVAILABLE'));
});

test('v3.1 live readiness never permits secrets or Product Master mutation authority',()=>{
  const input=base();
  input.requireLiveAuth=true;
  input.authPreflight={status:'PASS',credentialMaterialPersisted:true};
  const result=evaluateGeminiAiProWorkerReadiness(input);
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.blockers.includes('CREDENTIAL_MATERIAL_PERSISTED'));
  assert.equal(result.authority.canonicalWriteAllowed,false);
  assert.equal(result.authority.authoringWriteAllowed,false);
  assert.equal(result.authority.runtimeWriteAllowed,false);
  assert.equal(result.authority.registryWriteAllowed,false);
  assert.equal(result.authority.productionWriteAllowed,false);
  assert.equal(result.fallbackPolicy.silentFallbackAllowed,false);
});
