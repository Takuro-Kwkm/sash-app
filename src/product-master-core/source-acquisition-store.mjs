import fs from'node:fs';
import path from'node:path';
import{validateSourceAcquisitionRecord}from'./source-acquisition.mjs';

const makeError=(code,message,details={})=>({code,message,...details});

function writeAtomic(filePath,content){
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}

export function persistSourceAcquisitionForBatch({evidenceInboxDir,batchId,record,job=null}={}){
  const validation=validateSourceAcquisitionRecord(record,{job});
  if(!validation.pass)return{pass:false,status:'BLOCKED',errors:validation.errors};
  if(!evidenceInboxDir||!batchId)return{pass:false,status:'BLOCKED',errors:[makeError('SOURCE_ACQUISITION_INBOX_TARGET_MISSING','evidenceInboxDir and batchId are required')]};
  const manifestPath=path.resolve(evidenceInboxDir,'manifest.json');
  if(!fs.existsSync(manifestPath))return{pass:false,status:'BLOCKED',errors:[makeError('SOURCE_ACQUISITION_INBOX_MANIFEST_MISSING','Evidence Inbox manifest does not exist',{manifestPath})]};
  let manifest;
  try{manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));}
  catch(cause){return{pass:false,status:'BLOCKED',errors:[makeError('SOURCE_ACQUISITION_INBOX_MANIFEST_INVALID',cause?.message??String(cause))]};}
  const batches=Array.isArray(manifest.batches)?manifest.batches:null;
  if(!batches)return{pass:false,status:'BLOCKED',errors:[makeError('SOURCE_ACQUISITION_INBOX_BATCHES_INVALID','Evidence Inbox manifest batches must be an array')]};
  const index=batches.findIndex((row)=>row?.batchId===batchId);
  if(index<0)return{pass:false,status:'BLOCKED',errors:[makeError('SOURCE_ACQUISITION_BATCH_NOT_FOUND',`Evidence Inbox batch not found: ${batchId}`,{batchId})]};
  const existing=batches[index]?.executionContext?.sourceAcquisition??null;
  if(existing&&JSON.stringify(existing)!==JSON.stringify(record))return{pass:false,status:'BLOCKED',errors:[makeError('SOURCE_ACQUISITION_CONTEXT_CONFLICT','Evidence Inbox batch already contains different source acquisition provenance',{batchId})]};
  const next=structuredClone(manifest);
  next.batches[index].executionContext={...(next.batches[index].executionContext??{}),sourceAcquisition:structuredClone(record)};
  try{writeAtomic(manifestPath,`${JSON.stringify(next,null,2)}\n`);}
  catch(cause){return{pass:false,status:'FAILED',errors:[makeError('SOURCE_ACQUISITION_INBOX_WRITE_FAILED',cause?.message??String(cause),{manifestPath})]};}
  return{pass:true,status:'PERSISTED',manifestPath,batchId,sourceAcquisition:structuredClone(record),errors:[]};
}
