import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';
import{fileURLToPath}from'node:url';
import{productMasterFingerprint}from'../src/product-master-core/master-change-control.mjs';
import{persistAuthoringStagingPackage}from'../src/product-master-core/authoring-staging-provenance-store.mjs';
import{buildRuntimeGenerationProvenance}from'../src/product-master-core/runtime-generation-provenance.mjs';
import{persistRuntimeCandidatePackage}from'../src/product-master-core/runtime-generation-provenance-store.mjs';
import{loadWorkingSavepointHandoff}from'../src/product-master-core/working-savepoint-handoff-store.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(repoRoot,'scripts','build-product-master-working-savepoint-handoff.mjs');
function tempRoot(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'savepoint-cli-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function seed(root){
  const proposalId='PMCP-HANDOFF-CLI-001';
  const productId='SER-HANDOFF-CLI-001';
  const authoringMaster={product:{id:productId},fields:[{id:'FIELD-1'}],productNodes:[],evidence:[],dependencyRules:[],pending:[],phases:[]};
  const authoringRecord={
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_AUTHORING_STAGING_PROVENANCE',status:'PASS',stage:'STAGING_CANDIDATE',proposalId,productId,
    proposalFingerprint:'sha256:proposal',baseMasterFingerprint:'sha256:base',resultMasterFingerprint:productMasterFingerprint(authoringMaster),changeSetFingerprint:'sha256:changes',humanApprovalProvenanceFingerprint:'sha256:human',humanApprovalReviewGateBindingFingerprint:'sha256:review',changeControlGateFingerprint:'sha256:control',reviewQueueGateSetFingerprint:'sha256:review-set',applied:{mode:'STAGING',at:'2026-09-05T14:30:00Z',by:'CHATGPT_CONTROL_PLANE'},validation:{status:'PASS',fingerprint:'sha256:validation'},authority:{authoringStagingCandidate:true,canonicalMasterWritePerformed:false,productionMasterWritePerformed:false,runtimeWritePerformed:false,registryWritePerformed:false,formalPass:false}
  };
  const authoringPersist=persistAuthoringStagingPackage({record:authoringRecord,appliedMaster:authoringMaster},{rootDir:root});
  assert.equal(authoringPersist.pass,true,authoringPersist.errors?.[0]?.message);
  const generator={id:'HANDOFF_CLI_GENERATOR',version:'1.0.0'};
  const runtime=buildRuntimeGenerationProvenance({authoringMaster,authoringStagingProvenance:authoringRecord,runtimeFiles:[{role:'RUNTIME_PRODUCT',name:'product.json',content:{productId}}],generator,generatedAt:'2026-09-05T14:31:00Z'});
  assert.equal(runtime.pass,true,runtime.errors?.[0]?.message);
  const runtimePersist=persistRuntimeCandidatePackage({record:runtime.record,manifest:runtime.manifest,files:runtime.files,authoringMaster,authoringStagingProvenance:authoringRecord,generator},{rootDir:root});
  assert.equal(runtimePersist.pass,true,runtimePersist.errors?.[0]?.message);
  return{proposalId,productId};
}

test('v2.7 Working Savepoint handoff CLI emits immutable handoff while keeping Product Master gates closed',t=>{
  const root=tempRoot(t);
  const seeded=seed(root);
  const result=spawnSync(process.execPath,[script,'--proposal-id',seeded.proposalId,'--root',root,'--manufacturer','TEST_MAKER','--series','TEST_SERIES'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const report=JSON.parse(result.stdout);
  assert.equal(report.pass,true);
  assert.equal(report.status,'WORKING_SAVEPOINT_HANDOFF_PERSISTED');
  assert.equal(report.WORKING_SAVEPOINT_GATE,'NOT_EVALUATED');
  assert.equal(report.NEXT_PHASE_GATE,'CLOSED');
  assert.equal(report.driveWritePerformed,false);
  assert.equal(report.formalPass,false);
  assert.equal(report.appIntegrationReady,false);
  assert.equal(report.requiredNextAction,'EXECUTE_PRODUCT_MASTER_WORKING_SAVEPOINT_UNDER_ACTIVE_STARTUP_GATE');
  const loaded=loadWorkingSavepointHandoff(seeded.proposalId,{rootDir:root});
  assert.equal(loaded.pass,true,loaded.errors?.[0]?.message);
  assert.equal(loaded.record.manufacturer,'TEST_MAKER');
  assert.equal(loaded.record.series,'TEST_SERIES');
});

test('v2.7 Working Savepoint handoff CLI fails closed when Runtime candidate is missing',t=>{
  const root=tempRoot(t);
  const proposalId='PMCP-HANDOFF-CLI-MISSING';
  const productId='SER-HANDOFF-CLI-MISSING';
  const master={product:{id:productId},fields:[],productNodes:[],evidence:[],dependencyRules:[],pending:[],phases:[]};
  const record={
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_AUTHORING_STAGING_PROVENANCE',status:'PASS',stage:'STAGING_CANDIDATE',proposalId,productId,proposalFingerprint:'sha256:proposal',baseMasterFingerprint:'sha256:base',resultMasterFingerprint:productMasterFingerprint(master),changeSetFingerprint:'sha256:changes',humanApprovalProvenanceFingerprint:'sha256:human',humanApprovalReviewGateBindingFingerprint:'sha256:review',changeControlGateFingerprint:'sha256:control',reviewQueueGateSetFingerprint:'sha256:review-set',applied:{mode:'STAGING',at:'2026-09-05T14:30:00Z',by:'CHATGPT_CONTROL_PLANE'},validation:{status:'PASS',fingerprint:'sha256:validation'},authority:{authoringStagingCandidate:true,canonicalMasterWritePerformed:false,productionMasterWritePerformed:false,runtimeWritePerformed:false,registryWritePerformed:false,formalPass:false}
  };
  const persisted=persistAuthoringStagingPackage({record,appliedMaster:master},{rootDir:root});
  assert.equal(persisted.pass,true);
  const result=spawnSync(process.execPath,[script,'--proposal-id',proposalId,'--root',root],{encoding:'utf8'});
  assert.equal(result.status,2);
  const report=JSON.parse(result.stderr);
  assert.equal(report.pass,false);
  assert.equal(report.status,'RUNTIME_CANDIDATE_GATE_BLOCKED');
  assert.equal(fs.existsSync(path.join(root,'savepoint-handoff',`${proposalId}.working-package-handoff.json`)),false);
});
