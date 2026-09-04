import fs from'node:fs';
import path from'node:path';

export const PRODUCT_MASTER_REVIEW_QUEUE_SCHEMA_VERSION='1.0';
export const PRODUCT_MASTER_REVIEW_STATUSES=new Set([
  'SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','NEEDS_REVIEW','HUMAN_REQUIRED','APPLIED','RESOLVED','BLOCKED'
]);

const ACTIONABLE_STATUSES=new Set(['SUBMITTED','UNDER_REVIEW','NEEDS_REVIEW','HUMAN_REQUIRED','APPROVED','BLOCKED']);
const readJson=(filePath)=>JSON.parse(fs.readFileSync(filePath,'utf8'));
const exists=(filePath)=>fs.existsSync(filePath);
const safeArray=(value)=>Array.isArray(value)?value:[];
const stripSuffix=(name,suffix)=>name.endsWith(suffix)?name.slice(0,-suffix.length):name;

function readJsonDirectory(dir){
  if(!exists(dir))return[];
  return fs.readdirSync(dir,{withFileTypes:true})
    .filter((entry)=>entry.isFile()&&entry.name.endsWith('.json'))
    .sort((a,b)=>a.name.localeCompare(b.name))
    .map((entry)=>{
      const filePath=path.join(dir,entry.name);
      try{return{fileName:entry.name,filePath,data:readJson(filePath),error:null};}
      catch(cause){return{fileName:entry.name,filePath,data:null,error:cause.message};}
    });
}

function proposalIdOf(row){
  const data=row?.data??{};
  return data.proposalId??data.id??data.proposal?.id??
    stripSuffix(stripSuffix(stripSuffix(stripSuffix(stripSuffix(stripSuffix(row.fileName,'.manifest.json'),'.approval.json'),'.production-approval.json'),'.production-preview.json'),'.staging.json'),'.applied.json');
}

function productIdOf(data){
  return data?.productId??data?.proposal?.productId??data?.target?.productId??null;
}

function candidateReviewStatus({candidate,state,audit,pending}){
  const sourceStatus=state?.status??candidate?.status??'SUBMITTED';
  if(sourceStatus==='SUBMITTED')return{reviewStatus:'SUBMITTED',nextAction:'START_EVIDENCE_REVIEW',authority:'CHATGPT_OR_HUMAN'};
  if(sourceStatus==='UNDER_REVIEW')return{reviewStatus:'UNDER_REVIEW',nextAction:'ADJUDICATE_EVIDENCE',authority:'CHATGPT_OR_HUMAN'};
  if(sourceStatus!=='ADJUDICATED')return{reviewStatus:'BLOCKED',nextAction:'INSPECT_EVIDENCE_STATE',authority:'CHATGPT_OR_HUMAN'};
  if(audit?.decision==='ACCEPT')return{reviewStatus:'APPROVED',nextAction:'NONE',authority:null};
  if(audit?.decision==='REJECT')return{reviewStatus:'REJECTED',nextAction:'NONE',authority:null};
  if(audit?.decision==='PENDING'){
    if(['RESOLVED'].includes(pending?.status))return{reviewStatus:'RESOLVED',nextAction:'NONE',authority:null};
    if(['REJECTED'].includes(pending?.status))return{reviewStatus:'REJECTED',nextAction:'NONE',authority:null};
    return{reviewStatus:'NEEDS_REVIEW',nextAction:'RESOLVE_EVIDENCE_PENDING',authority:'CHATGPT_OR_HUMAN'};
  }
  return{reviewStatus:'BLOCKED',nextAction:'INSPECT_MISSING_ADJUDICATION',authority:'CHATGPT_OR_HUMAN'};
}

function evidenceQueueItems(evidenceInboxDir){
  const manifestPath=path.join(evidenceInboxDir,'manifest.json');
  const statePath=path.join(evidenceInboxDir,'adjudication-state.json');
  if(!exists(manifestPath))return[];
  const manifest=readJson(manifestPath);
  const state=exists(statePath)?readJson(statePath):{candidateStates:[],adjudications:[],pending:[]};
  const items=[];
  for(const batch of safeArray(manifest.batches)){
    if(!batch?.batchId||!batch?.relativePath)continue;
    const batchPath=path.resolve(evidenceInboxDir,batch.relativePath);
    if(!exists(batchPath)){
      items.push({
        queueId:`RQ:EVIDENCE_BATCH:${batch.batchId}`,kind:'EVIDENCE_BATCH',productId:batch.productId??null,
        sourceId:batch.batchId,sourceStatus:'RAW_BATCH_MISSING',reviewStatus:'BLOCKED',actionable:true,
        authority:'CHATGPT_OR_HUMAN',nextAction:'RESTORE_RAW_EVIDENCE_BATCH',queueReason:`Raw Evidence batch is missing: ${batch.relativePath}`,
        refs:{batchId:batch.batchId,relativePath:batch.relativePath}
      });
      continue;
    }
    const envelope=readJson(batchPath);
    for(const candidate of safeArray(envelope.candidates)){
      const stateRow=safeArray(state.candidateStates).find((row)=>row.batchId===batch.batchId&&row.candidateId===candidate.id)??null;
      const audit=safeArray(state.adjudications).find((row)=>row.candidateId===candidate.id&&(!row.batchId||row.batchId===batch.batchId))??null;
      const pending=safeArray(state.pending).find((row)=>row.sourceCandidateId===candidate.id)??null;
      const mapped=candidateReviewStatus({candidate,state:stateRow,audit,pending});
      items.push({
        queueId:`RQ:EVIDENCE:${batch.batchId}:${candidate.id}`,kind:'EVIDENCE_CANDIDATE',
        productId:candidate.productId??envelope.productId??batch.productId??null,sourceId:candidate.id,
        sourceStatus:stateRow?.status??candidate.status??'SUBMITTED',sourceDecision:audit?.decision??null,
        reviewStatus:mapped.reviewStatus,actionable:ACTIONABLE_STATUSES.has(mapped.reviewStatus),authority:mapped.authority,
        nextAction:mapped.nextAction,queueReason:pending?.question??candidate.claim??candidate.title??null,
        refs:{batchId:batch.batchId,candidateId:candidate.id,pendingId:pending?.id??null,adjudicationId:audit?.id??null,relativePath:batch.relativePath}
      });
    }
  }
  return items;
}

function indexArtifacts(rows){
  const map=new Map();
  for(const row of rows){
    const id=proposalIdOf(row);
    if(!id)continue;
    if(!map.has(id))map.set(id,[]);
    map.get(id).push(row);
  }
  return map;
}

function proposalEffectiveState({proposal,approval,staging,productionApproval,production,rollback}){
  const declared=proposal?.status??proposal?.proposal?.status??'PROPOSED';
  if(rollback)return{sourceStatus:'ROLLED_BACK',reviewStatus:'NEEDS_REVIEW',authority:'HUMAN',nextAction:'REASSESS_ROLLED_BACK_CHANGE'};
  if(production){
    const status=production.status??'PRODUCTION_APPLIED';
    if(/NOOP/i.test(status)||production.recordType==='PRODUCT_MASTER_PRODUCTION_NOOP')return{sourceStatus:status,reviewStatus:'APPLIED',authority:null,nextAction:'NONE'};
    return{sourceStatus:status,reviewStatus:'APPLIED',authority:null,nextAction:'NONE'};
  }
  if(productionApproval)return{sourceStatus:productionApproval.status??'PRODUCTION_APPROVED',reviewStatus:'APPROVED',authority:null,nextAction:'RUN_PRODUCTION_GATE'};
  if(staging)return{sourceStatus:staging.status??'STAGING_APPLIED',reviewStatus:'APPLIED',authority:null,nextAction:'RUN_PRODUCTION_PREVIEW_OR_GATE'};
  if(approval)return{sourceStatus:approval.status??'APPROVED',reviewStatus:'APPROVED',authority:null,nextAction:'RUN_CONTROLLED_STAGING'};
  if(declared==='REJECTED')return{sourceStatus:'REJECTED',reviewStatus:'REJECTED',authority:null,nextAction:'NONE'};
  if(declared==='APPROVED')return{sourceStatus:'APPROVED',reviewStatus:'APPROVED',authority:null,nextAction:'RUN_CONTROLLED_STAGING'};
  if(declared==='APPLIED')return{sourceStatus:'APPLIED',reviewStatus:'APPLIED',authority:null,nextAction:'NONE'};
  return{sourceStatus:declared,reviewStatus:'HUMAN_REQUIRED',authority:'HUMAN',nextAction:'HUMAN_APPROVE_OR_REJECT_PROPOSAL'};
}

function firstArtifact(index,id){return index.get(id)?.[0]?.data??null;}

function proposalQueueItems(changeControlDir){
  const proposalRows=readJsonDirectory(path.join(changeControlDir,'proposals')).filter((row)=>row.data);
  if(!proposalRows.length)return[];
  const approvals=indexArtifacts(readJsonDirectory(path.join(changeControlDir,'approvals')).filter((row)=>row.data));
  const staging=indexArtifacts(readJsonDirectory(path.join(changeControlDir,'applied')).filter((row)=>row.data));
  const productionApprovals=indexArtifacts(readJsonDirectory(path.join(changeControlDir,'production-approvals')).filter((row)=>row.data));
  const production=indexArtifacts(readJsonDirectory(path.join(changeControlDir,'production')).filter((row)=>row.data));
  const rollbacks=indexArtifacts(readJsonDirectory(path.join(changeControlDir,'production-rollbacks')).filter((row)=>row.data));
  return proposalRows.map((row)=>{
    const proposal=row.data;
    const proposalId=proposalIdOf(row);
    const approval=firstArtifact(approvals,proposalId);
    const stagingRecord=firstArtifact(staging,proposalId);
    const productionApproval=firstArtifact(productionApprovals,proposalId);
    const productionRecord=firstArtifact(production,proposalId);
    const rollback=firstArtifact(rollbacks,proposalId);
    const mapped=proposalEffectiveState({proposal,approval,staging:stagingRecord,productionApproval,production:productionRecord,rollback});
    const productId=productIdOf(proposal)??productIdOf(approval)??productIdOf(productionRecord);
    return{
      queueId:`RQ:PROPOSAL:${proposalId}`,kind:'MASTER_CHANGE_PROPOSAL',productId,sourceId:proposalId,
      sourceStatus:mapped.sourceStatus,reviewStatus:mapped.reviewStatus,actionable:ACTIONABLE_STATUSES.has(mapped.reviewStatus),
      authority:mapped.authority,nextAction:mapped.nextAction,
      queueReason:proposal.summary??proposal.changeSummary??proposal.targetEntity??proposal.targetRuleId??null,
      refs:{proposalPath:path.relative(process.cwd(),row.filePath),proposalFingerprint:proposal.proposalFingerprint??proposal.fingerprint??null},
      artifactState:{approval:Boolean(approval),staging:Boolean(stagingRecord),productionApproval:Boolean(productionApproval),production:Boolean(productionRecord),rollback:Boolean(rollback)}
    };
  });
}

export function buildProductMasterReviewQueue({
  evidenceInboxDir=path.resolve('data/evidence-inbox'),
  changeControlDir=path.resolve('data/master-change-control'),
  productId=null,status=null,kind=null,actionableOnly=false,generatedAt=new Date().toISOString()
}={}){
  let items=[...evidenceQueueItems(path.resolve(evidenceInboxDir)),...proposalQueueItems(path.resolve(changeControlDir))];
  if(productId)items=items.filter((row)=>row.productId===productId);
  if(status)items=items.filter((row)=>row.reviewStatus===status);
  if(kind)items=items.filter((row)=>row.kind===kind);
  if(actionableOnly)items=items.filter((row)=>row.actionable);
  items.sort((a,b)=>`${a.productId??''}|${a.kind}|${a.sourceId}`.localeCompare(`${b.productId??''}|${b.kind}|${b.sourceId}`));
  const byStatus=Object.fromEntries([...PRODUCT_MASTER_REVIEW_STATUSES].map((key)=>[key,0]));
  const byKind={EVIDENCE_CANDIDATE:0,EVIDENCE_BATCH:0,MASTER_CHANGE_PROPOSAL:0};
  for(const item of items){
    if(byStatus[item.reviewStatus]!==undefined)byStatus[item.reviewStatus]+=1;
    byKind[item.kind]=(byKind[item.kind]??0)+1;
  }
  return{
    reviewQueueSchemaVersion:PRODUCT_MASTER_REVIEW_QUEUE_SCHEMA_VERSION,
    recordType:'PRODUCT_MASTER_REVIEW_QUEUE',generatedAt,
    filters:{productId,status,kind,actionableOnly},
    summary:{total:items.length,actionable:items.filter((row)=>row.actionable).length,byStatus,byKind},
    items,
    authorityBoundary:{
      evidenceAdjudication:'CHATGPT_OR_HUMAN',masterChangeApproval:'HUMAN_REQUIRED',
      queueMutationAuthority:'NONE',productionMasterAutoWrite:false,runtimeAutoWrite:false
    }
  };
}
