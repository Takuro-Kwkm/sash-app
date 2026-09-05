const METHOD='NORMALIZED_TEXT_SHA256_AND_RENDER_PIXEL_SHA256';
const SHA256_RE=/^[a-f0-9]{64}$/i;
const makeError=(code,message,details={})=>({code,message,...details});
const sameArray=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>value===b[index]);
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;

export const GEMINI_SOURCE_EQUIVALENCE_SCHEMA_VERSION='1.0';
export const GEMINI_SOURCE_EQUIVALENCE_METHOD=METHOD;

export function validateScopedSourceEquivalenceProof({
  proof=null,
  authoritativeSource=null,
  attachmentSourceSha256=null,
  expectedPdfPages=[],
  expectedPrintedPages=[]
}={}){
  const errors=[];
  const authority=authoritativeSource??{};
  const authoritativeSha256=authority.sha256??null;
  const attachmentSha256=attachmentSourceSha256??null;

  if(!SHA256_RE.test(String(authoritativeSha256??'')))errors.push(makeError('SOURCE_EQUIVALENCE_AUTHORITY_SHA_INVALID','Authoritative Drive source SHA-256 is required'));
  if(!SHA256_RE.test(String(attachmentSha256??'')))errors.push(makeError('SOURCE_EQUIVALENCE_ATTACHMENT_SHA_INVALID','Attachment source SHA-256 is required'));
  if(errors.length)return{pass:false,status:'BLOCKED',mode:null,audit:null,errors};

  if(String(authoritativeSha256).toLowerCase()===String(attachmentSha256).toLowerCase()){
    return{
      pass:true,status:'PASS',mode:'FULL_BYTE_IDENTITY',
      audit:{
        schemaVersion:GEMINI_SOURCE_EQUIVALENCE_SCHEMA_VERSION,
        status:'PASS',method:'FULL_BYTE_SHA256_IDENTITY',
        authoritativeDriveSource:{driveFileId:authority.driveFileId??null,title:authority.title??null,version:authority.version??null,sha256:authoritativeSha256,pageCount:authority.pageCount??null},
        attachmentSourceSha256:attachmentSha256,
        evidenceScopeOnly:false,fullDocumentByteIdentity:true,
        pdfPages:[...expectedPdfPages],printedPages:[...expectedPrintedPages]
      },
      errors:[]
    };
  }

  if(!proof||typeof proof!=='object'||Array.isArray(proof)){
    return{pass:false,status:'BLOCKED',mode:'SCOPED_CONTENT_EQUIVALENCE',audit:null,errors:[makeError('SOURCE_EQUIVALENCE_PROOF_REQUIRED','Attachment bytes differ from the authoritative Drive source; scoped equivalence proof is required')]};
  }

  if(proof.schemaVersion!==GEMINI_SOURCE_EQUIVALENCE_SCHEMA_VERSION)errors.push(makeError('SOURCE_EQUIVALENCE_SCHEMA_MISMATCH','Unsupported source equivalence proof schema',{expected:GEMINI_SOURCE_EQUIVALENCE_SCHEMA_VERSION,actual:proof.schemaVersion??null}));
  if(proof.status!=='PASS')errors.push(makeError('SOURCE_EQUIVALENCE_STATUS_NOT_PASS','Scoped source equivalence proof is not PASS',{actual:proof.status??null}));
  if(proof.method!==METHOD)errors.push(makeError('SOURCE_EQUIVALENCE_METHOD_MISMATCH','Scoped source equivalence proof method is not accepted',{expected:METHOD,actual:proof.method??null}));

  const proofAuthority=proof.authoritativeDriveSource??{};
  for(const key of['driveFileId','title','version','sha256']){
    const expected=authority[key]??null;
    if(expected!==null&&proofAuthority[key]!==expected)errors.push(makeError('SOURCE_EQUIVALENCE_AUTHORITY_MISMATCH',`authoritativeDriveSource.${key} does not match`,{field:key,expected,actual:proofAuthority[key]??null}));
  }
  if(authority.pageCount!==undefined&&authority.pageCount!==null&&proofAuthority.pageCount!==authority.pageCount)errors.push(makeError('SOURCE_EQUIVALENCE_AUTHORITY_MISMATCH','authoritativeDriveSource.pageCount does not match',{field:'pageCount',expected:authority.pageCount,actual:proofAuthority.pageCount??null}));

  const retrieval=proof.retrievalSource??{};
  if(!nonBlank(retrieval.url))errors.push(makeError('SOURCE_EQUIVALENCE_RETRIEVAL_URL_MISSING','retrievalSource.url is required'));
  if(String(retrieval.sha256??'').toLowerCase()!==String(attachmentSha256).toLowerCase())errors.push(makeError('SOURCE_EQUIVALENCE_ATTACHMENT_SHA_MISMATCH','retrievalSource.sha256 does not match the actual attachment SHA-256',{expected:attachmentSha256,actual:retrieval.sha256??null}));
  if(authority.pageCount!==undefined&&authority.pageCount!==null&&retrieval.pageCount!==authority.pageCount)errors.push(makeError('SOURCE_EQUIVALENCE_PAGE_COUNT_MISMATCH','Retrieval source page count does not match authoritative source',{expected:authority.pageCount,actual:retrieval.pageCount??null}));

  const scope=proof.scope??{};
  if(scope.evidenceScopeOnly!==true)errors.push(makeError('SOURCE_EQUIVALENCE_SCOPE_NOT_RESTRICTED','Scoped equivalence must be explicitly limited to the Evidence scope'));
  if(scope.fullDocumentByteIdentity!==false)errors.push(makeError('SOURCE_EQUIVALENCE_FULL_IDENTITY_FLAG_INVALID','Byte-different sources must explicitly declare fullDocumentByteIdentity=false'));
  if(!sameArray(scope.pdfPages,expectedPdfPages))errors.push(makeError('SOURCE_EQUIVALENCE_PDF_SCOPE_MISMATCH','PDF page scope does not match the requested Evidence scope',{expected:expectedPdfPages,actual:scope.pdfPages??null}));
  if(!sameArray(scope.printedPages,expectedPrintedPages))errors.push(makeError('SOURCE_EQUIVALENCE_PRINTED_SCOPE_MISMATCH','Printed page scope does not match the requested Evidence scope',{expected:expectedPrintedPages,actual:scope.printedPages??null}));

  const pages=Array.isArray(proof.pages)?proof.pages:[];
  for(const pdfPage of expectedPdfPages){
    const row=pages.find((item)=>item?.pdfPage===pdfPage||item?.pdf_page===pdfPage);
    if(!row){errors.push(makeError('SOURCE_EQUIVALENCE_PAGE_PROOF_MISSING','Required page proof is missing',{pdfPage}));continue;}
    const textSha=row.textSha256??row.text_sha256??null;
    const driveTextSha=row.driveTextSha256??row.drive_text_sha256??null;
    const renderSha=row.renderSha256??row.render_sha256??null;
    const driveRenderSha=row.driveRenderSha256??row.drive_render_sha256??null;
    const textMatch=row.textMatch??row.text_match;
    const renderMatch=row.renderMatch??row.render_match;
    if(textMatch!==true||!SHA256_RE.test(String(textSha??''))||textSha!==driveTextSha)errors.push(makeError('SOURCE_EQUIVALENCE_TEXT_MISMATCH','Normalized text fingerprint does not match authoritative page',{pdfPage}));
    if(renderMatch!==true||!SHA256_RE.test(String(renderSha??''))||renderSha!==driveRenderSha)errors.push(makeError('SOURCE_EQUIVALENCE_RENDER_MISMATCH','Rendered pixel fingerprint does not match authoritative page',{pdfPage}));
  }

  const audit={
    schemaVersion:GEMINI_SOURCE_EQUIVALENCE_SCHEMA_VERSION,
    status:errors.length?'BLOCKED':'PASS',method:METHOD,
    authoritativeDriveSource:{driveFileId:authority.driveFileId??null,title:authority.title??null,version:authority.version??null,sha256:authoritativeSha256,pageCount:authority.pageCount??null},
    retrievalSource:{url:retrieval.url??null,catalogId:retrieval.catalogId??null,volumeId:retrieval.volumeId??null,sha256:retrieval.sha256??null,pageCount:retrieval.pageCount??null},
    attachmentSourceSha256:attachmentSha256,
    evidenceScopeOnly:true,fullDocumentByteIdentity:false,
    pdfPages:[...expectedPdfPages],printedPages:[...expectedPrintedPages],verifiedPageCount:expectedPdfPages.length
  };
  return{pass:errors.length===0,status:errors.length?'BLOCKED':'PASS',mode:'SCOPED_CONTENT_EQUIVALENCE',audit,errors};
}
