import{validateSourceAcquisitionRecord}from'./source-acquisition.mjs';

export const SOURCE_DELIVERY_SCHEMA_VERSION='1.1';
export const SOURCE_DELIVERY_RECORD_TYPE='PRODUCT_MASTER_SOURCE_DELIVERY';
export const SOURCE_DELIVERY_METHODS=new Set(['INLINE_VERIFIED_PAGE_SCOPED_TEXT','GEMINI_FILE_ATTACHMENT']);

const SHA256_RE=/^[a-f0-9]{64}$/i;
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const makeError=(code,message,details={})=>({code,message,...details});
const sameArray=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>v===b[i]);

function commonSource(acquisition){
  return{
    driveFileId:acquisition.source?.driveFileId??null,
    title:acquisition.source?.title??null,
    version:acquisition.source?.version??null,
    acquiredSha256:acquisition.retrieval?.acquiredSha256??null,
    identityMode:acquisition.identity?.mode??null
  };
}

export function buildAiProScopedTextDelivery({sourceAcquisition,scopeAudit,executionReference=null}={}){
  const acquisitionValidation=validateSourceAcquisitionRecord(sourceAcquisition);
  const errors=[...acquisitionValidation.errors];
  if(sourceAcquisition?.executionChannel!=='GEMINI_AI_PRO')errors.push(makeError('SOURCE_DELIVERY_CHANNEL_MISMATCH','AI Pro scoped text delivery requires GEMINI_AI_PRO Source Acquisition'));
  if(!isObject(scopeAudit))errors.push(makeError('SOURCE_DELIVERY_SCOPE_AUDIT_INVALID','AI Pro scope audit must be an object'));
  else{
    if(!sameArray(scopeAudit.pageScope,sourceAcquisition?.scope?.pdfPages??[]))errors.push(makeError('SOURCE_DELIVERY_PDF_SCOPE_MISMATCH','AI Pro scope audit pageScope must exactly match Source Acquisition pdfPages',{expected:sourceAcquisition?.scope?.pdfPages??[],actual:scopeAudit.pageScope??null}));
    if(!SHA256_RE.test(String(scopeAudit.scopeTextSha256??'')))errors.push(makeError('SOURCE_DELIVERY_SCOPE_TEXT_SHA_INVALID','scopeTextSha256 must be a valid SHA-256 value'));
    if(!Number.isInteger(scopeAudit.scopeTextBytes)||scopeAudit.scopeTextBytes<1)errors.push(makeError('SOURCE_DELIVERY_SCOPE_TEXT_EMPTY','scopeTextBytes must be positive'));
    const pageAudit=Array.isArray(scopeAudit.pageAudit)?scopeAudit.pageAudit:[];
    if(pageAudit.length!==(sourceAcquisition?.scope?.pdfPages??[]).length)errors.push(makeError('SOURCE_DELIVERY_PAGE_AUDIT_INCOMPLETE','pageAudit must contain exactly one entry per requested PDF page'));
    for(const pdfPage of sourceAcquisition?.scope?.pdfPages??[]){
      const row=pageAudit.find((item)=>item?.pdfPage===pdfPage);
      if(!row)errors.push(makeError('SOURCE_DELIVERY_PAGE_AUDIT_MISSING',`pageAudit missing PDF page ${pdfPage}`,{pdfPage}));
      else if(!SHA256_RE.test(String(row.sha256??'')))errors.push(makeError('SOURCE_DELIVERY_PAGE_TEXT_SHA_INVALID',`pageAudit SHA invalid for PDF page ${pdfPage}`,{pdfPage}));
    }
  }
  if(executionReference!==null&&!nonBlank(executionReference))errors.push(makeError('SOURCE_DELIVERY_EXECUTION_REFERENCE_INVALID','executionReference must be non-empty when supplied'));
  if(errors.length)return{pass:false,record:null,errors};
  return{pass:true,record:{
    schemaVersion:SOURCE_DELIVERY_SCHEMA_VERSION,
    recordType:SOURCE_DELIVERY_RECORD_TYPE,
    status:'PASS',
    executionChannel:'GEMINI_AI_PRO',
    executionReference,
    source:commonSource(sourceAcquisition),
    scope:{
      pdfPages:[...sourceAcquisition.scope.pdfPages],
      printedPages:[...(sourceAcquisition.scope.printedPages??[])],
      canonicalFields:[...(sourceAcquisition.scope.canonicalFields??[])]
    },
    delivery:{
      method:'INLINE_VERIFIED_PAGE_SCOPED_TEXT',
      evidenceDeliveryMode:'INLINE_VERIFIED_PAGE_SCOPED_TEXT',
      artifactSha256:scopeAudit.scopeTextSha256,
      artifactBytes:scopeAudit.scopeTextBytes,
      pageAudit:structuredClone(scopeAudit.pageAudit),
      extractor:scopeAudit.extractor??null,
      extractorVersion:scopeAudit.extractorVersion??null
    },
    providerAttachmentReference:null,
    credentialMaterialPersisted:false
  },errors:[]};
}

export function buildGeminiApiAttachmentDelivery({sourceAcquisition,sourceAttachmentAudit,sourceAttachment=null,executionReference=null}={}){
  const acquisitionValidation=validateSourceAcquisitionRecord(sourceAcquisition);
  const errors=[...acquisitionValidation.errors];
  if(sourceAcquisition?.executionChannel!=='GEMINI_API')errors.push(makeError('SOURCE_DELIVERY_CHANNEL_MISMATCH','Gemini File attachment delivery requires GEMINI_API Source Acquisition'));
  if(!isObject(sourceAttachmentAudit))errors.push(makeError('SOURCE_DELIVERY_ATTACHMENT_AUDIT_INVALID','Gemini API sourceAttachmentAudit must be an object'));
  else{
    const expectedSha=sourceAcquisition?.retrieval?.acquiredSha256??null;
    if(sourceAttachmentAudit.sourceSha256!==expectedSha)errors.push(makeError('SOURCE_DELIVERY_ATTACHMENT_SHA_MISMATCH','Gemini API uploaded source SHA must match Source Acquisition acquired SHA',{expected:expectedSha,actual:sourceAttachmentAudit.sourceSha256??null}));
    if(sourceAttachmentAudit.mimeType!=='application/pdf')errors.push(makeError('SOURCE_DELIVERY_ATTACHMENT_MIME_INVALID','Gemini API attachment must be application/pdf',{actual:sourceAttachmentAudit.mimeType??null}));
    if(!Number.isInteger(sourceAttachmentAudit.fileSizeBytes)||sourceAttachmentAudit.fileSizeBytes<1)errors.push(makeError('SOURCE_DELIVERY_ATTACHMENT_SIZE_INVALID','Gemini API attachment fileSizeBytes must be positive'));
    if(sourceAcquisition?.retrieval?.sizeBytes&&sourceAttachmentAudit.fileSizeBytes!==sourceAcquisition.retrieval.sizeBytes)errors.push(makeError('SOURCE_DELIVERY_ATTACHMENT_SIZE_MISMATCH','Gemini API attachment byte size must match Source Acquisition',{expected:sourceAcquisition.retrieval.sizeBytes,actual:sourceAttachmentAudit.fileSizeBytes}));
  }
  const uri=sourceAttachment?.geminiFileUri??sourceAttachmentAudit?.geminiFileUri??null;
  if(!nonBlank(uri))errors.push(makeError('SOURCE_DELIVERY_ATTACHMENT_REFERENCE_MISSING','Gemini API attachment URI is required'));
  if(executionReference!==null&&!nonBlank(executionReference))errors.push(makeError('SOURCE_DELIVERY_EXECUTION_REFERENCE_INVALID','executionReference must be non-empty when supplied'));
  if(errors.length)return{pass:false,record:null,errors};
  return{pass:true,record:{
    schemaVersion:SOURCE_DELIVERY_SCHEMA_VERSION,
    recordType:SOURCE_DELIVERY_RECORD_TYPE,
    status:'PASS',
    executionChannel:'GEMINI_API',
    executionReference,
    source:commonSource(sourceAcquisition),
    scope:{
      pdfPages:[...sourceAcquisition.scope.pdfPages],
      printedPages:[...(sourceAcquisition.scope.printedPages??[])],
      canonicalFields:[...(sourceAcquisition.scope.canonicalFields??[])]
    },
    delivery:{
      method:'GEMINI_FILE_ATTACHMENT',
      evidenceDeliveryMode:'VERIFIED_PDF_FILE_ATTACHMENT_WITH_SCOPED_PROMPT',
      sourceSha256:sourceAttachmentAudit.sourceSha256,
      fileSizeBytes:sourceAttachmentAudit.fileSizeBytes,
      mimeType:sourceAttachmentAudit.mimeType,
      providerFileName:sourceAttachment?.providerFileName??sourceAttachmentAudit.providerFileName??null,
      providerState:sourceAttachmentAudit.providerState??null
    },
    providerAttachmentReference:uri,
    credentialMaterialPersisted:false
  },errors:[]};
}

export function validateSourceDeliveryRecord(record,{job=null,sourceAcquisition=null}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[makeError('SOURCE_DELIVERY_RECORD_INVALID','Source Delivery record must be an object')]};
  if(record.schemaVersion!==SOURCE_DELIVERY_SCHEMA_VERSION)errors.push(makeError('SOURCE_DELIVERY_SCHEMA_MISMATCH','Unsupported Source Delivery schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==SOURCE_DELIVERY_RECORD_TYPE)errors.push(makeError('SOURCE_DELIVERY_RECORD_TYPE_INVALID','Unexpected Source Delivery recordType',{actual:record.recordType??null}));
  if(record.status!=='PASS')errors.push(makeError('SOURCE_DELIVERY_STATUS_NOT_PASS','Source Delivery record must be PASS',{actual:record.status??null}));
  if(!SOURCE_DELIVERY_METHODS.has(record?.delivery?.method))errors.push(makeError('SOURCE_DELIVERY_METHOD_INVALID','Unsupported Source Delivery method',{actual:record?.delivery?.method??null}));
  if(record.credentialMaterialPersisted!==false)errors.push(makeError('SOURCE_DELIVERY_SECRET_POLICY_INVALID','Source Delivery must declare credentialMaterialPersisted=false'));
  if(job?.executionChannel&&record.executionChannel!==job.executionChannel)errors.push(makeError('SOURCE_DELIVERY_JOB_CHANNEL_MISMATCH','Source Delivery channel does not match Gemini Job',{expected:job.executionChannel,actual:record.executionChannel??null}));
  if(job?.executionReference&&record.executionReference!==job.executionReference)errors.push(makeError('SOURCE_DELIVERY_EXECUTION_REFERENCE_MISMATCH','Source Delivery executionReference does not match Gemini Job',{expected:job.executionReference,actual:record.executionReference??null}));
  if(sourceAcquisition){
    const source=record.source??{};
    const expected=commonSource(sourceAcquisition);
    for(const key of['driveFileId','title','version','acquiredSha256','identityMode'])if(expected[key]!==null&&source[key]!==expected[key])errors.push(makeError('SOURCE_DELIVERY_SOURCE_MISMATCH',`Source Delivery source.${key} does not match Source Acquisition`,{field:key,expected:expected[key],actual:source[key]??null}));
    if(record.executionChannel!==sourceAcquisition.executionChannel)errors.push(makeError('SOURCE_DELIVERY_ACQUISITION_CHANNEL_MISMATCH','Source Delivery channel does not match Source Acquisition',{expected:sourceAcquisition.executionChannel,actual:record.executionChannel??null}));
    if(!sameArray(record?.scope?.pdfPages,sourceAcquisition?.scope?.pdfPages??[]))errors.push(makeError('SOURCE_DELIVERY_SCOPE_MISMATCH','Source Delivery pdfPages do not match Source Acquisition'));
    if(!sameArray(record?.scope?.printedPages??[],sourceAcquisition?.scope?.printedPages??[]))errors.push(makeError('SOURCE_DELIVERY_PRINTED_SCOPE_MISMATCH','Source Delivery printedPages do not match Source Acquisition'));
  }
  return{pass:errors.length===0,errors};
}
