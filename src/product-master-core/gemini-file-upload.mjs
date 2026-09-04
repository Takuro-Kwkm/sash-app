import crypto from'node:crypto';
import fs from'node:fs';
import path from'node:path';

export const GEMINI_PDF_MAX_BYTES=50*1024*1024;

const makeError=(code,message,details={})=>({code,message,...details});
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));

export function redactGeminiSecrets(value,secrets=[]){
  const active=secrets.filter((secret)=>typeof secret==='string'&&secret.length>0);
  const redactString=(input)=>active.reduce((text,secret)=>text.split(secret).join('[REDACTED]'),String(input));
  if(typeof value==='string')return redactString(value);
  if(Array.isArray(value))return value.map((item)=>redactGeminiSecrets(item,active));
  if(isObject(value))return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,redactGeminiSecrets(item,active)]));
  return value;
}

export function sha256File(filePath){
  const hash=crypto.createHash('sha256');
  const bytes=fs.readFileSync(filePath);
  hash.update(bytes);
  return hash.digest('hex');
}

async function responseJson(response){return response?.json?response.json().catch(()=>null):null;}
function headerValue(response,name){
  if(response?.headers?.get)return response.headers.get(name);
  const headers=response?.headers??{};
  return headers[name]??headers[name.toLowerCase()]??headers[name.toUpperCase()]??null;
}

async function fetchWithTimeout(fetchImpl,url,options,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetchImpl(url,{...options,signal:controller.signal});}
  finally{clearTimeout(timer);}
}

async function waitForActiveGeminiFile(file,{
  apiKey,fetchImpl,timeoutMs,pollIntervalMs,processingTimeoutMs,filesBaseUrl
}){
  let current=file??{};
  const started=Date.now();
  let polls=0;
  while(current.state==='PROCESSING'){
    if(!current.name)return{pass:false,file:current,polls,errors:[makeError('GEMINI_FILE_NAME_MISSING','Gemini file is PROCESSING but file.name is unavailable for status polling')]};
    if(Date.now()-started>=processingTimeoutMs)return{pass:false,file:current,polls,errors:[makeError('GEMINI_FILE_PROCESSING_TIMEOUT','Gemini file did not become ACTIVE before the processing timeout',{providerFileName:current.name,processingTimeoutMs})]};
    if(pollIntervalMs>0)await sleep(pollIntervalMs);
    const name=String(current.name).replace(/^\/+/, '');
    const response=await fetchWithTimeout(fetchImpl,`${filesBaseUrl}/${name}`,{method:'GET',headers:{'x-goog-api-key':apiKey}},timeoutMs);
    const payload=redactGeminiSecrets(await responseJson(response),[apiKey]);
    if(!response?.ok){
      const message=redactGeminiSecrets(payload?.error?.message??`Gemini Files API get HTTP ${response?.status??'UNKNOWN'}`,[apiKey]);
      return{pass:false,file:current,polls,errors:[makeError('GEMINI_FILE_STATUS_FAILED',message,{httpStatus:response?.status??null,providerFileName:current.name})]};
    }
    current=payload?.file??payload??{};
    polls+=1;
  }
  if(current.state==='FAILED')return{pass:false,file:current,polls,errors:[makeError('GEMINI_FILE_PROCESSING_FAILED','Gemini file processing failed',{providerFileName:current.name??file?.name??null})]};
  return{pass:true,file:current,polls,errors:[]};
}

export async function uploadGeminiFileFromPath({
  filePath,
  apiKey=process.env.GEMINI_API_KEY??null,
  mimeType='application/pdf',
  displayName=filePath?path.basename(filePath):'source.pdf',
  expectedSha256=null,
  fetchImpl=globalThis.fetch,
  timeoutMs=60000,
  processingTimeoutMs=120000,
  pollIntervalMs=1000,
  uploadBaseUrl='https://generativelanguage.googleapis.com/upload/v1beta/files',
  filesBaseUrl='https://generativelanguage.googleapis.com/v1beta',
  maxPdfBytes=GEMINI_PDF_MAX_BYTES
}={}){
  if(!apiKey)return{pass:false,status:'BLOCKED',attachment:null,audit:null,errors:[makeError('GEMINI_API_KEY_UNAVAILABLE','GEMINI_API_KEY is not available')]};
  if(!filePath)return{pass:false,status:'BLOCKED',attachment:null,audit:null,errors:[makeError('GEMINI_SOURCE_FILE_UNAVAILABLE','A local source file path is required for Gemini Files API upload')]};
  if(typeof fetchImpl!=='function')return{pass:false,status:'BLOCKED',attachment:null,audit:null,errors:[makeError('FETCH_UNAVAILABLE','No fetch implementation is available for Gemini Files API upload')]};
  let stat;
  try{stat=fs.statSync(filePath);}
  catch{return{pass:false,status:'BLOCKED',attachment:null,audit:null,errors:[makeError('GEMINI_SOURCE_FILE_UNAVAILABLE','Source file is not accessible',{filePath:path.basename(filePath)})]};}
  if(!stat.isFile())return{pass:false,status:'BLOCKED',attachment:null,audit:null,errors:[makeError('GEMINI_SOURCE_FILE_UNAVAILABLE','Source path is not a file',{filePath:path.basename(filePath)})]};
  if(mimeType==='application/pdf'&&stat.size>maxPdfBytes)return{pass:false,status:'BLOCKED',attachment:null,audit:{fileSizeBytes:stat.size,maxPdfBytes},errors:[makeError('GEMINI_PDF_SIZE_LIMIT_EXCEEDED','PDF exceeds configured Gemini Files API size limit',{fileSizeBytes:stat.size,maxPdfBytes})]};
  const sourceSha256=sha256File(filePath);
  if(expectedSha256&&sourceSha256!==expectedSha256)return{pass:false,status:'BLOCKED',attachment:null,audit:{sourceSha256,fileSizeBytes:stat.size},errors:[makeError('GEMINI_SOURCE_SHA256_MISMATCH','Local source bytes do not match the expected Drive-fetched source fingerprint',{expectedSha256,actualSha256:sourceSha256})]};
  const audit={sourceSha256,fileSizeBytes:stat.size,mimeType,displayName};
  try{
    const startResponse=await fetchWithTimeout(fetchImpl,uploadBaseUrl,{
      method:'POST',
      headers:{
        'x-goog-api-key':apiKey,
        'x-goog-upload-protocol':'resumable',
        'x-goog-upload-command':'start',
        'x-goog-upload-header-content-length':String(stat.size),
        'x-goog-upload-header-content-type':mimeType,
        'content-type':'application/json'
      },
      body:JSON.stringify({file:{display_name:displayName}})
    },timeoutMs);
    const startPayload=redactGeminiSecrets(await responseJson(startResponse),[apiKey]);
    if(!startResponse?.ok){
      const message=redactGeminiSecrets(startPayload?.error?.message??`Gemini Files API start HTTP ${startResponse?.status??'UNKNOWN'}`,[apiKey]);
      return{pass:false,status:'FAILED',attachment:null,audit,errors:[makeError('GEMINI_FILE_UPLOAD_START_FAILED',message,{httpStatus:startResponse?.status??null})]};
    }
    const uploadUrl=headerValue(startResponse,'x-goog-upload-url');
    if(!uploadUrl)return{pass:false,status:'FAILED',attachment:null,audit,errors:[makeError('GEMINI_FILE_UPLOAD_URL_MISSING','Gemini Files API did not return x-goog-upload-url')]};
    const bytes=fs.readFileSync(filePath);
    const uploadResponse=await fetchWithTimeout(fetchImpl,uploadUrl,{
      method:'POST',
      headers:{
        'content-length':String(stat.size),
        'x-goog-upload-offset':'0',
        'x-goog-upload-command':'upload, finalize'
      },
      body:bytes
    },timeoutMs);
    const uploadPayload=redactGeminiSecrets(await responseJson(uploadResponse),[apiKey]);
    if(!uploadResponse?.ok){
      const message=redactGeminiSecrets(uploadPayload?.error?.message??`Gemini Files API upload HTTP ${uploadResponse?.status??'UNKNOWN'}`,[apiKey]);
      return{pass:false,status:'FAILED',attachment:null,audit,errors:[makeError('GEMINI_FILE_UPLOAD_FAILED',message,{httpStatus:uploadResponse?.status??null})]};
    }
    const uploadedFile=uploadPayload?.file??{};
    if(!uploadedFile.uri)return{pass:false,status:'FAILED',attachment:null,audit,errors:[makeError('GEMINI_FILE_URI_MISSING','Gemini Files API response did not contain file.uri')]};
    const ready=await waitForActiveGeminiFile(uploadedFile,{apiKey,fetchImpl,timeoutMs,pollIntervalMs,processingTimeoutMs,filesBaseUrl});
    if(!ready.pass)return{pass:false,status:'FAILED',attachment:null,audit:{...audit,providerFileName:uploadedFile.name??null,geminiFileUri:uploadedFile.uri,providerState:ready.file?.state??uploadedFile.state??null,statusPolls:ready.polls},errors:ready.errors};
    const file=ready.file;
    return{
      pass:true,status:'UPLOADED',
      attachment:{geminiFileUri:file.uri??uploadedFile.uri,mimeType:file.mimeType??file.mime_type??uploadedFile.mimeType??uploadedFile.mime_type??mimeType,providerFileName:file.name??uploadedFile.name??null,displayName:file.displayName??file.display_name??uploadedFile.displayName??uploadedFile.display_name??displayName,sourceSha256},
      audit:{...audit,providerFileName:file.name??uploadedFile.name??null,geminiFileUri:file.uri??uploadedFile.uri,providerState:file.state??uploadedFile.state??null,statusPolls:ready.polls},
      errors:[]
    };
  }catch(cause){
    const code=cause?.name==='AbortError'?'GEMINI_FILE_UPLOAD_TIMEOUT':'GEMINI_FILE_UPLOAD_EXECUTION_FAILED';
    return{pass:false,status:'FAILED',attachment:null,audit,errors:[makeError(code,redactGeminiSecrets(cause?.message??String(cause),[apiKey]))]};
  }
}
