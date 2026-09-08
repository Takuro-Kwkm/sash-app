import{validateProductProfile}from'./product-profile.mjs';

export const PROFILE_ONBOARDING_READINESS_SCHEMA_VERSION='3.1';
export const PROFILE_ONBOARDING_READINESS_RECORD_TYPE='PRODUCT_MASTER_PROFILE_ONBOARDING_READINESS';

const nonBlank=(value)=>typeof value==='string'&&value.trim().length>0;
const arrayOfNonBlank=(value)=>Array.isArray(value)&&value.length>0&&value.every(nonBlank);

const POLICY_FIELDS=[
  'manufacturer','series','series_folder_id','canonical_folder_id','old_folder_id','working_folder_id',
  'registry_series_key','required_package_roles','governing_spec'
];

const MUTATION_KEYS=[
  'canonicalWriteAllowed','authoringWriteAllowed','runtimeWriteAllowed','registryWriteAllowed','productionWriteAllowed'
];

const safeAuthority=(authority={})=>MUTATION_KEYS.every((key)=>authority[key]===false);
const uniq=(items)=>[...new Set(items)];

export function detectProductSpecificCommonCoreReferences({profile,files=[]}={}){
  const tokens=uniq([
    profile?.manufacturer,
    profile?.series,
    profile?.registrySeriesKey,
    profile?.productId,
    profile?.source?.driveFileId
  ].filter(nonBlank));
  const findings=[];
  for(const file of files){
    if(!nonBlank(file?.path)||typeof file?.content!=='string')continue;
    for(const token of tokens){
      if(file.content.includes(token))findings.push({path:file.path,token});
    }
  }
  return findings;
}

export function evaluateProductMasterProfileOnboardingPreflight(input={}){
  const blockers=[];
  const warnings=[];
  const profileResult=validateProductProfile(input.profile??{});
  if(!profileResult.pass){
    blockers.push(...profileResult.errors.map((row)=>`PROFILE:${row.code}`));
  }
  const profile=profileResult.profile??input.profile??{};
  const policy=input.policySeriesEntry??{};

  for(const field of POLICY_FIELDS){
    const value=policy[field];
    const valid=field==='required_package_roles'?arrayOfNonBlank(value):nonBlank(value);
    if(!valid)blockers.push(`POLICY_FIELD_MISSING:${field}`);
  }

  if(nonBlank(profile.manufacturer)&&nonBlank(policy.manufacturer)&&profile.manufacturer!==policy.manufacturer)blockers.push('POLICY_PROFILE_MANUFACTURER_MISMATCH');
  if(nonBlank(profile.series)&&nonBlank(policy.series)&&profile.series!==policy.series)blockers.push('POLICY_PROFILE_SERIES_MISMATCH');
  if(nonBlank(profile.registrySeriesKey)&&nonBlank(policy.registry_series_key)&&profile.registrySeriesKey!==policy.registry_series_key)blockers.push('POLICY_PROFILE_REGISTRY_KEY_MISMATCH');

  const folderIds=['series_folder_id','canonical_folder_id','old_folder_id','working_folder_id']
    .map((key)=>policy[key]).filter(nonBlank);
  if(folderIds.length===4&&new Set(folderIds).size!==4)blockers.push('POLICY_FOLDER_IDS_NOT_DISTINCT');

  const adapters=new Set(input.registeredSchemaAdapters??[]);
  if(nonBlank(profile.schemaAdapter)&&!adapters.has(profile.schemaAdapter))blockers.push('SCHEMA_ADAPTER_NOT_REGISTERED');

  const hooks=new Set(input.registeredDependencyHooks??[]);
  for(const hook of profile.dependencyHooks??[]){
    if(!hooks.has(hook))blockers.push(`DEPENDENCY_HOOK_NOT_REGISTERED:${hook}`);
  }

  const execution=input.executionPlan??{};
  if(execution.preferredExecutionChannel!=='GEMINI_AI_PRO')blockers.push('PREFERRED_EXECUTION_CHANNEL_NOT_AI_PRO');
  if(execution.fallbackExecutionChannel!=='GEMINI_API')blockers.push('FALLBACK_EXECUTION_CHANNEL_NOT_API');
  if(typeof execution.fallbackAllowed!=='boolean')blockers.push('FALLBACK_ALLOWED_NOT_EXPLICIT');
  if(execution.executionChannel!=null&&!['GEMINI_AI_PRO','GEMINI_API'].includes(execution.executionChannel))blockers.push('EXECUTION_CHANNEL_INVALID');

  const changedPaths=uniq((input.commonCoreChangedPaths??[]).filter(nonBlank));
  if(changedPaths.length)blockers.push('COMMON_CORE_CHANGE_REQUIRED');

  const scanFindings=input.commonCoreScanFindings??detectProductSpecificCommonCoreReferences({
    profile,
    files:input.commonCoreFiles??[]
  });
  if(scanFindings.length)blockers.push('PRODUCT_SPECIFIC_REFERENCE_FOUND_IN_COMMON_CORE');

  if(!safeAuthority(input.authority??{}))blockers.push('ONBOARDING_PREFLIGHT_HAS_MUTATION_AUTHORITY');

  if(input.policyRetrievedFromDrive!==true)blockers.push('POLICY_NOT_VERIFIED_FROM_DRIVE');
  if(input.registryConsistencyVerified!==true)blockers.push('REGISTRY_CONSISTENCY_NOT_VERIFIED');
  if(input.commonSpecVersion!=='1.1')blockers.push('COMMON_SPEC_VERSION_NOT_1_1');
  if(input.commonBaselineGate!=='PASS_FIXED')blockers.push('COMMON_BASELINE_NOT_FIXED');

  if(input.defaultBranchScheduleActive!==true)warnings.push('CONTINUOUS_MONITORING_PENDING_DEFAULT_BRANCH_MERGE');

  const pass=blockers.length===0;
  return{
    schemaVersion:PROFILE_ONBOARDING_READINESS_SCHEMA_VERSION,
    recordType:PROFILE_ONBOARDING_READINESS_RECORD_TYPE,
    status:pass?'PASS':'BLOCKED',
    profileOnboardingGate:pass?'PASS_PROFILE_ONLY_ONBOARDING':'BLOCKED',
    commonCoreChangeRequired:changedPaths.length>0,
    commonCoreChangedPaths:changedPaths,
    commonCoreScanFindings:scanFindings,
    blockers:uniq(blockers),
    warnings:uniq(warnings),
    authority:{
      canonicalWriteAllowed:false,
      authoringWriteAllowed:false,
      runtimeWriteAllowed:false,
      registryWriteAllowed:false,
      productionWriteAllowed:false
    },
    startupGateEvaluated:false,
    startupGateNote:'This preflight verifies supplied Drive-derived governance context but does not replace the Product Master STARTUP GATE at execution time.',
    productMasterFormalGateEvaluated:false,
    appIntegrationReadyEvaluated:false
  };
}
