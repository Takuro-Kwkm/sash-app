// Stage only declared native payload bytes; preserve any pre-existing cache.
import {readFile,writeFile,mkdir,lstat,unlink} from 'node:fs/promises';
import {resolve,dirname,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
export async function stagePrivateRuntimeFiles(root,rows){
 root=resolve(root);const checked=[];
 for(const row of rows){assert(row.file.startsWith('src/catalog/runtime-release-data/')&&!isAbsolute(row.file)&&!row.file.split('/').includes('..'),'PRIVATE_RUNTIME_PATH');const file=resolve(root,row.file);for(let p=file;p!==root;p=dirname(p)){try{assert(!(await lstat(p)).isSymbolicLink(),'PRIVATE_RUNTIME_SYMLINK');}catch(e){if(e.code!=='ENOENT')throw e;}}let exists=false;try{assert((await readFile(file)).equals(row.data),'PRIVATE_RUNTIME_EXISTING_BYTES_CHANGED');exists=true;}catch(e){if(e.code!=='ENOENT')throw e;}checked.push({...row,file,exists});}
 const created=[];const cleanup=async()=>{for(const row of [...created].reverse()){assert((await readFile(row.file)).equals(row.data),'PRIVATE_RUNTIME_STAGED_BYTES_CHANGED');await unlink(row.file);}};
 try{for(const row of checked){if(row.exists)continue;await mkdir(dirname(row.file),{recursive:true});await writeFile(row.file,row.data,{flag:'wx'});created.push(row);}}catch(e){await cleanup();throw e;}
 return {created:created.map(r=>r.file),cleanup};
}
