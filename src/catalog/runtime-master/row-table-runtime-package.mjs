// Native row-table format loader. Uses the approved resolver and common engines.
import {readFileSync,lstatSync,existsSync} from 'node:fs';
import {resolve,relative,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRowTableUi} from './row-table-runtime-ui.mjs';
const HERE=dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};
function local(root,name){
 if(typeof name!=='string'||!name||isAbsolute(name)||name.includes('\\')||name.split('/').includes('..'))fail('ROW_RUNTIME_PATH');
 const p=resolve(root,name);if(relative(root,p).startsWith('..'))fail('ROW_RUNTIME_PATH');
 for(let q=p;q!==root;q=dirname(q))if(lstatSync(q).isSymbolicLink())fail('ROW_RUNTIME_PATH');
 return p;
}
function checked(root,ref){const p=local(root,ref.path),bytes=readFileSync(p);if(hash(bytes)!==ref.sha256)fail('ROW_RUNTIME_BYTES');return {path:p,bytes};}
export function readRowTableRuntimePackage(entry,environment=process.env){
 const {bytes}=checked(entry.packageRoot,{path:'runtime_index.json',sha256:entry.runtimeManifestSha256}),index=JSON.parse(bytes);
 if(index.schema!=='ROW_TABLE_RUNTIME_INDEX_V1'||index.product.id!==entry.id||index.product.adapterType!=='ROW_TABLE_RUNTIME_V1')fail('ROW_RUNTIME_IDENTITY');
 for(const [path,sha256]of Object.entries(index.files))checked(entry.packageRoot,{path,sha256});
 for(const ref of [index.document,index.master,index.evidence,...Object.values(index.ui_approval??{})])if(index.files[ref.path]!==ref.sha256)fail('ROW_RUNTIME_DEPENDENCY');
 const document=JSON.parse(checked(entry.packageRoot,index.document).bytes),proof=JSON.parse(checked(entry.packageRoot,index.evidence).bytes);
 const decision=JSON.parse(checked(entry.packageRoot,index.ui_approval.decision).bytes),packet=JSON.parse(checked(entry.packageRoot,index.ui_approval.packet).bytes);
 if(decision.actor_kind!=='HUMAN'||decision.decision!=='APPROVED'||decision.gate!=='HUMAN_UI_REVIEW'||decision.payload_sha256!==packet.payload_sha256||packet.native_packet.ui_identity.master!==index.master.sha256||!packet.native_packet.ui_identity.ui_files.some(f=>f.path.endsWith('/candidate.json')&&f.sha256===index.document.sha256))fail('ROW_RUNTIME_UI_APPROVAL');
 if(document.source_master.sha256!==index.master.sha256||index.product.sourceReference.sourceMasterSha256!==index.master.sha256)fail('ROW_RUNTIME_MASTER');
 const master=checked(entry.packageRoot,index.master);if(hash(master.bytes)!==document.source_master.sha256)fail('ROW_RUNTIME_MASTER');
 if(proof.schema!=='VERIFIED_ROW_TABLE_SOURCE_DIGESTS_V1'||proof.product_id!==entry.id||proof.master_sha256!==index.master.sha256)fail('ROW_RUNTIME_EVIDENCE');
 const nativePath=resolve(entry.packageRoot,index.admission.path);
 if(!index.admission.path||isAbsolute(index.admission.path)||index.admission.path.split('/').includes('..'))fail('ROW_RUNTIME_PATH');
 let admission=null;
 if(existsSync(nativePath)){
  const adopted=entry.runtimeAdoption;
  if(!adopted||adopted.path!==index.admission.path||!/^[a-f0-9]{64}$/.test(adopted.sha256??'')||!adopted.work_id)fail('ROW_RUNTIME_UNREGISTERED_ADOPTION');
  admission=JSON.parse(checked(entry.packageRoot,adopted).bytes);
  if(admission.work_id!==adopted.work_id)fail('ROW_RUNTIME_ADOPTION_REQUIRED');
  if(admission.state!=='RUNTIME_UI_ADOPTED'||admission.status!=='PASS'||admission.product_id!==entry.id||admission.package_index_sha256!==entry.runtimeManifestSha256||admission.product_master_mutations!==0||admission.release!==false||!admission.work_id||!admission.main_readback||!admission.formal_readback)fail('ROW_RUNTIME_ADOPTION_REQUIRED');
  const main=JSON.parse(checked(entry.packageRoot,admission.main_readback).bytes),formal=JSON.parse(checked(entry.packageRoot,admission.formal_readback).bytes),receipt=main.receipt;
  if(receipt?.status!=='MERGE_CLOSED'||receipt.repository!=='Takuro-Kwkm/sash-app'||main.main?.commit?.sha!==receipt.merge_sha||main.pr?.merged!==true||!(main.files_verified>0)||formal.status!=='PASS'||formal.actual_readback?.source!=='CONNECTED_GOOGLE_DRIVE_TOOL'||formal.actual_readback?.full_bytes_verified!==true||formal.actual_readback?.product_id!==entry.id||formal.actual_readback?.index?.sha256!==entry.runtimeManifestSha256)fail('ROW_RUNTIME_ADOPTION_REQUIRED');
 }
 if(entry.runtimeAdoption&&!admission)fail('ROW_RUNTIME_ADOPTION_REQUIRED');
 if(!admission&&(environment.VERCEL||environment.NODE_ENV==='production'))fail('ROW_RUNTIME_ADOPTION_REQUIRED');
 const verifyEvidence=ref=>{const source=proof.sources.find(s=>s.path===ref.path);if(!source||source.sha256!==ref.sha256||source.bytes<=0||source.verification!=='RETAINED_OFFICIAL_BYTES_SHA256_VERIFIED')fail('ROW_RUNTIME_EVIDENCE');};
 for(const ref of document.ui_policy.sales_views?.source_refs??[])verifyEvidence(ref);
 return {index,document,admission,sourceBinding:{masterPath:master.path,verifyEvidence},integrity:{match:true,expected:entry.runtimeManifestSha256,actual:hash(bytes),files:Object.entries(index.files).map(([path,sha256])=>({fileId:path,actual:sha256,match:true}))}};
}
const registry=JSON.parse(readFileSync(resolve(HERE,'row-table-runtime-registry.json')));
if(registry.schema!=='ROW_TABLE_RUNTIME_REGISTRY_V1'||!Array.isArray(registry.packages))fail('ROW_RUNTIME_REGISTRY');
const ids=new Set();
export const rowTableRuntimeEntries=Object.freeze(registry.packages.flatMap(ref=>{
 const result=checked(resolve(HERE,'..'),ref),root=dirname(result.path),index=JSON.parse(result.bytes),p=index.product;
 if(ids.has(p.id))fail('ROW_RUNTIME_DUPLICATE');ids.add(p.id);
 const entry={...p,productId:p.id,packageRoot:root,packageType:'ROW_TABLE_RUNTIME_PACKAGE_V1',masterVersion:index.packageVersion,packageVersion:index.packageVersion,runtimeManifestPath:result.path,runtimeManifestSha256:ref.sha256,sourceHash:ref.sha256,runtimeAdoption:ref.adoption??null,
 canonicalRuntimeReference:{...p.sourceReference,runtimeIndexSha256:ref.sha256},productMasterFormalReference:index.authoring};
 // Pending installation must not interrupt other already released products.
 // Still validate every declared byte before omitting the unadopted product.
 const loaded=readRowTableRuntimePackage(entry,{});
 if(!loaded.admission&&(process.env.VERCEL||process.env.NODE_ENV==='production'))return [];
 return [Object.freeze(entry)];
}));
export function adaptRowTableRuntimePackage(entry){
 const loaded=readRowTableRuntimePackage(entry),ui=createRowTableUi(loaded.document,entry,loaded.sourceBinding);
 return {...loaded,master:ui.master,uiResolver:(selection,context)=>{
  // Revalidate the installed bytes even when the normal registry caches adapters.
  const current=readRowTableRuntimePackage(entry),raw=ui.uiResolver(selection,context),adopted=Boolean(current.admission);
  return {...raw,candidateOnly:false,formalAdoption:adopted,runtimeUiAdopted:adopted,presentation:{...raw.presentation,labelsReviewed:true,flowReviewed:true},
   runtimeMaster:{...raw.runtimeMaster,candidateOnly:false,sourceHash:entry.runtimeManifestSha256,canonicalRuntimeReference:entry.canonicalRuntimeReference,productMasterFormalReference:entry.productMasterFormalReference,sourcePackageIntegrity:loaded.integrity},
   runtimeCapabilities:{formalAdoption:adopted,sourceAdoption:false,implementationReady:true,automaticOrderability:false}};
 }};
}
