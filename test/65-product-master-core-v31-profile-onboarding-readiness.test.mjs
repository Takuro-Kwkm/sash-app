import test from'node:test';
import assert from'node:assert/strict';
import{
  detectProductSpecificCommonCoreReferences,
  evaluateProductMasterProfileOnboardingPreflight
}from'../src/product-master-core/profile-onboarding-readiness.mjs';

const profile=()=>({
  profileSchemaVersion:'1.1',
  recordType:'PRODUCT_MASTER_PROFILE',
  manufacturer:'EXAMPLE_MFG',
  series:'SERIES_X',
  registrySeriesKey:'EXAMPLE_MFG::SERIES_X',
  productId:'SER-EXAMPLE-X',
  schemaAdapter:'GENERIC_EVIDENCE_CANDIDATE_V1',
  runtimePartitionPolicy:{mode:'NOT_USED_FOR_EVIDENCE_ONLY_JOB'},
  dependencyHooks:[],
  source:{
    type:'OFFICIAL_PDF',driveFileId:'DRIVE_SOURCE_X',title:'official.pdf',version:'202609',
    officialDetailUrl:'https://example.invalid/detail',officialDownloadUrl:'https://example.invalid/download',
    authoritativeSha256:'a'.repeat(64),pageCount:10
  },
  extraction:{
    jobType:'EVIDENCE_EXTRACTION',task:'Extract evidence',prompt:'Read the scoped pages only.',
    pageScope:[1],printedPageScope:[1],canonicalFieldScope:['window_type']
  }
});

const policy=()=>({
  manufacturer:'EXAMPLE_MFG',series:'SERIES_X',series_folder_id:'SERIES_FOLDER',
  canonical_folder_id:'CANONICAL_FOLDER',old_folder_id:'OLD_FOLDER',working_folder_id:'WORKING_FOLDER',
  registry_series_key:'EXAMPLE_MFG::SERIES_X',
  required_package_roles:['AUTHORING_MASTER','RUNTIME_MANIFEST_JSON','RUNTIME_JSON_PACKAGE','PRODUCT_MASTER_MANIFEST_MD'],
  governing_spec:'PRODUCT_MASTER_PACKAGE_STORAGE_COMPLETION_GATE_v2.0'
});

const base=()=>({
  profile:profile(),policySeriesEntry:policy(),
  registeredSchemaAdapters:['GENERIC_EVIDENCE_CANDIDATE_V1'],registeredDependencyHooks:[],
  executionPlan:{preferredExecutionChannel:'GEMINI_AI_PRO',fallbackExecutionChannel:'GEMINI_API',fallbackAllowed:false,executionChannel:'GEMINI_AI_PRO'},
  commonCoreChangedPaths:[],commonCoreFiles:[{path:'src/product-master-core/generic.mjs',content:'generic only'}],
  authority:{canonicalWriteAllowed:false,authoringWriteAllowed:false,runtimeWriteAllowed:false,registryWriteAllowed:false,productionWriteAllowed:false},
  policyRetrievedFromDrive:true,registryConsistencyVerified:true,commonSpecVersion:'1.1',commonBaselineGate:'PASS_FIXED',defaultBranchScheduleActive:false
});

test('profile-only onboarding passes without Common Core modification',()=>{
  const out=evaluateProductMasterProfileOnboardingPreflight(base());
  assert.equal(out.status,'PASS');
  assert.equal(out.profileOnboardingGate,'PASS_PROFILE_ONLY_ONBOARDING');
  assert.equal(out.commonCoreChangeRequired,false);
  assert.deepEqual(out.blockers,[]);
  assert.ok(out.warnings.includes('CONTINUOUS_MONITORING_PENDING_DEFAULT_BRANCH_MERGE'));
  assert.equal(out.startupGateEvaluated,false);
});

test('preflight fails closed when Policy and Profile identities diverge',()=>{
  const input=base();
  input.policySeriesEntry.series='OTHER_SERIES';
  const out=evaluateProductMasterProfileOnboardingPreflight(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('POLICY_PROFILE_SERIES_MISMATCH'));
});

test('preflight forbids storage authority inside Product Profile',()=>{
  const input=base();
  input.profile.working_folder_id='SHOULD_NOT_BE_HERE';
  const out=evaluateProductMasterProfileOnboardingPreflight(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('PROFILE:PROFILE_POLICY_STORAGE_OVERRIDE_FORBIDDEN'));
});

test('preflight blocks unregistered adapters and dependency hooks',()=>{
  const input=base();
  input.profile.schemaAdapter='UNKNOWN_ADAPTER';
  input.profile.dependencyHooks=['UNKNOWN_HOOK'];
  const out=evaluateProductMasterProfileOnboardingPreflight(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('SCHEMA_ADAPTER_NOT_REGISTERED'));
  assert.ok(out.blockers.includes('DEPENDENCY_HOOK_NOT_REGISTERED:UNKNOWN_HOOK'));
});

test('preflight blocks ordinary onboarding that requires Common Core changes',()=>{
  const input=base();
  input.commonCoreChangedPaths=['src/product-master-core/special-case.mjs'];
  const out=evaluateProductMasterProfileOnboardingPreflight(input);
  assert.equal(out.status,'BLOCKED');
  assert.equal(out.commonCoreChangeRequired,true);
  assert.ok(out.blockers.includes('COMMON_CORE_CHANGE_REQUIRED'));
});

test('hard-code detector finds series identity or Source IDs in Common Core',()=>{
  const p=profile();
  const findings=detectProductSpecificCommonCoreReferences({
    profile:p,
    files:[
      {path:'src/product-master-core/a.mjs',content:'const x="SERIES_X";'},
      {path:'src/product-master-core/b.mjs',content:'const x="DRIVE_SOURCE_X";'}
    ]
  });
  assert.equal(findings.length,2);
  const input=base();
  input.commonCoreFiles=[{path:'src/product-master-core/a.mjs',content:'SER-EXAMPLE-X'}];
  const out=evaluateProductMasterProfileOnboardingPreflight(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('PRODUCT_SPECIFIC_REFERENCE_FOUND_IN_COMMON_CORE'));
});

test('fallback policy must be explicit and channels stay canonical',()=>{
  const input=base();
  delete input.executionPlan.fallbackAllowed;
  input.executionPlan.executionChannel='SILENT_FALLBACK';
  const out=evaluateProductMasterProfileOnboardingPreflight(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('FALLBACK_ALLOWED_NOT_EXPLICIT'));
  assert.ok(out.blockers.includes('EXECUTION_CHANNEL_INVALID'));
});

test('preflight does not replace Drive Startup Gate or gain mutation authority',()=>{
  const input=base();
  input.authority.runtimeWriteAllowed=true;
  input.policyRetrievedFromDrive=false;
  const out=evaluateProductMasterProfileOnboardingPreflight(input);
  assert.equal(out.status,'BLOCKED');
  assert.ok(out.blockers.includes('ONBOARDING_PREFLIGHT_HAS_MUTATION_AUTHORITY'));
  assert.ok(out.blockers.includes('POLICY_NOT_VERIFIED_FROM_DRIVE'));
  assert.equal(out.authority.runtimeWriteAllowed,false);
  assert.equal(out.productMasterFormalGateEvaluated,false);
});
