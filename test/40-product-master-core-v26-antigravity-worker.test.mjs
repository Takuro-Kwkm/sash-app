import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{validateGeminiTransportEnvelope}from'../src/product-master-core/gemini-transport.mjs';
import{buildGeminiJobInputFromProductProfile}from'../src/product-master-core/product-profile.mjs';
import{createGeminiJob,runGeminiProductMasterBridge}from'../src/product-master-core/gemini-execution-bridge.mjs';
import{ANTIGRAVITY_PRODUCER_SYSTEM,buildAntigravityTransportSchema,buildAntigravityWorkerPrompt}from'../src/product-master-core/antigravity-worker-adapter.mjs';

const PROFILE_PATH=path.resolve('config/product-master-profiles/lixil-thermosl.v1.json');
const loadProfile=()=>JSON.parse(fs.readFileSync(PROFILE_PATH,'utf8'));
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'antigravity-worker-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function makeEnvelope(job){
  return{
    transportSchemaVersion:'1.0',
    transportType:'EVIDENCE_CANDIDATE_BATCH',
    batchId:'BATCH-LIXIL-THERMOSL-AGY-TEST-001',
    generatedAt:'2026-09-05T00:00:00Z',
    producer:{system:ANTIGRAVITY_PRODUCER_SYSTEM,mode:'LIVE_EXTERNAL'},
    productId:job.productId,
    sourceContext:job.sourceContext,
    candidates:[{
      recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-LIXIL-THERMOSL-AGY-TEST-001',
      sourceSystem:ANTIGRAVITY_PRODUCER_SYSTEM,producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:job.productId,
      title:'単体引違い窓',subjectField:'window_type',claim:'The scoped source explicitly identifies a 単体引違い窓 section.',
      proposedStrength:'EXPLICIT',productNodeIds:[],
      source:{...job.sourceContext,printedPage:6,pdfPage:8,locatorText:'引違い窓｜単体引違い窓'}
    }],
    issues:[]
  };
}

function replayJob(){
  const profile=loadProfile();
  const built=buildGeminiJobInputFromProductProfile(profile,{execution_mode:'REPLAY',job_id:'GJOB-LIXIL-THERMOSL-AGY-TEST'});
  assert.equal(built.pass,true);
  const created=createGeminiJob(built.jobInput);
  assert.equal(created.pass,true);
  return created.job;
}

test('v2.6 transport accepts Antigravity producer identity and rejects candidate provenance mismatch',()=>{
  const job=replayJob();
  const envelope=makeEnvelope(job);
  const valid=validateGeminiTransportEnvelope(envelope,{expectedProductId:job.productId,expectedProducerSystem:ANTIGRAVITY_PRODUCER_SYSTEM});
  assert.equal(valid.pass,true);
  const invalid=structuredClone(envelope);
  invalid.candidates[0].sourceSystem='GEMINI_NOTEBOOKLM';
  const report=validateGeminiTransportEnvelope(invalid,{expectedProductId:job.productId,expectedProducerSystem:ANTIGRAVITY_PRODUCER_SYSTEM});
  assert.equal(report.pass,false);
  assert.ok(report.errors.some((row)=>row.code==='TRANSPORT_CANDIDATE_SOURCE_SYSTEM_INVALID'));
});

test('v2.6 Antigravity schema and file-scoped prompt preserve Product Profile scope and fail-closed authority',()=>{
  const job=replayJob();
  const schema=buildAntigravityTransportSchema(job);
  assert.deepEqual(schema.properties.producer.properties.system.enum,[ANTIGRAVITY_PRODUCER_SYSTEM]);
  assert.deepEqual(schema.properties.candidates.items.properties.subjectField.enum,['window_type','configuration','construction','size']);
  assert.equal(schema.properties.candidates.minItems,0);
  const prompt=buildAntigravityWorkerPrompt(job,{
    sourcePdfPath:'artifacts/source/official-source.pdf',
    sourceScopeTextPath:'artifacts/source/scope.txt',
    sourceScopeImageDir:'artifacts/source/pages',
    sourceSha256:loadProfile().source.authoritativeSha256
  });
  assert.ok(prompt.includes('Read only the supplied workspace source-scope files.'));
  assert.ok(prompt.includes('Do not browse the web.'));
  assert.ok(prompt.includes('Do not modify any Product Master'));
  assert.ok(prompt.includes(ANTIGRAVITY_PRODUCER_SYSTEM));
});

test('v2.6 Antigravity inline-evidence prompt requires no model tools or workspace file reads',()=>{
  const job=replayJob();
  const evidence='===== PDF_PAGE 8 =====\n引違い窓｜単体引違い窓\n';
  const prompt=buildAntigravityWorkerPrompt(job,{
    sourcePdfPath:'artifacts/source/official-source.pdf',
    sourceScopeTextPath:'artifacts/source/scope.txt',
    sourceScopeTextContent:evidence,
    sourceSha256:loadProfile().source.authoritativeSha256
  });
  assert.ok(prompt.includes('Do not call tools.'));
  assert.ok(prompt.includes('BEGIN_SCOPED_EVIDENCE'));
  assert.ok(prompt.includes(evidence.trim()));
  assert.ok(prompt.includes('END_SCOPED_EVIDENCE'));
  assert.ok(!prompt.includes('Primary scoped text evidence file:'));
  assert.ok(!prompt.includes('Full verified PDF workspace path'));
});

test('v2.6 Antigravity structured output can replay through Transport, Evidence Inbox and Review Queue without authoritative writes',async t=>{
  const job=replayJob();
  const root=fixtureRoot(t);
  const result=await runGeminiProductMasterBridge(job,{
    evidenceInboxDir:path.join(root,'evidence-inbox'),
    changeControlDir:path.join(root,'change-control'),
    replayResponse:JSON.stringify(makeEnvelope(job)),
    importedAt:'2026-09-05T00:01:00Z'
  });
  assert.equal(result.pass,true);
  assert.equal(result.status,'IMPORTED');
  assert.equal(result.inboxImport.status,'PERSISTED_TO_EVIDENCE_INBOX');
  assert.equal(result.reviewQueue.summary.byKind.EVIDENCE_CANDIDATE,1);
  assert.equal(result.canonicalWritePerformed,false);
  assert.equal(result.runtimeWritePerformed,false);
  assert.equal(result.productionWritePerformed,false);
});
