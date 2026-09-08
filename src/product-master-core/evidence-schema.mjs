export const EVIDENCE_SCHEMA_VERSION='1.0';
export const EVIDENCE_STATUSES=new Set(['CANDIDATE','VERIFIED','REJECTED','CONFLICT','SUPERSEDED']);
export const EVIDENCE_STRENGTHS=new Set(['EXPLICIT','DERIVED','SUPPORTING']);
export const EVIDENCE_SOURCE_TYPES=new Set(['OFFICIAL_PDF','OFFICIAL_WEB','MASTER_SOURCE','OTHER']);

const error=(code,message)=>({code,message});

export function validateEvidenceRecord(record,{knownFields=new Set(),nodeIds=new Set()}={}){
  if(record?.recordType==='EVIDENCE_CANDIDATE'||record?.candidateSchemaVersion){
    return{pass:false,legacy:false,errors:[error('INBOX_CANDIDATE_NOT_CANONICAL','Evidence Inbox Candidate cannot be stored in the Canonical Evidence Registry before adjudication')]};
  }
  if(record?.schemaVersion!==EVIDENCE_SCHEMA_VERSION)return{pass:true,legacy:true,errors:[]};
  const errors=[];
  if(!record.id)errors.push(error('EVIDENCE_ID_MISSING','Evidence id is required'));
  if(!record.claim)errors.push(error('EVIDENCE_CLAIM_MISSING','Evidence claim is required'));
  if(!record.subjectField||!knownFields.has(record.subjectField))errors.push(error('EVIDENCE_SUBJECT_FIELD_INVALID',`Invalid Evidence subjectField: ${record.subjectField}`));
  if(!EVIDENCE_STATUSES.has(record.status))errors.push(error('EVIDENCE_STATUS_INVALID',`Unsupported Evidence status: ${record.status}`));
  if(!EVIDENCE_STRENGTHS.has(record.strength))errors.push(error('EVIDENCE_STRENGTH_INVALID',`Unsupported Evidence strength: ${record.strength}`));
  const source=record.source??{};
  if(!EVIDENCE_SOURCE_TYPES.has(source.type))errors.push(error('EVIDENCE_SOURCE_TYPE_INVALID',`Unsupported Evidence source type: ${source.type}`));
  if(!source.title)errors.push(error('EVIDENCE_SOURCE_TITLE_MISSING','Evidence source title is required'));
  if(source.type==='OFFICIAL_PDF'){
    if(!source.driveFileId)errors.push(error('OFFICIAL_PDF_FILE_ID_MISSING','Official PDF Evidence requires Drive file id'));
    if(!Number.isInteger(source.printedPage)||source.printedPage<1)errors.push(error('OFFICIAL_PDF_PRINTED_PAGE_MISSING','Official PDF Evidence requires printedPage'));
    if(!Number.isInteger(source.pdfPage)||source.pdfPage<1)errors.push(error('OFFICIAL_PDF_PAGE_MISSING','Official PDF Evidence requires pdfPage'));
    if(!source.locatorText)errors.push(error('OFFICIAL_PDF_LOCATOR_MISSING','Official PDF Evidence requires locatorText'));
  }
  for(const nodeId of record.productNodeIds??[])if(!nodeIds.has(nodeId))errors.push(error('EVIDENCE_NODE_INVALID',`Evidence references missing Product Node: ${nodeId}`));
  if(record.status==='VERIFIED'&&!record.adjudication?.adjudicatedBy)errors.push(error('EVIDENCE_ADJUDICATION_MISSING','Verified Evidence requires adjudication.adjudicatedBy'));
  return{pass:errors.length===0,legacy:false,errors};
}

export function isVerifiedOfficialEvidence(record){
  return record?.schemaVersion===EVIDENCE_SCHEMA_VERSION&&record.status==='VERIFIED'&&['OFFICIAL_PDF','OFFICIAL_WEB'].includes(record.source?.type);
}
