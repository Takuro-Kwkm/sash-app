import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{productMasterFingerprint,stableJson,sha256}from'../src/product-master-core/master-change-control.mjs';
import{buildRuntimeGenerationProvenance,validateRuntimeGenerationProvenance}from'../src/product-master-core/runtime-generation-provenance.mjs';
import{persistRuntimeCandidatePackage,loadRuntimeCandidatePackage}from'../src/product-master-core/runtime-generation-provenance-store.mjs';

const stableHash=(value)=>`sha256:${sha256(stableJson(value))}`;
const tempRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-candidate-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function fixture(){
  const authoringMaster={
    product:{id:'SER-RUNTIME-001'},
    fields:[{id:'FIELD-RUNTIME-001',name:'window_type'}],
    productNodes:[{id:'NODE-RUNTIME-001'}],evidence:[],dependencyRules:[],pending:[],phases:[]
  };
  const authoringStagingProvenance={
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_AUTHORING_STAGING_PROVENANCE',status:'PASS',stage:'STAGING_CANDIDATE',
    proposalId:'PMCP-RUNTIME-001',productId:'SER-RUNTIME-001',proposalFingerprint:'sha256:proposal',baseMasterFingerprint:'sha256:base',
    resultMasterFingerprint:productMasterFingerprint(authoringMaster),changeSetFingerprint:'sha256:change',
    humanApprovalProvenanceFingerprint:'sha256:human',humanApprovalReviewGateBindingFingerprint:'sha256:review',changeControlGateFingerprint:'sha256:change-control',reviewQueueGateSetFingerprint:'sha256:review-set',
    applied:{mode:'STAGING',at:'2026-09-05T14:00:00Z',by:'CHATGPT_CONTROL_PLANE'},validation:{status:'PASS',fingerprint:'sha256:validation'},
    authority:{authoringStagingCandidate:true,canonicalMasterWritePerformed:false,productionMasterWritePerformed:false,runtimeWritePerformed:false,registryWritePerformed:false,formalPass:false}
  };
  const runtimeFiles=[
    {role:'RUNTIME_PRODUCT',name:'runtime_product.json',content:{productId:'SER-RUNTIME-001',nodes:['NODE-RUNTIME-001']}},
    {role:'RUNTIME_DEPENDENCY',name:'runtime_dependency.json',content:{productId:'SER-RUNTIME-001',rules:[]}}
  ];
  const generator={id:'GENERIC_PRODUCT_MASTER_RUNTIME_GENERATOR',version:'1.1.0'};
  const validation={pass:true,checks:['IDENTITY','JSON_SERIALIZABLE']};
  return{authoringMaster,authoringStagingProvenance,runtimeFiles,generator,validation};
}

test('v2.7 Runtime Generation Provenance binds Authoring STAGING, manifest, files and generator',()=>{
  const f=fixture();
  const built=buildRuntimeGenerationProvenance({...f,generatedAt:'2026-09-05T14:01:00Z'});
  assert.equal(built.pass,true,built.errors?.[0]?.message);
  assert.equal(built.manifest.recordType,'PRODUCT_MASTER_RUNTIME_CANDIDATE_MANIFEST');
  assert.equal(built.manifest.status,'STAGING_CANDIDATE');
  assert.equal(built.record.recordType,'PRODUCT_MASTER_RUNTIME_GENERATION_PROVENANCE');
  assert.equal(built.record.stage,'RUNTIME_STAGING_CANDIDATE');
  assert.equal(built.record.authoringMasterFingerprint,productMasterFingerprint(f.authoringMaster));
  assert.equal(built.record.authoringStagingProvenanceFingerprint,stableHash(f.authoringStagingProvenance));
  assert.equal(built.record.runtimeFiles.length,2);
  assert.ok(built.record.runtimeManifestFingerprint.startsWith('sha256:'));
  assert.ok(built.record.runtimeFileSetFingerprint.startsWith('sha256:'));
  assert.deepEqual(built.record.authority,{
    runtimeCandidateGenerated:true,canonicalRuntimeWritePerformed:false,productionMasterWritePerformed:false,
    registryWritePerformed:false,formalPass:false,appIntegrationReady:false
  });
});

test('v2.7 Runtime generation fails closed on Authoring drift, empty files and duplicate roles or names',()=>{
  const f=fixture();
  const drifted=structuredClone(f.authoringMaster);
  drifted.fields.push({id:'FIELD-DRIFT'});
  const drift=buildRuntimeGenerationProvenance({...f,authoringMaster:drifted});
  assert.equal(drift.pass,false);
  assert.ok(drift.errors.some((row)=>row.code==='RUNTIME_GENERATION_AUTHORING_FINGERPRINT_MISMATCH'));

  const empty=buildRuntimeGenerationProvenance({...f,runtimeFiles:[]});
  assert.equal(empty.pass,false);
  assert.ok(empty.errors.some((row)=>row.code==='RUNTIME_GENERATION_FILES_REQUIRED'));

  const duplicateRole=buildRuntimeGenerationProvenance({...f,runtimeFiles:[...f.runtimeFiles,{role:'RUNTIME_PRODUCT',name:'other.json',content:{}}]});
  assert.equal(duplicateRole.pass,false);
  assert.ok(duplicateRole.errors.some((row)=>row.code==='RUNTIME_GENERATION_DUPLICATE_ROLE'));

  const duplicateName=buildRuntimeGenerationProvenance({...f,runtimeFiles:[...f.runtimeFiles,{role:'RUNTIME_OTHER',name:'runtime_product.json',content:{}}]});
  assert.equal(duplicateName.pass,false);
  assert.ok(duplicateName.errors.some((row)=>row.code==='RUNTIME_GENERATION_DUPLICATE_NAME'));
});

test('v2.7 Runtime provenance rejects manifest, file and authority drift',()=>{
  const f=fixture();
  const built=buildRuntimeGenerationProvenance({...f,generatedAt:'2026-09-05T14:01:00Z'});
  assert.equal(built.pass,true);

  const changedManifest=structuredClone(built.manifest);
  changedManifest.generator.version='9.9.9';
  const manifestCheck=validateRuntimeGenerationProvenance(built.record,{manifest:changedManifest,runtimeFiles:f.runtimeFiles,generator:f.generator});
  assert.equal(manifestCheck.pass,false);
  assert.ok(manifestCheck.errors.some((row)=>row.code==='RUNTIME_GENERATION_MANIFEST_FINGERPRINT_MISMATCH'));

  const changedFiles=structuredClone(f.runtimeFiles);
  changedFiles[0].content.nodes.push('NODE-TAMPERED');
  const fileCheck=validateRuntimeGenerationProvenance(built.record,{manifest:built.manifest,runtimeFiles:changedFiles,generator:f.generator});
  assert.equal(fileCheck.pass,false);
  assert.ok(fileCheck.errors.some((row)=>['RUNTIME_GENERATION_FILE_SET_FINGERPRINT_MISMATCH','RUNTIME_GENERATION_MANIFEST_FILE_SET_MISMATCH'].includes(row.code)));

  const openedAuthority=structuredClone(built.record);
  openedAuthority.authority.appIntegrationReady=true;
  openedAuthority.authority.formalPass=true;
  const authorityCheck=validateRuntimeGenerationProvenance(openedAuthority);
  assert.equal(authorityCheck.pass,false);
  assert.ok(authorityCheck.errors.some((row)=>row.code==='RUNTIME_GENERATION_AUTHORITY_INVALID'));
});

test('v2.7 Runtime candidate package persists manifest, Runtime JSON files and provenance append-only',t=>{
  const root=tempRoot(t);
  const f=fixture();
  const built=buildRuntimeGenerationProvenance({...f,generatedAt:'2026-09-05T14:01:00Z'});
  assert.equal(built.pass,true);
  const persisted=persistRuntimeCandidatePackage({record:built.record,manifest:built.manifest,files:built.files,authoringMaster:f.authoringMaster,authoringStagingProvenance:f.authoringStagingProvenance,generator:f.generator,validation:f.validation},{rootDir:root});
  assert.equal(persisted.pass,true,persisted.errors?.[0]?.message);
  assert.ok(persisted.manifestPath.endsWith('runtime-candidates/PMCP-RUNTIME-001/runtime_manifest.json'));
  assert.ok(persisted.provenancePath.endsWith('runtime-provenance/PMCP-RUNTIME-001.runtime-generation.json'));
  const loaded=loadRuntimeCandidatePackage('PMCP-RUNTIME-001',{rootDir:root});
  assert.equal(loaded.pass,true,loaded.errors?.[0]?.message);
  assert.deepEqual(loaded.record,built.record);
  assert.deepEqual(loaded.manifest,built.manifest);
  assert.equal(loaded.files.length,2);

  const duplicate=persistRuntimeCandidatePackage({record:built.record,manifest:built.manifest,files:built.files,authoringMaster:f.authoringMaster,authoringStagingProvenance:f.authoringStagingProvenance,generator:f.generator,validation:f.validation},{rootDir:root});
  assert.equal(duplicate.pass,false);
  assert.ok(duplicate.errors.some((row)=>row.code==='RUNTIME_CANDIDATE_PACKAGE_ALREADY_EXISTS'));
});

test('v2.7 stored Runtime candidate detects Runtime file, manifest and unexpected-file tampering',t=>{
  const cases=['runtime','manifest','extra'];
  for(const kind of cases){
    const root=path.join(tempRoot(t),kind);
    const f=fixture();
    const built=buildRuntimeGenerationProvenance({...f,generatedAt:'2026-09-05T14:01:00Z'});
    const persisted=persistRuntimeCandidatePackage({record:built.record,manifest:built.manifest,files:built.files,authoringMaster:f.authoringMaster,authoringStagingProvenance:f.authoringStagingProvenance,generator:f.generator,validation:f.validation},{rootDir:root});
    assert.equal(persisted.pass,true);
    if(kind==='runtime'){
      const target=path.join(persisted.runtimeDir,'runtime_product.json');
      const content=JSON.parse(fs.readFileSync(target,'utf8'));
      content.nodes.push('NODE-STORED-TAMPER');
      fs.writeFileSync(target,`${JSON.stringify(content,null,2)}\n`);
    }
    if(kind==='manifest'){
      const content=JSON.parse(fs.readFileSync(persisted.manifestPath,'utf8'));
      content.generator.version='2.0.0';
      fs.writeFileSync(persisted.manifestPath,`${JSON.stringify(content,null,2)}\n`);
    }
    if(kind==='extra')fs.writeFileSync(path.join(persisted.runtimeDir,'undeclared.json'),'{}\n');
    const loaded=loadRuntimeCandidatePackage('PMCP-RUNTIME-001',{rootDir:root});
    assert.equal(loaded.pass,false,kind);
    if(kind==='runtime')assert.ok(loaded.errors.some((row)=>['RUNTIME_GENERATION_FILE_SET_FINGERPRINT_MISMATCH','RUNTIME_GENERATION_MANIFEST_FILE_SET_MISMATCH'].includes(row.code)));
    if(kind==='manifest')assert.ok(loaded.errors.some((row)=>row.code==='RUNTIME_GENERATION_MANIFEST_FINGERPRINT_MISMATCH'));
    if(kind==='extra')assert.ok(loaded.errors.some((row)=>row.code==='RUNTIME_CANDIDATE_FILE_SET_MISMATCH'));
  }
});
