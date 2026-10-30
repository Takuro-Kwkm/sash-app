import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function validatePrivateRuntimeUiPackage(indexPath,candidateIndexPath,profilePath){
 const read=p=>JSON.parse(readFileSync(p)),index=read(indexPath),base=dirname(resolve(indexPath)),candidateRoot=dirname(resolve(candidateIndexPath)),candidate=read(candidateIndexPath),profile=read(profilePath);
 assert.equal(index.schema,'FORMAL_COMPOSED_RUNTIME_INDEX_V1');assert.equal(index.runtimeOnlyAdoption.schema,'HUMAN_ADOPTED_RUNTIME_ONLY_V1');assert.equal(index.runtimeOnlyAdoption.productMasterMutations,0);assert.equal(index.runtimeOnlyAdoption.release,false);
 const owned=(root,name)=>{assert.ok(!isAbsolute(name)&&!name.split('/').includes('..'));const p=resolve(root,name);assert.ok(!relative(root,p).startsWith('..')&&!lstatSync(p).isSymbolicLink());return p;};
 for(const [name,digest]of Object.entries(profile.candidate_files))assert.equal(hash(readFileSync(owned(candidateRoot,name))),digest,name);
 assert.equal(hash(readFileSync(candidateIndexPath)),profile.candidate.index_sha256);
 for(const entry of index.products){
  const prior=candidate.products.find(x=>x.manufacturer===entry.manufacturer&&x.series===entry.series);assert.ok(prior);assert.equal(entry.id,profile.formal_product_id);assert.equal(entry.candidate,false);
  const bytes=readFileSync(owned(candidateRoot,prior.path));assert.equal(hash(bytes),profile.candidate.module_sha256);
  const transformed=JSON.parse(bytes.toString().replaceAll(prior.id,entry.id));Object.assign(transformed,{schema:'FORMAL_COMPOSED_PRODUCT_MODULE_V1',formal_adoption:true,source_adoption:false});
  const finalBytes=readFileSync(owned(base,entry.path));assert.equal(hash(finalBytes),entry.sha256);assert.deepEqual(JSON.parse(finalBytes),transformed);assert.deepEqual(entry.uiFlowContract,prior.uiFlowContract);
  const master=read(owned(base,'sources/PRODUCT_MASTER.json'));assert.equal(hash(readFileSync(owned(base,'sources/PRODUCT_MASTER.json'))),profile.formal_master.sha256);assert.equal(master.gaps.length,profile.formal_master.unresolved_count);assert.deepEqual(transformed.pricing,{price:null,bom:null,set_code:null});
 }
 const refs=index.runtimeOnlyAdoption;for(const r of [refs.candidateIndex,refs.authorization,refs.review,refs.humanSource])assert.equal(hash(readFileSync(owned(base,r.path))),r.sha256);
 const auth=read(owned(base,refs.authorization.path)),human=read(owned(base,refs.humanSource.path)),review=read(owned(base,refs.review.path));assert.equal(auth.decision,'APPROVED');assert.equal(auth.authorization_kind,'EXPLICIT_USER_SCOPE');assert.equal(auth.decision_ref,human.reference);assert.equal(human.ai_decision,false);assert.equal(auth.imported_user_statement,human.statement);assert.equal(review.authorization_scope.expected.module_sha256,profile.candidate.module_sha256);assert.equal(review.authorization_scope.expected.index_sha256,profile.candidate.index_sha256);
 return {status:'PASS',gate:'PRIVATE_RUNTIME_PACKAGE_TRANSFORM_VALID',formal_product_id:profile.formal_product_id,controlled_unresolved:profile.formal_master.unresolved_count,product_master_mutations:0,adoption_executed:false,release:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(validatePrivateRuntimeUiPackage(...process.argv.slice(2))));
