import crypto from'node:crypto';
import fs from'node:fs';
import path from'node:path';
import{importGeminiTransport}from'./gemini-transport.mjs';

export const EVIDENCE_INBOX_STORE_SCHEMA_VERSION='1.0';
export const EVIDENCE_INBOX_MANIFEST_FILE='manifest.json';

const error=(code,message,details={})=>({code,message,...details});
const normalizeText=(value)=>String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');
const emptyManifest=()=>({
  inboxSchemaVersion:EVIDENCE_INBOX_STORE_SCHEMA_VERSION,
  recordType:'EVIDENCE_INBOX_MANIFEST',
  updatedAt:null,
  batches:[]
});

function safeBatchFileName(batchId){
  if(typeof batchId!=='string'||!batchId)return null;
  if(!/^[A-Za-z0-9._-]+$/.test(batchId))return null;
  return`${batchId}.json`;
}

function validateManifest(manifest){
  if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw new Error('Evidence Inbox manifest must be an object');
  if(manifest.inboxSchemaVersion!==EVIDENCE_INBOX_STORE_SCHEMA_VERSION)throw new Error(`Unsupported Evidence Inbox manifest schema: ${manifest.inboxSchemaVersion}`);
  if(manifest.recordType!=='EVIDENCE_INBOX_MANIFEST')throw new Error(`Invalid Evidence Inbox manifest recordType: ${manifest.recordType}`);
  if(!Array.isArray(manifest.batches))throw new Error('Evidence Inbox manifest batches must be an array');
  return manifest;
}

export function loadEvidenceInboxManifest(rootDir){
  const absolute=path.resolve(rootDir);
  const manifestPath=path.join(absolute,EVIDENCE_INBOX_MANIFEST_FILE);
  if(!fs.existsSync(manifestPath))return emptyManifest();
  const parsed=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  return validateManifest(parsed);
}

export function createGlobalInboxRecordId(batchId,kind,ordinal){
  const file=safeBatchFileName(batchId);
  if(!file)throw new Error(`Unsafe batchId for global record id: ${batchId}`);
  if(!['CAND','ISSUE'].includes(kind))throw new Error(`Unsupported Evidence Inbox record kind: ${kind}`);
  if(!Number.isInteger(ordinal)||ordinal<1)throw new Error('Global record id ordinal must be a positive integer');
  const namespace=batchId.replace(/^BATCH-/,'');
  return`${kind}-${namespace}-${String(ordinal).padStart(3,'0')}`;
}

export function evidenceClaimFingerprint(candidate){
  const source=candidate?.source??{};
  const payload={
    productId:normalizeText(candidate?.productId),
    subjectField:normalizeText(candidate?.subjectField),
    claim:normalizeText(candidate?.claim),
    productNodeIds:[...(candidate?.productNodeIds??[])].map(normalizeText).sort(),
    source:{
      type:normalizeText(source.type),
      driveFileId:normalizeText(source.driveFileId),
      title:normalizeText(source.title),
      version:normalizeText(source.version)
    }
  };
  return sha256(JSON.stringify(payload));
}

function manifestIndexes(manifest){
  const batchIds=new Set();
  const recordIds=new Map();
  const fingerprints=new Map();
  for(const batch of manifest.batches){
    if(batch?.batchId)batchIds.add(batch.batchId);
    for(const id of batch?.candidateIds??[])recordIds.set(id,{batchId:batch.batchId,recordType:'CANDIDATE'});
    for(const id of batch?.issueIds??[])recordIds.set(id,{batchId:batch.batchId,recordType:'ISSUE'});
    for(const row of batch?.candidateFingerprints??[])if(row?.fingerprint)fingerprints.set(row.fingerprint,{batchId:batch.batchId,candidateId:row.candidateId});
  }
  return{batchIds,recordIds,fingerprints};
}

export function inspectEvidenceInboxConflicts(imported,manifest,{allowDuplicateClaims=false}={}){
  const conflicts=[];
  const indexes=manifestIndexes(validateManifest(manifest));
  if(indexes.batchIds.has(imported.batch.id))conflicts.push(error('INBOX_BATCH_ID_CONFLICT',`Evidence Inbox already contains batchId ${imported.batch.id}`,{batchId:imported.batch.id}));

  const incomingRows=[
    ...imported.candidates.map((row)=>({id:row.id,recordType:'CANDIDATE'})),
    ...imported.issues.map((row)=>({id:row.id,recordType:'ISSUE'}))
  ];
  for(const row of incomingRows){
    const existing=indexes.recordIds.get(row.id);
    if(existing)conflicts.push(error('INBOX_GLOBAL_RECORD_ID_CONFLICT',`Record id ${row.id} already exists in batch ${existing.batchId}`,{recordId:row.id,existingBatchId:existing.batchId,incomingBatchId:imported.batch.id}));
  }

  if(!allowDuplicateClaims){
    for(const candidate of imported.candidates){
      const fingerprint=evidenceClaimFingerprint(candidate);
      const existing=indexes.fingerprints.get(fingerprint);
      if(existing)conflicts.push(error('INBOX_DUPLICATE_CLAIM',`Candidate ${candidate.id} duplicates a source claim already stored as ${existing.candidateId}`,{candidateId:candidate.id,existingCandidateId:existing.candidateId,existingBatchId:existing.batchId,fingerprint}));
    }
  }
  return{pass:conflicts.length===0,conflicts};
}

function writeAtomic(filePath,content){
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}

export function persistGeminiTransport(raw,{
  rootDir=path.resolve('data/evidence-inbox'),
  allowDuplicateClaims=false,
  importedAt=new Date().toISOString(),
  ...transportOptions
}={}){
  let manifest;
  try{manifest=loadEvidenceInboxManifest(rootDir);}catch(err){return{pass:false,status:'REJECTED_AT_EVIDENCE_INBOX',errors:[error('INBOX_MANIFEST_INVALID',err.message)]};}

  const imported=importGeminiTransport(raw,transportOptions);
  if(!imported.pass)return{pass:false,status:'REJECTED_AT_TRANSPORT_BOUNDARY',errors:imported.errors};

  const fileName=safeBatchFileName(imported.batch.id);
  if(!fileName)return{pass:false,status:'REJECTED_AT_EVIDENCE_INBOX',errors:[error('INBOX_BATCH_ID_UNSAFE',`batchId cannot be used as an Inbox filename: ${imported.batch.id}`)]};

  const conflictReport=inspectEvidenceInboxConflicts(imported,manifest,{allowDuplicateClaims});
  if(!conflictReport.pass)return{pass:false,status:'REJECTED_AT_EVIDENCE_INBOX',errors:conflictReport.conflicts};

  const absoluteRoot=path.resolve(rootDir);
  const batchesDir=path.join(absoluteRoot,'batches');
  const batchPath=path.join(batchesDir,fileName);
  const manifestPath=path.join(absoluteRoot,EVIDENCE_INBOX_MANIFEST_FILE);
  fs.mkdirSync(batchesDir,{recursive:true});

  const candidateFingerprints=imported.candidates.map((candidate)=>({candidateId:candidate.id,fingerprint:evidenceClaimFingerprint(candidate)}));
  const manifestEntry={
    batchId:imported.batch.id,
    importedAt,
    generatedAt:imported.batch.generatedAt,
    producer:{...imported.batch.producer},
    productId:imported.batch.productId,
    sourceContext:{...imported.batch.sourceContext},
    relativePath:path.posix.join('batches',fileName),
    rawSha256:sha256(raw),
    candidateIds:imported.candidates.map((row)=>row.id),
    issueIds:imported.issues.map((row)=>row.id),
    candidateFingerprints
  };
  const nextManifest={...manifest,updatedAt:importedAt,batches:[...manifest.batches,manifestEntry]};

  try{
    writeAtomic(batchPath,raw);
    writeAtomic(manifestPath,`${JSON.stringify(nextManifest,null,2)}\n`);
  }catch(err){
    return{pass:false,status:'EVIDENCE_INBOX_WRITE_FAILED',errors:[error('INBOX_WRITE_FAILED',err.message,{batchPath,manifestPath})]};
  }

  return{
    pass:true,
    status:'PERSISTED_TO_EVIDENCE_INBOX',
    canonicalWritePerformed:false,
    batch:imported.batch,
    candidateCount:imported.candidates.length,
    issueCount:imported.issues.length,
    batchPath,
    manifestPath,
    rawSha256:manifestEntry.rawSha256,
    nextAction:'CHATGPT_OR_HUMAN_ADJUDICATION_REQUIRED',
    errors:[]
  };
}
