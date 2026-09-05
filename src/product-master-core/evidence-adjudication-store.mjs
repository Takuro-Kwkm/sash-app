import fs from'node:fs';
import path from'node:path';
import{CANONICAL_FIELD_NAMES}from'./canonical-fields.mjs';
import{adjudicateEvidenceCandidate}from'./evidence-adjudication.mjs';
import{markCandidateUnderReview}from'./evidence-inbox.mjs';
import{evidenceClaimFingerprint,loadEvidenceInboxManifest}from'./evidence-inbox-store.mjs';
import{buildEvidenceReviewProvenance,validateEvidenceReviewProvenance}from'./evidence-review-provenance.mjs';
import{validateEvidenceRecord}from'./evidence-schema.mjs';
import{transitionPending}from'./pending-lifecycle.mjs';

export const EVIDENCE_ADJUDICATION_STORE_SCHEMA_VERSION='1.0';
export const EVIDENCE_ADJUDICATION_STORE_FILE='adjudication-state.json';

const error=(code,message,details={})=>({code,message,...details});
const emptyStore=()=>({
  adjudicationStoreSchemaVersion:EVIDENCE_ADJUDICATION_STORE_SCHEMA_VERSION,
  recordType:'EVIDENCE_ADJUDICATION_STORE',
  updatedAt:null,
  candidateStates:[],
  adjudications:[],
  canonicalEvidence:[],
  pending:[]
});

function validateStore(store){
  if(!store||typeof store!=='object'||Array.isArray(store))throw new Error('Evidence adjudication store must be an object');
  if(store.adjudicationStoreSchemaVersion!==EVIDENCE_ADJUDICATION_STORE_SCHEMA_VERSION)throw new Error(`Unsupported Evidence adjudication store schema: ${store.adjudicationStoreSchemaVersion}`);
  if(store.recordType!=='EVIDENCE_ADJUDICATION_STORE')throw new Error(`Invalid Evidence adjudication store recordType: ${store.recordType}`);
  for(const key of['candidateStates','adjudications','canonicalEvidence','pending'])if(!Array.isArray(store[key]))throw new Error(`Evidence adjudication store ${key} must be an array`);
  return store;
}

function writeAtomic(filePath,content){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}

export function loadEvidenceAdjudicationStore(rootDir=path.resolve('data/evidence-inbox')){
  const filePath=path.join(path.resolve(rootDir),EVIDENCE_ADJUDICATION_STORE_FILE);
  if(!fs.existsSync(filePath))return emptyStore();
  return validateStore(JSON.parse(fs.readFileSync(filePath,'utf8')));
}

function saveStore(rootDir,store){
  const filePath=path.join(path.resolve(rootDir),EVIDENCE_ADJUDICATION_STORE_FILE);
  writeAtomic(filePath,`${JSON.stringify(validateStore(store),null,2)}\n`);
  return filePath;
}

function loadPersistedCandidate(rootDir,batchId,candidateId){
  const manifest=loadEvidenceInboxManifest(rootDir);
  const batch=manifest.batches.find((row)=>row.batchId===batchId);
  if(!batch)return{pass:false,error:error('ADJUDICATION_BATCH_NOT_FOUND',`Evidence Inbox batch not found: ${batchId}`,{batchId})};
  if(!(batch.candidateIds??[]).includes(candidateId))return{pass:false,error:error('ADJUDICATION_CANDIDATE_NOT_FOUND',`Candidate ${candidateId} is not registered in batch ${batchId}`,{batchId,candidateId})};
  const rawPath=path.resolve(rootDir,batch.relativePath);
  if(!fs.existsSync(rawPath))return{pass:false,error:error('ADJUDICATION_RAW_BATCH_MISSING',`Raw Evidence Inbox batch file is missing: ${batch.relativePath}`,{batchId,candidateId})};
  const envelope=JSON.parse(fs.readFileSync(rawPath,'utf8'));
  const candidate=envelope.candidates?.find((row)=>row.id===candidateId);
  if(!candidate)return{pass:false,error:error('ADJUDICATION_RAW_CANDIDATE_MISSING',`Raw batch ${batchId} does not contain candidate ${candidateId}`,{batchId,candidateId})};
  return{pass:true,candidate:structuredClone(candidate),batch,rawPath};
}

function candidateStateFor(store,batchId,candidateId){
  return store.candidateStates.find((row)=>row.batchId===batchId&&row.candidateId===candidateId)??null;
}

function effectiveCandidate(rawCandidate,state){
  if(!state)return rawCandidate;
  return{
    ...rawCandidate,
    status:state.status,
    ...(state.review?{review:structuredClone(state.review)}:{}),
    ...(state.adjudicationId?{adjudicationId:state.adjudicationId}:{})
  };
}

function upsertCandidateState(store,nextState){
  const index=store.candidateStates.findIndex((row)=>row.batchId===nextState.batchId&&row.candidateId===nextState.candidateId);
  const candidateStates=[...store.candidateStates];
  if(index<0)candidateStates.push(nextState);else candidateStates[index]=nextState;
  return{...store,candidateStates};
}

function canonicalConflictReport(evidence,store,{existingCanonicalEvidence=[]}={}){
  const conflicts=[];
  const all=[...store.canonicalEvidence,...existingCanonicalEvidence];
  const sameId=all.find((row)=>row?.id===evidence.id);
  if(sameId)conflicts.push(error('CANONICAL_EVIDENCE_ID_CONFLICT',`Canonical Evidence id already exists: ${evidence.id}`,{evidenceId:evidence.id}));
  const fingerprint=evidenceClaimFingerprint(evidence);
  const duplicate=all.find((row)=>row&&evidenceClaimFingerprint(row)===fingerprint);
  if(duplicate)conflicts.push(error('CANONICAL_EVIDENCE_DUPLICATE_CLAIM',`Canonical Evidence duplicates existing source claim ${duplicate.id}`,{evidenceId:evidence.id,existingEvidenceId:duplicate.id,fingerprint}));
  return{pass:conflicts.length===0,conflicts,fingerprint};
}

function reviewProvenanceFor(loaded,candidate,currentState=null){
  const built=buildEvidenceReviewProvenance({batch:loaded.batch,candidate});
  if(!built.pass)return built;
  if(currentState?.reviewProvenance){
    const existing=validateEvidenceReviewProvenance(currentState.reviewProvenance,{batch:loaded.batch,candidate});
    if(!existing.pass)return{pass:false,record:null,errors:existing.errors};
    const keys=['status','governed','batchId','candidateId','candidateFingerprint','batchRawSha256','executionChannel','executionReference'];
    for(const key of keys){
      if((currentState.reviewProvenance[key]??null)!==(built.record[key]??null))return{pass:false,record:null,errors:[error('REVIEW_PROVENANCE_STATE_DRIFT',`Persisted review provenance ${key} no longer matches Inbox provenance`,{field:key,expected:built.record[key]??null,actual:currentState.reviewProvenance[key]??null})]};
    }
  }
  return built;
}

export function persistCandidateUnderReview({
  rootDir=path.resolve('data/evidence-inbox'),batchId,candidateId,
  at=new Date().toISOString(),by='CHATGPT'
}={}){
  const loaded=loadPersistedCandidate(rootDir,batchId,candidateId);
  if(!loaded.pass)return{pass:false,status:'REVIEW_TRANSITION_REJECTED',errors:[loaded.error]};
  let store;
  try{store=loadEvidenceAdjudicationStore(rootDir);}catch(err){return{pass:false,status:'REVIEW_TRANSITION_REJECTED',errors:[error('ADJUDICATION_STORE_INVALID',err.message)]};}
  const currentState=candidateStateFor(store,batchId,candidateId);
  const candidate=effectiveCandidate(loaded.candidate,currentState);
  const provenance=reviewProvenanceFor(loaded,candidate,currentState);
  if(!provenance.pass)return{pass:false,status:'REVIEW_PROVENANCE_BLOCKED',errors:provenance.errors};
  let reviewed;
  try{reviewed=markCandidateUnderReview(candidate,{at,by});}catch(err){return{pass:false,status:'REVIEW_TRANSITION_REJECTED',errors:[error('CANDIDATE_REVIEW_TRANSITION_INVALID',err.message,{batchId,candidateId})]};}
  const history=[...(currentState?.history??[]),{from:candidate.status,to:'UNDER_REVIEW',at,by}];
  const nextState={
    batchId,candidateId,status:'UNDER_REVIEW',review:reviewed.review,
    ...(provenance.record.governed?{reviewProvenance:provenance.record}:{}),
    history
  };
  const nextStore=upsertCandidateState({...store,updatedAt:at},nextState);
  const storePath=saveStore(rootDir,nextStore);
  return{pass:true,status:'CANDIDATE_UNDER_REVIEW',batchId,candidateId,candidateStatus:'UNDER_REVIEW',reviewProvenance:provenance.record,storePath,canonicalWritePerformed:false,errors:[]};
}

export function adjudicatePersistedCandidate({
  rootDir=path.resolve('data/evidence-inbox'),batchId,candidateId,decision,
  adjudicatorType='CHATGPT',adjudicatedBy='CHATGPT',reason,
  canonicalEvidenceId=null,pendingId=null,pendingSeverity='NON_BLOCKING',pendingQuestion=null,
  existingCanonicalEvidence=[],knownFields=CANONICAL_FIELD_NAMES,nodeIds=null,
  at=new Date().toISOString()
}={}){
  const loaded=loadPersistedCandidate(rootDir,batchId,candidateId);
  if(!loaded.pass)return{pass:false,status:'ADJUDICATION_REJECTED',errors:[loaded.error]};
  let store;
  try{store=loadEvidenceAdjudicationStore(rootDir);}catch(err){return{pass:false,status:'ADJUDICATION_REJECTED',errors:[error('ADJUDICATION_STORE_INVALID',err.message)]};}
  const currentState=candidateStateFor(store,batchId,candidateId);
  const candidate=effectiveCandidate(loaded.candidate,currentState);
  const provenance=reviewProvenanceFor(loaded,candidate,currentState);
  if(!provenance.pass)return{pass:false,status:'ADJUDICATION_PROVENANCE_BLOCKED',errors:provenance.errors};
  const governedReviewProvenance=provenance.record.governed?provenance.record:null;
  let outcome;
  try{
    outcome=adjudicateEvidenceCandidate(candidate,decision,{adjudicatorType,adjudicatedBy,reason,canonicalEvidenceId,pendingId,pendingSeverity,pendingQuestion,reviewProvenance:governedReviewProvenance,at});
  }catch(err){return{pass:false,status:'ADJUDICATION_REJECTED',errors:[error('ADJUDICATION_DECISION_INVALID',err.message,{batchId,candidateId,decision})]};}

  if(outcome.evidence){
    const validationNodeIds=nodeIds??new Set(candidate.productNodeIds??[]);
    const validation=validateEvidenceRecord(outcome.evidence,{knownFields,nodeIds:validationNodeIds});
    if(!validation.pass)return{pass:false,status:'CANONICAL_PROMOTION_REJECTED',errors:validation.errors.map((row)=>error(row.code,row.message,{candidateId}))};
    const conflicts=canonicalConflictReport(outcome.evidence,store,{existingCanonicalEvidence});
    if(!conflicts.pass)return{pass:false,status:'CANONICAL_PROMOTION_REJECTED',errors:conflicts.conflicts};
  }

  if(outcome.pending&&store.pending.some((row)=>row.id===outcome.pending.id))return{pass:false,status:'PENDING_LINK_REJECTED',errors:[error('PENDING_ID_CONFLICT',`PENDING id already exists: ${outcome.pending.id}`,{pendingId:outcome.pending.id})]};
  if(store.adjudications.some((row)=>row.id===outcome.audit.id))return{pass:false,status:'ADJUDICATION_REJECTED',errors:[error('ADJUDICATION_ID_CONFLICT',`Adjudication id already exists: ${outcome.audit.id}`,{adjudicationId:outcome.audit.id})]};

  const history=[...(currentState?.history??[]),{from:candidate.status,to:'ADJUDICATED',at,by:adjudicatedBy,decision}];
  const nextCandidateState={
    batchId,candidateId,status:'ADJUDICATED',adjudicationId:outcome.audit.id,
    ...(governedReviewProvenance?{reviewProvenance:governedReviewProvenance}:{}),
    history
  };
  let nextStore=upsertCandidateState(store,nextCandidateState);
  nextStore={
    ...nextStore,
    updatedAt:at,
    adjudications:[...nextStore.adjudications,{...outcome.audit,batchId}],
    canonicalEvidence:outcome.evidence?[...nextStore.canonicalEvidence,outcome.evidence]:nextStore.canonicalEvidence,
    pending:outcome.pending?[...nextStore.pending,outcome.pending]:nextStore.pending
  };
  const storePath=saveStore(rootDir,nextStore);
  return{
    pass:true,
    status:decision==='ACCEPT'?'CANONICAL_EVIDENCE_PROMOTED':decision==='PENDING'?'PENDING_LINKED':'CANDIDATE_REJECTED_WITH_AUDIT',
    batchId,candidateId,decision,candidateStatus:'ADJUDICATED',
    adjudicationId:outcome.audit.id,
    reviewProvenance:provenance.record,
    canonicalEvidence:outcome.evidence??null,
    pending:outcome.pending??null,
    storePath,
    canonicalWritePerformed:Boolean(outcome.evidence),
    productionMasterWritePerformed:false,
    errors:[]
  };
}

export function transitionPersistedPending({
  rootDir=path.resolve('data/evidence-inbox'),pendingId,nextStatus,
  evidenceIds=[],technicalFactIds=[],ruleIds=[],resolutionNote=null,
  externalCanonicalEvidenceIds=[],externalTechnicalFactIds=[],
  at=new Date().toISOString(),by='CHATGPT'
}={}){
  let store;
  try{store=loadEvidenceAdjudicationStore(rootDir);}catch(err){return{pass:false,status:'PENDING_TRANSITION_REJECTED',errors:[error('ADJUDICATION_STORE_INVALID',err.message)]};}
  const index=store.pending.findIndex((row)=>row.id===pendingId);
  if(index<0)return{pass:false,status:'PENDING_TRANSITION_REJECTED',errors:[error('PENDING_NOT_FOUND',`PENDING not found: ${pendingId}`,{pendingId})]};
  if(nextStatus==='RESOLVED'){
    const knownEvidenceIds=new Set([...store.canonicalEvidence.map((row)=>row.id),...externalCanonicalEvidenceIds]);
    const unknownEvidence=evidenceIds.filter((id)=>!knownEvidenceIds.has(id));
    if(unknownEvidence.length)return{pass:false,status:'PENDING_TRANSITION_REJECTED',errors:[error('PENDING_RESOLUTION_EVIDENCE_UNKNOWN',`PENDING resolution references unknown Evidence: ${unknownEvidence.join(', ')}`,{pendingId,unknownEvidenceIds:unknownEvidence})]};
    const knownTechnicalFactIds=new Set(externalTechnicalFactIds);
    const unknownFacts=technicalFactIds.filter((id)=>!knownTechnicalFactIds.has(id));
    if(unknownFacts.length)return{pass:false,status:'PENDING_TRANSITION_REJECTED',errors:[error('PENDING_RESOLUTION_TECHNICAL_FACT_UNKNOWN',`PENDING resolution references unknown Technical Fact: ${unknownFacts.join(', ')}`,{pendingId,unknownTechnicalFactIds:unknownFacts})]};
  }
  let transitioned;
  try{transitioned=transitionPending(store.pending[index],nextStatus,{evidenceIds,technicalFactIds,ruleIds,resolutionNote,at,by});}catch(err){return{pass:false,status:'PENDING_TRANSITION_REJECTED',errors:[error('PENDING_TRANSITION_INVALID',err.message,{pendingId,nextStatus})]};}
  const pending=[...store.pending];
  pending[index]=transitioned;
  const nextStore={...store,updatedAt:at,pending};
  const storePath=saveStore(rootDir,nextStore);
  return{pass:true,status:'PENDING_TRANSITION_PERSISTED',pending:transitioned,storePath,errors:[]};
}

export function evidenceAdjudicationSummary(rootDir=path.resolve('data/evidence-inbox')){
  const store=loadEvidenceAdjudicationStore(rootDir);
  const statuses={SUBMITTED:0,UNDER_REVIEW:0,ADJUDICATED:0};
  for(const row of store.candidateStates)if(statuses[row.status]!==undefined)statuses[row.status]+=1;
  const decisions={ACCEPT:0,REJECT:0,PENDING:0};
  for(const row of store.adjudications)if(decisions[row.decision]!==undefined)decisions[row.decision]+=1;
  return{
    updatedAt:store.updatedAt,
    candidateStates:store.candidateStates.length,
    statuses,
    adjudications:store.adjudications.length,
    decisions,
    canonicalEvidence:store.canonicalEvidence.length,
    pending:store.pending.length,
    openPending:store.pending.filter((row)=>['OPEN','INVESTIGATING'].includes(row.status)).length
  };
}
