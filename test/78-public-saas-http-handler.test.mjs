import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createPublicSaaSRequestHandler } from '../src/public-saas/http-handler.mjs';
import { PublicSaaSError } from '../src/public-saas/domain.mjs';

const USER_ID='11111111-1111-4111-8111-111111111111';
const WORKSPACE_ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_WORKSPACE_ID='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function request({url,method='GET',headers={},body}={}){
  const req=Readable.from([]);
  req.url=url;
  req.method=method;
  req.headers={host:'app.example.test',...headers};
  if(body!==undefined)req.body=body;
  return req;
}

function response(){
  return {
    statusCode:null,headers:{},body:'',
    setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},
    writeHead(status,headers={}){this.statusCode=status;for(const [key,value] of Object.entries(headers))this.setHeader(key,value);},
    end(value=''){this.body+=String(value);},
  };
}

function parse(res){return JSON.parse(res.body);}

function fakeData(){
  const projects=[];
  const estimates=[];
  const openings=[];
  return {
    configured:true,
    projects,estimates,openings,
    async listWorkspaces(token){return [{workspace_id:WORKSPACE_ID,name:'Workspace A',status:'ACTIVE',created_by_user_id:USER_ID,token_seen:token}];},
    async listMemberships(){return [{membership_id:'mem-1',workspace_id:WORKSPACE_ID,user_id:USER_ID,role:'OWNER',status:'ACTIVE'}];},
    async createWorkspaceWithOwner(token,name){return {workspace_id:WORKSPACE_ID,name,token_seen:token};},
    async listProjects(_token,workspaceId,{includeDeleted=false}={}){
      return projects.filter((row)=>row.workspace_id===workspaceId&&(includeDeleted||!row.deleted_at));
    },
    async getProject(_token,workspaceId,projectId,{includeDeleted=false}={}){
      return projects.find((row)=>row.workspace_id===workspaceId&&row.project_id===projectId&&(includeDeleted||!row.deleted_at))??null;
    },
    async createProject(_token,workspaceId,project){
      const row={...project,workspace_id:workspaceId};projects.push(row);return [row];
    },
    async updateProject(_token,workspaceId,projectId,patch){
      const index=projects.findIndex((row)=>row.workspace_id===workspaceId&&row.project_id===projectId);
      if(index<0)return null;projects[index]={...projects[index],...patch};return projects[index];
    },
    async listEstimatesByProject(_token,workspaceId,projectId,{includeDeleted=false}={}){
      return estimates.filter((row)=>row.workspace_id===workspaceId&&row.project_id===projectId&&(includeDeleted||!row.deleted_at));
    },
    async getEstimate(_token,workspaceId,estimateId,{includeDeleted=false}={}){
      return estimates.find((row)=>row.workspace_id===workspaceId&&row.estimate_id===estimateId&&(includeDeleted||!row.deleted_at))??null;
    },
    async createEstimate(_token,workspaceId,estimate){
      const row={...estimate,workspace_id:workspaceId};estimates.push(row);return [row];
    },
    async updateEstimate(_token,workspaceId,estimateId,patch){
      const index=estimates.findIndex((row)=>row.workspace_id===workspaceId&&row.estimate_id===estimateId);
      if(index<0)return null;estimates[index]={...estimates[index],...patch};return estimates[index];
    },
    async listOpeningsByEstimate(_token,workspaceId,estimateId,{includeDeleted=false}={}){
      return openings.filter((row)=>row.workspace_id===workspaceId&&row.estimate_id===estimateId&&(includeDeleted||!row.deleted_at));
    },
    async getOpening(_token,workspaceId,openingId,{includeDeleted=false}={}){
      return openings.find((row)=>row.workspace_id===workspaceId&&row.opening_id===openingId&&(includeDeleted||!row.deleted_at))??null;
    },
    async createOpening(_token,workspaceId,opening){
      const row={...opening,workspace_id:workspaceId};openings.push(row);return [row];
    },
    async updateOpening(_token,workspaceId,openingId,patch){
      const index=openings.findIndex((row)=>row.workspace_id===workspaceId&&row.opening_id===openingId);
      if(index<0)return null;openings[index]={...openings[index],...patch};return openings[index];
    },
  };
}

function fakeAuth(overrides={}){
  return {
    configured:true,
    async signUpWithPassword(){return {user:{id:USER_ID}};},
    async signInWithPassword(){return {access_token:'access-1',refresh_token:'refresh-1',expires_in:3600,user:{id:USER_ID}};},
    async verifyAccessToken(token){return {user_id:USER_ID,session_id:'session-1',expires_at:'2099-01-01T00:00:00.000Z',email_verified_at:'2026-09-10T08:00:00.000Z',token_seen:token};},
    async refreshSession(){return {access_token:'access-2',refresh_token:'refresh-2',expires_in:3600,user:{id:USER_ID}};},
    async signOut(){return {};},
    ...overrides,
  };
}

test('Public SaaS health exposes provider state but never credentials',async()=>{
  const handler=createPublicSaaSRequestHandler({auth:fakeAuth(),data:fakeData(),delegate:()=>{throw new Error('delegate not expected');}});
  const req=request({url:'/api/public-saas/health'}),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(parse(res),{ok:true,provider:'SUPABASE',configured:true});
  assert.equal(res.body.includes('access-'),false);
  assert.equal(res.body.includes('refresh-'),false);
});

test('Public SaaS Preview shell is isolated from the recovery UI and served without credentials',async()=>{
  const handler=createPublicSaaSRequestHandler({auth:fakeAuth(),data:fakeData(),delegate:()=>{throw new Error('delegate not expected');}});
  const req=request({url:'/public-saas'}),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.match(res.headers['content-type'],/text\/html/);
  assert.match(res.body,/Public SaaS Foundation/);
  assert.equal(res.body.includes('sb_publishable_'),false);
});

test('sign-in stores access and refresh tokens only in HttpOnly cookies',async()=>{
  const handler=createPublicSaaSRequestHandler({auth:fakeAuth(),data:fakeData(),delegate:()=>{}});
  const req=request({url:'/api/public-saas/auth/sign-in',method:'POST',headers:{origin:'https://app.example.test','x-forwarded-proto':'https'},body:{email:'a@example.com',password:'secret'}}),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(parse(res),{ok:true,user_id:USER_ID});
  const cookies=res.headers['set-cookie'];
  assert.equal(Array.isArray(cookies),true);
  assert.equal(cookies.length,2);
  assert.ok(cookies.every((cookie)=>cookie.includes('HttpOnly')&&cookie.includes('SameSite=Lax')&&cookie.includes('Secure')));
  assert.equal(res.body.includes('access-1'),false);
  assert.equal(res.body.includes('refresh-1'),false);
});

test('cross-site state-changing requests are rejected before authentication work',async()=>{
  let called=false;
  const auth=fakeAuth({async signInWithPassword(){called=true;throw new Error('should not run');}});
  const handler=createPublicSaaSRequestHandler({auth,data:fakeData(),delegate:()=>{}});
  const req=request({url:'/api/public-saas/auth/sign-in',method:'POST',headers:{origin:'https://evil.example','sec-fetch-site':'cross-site'},body:{email:'a@example.com',password:'secret'}}),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,403);
  assert.equal(parse(res).code,'CSRF_REJECTED');
  assert.equal(called,false);
});

test('session endpoint refreshes an expired access token using HttpOnly refresh cookie',async()=>{
  const seen=[];
  const auth=fakeAuth({
    async verifyAccessToken(token){seen.push(['verify',token]);if(token==='expired')throw new PublicSaaSError('AUTH_PROVIDER_REQUEST_FAILED','expired',{status:401});return {user_id:USER_ID,session_id:'session-2',expires_at:'2099-01-01T00:00:00.000Z',email_verified_at:'2026-09-10T08:00:00.000Z'};},
    async refreshSession(token){seen.push(['refresh',token]);return {access_token:'access-2',refresh_token:'refresh-2',expires_in:3600,user:{id:USER_ID}};},
  });
  const handler=createPublicSaaSRequestHandler({auth,data:fakeData(),delegate:()=>{}});
  const req=request({url:'/api/public-saas/session',headers:{cookie:'sash_ps_access=expired; sash_ps_refresh=refresh-old','x-forwarded-proto':'https'}}),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(parse(res).principal.user_id,USER_ID);
  assert.deepEqual(seen,[['verify','expired'],['refresh','refresh-old'],['verify','access-2']]);
  assert.equal(res.headers['set-cookie'].length,2);
});

test('workspace listing uses verified server session access token',async()=>{
  const data=fakeData();
  const handler=createPublicSaaSRequestHandler({auth:fakeAuth(),data,delegate:()=>{}});
  const req=request({url:'/api/public-saas/workspaces',headers:{cookie:'sash_ps_access=access-1'}}),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(parse(res).workspaces[0].token_seen,'access-1');
});

test('Workspace-scoped HTTP path persists Project, initial Estimate and Opening then reads them back',async()=>{
  const data=fakeData();
  const handler=createPublicSaaSRequestHandler({auth:fakeAuth(),data,delegate:()=>{}});
  const commonHeaders={cookie:'sash_ps_access=access-1',origin:'https://app.example.test'};

  const projectReq=request({
    url:'/api/public-saas/work/projects',method:'POST',headers:commonHeaders,
    body:{workspace_id:WORKSPACE_ID,project:{project_name:'RLS E2E Project',request_company:'Example Builder'}},
  }),projectRes=response();
  await handler(projectReq,projectRes);
  assert.equal(projectRes.statusCode,201);
  const projectPayload=parse(projectRes);
  assert.equal(projectPayload.project.workspace_id,WORKSPACE_ID);
  assert.equal(projectPayload.project.owner_user_id,USER_ID);
  assert.equal(projectPayload.estimate.workspace_id,WORKSPACE_ID);

  const openingReq=request({
    url:'/api/public-saas/work/openings',method:'POST',headers:commonHeaders,
    body:{
      workspace_id:WORKSPACE_ID,
      project_id:projectPayload.project.project_id,
      estimate_id:projectPayload.estimate.estimate_id,
      opening:{room_name:'LDK',opening_name:'南面'},
    },
  }),openingRes=response();
  await handler(openingReq,openingRes);
  assert.equal(openingRes.statusCode,201);
  assert.equal(parse(openingRes).opening.workspace_id,WORKSPACE_ID);

  const dbReq=request({url:`/api/public-saas/work/database?workspace_id=${WORKSPACE_ID}`,headers:{cookie:'sash_ps_access=access-1'}}),dbRes=response();
  await handler(dbReq,dbRes);
  assert.equal(dbRes.statusCode,200);
  const db=parse(dbRes);
  assert.equal(db.projects.length,1);
  assert.equal(db.estimates.length,1);
  assert.equal(db.openings.length,1);
  assert.equal(db.projects[0].project_name,'RLS E2E Project');
  assert.equal(db.openings[0].room_name,'LDK');
});

test('HTTP persistence path rejects a Workspace without active membership before DB mutation',async()=>{
  const data=fakeData();
  const handler=createPublicSaaSRequestHandler({auth:fakeAuth(),data,delegate:()=>{}});
  const req=request({
    url:'/api/public-saas/work/projects',method:'POST',
    headers:{cookie:'sash_ps_access=access-1',origin:'https://app.example.test'},
    body:{workspace_id:OTHER_WORKSPACE_ID,project:{project_name:'Should Not Persist'}},
  }),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,403);
  assert.equal(parse(res).code,'WORKSPACE_ACCESS_DENIED');
  assert.equal(data.projects.length,0);
  assert.equal(data.estimates.length,0);
});

test('non Public SaaS paths delegate to the existing recovery handler',async()=>{
  let delegated=false;
  const handler=createPublicSaaSRequestHandler({auth:fakeAuth(),data:fakeData(),delegate:(_req,res)=>{delegated=true;res.writeHead(204);res.end();}});
  const req=request({url:'/health'}),res=response();
  await handler(req,res);
  assert.equal(delegated,true);
  assert.equal(res.statusCode,204);
});
