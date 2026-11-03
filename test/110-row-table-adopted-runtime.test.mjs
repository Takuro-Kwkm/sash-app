import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {rowTableRuntimeEntries,readRowTableRuntimePackage} from '../src/catalog/runtime-master/row-table-runtime-package.mjs';
import {resolveRuntimeAppProduct} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
const entry=rowTableRuntimeEntries.find(e=>e.id==='NATIVE_REGISTRY:LIXIL::サーモスA');
const cases=JSON.parse(fs.readFileSync('contracts/production/runtime-ui-qa/samosa-r7/cases.json')).cases;
test('registered production descriptor pins the completed native Main and full-byte formal Drive proof',()=>{
 assert.ok(entry.runtimeAdoption);for(const env of [{NODE_ENV:'production'},{VERCEL:'1'}]){const p=readRowTableRuntimePackage(entry,env);assert.equal(p.admission.work_id,'SAMOSA_NATIVE_RUNTIME_ADOPTION_R9_20261103');const main=JSON.parse(fs.readFileSync(path.join(entry.packageRoot,p.admission.main_readback.path))),formal=JSON.parse(fs.readFileSync(path.join(entry.packageRoot,p.admission.formal_readback.path)));assert.equal(main.receipt.merge_sha,'7f0f72f6b87f83e936657087bbc9503486a374a8');assert.equal(main.files_verified,1613);assert.equal(formal.actual_readback.folder_id,'10eHobQhx343aUkUeOHmV8KwD7K5OktuW');assert.equal(formal.actual_readback.full_bytes_verified,true);assert.equal(formal.actual_readback.package.files.length,8);}
});
for(const c of cases)test('adopted normal application lifecycle and estimate handoff: '+c.id,async()=>{const r=await resolveRuntimeAppProduct(entry.id,c.input);assert.equal(r.runtimeUiAdopted,true);assert.equal(r.formalAdoption,true);assert.equal(r.orderReady,false);assert.equal(r.automaticOrderability,false);assert.equal(r.candidateOnly,false);assert.ok(r.fields.length);});
test('receipt and nested native proofs stay protected when a cached production descriptor is reused',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'row-proof-tamper-'));try{fs.cpSync(entry.packageRoot,root,{recursive:true});const e={...entry,packageRoot:root};assert.ok(readRowTableRuntimePackage(e,{NODE_ENV:'production'}));const file=path.join(root,'adoption/formal-readback.json'),before=fs.readFileSync(file);fs.writeFileSync(file,'{}');assert.throws(()=>readRowTableRuntimePackage(e,{NODE_ENV:'production'}),/ROW_RUNTIME_BYTES/);fs.writeFileSync(file,before);fs.unlinkSync(path.join(root,'adoption/runtime-adoption.json'));assert.throws(()=>readRowTableRuntimePackage(e,{NODE_ENV:'production'}),/ROW_RUNTIME_ADOPTION_REQUIRED/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('deployment staging preserves pre-existing native Runtime files and removes only owned temporary bytes',async()=>{
 const {stagePrivateRuntimeFiles}=await import('../scripts/production/release-private-runtime-files.mjs');const root=fs.mkdtempSync(path.join(os.tmpdir(),'release-private-files-'));try{const base='src/catalog/runtime-release-data/retained/',old=base+'old.json',fresh=base+'new.json';fs.mkdirSync(path.dirname(path.join(root,old)),{recursive:true});fs.writeFileSync(path.join(root,old),'retained');const staged=await stagePrivateRuntimeFiles(root,[{file:old,data:Buffer.from('retained')},{file:fresh,data:Buffer.from('new')}]);assert.equal(staged.created.length,1);await staged.cleanup();assert.equal(fs.readFileSync(path.join(root,old),'utf8'),'retained');assert.equal(fs.existsSync(path.join(root,fresh)),false);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('deployment staging rejects changed existing bytes before creating any new file',async()=>{
 const {stagePrivateRuntimeFiles}=await import('../scripts/production/release-private-runtime-files.mjs');const root=fs.mkdtempSync(path.join(os.tmpdir(),'release-private-mismatch-'));try{const base='src/catalog/runtime-release-data/retained/';fs.mkdirSync(path.join(root,base),{recursive:true});fs.writeFileSync(path.join(root,base,'old.json'),'different');await assert.rejects(stagePrivateRuntimeFiles(root,[{file:base+'new.json',data:Buffer.from('new')},{file:base+'old.json',data:Buffer.from('expected')}]),/PRIVATE_RUNTIME_EXISTING_BYTES_CHANGED/);assert.equal(fs.existsSync(path.join(root,base,'new.json')),false);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native publication QA identity matches the registered product and release scope',()=>{
 const file='contracts/production/release-profiles/samosa-r9-adopted.v1.json',p=JSON.parse(fs.readFileSync(file));
 const claims=p.publication_policy.native_qa_bindings.runtime_ui_product.claims;
 for(const key of ['product_id','scope'])assert.equal(claims.find(row=>row.pointer.length===1&&row.pointer[0]===key).value,p.product_scope[key],key);
 const row=JSON.parse(fs.readFileSync('contracts/production/release-profiles.v1.json')).profiles.find(row=>row.path===file);
 assert.equal(row.scope,p.product_scope.scope);assert.equal(row.product_id,p.product_scope.product_id);
});
