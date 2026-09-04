const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clone=(value)=>structuredClone(value);

export const PRODUCT_MASTER_PROFILE_SCHEMA_VERSION='1.0';
export const PRODUCT_MASTER_PROFILE_RECORD_TYPE='PRODUCT_MASTER_PROFILE';

const FORBIDDEN_STORAGE_KEYS=new Set([
  'root_folder_id','rootFolderId','series_folder_id','seriesFolderId','canonical_folder_id','canonicalFolderId',
  'old_folder_id','oldFolderId','working_folder_id','workingFolderId','required_package_roles','requiredPackageRoles',
  'governing_spec','governingSpec'
]);

const error=(code,message,details={})=>({code,message,...details});
const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const sha256Like=(value)=>typeof value==='string'&&/^[0-9a-f]{64}$/i.test(value);
const positiveIntArray=(value)=>Array.isArray(value)&&value.length>0&&value.every((row)=>Number.isInteger(row)&&row>0);

function forbiddenStorageKeys(value,path='profile',found=[]){
  if(!isObject(value))return found;
  for(const [key,child] of Object.entries(value)){
    const nextPath=`${path}.${key}`;
    if(FORBIDDEN_STORAGE_KEYS.has(key))found.push(nextPath);
    if(isObject(child))forbiddenStorageKeys(child,nextPath,found);
  }
  return found;
}

export function validateProductProfile(input={}){
  const profile=clone(input);
  const errors=[];
  if(profile.profileSchemaVersion!==PRODUCT_MASTER_PROFILE_SCHEMA_VERSION)errors.push(error('PROFILE_SCHEMA_VERSION_INVALID',`profileSchemaVersion must be ${PRODUCT_MASTER_PROFILE_SCHEMA_VERSION}`));
  if(profile.recordType!==PRODUCT_MASTER_PROFILE_RECORD_TYPE)errors.push(error('PROFILE_RECORD_TYPE_INVALID',`recordType must be ${PRODUCT_MASTER_PROFILE_RECORD_TYPE}`));
  for(const key of['manufacturer','series','registrySeriesKey','productId'])if(!nonBlank(profile[key]))errors.push(error('PROFILE_IDENTITY_MISSING',`${key} is required`,{field:key}));

  const forbidden=forbiddenStorageKeys(profile);
  if(forbidden.length)errors.push(error('PROFILE_POLICY_STORAGE_OVERRIDE_FORBIDDEN','Product Profile must not contain Completion Policy storage/package authority fields',{fields:forbidden}));

  if(!isObject(profile.source))errors.push(error('PROFILE_SOURCE_INVALID','source must be an object'));
  else{
    if(profile.source.type!=='OFFICIAL_PDF')errors.push(error('PROFILE_SOURCE_TYPE_INVALID','source.type must be OFFICIAL_PDF'));
    for(const key of['driveFileId','title','version','officialDetailUrl','officialDownloadUrl'])if(!nonBlank(profile.source[key]))errors.push(error('PROFILE_SOURCE_FIELD_MISSING',`source.${key} is required`,{field:`source.${key}`}));
    if(!sha256Like(profile.source.authoritativeSha256))errors.push(error('PROFILE_SOURCE_SHA256_INVALID','source.authoritativeSha256 must be a 64-character SHA-256 hex string'));
    if(!Number.isInteger(profile.source.pageCount)||profile.source.pageCount<1)errors.push(error('PROFILE_SOURCE_PAGE_COUNT_INVALID','source.pageCount must be a positive integer'));
  }

  if(!isObject(profile.extraction))errors.push(error('PROFILE_EXTRACTION_INVALID','extraction must be an object'));
  else{
    for(const key of['task','prompt'])if(!nonBlank(profile.extraction[key]))errors.push(error('PROFILE_EXTRACTION_FIELD_MISSING',`extraction.${key} is required`,{field:`extraction.${key}`}));
    if(!positiveIntArray(profile.extraction.pageScope))errors.push(error('PROFILE_PAGE_SCOPE_INVALID','extraction.pageScope must be a non-empty positive-integer array'));
    if(!positiveIntArray(profile.extraction.printedPageScope))errors.push(error('PROFILE_PRINTED_PAGE_SCOPE_INVALID','extraction.printedPageScope must be a non-empty positive-integer array'));
    if(!Array.isArray(profile.extraction.canonicalFieldScope)||!profile.extraction.canonicalFieldScope.length||!profile.extraction.canonicalFieldScope.every(nonBlank))errors.push(error('PROFILE_CANONICAL_FIELD_SCOPE_INVALID','extraction.canonicalFieldScope must be a non-empty string array'));
  }

  return{pass:errors.length===0,profile:errors.length?null:profile,errors};
}

export function buildGeminiJobInputFromProductProfile(input={},overrides={}){
  const validated=validateProductProfile(input);
  if(!validated.pass)return{pass:false,jobInput:null,errors:validated.errors};
  const profile=validated.profile;
  const source=profile.source;
  const extraction=profile.extraction;
  const jobInput={
    job_id:overrides.job_id??overrides.jobId,
    job_type:overrides.job_type??overrides.jobType??extraction.jobType??'EVIDENCE_EXTRACTION',
    manufacturer:profile.manufacturer,
    series:profile.series,
    product_id:profile.productId,
    task:overrides.task??extraction.task,
    prompt:overrides.prompt??extraction.prompt,
    source_context:{type:source.type,driveFileId:source.driveFileId,title:source.title,version:source.version},
    source_drive_file_ids:[source.driveFileId],
    page_scope:clone(extraction.pageScope),
    printed_page_scope:clone(extraction.printedPageScope),
    canonical_field_scope:clone(extraction.canonicalFieldScope),
    evidence_requirements:clone(extraction.evidenceRequirements??null),
    source_attachment:{mime_type:'application/pdf',source_sha256:source.authoritativeSha256},
    expected_transport_type:'EVIDENCE_CANDIDATE_BATCH',
    expected_schema_version:'1.0',
    execution_mode:overrides.execution_mode??overrides.executionMode??'LIVE_EXTERNAL',
    model:overrides.model??profile.modelDefault??null,
    requested_by:overrides.requested_by??overrides.requestedBy??'CHATGPT',
    metadata:{
      profileSchemaVersion:profile.profileSchemaVersion,
      registrySeriesKey:profile.registrySeriesKey,
      sourcePageCount:source.pageCount,
      officialDetailUrl:source.officialDetailUrl,
      officialDownloadUrl:source.officialDownloadUrl,
      ...(profile.metadata??{}),
      ...(overrides.metadata??{})
    }
  };
  if(!jobInput.job_id)delete jobInput.job_id;
  return{pass:true,jobInput,errors:[]};
}
