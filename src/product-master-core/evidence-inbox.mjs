import{CANONICAL_FIELD_NAMES}from'./canonical-fields.mjs';
import{EVIDENCE_STRENGTHS,EVIDENCE_SOURCE_TYPES}from'./evidence-schema.mjs';

export const EVIDENCE_CANDIDATE_SCHEMA_VERSION='1.0';
export const EVIDENCE_CANDIDATE_STATUSES=new Set(['SUBMITTED','UNDER_REVIEW','ADJUDICATED']);
export const EVIDENCE_CANDIDATE_SOURCE_SYSTEMS=new Set(['GEMINI_NOTEBOOKLM','MANUAL_IMPORT','OTHER_AI']);

const error=(code,message)=>({code,message});

export function validateEvidenceCandidate(candidate,{productId=null,knownFields=CANONICAL_FIELD_NAMES,nodeIds=new Set()}={}){
  const errors=[];
  if(candidate?.recordType!=='EVIDENCE_CANDIDATE')errors.push(error('CANDIDATE_RECORD_TYPE_INVALID','Evidence Inbox item must use recordType=EVIDENCE_CANDIDATE'));
  if(candidate?.candidateSchemaVersion!==EVIDENCE_CANDIDATE_SCHEMA_VERSION)errors.push(error('CANDIDATE_SCHEMA_VERSION_INVALID',`Unsupported candidate schema: ${candidate?.candidateSchemaVersion}`));
  if(!candidate?.id)errors.push(error('CANDIDATE_ID_MISSING','Evidence Candidate id is required'));
  if(!EVIDENCE_CANDIDATE_SOURCE_SYSTEMS.has(candidate?.sourceSystem))errors.push(error('CANDIDATE_SOURCE_SYSTEM_INVALID',`Unsupported sourceSystem: ${candidate?.sourceSystem}`));
  if(!EVIDENCE_CANDIDATE_STATUSES.has(candidate?.status))errors.push(error('CANDIDATE_STATUS_INVALID',`Unsupported candidate status: ${candidate?.status}`));
  if(candidate?.canonicalStatus!==undefined||candidate?.status==='VERIFIED')errors.push(error('CANDIDATE_SELF_VERIFICATION_FORBIDDEN','Evidence Candidate cannot declare Canonical VERIFIED status'));
  if(productId&&candidate?.productId!==productId)errors.push(error('CANDIDATE_PRODUCT_MISMATCH',`Candidate productId ${candidate?.productId} does not match ${productId}`));
  if(!candidate?.subjectField||!knownFields.has(candidate.subjectField))errors.push(error('CANDIDATE_SUBJECT_FIELD_INVALID',`Invalid candidate subjectField: ${candidate?.subjectField}`));
  if(!candidate?.claim)errors.push(error('CANDIDATE_CLAIM_MISSING','Evidence Candidate claim is required'));
  if(!EVIDENCE_STRENGTHS.has(candidate?.proposedStrength))errors.push(error('CANDIDATE_STRENGTH_INVALID',`Unsupported proposedStrength: ${candidate?.proposedStrength}`));
  const source=candidate?.source??{};
  if(!EVIDENCE_SOURCE_TYPES.has(source.type))errors.push(error('CANDIDATE_SOURCE_TYPE_INVALID',`Unsupported source type: ${source.type}`));
  if(!source.title)errors.push(error('CANDIDATE_SOURCE_TITLE_MISSING','Candidate source title is required'));
  if(source.type==='OFFICIAL_PDF'){
    if(!source.driveFileId)errors.push(error('CANDIDATE_PDF_FILE_ID_MISSING','Official PDF candidate requires Drive file id'));
    if(!Number.isInteger(source.printedPage)||source.printedPage<1)errors.push(error('CANDIDATE_PDF_PRINTED_PAGE_MISSING','Official PDF candidate requires printedPage'));
    if(!Number.isInteger(source.pdfPage)||source.pdfPage<1)errors.push(error('CANDIDATE_PDF_PAGE_MISSING','Official PDF candidate requires pdfPage'));
    if(!source.locatorText)errors.push(error('CANDIDATE_PDF_LOCATOR_MISSING','Official PDF candidate requires locatorText'));
  }
  for(const nodeId of candidate?.productNodeIds??[])if(nodeIds.size&&!nodeIds.has(nodeId))errors.push(error('CANDIDATE_NODE_INVALID',`Candidate references missing Product Node: ${nodeId}`));
  return{pass:errors.length===0,errors};
}

export function markCandidateUnderReview(candidate,{at=new Date().toISOString(),by='CHATGPT'}={}){
  const report=validateEvidenceCandidate(candidate);
  if(!report.pass)throw new Error(report.errors.map((row)=>`${row.code}: ${row.message}`).join('\n'));
  if(candidate.status!=='SUBMITTED')throw new Error(`Candidate must be SUBMITTED before review: ${candidate.status}`);
  return{...candidate,status:'UNDER_REVIEW',review:{startedAt:at,startedBy:by}};
}
