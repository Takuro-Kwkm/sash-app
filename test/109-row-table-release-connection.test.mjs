import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {execFileSync} from 'node:child_process';
const read=p=>JSON.parse(fs.readFileSync(p)),base=p=>JSON.parse(execFileSync('git',['show','8ff4460977f6e67dc54e2f9c09fff8292c2369e5:'+p],{maxBuffer:16*1024*1024}));
const pid='NATIVE_REGISTRY:LIXIL::サーモスA',profile=read('contracts/production/runtime-adoptions/samosa-r7.profile.json');
test('native adoption uses the existing private-adoption entry and mandatory readback stages',()=>{
 assert.equal(profile.native_preparer,'scripts/production/private-runtime-ui-adoption-work.py');assert.equal(profile.shared_engine,'scripts/production-work.py');assert.equal(profile.target_gate,'RUNTIME_UI_ADOPTED');assert.equal(profile.product_fact_mutation_allowed,false);assert.equal(profile.release,false);
 assert.deepEqual(profile.required_stages,['PREVIEW_IDENTITY','PACKAGE_TRANSFORM','STORAGE_READBACK','FORMAL_RUNTIME_QA','NATIVE_FORMAL_LOCATION_READBACK','RUNTIME_UI_ADOPTION']);
 const n=read('contracts/production/work-connections.v2.json').products.find(p=>p.product_id===pid),v=read('contracts/production/validator-registry.v2.json').products[pid];assert.deepEqual(n.runtime_ui_adoption_profile,v.runtime_ui_adoption_profile);
});
test('other native products and immutable release source profiles are untouched',()=>{
 for(const p of ['contracts/production/work-connections.v2.json','contracts/production/validator-registry.v2.json']){const a=base(p),b=read(p),remove=x=>Array.isArray(x)?x.filter(r=>r.product_id!==pid):Object.fromEntries(Object.entries(x).filter(([k])=>k!==pid));assert.deepEqual(remove(a.products),remove(b.products));}
 const p='contracts/production/release-profiles.v1.json';assert.deepEqual(read(p).profiles.filter(p=>p.product_id!==pid),base(p).profiles);
 for(const row of base(p).profiles){const actual=read(row.path),prior=base(row.path);if(row.path.startsWith('contracts/production/release-profiles/local/')){assert.equal(actual.shared_contract.repository,prior.shared_contract.repository);assert.equal(actual.shared_contract.ref,read('contracts/production/common-local-release.v1.json').shared_contract.ref);assert.deepEqual(actual,{...prior,shared_contract:actual.shared_contract});}else assert.deepEqual(actual,prior);}
});
test('product release declares its own QA and app canonical destination with existing Human and output gates',()=>{
 const p=read('contracts/production/release-profiles/samosa-r7.v1.json'),app=read('contracts/production/app-release.v1.json');assert.equal(p.product_scope.product_id,pid);assert.equal(p.destination.alias,app.deployment.production_url);assert.equal(p.destination.project_id,app.deployment.project_id);assert.equal(p.lifecycle.entry,'scripts/production/product-publication-lifecycle.mjs');assert.ok(p.minimum_qa.includes('output'));assert.deepEqual(p.mandatory_approvals,['Release']);assert.equal(p.product_scope.browser_script,'test/browser/row-table-business-browser-qa.mjs');assert.equal(p.runtime_adoption_required.state,'RUNTIME_UI_ADOPTED');
});
test('new publication resolves through the common local profile mechanism without Actions authority',()=>{
 const name='contracts/production/release-profiles/samosa-r7.v1.json',c=read('contracts/production/common-local-release.v1.json'),local=read(c.profiles[name]);assert.equal(local.local_qa_release_policy.schema,'COMMON_NATIVE_LOCAL_RELEASE_V1');assert.equal(local.local_qa_release_policy.actions_dispatch_authority,false);assert.equal(local.local_qa_release_policy.product_id,pid);assert.equal(local.local_qa_release_policy.retained_profile.path,name);
});

test('native preparer refuses to turn a local-candidate input into formal Runtime adoption',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'row-adoption-mode-'));try{const file=path.join(root,'input.json'),destination=path.join(root,'work');fs.writeFileSync(file,JSON.stringify({schema:'NATIVE_ROW_TABLE_RUNTIME_ADOPTION_INPUT_V1',execution_mode:'LOCAL_CANDIDATE',profile:{path:path.resolve('contracts/production/runtime-adoptions/samosa-r7.profile.json')}}));const python=process.env.ROW_TABLE_QA_PYTHON??'python3',shared=root;const result=spawnSync(python,['-B','scripts/production/prepare-row-table-runtime-adoption.py','--shared',shared,'--checkout',process.cwd(),'--contract',file,'--destination',destination],{encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/Real native adoption input required/);assert.equal(fs.existsSync(destination),false);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('Drive row-table format requires exact index dependency closure and retains composed compatibility',()=>{
 const result=spawnSync(process.env.ROW_TABLE_QA_PYTHON??'python3',['-B','scripts/production/test_row_table_runtime_readback.py'],{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stderr,/Ran 5 tests/);
});
