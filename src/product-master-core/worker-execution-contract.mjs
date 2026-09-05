export const WORKER_EXECUTION_CONTRACT_VERSION='1.1';
export const GEMINI_EXECUTION_CHANNELS=new Set(['GEMINI_AI_PRO','GEMINI_API']);
export const DEFAULT_PREFERRED_EXECUTION_CHANNEL='GEMINI_AI_PRO';
export const DEFAULT_FALLBACK_EXECUTION_CHANNEL='GEMINI_API';
export const GEMINI_TRANSPORT_METHODS=new Set([
  'MOCK_IN_MEMORY',
  'REPLAY_ARTIFACT',
  'GEMINI_AI_PRO_STRUCTURED_HANDOFF',
  'GEMINI_API_DIRECT_RESPONSE'
]);

const error=(code,message,details={})=>({code,message,...details});
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;

export function defaultGeminiTransportMethod({executionMode,executionChannel}={}){
  if(executionMode==='MOCK')return'MOCK_IN_MEMORY';
  if(executionMode==='REPLAY')return'REPLAY_ARTIFACT';
  if(executionMode==='LIVE_EXTERNAL'&&executionChannel==='GEMINI_AI_PRO')return'GEMINI_AI_PRO_STRUCTURED_HANDOFF';
  if(executionMode==='LIVE_EXTERNAL'&&executionChannel==='GEMINI_API')return'GEMINI_API_DIRECT_RESPONSE';
  return null;
}

export function normalizeWorkerExecutionContract(input={}, {requireLiveChannel=true}={}){
  const executionMode=input.execution_mode??input.executionMode??'MOCK';
  const preferredExecutionChannel=input.preferred_execution_channel??input.preferredExecutionChannel??DEFAULT_PREFERRED_EXECUTION_CHANNEL;
  const fallbackExecutionChannel=input.fallback_execution_channel??input.fallbackExecutionChannel??DEFAULT_FALLBACK_EXECUTION_CHANNEL;
  const executionChannel=input.execution_channel??input.executionChannel??null;
  const fallbackAllowed=input.fallback_allowed??input.fallbackAllowed??false;
  const transportMethod=input.transport_method??input.transportMethod??defaultGeminiTransportMethod({executionMode,executionChannel});
  const executionReference=input.execution_reference??input.executionReference??null;
  const fallbackFrom=input.fallback_from??input.fallbackFrom??null;
  const fallbackReason=input.fallback_reason??input.fallbackReason??null;
  const errors=[];

  if(!GEMINI_EXECUTION_CHANNELS.has(preferredExecutionChannel))errors.push(error('WORKER_PREFERRED_EXECUTION_CHANNEL_INVALID',`Unsupported preferred_execution_channel: ${preferredExecutionChannel}`));
  if(!GEMINI_EXECUTION_CHANNELS.has(fallbackExecutionChannel))errors.push(error('WORKER_FALLBACK_EXECUTION_CHANNEL_INVALID',`Unsupported fallback_execution_channel: ${fallbackExecutionChannel}`));
  if(executionChannel!==null&&!GEMINI_EXECUTION_CHANNELS.has(executionChannel))errors.push(error('WORKER_EXECUTION_CHANNEL_INVALID',`Unsupported execution_channel: ${executionChannel}`));
  if(executionMode==='LIVE_EXTERNAL'&&requireLiveChannel&&!executionChannel)errors.push(error('WORKER_LIVE_EXECUTION_CHANNEL_MISSING','New LIVE_EXTERNAL jobs must declare execution_channel as GEMINI_AI_PRO or GEMINI_API'));
  if(typeof fallbackAllowed!=='boolean')errors.push(error('WORKER_FALLBACK_ALLOWED_INVALID','fallback_allowed must be boolean'));
  if(!nonBlank(transportMethod)||!GEMINI_TRANSPORT_METHODS.has(transportMethod))errors.push(error('WORKER_TRANSPORT_METHOD_INVALID',`Unsupported transport_method: ${transportMethod}`));
  if(executionReference!==null&&!nonBlank(executionReference))errors.push(error('WORKER_EXECUTION_REFERENCE_INVALID','execution_reference must be a non-empty string when supplied'));
  if(fallbackFrom!==null&&!GEMINI_EXECUTION_CHANNELS.has(fallbackFrom))errors.push(error('WORKER_FALLBACK_FROM_INVALID',`Unsupported fallback_from: ${fallbackFrom}`));

  return{
    pass:errors.length===0,
    contract:errors.length?null:{
      workerContractVersion:WORKER_EXECUTION_CONTRACT_VERSION,
      executionChannel,
      preferredExecutionChannel,
      fallbackExecutionChannel,
      fallbackAllowed,
      transportMethod,
      executionReference,
      fallbackFrom,
      fallbackReason
    },
    errors
  };
}

export function buildWorkerExecutionContext(job={}){
  return{
    workerContractVersion:job.workerContractVersion??null,
    executionMode:job.executionMode??null,
    executionChannel:job.executionChannel??null,
    preferredExecutionChannel:job.preferredExecutionChannel??null,
    fallbackExecutionChannel:job.fallbackExecutionChannel??null,
    fallbackAllowed:job.fallbackAllowed??false,
    fallbackFrom:job.fallbackFrom??null,
    fallbackReason:job.fallbackReason??null,
    transportMethod:job.transportMethod??null,
    executionReference:job.executionReference??null,
    model:job.model??null
  };
}

export function applyGeminiApiFallback(job,reason){
  if(!job?.fallbackAllowed)return{pass:false,job:null,errors:[error('WORKER_FALLBACK_NOT_ALLOWED','Fallback is not allowed for this job')]};
  if(job.fallbackExecutionChannel!=='GEMINI_API')return{pass:false,job:null,errors:[error('WORKER_FALLBACK_CHANNEL_UNSUPPORTED',`Fallback channel ${job.fallbackExecutionChannel??'null'} is not supported by the Gemini API bridge`)]};
  const next=structuredClone(job);
  next.fallbackFrom=job.executionChannel??null;
  next.fallbackReason=reason??'PRIMARY_EXECUTION_UNAVAILABLE';
  next.executionChannel='GEMINI_API';
  next.transportMethod='GEMINI_API_DIRECT_RESPONSE';
  next.executionReference=null;
  next.model=job.metadata?.geminiApiModelDefault??null;
  return{pass:true,job:next,errors:[]};
}
