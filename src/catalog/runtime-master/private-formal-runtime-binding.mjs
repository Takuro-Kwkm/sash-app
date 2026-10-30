import {readFileSync,lstatSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,isAbsolute,relative,dirname} from 'node:path';
const digest=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};
export function privateFormalRuntimeIndexes(environment=process.env){
 const file=environment.SASH_PRIVATE_FORMAL_RUNTIME_MANIFEST,expected=environment.SASH_PRIVATE_FORMAL_RUNTIME_SHA256;
 if(!file&&!expected)return [];
 if(!file||!expected)fail('PRIVATE_FORMAL_BINDING_REQUIRED');
 if(environment.VERCEL||environment.NODE_ENV==='production')fail('PRIVATE_FORMAL_RELEASE_NOT_ADMITTED');
 if(!isAbsolute(file)||lstatSync(file).isSymbolicLink())fail('PRIVATE_FORMAL_BINDING_PATH');
 const bytes=readFileSync(file);if(digest(bytes)!==expected)fail('PRIVATE_FORMAL_BINDING_CHANGED');
 const m=JSON.parse(bytes);if(typeof m.root!=='string'||!isAbsolute(m.root))fail('PRIVATE_FORMAL_BINDING_PATH');const root=resolve(m.root);
 if(m.schema!=='PRIVATE_FORMAL_RUNTIME_BINDING_V1'||m.state!=='FORMAL_RUNTIME_BYTES_READBACK_PASS'||m.release!==false||!isAbsolute(m.root)||!Array.isArray(m.files)||!m.files.length)fail('PRIVATE_FORMAL_READBACK_REQUIRED');
 if(lstatSync(root).isSymbolicLink())fail('PRIVATE_FORMAL_BINDING_PATH');
 const names=new Set();
 for(const ref of m.files){
  if(typeof ref.path!=='string'||!ref.path||isAbsolute(ref.path)||ref.path.includes('\\')||ref.path.split('/').includes('..')||names.has(ref.path))fail('PRIVATE_FORMAL_BINDING_PATH');names.add(ref.path);
  const path=resolve(root,ref.path),rel=relative(root,path);
  if(rel.startsWith('..')||isAbsolute(rel))fail('PRIVATE_FORMAL_BINDING_PATH');
  for(let p=path;p!==root;p=dirname(p))if(lstatSync(p).isSymbolicLink())fail('PRIVATE_FORMAL_BINDING_PATH');
  const value=readFileSync(path);if(digest(value)!==ref.sha256||value.length!==ref.bytes)fail('PRIVATE_FORMAL_INPUT_CHANGED');
 }
 const indexes=m.indexes;if(!Array.isArray(indexes)||!indexes.length)fail('PRIVATE_FORMAL_INDEX_REQUIRED');
 return indexes.map(ref=>{
  const match=m.files.find(x=>x.path===ref.path);
  if(!match||match.sha256!==ref.sha256||typeof ref.manifestFileId!=='string'||!ref.manifestFileId||!ref.packageFileId||!ref.readbackReceiptSha256)fail('PRIVATE_FORMAL_INDEX_REQUIRED');
  const proofPath=resolve(root,ref.readbackReceiptPath??'');
  if(!names.has(ref.readbackReceiptPath)||digest(readFileSync(proofPath))!==ref.readbackReceiptSha256)fail('PRIVATE_FORMAL_READBACK_REQUIRED');
  const proof=JSON.parse(readFileSync(proofPath));
  if(proof.schema!=='NATIVE_PRIVATE_RUNTIME_READBACK_V1'||proof.source!=='CONNECTED_GOOGLE_DRIVE_TOOL'||proof.full_bytes_verified!==true||!proof.work_id||!proof.product_id||proof.status!=='FORMAL_RUNTIME_BYTES_READBACK_PASS'||proof.index?.file_id!==ref.manifestFileId||proof.index?.sha256!==ref.sha256||proof.package?.file_id!==ref.packageFileId||proof.product_master_mutations!==0||proof.release!==false)fail('PRIVATE_FORMAL_READBACK_REQUIRED');
  const module=m.files.find(x=>x.path===proof.module?.path),archive=m.files.find(x=>x.path===proof.package?.path);
  if(!module||module.sha256!==proof.module.sha256||!proof.module.file_id||!archive||archive.sha256!==proof.package.sha256||!Array.isArray(proof.package.files))fail('PRIVATE_FORMAL_READBACK_REQUIRED');
  const expectedNames=proof.package.files.map(x=>x.path);if(!expectedNames.length||new Set(expectedNames).size!==expectedNames.length||!expectedNames.includes(ref.path)||!expectedNames.includes(proof.module.path)||m.files.length!==expectedNames.length+2||new Set([...expectedNames,proof.package.path,ref.readbackReceiptPath]).size!==m.files.length||m.files.some(x=>!expectedNames.includes(x.path)&&x.path!==proof.package.path&&x.path!==ref.readbackReceiptPath))fail('PRIVATE_FORMAL_READBACK_REQUIRED');
  const index=JSON.parse(readFileSync(resolve(root,ref.path)));if(index.products?.length!==1||index.products[0].id!==proof.formal_product_id||index.products[0].sha256!==proof.module.sha256)fail('PRIVATE_FORMAL_READBACK_REQUIRED');
  for(const expected of proof.package.files){const actual=m.files.find(x=>x.path===expected.path);if(!actual||actual.sha256!==expected.sha256||actual.bytes!==expected.bytes)fail('PRIVATE_FORMAL_READBACK_REQUIRED');}
  return {...ref,privateRoot:root};
 });
}
