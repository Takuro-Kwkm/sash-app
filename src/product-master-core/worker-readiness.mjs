export const WORKER_READINESS_SCHEMA_VERSION='3.1';
export const WORKER_READINESS_RECORD_TYPE='PRODUCT_MASTER_WORKER_READINESS';

const normalizeStatus=(value)=>String(value??'').trim().toUpperCase();

export function evaluateGeminiAiProWorkerReadiness(input={}){
  const platform=input.platform??null;
  const arch=input.arch??null;
  const runnerService=input.runnerService??{};
  const antigravity=input.antigravity??{};
  const sessionPolicy=input.sessionPolicy??{};
  const powerPolicy=input.powerPolicy??{};
  const authPreflight=input.authPreflight??{status:'NOT_EVALUATED'};
  const requireLiveAuth=input.requireLiveAuth===true;
  const blockers=[];

  if(platform!=='Darwin') blockers.push('PLATFORM_NOT_DARWIN');
  if(arch!=='arm64') blockers.push('ARCH_NOT_ARM64');
  if(runnerService.running!==true) blockers.push('RUNNER_SERVICE_NOT_RUNNING');
  if(antigravity.available!==true) blockers.push('ANTIGRAVITY_CLI_NOT_AVAILABLE');
  if(sessionPolicy.sessionCreate!==false) blockers.push('RUNNER_SESSION_CREATE_NOT_FALSE');
  if(sessionPolicy.limitLoadToSessionType!=='Aqua') blockers.push('RUNNER_SESSION_TYPE_NOT_AQUA');

  const acSleep=powerPolicy?.ac?.machineSleepMinutes;
  if(!Number.isFinite(acSleep)) blockers.push('AC_MACHINE_SLEEP_POLICY_UNKNOWN');
  else if(acSleep!==0) blockers.push('AC_MACHINE_SLEEP_NOT_DISABLED');

  const authStatus=normalizeStatus(authPreflight.status||'NOT_EVALUATED');
  if(requireLiveAuth&&authStatus!=='PASS') blockers.push('AI_PRO_AUTH_PREFLIGHT_NOT_PASS');
  if(authPreflight.credentialMaterialPersisted===true) blockers.push('CREDENTIAL_MATERIAL_PERSISTED');

  const pass=blockers.length===0;
  const readinessLevel=pass&&authStatus==='PASS'?'LIVE':pass?'LOCAL':'BLOCKED';
  const gate=pass?(readinessLevel==='LIVE'?'PASS_LIVE':'PASS_LOCAL'):'BLOCKED';

  return{
    schemaVersion:WORKER_READINESS_SCHEMA_VERSION,
    recordType:WORKER_READINESS_RECORD_TYPE,
    executionChannel:'GEMINI_AI_PRO',
    surface:'ANTIGRAVITY_CLI',
    status:pass?'PASS':'BLOCKED',
    readinessLevel,
    runnerReadinessGate:gate,
    platform,
    arch,
    runnerService:{
      running:runnerService.running===true,
      detail:runnerService.detail??null
    },
    antigravity:{
      available:antigravity.available===true,
      path:antigravity.path??null,
      version:antigravity.version??null
    },
    sessionPolicy:{
      sessionCreate:sessionPolicy.sessionCreate??null,
      limitLoadToSessionType:sessionPolicy.limitLoadToSessionType??null
    },
    powerPolicy:{
      ac:{
        machineSleepMinutes:Number.isFinite(acSleep)?acSleep:null,
        displaySleepMinutes:Number.isFinite(powerPolicy?.ac?.displaySleepMinutes)?powerPolicy.ac.displaySleepMinutes:null
      },
      displaySleepAllowed:true,
      machineSleepRequirement:'AC_MACHINE_SLEEP_MINUTES_MUST_EQUAL_0'
    },
    authPreflight:{
      status:authStatus||'NOT_EVALUATED',
      checked:authStatus!=='NOT_EVALUATED',
      credentialMaterialPersisted:authPreflight.credentialMaterialPersisted===true
    },
    blockers,
    failClosed:true,
    fallbackPolicy:{
      silentFallbackAllowed:false,
      note:'API fallback requires the Gemini Job to explicitly set fallback_allowed=true.'
    },
    authority:{
      canonicalWriteAllowed:false,
      authoringWriteAllowed:false,
      runtimeWriteAllowed:false,
      registryWriteAllowed:false,
      productionWriteAllowed:false
    }
  };
}
