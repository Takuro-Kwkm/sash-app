import{runGeminiProductMasterBridge}from'./gemini-execution-bridge.mjs';
import{inspectGeminiLivePreflight}from'./gemini-live-preflight.mjs';
import{verifyGeminiFileAttachment}from'./gemini-file-verify.mjs';

const safeClone=(value)=>structuredClone(value);
const safety=()=>({canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false});

export async function runVerifiedGeminiLiveJob(job,{
  argv=[],
  apiKey=process.env.GEMINI_API_KEY??null,
  model=job?.model??process.env.GEMINI_MODEL??null,
  sourceFilePath=process.env.GEMINI_SOURCE_FILE??null,
  sourceVerifyImpl=verifyGeminiFileAttachment,
  fetchImpl=globalThis.fetch,
  timeoutMs=60000,
  ...bridgeOptions
}={}){
  const env={...process.env,GEMINI_API_KEY:apiKey??'',GEMINI_MODEL:model??''};
  const preflight=inspectGeminiLivePreflight({env,argv,jobModel:model,sourceFilePath,sourceAttachment:job?.sourceAttachment,requireSource:job?.sourceContext?.type==='OFFICIAL_PDF'});
  if(!preflight.pass)return{pass:false,status:'BLOCKED',job:safeClone(job),credentialPreflight:preflight,sourceAttachmentAudit:null,transportValidation:null,inboxImport:null,reviewQueue:null,...safety(),errors:preflight.errors};

  let sourceAttachmentAudit=null;
  if(job?.sourceContext?.type==='OFFICIAL_PDF'&&job?.sourceAttachment?.geminiFileUri){
    const verify=await sourceVerifyImpl({
      geminiFileUri:job.sourceAttachment.geminiFileUri,
      expectedSha256:job.sourceAttachment.sourceSha256,
      apiKey,fetchImpl,timeoutMs
    });
    sourceAttachmentAudit=verify.audit??null;
    if(!verify.pass)return{pass:false,status:verify.status==='BLOCKED'?'BLOCKED':'FAILED',job:safeClone(job),credentialPreflight:preflight,sourceAttachmentAudit,transportValidation:null,inboxImport:null,reviewQueue:null,...safety(),errors:verify.errors??[]};
  }

  const result=await runGeminiProductMasterBridge(job,{...bridgeOptions,apiKey,model,sourceFilePath,fetchImpl,timeoutMs});
  return{
    ...result,
    credentialPreflight:preflight,
    sourceAttachmentAudit:result.sourceAttachmentAudit??sourceAttachmentAudit
  };
}
