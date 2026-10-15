import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const ROOT='contracts/tw-202610';const adoption=JSON.parse(await readFile(ROOT+'/adoption.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const[path,expected]of Object.entries(adoption.files)){
 const bytes=await readFile(join(ROOT,'central-snapshot',path));assert.equal(sha(bytes),expected.sha256,path);
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),expected.git_blob_sha,path+': central Git blob');
}
assert.equal(adoption.commit,'6efc459f231fd5bd254c36ab9b8d3c6d589da51a');assert.equal(adoption.central_post_merge_CI.status,'PASS');assert.equal(adoption.central_main_readback,'PASS');
const baseline=JSON.parse(await readFile(ROOT+'/central-snapshot/authority/products/lixil-tw/202610/baseline-25-fields.json'));
const existing=JSON.parse(await readFile('contracts/window-seven/selection-contracts.json')).fields.filter(f=>f.scope.product==='SER-LIXIL-TW');
assert.deepEqual(existing,baseline.fields);assert.equal(existing.length,25);assert.ok(existing.every(f=>f.status==='FORMAL'));
const field=JSON.parse(await readFile(ROOT+'/central-snapshot/authority/products/lixil-tw/202610/field-contract.json'));assert.equal(field.status,'FORMAL');assert.equal(field.runtime_key,'custom_height_secondary');assert.equal(field.control_type,'NUMBER');
const proof=JSON.parse(await readFile(ROOT+'/central-snapshot/authority/products/lixil-tw/202610/runtime-proof.json'));
const successor=JSON.parse(await readFile(ROOT+'/runtime-implementation-successor.json'));
assert.equal(successor.schema,'EXACT_SHARED_IMPLEMENTATION_DELTA_V2');
assert.deepEqual(Object.keys(successor.files).sort(),['src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs','src/catalog/runtime-master/runtime-app-bridge.mjs','src/work-management/domain.mjs','src/estimate-output/model.mjs'].sort());
for(const[path,expected]of Object.entries(proof.code_sha256)){
 const bytes=await readFile(path),change=successor.files[path];
 if(!change){assert.equal(sha(bytes),expected,path+': exact bound implementation');continue;}
 assert.equal(change.predecessor_sha256,expected);
 assert.equal(sha(bytes),change.sha256,path+': exact successor implementation');
 let restored=bytes.toString('utf8');
 for(const replacement of change.replacements??[]){assert.equal(restored.split(replacement.after).length,2,path+': exact single replacement');restored=restored.replace(replacement.after,replacement.before);}
 for(const removal of change.additions??[]){assert.equal(restored.split(removal).length,2,path+': exact single additive delta');restored=restored.replace(removal,'');}
 assert.equal(sha(Buffer.from(restored)),expected,path+': predecessor bytes recovered exactly');
}
const report={status:'PASS',centralCommit:adoption.commit,exactCentralFiles:Object.keys(adoption.files).length,existingFormalFields:25,additionalConditionalFormalFields:1,baselineContractsUnchanged:true,implementationBytesBound:true};
await mkdir('artifacts/tw-202610',{recursive:true});await writeFile('artifacts/tw-202610/contract-adoption.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
