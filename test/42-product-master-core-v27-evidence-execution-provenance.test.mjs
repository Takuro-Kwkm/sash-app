import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{persistGeminiTransport,loadEvidenceInboxManifest}from'../src/product-master-core/evidence-inbox-store.mjs';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';
import{buildGeminiJobInputFromProductProfile}from'../src/product-master-core/product-profile.mjs';
import{createGeminiJob,runGeminiProductMasterBridge}from'../src/product-master-core/gemini-execution-bridge.mjs';

const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'evidence-provenance-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};
const profilePath=path.resolve('config/product-master-profiles/lixil-thermosl.v1.json');
const loadProfile=()=>JSON.parse(fs.readFileSync(profilePath,'utf8'));

const source={type:'OFFICIAL_PDF',driveFileId:'DRIVE-V27',title:'official-v27.pdf',version:'202609'};
const envelope=(batchId,candidateId)=>JSON.stringify({
  transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId,generatedAt:'2026-09-05T05:00:00Z',
  producer:{system:'GEMINI_ANTIGRAVITY',mode:'LIVE_EXTERNAL'},productId:'SER-V27',sourceContext:source,
  candidates:[{
    recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:candidateId,sourceSystem:'GEMINI_ANTIGRAVITY',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:'SER-V27',
    title:'execution provenance',subjectField:'window_type',claim:'The source explicitly identifies the target window type.',proposedStrength:'EXPLICIT',productNodeIds:[],
    source:{...source,printedPage:1,pdfPage:1,locatorText:'target window type'}
  }],issues:[]
});

const executionContext={
  workerContractVersion:'1.1',executionMode:'LIVE_EXTERNAL',executionChannel:'GEMINI_AI_PRO',
  preferredExecutionChannel:'GEMINI_AI_PRO',fallbackExecutionChannel:'GEMINI_API',fallbackAllowed:false,
  fallbackFrom:null,fallbackReason:null,transportMethod:'GEMINI_AI_PRO_STRUCTURED_HANDOFF',
  executionReference:'GITHUB_ACTIONS_RUN:Takuro-Kwkm/sash-app:456:1',model:'account-default'
};

test('v2.7 Evidence Inbox manifest persists normalized worker execution context without changing raw transport',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const raw=envelope('BATCH-V27-PROVENANCE-001','CAND-V27-PROVENANCE-001');
  const result=persistGeminiTransport(raw,{
    rootDir:inbox,importedAt:'2026-09-05T05:01:00Z',executionContext,
    expectedProductId:'SER-V27',expectedProducerSystem:'GEMINI_ANTIGRAVITY'
  });
  assert.equal(result.pass,true);
  assert.deepEqual(result.batch.executionContext,executionContext);
  const manifest=loadEvidenceInboxManifest(inbox);
  assert.deepEqual(manifest.batches[0].executionContext,executionContext);
  const storedRaw=fs.readFileSync(result.batchPath,'utf8');
  assert.equal(storedRaw,raw);
  assert.equal(JSON.parse(storedRaw).executionContext,undefined);
});

test('v2.7 Review Queue exposes execution provenance on Evidence Candidate refs',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const change=path.join(root,'change');
  const raw=envelope('BATCH-V27-PROVENANCE-002','CAND-V27-PROVENANCE-002');
  const imported=persistGeminiTransport(raw,{
    rootDir:inbox,importedAt:'2026-09-05T05:02:00Z',executionContext,
    expectedProductId:'SER-V27',expectedProducerSystem:'GEMINI_ANTIGRAVITY'
  });
  assert.equal(imported.pass,true);
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-V27',generatedAt:'2026-09-05T05:03:00Z'});
  assert.equal(queue.summary.byKind.EVIDENCE_CANDIDATE,1);
  const item=queue.items[0];
  assert.equal(item.kind,'EVIDENCE_CANDIDATE');
  assert.equal(item.refs.executionContext.executionChannel,'GEMINI_AI_PRO');
  assert.equal(item.refs.executionContext.transportMethod,'GEMINI_AI_PRO_STRUCTURED_HANDOFF');
  assert.equal(item.refs.executionContext.executionReference,'GITHUB_ACTIONS_RUN:Takuro-Kwkm/sash-app:456:1');
  assert.equal(item.refs.executionContext.fallbackFrom,null);
});

test('v2.7 legacy Evidence Inbox batch stays readable and does not invent execution provenance',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const change=path.join(root,'change');
  const raw=envelope('BATCH-V27-LEGACY-001','CAND-V27-LEGACY-001');
  const imported=persistGeminiTransport(raw,{
    rootDir:inbox,importedAt:'2026-09-05T05:04:00Z',
    expectedProductId:'SER-V27',expectedProducerSystem:'GEMINI_ANTIGRAVITY'
  });
  assert.equal(imported.pass,true);
  const manifest=loadEvidenceInboxManifest(inbox);
  assert.equal(manifest.batches[0].executionContext,undefined);
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-V27'});
  assert.equal(queue.items[0].refs.executionContext,undefined);
});

test('v2.7 allowed AI Pro to API fallback persists actual channel, fallback_from and API execution reference',async t=>{
  const profile=loadProfile();
  const built=buildGeminiJobInputFromProductProfile(profile,{
    execution_mode:'LIVE_EXTERNAL',execution_channel:'GEMINI_AI_PRO',fallback_allowed:true,
    execution_reference:'AIPRO:PRIMARY',model:'gemini-test',job_id:'GJOB-V27-FALLBACK-INBOX'
  });
  assert.equal(built.pass,true);
  const job=createGeminiJob(built.jobInput).job;
  job.sourceAttachment={...job.sourceAttachment,geminiFileUri:'files/already-uploaded'};
  const apiTransport=JSON.stringify({
    transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId:'BATCH-V27-FALLBACK-INBOX',generatedAt:'2026-09-05T05:05:00Z',
    producer:{system:'GEMINI_NOTEBOOKLM',mode:'LIVE_EXTERNAL'},productId:job.productId,sourceContext:job.sourceContext,
    candidates:[],issues:[{id:'ISSUE-V27-FALLBACK-INBOX',type:'OTHER',question:'fallback provenance integration test'}]
  });
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:apiTransport}]}}]})});
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const result=await runGeminiProductMasterBridge(job,{
    apiKey:'test-key',fetchImpl,evidenceInboxDir:inbox,changeControlDir:path.join(root,'change'),importedAt:'2026-09-05T05:06:00Z'
  });
  assert.equal(result.pass,true);
  assert.equal(result.job.executionChannel,'GEMINI_API');
  assert.equal(result.job.fallbackFrom,'GEMINI_AI_PRO');
  const manifest=loadEvidenceInboxManifest(inbox);
  const context=manifest.batches[0].executionContext;
  assert.equal(context.executionChannel,'GEMINI_API');
  assert.equal(context.fallbackFrom,'GEMINI_AI_PRO');
  assert.equal(context.fallbackReason,'GEMINI_AI_PRO_EXECUTION_SURFACE_UNAVAILABLE');
  assert.equal(context.transportMethod,'GEMINI_API_DIRECT_RESPONSE');
  assert.equal(context.executionReference,'GEMINI_API_JOB:GJOB-V27-FALLBACK-INBOX');
});
