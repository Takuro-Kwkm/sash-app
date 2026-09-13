import { readFile } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRecoveryRequestHandler } from '../server/recovery-app.mjs';
import { WorkManagementService } from '../work-management/service.mjs';
import { resolveWorkspaceContext } from './authorization.mjs';
import { PublicSaaSError } from './domain.mjs';
import { createSupabaseAuthAdapterFromEnv, readSupabasePublicConfig } from './supabase-auth-adapter.mjs';
import { SupabaseDataApiClient } from './supabase-data-api.mjs';
import { createSupabaseRepositoryBundle } from './supabase-work-repositories.mjs';

const ACCESS_COOKIE='sash_ps_access';
const REFRESH_COOKIE='sash_ps_refresh';
const MAX_BODY_BYTES=64*1024;
const HERE=dirname(fileURLToPath(import.meta.url));
const UI_ROOT=join(HERE,'ui');

function requestUrl(req){
  const url=new URL(req.url??'/',`http://${req.headers?.host??'localhost'}`);
  const rewrittenPath=url.searchParams.get('__path');
  if(rewrittenPath!==null){
    url.pathname=`/${rewrittenPath.replace(/^\/+/, '')}`;
    url.searchParams.delete('__path');
  }
  return url;
}

function json(res,status,body,{cookies=[]}={}){
  const headers={
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
  };
  for(const [name,value] of Object.entries(headers))res.setHeader?.(name,value);
  if(cookies.length)res.setHeader?.('set-cookie',cookies);
  if(typeof res.writeHead==='function')res.writeHead(status);
  res.end(JSON.stringify(body));
}

async function staticUi(res,fileName,contentType,method='GET'){
  try{
    const body=await readFile(join(UI_ROOT,fileName));
    res.setHeader?.('content-type',contentType);
    res.setHeader?.('cache-control','no-store');
    res.setHeader?.('x-content-type-options','nosniff');
    if(typeof res.writeHead==='function')res.writeHead(200);
    res.end(method==='HEAD'?'':body);
  }catch{
    json(res,404,{error:'Public SaaS Preview asset not found.',code:'NOT_FOUND'});
  }
}

function parseCookies(req){
  const source=String(req.headers?.cookie??'');
  const result={};
  for(const part of source.split(';')){
    const index=part.indexOf('=');
    if(index<0)continue;
    const key=part.slice(0,index).trim();
    if(!key)continue;
    try{result[key]=decodeURIComponent(part.slice(index+1).trim());}
    catch{result[key]=part.slice(index+1).trim();}
  }
  return result;
}

function isSecureRequest(req){
  const forwarded=String(req.headers?.['x-forwarded-proto']??'').split(',')[0].trim().toLowerCase();
  if(forwarded)return forwarded==='https';
  const host=String(req.headers?.host??'').toLowerCase();
  return Boolean(host&&!host.startsWith('localhost')&&!host.startsWith('127.0.0.1'));
}

function publicSaaSRedirectUrl(req,{recovery=false}={}){
  const host=String(req.headers?.host??'').trim().toLowerCase();
  if(!host||/[\s/\\]/.test(host))throw new PublicSaaSError('AUTH_REDIRECT_INVALID','Request host is invalid.',{status:400});

  let origin;
  const originHeader=req.headers?.origin;
  if(originHeader){
    let parsed;
    try{parsed=new URL(String(originHeader));}catch{throw new PublicSaaSError('AUTH_REDIRECT_INVALID','Request origin is invalid.',{status:400});}
    if(parsed.host.toLowerCase()!==host)throw new PublicSaaSError('CSRF_REJECTED','Cross-origin authentication redirect rejected.',{status:403});
    origin=parsed.origin;
  }else{
    origin=`${isSecureRequest(req)?'https':'http'}://${host}`;
  }

  const target=new URL('/public-saas',origin);
  if(recovery)target.searchParams.set('recovery','1');
  return target.toString();
}

function sessionCookie(name,value,{maxAge,secure}){
  const parts=[`${name}=${encodeURIComponent(value)}`,'Path=/','HttpOnly','SameSite=Lax'];
  if(Number.isFinite(maxAge))parts.push(`Max-Age=${Math.max(0,Math.floor(maxAge))}`);
  if(secure)parts.push('Secure');
  return parts.join('; ');
}

function clearSessionCookies(req){
  const secure=isSecureRequest(req);
  return [
    sessionCookie(ACCESS_COOKIE,'',{maxAge:0,secure}),
    sessionCookie(REFRESH_COOKIE,'',{maxAge:0,secure}),
  ];
}

function cookiesForSession(req,session){
  if(!session?.access_token||!session?.refresh_token){
    throw new PublicSaaSError('AUTH_SESSION_INVALID','Authentication provider did not return a complete session.');
  }
  const secure=isSecureRequest(req);
  return [
    sessionCookie(ACCESS_COOKIE,session.access_token,{maxAge:Number(session.expires_in??3600),secure}),
    sessionCookie(REFRESH_COOKIE,session.refresh_token,{maxAge:60*60*24*30,secure}),
  ];
}

async function readJson(req){
  if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
  let size=0;
  const chunks=[];
  for await(const chunk of req){
    const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
    size+=buffer.length;
    if(size>MAX_BODY_BYTES)throw new PublicSaaSError('REQUEST_TOO_LARGE','Request body is too large.',{status:413});
    chunks.push(buffer);
  }
  if(!chunks.length)return {};
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch{throw new PublicSaaSError('REQUEST_JSON_INVALID','Request body must be valid JSON.',{status:400});}
}

function assertSameOrigin(req){
  const method=String(req.method??'GET').toUpperCase();
  if(['GET','HEAD','OPTIONS'].includes(method))return;
  const fetchSite=String(req.headers?.['sec-fetch-site']??'').toLowerCase();
  if(fetchSite==='cross-site')throw new PublicSaaSError('CSRF_REJECTED','Cross-site state-changing request rejected.',{status:403});
  const origin=req.headers?.origin;
  if(!origin)return;
  let originUrl;
  try{originUrl=new URL(String(origin));}catch{throw new PublicSaaSError('CSRF_REJECTED','Invalid request origin.',{status:403});}
  const host=String(req.headers?.host??'').toLowerCase();
  if(originUrl.host.toLowerCase()!==host)throw new PublicSaaSError('CSRF_REJECTED','Cross-origin state-changing request rejected.',{status:403});
}

function publicError(error){
  const explicit=Number(error?.status);
  const code=error?.code??'PUBLIC_SAAS_REQUEST_FAILED';
  const status=explicit||(
    ['AUTH_REQUIRED','SESSION_EXPIRED','AUTH_SESSION_INVALID'].includes(code)?401:
    ['CSRF_REJECTED','EMAIL_VERIFICATION_REQUIRED','WORKSPACE_ACCESS_DENIED','WORKSPACE_ROLE_DENIED','RESOURCE_WORKSPACE_DENIED','RESOURCE_OWNER_DENIED'].includes(code)?403:
    code==='NOT_FOUND'?404:
    code==='UPDATE_CONFLICT'?409:
    400
  );
  const safeStatus=status>=400&&status<=599?status:500;
  const expose=safeStatus<500;
  return {
    status:safeStatus,
    body:{
      error:expose?(error?.message??'Request failed.'):'Internal request failure.',
      code,
    },
  };
}

async function resolvePrincipal(req,res,auth){
  const cookies=parseCookies(req);
  const accessToken=cookies[ACCESS_COOKIE]??null;
  const refreshToken=cookies[REFRESH_COOKIE]??null;
  if(accessToken){
    try{return {principal:await auth.verifyAccessToken(accessToken),accessToken};}
    catch(error){
      if(!(error?.code==='AUTH_PROVIDER_REQUEST_FAILED'&&error?.status===401))throw error;
    }
  }
  if(!refreshToken)throw new PublicSaaSError('AUTH_REQUIRED','Authentication required.',{status:401});
  const session=await auth.refreshSession(refreshToken);
  const principal=await auth.verifyAccessToken(session.access_token);
  const nextCookies=cookiesForSession(req,session);
  res.setHeader?.('set-cookie',nextCookies);
  return {principal,accessToken:session.access_token};
}

async function resolveWorkService(req,res,auth,data,workspaceId){
  const {principal,accessToken}=await resolvePrincipal(req,res,auth);
  const memberships=await data.listMemberships(accessToken);
  const workspace=resolveWorkspaceContext({
    principal,
    workspace_id:workspaceId,
    memberships,
    require_verified_email:true,
  });
  const requestContext={
    accessToken,
    workspaceId:workspace.workspace_id,
    userId:principal.user_id,
  };
  const repositories=createSupabaseRepositoryBundle(data,()=>requestContext);
  const service=new WorkManagementService(repositories);
  return {principal,workspace,repositories,service};
}

function createDefaultDependencies(env=process.env){
  const config=readSupabasePublicConfig(env);
  return {
    auth:createSupabaseAuthAdapterFromEnv(env),
    data:new SupabaseDataApiClient({url:config.url,publishableKey:config.publishableKey}),
    configured:config.configured,
  };
}

export function createPublicSaaSRequestHandler({
  env=process.env,
  auth,
  data,
  delegate=createRecoveryRequestHandler({
    backend:'node:http recovery server via Public SaaS boundary',
    entrypoint:'src/public-saas/http-handler.mjs',
  }),
}={}){
  const defaults=(!auth||!data)?createDefaultDependencies(env):null;
  const authAdapter=auth??defaults.auth;
  const dataClient=data??defaults.data;
  const configured=defaults?defaults.configured:Boolean(authAdapter?.configured&&dataClient?.configured);

  return async function publicSaaSRequestHandler(req,res){
    const url=requestUrl(req);
    const method=String(req.method??'GET').toUpperCase();

    if((url.pathname==='/public-saas'||url.pathname==='/public-saas/')&&['GET','HEAD'].includes(method)){
      return staticUi(res,'index.html','text/html; charset=utf-8',method);
    }
    if(url.pathname==='/public-saas/app.js'&&['GET','HEAD'].includes(method)){
      return staticUi(res,'app.js','text/javascript; charset=utf-8',method);
    }
    if(url.pathname==='/public-saas/styles.css'&&['GET','HEAD'].includes(method)){
      return staticUi(res,'styles.css','text/css; charset=utf-8',method);
    }
    if(!url.pathname.startsWith('/api/public-saas/'))return delegate(req,res);

    try{
      assertSameOrigin(req);

      if(url.pathname==='/api/public-saas/health'&&method==='GET'){
        return json(res,200,{ok:true,provider:'SUPABASE',configured});
      }

      if(url.pathname==='/api/public-saas/auth/sign-up'&&method==='POST'){
        const body=await readJson(req);
        const result=await authAdapter.signUpWithPassword({
          email:body.email,
          password:body.password,
          metadata:{display_name:String(body.display_name??'').trim()||undefined},
          redirectTo:publicSaaSRedirectUrl(req),
        });
        const session=result?.session??(result?.access_token?result:null);
        const response={ok:true,email_confirmation_required:!session,user_id:result?.user?.id??session?.user?.id??null};
        return json(res,200,response,{cookies:session?cookiesForSession(req,session):[]});
      }

      if(url.pathname==='/api/public-saas/auth/sign-in'&&method==='POST'){
        const body=await readJson(req);
        const session=await authAdapter.signInWithPassword({email:body.email,password:body.password});
        return json(res,200,{ok:true,user_id:session?.user?.id??null},{cookies:cookiesForSession(req,session)});
      }

      if(url.pathname==='/api/public-saas/auth/password-reset-request'&&method==='POST'){
        const body=await readJson(req);
        await authAdapter.requestPasswordReset(body.email,{redirectTo:publicSaaSRedirectUrl(req,{recovery:true})});
        return json(res,200,{ok:true,message:'If the account can receive recovery mail, a reset link has been sent.'});
      }

      if(url.pathname==='/api/public-saas/auth/adopt-session'&&method==='POST'){
        const body=await readJson(req);
        if(!body.refresh_token)throw new PublicSaaSError('AUTH_REFRESH_TOKEN_REQUIRED','Refresh token is required.',{status:400});
        const session=await authAdapter.refreshSession(body.refresh_token);
        const principal=await authAdapter.verifyAccessToken(session.access_token);
        if(!principal.email_verified_at)throw new PublicSaaSError('EMAIL_VERIFICATION_REQUIRED','Verified email is required.',{status:403});
        return json(res,200,{ok:true,user_id:principal.user_id},{cookies:cookiesForSession(req,session)});
      }

      if(url.pathname==='/api/public-saas/auth/update-password'&&method==='POST'){
        const {accessToken}=await resolvePrincipal(req,res,authAdapter);
        const body=await readJson(req);
        await authAdapter.updatePassword(accessToken,body.password);
        try{await authAdapter.signOut(accessToken);}catch{/* password change still clears local session */}
        return json(res,200,{ok:true},{cookies:clearSessionCookies(req)});
      }

      if(url.pathname==='/api/public-saas/auth/sign-out'&&method==='POST'){
        const cookies=parseCookies(req);
        const accessToken=cookies[ACCESS_COOKIE]??null;
        if(accessToken){
          try{await authAdapter.signOut(accessToken);}catch{/* local logout still clears cookies */}
        }
        return json(res,200,{ok:true},{cookies:clearSessionCookies(req)});
      }

      if(url.pathname==='/api/public-saas/session'&&method==='GET'){
        const {principal}=await resolvePrincipal(req,res,authAdapter);
        return json(res,200,{ok:true,principal});
      }

      if(url.pathname==='/api/public-saas/workspaces'&&method==='GET'){
        const {principal,accessToken}=await resolvePrincipal(req,res,authAdapter);
        const [workspaces,memberships]=await Promise.all([
          dataClient.listWorkspaces(accessToken),
          dataClient.listMemberships(accessToken),
        ]);
        return json(res,200,{ok:true,principal,workspaces,memberships});
      }

      if(url.pathname==='/api/public-saas/workspaces'&&method==='POST'){
        const {accessToken}=await resolvePrincipal(req,res,authAdapter);
        const body=await readJson(req);
        const workspace=await dataClient.createWorkspaceWithOwner(accessToken,body.name);
        return json(res,201,{ok:true,workspace});
      }

      if(url.pathname==='/api/public-saas/work/database'&&method==='GET'){
        const workspaceId=url.searchParams.get('workspace_id');
        const {workspace,repositories}=await resolveWorkService(req,res,authAdapter,dataClient,workspaceId);
        const [projects,estimates,openings]=await Promise.all([
          repositories.projects.list(),
          repositories.estimates.list(),
          repositories.openings.list(),
        ]);
        return json(res,200,{ok:true,workspace_id:workspace.workspace_id,projects,estimates,openings});
      }

      if(url.pathname==='/api/public-saas/work/projects'&&method==='POST'){
        const body=await readJson(req);
        const {workspace,repositories,service}=await resolveWorkService(req,res,authAdapter,dataClient,body.workspace_id);
        const created=await service.createProject(body.project??{});
        const [project,estimate]=await Promise.all([
          repositories.projects.require(created.project.project_id),
          repositories.estimates.require(created.estimate.estimate_id),
        ]);
        return json(res,201,{ok:true,workspace_id:workspace.workspace_id,project,estimate});
      }

      if(url.pathname==='/api/public-saas/work/estimates'&&method==='POST'){
        const body=await readJson(req);
        const {workspace,repositories,service}=await resolveWorkService(req,res,authAdapter,dataClient,body.workspace_id);
        const created=await service.createEstimate(body.project_id,body.estimate??{});
        const estimate=await repositories.estimates.require(created.estimate_id);
        return json(res,201,{ok:true,workspace_id:workspace.workspace_id,estimate});
      }

      if(url.pathname==='/api/public-saas/work/openings'&&method==='POST'){
        const body=await readJson(req);
        const {workspace,repositories,service}=await resolveWorkService(req,res,authAdapter,dataClient,body.workspace_id);
        const created=await service.createOpening(body.project_id,body.estimate_id,body.opening??{});
        const opening=await repositories.openings.require(created.opening_id);
        return json(res,201,{ok:true,workspace_id:workspace.workspace_id,opening});
      }

      return json(res,404,{error:'Public SaaS endpoint not found.',code:'NOT_FOUND'});
    }catch(error){
      const normalized=publicError(error);
      const authFailure=normalized.status===401?clearSessionCookies(req):[];
      return json(res,normalized.status,normalized.body,{cookies:authFailure});
    }
  };
}

export const publicSaaSCookieNames=Object.freeze({access:ACCESS_COOKIE,refresh:REFRESH_COOKIE});
