import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{validateProductProfile,buildGeminiJobInputFromProductProfile}from'../src/product-master-core/product-profile.mjs';
import{createGeminiJob,runGeminiProductMasterBridge}from'../src/product-master-core/gemini-execution-bridge.mjs';

const PROFILE_PATH=path.resolve('config/product-master-profiles/lixil-thermosl.v1.json');
const loadProfile=()=>JSON.parse(fs.readFileSync(PROFILE_PATH,'utf8'));
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'thermosl-profile-repro-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function transportFor(job){
  return JSON.stringify({
    transportSchemaVersion:'1.0',
    transportType:'EVIDENCE_CANDIDATE_BATCH',
    batchId:'BATCH-LIXIL-THERMOSL-PHASE7-MOCK-001',
    generatedAt:'2026-09-04T14:30:00Z',
    producer:{system:'GEMINI_NOTEBOOKLM',mode:'SIMULATED_FIXTURE'},
    productId:job.productId,
    sourceContext:job.sourceContext,
    candidates:[{
      recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-LIXIL-THERMOSL-PHASE7-001',
      sourceSystem:'GEMINI_NOTEBOOKLM',producerMode:'SIMULATED_FIXTURE',status:'SUBMITTED',productId:job.productId,
      title:'単体引違い窓',subjectField:'window_type',claim:'Printed page 6 explicitly identifies a 单体引違い窓 section.',
      proposedStrength:'EXPLICIT',productNodeIds:[],
      source:{...job.sourceContext,printedPage:6,pdfPage:8,locatorText:'引違い窓｜単体引違い窓'}
    }],
    issues:[]
  });
}

test('v2.5 validates the LIXIL Thermos L profile without Product Master storage authority',()=>{
  const profile=loadProfile();
  const validated=validateProductProfile(profile);
  assert.equal(validated.pass,true);
  assert.equal(profile.manufacturer,'LIXIL');
  assert.equal(profile.series,'サーモスL');
  assert.equal(profile.registrySeriesKey,'LIXIL::サーモスL');
  assert.equal(profile.source.driveFileId,'1YUN-mtWYs48YBUHJk0C3vJXnhjyZFHyf');
  assert.deepEqual(profile.extraction.pageScope,[6,7,8]);
  assert.deepEqual(profile.extraction.printedPageScope,[4,5,6]);
});

test('v2.5 Product Profile cannot override Completion Policy folder or package authority',()=>{
  const profile=loadProfile();
  profile.working_folder_id='SHOULD-NOT-BE-HERE';
  profile.requiredPackageRoles=['AUTHORING_MASTER'];
  const validated=validateProductProfile(profile);
  assert.equal(validated.pass,false);
  const storageError=validated.errors.find((row)=>row.code==='PROFILE_POLICY_STORAGE_OVERRIDE_FORBIDDEN');
  assert.ok(storageError);
  assert.equal(storageError.fields.includes('profile.working_folder_id'),true);
  assert.equal(storageError.fields.includes('profile.requiredPackageRoles'),true);
});

test('v2.5 builds a cross-manufacturer Gemini Job from profile only',()=>{
  const profile=loadProfile();
  const built=buildGeminiJobInputFromProductProfile(profile,{execution_mode:'MOCK',job_id:'GJOB-LIXIL-THERMOSL-PHASE7-MOCK'});
  assert.equal(built.pass,true);
  const created=createGeminiJob(built.jobInput);
  assert.equal(created.pass,true);
  assert.equal(created.job.manufacturer,'LIXIL');
  assert.equal(created.job.series,'サーモスL');
  assert.equal(created.job.productId,'SER-LIXIL-THERMOSL');
  assert.equal(created.job.sourceContext.driveFileId,profile.source.driveFileId);
  assert.deepEqual(created.job.pageScope,[6,7,8]);
  assert.deepEqual(created.job.canonicalFieldScope,['window_type','configuration','construction','size']);
  assert.equal(created.job.executionMode,'MOCK');
});

test('v2.5 Thermos L profile MOCK round trip reaches Evidence Inbox and Review Queue without authoritative writes',async t=>{
  const profile=loadProfile();
  const built=buildGeminiJobInputFromProductProfile(profile,{execution_mode:'MOCK',job_id:'GJOB-LIXIL-THERMOSL-PHASE7-MOCK-E2E'});
  const job=createGeminiJob(built.jobInput).job;
  const root=fixtureRoot(t);
  const result=await runGeminiProductMasterBridge(job,{
    evidenceInboxDir:path.join(root,'evidence-inbox'),
    changeControlDir:path.join(root,'change-control'),
    mockResponse:transportFor(job),
    importedAt:'2026-09-04T14:31:00Z'
  });
  assert.equal(result.pass,true);
  assert.equal(result.status,'IMPORTED');
  assert.equal(result.inboxImport.status,'PERSISTED_TO_EVIDENCE_INBOX');
  assert.equal(result.reviewQueue.summary.byKind.EVIDENCE_CANDIDATE,1);
  assert.equal(result.reviewQueue.authorityBoundary.masterChangeApproval,'HUMAN_REQUIRED');
  assert.equal(result.canonicalWritePerformed,false);
  assert.equal(result.runtimeWritePerformed,false);
  assert.equal(result.productionWritePerformed,false);
});

test('v2.5 common Gemini pipeline core contains no APW430 or YKK AP product literal',()=>{
  const files=[
    'src/product-master-core/gemini-execution-bridge.mjs',
    'src/product-master-core/gemini-live-verified-runner.mjs',
    'src/product-master-core/gemini-transport.mjs',
    'src/product-master-core/evidence-inbox-store.mjs',
    'src/product-master-core/review-queue.mjs',
    'src/product-master-core/product-profile.mjs'
  ];
  for(const file of files){
    const text=fs.readFileSync(path.resolve(file),'utf8');
    assert.equal(text.includes('APW430'),false,`${file} must not hard-code APW430`);
    assert.equal(text.includes('YKK AP'),false,`${file} must not hard-code YKK AP`);
  }
});
