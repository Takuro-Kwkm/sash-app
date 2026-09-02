import crypto from'node:crypto';

export const TECHNICAL_FACT_SCHEMA_VERSION='1.0';
export const TECHNICAL_FACT_TYPES=new Set(['DIMENSION_FORMULA']);
export const TECHNICAL_FACT_WORKBOOK_POLICIES=new Set(['CONTROL_PLANE_ONLY','MUTATION_REQUIRED']);
export const TECHNICAL_FACT_RUNTIME_POLICIES=new Set(['REFERENCE_ONLY_NOT_CONSUMED','EXPLICIT_ADAPTER_REQUIRED']);

const err=(code,message,details={})=>({code,message,...details});
const clone=(value)=>structuredClone(value);
const sortDeep=(value)=>{
  if(Array.isArray(value))return value.map(sortDeep);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,sortDeep(value[key])]));
  return value;
};
const stableJson=(value)=>JSON.stringify(sortDeep(value));
const sha256=(value)=>crypto.createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');

export const technicalFactFingerprint=(fact)=>`sha256:${sha256({...fact,fingerprint:undefined})}`;

export function validateTechnicalFact(fact){
  const errors=[];
  if(!fact||typeof fact!=='object'||Array.isArray(fact))return{pass:false,errors:[err('TECHNICAL_FACT_INVALID','Technical Fact must be an object')]};
  if(fact.schemaVersion!==TECHNICAL_FACT_SCHEMA_VERSION)errors.push(err('TECHNICAL_FACT_SCHEMA_INVALID',`Unsupported Technical Fact schema: ${fact.schemaVersion}`));
  if(fact.recordType!=='TECHNICAL_FACT')errors.push(err('TECHNICAL_FACT_RECORD_TYPE_INVALID','recordType must be TECHNICAL_FACT'));
  if(!fact.id)errors.push(err('TECHNICAL_FACT_ID_REQUIRED','Technical Fact id is required'));
  if(!fact.productId)errors.push(err('TECHNICAL_FACT_PRODUCT_REQUIRED','productId is required'));
  if(!TECHNICAL_FACT_TYPES.has(fact.factType))errors.push(err('TECHNICAL_FACT_TYPE_INVALID',`Unsupported factType: ${fact.factType}`));
  if(fact.canonicalField!==null)errors.push(err('TECHNICAL_FACT_CANONICAL_FIELD_FORBIDDEN','Technical Facts must not be forced into a Canonical Field'));
  if(!Array.isArray(fact.productNodeIds)||fact.productNodeIds.length===0)errors.push(err('TECHNICAL_FACT_NODE_REQUIRED','At least one productNodeId is required'));
  if(!TECHNICAL_FACT_WORKBOOK_POLICIES.has(fact.formalWorkbookPolicy))errors.push(err('TECHNICAL_FACT_WORKBOOK_POLICY_INVALID',`Unsupported formalWorkbookPolicy: ${fact.formalWorkbookPolicy}`));
  if(!TECHNICAL_FACT_RUNTIME_POLICIES.has(fact.runtimePolicy))errors.push(err('TECHNICAL_FACT_RUNTIME_POLICY_INVALID',`Unsupported runtimePolicy: ${fact.runtimePolicy}`));
  const source=fact.source;
  if(source?.type!=='OFFICIAL_PDF'||!source?.driveFileId||!Number.isInteger(source?.printedPage)||!Number.isInteger(source?.pdfPage)||!source?.locatorText)errors.push(err('TECHNICAL_FACT_SOURCE_INVALID','Technical Fact requires exact OFFICIAL_PDF source locator'));
  if(fact.factType==='DIMENSION_FORMULA'){
    if(fact.unit!=='mm')errors.push(err('TECHNICAL_FACT_FORMULA_UNIT_INVALID','DIMENSION_FORMULA unit must be mm'));
    if(!fact.formula||typeof fact.formula!=='object')errors.push(err('TECHNICAL_FACT_FORMULA_REQUIRED','DIMENSION_FORMULA requires formula'));
    for(const axis of['w','h']){
      const term=fact.formula?.[axis];
      if(!term||!['sash_w','sash_h'].includes(term.base)||!Number.isFinite(term.offsetMm))errors.push(err('TECHNICAL_FACT_FORMULA_TERM_INVALID',`Invalid ${axis} formula term`));
    }
  }
  const expected=technicalFactFingerprint(fact);
  if(fact.fingerprint&&fact.fingerprint!==expected)errors.push(err('TECHNICAL_FACT_FINGERPRINT_MISMATCH','Technical Fact fingerprint does not match content'));
  return{pass:errors.length===0,errors,fingerprint:expected};
}

export function createTechnicalFact(input){
  const fact={
    schemaVersion:TECHNICAL_FACT_SCHEMA_VERSION,
    recordType:'TECHNICAL_FACT',
    status:'VERIFIED',
    canonicalField:null,
    formalWorkbookPolicy:'CONTROL_PLANE_ONLY',
    runtimePolicy:'REFERENCE_ONLY_NOT_CONSUMED',
    ...clone(input)
  };
  fact.fingerprint=technicalFactFingerprint(fact);
  const validation=validateTechnicalFact(fact);
  if(!validation.pass)return{pass:false,status:'TECHNICAL_FACT_REJECTED',errors:validation.errors};
  return{pass:true,status:'TECHNICAL_FACT_CREATED',fact,errors:[]};
}

export function validateTechnicalFactRegistry(facts){
  if(!Array.isArray(facts))return{pass:false,errors:[err('TECHNICAL_FACT_REGISTRY_INVALID','Technical Fact registry must be an array')]};
  const errors=[];
  const seen=new Set();
  for(const fact of facts){
    const validation=validateTechnicalFact(fact);
    errors.push(...validation.errors.map((row)=>({...row,technicalFactId:fact?.id??null})));
    if(fact?.id&&seen.has(fact.id))errors.push(err('TECHNICAL_FACT_ID_DUPLICATE',`Duplicate Technical Fact id: ${fact.id}`));
    if(fact?.id)seen.add(fact.id);
  }
  return{pass:errors.length===0,errors};
}
