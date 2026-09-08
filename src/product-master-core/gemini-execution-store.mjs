import fs from'node:fs';
import path from'node:path';
import{validateGeminiExecutionAudit}from'./gemini-execution-contract.mjs';

const makeError=(code,message,details={})=>({code,message,...details});
function writeAtomic(filePath,content){
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}

export function persistGeminiExecutionForBatch({evidenceInboxDir,batchId,record,job=null,sourceAcquisition=null,sourceDelivery=null,rawResponseSha256=null}={}){
  const validation=validateGeminiExecutionAudit(record,{job,sourceAcquisition,sourceDelivery,rawResponseSha256});
  if(!validation.pass)return{pass:false,status:'BLOCKED',errors:validation.errors};
  if(!evidenceInboxDir||!batchId)return{pass:false,status:'BLOCKED',errors:[makeError('GEMINI_EXECUTION_INBOX_TARGET_MISSING','evidenceInboxDir and batchId are required')]};
  const manifestPath=path.resolve(evidenceInboxDir,'manifest.json');
  if(!fs.existsSync(manifestPath))return{pass:false,status:'BLOCKED',errors:[makeError('GEMINI_EXECUTION_INBOX_MANIFEST_MISSING','Evidence Inbox manifest does not exist',{manifestPath})]};
  let manifest;
  try{manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));}
  catch(cause){return{pass:false,status:'BLOCKED',errors:[makeError('GEMINI_EXECUTION_INBOX_MANIFEST_INVALID',cause?.message??String(cause))]};}
  const batches=Array.isArray(manifest.batches)?manifest.batches:null;
  if(!batches)return{pass:false,status:'BLOCKED',errors:[makeError('GEMINI_EXECUTION_INBOX_BATCHES_INVALID','Evidence Inbox manifest batches must be an array')]};
  const index=batches.findIndex((row)=>row?.batchId===batchId);
  if(index<0)return{pass:false,status:'BLOCKED',errors:[makeError('GEMINI_EXECUTION_BATCH_NOT_FOUND',`Evidence Inbox batch not found: ${batchId}`,{batchId})]};
  const existing=batches[index]?.executionContext?.geminiExecution??null;
  if(existing&&JSON.stringify(existing)!==JSON.stringify(record))return{pass:false,status:'BLOCKED',errors:[makeError('GEMINI_EXECUTION_CONTEXT_CONFLICT','Evidence Inbox batch already contains different Gemini execution provenance',{batchId})]};
  const next=structuredClone(manifest);
  next.batches[index].executionContext={...(next.batches[index].executionContext??{}),geminiExecution:structuredClone(record)};
  try{writeAtomic(manifestPath,`${JSON.stringify(next,null,2)}\n`);}
  catch(cause){return{pass:false,status:'FAILED',errors:[makeError('GEMINI_EXECUTION_INBOX_WRITE_FAILED',cause?.message??String(cause),{manifestPath})]};}
  return{pass:true,status:'PERSISTED',manifestPath,batchId,geminiExecution:structuredClone(record),errors:[]};
}
