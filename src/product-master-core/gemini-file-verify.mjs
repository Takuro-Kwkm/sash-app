import{redactGeminiSecrets}from'./gemini-file-upload.mjs';

const makeError=(code,message,details={})=>({code,message,...details});
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const SHA256_HEX_RE=/^[a-f0-9]{64}$/i;

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

function normalizeSha256ToHex(value){
  const raw=String(value??'').trim();
  if(SHA256_HEX_RE.test(raw))return raw.toLowerCase();
  if(!raw)return null;
  try{
    const normalized=raw.replaceAll('-','+').replaceAll('_','/');
    const padded=normalized+'='.repeat((4-(normalized.length%4))%4);
    const bytes=Buffer.from(padded,'base64');
    if(bytes.length===32)return bytes.toString('hex');
    const decodedAscii=bytes.toString('ascii');
    if(bytes.length===64&&SHA256_HEX_RE.test(decodedAscii))return decodedAscii.toLowerCase();
    return null;
  }catch{return null;}
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
  const expectedHex=normalizeSha256ToHex(expectedSha256);
  if(!expectedHex)return{pass:false,status:'BLOCKED',audit:{providerFileName},errors:[makeError('GEMINI_EXPECTED_SHA256_INVALID','A valid SHA-256 source fingerprint is required to verify a preuploaded Gemini file')]};

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
      const providerHex=normalizeSha256ToHex(file.sha256Hash);
      if(!providerHex)return{pass:false,status:'BLOCKED',audit:{providerFileName,statusPolls:polls,providerState:state,expectedSha256Hex:expectedHex},errors:[makeError('GEMINI_FILE_SHA256_INVALID','Gemini Files API sha256Hash could not be normalized to a SHA-256 hex fingerprint',{providerFileName})]};
      if(providerHex!==expectedHex)return{pass:false,status:'BLOCKED',audit:{providerFileName,statusPolls:polls,providerState:state,sha256Verified:false,expectedSha256Hex:expectedHex,providerSha256Hex:providerHex},errors:[makeError('GEMINI_FILE_SHA256_MISMATCH','Preuploaded Gemini file bytes do not match the fetched source fingerprint',{providerFileName})]};
      return{
        pass:true,status:'VERIFIED',
        audit:{
          providerFileName,
          providerState:state,
          geminiFileUri:file.uri??geminiFileUri,
          mimeType:file.mimeType??file.mime_type??null,
          fileSizeBytes:file.sizeBytes??file.size_bytes??null,
          statusPolls:polls,
          sha256Verified:true,
          expectedSha256Hex:expectedHex,
          providerSha256Hex:providerHex
        },
        errors:[]
      };
    }
  }catch(cause){
    const code=cause?.name==='AbortError'?'GEMINI_FILE_VERIFY_TIMEOUT':'GEMINI_FILE_VERIFY_EXECUTION_FAILED';
    return{pass:false,status:'FAILED',audit:{providerFileName,statusPolls:polls},errors:[makeError(code,redactGeminiSecrets(cause?.message??String(cause),[apiKey]))]};
  }
}
