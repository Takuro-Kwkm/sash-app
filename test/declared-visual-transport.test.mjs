import test from 'node:test';
import assert from 'node:assert/strict';
import {renderChoiceVisuals} from '../src/ui/web/choice-visuals.mjs';
import {resolveVersionedCandidateSelection} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {runtimeChoiceImage,projectRuntimeChoiceImages} from '../src/server/runtime-choice-images.mjs';
import {readPrivateRuntimeFile} from '../scripts/production/release-private-runtime-files.mjs';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

const field=src=>({key:'design',displayLabel:'デザイン',values:[{value:'ONE',displayLabel:'選択肢',visual:{src,alt:'公式画像',source_label:'公式資料',source_ref:'official:1'}}]});
test('same origin content addressed image keeps the image selector and download extension',()=>{
  const html=renderChoiceVisuals(field('/api/runtime-master/choice-image/'+'a'.repeat(64)+'.webp?productId=PRODUCT%3AONE'),['ONE']);
  assert.match(html,/data-visual-choice-key="design"/);assert.match(html,/download="ONE.webp"/);assert.match(html,/data-visual-dialog="design"/);
});
test('standalone approved embedded PNG remains supported',()=>{
  const html=renderChoiceVisuals(field('data:image/png;base64,YQ=='),['ONE']);assert.match(html,/download="ONE.png"/);
});
for(const src of ['https://external.example/picture.png','javascript:alert(1)','/api/runtime-master/choice-image/../secret?productId=ONE','/api/runtime-master/choice-image/'+'a'.repeat(64)+'.png?productId=ONE&file=secret']){
  test('reject unregistered or arbitrary image URL: '+src,()=>assert.equal(renderChoiceVisuals(field(src)),''));
}
test('explicit old-version revalidation clears deprecated value without assigning a replacement or changing the original',()=>{
  const original={child:'OLD',kept:'YES'},calls=[];
  const reader={uiResolver:(input,context)=>{calls.push(context);return {selection:{...input},manualWarnings:[]};}};
  const doc={selection_migrations:[{source:'child',value:'OLD',clearSource:true,assign:{}}],selection_migration_notice:'子扉を選び直してください。'};
  const result=resolveVersionedCandidateSelection(reader,original,doc,'OLD_VERSION','NEW_VERSION',{changedFields:['kept']});
  assert.deepEqual(result.selection,{kept:'YES'});assert.deepEqual(original,{child:'OLD',kept:'YES'});assert.deepEqual(result.configurationMigration.originalSelection,original);
  assert.deepEqual(calls,[{changedFields:['kept']},{changedFields:['kept']}]);assert.match(result.manualWarnings[0],/選び直し/);
});
test('same-version selection does not acquire a migration warning',()=>{
  const reader={uiResolver:input=>({selection:{...input}})};
  const result=resolveVersionedCandidateSelection(reader,{child:'OLD'},{selection_migrations:[{source:'child',value:'OLD',clearSource:true,assign:{}}]},'CURRENT','CURRENT');
  assert.equal(result.selection.child,'OLD');assert.equal(result.configurationMigration,undefined);
});
test('undeclared and empty migrations preserve one-pass legacy behavior for other compositions',()=>{
  for(const document of [{},{selection_migrations:[]}]){
    let calls=0;const result={selection:{context:'unchanged'}};
    const reader={uiResolver:()=>{calls++;return result;}};
    assert.equal(resolveVersionedCandidateSelection(reader,{},document,'BEFORE','CURRENT'),result);assert.equal(calls,1);
  }
});
test('unregistered product image lookup fails closed and leaves ordinary results intact',()=>{
  assert.equal(runtimeChoiceImage('UNKNOWN','a'.repeat(64)+'.png'),null);
  assert.equal(runtimeChoiceImage('UNKNOWN','../secret'),null);
  const result={productId:'UNKNOWN',fields:[field('data:image/png;base64,YQ==')]};assert.equal(projectRuntimeChoiceImages(result),result);
});
test('two private packages retain different bytes under the same relative index name',async()=>{
  const root=await mkdtemp(join(tmpdir(),'runtime-multi-source-'));
  try{
    const packages=[];
    for(const id of ['first','second']){
      const bytes=Buffer.from(id),pkg={root:'src/catalog/runtime-release-data/'+id,files:{'runtime_index.json':{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}}};packages.push(pkg);
      await mkdir(join(root,pkg.root),{recursive:true});await writeFile(join(root,pkg.root,'runtime_index.json'),bytes);
      assert.deepEqual(await readPrivateRuntimeFile(root,pkg,'runtime_index.json',2),bytes);
    }
    await writeFile(join(root,packages[1].root,'runtime_index.json'),'first');
    await assert.rejects(readPrivateRuntimeFile(root,packages[1],'runtime_index.json',2),/PRIVATE_RUNTIME_BYTES_CHANGED/);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('legacy flat source remains limited to exactly one declared package',async()=>{
  const root=await mkdtemp(join(tmpdir(),'runtime-flat-source-'));
  try{
    const bytes=Buffer.from('legacy'),pkg={root:'src/catalog/runtime-release-data/first',files:{'index.json':{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}}};
    await writeFile(join(root,'index.json'),bytes);assert.deepEqual(await readPrivateRuntimeFile(root,pkg,'index.json',1),bytes);
    await assert.rejects(readPrivateRuntimeFile(root,pkg,'index.json',2),/PRIVATE_RUNTIME_PACKAGE_SOURCE_REQUIRED/);
    await mkdir(join(root,pkg.root),{recursive:true});await symlink(join(root,'index.json'),join(root,pkg.root,'index.json'));
    await assert.rejects(readPrivateRuntimeFile(root,pkg,'index.json',1),/PRIVATE_RUNTIME_SYMLINK/);
  }finally{await rm(root,{recursive:true,force:true});}
});
