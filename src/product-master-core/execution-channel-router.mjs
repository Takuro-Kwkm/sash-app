import{
  WORKER_EXECUTION_CONTRACT_VERSION,
  GEMINI_EXECUTION_CHANNELS,
  applyGeminiApiFallback
}from'./worker-execution-contract.mjs';

export const EXECUTION_CHANNEL_ROUTE_SCHEMA_VERSION='1.0';
export const EXECUTION_CHANNEL_ROUTE_STATUSES=new Set(['SELECTED','FALLBACK_SELECTED','BLOCKED','NOT_APPLICABLE']);

const clone=(value)=>structuredClone(value);
const error=(code,message,details={})=>({code,message,...details});

function decision(job,status,{requestedChannel=null,selectedChannel=null,fallbackFrom=null,reason=null}={}){
  return{
    routeSchemaVersion:EXECUTION_CHANNEL_ROUTE_SCHEMA_VERSION,
    recordType:'GEMINI_EXECUTION_CHANNEL_ROUTE_DECISION',
    status,
    executionMode:job?.executionMode??null,
    requestedChannel,
    selectedChannel,
    preferredExecutionChannel:job?.preferredExecutionChannel??null,
    fallbackExecutionChannel:job?.fallbackExecutionChannel??null,
    fallbackAllowed:job?.fallbackAllowed??false,
    fallbackFrom,
    reason
  };
}

export function routeGeminiExecutionChannel(job,{unavailableChannel=null,reason=null}={}){
  const working=clone(job);
  if(working?.workerContractVersion!==WORKER_EXECUTION_CONTRACT_VERSION){
    return{
      pass:true,status:'NOT_APPLICABLE',job:working,
      decision:decision(working,'NOT_APPLICABLE',{requestedChannel:working?.executionChannel??null,selectedChannel:working?.executionChannel??null,reason:'LEGACY_JOB_WITHOUT_WORKER_CONTRACT_V1_1'}),
      errors:[]
    };
  }
  if(working.executionMode!=='LIVE_EXTERNAL'){
    return{
      pass:true,status:'NOT_APPLICABLE',job:working,
      decision:decision(working,'NOT_APPLICABLE',{requestedChannel:working.executionChannel??null,selectedChannel:working.executionChannel??null,reason:'NON_LIVE_EXECUTION_MODE'}),
      errors:[]
    };
  }
  if(!GEMINI_EXECUTION_CHANNELS.has(working.executionChannel)){
    const err=error('EXECUTION_CHANNEL_ROUTER_CHANNEL_INVALID',`Unsupported execution channel: ${working.executionChannel??'null'}`);
    return{pass:false,status:'BLOCKED',job:working,decision:decision(working,'BLOCKED',{requestedChannel:working.executionChannel??null,reason:err.code}),errors:[err]};
  }
  if(unavailableChannel===null){
    return{
      pass:true,status:'SELECTED',job:working,
      decision:decision(working,'SELECTED',{requestedChannel:working.executionChannel,selectedChannel:working.executionChannel,reason:'EXPLICIT_JOB_CHANNEL'}),
      errors:[]
    };
  }
  if(unavailableChannel!==working.executionChannel){
    const err=error('EXECUTION_CHANNEL_ROUTER_UNAVAILABLE_CHANNEL_MISMATCH',`Unavailable channel ${unavailableChannel} does not match current execution channel ${working.executionChannel}`,{unavailableChannel,currentExecutionChannel:working.executionChannel});
    return{pass:false,status:'BLOCKED',job:working,decision:decision(working,'BLOCKED',{requestedChannel:working.executionChannel,selectedChannel:working.executionChannel,reason:err.code}),errors:[err]};
  }

  const unavailableReason=reason??`${unavailableChannel}_UNAVAILABLE`;
  if(!working.fallbackAllowed){
    const err=error(unavailableReason,`Execution channel ${unavailableChannel} is unavailable and fallback_allowed is false`,{executionChannel:unavailableChannel});
    return{pass:false,status:'BLOCKED',job:working,decision:decision(working,'BLOCKED',{requestedChannel:unavailableChannel,selectedChannel:null,reason:unavailableReason}),errors:[err]};
  }

  const fallback=applyGeminiApiFallback(working,unavailableReason);
  if(!fallback.pass){
    const first=fallback.errors?.[0]??error('EXECUTION_CHANNEL_ROUTER_FALLBACK_FAILED','Execution channel fallback failed');
    return{pass:false,status:'BLOCKED',job:working,decision:decision(working,'BLOCKED',{requestedChannel:unavailableChannel,selectedChannel:null,reason:first.code}),errors:fallback.errors??[first]};
  }
  return{
    pass:true,status:'FALLBACK_SELECTED',job:fallback.job,
    decision:decision(fallback.job,'FALLBACK_SELECTED',{
      requestedChannel:unavailableChannel,
      selectedChannel:fallback.job.executionChannel,
      fallbackFrom:unavailableChannel,
      reason:unavailableReason
    }),
    errors:[]
  };
}
