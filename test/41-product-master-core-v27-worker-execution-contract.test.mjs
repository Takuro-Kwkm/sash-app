import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{buildGeminiJobInputFromProductProfile,validateProductProfile}from'../src/product-master-core/product-profile.mjs';
import{createGeminiJob,executeGeminiJob,runGeminiProductMasterBridge}from'../src/product-master-core/gemini-execution-bridge.mjs';
import{WORKER_EXECUTION_CONTRACT_VERSION}from'../src/product-master-core/worker-execution-contract.mjs';

const PROFILE_PATH=path.resolve('config/product-master-profiles/lixil-thermosl.v1.json');
const loadProfile=()=>JSON.parse(fs.readFileSync(PROFILE_PATH,'utf8'));
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'worker-contract-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function transportFor(job,batchId='BATCH-WORKER-CONTRACT-V27-001'){
  return JSON.stringify({
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId,generatedAt:'2026-09-05T04:00:00Z',
    producer:{system:'GEMINI_ANTIGRAVITY',mode:'LIVE_EXTERNAL'},productId:job.productId,sourceContext:job.sourceContext,
    candidates:[{
      recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:`CAND-${batchId.slice(6)}-001`,sourceSystem:'GEMINI_ANTIGRAVITY',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:job.productId,
      title:'worker contract evidence',subjectField:'window_type',claim:'The scoped source explicitly identifies a window type.',proposedStrength:'EXPLICIT',productNodeIds:[],
      source:{...job.sourceContext,printedPage:4,pdfPage:6,locatorText:'window type'}
    }],issues:[]
  });
}

test('v2.7 profile v1.1 requires explicit adapter/runtime/dependency extension fields',()=>{
  const profile=loadProfile();
  assert.equal(profile.profileSchemaVersion,'1.1');
  assert.equal(validateProductProfile(profile).pass,true);
  for(const key of['schemaAdapter','runtimePartitionPolicy','dependencyHooks']){
    const broken=structuredClone(profile);
    delete broken[key];
    assert.equal(validateProductProfile(broken).pass,false,key);
  }
});

test('v2.7 new LIVE job defaults to Gemini AI Pro primary with API fallback disabled',()=>{
  const built=buildGeminiJobInputFromProductProfile(loadProfile(),{job_id:'GJOB-WORKER-V27-DEFAULT'});
  assert.equal(built.pass,true);
  assert.equal(built.jobInput.worker_contract_version,WORKER_EXECUTION_CONTRACT_VERSION);
  assert.equal(built.jobInput.execution_mode,'LIVE_EXTERNAL');
  assert.equal(built.jobInput.execution_channel,'GEMINI_AI_PRO');
  assert.equal(built.jobInput.preferred_execution_channel,'GEMINI_AI_PRO');
  assert.equal(built.jobInput.fallback_execution_channel,'GEMINI_API');
  assert.equal(built.jobInput.fallback_allowed,false);
  assert.equal(built.jobInput.transport_method,'GEMINI_AI_PRO_STRUCTURED_HANDOFF');
  assert.equal(built.jobInput.execution_reference,null);
});

test('v2.7 new LIVE v1.1 job rejects missing execution_channel while legacy artifact is not guessed',()=>{
  const profile=loadProfile();
  const built=buildGeminiJobInputFromProductProfile(profile,{execution_mode:'LIVE_EXTERNAL',execution_channel:'GEMINI_API',job_id:'GJOB-WORKER-V27-STRICT'});
  const missing={...built.jobInput};
  delete missing.execution_channel;
  const strict=createGeminiJob(missing);
  assert.equal(strict.pass,false);
  assert.ok(strict.errors.some((row)=>row.code==='WORKER_LIVE_EXECUTION_CHANNEL_MISSING'));

  const legacy=createGeminiJob({
    job_id:'GJOB-WORKER-V27-LEGACY',manufacturer:'LEGACY',series:'LEGACY',product_id:'SER-LEGACY',task:'legacy',prompt:'legacy',
    source_context:{type:'OFFICIAL_PDF',driveFileId:'LEGACY-FILE',title:'legacy.pdf'},execution_mode:'LIVE_EXTERNAL',model:'legacy-model'
  });
  assert.equal(legacy.pass,true);
  assert.equal(legacy.job.workerContractVersion,null);
  assert.equal(legacy.job.executionChannel,null);
});

test('v2.7 Gemini AI Pro handoff imports as LIVE_EXTERNAL and preserves execution provenance',async t=>{
  const built=buildGeminiJobInputFromProductProfile(loadProfile(),{
    execution_mode:'LIVE_EXTERNAL',execution_channel:'GEMINI_AI_PRO',fallback_allowed:false,
    execution_reference:'GITHUB_ACTIONS_RUN:Takuro-Kwkm/sash-app:123:1',job_id:'GJOB-WORKER-V27-AIPRO'
  });
  const job=createGeminiJob(built.jobInput).job;
  const root=fixtureRoot(t);
  const result=await runGeminiProductMasterBridge(job,{
    externalResponse:transportFor(job,'BATCH-WORKER-CONTRACT-V27-AIPRO'),
    evidenceInboxDir:path.join(root,'inbox'),changeControlDir:path.join(root,'change'),importedAt:'2026-09-05T04:01:00Z',
    transportOptions:{expectedProducerSystem:'GEMINI_ANTIGRAVITY'}
  });
  assert.equal(result.pass,true);
  assert.equal(result.status,'IMPORTED');
  assert.equal(result.job.executionMode,'LIVE_EXTERNAL');
  assert.equal(result.job.executionChannel,'GEMINI_AI_PRO');
  assert.equal(result.executionContext.executionChannel,'GEMINI_AI_PRO');
  assert.equal(result.executionContext.transportMethod,'GEMINI_AI_PRO_STRUCTURED_HANDOFF');
  assert.equal(result.executionContext.executionReference,'GITHUB_ACTIONS_RUN:Takuro-Kwkm/sash-app:123:1');
  assert.equal(result.canonicalWritePerformed,false);
});

test('v2.7 Gemini AI Pro surface absence blocks when fallback is not allowed',async()=>{
  const built=buildGeminiJobInputFromProductProfile(loadProfile(),{
    execution_mode:'LIVE_EXTERNAL',execution_channel:'GEMINI_AI_PRO',fallback_allowed:false,
    execution_reference:'AIPRO:TEST',job_id:'GJOB-WORKER-V27-NO-FALLBACK'
  });
  const job=createGeminiJob(built.jobInput).job;
  const result=await executeGeminiJob(job,{});
  assert.equal(result.pass,false);
  assert.equal(result.job.status,'BLOCKED');
  assert.equal(result.errors[0].code,'GEMINI_AI_PRO_EXECUTION_SURFACE_UNAVAILABLE');
  assert.equal(result.job.executionChannel,'GEMINI_AI_PRO');
  assert.equal(result.job.fallbackFrom,null);
});

test('v2.7 fallback_allowed=true changes actual channel to API and records fallback_from and reason',async()=>{
  const built=buildGeminiJobInputFromProductProfile(loadProfile(),{
    execution_mode:'LIVE_EXTERNAL',execution_channel:'GEMINI_AI_PRO',fallback_allowed:true,
    execution_reference:'AIPRO:PRIMARY',model:'gemini-test',job_id:'GJOB-WORKER-V27-FALLBACK'
  });
  const job=createGeminiJob(built.jobInput).job;
  job.sourceAttachment={...job.sourceAttachment,geminiFileUri:'files/already-uploaded'};
  const apiTransport=JSON.stringify({
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId:'BATCH-WORKER-V27-API',generatedAt:'2026-09-05T04:02:00Z',
    producer:{system:'GEMINI_NOTEBOOKLM',mode:'LIVE_EXTERNAL'},productId:job.productId,sourceContext:job.sourceContext,candidates:[],issues:[{id:'ISSUE-WORKER-V27-API',type:'OTHER',question:'fallback test'}]
  });
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:apiTransport}]}}]})});
  const result=await executeGeminiJob(job,{apiKey:'test-key',fetchImpl});
  assert.equal(result.pass,true);
  assert.equal(result.job.executionChannel,'GEMINI_API');
  assert.equal(result.job.fallbackFrom,'GEMINI_AI_PRO');
  assert.equal(result.job.fallbackReason,'GEMINI_AI_PRO_EXECUTION_SURFACE_UNAVAILABLE');
  assert.equal(result.job.transportMethod,'GEMINI_API_DIRECT_RESPONSE');
  assert.equal(result.job.executionReference,'GEMINI_API_JOB:GJOB-WORKER-V27-FALLBACK');
});
