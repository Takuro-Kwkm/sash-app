import {choiceImagePresentation} from '../../../contracts/ui-common/choice-images.v1.mjs';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative,isAbsolute} from 'node:path';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function fail(code){throw Object.assign(new Error(code),{code});}
function verifyFlowSource(entry,root){
  if(!['REVIEWED_WINDOW_FLOW_V2','REVIEWED_WINDOW_FLOW_V3'].includes(entry.uiFlowContract?.schema))return;
  for(const source of [entry.uiFlowContract.sourceFlow,...(entry.uiFlowContract.reviewSources??[])]){
    const path=resolve(root,source.path),rel=relative(root,path);
    if(rel.startsWith('..')||isAbsolute(rel)||lstatSync(path).isSymbolicLink()||digest(readFileSync(path))!==source.sha256)fail('WINDOW_FLOW_SOURCE_BYTES_CHANGED');
  }
}
function readIndex(draft){
  const path=draft?.path??process.env.SASH_CANDIDATE_RUNTIME_INDEX;
  if(!path)return [];
  if((!draft&&process.env.SASH_CANDIDATE_MODE!=='INSPECT_LOCAL')||process.env.VERCEL||process.env.NODE_ENV==='production')fail('CANDIDATE_RUNTIME_NOT_ADMITTED');
  const manifestFileId=process.env.SASH_CANDIDATE_MANIFEST_FILE_ID;
  if(lstatSync(path).isSymbolicLink())fail('CANDIDATE_SYMLINK_REFUSED');
  const bytes=readFileSync(path);
  if(digest(bytes)!==(draft?.sha256??process.env.SASH_CANDIDATE_INDEX_SHA))fail('CANDIDATE_INDEX_BYTES_CHANGED');
  const index=JSON.parse(bytes),root=dirname(resolve(path));
  if(index.schema!=='CANDIDATE_RUNTIME_INDEX_V1'||index.adoption!=='CANDIDATE_ONLY')fail('CANDIDATE_SCHEMA_INVALID');
  const seen=new Set();
  return index.products.map(row=>{
    if(seen.has(row.id)||!row.candidate||!['COMPOSED_PRODUCT_MODULE_V1','ROW_TABLE_UI_CANDIDATE_V1'].includes(row.adapterType))fail('CANDIDATE_ENTRY_INVALID');
    if(row.adapterType==='COMPOSED_PRODUCT_MODULE_V1'&&!draft&&!manifestFileId)fail('CANDIDATE_SAVED_IDENTITY_REQUIRED');
    if(draft&&row.adapterType!=='COMPOSED_PRODUCT_MODULE_V1')fail('CANDIDATE_DRAFT_ENTRY_INVALID');
    if(row.adapterType==='ROW_TABLE_UI_CANDIDATE_V1'&&(!row.sourceReference?.runtimeManifestDriveFileId||!/^[a-f0-9]{64}$/.test(row.sourceReference?.sourceMasterSha256??'')))fail('CANDIDATE_SOURCE_IDENTITY_REQUIRED');
    seen.add(row.id);
    const modulePath=resolve(root,row.path),rel=relative(root,modulePath);
    if(rel.startsWith('..')||isAbsolute(rel)||lstatSync(modulePath).isSymbolicLink()||digest(readFileSync(modulePath))!==row.sha256)fail('CANDIDATE_MODULE_BYTES_CHANGED');
    verifyFlowSource(row,root);
    return Object.freeze({...row,imagePresentation:choiceImagePresentation(row.imagePresentation).mode,series:row.series+'（候補）',displayName:row.displayName+'（候補）',productId:row.id,packageType:'CANDIDATE_PRODUCT_MODULE',modulePath,
      runtimeManifestSha256:row.sha256,canonicalRuntimeReference:{...(row.adapterType==='ROW_TABLE_UI_CANDIDATE_V1'?row.sourceReference:draft?{storageState:'LOCAL_DRAFT'}:{runtimeManifestDriveFileId:manifestFileId}),candidateSha256:row.sha256,candidateRevision:index.revision,adoption:'CANDIDATE_ONLY'},
      candidateRuntimeReference:{revision:index.revision,sha256:row.sha256,indexSha256:digest(bytes)},
      registrationState:'CANDIDATE_LOCAL_ONLY',formalAdoption:false});
  });
}
export const candidateRuntimeEntries=Object.freeze(readIndex());
export function readCandidateModule(entry,indexPath=process.env.SASH_CANDIDATE_RUNTIME_INDEX){
  verifyFlowSource(entry,dirname(resolve(indexPath)));
  if(lstatSync(entry.modulePath).isSymbolicLink())fail('CANDIDATE_SYMLINK_REFUSED');
  const bytes=readFileSync(entry.modulePath);
  if(digest(bytes)!==entry.sha256)fail('CANDIDATE_MODULE_BYTES_CHANGED');
  return JSON.parse(bytes);
}

// The portable review builder can inspect local bytes before native storage.
export function readPortableCandidateDraft(path,sha256){
  if(!path||!sha256)fail('CANDIDATE_DRAFT_BYTES_REQUIRED');
  return readIndex({path,sha256});
}
