import { appendFile, mkdir, writeFile } from 'node:fs/promises';
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

function boundedShareValue(value){
  const text=String(value??'').trim();
  if(!/^[A-Za-z0-9_-]{8,512}$/.test(text))return null;
  return text;
}

export async function createTemporaryPreviewShare({token,teamId,deploymentId,ttlSeconds=900,fetchImpl=globalThis.fetch}={}){
  if(!token||!teamId||!deploymentId)throw new PublicSaaSMonitorError('PREVIEW_SHARE_CONFIGURATION_MISSING','P1','Temporary Preview access configuration is incomplete.');
  if(typeof fetchImpl!=='function')throw new PublicSaaSMonitorError('MONITOR_FETCH_MISSING','P1','Temporary Preview access fetch implementation is unavailable.');
  const ttl=Math.max(60,Math.min(Number(ttlSeconds)||900,3600));
  const url=`https://api.vercel.com/aliases/${encodeURIComponent(deploymentId)}/protection-bypass?teamId=${encodeURIComponent(teamId)}`;
  let response;
  try{
    response=await fetchImpl(url,{
      method:'PATCH',
      headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
      body:JSON.stringify({ttl}),
    });
  }catch{
    throw new PublicSaaSMonitorError('PREVIEW_SHARE_API_UNREACHABLE','P1','Vercel temporary Preview access API could not be reached.');
  }
  if(!response?.ok)throw new PublicSaaSMonitorError('PREVIEW_SHARE_API_REJECTED','P1',`Vercel temporary Preview access API returned HTTP ${response?.status??0}.`);
  const payload=await parseJsonResponse(response);
  const value=boundedShareValue(payload?.value);
  if(!value)throw new PublicSaaSMonitorError('PREVIEW_SHARE_VALUE_INVALID','P1','Vercel temporary Preview access API returned an invalid share value.');
  return value;
}

function splitSetCookieHeader(value){
  const text=String(value??'').trim();
  if(!text)return [];
  return text.split(/,(?=\s*[^;,\s]+=)/g).map((entry)=>entry.trim()).filter(Boolean);
}

function responseSetCookies(headers){
  if(typeof headers?.getSetCookie==='function')return headers.getSetCookie();
  return splitSetCookieHeader(headers?.get?.('set-cookie'));
}

function defaultCookiePath(pathname){
  if(!pathname||pathname[0]!=='/')return '/';
  if(pathname==='/')return '/';
  const last=pathname.lastIndexOf('/');
  return last<=0?'/':pathname.slice(0,last+1);
}

function createCookieJar(){
  const cookies=new Map();
  const store=(setCookie,responseUrl)=>{
    const url=new URL(responseUrl);
    const parts=String(setCookie??'').split(';').map((part)=>part.trim()).filter(Boolean);
    const first=parts.shift()??'';
    const separator=first.indexOf('=');
    if(separator<=0)return;
    const name=first.slice(0,separator).trim();
    const value=first.slice(separator+1).trim();
    let domain=url.hostname.toLowerCase();
    let cookiePath=defaultCookiePath(url.pathname);
    let secure=false;
    let remove=false;
    for(const part of parts){
      const index=part.indexOf('=');
      const key=(index<0?part:part.slice(0,index)).trim().toLowerCase();
      const attr=index<0?'':part.slice(index+1).trim();
      if(key==='domain'&&attr)domain=attr.replace(/^\./,'').toLowerCase();
      else if(key==='path'&&attr)cookiePath=attr;
      else if(key==='secure')secure=true;
      else if(key==='max-age'&&Number(attr)<=0)remove=true;
    }
    const id=`${domain}|${cookiePath}|${name}`;
    if(remove||!value)cookies.delete(id);
    else cookies.set(id,{name,value,domain,path:cookiePath,secure});
  };
  const headerFor=(targetUrl)=>{
    const url=new URL(targetUrl);
    const host=url.hostname.toLowerCase();
    const secure=url.protocol==='https:';
    return [...cookies.values()]
      .filter((cookie)=>host===cookie.domain||host.endsWith(`.${cookie.domain}`))
      .filter((cookie)=>url.pathname.startsWith(cookie.path))
      .filter((cookie)=>!cookie.secure||secure)
      .map((cookie)=>`${cookie.name}=${cookie.value}`)
      .join('; ');
  };
  return {store,headerFor};
}

async function fetchWithCookieRedirects(url,init,fetchImpl,jar){
  let current=String(url);
  let request={...init};
  for(let redirectCount=0;redirectCount<=10;redirectCount+=1){
    const cookie=jar.headerFor(current);
    const headers={...(request.headers??{})};
    if(cookie)headers.cookie=cookie;
    const response=await fetchImpl(current,{...request,headers,redirect:'manual'});
    for(const setCookie of responseSetCookies(response.headers))jar.store(setCookie,current);
    if(![301,302,303,307,308].includes(response.status))return response;
    const location=response.headers.get('location');
    if(!location)throw new PublicSaaSMonitorError('PREVIEW_SHARE_REDIRECT_INVALID','P1','Protected Preview redirect did not include a location.');
    current=new URL(location,current).toString();
    if([301,302,303].includes(response.status))request={...request,method:'GET',body:undefined};
  }
  throw new PublicSaaSMonitorError('PREVIEW_SHARE_REDIRECT_LIMIT','P1','Protected Preview authentication exceeded the redirect limit.');
}

export function createShareAuthenticatedFetch({deploymentUrl,shareValue,fetchImpl=globalThis.fetch}={}){
  const origin=new URL(String(deploymentUrl)).origin;
  const share=boundedShareValue(shareValue);
  if(!share)throw new PublicSaaSMonitorError('PREVIEW_SHARE_VALUE_INVALID','P1','Protected Preview share value is invalid.');
  const jar=createCookieJar();
  return async function shareAuthenticatedFetch(input,init={}){
    const url=new URL(String(input),origin);
    if(url.origin===origin&&!url.searchParams.has('_vercel_share'))url.searchParams.set('_vercel_share',share);
    return fetchWithCookieRedirects(url.toString(),init,fetchImpl,jar);
  };
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
  const shareValue=await createTemporaryPreviewShare({token,teamId,deploymentId:deployment.id,fetchImpl});
  const protectedFetch=createShareAuthenticatedFetch({deploymentUrl:deployment.url,shareValue,fetchImpl});

  let healthResponse;
  try{healthResponse=await protectedFetch('/api/public-saas/health',{headers:{accept:'application/json'}});}catch(error){
    if(error instanceof PublicSaaSMonitorError)throw error;
    throw new PublicSaaSMonitorError('HEALTH_ENDPOINT_UNREACHABLE','P0','Public SaaS health endpoint could not be reached.');
  }
  const healthPayload=await parseJsonResponse(healthResponse);
  evaluateHealthPayload(healthPayload,healthResponse.status);

  let monitoringResponse;
  try{monitoringResponse=await protectedFetch('/api/public-saas/monitoring/status',{headers:{accept:'application/json'}});}catch(error){
    if(error instanceof PublicSaaSMonitorError)throw error;
    throw new PublicSaaSMonitorError('CLIENT_MONITORING_STATUS_UNREACHABLE','P1','Public SaaS client monitoring status endpoint could not be reached.');
  }
  const monitoringPayload=await parseJsonResponse(monitoringResponse);
  if(monitoringResponse.status!==200||monitoringPayload?.ok!==true)throw new PublicSaaSMonitorError('CLIENT_MONITORING_STATUS_NOT_OK','P1','Public SaaS client monitoring status endpoint is not healthy.');
  if(monitoringPayload?.provider!=='POSTHOG')throw new PublicSaaSMonitorError('CLIENT_MONITORING_PROVIDER_MISMATCH','P1','Public SaaS client monitoring provider is not POSTHOG.');
  if(monitoringPayload?.configured!==true)throw new PublicSaaSMonitorError('CLIENT_MONITORING_UNCONFIGURED','P1','Public SaaS PostHog client monitoring is not configured.');

  let uiResponse;
  try{uiResponse=await protectedFetch('/public-saas',{headers:{accept:'text/html'}});}catch(error){
    if(error instanceof PublicSaaSMonitorError)throw error;
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
    previewProtection:'TEMPORARY_SHARE',
  });
}

async function writeEvidence(outputPath,payload){
  await mkdir(path.dirname(outputPath),{recursive:true});
  await writeFile(outputPath,`${JSON.stringify(payload,null,2)}\n`,'utf8');
}

function effectiveVercelToken(env=process.env){
  return env.VERCEL_TOKEN_EFFECTIVE??env.VERCEL_TOKEN_PRIMARY??env.VERCEL_TOKEN_FALLBACK;
}

async function exportTemporaryShareToGitHubEnv(){
  const token=effectiveVercelToken();
  const teamId=process.env.VERCEL_ORG_ID;
  const deploymentId=process.env.DEPLOY_ID;
  const deploymentUrl=process.env.DEPLOY_URL;
  const githubEnv=process.env.GITHUB_ENV;
  if(!deploymentUrl||!githubEnv)throw new PublicSaaSMonitorError('PREVIEW_SHARE_EXPORT_CONFIGURATION_MISSING','P1','GitHub Actions Preview share export configuration is incomplete.');
  const shareValue=await createTemporaryPreviewShare({token,teamId,deploymentId});
  const url=new URL('/public-saas',deploymentUrl);
  url.searchParams.set('_vercel_share',shareValue);
  process.stdout.write(`::add-mask::${shareValue}\n`);
  await appendFile(githubEnv,`VERCEL_SHARE_URL=${url.toString()}\n`,'utf8');
  console.log('PUBLIC_SAAS_TEMPORARY_PREVIEW_ACCESS=PASS');
}

async function main(){
  const outputPath=process.argv[2]??'artifacts/public-saas-health/health.json';
  const token=effectiveVercelToken();
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
if(invoked){
  if(process.argv[2]==='--export-share')await exportTemporaryShareToGitHubEnv();
  else await main();
}
