export const WORKER_LIVENESS_SCHEMA_VERSION='3.1';
export const WORKER_LIVENESS_RECORD_TYPE='PRODUCT_MASTER_WORKER_LIVENESS';

const normalize=(value)=>String(value??'').trim().toLowerCase();
const toMs=(value)=>{
  const ms=Date.parse(String(value??''));
  return Number.isFinite(ms)?ms:null;
};

export function evaluateGeminiAiProWorkerLiveness(input={}){
  const runs=Array.isArray(input.runs)?input.runs:[];
  const nowMs=input.now instanceof Date?input.now.getTime():Number.isFinite(input.now)?input.now:Date.now();
  const maxAgeMinutes=Number.isFinite(input.maxAgeMinutes)?input.maxAgeMinutes:90;
  const queueGraceMinutes=Number.isFinite(input.queueGraceMinutes)?input.queueGraceMinutes:20;
  const expectedBranch=input.expectedBranch??null;
  const latest=runs[0]??null;
  const blockers=[];
  let state='BLOCKED';
  let ageMinutes=null;

  if(!latest){
    blockers.push('NO_SMOKE_RUN');
  }else{
    const createdMs=toMs(latest.created_at);
    if(createdMs===null) blockers.push('RUN_CREATED_AT_INVALID');
    else ageMinutes=Math.max(0,(nowMs-createdMs)/60000);

    if(expectedBranch&&latest.head_branch!==expectedBranch) blockers.push('UNEXPECTED_BRANCH');

    const status=normalize(latest.status);
    const conclusion=normalize(latest.conclusion);
    if(status==='completed'){
      if(conclusion!=='success') blockers.push('LAST_SMOKE_NOT_SUCCESS');
      else if(ageMinutes!==null&&ageMinutes>maxAgeMinutes) blockers.push('LAST_SUCCESS_STALE');
      else if(blockers.length===0) state='PASS';
    }else if(['queued','pending','in_progress','waiting'].includes(status)){
      if(ageMinutes!==null&&ageMinutes>queueGraceMinutes) blockers.push('SMOKE_RUN_STUCK');
      else if(blockers.length===0) state='WAITING';
    }else{
      blockers.push('UNSUPPORTED_RUN_STATUS');
    }
  }

  if(blockers.length>0) state='BLOCKED';

  return{
    schemaVersion:WORKER_LIVENESS_SCHEMA_VERSION,
    recordType:WORKER_LIVENESS_RECORD_TYPE,
    executionChannel:'GEMINI_AI_PRO',
    surface:'ANTIGRAVITY_SELF_HOSTED_RUNNER',
    status:state,
    livenessGate:state==='PASS'?'PASS_HEALTHY':state==='WAITING'?'WAITING_WITHIN_GRACE':'BLOCKED',
    expectedBranch,
    maxAgeMinutes,
    queueGraceMinutes,
    latestRun:latest?{
      id:latest.id??null,
      status:latest.status??null,
      conclusion:latest.conclusion??null,
      headBranch:latest.head_branch??null,
      headSha:latest.head_sha??null,
      createdAt:latest.created_at??null,
      updatedAt:latest.updated_at??null,
      ageMinutes:ageMinutes===null?null:Number(ageMinutes.toFixed(2)),
      htmlUrl:latest.html_url??null
    }:null,
    blockers,
    failClosed:true,
    authority:{
      canonicalWriteAllowed:false,
      authoringWriteAllowed:false,
      runtimeWriteAllowed:false,
      registryWriteAllowed:false,
      productionWriteAllowed:false
    }
  };
}
