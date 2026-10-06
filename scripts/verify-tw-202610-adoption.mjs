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
for(const[path,expected]of Object.entries(proof.code_sha256))assert.equal(sha(await readFile(path)),expected,path+': exact bound implementation');
const report={status:'PASS',centralCommit:adoption.commit,exactCentralFiles:Object.keys(adoption.files).length,existingFormalFields:25,additionalConditionalFormalFields:1,baselineContractsUnchanged:true,implementationBytesBound:true};
await mkdir('artifacts/tw-202610',{recursive:true});await writeFile('artifacts/tw-202610/contract-adoption.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
