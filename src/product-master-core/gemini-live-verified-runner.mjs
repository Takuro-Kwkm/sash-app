import{runGeminiProductMasterBridge}from'./gemini-execution-bridge.mjs';
import{inspectGeminiLivePreflight}from'./gemini-live-preflight.mjs';
import{verifyGeminiFileAttachment}from'./gemini-file-verify.mjs';

const safeClone=(value)=>structuredClone(value);
const safety=()=>({canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false});
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;

export async function runVerifiedGeminiLiveJob(job,{
  argv=[],
  apiKey=process.env.GEMINI_API_KEY??null,
  model=job?.model??process.env.GEMINI_MODEL??null,
  geminiFileUri=process.env.GEMINI_FILE_URI??null,
  sourceFilePath=process.env.GEMINI_SOURCE_FILE??null,
  sourceVerifyImpl=verifyGeminiFileAttachment,
  fetchImpl=globalThis.fetch,
  timeoutMs=60000,
  ...bridgeOptions
}={}){
  const workingJob=safeClone(job);
  if(workingJob?.sourceContext?.type==='OFFICIAL_PDF'&&!workingJob?.sourceAttachment?.geminiFileUri&&nonBlank(geminiFileUri)){
    workingJob.sourceAttachment={...(workingJob.sourceAttachment??{}),geminiFileUri:geminiFileUri.trim(),mimeType:workingJob.sourceAttachment?.mimeType??'application/pdf'};
  }
  const env={...process.env,GEMINI_API_KEY:apiKey??'',GEMINI_MODEL:model??'',GEMINI_FILE_URI:geminiFileUri??''};
  const preflight=inspectGeminiLivePreflight({env,argv,jobModel:model,sourceFilePath,sourceAttachment:workingJob?.sourceAttachment,requireSource:workingJob?.sourceContext?.type==='OFFICIAL_PDF'});
  if(!preflight.pass)return{pass:false,status:'BLOCKED',job:workingJob,credentialPreflight:preflight,sourceAttachmentAudit:null,transportValidation:null,inboxImport:null,reviewQueue:null,...safety(),errors:preflight.errors};

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

  const result=await runGeminiProductMasterBridge(workingJob,{...bridgeOptions,apiKey,model,sourceFilePath,fetchImpl,timeoutMs});
  return{
    ...result,
    credentialPreflight:preflight,
    sourceAttachmentAudit:result.sourceAttachmentAudit??sourceAttachmentAudit
  };
}
