import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative,isAbsolute} from 'node:path';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function fail(code){throw Object.assign(new Error(code),{code});}
function readIndex(){
  const path=process.env.SASH_CANDIDATE_RUNTIME_INDEX;
  if(!path)return [];
  if(process.env.SASH_CANDIDATE_MODE!=='INSPECT_LOCAL'||process.env.VERCEL||process.env.NODE_ENV==='production')fail('CANDIDATE_RUNTIME_NOT_ADMITTED');
  const manifestFileId=process.env.SASH_CANDIDATE_MANIFEST_FILE_ID;
  if(!manifestFileId)fail('CANDIDATE_SAVED_IDENTITY_REQUIRED');
  if(lstatSync(path).isSymbolicLink())fail('CANDIDATE_SYMLINK_REFUSED');
  const bytes=readFileSync(path);
  if(digest(bytes)!==process.env.SASH_CANDIDATE_INDEX_SHA)fail('CANDIDATE_INDEX_BYTES_CHANGED');
  const index=JSON.parse(bytes),root=dirname(resolve(path));
  if(index.schema!=='CANDIDATE_RUNTIME_INDEX_V1'||index.adoption!=='CANDIDATE_ONLY')fail('CANDIDATE_SCHEMA_INVALID');
  const seen=new Set();
  return index.products.map(row=>{
    if(seen.has(row.id)||!row.candidate||row.adapterType!=='COMPOSED_PRODUCT_MODULE_V1')fail('CANDIDATE_ENTRY_INVALID');
    seen.add(row.id);
    const modulePath=resolve(root,row.path),rel=relative(root,modulePath);
    if(rel.startsWith('..')||isAbsolute(rel)||lstatSync(modulePath).isSymbolicLink()||digest(readFileSync(modulePath))!==row.sha256)fail('CANDIDATE_MODULE_BYTES_CHANGED');
    return Object.freeze({...row,series:row.series+'（候補）',displayName:row.displayName+'（候補）',productId:row.id,packageType:'CANDIDATE_PRODUCT_MODULE',modulePath,
      runtimeManifestSha256:row.sha256,canonicalRuntimeReference:{runtimeManifestDriveFileId:manifestFileId,candidateSha256:row.sha256,candidateRevision:index.revision,adoption:'CANDIDATE_ONLY'},
      candidateRuntimeReference:{revision:index.revision,sha256:row.sha256,indexSha256:digest(bytes)},
      registrationState:'CANDIDATE_LOCAL_ONLY',formalAdoption:false});
  });
}
export const candidateRuntimeEntries=Object.freeze(readIndex());
export function readCandidateModule(entry){
  if(lstatSync(entry.modulePath).isSymbolicLink())fail('CANDIDATE_SYMLINK_REFUSED');
  const bytes=readFileSync(entry.modulePath);
  if(digest(bytes)!==entry.sha256)fail('CANDIDATE_MODULE_BYTES_CHANGED');
  return JSON.parse(bytes);
}
