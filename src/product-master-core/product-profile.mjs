import{
  WORKER_EXECUTION_CONTRACT_VERSION,
  DEFAULT_PREFERRED_EXECUTION_CHANNEL,
  DEFAULT_FALLBACK_EXECUTION_CHANNEL,
  normalizeWorkerExecutionContract
}from'./worker-execution-contract.mjs';

const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clone=(value)=>structuredClone(value);

export const PRODUCT_MASTER_PROFILE_SCHEMA_VERSION='1.1';
export const PRODUCT_MASTER_PROFILE_SCHEMA_VERSIONS=new Set(['1.0','1.1']);
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

function validateV11ProfileExtensions(profile,errors){
  if(!nonBlank(profile.schemaAdapter))errors.push(error('PROFILE_SCHEMA_ADAPTER_MISSING','schemaAdapter is required for profileSchemaVersion 1.1'));
  if(!isObject(profile.runtimePartitionPolicy))errors.push(error('PROFILE_RUNTIME_PARTITION_POLICY_INVALID','runtimePartitionPolicy must be an object for profileSchemaVersion 1.1'));
  if(!Array.isArray(profile.dependencyHooks)||!profile.dependencyHooks.every(nonBlank))errors.push(error('PROFILE_DEPENDENCY_HOOKS_INVALID','dependencyHooks must be an array of non-empty hook identifiers for profileSchemaVersion 1.1'));
}

export function validateProductProfile(input={}){
  const profile=clone(input);
  const errors=[];
  if(!PRODUCT_MASTER_PROFILE_SCHEMA_VERSIONS.has(profile.profileSchemaVersion))errors.push(error('PROFILE_SCHEMA_VERSION_INVALID',`profileSchemaVersion must be one of ${[...PRODUCT_MASTER_PROFILE_SCHEMA_VERSIONS].join(', ')}`));
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

  if(profile.profileSchemaVersion==='1.1')validateV11ProfileExtensions(profile,errors);
  return{pass:errors.length===0,profile:errors.length?null:profile,errors};
}

export function buildGeminiJobInputFromProductProfile(input={},overrides={}){
  const validated=validateProductProfile(input);
  if(!validated.pass)return{pass:false,jobInput:null,errors:validated.errors};
  const profile=validated.profile;
  const source=profile.source;
  const extraction=profile.extraction;
  const executionMode=overrides.execution_mode??overrides.executionMode??'LIVE_EXTERNAL';
  const preferredExecutionChannel=overrides.preferred_execution_channel??overrides.preferredExecutionChannel??DEFAULT_PREFERRED_EXECUTION_CHANNEL;
  const executionChannel=overrides.execution_channel??overrides.executionChannel??(executionMode==='LIVE_EXTERNAL'?preferredExecutionChannel:null);
  const worker=normalizeWorkerExecutionContract({
    execution_mode:executionMode,
    execution_channel:executionChannel,
    preferred_execution_channel:preferredExecutionChannel,
    fallback_execution_channel:overrides.fallback_execution_channel??overrides.fallbackExecutionChannel??DEFAULT_FALLBACK_EXECUTION_CHANNEL,
    fallback_allowed:overrides.fallback_allowed??overrides.fallbackAllowed??false,
    transport_method:overrides.transport_method??overrides.transportMethod,
    execution_reference:overrides.execution_reference??overrides.executionReference
  },{requireLiveChannel:true});
  if(!worker.pass)return{pass:false,jobInput:null,errors:worker.errors};
  const contract=worker.contract;
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
    worker_contract_version:WORKER_EXECUTION_CONTRACT_VERSION,
    execution_mode:executionMode,
    execution_channel:contract.executionChannel,
    preferred_execution_channel:contract.preferredExecutionChannel,
    fallback_execution_channel:contract.fallbackExecutionChannel,
    fallback_allowed:contract.fallbackAllowed,
    transport_method:contract.transportMethod,
    execution_reference:contract.executionReference,
    model:overrides.model??profile.modelDefault??null,
    requested_by:overrides.requested_by??overrides.requestedBy??'CHATGPT',
    metadata:{
      profileSchemaVersion:profile.profileSchemaVersion,
      registrySeriesKey:profile.registrySeriesKey,
      schemaAdapter:profile.schemaAdapter??null,
      runtimePartitionPolicy:clone(profile.runtimePartitionPolicy??null),
      dependencyHooks:clone(profile.dependencyHooks??[]),
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
