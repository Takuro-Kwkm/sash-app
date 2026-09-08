import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{productMasterFingerprint}from'../src/product-master-core/master-change-control.mjs';
import{buildRuntimeGenerationProvenance}from'../src/product-master-core/runtime-generation-provenance.mjs';
import{buildWorkingSavepointHandoff,validateWorkingSavepointHandoff}from'../src/product-master-core/working-savepoint-handoff.mjs';
import{persistWorkingSavepointHandoff,loadWorkingSavepointHandoff}from'../src/product-master-core/working-savepoint-handoff-store.mjs';

function fixture(){
  const authoringMaster={product:{id:'SER-HANDOFF-001'},fields:[{id:'FIELD-HANDOFF'}],productNodes:[],evidence:[],dependencyRules:[],pending:[],phases:[]};
  const authoringStagingProvenance={
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_AUTHORING_STAGING_PROVENANCE',status:'PASS',stage:'STAGING_CANDIDATE',proposalId:'PMCP-HANDOFF-001',productId:'SER-HANDOFF-001',proposalFingerprint:'sha256:proposal',baseMasterFingerprint:'sha256:base',resultMasterFingerprint:productMasterFingerprint(authoringMaster),changeSetFingerprint:'sha256:changes',humanApprovalProvenanceFingerprint:'sha256:human',humanApprovalReviewGateBindingFingerprint:'sha256:review',changeControlGateFingerprint:'sha256:change-control',reviewQueueGateSetFingerprint:'sha256:review-set',applied:{mode:'STAGING',at:'2026-09-05T14:20:00Z',by:'CHATGPT_CONTROL_PLANE'},validation:{status:'PASS',fingerprint:'sha256:validation'},authority:{authoringStagingCandidate:true,canonicalMasterWritePerformed:false,productionMasterWritePerformed:false,runtimeWritePerformed:false,registryWritePerformed:false,formalPass:false}
  };
  const runtimeFiles=[{role:'RUNTIME_PRODUCT',name:'product.json',content:{productId:'SER-HANDOFF-001'}}];
  const generator={id:'HANDOFF_TEST_GENERATOR',version:'1.0.0'};
  const built=buildRuntimeGenerationProvenance({authoringMaster,authoringStagingProvenance,runtimeFiles,generator,generatedAt:'2026-09-05T14:21:00Z'});
  assert.equal(built.pass,true,built.errors?.[0]?.message);
  return{authoringMaster,authoringStagingProvenance,runtimeManifest:built.manifest,runtimeFiles,builtRuntimeFiles:built.files,runtimeGenerationProvenance:built.record,generator};
}
function tempRoot(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'savepoint-handoff-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}

test('v2.7 Working Savepoint handoff binds exact Authoring and Runtime candidate package without evaluating Drive gate',()=>{
  const f=fixture();
  const built=buildWorkingSavepointHandoff({...f,context:{manufacturer:'TEST_MAKER',series:'TEST_SERIES'}});
  assert.equal(built.pass,true,built.errors?.[0]?.message);
  assert.equal(built.record.recordType,'PRODUCT_MASTER_WORKING_SAVEPOINT_HANDOFF');
  assert.equal(built.record.status,'PASS');
  assert.equal(built.record.stage,'CONTROL_PLANE_HANDOFF');
  assert.equal(built.record.manufacturer,'TEST_MAKER');
  assert.equal(built.record.series,'TEST_SERIES');
  assert.equal(built.record.authoring.masterFingerprint,productMasterFingerprint(f.authoringMaster));
  assert.equal(built.record.runtime.manifestFingerprint,f.runtimeGenerationProvenance.runtimeManifestFingerprint);
  assert.equal(built.record.requiredNextAction,'EXECUTE_PRODUCT_MASTER_WORKING_SAVEPOINT_UNDER_ACTIVE_STARTUP_GATE');
  assert.deepEqual(built.record.authority,{
    driveWritePerformed:false,workingSavepointGate:'NOT_EVALUATED',nextPhaseGate:'CLOSED',canonicalMasterWritePerformed:false,
    canonicalRuntimeWritePerformed:false,registryWritePerformed:false,formalPass:false,appIntegrationReady:false
  });
});

test('v2.7 Working Savepoint handoff fails closed on Authoring or Runtime drift',()=>{
  const f=fixture();
  const built=buildWorkingSavepointHandoff(f);
  assert.equal(built.pass,true);

  const driftedMaster=structuredClone(f.authoringMaster);
  driftedMaster.fields.push({id:'FIELD-TAMPER'});
  const authoringCheck=validateWorkingSavepointHandoff(built.record,{...f,authoringMaster:driftedMaster});
  assert.equal(authoringCheck.pass,false);
  assert.ok(authoringCheck.errors.some((row)=>['SAVEPOINT_HANDOFF_AUTHORING_MASTER_STALE','SAVEPOINT_HANDOFF_RUNTIME_GENERATION_AUTHORING_MASTER_STALE'].includes(row.code)));

  const driftedManifest=structuredClone(f.runtimeManifest);
  driftedManifest.generator.version='9.9.9';
  const runtimeCheck=validateWorkingSavepointHandoff(built.record,{...f,runtimeManifest:driftedManifest});
  assert.equal(runtimeCheck.pass,false);
  assert.ok(runtimeCheck.errors.some((row)=>row.code.includes('MANIFEST_FINGERPRINT_MISMATCH')));
});

test('v2.7 Working Savepoint handoff cannot claim savepoint, next-phase, formal or app authority',()=>{
  const f=fixture();
  const built=buildWorkingSavepointHandoff(f);
  const tampered=structuredClone(built.record);
  tampered.authority.driveWritePerformed=true;
  tampered.authority.workingSavepointGate='PASS';
  tampered.authority.nextPhaseGate='OPEN';
  tampered.authority.formalPass=true;
  tampered.authority.appIntegrationReady=true;
  const checked=validateWorkingSavepointHandoff(tampered);
  assert.equal(checked.pass,false);
  assert.ok(checked.errors.some((row)=>row.code==='SAVEPOINT_HANDOFF_AUTHORITY_INVALID'));
});

test('v2.7 Working Savepoint handoff persists append-only and detects stored record tampering',t=>{
  const root=tempRoot(t);
  const f=fixture();
  const built=buildWorkingSavepointHandoff(f);
  const persisted=persistWorkingSavepointHandoff(built.record,f,{rootDir:root});
  assert.equal(persisted.pass,true,persisted.errors?.[0]?.message);
  assert.ok(persisted.filePath.endsWith('savepoint-handoff/PMCP-HANDOFF-001.working-package-handoff.json'));
  const loaded=loadWorkingSavepointHandoff('PMCP-HANDOFF-001',{rootDir:root});
  assert.equal(loaded.pass,true,loaded.errors?.[0]?.message);
  assert.deepEqual(loaded.record,built.record);

  const duplicate=persistWorkingSavepointHandoff(built.record,f,{rootDir:root});
  assert.equal(duplicate.pass,false);
  assert.ok(duplicate.errors.some((row)=>row.code==='SAVEPOINT_HANDOFF_ALREADY_EXISTS'));

  const tampered=JSON.parse(fs.readFileSync(persisted.filePath,'utf8'));
  tampered.runtime.fileSetFingerprint='sha256:tampered';
  fs.writeFileSync(persisted.filePath,`${JSON.stringify(tampered,null,2)}\n`);
  const invalid=loadWorkingSavepointHandoff('PMCP-HANDOFF-001',{rootDir:root});
  assert.equal(invalid.pass,false);
  assert.ok(invalid.errors.some((row)=>row.code==='SAVEPOINT_HANDOFF_PACKAGE_FINGERPRINT_MISMATCH'));
});
