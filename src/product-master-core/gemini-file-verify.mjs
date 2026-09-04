import{redactGeminiSecrets}from'./gemini-file-upload.mjs';

const makeError=(code,message,details={})=>({code,message,...details});
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;

function providerNameFromUri(uri){
  if(!nonBlank(uri))return null;
  const value=uri.trim();
  if(/^files\/[^/?#]+$/.test(value))return value;
  try{
    const parsed=new URL(value);
    const match=parsed.pathname.match(/\/(files\/[^/?#]+)$/);
    return match?.[1]??null;
  }catch{return null;}
}

function sha256HexToBase64(hex){
  if(!/^[a-f0-9]{64}$/i.test(String(hex??'')))return null;
  return Buffer.from(hex,'hex').toString('base64');
}

async function responseJson(response){return response?.json?response.json().catch(()=>null):null;}
async function fetchWithTimeout(fetchImpl,url,options,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetchImpl(url,{...options,signal:controller.signal});}
  finally{clearTimeout(timer);}
}

export async function verifyGeminiFileAttachment({
  geminiFileUri,
  expectedSha256,
  apiKey=process.env.GEMINI_API_KEY??null,
  fetchImpl=globalThis.fetch,
  timeoutMs=60000,
  processingTimeoutMs=120000,
  pollIntervalMs=1000,
  filesBaseUrl='https://generativelanguage.googleapis.com/v1beta'
}={}){
  if(!apiKey)return{pass:false,status:'BLOCKED',audit:null,errors:[makeError('GEMINI_API_KEY_UNAVAILABLE','GEMINI_API_KEY is not available')]};
  if(typeof fetchImpl!=='function')return{pass:false,status:'BLOCKED',audit:null,errors:[makeError('FETCH_UNAVAILABLE','No fetch implementation is available for Gemini Files API verification')]};
  const providerFileName=providerNameFromUri(geminiFileUri);
  if(!providerFileName)return{pass:false,status:'BLOCKED',audit:null,errors:[makeError('GEMINI_FILE_URI_INVALID','Gemini file URI does not resolve to files/{id}')]};
  const expectedBase64=sha256HexToBase64(expectedSha256);
  if(!expectedBase64)return{pass:false,status:'BLOCKED',audit:{providerFileName},errors:[makeError('GEMINI_EXPECTED_SHA256_INVALID','A 64-character hexadecimal source SHA-256 is required to verify a preuploaded Gemini file')]};

  const started=Date.now();
  let polls=0;
  try{
    while(true){
      if(Date.now()-started>=processingTimeoutMs)return{pass:false,status:'FAILED',audit:{providerFileName,statusPolls:polls},errors:[makeError('GEMINI_FILE_PROCESSING_TIMEOUT','Gemini file did not become ACTIVE before the processing timeout',{providerFileName,processingTimeoutMs})]};
      const response=await fetchWithTimeout(fetchImpl,`${filesBaseUrl}/${providerFileName}`,{method:'GET',headers:{'x-goog-api-key':apiKey}},timeoutMs);
      const payload=redactGeminiSecrets(await responseJson(response),[apiKey]);
      if(!response?.ok){
        const message=redactGeminiSecrets(payload?.error?.message??`Gemini Files API get HTTP ${response?.status??'UNKNOWN'}`,[apiKey]);
        return{pass:false,status:'FAILED',audit:{providerFileName,statusPolls:polls},errors:[makeError('GEMINI_FILE_STATUS_FAILED',message,{httpStatus:response?.status??null,providerFileName})]};
      }
      const file=payload?.file??payload??{};
      const state=file.state??null;
      if(state==='PROCESSING'){
        polls+=1;
        if(pollIntervalMs>0)await sleep(pollIntervalMs);
        continue;
      }
      if(state==='FAILED')return{pass:false,status:'FAILED',audit:{providerFileName,statusPolls:polls,providerState:state},errors:[makeError('GEMINI_FILE_PROCESSING_FAILED','Gemini file processing failed',{providerFileName})]};
      if(state!=='ACTIVE')return{pass:false,status:'BLOCKED',audit:{providerFileName,statusPolls:polls,providerState:state},errors:[makeError('GEMINI_FILE_NOT_ACTIVE',`Gemini file must be ACTIVE before inference; received ${state??'UNKNOWN'}`,{providerFileName})]};
      if(!file.sha256Hash)return{pass:false,status:'BLOCKED',audit:{providerFileName,statusPolls:polls,providerState:state},errors:[makeError('GEMINI_FILE_SHA256_MISSING','Gemini Files API metadata did not include sha256Hash',{providerFileName})]};
      if(file.sha256Hash!==expectedBase64)return{pass:false,status:'BLOCKED',audit:{providerFileName,statusPolls:polls,providerState:state,sha256Verified:false},errors:[makeError('GEMINI_FILE_SHA256_MISMATCH','Preuploaded Gemini file bytes do not match the Drive-fetched source fingerprint',{providerFileName})]};
      return{
        pass:true,status:'VERIFIED',
        audit:{
          providerFileName,
          providerState:state,
          geminiFileUri:file.uri??geminiFileUri,
          mimeType:file.mimeType??file.mime_type??null,
          fileSizeBytes:file.sizeBytes??file.size_bytes??null,
          statusPolls:polls,
          sha256Verified:true
        },
        errors:[]
      };
    }
  }catch(cause){
    const code=cause?.name==='AbortError'?'GEMINI_FILE_VERIFY_TIMEOUT':'GEMINI_FILE_VERIFY_EXECUTION_FAILED';
    return{pass:false,status:'FAILED',audit:{providerFileName,statusPolls:polls},errors:[makeError(code,redactGeminiSecrets(cause?.message??String(cause),[apiKey]))]};
  }
}
