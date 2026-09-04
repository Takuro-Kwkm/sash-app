import{CANONICAL_FIELD_NAMES}from'./canonical-fields.mjs';
import{validateEvidenceCandidate}from'./evidence-inbox.mjs';

export const GEMINI_TRANSPORT_SCHEMA_VERSION='1.0';
export const GEMINI_TRANSPORT_TYPE='EVIDENCE_CANDIDATE_BATCH';
export const GEMINI_PRODUCER_SYSTEM='GEMINI_NOTEBOOKLM';
export const GEMINI_PRODUCER_SYSTEMS=new Set(['GEMINI_NOTEBOOKLM','GEMINI_ANTIGRAVITY']);
export const GEMINI_PRODUCER_MODES=new Set(['LIVE_EXTERNAL','SIMULATED_FIXTURE']);
export const GEMINI_TRANSPORT_ISSUE_TYPES=new Set(['SOURCE_AMBIGUOUS','LOCATOR_UNRESOLVED','CLAIM_TOO_BROAD','SOURCE_CONFLICT','OTHER']);

const error=(code,message,ref=null)=>({code,message,...(ref?{ref}:{})});
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

export function validateGeminiTransportEnvelope(envelope,{expectedProductId=null,expectedProducerSystem=null,knownFields=CANONICAL_FIELD_NAMES,nodeIds=new Set()}={}){
  const errors=[];
  if(!isObject(envelope))return{pass:false,errors:[error('TRANSPORT_NOT_OBJECT','Gemini transport payload must be a JSON object')]};
  if(envelope.transportSchemaVersion!==GEMINI_TRANSPORT_SCHEMA_VERSION)errors.push(error('TRANSPORT_SCHEMA_VERSION_INVALID',`Unsupported transportSchemaVersion: ${envelope.transportSchemaVersion}`));
  if(envelope.transportType!==GEMINI_TRANSPORT_TYPE)errors.push(error('TRANSPORT_TYPE_INVALID',`transportType must be ${GEMINI_TRANSPORT_TYPE}`));
  if(!envelope.batchId)errors.push(error('TRANSPORT_BATCH_ID_MISSING','batchId is required'));
  if(!envelope.generatedAt)errors.push(error('TRANSPORT_GENERATED_AT_MISSING','generatedAt is required'));
  const producerSystem=envelope.producer?.system;
  if(expectedProducerSystem){
    if(producerSystem!==expectedProducerSystem)errors.push(error('TRANSPORT_PRODUCER_INVALID',`producer.system must be ${expectedProducerSystem}`));
  }else if(!GEMINI_PRODUCER_SYSTEMS.has(producerSystem))errors.push(error('TRANSPORT_PRODUCER_INVALID',`Unsupported producer.system: ${producerSystem}`));
  if(!GEMINI_PRODUCER_MODES.has(envelope.producer?.mode))errors.push(error('TRANSPORT_PRODUCER_MODE_INVALID',`Unsupported producer.mode: ${envelope.producer?.mode}`));
  if(!envelope.productId)errors.push(error('TRANSPORT_PRODUCT_ID_MISSING','productId is required'));
  if(expectedProductId&&envelope.productId!==expectedProductId)errors.push(error('TRANSPORT_PRODUCT_MISMATCH',`Transport productId ${envelope.productId} does not match ${expectedProductId}`));
  const source=envelope.sourceContext??{};
  if(source.type!=='OFFICIAL_PDF')errors.push(error('TRANSPORT_SOURCE_TYPE_INVALID','v0.4 transport currently accepts sourceContext.type=OFFICIAL_PDF only'));
  if(!source.driveFileId)errors.push(error('TRANSPORT_SOURCE_FILE_ID_MISSING','sourceContext.driveFileId is required'));
  if(!source.title)errors.push(error('TRANSPORT_SOURCE_TITLE_MISSING','sourceContext.title is required'));
  if(!Array.isArray(envelope.candidates))errors.push(error('TRANSPORT_CANDIDATES_INVALID','candidates must be an array'));
  if(!Array.isArray(envelope.issues))errors.push(error('TRANSPORT_ISSUES_INVALID','issues must be an array'));
  if(Array.isArray(envelope.candidates)&&Array.isArray(envelope.issues)&&envelope.candidates.length===0&&envelope.issues.length===0)errors.push(error('TRANSPORT_EMPTY_BATCH','Transport must contain at least one candidate or issue'));

  const ids=new Set();
  for(const [index,row]of (envelope.candidates??[]).entries()){
    if(!isObject(row)){errors.push(error('TRANSPORT_CANDIDATE_NOT_OBJECT',`candidates[${index}] must be an object`));continue;}
    if(ids.has(row.id))errors.push(error('TRANSPORT_DUPLICATE_ID',`Duplicate transport record id: ${row.id}`,row.id));
    if(row.id)ids.add(row.id);
    if(row.sourceSystem!==producerSystem)errors.push(error('TRANSPORT_CANDIDATE_SOURCE_SYSTEM_INVALID',`Candidate ${row.id??index} must use sourceSystem=${producerSystem}`,row.id));
    if(row.producerMode!==envelope.producer?.mode)errors.push(error('TRANSPORT_CANDIDATE_MODE_MISMATCH',`Candidate ${row.id??index} producerMode must match envelope producer.mode`,row.id));
    if(row.productId!==envelope.productId)errors.push(error('TRANSPORT_CANDIDATE_PRODUCT_MISMATCH',`Candidate ${row.id??index} productId must match envelope productId`,row.id));
    if(row.source?.driveFileId!==source.driveFileId)errors.push(error('TRANSPORT_CANDIDATE_SOURCE_MISMATCH',`Candidate ${row.id??index} Drive file must match sourceContext`,row.id));
    const report=validateEvidenceCandidate(row,{productId:envelope.productId,knownFields,nodeIds});
    for(const item of report.errors)errors.push(error(`TRANSPORT_${item.code}`,item.message,row.id));
  }

  for(const [index,row]of (envelope.issues??[]).entries()){
    if(!isObject(row)){errors.push(error('TRANSPORT_ISSUE_NOT_OBJECT',`issues[${index}] must be an object`));continue;}
    if(!row.id)errors.push(error('TRANSPORT_ISSUE_ID_MISSING',`issues[${index}] id is required`));
    if(row.id&&ids.has(row.id))errors.push(error('TRANSPORT_DUPLICATE_ID',`Duplicate transport record id: ${row.id}`,row.id));
    if(row.id)ids.add(row.id);
    if(!GEMINI_TRANSPORT_ISSUE_TYPES.has(row.type))errors.push(error('TRANSPORT_ISSUE_TYPE_INVALID',`Unsupported issue type: ${row.type}`,row.id));
    if(!row.question)errors.push(error('TRANSPORT_ISSUE_QUESTION_MISSING','Transport issue requires question',row.id));
    if(row.subjectField&&!knownFields.has(row.subjectField))errors.push(error('TRANSPORT_ISSUE_FIELD_INVALID',`Invalid issue subjectField: ${row.subjectField}`,row.id));
  }
  return{pass:errors.length===0,errors,metrics:{candidates:envelope.candidates?.length??0,issues:envelope.issues?.length??0}};
}

export function parseGeminiTransportJson(raw,options={}){
  if(typeof raw!=='string'||!raw.trim())return{pass:false,envelope:null,errors:[error('TRANSPORT_JSON_EMPTY','Transport JSON text is empty')]};
  const trimmed=raw.trim();
  if(trimmed.startsWith('```')||trimmed.endsWith('```'))return{pass:false,envelope:null,errors:[error('TRANSPORT_MARKDOWN_FENCE_FORBIDDEN','Transport must be pure JSON without Markdown code fences')]};
  let envelope;
  try{envelope=JSON.parse(trimmed);}catch(err){return{pass:false,envelope:null,errors:[error('TRANSPORT_JSON_PARSE_ERROR',err.message)]};}
  const validation=validateGeminiTransportEnvelope(envelope,options);
  return{...validation,envelope:validation.pass?envelope:null};
}

export function importGeminiTransport(raw,options={}){
  const parsed=parseGeminiTransportJson(raw,options);
  if(!parsed.pass)return{pass:false,candidates:[],issues:[],errors:parsed.errors};
  return{
    pass:true,
    batch:{id:parsed.envelope.batchId,generatedAt:parsed.envelope.generatedAt,producer:{...parsed.envelope.producer},productId:parsed.envelope.productId,sourceContext:{...parsed.envelope.sourceContext}},
    candidates:parsed.envelope.candidates.map((row)=>structuredClone(row)),
    issues:parsed.envelope.issues.map((row)=>structuredClone(row)),
    errors:[]
  };
}
