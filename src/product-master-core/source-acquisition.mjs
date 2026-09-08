import crypto from'node:crypto';
import fs from'node:fs';
import path from'node:path';
import{validateScopedSourceEquivalenceProof}from'./gemini-source-equivalence.mjs';

export const SOURCE_ACQUISITION_SCHEMA_VERSION='1.1';
export const SOURCE_ACQUISITION_RECORD_TYPE='PRODUCT_MASTER_SOURCE_ACQUISITION';
export const SOURCE_ACQUISITION_STATUSES=new Set(['PASS','BLOCKED','FAILED']);

const SHA256_RE=/^[a-f0-9]{64}$/i;
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const makeError=(code,message,details={})=>({code,message,...details});
const sha256=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');
const positiveIntegerArray=(value)=>Array.isArray(value)&&value.every((row)=>Number.isInteger(row)&&row>0);

function scopeFromProfile(profile={}){
  const extraction=profile.extraction??{};
  return{
    pdfPages:Array.isArray(extraction.pageScope)?[...extraction.pageScope]:[],
    printedPages:Array.isArray(extraction.printedPageScope)?[...extraction.printedPageScope]:[],
    canonicalFields:Array.isArray(extraction.canonicalFieldScope)?[...extraction.canonicalFieldScope]:[]
  };
}

export function buildSourceAcquisitionRequest(profile={}, {executionChannel=null}={}){
  const source=profile.source??{};
  const scope=scopeFromProfile(profile);
  const errors=[];
  if(source.type!=='OFFICIAL_PDF')errors.push(makeError('SOURCE_ACQUISITION_SOURCE_TYPE_UNSUPPORTED',`Unsupported source type: ${source.type??'null'}`));
  for(const key of['driveFileId','title','officialDownloadUrl','officialDetailUrl'])if(!nonBlank(source[key]))errors.push(makeError('SOURCE_ACQUISITION_SOURCE_FIELD_MISSING',`source.${key} is required`,{field:key}));
  if(!SHA256_RE.test(String(source.authoritativeSha256??'')))errors.push(makeError('SOURCE_ACQUISITION_AUTHORITY_SHA_INVALID','source.authoritativeSha256 must be a valid SHA-256 hex value'));
  if(!Number.isInteger(source.pageCount)||source.pageCount<1)errors.push(makeError('SOURCE_ACQUISITION_PAGE_COUNT_INVALID','source.pageCount must be a positive integer'));
  if(!positiveIntegerArray(scope.pdfPages)||scope.pdfPages.length===0)errors.push(makeError('SOURCE_ACQUISITION_PDF_SCOPE_INVALID','extraction.pageScope must contain positive PDF page numbers'));
  if(!positiveIntegerArray(scope.printedPages))errors.push(makeError('SOURCE_ACQUISITION_PRINTED_SCOPE_INVALID','extraction.printedPageScope must contain positive printed page numbers'));
  if(scope.printedPages.length&&scope.printedPages.length!==scope.pdfPages.length)errors.push(makeError('SOURCE_ACQUISITION_SCOPE_MAPPING_LENGTH_MISMATCH','PDF page scope and printed page scope must have the same length when both are supplied'));
  if(Number.isInteger(source.pageCount))for(const pdfPage of scope.pdfPages)if(pdfPage>source.pageCount)errors.push(makeError('SOURCE_ACQUISITION_PDF_SCOPE_OUT_OF_RANGE',`PDF page ${pdfPage} exceeds authoritative pageCount ${source.pageCount}`,{pdfPage,pageCount:source.pageCount}));
  if(executionChannel!==null&&!['GEMINI_AI_PRO','GEMINI_API'].includes(executionChannel))errors.push(makeError('SOURCE_ACQUISITION_EXECUTION_CHANNEL_INVALID',`Unsupported execution channel: ${executionChannel}`));

  const request={
    schemaVersion:SOURCE_ACQUISITION_SCHEMA_VERSION,
    recordType:'PRODUCT_MASTER_SOURCE_ACQUISITION_REQUEST',
    manufacturer:profile.manufacturer??null,
    series:profile.series??null,
    productId:profile.productId??null,
    executionChannel,
    source:{
      type:source.type??null,
      driveFileId:source.driveFileId??null,
      title:source.title??null,
      version:source.version??null,
      officialDownloadUrl:source.officialDownloadUrl??null,
      officialDetailUrl:source.officialDetailUrl??null,
      authoritativeSha256:source.authoritativeSha256??null,
      pageCount:source.pageCount??null
    },
    scope
  };
  return{pass:errors.length===0,request:errors.length?null:request,errors};
}

function contentTypeOf(response){
  const raw=response?.headers?.get?.('content-type')??null;
  return raw?String(raw).split(';')[0].trim().toLowerCase():null;
}

async function fetchWithTimeout(fetchImpl,url,options,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetchImpl(url,{...options,signal:controller.signal,redirect:'follow'});}finally{clearTimeout(timer);}
}

export async function acquireOfficialSource(profile={}, {
  executionChannel=null,
  outputPath=null,
  equivalenceProof=null,
  fetchImpl=globalThis.fetch,
  timeoutMs=240000,
  userAgent='Mozilla/5.0 ProductMasterSourceAcquisition/1.1'
}={}){
  const built=buildSourceAcquisitionRequest(profile,{executionChannel});
  if(!built.pass)return{pass:false,status:'BLOCKED',record:null,errors:built.errors};
  if(typeof fetchImpl!=='function')return{pass:false,status:'BLOCKED',record:null,errors:[makeError('SOURCE_ACQUISITION_FETCH_UNAVAILABLE','No fetch implementation is available')]};
  const request=built.request;
  let response;
  try{
    response=await fetchWithTimeout(fetchImpl,request.source.officialDownloadUrl,{method:'GET',headers:{'user-agent':userAgent,'referer':request.source.officialDetailUrl,'accept':'application/pdf,*/*;q=0.8'}},timeoutMs);
  }catch(cause){
    const code=cause?.name==='AbortError'?'SOURCE_ACQUISITION_TIMEOUT':'SOURCE_ACQUISITION_FETCH_FAILED';
    return{pass:false,status:'FAILED',record:null,errors:[makeError(code,cause?.message??String(cause))]};
  }
  if(!response?.ok)return{pass:false,status:'FAILED',record:null,errors:[makeError('SOURCE_ACQUISITION_HTTP_ERROR',`Official source download returned HTTP ${response?.status??'UNKNOWN'}`,{httpStatus:response?.status??null})]};
  let bytes;
  try{bytes=Buffer.from(await response.arrayBuffer());}
  catch(cause){return{pass:false,status:'FAILED',record:null,errors:[makeError('SOURCE_ACQUISITION_BODY_READ_FAILED',cause?.message??String(cause))]};}
  if(bytes.length<5||bytes.subarray(0,5).toString('ascii')!=='%PDF-')return{pass:false,status:'BLOCKED',record:null,errors:[makeError('SOURCE_ACQUISITION_NOT_PDF','Downloaded official source does not have PDF magic bytes')]};
  const actualSha256=sha256(bytes);
  const authoritativeSource={
    driveFileId:request.source.driveFileId,title:request.source.title,version:request.source.version,
    sha256:request.source.authoritativeSha256,pageCount:request.source.pageCount
  };
  const equivalence=validateScopedSourceEquivalenceProof({
    proof:equivalenceProof,
    authoritativeSource,
    attachmentSourceSha256:actualSha256,
    expectedPdfPages:request.scope.pdfPages,
    expectedPrintedPages:request.scope.printedPages
  });
  if(!equivalence.pass)return{pass:false,status:'BLOCKED',record:null,actualSha256,errors:equivalence.errors};
  if(outputPath){fs.mkdirSync(path.dirname(path.resolve(outputPath)),{recursive:true});fs.writeFileSync(path.resolve(outputPath),bytes);}
  const record={
    schemaVersion:SOURCE_ACQUISITION_SCHEMA_VERSION,
    recordType:SOURCE_ACQUISITION_RECORD_TYPE,
    status:'PASS',
    manufacturer:request.manufacturer,
    series:request.series,
    productId:request.productId,
    executionChannel:request.executionChannel,
    source:{...request.source},
    scope:{...request.scope},
    retrieval:{
      method:'OFFICIAL_DOWNLOAD_URL',
      requestedUrl:request.source.officialDownloadUrl,
      resolvedUrl:nonBlank(response.url)?response.url:request.source.officialDownloadUrl,
      referer:request.source.officialDetailUrl,
      contentType:contentTypeOf(response),
      sizeBytes:bytes.length,
      acquiredSha256:actualSha256
    },
    identity:{
      mode:equivalence.mode,
      fullDocumentByteIdentity:equivalence.mode==='FULL_BYTE_IDENTITY',
      authoritativeSha256:request.source.authoritativeSha256,
      acquiredSha256:actualSha256,
      scopedContentEquivalence:equivalence.audit??null
    },
    scopeValidation:{
      pdfScopeWithinAuthoritativePageCount:true,
      printedToPdfMappingComplete:request.scope.printedPages.length===0||request.scope.printedPages.length===request.scope.pdfPages.length
    },
    localArtifact:{persisted:Boolean(outputPath),fileName:outputPath?path.basename(outputPath):null},
    credentialMaterialPersisted:false
  };
  return{pass:true,status:'PASS',record,bytesWritten:outputPath?bytes.length:0,errors:[]};
}

export function validateSourceAcquisitionRecord(record,{job=null,profile=null}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[makeError('SOURCE_ACQUISITION_RECORD_INVALID','Source acquisition record must be an object')]};
  if(record.schemaVersion!==SOURCE_ACQUISITION_SCHEMA_VERSION)errors.push(makeError('SOURCE_ACQUISITION_SCHEMA_MISMATCH','Unsupported source acquisition schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==SOURCE_ACQUISITION_RECORD_TYPE)errors.push(makeError('SOURCE_ACQUISITION_RECORD_TYPE_INVALID','Unexpected source acquisition recordType',{actual:record.recordType??null}));
  if(record.status!=='PASS')errors.push(makeError('SOURCE_ACQUISITION_STATUS_NOT_PASS','Source acquisition record must be PASS',{actual:record.status??null}));
  if(record.credentialMaterialPersisted!==false)errors.push(makeError('SOURCE_ACQUISITION_SECRET_POLICY_INVALID','Source acquisition record must declare credentialMaterialPersisted=false'));
  if(!SHA256_RE.test(String(record?.retrieval?.acquiredSha256??'')))errors.push(makeError('SOURCE_ACQUISITION_ACQUIRED_SHA_INVALID','retrieval.acquiredSha256 must be a SHA-256 hex value'));
  if(!['FULL_BYTE_IDENTITY','SCOPED_CONTENT_EQUIVALENCE'].includes(record?.identity?.mode))errors.push(makeError('SOURCE_ACQUISITION_IDENTITY_MODE_INVALID','identity.mode is not accepted',{actual:record?.identity?.mode??null}));
  const expected=job?.sourceContext??profile?.source??null;
  if(expected){
    const source=record.source??{};
    for(const [recordKey,expectedKey] of [['driveFileId','driveFileId'],['title','title'],['version','version']]){
      const expectedValue=expected[expectedKey]??null;
      if(expectedValue!==null&&source[recordKey]!==expectedValue)errors.push(makeError('SOURCE_ACQUISITION_PROVENANCE_MISMATCH',`source.${recordKey} does not match execution source`,{field:recordKey,expected:expectedValue,actual:source[recordKey]??null}));
    }
  }
  if(job?.executionChannel&&record.executionChannel!==job.executionChannel)errors.push(makeError('SOURCE_ACQUISITION_CHANNEL_MISMATCH','Source acquisition executionChannel does not match Job',{expected:job.executionChannel,actual:record.executionChannel??null}));
  return{pass:errors.length===0,errors};
}
