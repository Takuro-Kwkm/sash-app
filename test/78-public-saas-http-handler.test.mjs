import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createPublicSaaSRequestHandler } from '../src/public-saas/http-handler.mjs';
import { PublicSaaSError } from '../src/public-saas/domain.mjs';

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
  return {
    configured:true,
    async listWorkspaces(token){return [{workspace_id:'w1',token_seen:token}];},
    async listMemberships(){return [{membership_id:'m1'}];},
    async createWorkspaceWithOwner(token,name){return {workspace_id:'w2',name,token_seen:token};},
  };
}

function fakeAuth(overrides={}){
  return {
    configured:true,
    async signUpWithPassword(){return {user:{id:'user-signup'}};},
    async signInWithPassword(){return {access_token:'access-1',refresh_token:'refresh-1',expires_in:3600,user:{id:'user-1'}};},
    async verifyAccessToken(token){return {user_id:'user-1',session_id:'session-1',expires_at:'2026-09-10T10:00:00.000Z',email_verified_at:'2026-09-10T08:00:00.000Z',token_seen:token};},
    async refreshSession(){return {access_token:'access-2',refresh_token:'refresh-2',expires_in:3600,user:{id:'user-1'}};},
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

test('sign-in stores access and refresh tokens only in HttpOnly cookies',async()=>{
  const handler=createPublicSaaSRequestHandler({auth:fakeAuth(),data:fakeData(),delegate:()=>{}});
  const req=request({url:'/api/public-saas/auth/sign-in',method:'POST',headers:{origin:'https://app.example.test','x-forwarded-proto':'https'},body:{email:'a@example.com',password:'secret'}}),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(parse(res),{ok:true,user_id:'user-1'});
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
    async verifyAccessToken(token){seen.push(['verify',token]);if(token==='expired')throw new PublicSaaSError('AUTH_PROVIDER_REQUEST_FAILED','expired',{status:401});return {user_id:'user-1',session_id:'session-2',expires_at:'2026-09-10T10:00:00.000Z',email_verified_at:'2026-09-10T08:00:00.000Z'};},
    async refreshSession(token){seen.push(['refresh',token]);return {access_token:'access-2',refresh_token:'refresh-2',expires_in:3600,user:{id:'user-1'}};},
  });
  const handler=createPublicSaaSRequestHandler({auth,data:fakeData(),delegate:()=>{}});
  const req=request({url:'/api/public-saas/session',headers:{cookie:'sash_ps_access=expired; sash_ps_refresh=refresh-old','x-forwarded-proto':'https'}}),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(parse(res).principal.user_id,'user-1');
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

test('non Public SaaS paths delegate to the existing recovery handler',async()=>{
  let delegated=false;
  const handler=createPublicSaaSRequestHandler({auth:fakeAuth(),data:fakeData(),delegate:(_req,res)=>{delegated=true;res.writeHead(204);res.end();}});
  const req=request({url:'/health'}),res=response();
  await handler(req,res);
  assert.equal(delegated,true);
  assert.equal(res.statusCode,204);
});
