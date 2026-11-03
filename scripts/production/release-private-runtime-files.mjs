// Stage only declared native payload bytes; preserve any pre-existing cache.
import {readFile,writeFile,mkdir,lstat,unlink} from 'node:fs/promises';
import {resolve,dirname,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export async function readPrivateRuntimeFile(root,pkg,name,packageCount){
 assert(isAbsolute(root)&&Number.isInteger(packageCount)&&packageCount>0,'PRIVATE_RUNTIME_SOURCE');root=resolve(root);
 assert(pkg.root.startsWith('src/catalog/runtime-release-data/')&&!isAbsolute(pkg.root)&&!pkg.root.split('/').includes('..'),'PRIVATE_RUNTIME_PATH');
 assert(name&&!isAbsolute(name)&&!name.includes('\\')&&!name.split('/').includes('..'),'PRIVATE_RUNTIME_PATH');
 const expected=pkg.files[name];assert(expected,'PRIVATE_RUNTIME_UNDECLARED_FILE');
 // Package-relative roots prevent two different runtime_index.json files from
 // colliding. Keep the established flat source only for a single package.
 const candidates=[resolve(root,pkg.root,name),...(packageCount===1?[resolve(root,name)]:[])];
 for(const source of candidates){
  try{
   for(let p=source;p!==root;p=dirname(p))assert(!(await lstat(p)).isSymbolicLink(),'PRIVATE_RUNTIME_SYMLINK');
   const bytes=await readFile(source);assert(bytes.length===expected.bytes&&createHash('sha256').update(bytes).digest('hex')===expected.sha256,'PRIVATE_RUNTIME_BYTES_CHANGED');return bytes;
  }catch(error){if(error.code!=='ENOENT')throw error;}
 }
 throw new Error('PRIVATE_RUNTIME_PACKAGE_SOURCE_REQUIRED:'+pkg.root+'/'+name);
}
export async function stagePrivateRuntimeFiles(root,rows){
 root=resolve(root);const checked=[];
 for(const row of rows){assert(row.file.startsWith('src/catalog/runtime-release-data/')&&!isAbsolute(row.file)&&!row.file.split('/').includes('..'),'PRIVATE_RUNTIME_PATH');const file=resolve(root,row.file);for(let p=file;p!==root;p=dirname(p)){try{assert(!(await lstat(p)).isSymbolicLink(),'PRIVATE_RUNTIME_SYMLINK');}catch(e){if(e.code!=='ENOENT')throw e;}}let exists=false;try{assert((await readFile(file)).equals(row.data),'PRIVATE_RUNTIME_EXISTING_BYTES_CHANGED');exists=true;}catch(e){if(e.code!=='ENOENT')throw e;}checked.push({...row,file,exists});}
 const created=[];const cleanup=async()=>{for(const row of [...created].reverse()){assert((await readFile(row.file)).equals(row.data),'PRIVATE_RUNTIME_STAGED_BYTES_CHANGED');await unlink(row.file);}};
 try{for(const row of checked){if(row.exists)continue;await mkdir(dirname(row.file),{recursive:true});await writeFile(row.file,row.data,{flag:'wx'});created.push(row);}}catch(e){await cleanup();throw e;}
 return {created:created.map(r=>r.file),cleanup};
}
