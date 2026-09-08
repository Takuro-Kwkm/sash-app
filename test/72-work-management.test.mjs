import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductConfigurationSnapshot } from '../src/work-management/domain.mjs';
import { BrowserStorageDocumentStore, MemoryStorage } from '../src/work-management/storage.mjs';
import { createRepositoryBundle } from '../src/work-management/repositories.mjs';
import { WorkManagementService } from '../src/work-management/service.mjs';

function setup(){
  const storage=new MemoryStorage();
  const store=new BrowserStorageDocumentStore(storage);
  let tick=0,id=0;
  const clock=()=>new Date(Date.UTC(2026,8,8,15,0,tick++));
  const repositories=createRepositoryBundle(store,{clock});
  const service=new WorkManagementService(repositories,{clock,uuid:()=>`00000000-0000-4000-8000-${String(++id).padStart(12,'0')}`});
  return {storage,store,repositories,service,clock};
}

test('work domain keeps Project 1:N Estimate 1:N Opening',async()=>{
  const {service,repositories}=setup();
  const {project,estimate}=await service.createProject({project_name:'熊本中央区 新築',request_company:'テスト工務店'});
  const estimate2=await service.createEstimate(project.project_id,{estimate_title:'変更見積',revision_no:1,supersedes_estimate_id:estimate.estimate_id});
  const one=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:'LDK'});
  const two=await service.createOpening(project.project_id,estimate2.estimate_id,{room_name:'浴室'});
  assert.equal(one.estimate_id,estimate.estimate_id);
  assert.equal(two.estimate_id,estimate2.estimate_id);
  assert.equal((await repositories.estimates.listByProject(project.project_id)).length,2);
  assert.equal((await repositories.openings.listByEstimate(estimate.estimate_id)).length,1);
});

test('versioned browser persistence restores projects and openings after a new app instance',async()=>{
  const first=setup();
  const {project,estimate}=await first.service.createProject({project_name:'復元案件'});
  await first.service.createOpening(project.project_id,estimate.estimate_id,{room_name:'洋室',opening_name:'腰窓'});
  const secondStore=new BrowserStorageDocumentStore(first.storage);
  const secondRepositories=createRepositoryBundle(secondStore);
  const secondService=new WorkManagementService(secondRepositories);
  const restored=await secondService.getEstimateDetail(project.project_id,estimate.estimate_id);
  assert.equal(restored.project.project_name,'復元案件');
  assert.equal(restored.openings[0].opening_name,'腰窓');
  assert.equal(secondStore.read().schema_version,'1.0');
});

test('Runtime snapshot freezes identity, package version and configuration',()=>{
  const result={
    source:'RUNTIME_MASTER',manufacturer:'LIXIL',series:'TW',selection:{window_type:'FIX',size:'06005'},
    fields:[{key:'window_type',displayLabel:'窓種類',values:[{value:'FIX',displayLabel:'FIX窓'}]},{key:'size',displayLabel:'サイズ',values:[{value:'06005',displayLabel:'06005 ｜ W 640 × H 570'}]}],
    validation:{errors:[],missingRequiredFields:[]},
    runtimeMaster:{packageVersion:'integrated-v0.2',sourceHash:'abc123',sourcePackageIntegrity:{manifestDriveFileId:'manifest-file-id'}},
  };
  const snapshot=createProductConfigurationSnapshot({product:{id:'SER-LIXIL-TW'},result,clock:()=>new Date('2026-09-08T15:00:00Z')});
  result.selection.size='99999';
  assert.equal(snapshot.package_version,'integrated-v0.2');
  assert.equal(snapshot.runtime_manifest_identity,'manifest-file-id');
  assert.equal(snapshot.configuration.size,'06005');
  assert.equal(snapshot.source_mode,'CANONICAL_RUNTIME');
  assert.equal(snapshot.validation_state,'VALID');
});

test('snapshot remains incomplete while a visible required field has no value',()=>{
  const snapshot=createProductConfigurationSnapshot({
    product:{id:'SER-TEST',manufacturer:'YKK AP',series:'Test',sourceType:'CATALOG',source:{id:'source-file-id'}},
    result:{selection:{},fields:[{key:'window_type',displayLabel:'窓種類',required:true,values:[]}]},
  });
  assert.equal(snapshot.validation_state,'NEEDS_REVALIDATION');
  assert.equal(snapshot.runtime_manifest_identity,'source-file-id');
  assert.equal(snapshot.source_mode,'LEGACY_CATALOG');
});

test('clearing a saved product snapshot returns the Opening to DRAFT',async()=>{
  const {service}=setup();
  const {project,estimate}=await service.createProject({project_name:'商品解除案件'});
  const opening=await service.createOpening(project.project_id,estimate.estimate_id,{status:'COMPLETE',product_configuration_snapshot:{validation_state:'VALID'}});
  const updated=await service.updateOpening(project.project_id,estimate.estimate_id,opening.opening_id,{product_configuration_snapshot:null});
  assert.equal(updated.status,'DRAFT');
  assert.equal(updated.product_configuration_snapshot,null);
});

test('duplicate receives a new immutable ID and independent snapshot',async()=>{
  const {service}=setup();
  const {project,estimate}=await service.createProject({project_name:'複製案件'});
  const original=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:'LDK',product_configuration_snapshot:{configuration:{size:'A'},validation_state:'VALID'}});
  const copy=await service.duplicateOpening(project.project_id,estimate.estimate_id,original.opening_id);
  assert.notEqual(copy.opening_id,original.opening_id);
  assert.equal(copy.opening_no,2);
  copy.product_configuration_snapshot.configuration.size='B';
  assert.equal((await service.repositories.openings.require(original.opening_id)).product_configuration_snapshot.configuration.size,'A');
});

test('reorder persists sort_order and display opening_no',async()=>{
  const {service}=setup();
  const {project,estimate}=await service.createProject({project_name:'並べ替え案件'});
  const first=await service.createOpening(project.project_id,estimate.estimate_id,{opening_name:'A'});
  const second=await service.createOpening(project.project_id,estimate.estimate_id,{opening_name:'B'});
  await service.moveOpening(project.project_id,estimate.estimate_id,second.opening_id,'up');
  const rows=(await service.getEstimateDetail(project.project_id,estimate.estimate_id)).openings;
  assert.deepEqual(rows.map((row)=>[row.opening_name,row.opening_no,row.sort_order]),[['B',1,0],['A',2,1]]);
  assert.equal(rows[1].opening_id,first.opening_id);
});

test('soft delete hides only the target Opening and supports restore',async()=>{
  const {service,repositories}=setup();
  const {project,estimate}=await service.createProject({project_name:'削除案件'});
  const first=await service.createOpening(project.project_id,estimate.estimate_id,{opening_name:'A'});
  const second=await service.createOpening(project.project_id,estimate.estimate_id,{opening_name:'B'});
  await service.softDeleteOpening(project.project_id,estimate.estimate_id,first.opening_id);
  assert.deepEqual((await repositories.openings.listByEstimate(estimate.estimate_id)).map((row)=>row.opening_id),[second.opening_id]);
  assert.ok((await repositories.openings.require(first.opening_id,{includeDeleted:true})).deleted_at);
  await service.restoreOpening(project.project_id,estimate.estimate_id,first.opening_id);
  assert.equal((await repositories.openings.listByEstimate(estimate.estimate_id)).length,2);
});

test('project isolation rejects an Estimate belonging to another Project',async()=>{
  const {service}=setup();
  const a=await service.createProject({project_name:'案件A'});
  const b=await service.createProject({project_name:'案件B'});
  await assert.rejects(()=>service.getEstimateDetail(a.project.project_id,b.estimate.estimate_id),/does not belong/);
});

test('failed persistence leaves the last saved document intact and can retry',async()=>{
  const {service,storage,store}=setup();
  const saved=await service.createProject({project_name:'保存済み'});
  const revision=store.read().revision;
  storage.failWrites=true;
  await assert.rejects(()=>service.updateProject(saved.project.project_id,{memo:'失敗する更新'}),(error)=>error.code==='STORAGE_WRITE_FAILED');
  assert.equal(store.read().revision,revision);
  assert.equal((await service.repositories.projects.require(saved.project.project_id)).memo,null);
  storage.failWrites=false;
  const retried=await service.updateProject(saved.project.project_id,{memo:'再試行成功'});
  assert.equal(retried.memo,'再試行成功');
});

test('optimistic update detects stale saves',async()=>{
  const {service}=setup();
  const {project}=await service.createProject({project_name:'競合案件'});
  const updated=await service.updateProject(project.project_id,{memo:'新しい更新'},{expectedUpdatedAt:project.updated_at});
  assert.notEqual(updated.updated_at,project.updated_at);
  await assert.rejects(()=>service.updateProject(project.project_id,{memo:'古い応答'},{expectedUpdatedAt:project.updated_at}),(error)=>error.code==='UPDATE_CONFLICT');
});
