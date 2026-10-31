import {readFileSync,lstatSync,existsSync} from 'node:fs';
import {resolve,dirname,isAbsolute,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const digest=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};
function local(root,name){
 if(typeof name!=='string'||!name||isAbsolute(name)||name.includes('\\')||name.split('/').includes('..'))fail('RELEASE_RUNTIME_PATH');
 const path=resolve(root,name);if(relative(root,path).startsWith('..'))fail('RELEASE_RUNTIME_PATH');
 for(let p=path;p!==root;p=dirname(p))if(lstatSync(p).isSymbolicLink())fail('RELEASE_RUNTIME_PATH');
 return path;
}
export function releasedFormalRuntimeIndexes(root=ROOT,environment=process.env){
 const registry=JSON.parse(readFileSync(resolve(root,'contracts/production/released-runtime-packages.v1.json')));
 if(registry.schema!=='RELEASE_FORMAL_RUNTIME_PACKAGE_REGISTRY_V1'||!Array.isArray(registry.packages))fail('RELEASE_RUNTIME_REGISTRY');
 const ids=new Set();
 return registry.packages.flatMap(p=>{
  if(ids.has(p.product_id)||p.product_master_mutations!==0||p.publication_requires_native_release_gate!==true||!p.adoption_work_id||!p.adoption_result_sha256)fail('RELEASE_RUNTIME_ADOPTION_REQUIRED');ids.add(p.product_id);
  const dir=resolve(root,p.root);if(!p.root.startsWith('src/catalog/runtime-release-data/')||isAbsolute(p.root)||p.root.split('/').includes('..'))fail('RELEASE_RUNTIME_PATH');
  if(!existsSync(dir)){if(environment.VERCEL||environment.NODE_ENV==='production')fail('RELEASE_RUNTIME_PACKAGE_REQUIRED');return [];}
  if(lstatSync(dir).isSymbolicLink())fail('RELEASE_RUNTIME_PATH');
  const names=new Set(Object.keys(p.files));if(!names.size||!names.has(p.index.path)||p.files[p.index.path].sha256!==p.index.sha256)fail('RELEASE_RUNTIME_FILES');
  for(const[name,expected]of Object.entries(p.files)){const b=readFileSync(local(dir,name));if(b.length!==expected.bytes||digest(b)!==expected.sha256)fail('RELEASE_RUNTIME_BYTES_CHANGED');}
  const index=JSON.parse(readFileSync(local(dir,p.index.path)));if(index.products?.length!==1||index.products[0].id!==p.product_id||!names.has(index.products[0].path)||index.products[0].sha256!==p.files[index.products[0].path].sha256)fail('RELEASE_RUNTIME_IDENTITY');
  const required=new Set([p.index.path,index.products[0].path]);const adoption=index.runtimeOnlyAdoption;
  const source=index.products[0].uiFlowContract?.sourceFlow,sources=p.sourceReferences??{};
  for(const[name,proof]of Object.entries(sources)){if(!source||name!==source.path||names.has(name)||proof.schema!=='ADOPTED_FORMAL_SOURCE_REFERENCE_V1'||proof.role!=='FORMAL_PRODUCT_MASTER'||proof.sha256!==source.sha256||!proof.file_id||!Number.isSafeInteger(proof.bytes)||proof.bytes<=0||proof.verification!=='INSPECT_COMPLETED_NATIVE_ADOPTION_SOURCE_BYTES'||proof.adoption_work_id!==p.adoption_work_id)fail('RELEASE_RUNTIME_SOURCE_REFERENCE');}
  if(adoption?.schema!=='HUMAN_ADOPTED_RUNTIME_ONLY_V1'||adoption.productMasterMutations!==0||adoption.release!==false)fail('RELEASE_RUNTIME_ADOPTION_REQUIRED');
  for(const r of [adoption.candidateIndex,adoption.authorization,adoption.review,adoption.humanSource,index.products[0].uiFlowContract?.sourceFlow,...(index.products[0].uiFlowContract?.reviewSources??[])].filter(Boolean)){
   if(r===source&&sources[r.path])continue;
   if(!names.has(r.path)||p.files[r.path].sha256!==r.sha256)fail('RELEASE_RUNTIME_DEPENDENCY_REQUIRED');required.add(r.path);
  }
  if(required.size!==names.size)fail('RELEASE_RUNTIME_UNDECLARED_PAYLOAD');
  const decision=JSON.parse(readFileSync(local(dir,adoption.authorization.path)));if(decision.decision!=='APPROVED'||decision.authorization_kind!=='EXPLICIT_USER_SCOPE'||!decision.decision_ref)fail('RELEASE_RUNTIME_ADOPTION_REQUIRED');
  return [{...p.index,releasedRoot:dir,releasePackageId:p.id,sourceReferences:sources}];
 });
}
