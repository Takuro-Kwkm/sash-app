import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=dirname(fileURLToPath(import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};
function checked(root,ref){
  const path=resolve(root,ref.path),rel=relative(root,path);
  if(rel.startsWith('..')||isAbsolute(rel)||lstatSync(path).isSymbolicLink())fail('FORMAL_COMPOSITION_PATH_INVALID');
  const bytes=readFileSync(path);
  if(digest(bytes)!==ref.sha256)fail('FORMAL_COMPOSITION_BYTES_CHANGED');
  return {path,bytes};
}
const registry=JSON.parse(readFileSync(resolve(HERE,'formal-composed-runtime-registry.json')));
const seen=new Set();
export const formalComposedRuntimeEntries=Object.freeze(registry.indexes.flatMap(ref=>{
  const {path,bytes}=checked(resolve(HERE,'..'),ref),root=dirname(path),index=JSON.parse(bytes);
  if(index.schema!=='FORMAL_COMPOSED_RUNTIME_INDEX_V1'||(!index.runtimeOnlyAdoption&&index.authoring.packageVersion!==index.packageVersion)||!index.authoring.manifestFileId)fail('FORMAL_COMPOSITION_INDEX_INVALID');
  if(index.runtimeOnlyAdoption){
    const adoption=index.runtimeOnlyAdoption;
    if(adoption.schema!=='HUMAN_ADOPTED_RUNTIME_ONLY_V1'||adoption.productMasterMutations!==0||adoption.release!==false)fail('FORMAL_RUNTIME_ADOPTION_INVALID');
    for(const ref of [adoption.candidateIndex,adoption.authorization,adoption.review,adoption.humanSource])checked(root,ref);
    const approval=JSON.parse(checked(root,adoption.authorization).bytes);
    if(approval.decision!=='APPROVED'||approval.authorization_kind!=='EXPLICIT_USER_SCOPE'||!approval.decision_ref)fail('FORMAL_RUNTIME_APPROVAL_REQUIRED');
  }
  return index.products.map(row=>{
    if(seen.has(row.id)||row.candidate||row.adapterType!=='COMPOSED_PRODUCT_MODULE_V1')fail('FORMAL_COMPOSITION_ENTRY_INVALID');
    seen.add(row.id);checked(root,row);
    for(const source of [row.uiFlowContract?.sourceFlow,...(row.uiFlowContract?.reviewSources??[])].filter(Boolean))checked(root,source);
    return Object.freeze({...row,productId:row.id,masterVersion:index.packageVersion,packageVersion:index.packageVersion,packageRoot:root,
      packageType:'FORMAL_COMPOSED_PRODUCT_RUNTIME',runtimeManifestSha256:ref.sha256,runtimeManifestDriveFileId:ref.manifestFileId,
      canonicalRuntimeReference:{runtimeManifestDriveFileId:ref.manifestFileId,packageVersion:index.packageVersion,runtimeIndexSha256:ref.sha256},
      productMasterFormalReference:index.authoring,sourceHash:row.sha256});
  });
}));
export function readFormalComposedModule(entry){
  const {bytes}=checked(entry.packageRoot,entry);
  for(const source of [entry.uiFlowContract?.sourceFlow,...(entry.uiFlowContract?.reviewSources??[])].filter(Boolean))checked(entry.packageRoot,source);
  const document=JSON.parse(bytes);
  if(document.schema!=='FORMAL_COMPOSED_PRODUCT_MODULE_V1'||document.formal_adoption!==true||document.source_adoption!==false||document.product_module.product.id!==entry.id)fail('FORMAL_COMPOSITION_DOCUMENT_INVALID');
  return {document,integrity:{match:true,expected:entry.sha256,actual:digest(bytes),files:[{fileId:entry.id,actual:digest(bytes),match:true,bytes:bytes.length}]}};
}
