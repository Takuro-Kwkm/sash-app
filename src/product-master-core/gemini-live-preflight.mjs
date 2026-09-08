import fs from'node:fs';
import path from'node:path';

const makeError=(code,message,details={})=>({code,message,...details});
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const geminiFileUriOf=(value)=>value?.geminiFileUri??value?.gemini_file_uri??null;

export function findForbiddenGeminiSecretCliArg(argv=[]){
  return argv.find((arg)=>/^--(?:gemini-)?api-key(?:=|$)/i.test(String(arg))||/^--key(?:=|$)/i.test(String(arg)))??null;
}

export function validateGeminiModelName(model){
  if(!nonBlank(model))return{pass:false,error:makeError('GEMINI_MODEL_UNAVAILABLE','GEMINI_MODEL or job.model is required for LIVE_EXTERNAL')};
  const normalized=model.trim();
  if(!/^gemini-[A-Za-z0-9._-]+$/.test(normalized))return{pass:false,error:makeError('GEMINI_MODEL_INVALID','Gemini model must be an explicit gemini-* model name without URL/path characters')};
  return{pass:true,model:normalized,error:null};
}

export function inspectGeminiLivePreflight({
  env=process.env,
  argv=[],
  jobModel=null,
  sourceFilePath=null,
  sourceAttachment=null,
  requireSource=true
}={}){
  const errors=[];
  const forbidden=findForbiddenGeminiSecretCliArg(argv);
  if(forbidden)errors.push(makeError('GEMINI_SECRET_CLI_FORBIDDEN','Gemini API credentials must never be supplied through CLI arguments'));

  const apiKey=nonBlank(env.GEMINI_API_KEY)?env.GEMINI_API_KEY.trim():null;
  if(!apiKey)errors.push(makeError('GEMINI_API_KEY_UNAVAILABLE','GEMINI_API_KEY is not available from the environment'));

  const modelCandidate=nonBlank(jobModel)?jobModel:(nonBlank(env.GEMINI_MODEL)?env.GEMINI_MODEL:null);
  const modelValidation=validateGeminiModelName(modelCandidate);
  if(!modelValidation.pass)errors.push(modelValidation.error);

  const geminiFileUri=geminiFileUriOf(sourceAttachment)??(nonBlank(env.GEMINI_FILE_URI)?env.GEMINI_FILE_URI.trim():null);
  let localFileAccessible=false;
  let localFileName=null;
  if(nonBlank(sourceFilePath)){
    localFileName=path.basename(sourceFilePath);
    try{localFileAccessible=fs.statSync(sourceFilePath).isFile();}catch{localFileAccessible=false;}
  }
  if(requireSource&&!geminiFileUri&&!localFileAccessible){
    errors.push(makeError('GEMINI_SOURCE_ATTACHMENT_UNAVAILABLE','LIVE_EXTERNAL requires either an accessible Drive-fetched local source file or GEMINI_FILE_URI'));
  }

  return{
    pass:errors.length===0,
    status:errors.length===0?'READY':'BLOCKED',
    executionMode:'LIVE_EXTERNAL',
    credential:{
      apiKeyPresent:Boolean(apiKey),
      apiKeySource:apiKey?'ENV:GEMINI_API_KEY':null,
      model:modelValidation.pass?modelValidation.model:null,
      modelSource:nonBlank(jobModel)?'JOB_MODEL':(nonBlank(env.GEMINI_MODEL)?'ENV:GEMINI_MODEL':null)
    },
    source:{
      localFileProvided:nonBlank(sourceFilePath),
      localFileAccessible,
      localFileName,
      geminiFileUriPresent:Boolean(geminiFileUri),
      geminiFileUriSource:geminiFileUri?(geminiFileUriOf(sourceAttachment)?'JOB_SOURCE_ATTACHMENT':'ENV:GEMINI_FILE_URI'):null
    },
    safety:{
      apiKeyCliAllowed:false,
      apiKeyValueReturned:false,
      secretEchoAllowed:false
    },
    errors
  };
}
