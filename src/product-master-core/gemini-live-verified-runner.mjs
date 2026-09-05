import{runGeminiProductMasterBridge}from'./gemini-execution-bridge.mjs';
import{inspectGeminiLivePreflight}from'./gemini-live-preflight.mjs';
import{verifyGeminiFileAttachment}from'./gemini-file-verify.mjs';

const safeClone=(value)=>structuredClone(value);
const safety=()=>({canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false});
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
const TYPE_MAP=new Map([
  ['object','OBJECT'],['array','ARRAY'],['string','STRING'],['integer','INTEGER'],['number','NUMBER'],['boolean','BOOLEAN']
]);

function transientProviderError(result){
  const errors=Array.isArray(result?.errors)?result.errors:[];
  return errors.find((row)=>row?.code==='GEMINI_API_ERROR'&&[429,500,502,503,504].includes(Number(row?.httpStatus)))??null;
}

function retryDelayMs(error,{attempt=0,maxRetryDelayMs=70000}={}){
  const message=String(error?.message??'');
  const secondsMatch=message.match(/retry\s+in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  const providerDelay=secondsMatch?Math.ceil(Number(secondsMatch[1])*1000)+750:null;
  const fallback=Math.min(2000*(2**attempt),15000);
  return Math.min(providerDelay??fallback,maxRetryDelayMs);
}

export function toGeminiResponseSchema(jsonSchema){
  if(Array.isArray(jsonSchema))return jsonSchema.map(toGeminiResponseSchema);
  if(!jsonSchema||typeof jsonSchema!=='object')return jsonSchema;
  const out={};
  if(typeof jsonSchema.type==='string')out.type=TYPE_MAP.get(jsonSchema.type.toLowerCase())??jsonSchema.type.toUpperCase();
  for(const key of['title','description','format'])if(jsonSchema[key]!==undefined)out[key]=jsonSchema[key];
  if(Array.isArray(jsonSchema.enum))out.enum=[...jsonSchema.enum];
  for(const key of['minItems','maxItems','minimum','maximum'])if(jsonSchema[key]!==undefined)out[key]=jsonSchema[key];
  if(Array.isArray(jsonSchema.required))out.required=[...jsonSchema.required];
  if(jsonSchema.items!==undefined)out.items=toGeminiResponseSchema(jsonSchema.items);
  if(Array.isArray(jsonSchema.anyOf))out.anyOf=jsonSchema.anyOf.map(toGeminiResponseSchema);
  if(jsonSchema.properties&&typeof jsonSchema.properties==='object'){
    out.properties=Object.fromEntries(Object.entries(jsonSchema.properties).map(([key,value])=>[key,toGeminiResponseSchema(value)]));
  }
  return out;
}

export function createGeminiSchemaCompatFetch(fetchImpl=globalThis.fetch){
  return async(input,init={})=>{
    if(typeof fetchImpl!=='function')throw new TypeError('fetchImpl must be a function');
    const url=String(input??'');
    if(!url.includes(':generateContent')||typeof init?.body!=='string')return fetchImpl(input,init);
    let payload=null;
    try{payload=JSON.parse(init.body);}catch{return fetchImpl(input,init);}
    const config=payload?.generationConfig;
    if(!config?.responseJsonSchema||config?.responseSchema)return fetchImpl(input,init);
    const nextPayload=safeClone(payload);
    nextPayload.generationConfig.responseSchema=toGeminiResponseSchema(config.responseJsonSchema);
    delete nextPayload.generationConfig.responseJsonSchema;
    return fetchImpl(input,{...init,body:JSON.stringify(nextPayload)});
  };
}

export async function runVerifiedGeminiLiveJob(job,{
  argv=[],
  apiKey=process.env.GEMINI_API_KEY??null,
  model=job?.model??process.env.GEMINI_MODEL??null,
  geminiFileUri=process.env.GEMINI_FILE_URI??null,
  sourceFilePath=process.env.GEMINI_SOURCE_FILE??null,
  sourceVerifyImpl=verifyGeminiFileAttachment,
  bridgeImpl=runGeminiProductMasterBridge,
  sleepImpl=sleep,
  maxTransientRetries=2,
  maxRetryDelayMs=70000,
  fetchImpl=globalThis.fetch,
  timeoutMs=60000,
  ...bridgeOptions
}={}){
  let workingJob=safeClone(job);
  if(workingJob?.sourceContext?.type==='OFFICIAL_PDF'&&!workingJob?.sourceAttachment?.geminiFileUri&&nonBlank(geminiFileUri)){
    workingJob.sourceAttachment={...(workingJob.sourceAttachment??{}),geminiFileUri:geminiFileUri.trim(),mimeType:workingJob.sourceAttachment?.mimeType??'application/pdf'};
  }
  const env={...process.env,GEMINI_API_KEY:apiKey??'',GEMINI_MODEL:model??'',GEMINI_FILE_URI:geminiFileUri??''};
  const preflight=inspectGeminiLivePreflight({env,argv,jobModel:model,sourceFilePath,sourceAttachment:workingJob?.sourceAttachment,requireSource:workingJob?.sourceContext?.type==='OFFICIAL_PDF'});
  if(!preflight.pass)return{pass:false,status:'BLOCKED',job:workingJob,credentialPreflight:preflight,sourceAttachmentAudit:null,transportValidation:null,inboxImport:null,reviewQueue:null,...safety(),errors:preflight.errors};

  const providerFetch=createGeminiSchemaCompatFetch(fetchImpl);
  let sourceAttachmentAudit=null;
  if(workingJob?.sourceContext?.type==='OFFICIAL_PDF'&&workingJob?.sourceAttachment?.geminiFileUri){
    const verify=await sourceVerifyImpl({
      geminiFileUri:workingJob.sourceAttachment.geminiFileUri,
      expectedSha256:workingJob.sourceAttachment.sourceSha256,
      apiKey,fetchImpl,timeoutMs
    });
    sourceAttachmentAudit=verify.audit??null;
    if(!verify.pass)return{pass:false,status:verify.status==='BLOCKED'?'BLOCKED':'FAILED',job:workingJob,credentialPreflight:preflight,sourceAttachmentAudit,transportValidation:null,inboxImport:null,reviewQueue:null,...safety(),errors:verify.errors??[]};
  }

  const retryAudit=[];
  let result=null;
  for(let attempt=0;attempt<=maxTransientRetries;attempt+=1){
    result=await bridgeImpl(workingJob,{...bridgeOptions,apiKey,model,sourceFilePath,fetchImpl:providerFetch,timeoutMs});
    sourceAttachmentAudit=result.sourceAttachmentAudit??sourceAttachmentAudit;
    const transient=transientProviderError(result);
    if(result.pass||!transient||attempt>=maxTransientRetries)break;

    const delayMs=retryDelayMs(transient,{attempt,maxRetryDelayMs});
    retryAudit.push({attempt:attempt+1,httpStatus:Number(transient.httpStatus),delayMs,reason:transient.code});

    // The failed execution job retains the verified Gemini file attachment. Reuse it so a transient
    // provider retry does not re-upload the official PDF or alter source provenance.
    workingJob=safeClone(result.job??workingJob);
    await sleepImpl(delayMs);
  }

  return{
    ...result,
    credentialPreflight:preflight,
    sourceAttachmentAudit,
    transientRetryAudit:retryAudit,
    transientRetryCount:retryAudit.length
  };
}
