import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

const sha256=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const deepFreeze=(value)=>{if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);return value;};
function fail(code,message,details={}){const error=new Error(message);error.code=code;Object.assign(error,details);throw error;}

function normalizedRuntimeRows(raw={}){
  return (raw.runtime_files??[]).map((row)=>({
    role:row.role,
    fileName:row.file_name??row.name,
    fileId:row.file_id??row.drive_file_id??row.id,
    sha256:row.sha256,
    bytes:row.bytes??row.size_bytes??null,
    packageVersion:row.package_version??null,
  }));
}
function storageReady(raw={}){
  const status=String(raw.storage_status??'');
  if(!['PASS','CANONICAL','DRIVE_CANONICAL','CANONICAL_01_正本'].includes(status))return false;
  if(raw.storage_gate!==undefined&&raw.storage_gate!==null&&raw.storage_gate!=='PASS')return false;
  if(raw.registry_gate!==undefined&&raw.registry_gate!==null&&raw.registry_gate!=='PASS')return false;
  if(raw.registry_status!==undefined&&raw.registry_status!==null&&!['PASS','FORMAL_PASS'].includes(String(raw.registry_status)))return false;
  return true;
}
function formalReady(raw={}){
  if(raw.runtime_status!=='READY'||raw.package_gate!=='PASS'||!storageReady(raw))return false;
  if(Array.isArray(raw.blocking_items)&&raw.blocking_items.length)return false;
  if('formal_pass' in raw&&raw.formal_pass!==true)return false;
  if('formal_status' in raw&&raw.formal_status!=='FORMAL_PASS')return false;
  return true;
}
function normalizeTransport(entry,fileId){
  const raw=entry.materializedFiles?.[fileId];
  if(Array.isArray(raw))return{codec:'gzip',paths:raw};
  if(raw&&typeof raw==='object'&&Array.isArray(raw.paths))return{codec:raw.codec??'gzip',paths:raw.paths};
  return null;
}
function decodeTransport(encoded,codec,fileName){
  const packed=Buffer.from(encoded.replace(/\s+/g,''),'base64');
  try{
    if(codec==='brotli'||codec==='br')return brotliDecompressSync(packed);
    if(codec==='gzip')return gunzipSync(packed);
    if(codec==='identity')return packed;
  }catch(cause){fail('FORMAL_RUNTIME_TRANSPORT_INVALID',`Formal Runtime transport is invalid: ${fileName}`,{cause,fileName,codec});}
  fail('FORMAL_RUNTIME_TRANSPORT_CODEC_UNSUPPORTED',`Unsupported Formal Runtime transport codec: ${codec}`,{fileName,codec});
}
async function readSiblingPartTransport(singlePath){
  const parts=[];
  for(let index=0;index<100;index+=1){
    const path=`${singlePath}.parts/part-${String(index).padStart(2,'0')}`;
    try{parts.push(await readFile(path,'utf8'));}
    catch(cause){
      if(index===0)return null;
      break;
    }
  }
  return parts.length?parts.join(''):null;
}
async function readPackedTransport(transport,fileName){
  if(!transport?.paths?.length)fail('FORMAL_RUNTIME_FILE_MISSING',`Formal Runtime transport has no paths: ${fileName}`,{fileName,transport});
  let encoded;
  try{encoded=(await Promise.all(transport.paths.map((path)=>readFile(path,'utf8')))).join('');}
  catch(cause){fail('FORMAL_RUNTIME_FILE_MISSING',`Formal Runtime transport is not materialized: ${fileName}`,{cause,fileName,transport});}
  try{return decodeTransport(encoded,transport.codec??'gzip',fileName);}
  catch(primaryError){
    if(primaryError?.code!=='FORMAL_RUNTIME_TRANSPORT_INVALID'||transport.paths.length!==1)throw primaryError;
    const recovered=await readSiblingPartTransport(transport.paths[0]);
    if(recovered===null)throw primaryError;
    try{return decodeTransport(recovered,transport.codec??'gzip',`${fileName}#parts-recovery`);}
    catch(recoveryError){
      fail('FORMAL_RUNTIME_TRANSPORT_INVALID',`Formal Runtime transport and sibling parts are invalid: ${fileName}`,{cause:recoveryError,fileName,codec:transport.codec??'gzip',primaryError});
    }
  }
}
async function materialize(entry,row){
  const transport=normalizeTransport(entry,row.fileId);
  if(!transport)fail('FORMAL_RUNTIME_FILE_MISSING',`Manifest-listed Runtime file has no app materialization mapping: ${row.fileName}`,row);
  const bytes=await readPackedTransport(transport,row.fileName);
  const actualSha256=sha256(bytes);
  if(actualSha256!==row.sha256)fail('FORMAL_RUNTIME_FILE_SHA_MISMATCH',`Manifest-listed Runtime SHA mismatch: ${row.fileName}`,{fileName:row.fileName,expectedSha256:row.sha256,actualSha256});
  if(row.bytes!==null&&Number(row.bytes)!==bytes.length)fail('FORMAL_RUNTIME_FILE_SIZE_MISMATCH',`Manifest-listed Runtime byte size mismatch: ${row.fileName}`,{fileName:row.fileName,expectedBytes:Number(row.bytes),actualBytes:bytes.length});
  let json;try{json=JSON.parse(bytes.toString('utf8'));}catch(cause){fail('FORMAL_RUNTIME_JSON_INVALID',`Manifest-listed Runtime file is not valid JSON: ${row.fileName}`,{cause,...row});}
  return{...row,actualSha256,actualBytes:bytes.length,codec:transport.codec,json};
}
function matchesIdentity(actual,expected){if(actual===undefined||actual===null||expected===undefined||expected===null)return true;return String(actual)===String(expected);}

export async function loadFormalProductRuntimeV2Package(entry){
  const manifestBytes=await readFile(entry.runtimeManifestPath);
  const manifestActualSha256=sha256(manifestBytes);
  if(entry.runtimeManifestSha256&&manifestActualSha256!==entry.runtimeManifestSha256)fail('FORMAL_RUNTIME_MANIFEST_SHA_MISMATCH','Formal Runtime manifest SHA-256 mismatch',{expectedSha256:entry.runtimeManifestSha256,actualSha256:manifestActualSha256});
  let raw;try{raw=JSON.parse(manifestBytes.toString('utf8'));}catch(cause){fail('FORMAL_RUNTIME_MANIFEST_INVALID','Formal Runtime manifest is not valid JSON',{cause});}
  const expectedManifestSeries=entry.manifestSeries??entry.series;
  for(const[name,expected,actual]of[['manufacturer',entry.manufacturer,raw.manufacturer],['series',expectedManifestSeries,raw.series],['package_version',entry.masterVersion,raw.package_version]])if(!matchesIdentity(actual,expected))fail('FORMAL_RUNTIME_MANIFEST_IDENTITY_MISMATCH',`${name} mismatch: expected ${expected}, got ${actual}`,{name,expected,actual});
  if(!formalReady(raw))fail('FORMAL_RUNTIME_NOT_READY','Formal Runtime manifest is not ready for app integration',{manifest:raw});
  const rows=normalizedRuntimeRows(raw);
  if(!rows.length||rows.some((row)=>!row.role||!row.fileName||!row.fileId||!row.sha256))fail('FORMAL_RUNTIME_MANIFEST_INVALID','Formal Runtime manifest must explicitly list role/name/id/sha256 for every Runtime file');
  if(rows.some((row)=>row.packageVersion&&String(row.packageVersion)!==String(raw.package_version)))fail('FORMAL_RUNTIME_MANIFEST_VERSION_MISMATCH','Runtime file package_version must match manifest package_version');
  const loaded=[];for(const row of rows)loaded.push(await materialize(entry,row));
  const documents={};for(const row of loaded)if(!(row.role in documents))documents[row.role]=row.json;
  const documentsByFileName=Object.fromEntries(loaded.map((row)=>[row.fileName,row.json]));
  const documentsByFileId=Object.fromEntries(loaded.map((row)=>[row.fileId,row.json]));
  for(const row of loaded){
    const document=row.json; const role=String(row.role).toUpperCase(); if(role.includes('SCHEMA')||role==='SCHEMA')continue;
    const docManufacturer=document.manufacturer??document.metadata?.manufacturer;
    const docSeries=document.series??document.metadata?.series;
    const docPackage=document.package_version??document.metadata?.package_version;
    if(!matchesIdentity(docManufacturer,entry.manufacturer))fail('FORMAL_RUNTIME_DOCUMENT_IDENTITY_MISMATCH',`${row.fileName}: manufacturer mismatch`,{row});
    if(!matchesIdentity(docSeries,expectedManifestSeries))fail('FORMAL_RUNTIME_DOCUMENT_IDENTITY_MISMATCH',`${row.fileName}: series mismatch`,{row});
    if(!matchesIdentity(docPackage,entry.masterVersion))fail('FORMAL_RUNTIME_DOCUMENT_IDENTITY_MISMATCH',`${row.fileName}: package_version mismatch`,{row});
  }
  return deepFreeze({manifest:raw,documents,documentsByFileName,documentsByFileId,integrity:{expected:entry.runtimeManifestSha256??manifestActualSha256,actual:manifestActualSha256,match:!entry.runtimeManifestSha256||entry.runtimeManifestSha256===manifestActualSha256,manifestDriveFileId:entry.runtimeManifestDriveFileId??null,files:loaded.map((row)=>({role:row.role,fileName:row.fileName,fileId:row.fileId,expected:row.sha256,actual:row.actualSha256,match:true,bytes:row.actualBytes,codec:row.codec}))}});
}
