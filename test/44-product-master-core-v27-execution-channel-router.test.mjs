import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import path from'node:path';
import{routeGeminiExecutionChannel}from'../src/product-master-core/execution-channel-router.mjs';
import{buildGeminiJobInputFromProductProfile}from'../src/product-master-core/product-profile.mjs';
import{createGeminiJob,executeGeminiJob}from'../src/product-master-core/gemini-execution-bridge.mjs';

const profilePath=path.resolve('config/product-master-profiles/lixil-thermosl.v1.json');
const loadProfile=()=>JSON.parse(fs.readFileSync(profilePath,'utf8'));
const makeJob=(overrides={})=>{
  const built=buildGeminiJobInputFromProductProfile(loadProfile(),{
    execution_mode:'LIVE_EXTERNAL',execution_channel:'GEMINI_AI_PRO',fallback_allowed:false,
    execution_reference:'AIPRO:ROUTER',job_id:'GJOB-V27-ROUTER',...overrides
  });
  assert.equal(built.pass,true);
  const created=createGeminiJob(built.jobInput);
  assert.equal(created.pass,true);
  return created.job;
};

test('v2.7 router records explicit AI Pro channel selection without mutating the Job',()=>{
  const job=makeJob();
  const routed=routeGeminiExecutionChannel(job);
  assert.equal(routed.pass,true);
  assert.equal(routed.status,'SELECTED');
  assert.equal(routed.decision.recordType,'GEMINI_EXECUTION_CHANNEL_ROUTE_DECISION');
  assert.equal(routed.decision.requestedChannel,'GEMINI_AI_PRO');
  assert.equal(routed.decision.selectedChannel,'GEMINI_AI_PRO');
  assert.equal(routed.decision.preferredExecutionChannel,'GEMINI_AI_PRO');
  assert.equal(routed.decision.fallbackExecutionChannel,'GEMINI_API');
  assert.equal(routed.decision.fallbackAllowed,false);
  assert.equal(job.executionChannel,'GEMINI_AI_PRO');
});

test('v2.7 router blocks unavailable AI Pro when fallback is not allowed',()=>{
  const job=makeJob();
  const routed=routeGeminiExecutionChannel(job,{unavailableChannel:'GEMINI_AI_PRO',reason:'GEMINI_AI_PRO_EXECUTION_SURFACE_UNAVAILABLE'});
  assert.equal(routed.pass,false);
  assert.equal(routed.status,'BLOCKED');
  assert.equal(routed.decision.status,'BLOCKED');
  assert.equal(routed.decision.selectedChannel,null);
  assert.equal(routed.errors[0].code,'GEMINI_AI_PRO_EXECUTION_SURFACE_UNAVAILABLE');
  assert.equal(routed.job.executionChannel,'GEMINI_AI_PRO');
});

test('v2.7 router selects API fallback only when explicitly allowed and records actual routing provenance',()=>{
  const profile=loadProfile();
  const job=makeJob({fallback_allowed:true,model:'known-ai-pro-model'});
  assert.equal(job.model,'known-ai-pro-model');
  const routed=routeGeminiExecutionChannel(job,{unavailableChannel:'GEMINI_AI_PRO',reason:'GEMINI_AI_PRO_EXECUTION_SURFACE_UNAVAILABLE'});
  assert.equal(routed.pass,true);
  assert.equal(routed.status,'FALLBACK_SELECTED');
  assert.equal(routed.decision.requestedChannel,'GEMINI_AI_PRO');
  assert.equal(routed.decision.selectedChannel,'GEMINI_API');
  assert.equal(routed.decision.fallbackFrom,'GEMINI_AI_PRO');
  assert.equal(routed.job.executionChannel,'GEMINI_API');
  assert.equal(routed.job.fallbackFrom,'GEMINI_AI_PRO');
  assert.equal(routed.job.fallbackReason,'GEMINI_AI_PRO_EXECUTION_SURFACE_UNAVAILABLE');
  assert.equal(routed.job.transportMethod,'GEMINI_API_DIRECT_RESPONSE');
  assert.equal(routed.job.executionReference,null);
  assert.equal(routed.job.model,profile.modelDefault);
});

test('v2.7 router does not infer channels for legacy artifacts',()=>{
  const legacy=createGeminiJob({
    job_id:'GJOB-V27-ROUTER-LEGACY',manufacturer:'LEGACY',series:'LEGACY',product_id:'SER-LEGACY',task:'legacy',prompt:'legacy',
    source_context:{type:'OFFICIAL_PDF',driveFileId:'LEGACY-FILE',title:'legacy.pdf'},execution_mode:'LIVE_EXTERNAL',model:'legacy-model'
  });
  assert.equal(legacy.pass,true);
  const routed=routeGeminiExecutionChannel(legacy.job);
  assert.equal(routed.pass,true);
  assert.equal(routed.status,'NOT_APPLICABLE');
  assert.equal(routed.job.executionChannel,null);
  assert.equal(routed.decision.selectedChannel,null);
  assert.equal(routed.decision.reason,'LEGACY_JOB_WITHOUT_WORKER_CONTRACT_V1_1');
});

test('v2.7 execution bridge exposes Router decision for direct API execution',async()=>{
  const profile=loadProfile();
  const built=buildGeminiJobInputFromProductProfile(profile,{
    execution_mode:'LIVE_EXTERNAL',execution_channel:'GEMINI_API',fallback_allowed:false,
    execution_reference:'API:ROUTER',job_id:'GJOB-V27-ROUTER-API'
  });
  const job=createGeminiJob(built.jobInput).job;
  job.sourceAttachment={...job.sourceAttachment,geminiFileUri:'files/already-uploaded'};
  const raw=JSON.stringify({
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId:'BATCH-V27-ROUTER-API',generatedAt:'2026-09-05T06:00:00Z',
    producer:{system:'GEMINI_NOTEBOOKLM',mode:'LIVE_EXTERNAL'},productId:job.productId,sourceContext:job.sourceContext,
    candidates:[],issues:[{id:'ISSUE-V27-ROUTER-API',type:'OTHER',question:'router decision test'}]
  });
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:raw}]}}]})});
  const result=await executeGeminiJob(job,{apiKey:'test-key',fetchImpl});
  assert.equal(result.pass,true);
  assert.equal(result.routeDecision.status,'SELECTED');
  assert.equal(result.routeDecision.requestedChannel,'GEMINI_API');
  assert.equal(result.routeDecision.selectedChannel,'GEMINI_API');
});
