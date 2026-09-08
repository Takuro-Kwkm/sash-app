import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';
import{fileURLToPath}from'node:url';
import{productMasterFingerprint}from'../src/product-master-core/master-change-control.mjs';
import{loadRuntimeCandidatePackage}from'../src/product-master-core/runtime-generation-provenance-store.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(repoRoot,'scripts','build-product-master-runtime-candidate.mjs');
function tempRoot(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-cli-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);}
function seedAuthoring(root,proposalId='PMCP-RUNTIME-CLI-001'){
  const master={product:{id:'SER-RUNTIME-CLI-001'},fields:[{id:'FIELD-1'}],productNodes:[],evidence:[],dependencyRules:[],pending:[],phases:[]};
  const record={
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_AUTHORING_STAGING_PROVENANCE',status:'PASS',stage:'STAGING_CANDIDATE',proposalId,productId:'SER-RUNTIME-CLI-001',
    proposalFingerprint:'sha256:proposal',baseMasterFingerprint:'sha256:base',resultMasterFingerprint:productMasterFingerprint(master),changeSetFingerprint:'sha256:changes',
    humanApprovalProvenanceFingerprint:'sha256:human',humanApprovalReviewGateBindingFingerprint:'sha256:review',changeControlGateFingerprint:'sha256:control',reviewQueueGateSetFingerprint:'sha256:review-set',
    applied:{mode:'STAGING',at:'2026-09-05T14:10:00Z',by:'CHATGPT_CONTROL_PLANE'},validation:{status:'PASS',fingerprint:'sha256:validation'},
    authority:{authoringStagingCandidate:true,canonicalMasterWritePerformed:false,productionMasterWritePerformed:false,runtimeWritePerformed:false,registryWritePerformed:false,formalPass:false}
  };
  writeJson(path.join(root,'staging',`${proposalId}.authoring-master.json`),master);
  writeJson(path.join(root,'staging-provenance',`${proposalId}.authoring-staging.json`),record);
  return{master,record};
}

test('v2.7 Runtime candidate CLI loads governed Authoring STAGING and persists a non-formal Runtime package',t=>{
  const root=tempRoot(t);
  const proposalId='PMCP-RUNTIME-CLI-001';
  seedAuthoring(root,proposalId);
  const specPath=path.join(root,'runtime-spec.json');
  writeJson(specPath,{
    generator:{id:'CLI_TEST_GENERATOR',version:'1.0.0'},generatedAt:'2026-09-05T14:11:00Z',validation:{pass:true,checks:['CLI']},
    runtimeFiles:[
      {role:'RUNTIME_PRODUCT',name:'product.json',content:{productId:'SER-RUNTIME-CLI-001'}},
      {role:'RUNTIME_RULES',name:'rules.json',content:{rules:[]}}
    ]
  });
  const result=spawnSync(process.execPath,[script,'--proposal-id',proposalId,'--change-control-root',root,'--runtime-root',root,'--spec',specPath],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const report=JSON.parse(result.stdout);
  assert.equal(report.pass,true);
  assert.equal(report.status,'RUNTIME_STAGING_CANDIDATE_PERSISTED');
  assert.equal(report.formalPass,false);
  assert.equal(report.appIntegrationReady,false);
  assert.equal(report.canonicalRuntimeWritePerformed,false);
  const loaded=loadRuntimeCandidatePackage(proposalId,{rootDir:root});
  assert.equal(loaded.pass,true,loaded.errors?.[0]?.message);
  assert.equal(loaded.manifest.status,'STAGING_CANDIDATE');
  assert.equal(loaded.record.authority.appIntegrationReady,false);
});

test('v2.7 Runtime candidate CLI fails closed before persistence when generator validation fails',t=>{
  const root=tempRoot(t);
  const proposalId='PMCP-RUNTIME-CLI-BLOCKED';
  seedAuthoring(root,proposalId);
  const specPath=path.join(root,'runtime-spec-blocked.json');
  writeJson(specPath,{
    generator:{id:'CLI_TEST_GENERATOR',version:'1.0.0'},validation:{pass:false,reason:'Synthetic validation failure'},
    runtimeFiles:[{role:'RUNTIME_PRODUCT',name:'product.json',content:{productId:'SER-RUNTIME-CLI-001'}}]
  });
  const result=spawnSync(process.execPath,[script,'--proposal-id',proposalId,'--change-control-root',root,'--runtime-root',root,'--spec',specPath],{encoding:'utf8'});
  assert.equal(result.status,2);
  const report=JSON.parse(result.stderr);
  assert.equal(report.pass,false);
  assert.equal(report.status,'RUNTIME_GENERATION_BLOCKED');
  assert.ok(report.errors.some((row)=>row.code==='RUNTIME_GENERATION_POST_VALIDATION_FAILED'));
  assert.equal(fs.existsSync(path.join(root,'runtime-candidates',proposalId)),false);
  assert.equal(fs.existsSync(path.join(root,'runtime-provenance',`${proposalId}.runtime-generation.json`)),false);
});
