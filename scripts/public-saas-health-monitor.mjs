import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export class PublicSaaSMonitorError extends Error{
  constructor(code,severity,message){
    super(message);
    this.name='PublicSaaSMonitorError';
    this.code=code;
    this.severity=severity;
  }
}

function createdTime(value){
  if(typeof value==='number')return value;
  const parsed=Date.parse(String(value??''));
  return Number.isFinite(parsed)?parsed:0;
}

function deploymentSha(deployment){
  return String(deployment?.meta?.githubCommitSha??deployment?.meta?.releaseCommitSha??deployment?.gitSource?.sha??'').trim();
}

function deploymentRef(deployment){
  return String(deployment?.meta?.githubCommitRef??deployment?.gitSource?.ref??'').trim();
}

export function selectLatestReadyPreview(deployments,{branch,expectedSha}={}){
  const candidates=(Array.isArray(deployments)?deployments:[])
    .filter((deployment)=>String(deployment?.readyState??deployment?.state??'').toUpperCase()==='READY')
    .filter((deployment)=>String(deployment?.target??'').toLowerCase()!=='production')
    .filter((deployment)=>!branch||deploymentRef(deployment)===branch)
    .sort((a,b)=>createdTime(b.createdAt??b.created)-createdTime(a.createdAt??a.created));
  const latest=candidates[0]??null;
  if(!latest)throw new PublicSaaSMonitorError('NO_READY_PREVIEW','P0','No READY Preview deployment matched the Public SaaS branch.');
  const sha=deploymentSha(latest);
  if(expectedSha&&sha!==expectedSha)throw new PublicSaaSMonitorError('PREVIEW_SHA_MISMATCH','P1','Latest READY Preview does not match the expected GitHub SHA.');
  const url=String(latest.url??'').trim();
  if(!url)throw new PublicSaaSMonitorError('PREVIEW_URL_MISSING','P0','READY Preview deployment has no URL.');
  return Object.freeze({
    id:String(latest.uid??latest.id??''),
    url:url.startsWith('http')?url:`https://${url}`,
    sha,
    ref:deploymentRef(latest),
    createdAt:latest.createdAt??latest.created??null,
  });
}

export function evaluateHealthPayload(payload,status){
  if(status!==200)throw new PublicSaaSMonitorError('HEALTH_HTTP_FAILURE','P0',`Public SaaS health endpoint returned HTTP ${status}.`);
  if(!payload||payload.ok!==true)throw new PublicSaaSMonitorError('HEALTH_NOT_OK','P0','Public SaaS health endpoint did not report ok=true.');
  if(payload.configured!==true)throw new PublicSaaSMonitorError('HEALTH_PROVIDER_UNCONFIGURED','P1','Public SaaS persistence provider is not configured.');
  if(String(payload.provider??'').toUpperCase()!=='SUPABASE')throw new PublicSaaSMonitorError('HEALTH_PROVIDER_MISMATCH','P1','Public SaaS health provider is not SUPABASE.');
  return true;
}

async function parseJsonResponse(response){
  try{return await response.json();}catch{return null;}
}

export async function runPublicSaaSHealthMonitor({
  token,
  teamId,
  projectId,
  branch='feat/public-saas-foundation-a1',
  expectedSha='',
  fetchImpl=globalThis.fetch,
}={}){
  if(!token||!teamId||!projectId)throw new PublicSaaSMonitorError('MONITOR_CONFIGURATION_MISSING','P1','Vercel monitor configuration is incomplete.');
  if(typeof fetchImpl!=='function')throw new PublicSaaSMonitorError('MONITOR_FETCH_MISSING','P1','Health monitor fetch implementation is unavailable.');

  const deploymentsUrl=new URL('https://api.vercel.com/v6/deployments');
  deploymentsUrl.searchParams.set('projectId',projectId);
  deploymentsUrl.searchParams.set('teamId',teamId);
  deploymentsUrl.searchParams.set('limit','20');

  let listResponse;
  try{
    listResponse=await fetchImpl(deploymentsUrl,{headers:{authorization:`Bearer ${token}`}});
  }catch{
    throw new PublicSaaSMonitorError('VERCEL_API_UNREACHABLE','P0','Vercel deployment API could not be reached.');
  }
  if(!listResponse.ok)throw new PublicSaaSMonitorError('VERCEL_API_REJECTED','P0',`Vercel deployment API returned HTTP ${listResponse.status}.`);
  const listPayload=await parseJsonResponse(listResponse);
  const deployment=selectLatestReadyPreview(listPayload?.deployments,{branch,expectedSha:expectedSha||undefined});

  let healthResponse;
  try{healthResponse=await fetchImpl(`${deployment.url}/api/public-saas/health`,{headers:{accept:'application/json'}});}catch{
    throw new PublicSaaSMonitorError('HEALTH_ENDPOINT_UNREACHABLE','P0','Public SaaS health endpoint could not be reached.');
  }
  const healthPayload=await parseJsonResponse(healthResponse);
  evaluateHealthPayload(healthPayload,healthResponse.status);

  let monitoringResponse;
  try{monitoringResponse=await fetchImpl(`${deployment.url}/api/public-saas/monitoring/status`,{headers:{accept:'application/json'}});}catch{
    throw new PublicSaaSMonitorError('CLIENT_MONITORING_STATUS_UNREACHABLE','P1','Public SaaS client monitoring status endpoint could not be reached.');
  }
  const monitoringPayload=await parseJsonResponse(monitoringResponse);
  if(monitoringResponse.status!==200||monitoringPayload?.ok!==true)throw new PublicSaaSMonitorError('CLIENT_MONITORING_STATUS_NOT_OK','P1','Public SaaS client monitoring status endpoint is not healthy.');
  if(monitoringPayload?.provider!=='POSTHOG')throw new PublicSaaSMonitorError('CLIENT_MONITORING_PROVIDER_MISMATCH','P1','Public SaaS client monitoring provider is not POSTHOG.');
  if(monitoringPayload?.configured!==true)throw new PublicSaaSMonitorError('CLIENT_MONITORING_UNCONFIGURED','P1','Public SaaS PostHog client monitoring is not configured.');

  let uiResponse;
  try{uiResponse=await fetchImpl(`${deployment.url}/public-saas`,{headers:{accept:'text/html'}});}catch{
    throw new PublicSaaSMonitorError('PUBLIC_SAAS_UI_UNREACHABLE','P1','Public SaaS UI could not be reached.');
  }
  if(uiResponse.status!==200)throw new PublicSaaSMonitorError('PUBLIC_SAAS_UI_HTTP_FAILURE','P1',`Public SaaS UI returned HTTP ${uiResponse.status}.`);

  return Object.freeze({
    ok:true,
    checkedAt:new Date().toISOString(),
    deploymentId:deployment.id,
    deploymentUrl:deployment.url,
    githubSha:deployment.sha,
    githubRef:deployment.ref,
    provider:'SUPABASE',
    healthStatus:healthResponse.status,
    monitoringStatus:monitoringResponse.status,
    monitoringProvider:'POSTHOG',
    uiStatus:uiResponse.status,
  });
}

async function writeEvidence(outputPath,payload){
  await mkdir(path.dirname(outputPath),{recursive:true});
  await writeFile(outputPath,`${JSON.stringify(payload,null,2)}\n`,'utf8');
}

async function main(){
  const outputPath=process.argv[2]??'artifacts/public-saas-health/health.json';
  const token=process.env.VERCEL_TOKEN_EFFECTIVE??process.env.VERCEL_TOKEN_PRIMARY??process.env.VERCEL_TOKEN_FALLBACK;
  try{
    const result=await runPublicSaaSHealthMonitor({
      token,
      teamId:process.env.VERCEL_ORG_ID,
      projectId:process.env.VERCEL_PROJECT_ID,
      branch:process.env.PUBLIC_SAAS_HEAD_REF??'feat/public-saas-foundation-a1',
      expectedSha:process.env.PUBLIC_SAAS_EXPECTED_SHA??'',
    });
    await writeEvidence(outputPath,result);
    console.log(JSON.stringify(result,null,2));
  }catch(error){
    const safe={
      ok:false,
      checkedAt:new Date().toISOString(),
      severity:error instanceof PublicSaaSMonitorError?error.severity:'P1',
      code:error instanceof PublicSaaSMonitorError?error.code:'MONITOR_UNEXPECTED_FAILURE',
      message:error instanceof PublicSaaSMonitorError?error.message:'Public SaaS health monitor failed unexpectedly.',
    };
    await writeEvidence(outputPath,safe);
    console.error(JSON.stringify(safe,null,2));
    process.exitCode=1;
  }
}

const invoked=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(invoked)await main();
