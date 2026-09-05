import fs from'node:fs';
import path from'node:path';
import{loadEvidenceInboxManifest}from'./evidence-inbox-store.mjs';
import{
  EVIDENCE_ADJUDICATION_STORE_FILE,loadEvidenceAdjudicationStore
}from'./evidence-adjudication-store.mjs';
import{buildTransportIssueReviewProvenance}from'./transport-issue-review-provenance.mjs';

const error=(code,message,details={})=>({code,message,...details});

function writeAtomic(filePath,content){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}

function loadPersistedTransportIssue(rootDir,batchId,issueId){
  const manifest=loadEvidenceInboxManifest(rootDir);
  const batch=manifest.batches.find((row)=>row.batchId===batchId);
  if(!batch)return{pass:false,error:error('TRANSPORT_ISSUE_BATCH_NOT_FOUND',`Evidence Inbox batch not found: ${batchId}`,{batchId})};
  if(!(batch.issueIds??[]).includes(issueId))return{pass:false,error:error('TRANSPORT_ISSUE_NOT_REGISTERED',`Transport issue ${issueId} is not registered in batch ${batchId}`,{batchId,issueId})};
  const rawPath=path.resolve(rootDir,batch.relativePath);
  if(!fs.existsSync(rawPath))return{pass:false,error:error('TRANSPORT_ISSUE_RAW_BATCH_MISSING',`Raw Evidence Inbox batch file is missing: ${batch.relativePath}`,{batchId,issueId})};
  const envelope=JSON.parse(fs.readFileSync(rawPath,'utf8'));
  const issue=envelope.issues?.find((row)=>row.id===issueId);
  if(!issue)return{pass:false,error:error('TRANSPORT_ISSUE_RAW_RECORD_MISSING',`Raw batch ${batchId} does not contain issue ${issueId}`,{batchId,issueId})};
  return{pass:true,issue,batch,rawPath};
}

export function registerPersistedTransportIssue({
  rootDir=path.resolve('data/evidence-inbox'),batchId,issueId,pendingId,
  severity='NON_BLOCKING',at=new Date().toISOString(),by='CHATGPT'
}={}){
  if(!pendingId)return{pass:false,status:'TRANSPORT_ISSUE_LINK_REJECTED',errors:[error('TRANSPORT_ISSUE_PENDING_ID_MISSING','pendingId is required')]};
  if(!['NON_BLOCKING','BLOCKING'].includes(severity))return{pass:false,status:'TRANSPORT_ISSUE_LINK_REJECTED',errors:[error('TRANSPORT_ISSUE_SEVERITY_INVALID',`Unsupported severity: ${severity}`)]};
  const loaded=loadPersistedTransportIssue(rootDir,batchId,issueId);
  if(!loaded.pass)return{pass:false,status:'TRANSPORT_ISSUE_LINK_REJECTED',errors:[loaded.error]};
  const provenance=buildTransportIssueReviewProvenance({batch:loaded.batch,issue:loaded.issue});
  if(!provenance.pass)return{pass:false,status:'TRANSPORT_ISSUE_PROVENANCE_BLOCKED',errors:provenance.errors};
  let store;
  try{store=loadEvidenceAdjudicationStore(rootDir);}catch(err){return{pass:false,status:'TRANSPORT_ISSUE_LINK_REJECTED',errors:[error('ADJUDICATION_STORE_INVALID',err.message)]};}
  if(store.pending.some((row)=>row.id===pendingId))return{pass:false,status:'TRANSPORT_ISSUE_LINK_REJECTED',errors:[error('PENDING_ID_CONFLICT',`PENDING id already exists: ${pendingId}`,{pendingId})]};
  if(store.pending.some((row)=>row.sourceBatchId===batchId&&row.sourceIssueId===issueId))return{pass:false,status:'TRANSPORT_ISSUE_LINK_REJECTED',errors:[error('TRANSPORT_ISSUE_ALREADY_LINKED',`Transport issue ${issueId} is already linked to PENDING`,{batchId,issueId})]};
  const pending={
    id:pendingId,
    status:'OPEN',
    severity,
    type:'TRANSPORT_ISSUE',
    field:loaded.issue.subjectField??null,
    productNodeId:null,
    question:loaded.issue.question,
    sourceBatchId:batchId,
    sourceIssueId:issueId,
    sourceIssueType:loaded.issue.type,
    sourceHint:loaded.issue.sourceHint??null,
    ...(provenance.record.status==='PASS'?{reviewProvenance:provenance.record}:{}),
    history:[{from:null,to:'OPEN',at,by}]
  };
  const nextStore={...store,updatedAt:at,pending:[...store.pending,pending]};
  const storePath=path.join(path.resolve(rootDir),EVIDENCE_ADJUDICATION_STORE_FILE);
  writeAtomic(storePath,`${JSON.stringify(nextStore,null,2)}\n`);
  return{pass:true,status:'TRANSPORT_ISSUE_LINKED_TO_PENDING',pending,reviewProvenance:provenance.record,storePath,errors:[]};
}
