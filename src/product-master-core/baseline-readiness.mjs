export const BASELINE_READINESS_SCHEMA_VERSION='3.1';
export const BASELINE_READINESS_RECORD_TYPE='PRODUCT_MASTER_CORE_BASELINE_READINESS';

const falseAuthority=(authority={})=>[
  'canonicalWriteAllowed',
  'authoringWriteAllowed',
  'runtimeWriteAllowed',
  'registryWriteAllowed',
  'productionWriteAllowed'
].every((key)=>authority[key]===false);

export function evaluateProductMasterCoreBaselineV31(input={}){
  const spec=input.spec??{};
  const commonCore=input.commonCore??{};
  const secondSeries=input.secondSeriesLive??{};
  const workerReadiness=input.workerReadiness??{};
  const workerLiveness=input.workerLiveness??{};
  const authority=input.authority??{};
  const blockers=[];

  if(String(spec.version??'')!=='1.1') blockers.push('COMMON_SPEC_VERSION_NOT_1_1');
  if(spec.secondSeriesLiveValidated!==true) blockers.push('SECOND_SERIES_LIVE_NOT_VALIDATED');
  if(commonCore.contractTestsPass!==true) blockers.push('COMMON_CORE_CONTRACT_TESTS_NOT_PASS');
  if(Number(commonCore.productSpecificCommonCorePaths??0)!==0) blockers.push('PRODUCT_SPECIFIC_COMMON_CORE_PATHS_PRESENT');
  if(commonCore.failClosedVerified!==true) blockers.push('FAIL_CLOSED_NOT_VERIFIED');
  if(commonCore.humanApprovalBoundaryVerified!==true) blockers.push('HUMAN_APPROVAL_BOUNDARY_NOT_VERIFIED');
  if(secondSeries.status!=='PASS') blockers.push('SECOND_SERIES_LIVE_NOT_PASS');
  if(secondSeries.executionChannel!=='GEMINI_AI_PRO') blockers.push('SECOND_SERIES_EXECUTION_CHANNEL_NOT_AI_PRO');
  if(secondSeries.silentFallbackAllowed!==false) blockers.push('SILENT_FALLBACK_NOT_PROHIBITED');
  if(workerReadiness.runnerReadinessGate!=='PASS_LIVE') blockers.push('WORKER_READINESS_NOT_PASS_LIVE');
  if(workerLiveness.livenessGate!=='PASS_HEALTHY') blockers.push('WORKER_LIVENESS_NOT_HEALTHY');
  if(!falseAuthority(authority)) blockers.push('MUTATION_AUTHORITY_PRESENT_IN_BASELINE_GATE');

  const baselinePass=blockers.length===0;
  const defaultBranchScheduleActive=input.defaultBranchScheduleActive===true;

  return{
    schemaVersion:BASELINE_READINESS_SCHEMA_VERSION,
    recordType:BASELINE_READINESS_RECORD_TYPE,
    status:baselinePass?'PASS':'BLOCKED',
    baselineGate:baselinePass?'PASS_BASELINE_FIXED':'BLOCKED',
    continuousMonitoringGate:defaultBranchScheduleActive?'PASS_ACTIVE':'PENDING_DEFAULT_BRANCH_MERGE',
    defaultBranchScheduleActive,
    blockers,
    deploymentNotes:defaultBranchScheduleActive?[]:['SCHEDULED_SMOKE_AND_WATCHDOG_REQUIRE_DEFAULT_BRANCH_DEPLOYMENT'],
    authority:{
      canonicalWriteAllowed:false,
      authoringWriteAllowed:false,
      runtimeWriteAllowed:false,
      registryWriteAllowed:false,
      productionWriteAllowed:false
    },
    productMasterFormalGateEvaluated:false,
    appIntegrationReadyEvaluated:false
  };
}
