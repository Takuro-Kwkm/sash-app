import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import{
  evaluateProductMasterProfileOnboardingPreflight
}from'../src/product-master-core/profile-onboarding-readiness.mjs';

const profile=JSON.parse(fs.readFileSync(new URL('../config/product-master-profiles/lixil-giesta2.v1.json',import.meta.url),'utf8'));

const policySeriesEntry={
  manufacturer:'LIXIL',
  series:'ジエスタ2',
  series_folder_id:'1ehU2IIjHrqAH2uyXllSVTh4zrSOFXLsc',
  canonical_folder_id:'1sR0e7FSgr6lVE8BHw0fXzYamC0nxCyXW',
  old_folder_id:'1ndxhw1b8HJcPX83UiBXCNcOUJZULDLxF',
  working_folder_id:'16uPFbdAcgcRcxSq7KLyum1NlhU6Clxx7',
  registry_series_key:'LIXIL::ジエスタ2',
  required_package_roles:['AUTHORING_MASTER','RUNTIME_MANIFEST_JSON','RUNTIME_JSON_PACKAGE','PRODUCT_MASTER_MANIFEST_MD'],
  governing_spec:'PRODUCT_MASTER_PACKAGE_STORAGE_COMPLETION_GATE_v2.0'
};

const input={
  profile,
  policySeriesEntry,
  registeredSchemaAdapters:['GENERIC_EVIDENCE_CANDIDATE_V1'],
  registeredDependencyHooks:[],
  executionPlan:{
    preferredExecutionChannel:'GEMINI_AI_PRO',
    fallbackExecutionChannel:'GEMINI_API',
    fallbackAllowed:false,
    executionChannel:'GEMINI_AI_PRO'
  },
  commonCoreChangedPaths:[],
  commonCoreFiles:[
    {path:'src/product-master-core/profile-onboarding-readiness.mjs',content:'generic profile onboarding core'},
    {path:'src/product-master-core/product-profile.mjs',content:'generic product profile contract'}
  ],
  authority:{
    canonicalWriteAllowed:false,
    authoringWriteAllowed:false,
    runtimeWriteAllowed:false,
    registryWriteAllowed:false,
    productionWriteAllowed:false
  },
  policyRetrievedFromDrive:true,
  registryConsistencyVerified:true,
  commonSpecVersion:'1.1',
  commonBaselineGate:'PASS_FIXED',
  defaultBranchScheduleActive:false
};

test('Giesta2 third-series profile passes profile-only onboarding without Common Core changes',()=>{
  const out=evaluateProductMasterProfileOnboardingPreflight(input);
  assert.equal(out.status,'PASS');
  assert.equal(out.profileOnboardingGate,'PASS_PROFILE_ONLY_ONBOARDING');
  assert.equal(out.commonCoreChangeRequired,false);
  assert.deepEqual(out.commonCoreChangedPaths,[]);
  assert.deepEqual(out.commonCoreScanFindings,[]);
  assert.deepEqual(out.blockers,[]);
  assert.ok(out.warnings.includes('CONTINUOUS_MONITORING_PENDING_DEFAULT_BRANCH_MERGE'));
  assert.deepEqual(out.authority,{
    canonicalWriteAllowed:false,
    authoringWriteAllowed:false,
    runtimeWriteAllowed:false,
    registryWriteAllowed:false,
    productionWriteAllowed:false
  });
  assert.equal(out.startupGateEvaluated,false);
  assert.equal(out.productMasterFormalGateEvaluated,false);
  assert.equal(out.appIntegrationReadyEvaluated,false);
});

test('Giesta2 profile keeps storage authority in Drive Policy, not Product Profile',()=>{
  const forbidden=['series_folder_id','canonical_folder_id','old_folder_id','working_folder_id','required_package_roles','governing_spec'];
  for(const key of forbidden)assert.equal(Object.prototype.hasOwnProperty.call(profile,key),false,key);
  assert.equal(profile.manufacturer,policySeriesEntry.manufacturer);
  assert.equal(profile.series,policySeriesEntry.series);
  assert.equal(profile.registrySeriesKey,policySeriesEntry.registry_series_key);
});

test('Giesta2 onboarding probe is evidence-only and uses the fixed generic channel contract',()=>{
  assert.equal(profile.schemaAdapter,'GENERIC_EVIDENCE_CANDIDATE_V1');
  assert.deepEqual(profile.dependencyHooks,[]);
  assert.equal(profile.runtimePartitionPolicy.mode,'NOT_USED_FOR_EVIDENCE_ONLY_JOB');
  assert.deepEqual(profile.extraction.canonicalFieldScope,['specific_spec','configuration','construction']);
  assert.equal(profile.extraction.evidenceRequirements.failOnInference,true);
});
