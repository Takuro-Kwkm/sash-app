import{productMasterFingerprint,stableJson,sha256}from'./master-change-control.mjs';
import{validateAuthoringStagingProvenance}from'./authoring-staging-provenance.mjs';

export const RUNTIME_GENERATION_PROVENANCE_SCHEMA_VERSION='1.1';
export const RUNTIME_GENERATION_PROVENANCE_RECORD_TYPE='PRODUCT_MASTER_RUNTIME_GENERATION_PROVENANCE';
export const RUNTIME_CANDIDATE_MANIFEST_SCHEMA_VERSION='1.1';
export const RUNTIME_CANDIDATE_MANIFEST_RECORD_TYPE='PRODUCT_MASTER_RUNTIME_CANDIDATE_MANIFEST';

const error=(code,message,details={})=>({code,message,...details});
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const stableHash=(value)=>`sha256:${sha256(stableJson(value))}`;
const safeFileName=(value)=>nonBlank(value)&&!value.includes('/')&&!value.includes('\\')&&value!=='.'&&value!=='..';

function normalizeRuntimeFiles(runtimeFiles){
  const errors=[];
  if(!Array.isArray(runtimeFiles)||runtimeFiles.length===0)return{pass:false,files:[],errors:[error('RUNTIME_GENERATION_FILES_REQUIRED','Runtime generation requires at least one Runtime JSON file')]};
  const roles=new Set();
  const names=new Set();
  const files=[];
  for(const [index,row] of runtimeFiles.entries()){
    if(!isObject(row)){errors.push(error('RUNTIME_GENERATION_FILE_INVALID','Runtime file entry must be an object',{index}));continue;}
    const role=row.role;
    const name=row.name;
    if(!nonBlank(role))errors.push(error('RUNTIME_GENERATION_ROLE_REQUIRED','Runtime file role is required',{index}));
    if(!safeFileName(name))errors.push(error('RUNTIME_GENERATION_FILE_NAME_INVALID','Runtime file name must be a safe basename',{index,name:name??null}));
    if(nonBlank(role)&&roles.has(role))errors.push(error('RUNTIME_GENERATION_DUPLICATE_ROLE','Runtime file roles must be unique',{role}));
    if(safeFileName(name)&&names.has(name))errors.push(error('RUNTIME_GENERATION_DUPLICATE_NAME','Runtime file names must be unique',{name}));
    if(nonBlank(role))roles.add(role);
    if(safeFileName(name))names.add(name);
    if(row.content===undefined)errors.push(error('RUNTIME_GENERATION_CONTENT_REQUIRED','Runtime file content is required',{index,name:name??null}));
    let fingerprint=null;
    if(row.content!==undefined){
      try{fingerprint=stableHash(row.content);}catch(cause){errors.push(error('RUNTIME_GENERATION_CONTENT_NOT_JSON','Runtime file content must be JSON serializable',{index,name:name??null,cause:cause.message}));}
    }
    files.push({role,name,content:row.content,fingerprint});
  }
  return{pass:errors.length===0,files,errors};
}

function fileDescriptors(files){
  return files.map(({role,name,fingerprint})=>({role,name,fingerprint})).sort((a,b)=>`${a.role}|${a.name}`.localeCompare(`${b.role}|${b.name}`));
}

export function buildRuntimeGenerationProvenance({
  authoringMaster,authoringStagingProvenance,runtimeFiles,generator,validation={pass:true},generatedAt=new Date().toISOString()
}={}){
  const errors=[];
  if(!isObject(authoringMaster))errors.push(error('RUNTIME_GENERATION_AUTHORING_MASTER_REQUIRED','Runtime generation requires the exact Authoring STAGING Master'));
  const authoringValidation=validateAuthoringStagingProvenance(authoringStagingProvenance,{});
  if(!authoringValidation.pass)errors.push(...authoringValidation.errors.map((row)=>({...row,code:`RUNTIME_GENERATION_${row.code}`})));
  if(authoringStagingProvenance?.status!=='PASS'||authoringStagingProvenance?.stage!=='STAGING_CANDIDATE')errors.push(error('RUNTIME_GENERATION_AUTHORING_STAGE_INVALID','Runtime generation requires PASS/STAGING_CANDIDATE Authoring provenance'));
  if(!isObject(generator)||!nonBlank(generator.id)||!nonBlank(generator.version))errors.push(error('RUNTIME_GENERATION_GENERATOR_REQUIRED','Runtime generator id and version are required'));
  if(validation===false||validation?.pass===false)errors.push(error('RUNTIME_GENERATION_POST_VALIDATION_FAILED','Runtime candidate must pass generation validation',{validation}));
  const normalized=normalizeRuntimeFiles(runtimeFiles);
  if(!normalized.pass)errors.push(...normalized.errors);
  if(errors.length)return{pass:false,manifest:null,files:[],record:null,errors};

  const authoringFingerprint=productMasterFingerprint(authoringMaster);
  if(authoringStagingProvenance.resultMasterFingerprint!==authoringFingerprint)errors.push(error('RUNTIME_GENERATION_AUTHORING_FINGERPRINT_MISMATCH','Authoring STAGING Master does not match Authoring provenance',{expected:authoringStagingProvenance.resultMasterFingerprint,actual:authoringFingerprint}));
  if(!nonBlank(authoringStagingProvenance.productId)||!nonBlank(authoringStagingProvenance.proposalId))errors.push(error('RUNTIME_GENERATION_AUTHORING_IDENTITY_MISSING','Authoring provenance must retain productId and proposalId'));
  if(errors.length)return{pass:false,manifest:null,files:[],record:null,errors};

  const descriptors=fileDescriptors(normalized.files);
  const manifest={
    schemaVersion:RUNTIME_CANDIDATE_MANIFEST_SCHEMA_VERSION,
    recordType:RUNTIME_CANDIDATE_MANIFEST_RECORD_TYPE,
    status:'STAGING_CANDIDATE',
    productId:authoringStagingProvenance.productId,
    proposalId:authoringStagingProvenance.proposalId,
    generator:{id:generator.id,version:generator.version},
    authoringMasterFingerprint:authoringFingerprint,
    runtimeFiles:descriptors,
    generatedAt
  };
  const manifestFingerprint=stableHash(manifest);
  const provenanceFingerprint=stableHash(authoringStagingProvenance);
  const record={
    schemaVersion:RUNTIME_GENERATION_PROVENANCE_SCHEMA_VERSION,
    recordType:RUNTIME_GENERATION_PROVENANCE_RECORD_TYPE,
    status:'PASS',stage:'RUNTIME_STAGING_CANDIDATE',
    productId:manifest.productId,proposalId:manifest.proposalId,
    authoringMasterFingerprint:authoringFingerprint,
    authoringStagingProvenanceFingerprint:provenanceFingerprint,
    runtimeManifestFingerprint:manifestFingerprint,
    runtimeFileSetFingerprint:stableHash(descriptors),
    runtimeFiles:descriptors,
    generator:{id:generator.id,version:generator.version},
    validation:{status:'PASS',fingerprint:stableHash(validation)},
    generatedAt,
    authority:{
      runtimeCandidateGenerated:true,
      canonicalRuntimeWritePerformed:false,
      productionMasterWritePerformed:false,
      registryWritePerformed:false,
      formalPass:false,
      appIntegrationReady:false
    }
  };
  return{pass:true,manifest,files:normalized.files,record,errors:[]};
}

export function validateRuntimeGenerationProvenance(record,{
  authoringMaster=null,authoringStagingProvenance=null,manifest=null,runtimeFiles=null,generator=null,validation={pass:true}
}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[error('RUNTIME_GENERATION_PROVENANCE_INVALID','Runtime generation provenance must be an object')]};
  if(record.schemaVersion!==RUNTIME_GENERATION_PROVENANCE_SCHEMA_VERSION)errors.push(error('RUNTIME_GENERATION_SCHEMA_INVALID','Unsupported Runtime generation provenance schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==RUNTIME_GENERATION_PROVENANCE_RECORD_TYPE)errors.push(error('RUNTIME_GENERATION_TYPE_INVALID','Unexpected Runtime generation provenance recordType',{actual:record.recordType??null}));
  if(record.status!=='PASS'||record.stage!=='RUNTIME_STAGING_CANDIDATE')errors.push(error('RUNTIME_GENERATION_STATUS_INVALID','Persistable Runtime provenance must be PASS/RUNTIME_STAGING_CANDIDATE',{status:record.status??null,stage:record.stage??null}));
  const authority=record.authority??{};
  if(authority.runtimeCandidateGenerated!==true||authority.canonicalRuntimeWritePerformed!==false||authority.productionMasterWritePerformed!==false||authority.registryWritePerformed!==false||authority.formalPass!==false||authority.appIntegrationReady!==false)errors.push(error('RUNTIME_GENERATION_AUTHORITY_INVALID','Runtime generation provenance must remain non-canonical, non-formal and not app-integration-ready'));
  if(!nonBlank(record.generator?.id)||!nonBlank(record.generator?.version))errors.push(error('RUNTIME_GENERATION_GENERATOR_INVALID','Runtime provenance must retain generator id/version'));
  if(!Array.isArray(record.runtimeFiles)||record.runtimeFiles.length===0)errors.push(error('RUNTIME_GENERATION_FILE_SET_INVALID','Runtime provenance must retain at least one Runtime file descriptor'));

  if(authoringMaster){
    const actual=productMasterFingerprint(authoringMaster);
    if(record.authoringMasterFingerprint!==actual)errors.push(error('RUNTIME_GENERATION_AUTHORING_MASTER_STALE','Authoring Master changed after Runtime generation',{expected:record.authoringMasterFingerprint,actual}));
  }
  if(authoringStagingProvenance){
    const validationResult=validateAuthoringStagingProvenance(authoringStagingProvenance,{});
    if(!validationResult.pass)errors.push(...validationResult.errors.map((row)=>({...row,code:`RUNTIME_GENERATION_${row.code}`})));
    const actual=stableHash(authoringStagingProvenance);
    if(record.authoringStagingProvenanceFingerprint!==actual)errors.push(error('RUNTIME_GENERATION_AUTHORING_PROVENANCE_STALE','Authoring STAGING provenance changed after Runtime generation',{expected:record.authoringStagingProvenanceFingerprint,actual}));
    if(record.productId!==authoringStagingProvenance.productId||record.proposalId!==authoringStagingProvenance.proposalId)errors.push(error('RUNTIME_GENERATION_AUTHORING_IDENTITY_MISMATCH','Runtime provenance identity does not match Authoring provenance'));
  }
  if(manifest){
    if(manifest.schemaVersion!==RUNTIME_CANDIDATE_MANIFEST_SCHEMA_VERSION||manifest.recordType!==RUNTIME_CANDIDATE_MANIFEST_RECORD_TYPE||manifest.status!=='STAGING_CANDIDATE')errors.push(error('RUNTIME_GENERATION_MANIFEST_INVALID','Runtime manifest must be a STAGING_CANDIDATE manifest'));
    const actual=stableHash(manifest);
    if(record.runtimeManifestFingerprint!==actual)errors.push(error('RUNTIME_GENERATION_MANIFEST_FINGERPRINT_MISMATCH','Runtime manifest changed after generation',{expected:record.runtimeManifestFingerprint,actual}));
    if(manifest.productId!==record.productId||manifest.proposalId!==record.proposalId||manifest.authoringMasterFingerprint!==record.authoringMasterFingerprint)errors.push(error('RUNTIME_GENERATION_MANIFEST_BINDING_MISMATCH','Runtime manifest identity or Authoring binding does not match provenance'));
  }
  if(runtimeFiles){
    const normalized=normalizeRuntimeFiles(runtimeFiles);
    if(!normalized.pass)errors.push(...normalized.errors);
    else{
      const descriptors=fileDescriptors(normalized.files);
      const actualSet=stableHash(descriptors);
      if(record.runtimeFileSetFingerprint!==actualSet)errors.push(error('RUNTIME_GENERATION_FILE_SET_FINGERPRINT_MISMATCH','Runtime file set changed after generation',{expected:record.runtimeFileSetFingerprint,actual:actualSet}));
      if(stableHash(record.runtimeFiles)!==stableHash(descriptors))errors.push(error('RUNTIME_GENERATION_FILE_DESCRIPTOR_MISMATCH','Runtime file descriptors no longer match generated files'));
      if(manifest&&stableHash(manifest.runtimeFiles)!==stableHash(descriptors))errors.push(error('RUNTIME_GENERATION_MANIFEST_FILE_SET_MISMATCH','Runtime manifest file set no longer matches generated files'));
    }
  }
  if(generator&&(record.generator.id!==generator.id||record.generator.version!==generator.version))errors.push(error('RUNTIME_GENERATION_GENERATOR_STALE','Runtime generator identity changed after generation'));
  if(validation===false||validation?.pass===false)errors.push(error('RUNTIME_GENERATION_POST_VALIDATION_FAILED','Runtime candidate validation is not PASS',{validation}));
  return{pass:errors.length===0,errors};
}
