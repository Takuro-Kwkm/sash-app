import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRowTableUi} from '../src/catalog/runtime-master/row-table-runtime-ui.mjs';
import {rowTableRuntimeEntries,readRowTableRuntimePackage,adaptRowTableRuntimePackage} from '../src/catalog/runtime-master/row-table-runtime-package.mjs';
import {resolveRuntimeAppProduct,runtimeAppIntegrationInventory} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
const base='changes/samosa-ui-v0.7-candidate/',doc=JSON.parse(fs.readFileSync(base+'candidate.json')),prior=JSON.parse(fs.readFileSync(base+'candidate-index.json')).products[0],candidate=createRowTableUi(doc,prior),entry=rowTableRuntimeEntries.find(e=>e.id===prior.id);
const cases=JSON.parse(fs.readFileSync('contracts/production/runtime-ui-qa/samosa-r7/cases.json')).cases;
test('normal registry exposes exactly the reviewed product identity without a candidate environment',async()=>{
 assert.ok(entry);assert.equal(runtimeAppIntegrationInventory().filter(p=>p.id===prior.id).length,1);const r=await resolveRuntimeAppProduct(prior.id,{});assert.equal(r.candidateOnly,false);assert.equal(r.runtimeUiAdopted,false);assert.equal(r.orderReady,false);assert.equal(r.runtimeMaster.canonicalRuntimeReference.runtimeIndexSha256,entry.runtimeManifestSha256);
});
for(const c of cases)test('normal/candidate UI parity: '+c.id,async()=>{
 const expected=candidate.uiResolver(c.input),actual=await resolveRuntimeAppProduct(prior.id,c.input);
 assert.deepEqual(actual.fields,expected.fields);assert.deepEqual(actual.selection,expected.selection);assert.deepEqual(actual.confirmationRequests,expected.confirmationRequests);assert.deepEqual(actual.dimensionResult,expected.dimensionResult);assert.deepEqual(actual.validation,expected.validation);
});
test('all 1073 retained standard rows retain the source dimensions in the normal adapter',async()=>{
 assert.equal(doc.master.size_master.length,1073);
 for(const row of doc.master.size_master){const input={window_type:row.window_type_id,construction_module:row.construction_module,opening_class:row.opening_class,size_code:row.size_code,width:row.width,height:row.height,...(row.opening_angle?{opening_angle:row.opening_angle}:{})};const r=await resolveRuntimeAppProduct(prior.id,input);assert.equal(r.selection.width,row.width,row.size_master_id);assert.equal(r.selection.height,row.height,row.size_master_id);}
});
test('normal package carries the exact approved UI data and presentation files',()=>{
 assert.deepEqual(fs.readFileSync(entry.packageRoot+'/reviewed-ui.json'),fs.readFileSync(base+'candidate.json'));
 for(const p of ['src/ui/web/product-configuration-editor.mjs','src/ui/web/styles.css','src/catalog/runtime-master/row-table-sales-views.mjs',base+'ui-policy.json',base+'flow.json',base+'candidate.json'])assert.deepEqual(fs.readFileSync(p),execFileSync('git',['show','8ff4460977f6e67dc54e2f9c09fff8292c2369e5:'+p],{maxBuffer:8*1024*1024}));
});
test('unadopted Runtime fails closed in production and Vercel',()=>{for(const env of [{NODE_ENV:'production'},{VERCEL:'1'}])assert.throws(()=>readRowTableRuntimePackage(entry,env),/ROW_RUNTIME_ADOPTION_REQUIRED/);});
test('portable normal package works without any retained PDF/source path reads and rejects tampering/symlinks',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'row-runtime-'));try{fs.cpSync(entry.packageRoot,root,{recursive:true});const e={...entry,packageRoot:root};assert.ok(readRowTableRuntimePackage(e));assert.ok(adaptRowTableRuntimePackage(e).uiResolver(cases[0].input).fields.length);const p=path.join(root,'master.json'),b=fs.readFileSync(p);fs.writeFileSync(p,'{}');assert.throws(()=>readRowTableRuntimePackage(e),/ROW_RUNTIME_BYTES/);fs.writeFileSync(p,b);fs.unlinkSync(p);fs.symlinkSync(path.join(entry.packageRoot,'master.json'),p);assert.throws(()=>readRowTableRuntimePackage(e),/ROW_RUNTIME_PATH/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('production discovery omits the unadopted row-table product',()=>{
 const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',"import {rowTableRuntimeEntries} from './src/catalog/runtime-master/row-table-runtime-package.mjs';console.log(JSON.stringify(rowTableRuntimeEntries.map(p=>p.id)));"],{env:{...process.env,NODE_ENV:'production'},encoding:'utf8'}));assert.deepEqual(result,[]);
});
