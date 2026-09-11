import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { createPublicSaaSRequestHandler } from '../src/public-saas/http-handler.mjs';

const source=readFileSync(new URL('../src/public-saas/ui/app.js',import.meta.url),'utf8');
const USER_ID='11111111-1111-4111-8111-111111111111';

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

function fakeAuth(overrides={}){
  return {
    configured:true,
    async signUpWithPassword(){return {user:{id:USER_ID}};},
    async signInWithPassword(){return {access_token:'access-1',refresh_token:'refresh-1',expires_in:3600,user:{id:USER_ID}};},
    async requestPasswordReset(){return {};},
    async refreshSession(){return {access_token:'access-2',refresh_token:'refresh-2',expires_in:3600,user:{id:USER_ID}};},
    async verifyAccessToken(){return {user_id:USER_ID,session_id:'session-1',expires_at:'2099-01-01T00:00:00.000Z',email_verified_at:'2026-09-10T08:00:00.000Z'};},
    async updatePassword(){return {};},
    async signOut(){return {};},
    ...overrides,
  };
}

const fakeData=()=>({configured:true});

test('Public SaaS async submit handlers retain a stable form reference across awaits',()=>{
  for(const formId of ['signInForm','signUpForm','workspaceForm','projectForm','openingForm']){
    const marker=`$('#${formId}').addEventListener('submit',async(event)=>{`;
    const start=source.indexOf(marker);
    assert.notEqual(start,-1,`${formId} submit handler must exist`);
    const window=source.slice(start,start+500);
    assert.match(window,/const form=event\.currentTarget;/,`${formId} must capture currentTarget before awaiting`);
  }

  assert.doesNotMatch(source,/event\.currentTarget\.reset\(\)/);
  assert.doesNotMatch(source,/new FormData\(event\.currentTarget\)/);
  assert.doesNotMatch(source,/setFormBusy\(event\.currentTarget,false\)/);
});

test('stale recovery mode is cleared when authenticated session is missing or password update returns 401',()=>{
  assert.match(source,/function clearRecoveryState\(\)/);
  assert.match(source,/if\(error\.status===401\)clearRecoveryState\(\)/);
  const updateStart=source.indexOf("$('#updatePasswordButton').addEventListener('click',async(event)=>{");
  assert.notEqual(updateStart,-1);
  const updateWindow=source.slice(updateStart,updateStart+1800);
  assert.match(updateWindow,/if\(error\.status===401\)\{/);
  assert.match(updateWindow,/clearRecoveryState\(\)/);
  assert.match(updateWindow,/再設定メールを送り直してください/);
});

test('signup redirect is derived from the same-origin Preview host and ignores client redirect input',async()=>{
  let seen=null;
  const auth=fakeAuth({async signUpWithPassword(input){seen=input;return {user:{id:USER_ID}};}});
  const handler=createPublicSaaSRequestHandler({auth,data:fakeData(),delegate:()=>{throw new Error('delegate not expected');}});
  const req=request({
    url:'/api/public-saas/auth/sign-up',method:'POST',
    headers:{origin:'https://app.example.test','x-forwarded-proto':'https'},
    body:{email:'user@example.com',password:'password-123',redirect_to:'https://evil.example'},
  }),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(seen.redirectTo,'https://app.example.test/public-saas');
  assert.notEqual(seen.redirectTo,'https://evil.example');
});

test('password recovery request uses the current Preview origin and a recovery marker',async()=>{
  let seen=null;
  const auth=fakeAuth({async requestPasswordReset(email,options){seen={email,options};return {};}});
  const handler=createPublicSaaSRequestHandler({auth,data:fakeData(),delegate:()=>{}});
  const req=request({
    url:'/api/public-saas/auth/password-reset-request',method:'POST',
    headers:{origin:'https://app.example.test','x-forwarded-proto':'https'},
    body:{email:'user@example.com'},
  }),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(seen.email,'user@example.com');
  assert.equal(seen.options.redirectTo,'https://app.example.test/public-saas?recovery=1');
  assert.equal(parse(res).ok,true);
});

test('recovery redirect session is rotated and adopted into HttpOnly cookies',async()=>{
  const calls=[];
  const auth=fakeAuth({
    async refreshSession(token){calls.push(['refresh',token]);return {access_token:'access-new',refresh_token:'refresh-new',expires_in:3600,user:{id:USER_ID}};},
    async verifyAccessToken(token){calls.push(['verify',token]);return {user_id:USER_ID,session_id:'session-new',expires_at:'2099-01-01T00:00:00.000Z',email_verified_at:'2026-09-10T08:00:00.000Z'};},
  });
  const handler=createPublicSaaSRequestHandler({auth,data:fakeData(),delegate:()=>{}});
  const req=request({
    url:'/api/public-saas/auth/adopt-session',method:'POST',
    headers:{origin:'https://app.example.test','x-forwarded-proto':'https'},
    body:{refresh_token:'refresh-from-email-fragment'},
  }),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(calls,[['refresh','refresh-from-email-fragment'],['verify','access-new']]);
  assert.equal(parse(res).user_id,USER_ID);
  assert.equal(res.headers['set-cookie'].length,2);
  assert.ok(res.headers['set-cookie'].every((cookie)=>cookie.includes('HttpOnly')&&cookie.includes('Secure')));
  assert.equal(res.body.includes('access-new'),false);
  assert.equal(res.body.includes('refresh-new'),false);
});

test('password update requires the authenticated cookie and clears session cookies afterwards',async()=>{
  const calls=[];
  const auth=fakeAuth({
    async verifyAccessToken(token){calls.push(['verify',token]);return {user_id:USER_ID,session_id:'session-1',expires_at:'2099-01-01T00:00:00.000Z',email_verified_at:'2026-09-10T08:00:00.000Z'};},
    async updatePassword(token,password){calls.push(['update',token,password]);return {};},
    async signOut(token){calls.push(['signout',token]);return {};},
  });
  const handler=createPublicSaaSRequestHandler({auth,data:fakeData(),delegate:()=>{}});
  const req=request({
    url:'/api/public-saas/auth/update-password',method:'POST',
    headers:{origin:'https://app.example.test','x-forwarded-proto':'https',cookie:'sash_ps_access=access-1; sash_ps_refresh=refresh-1'},
    body:{password:'new-password-123'},
  }),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(calls,[['verify','access-1'],['update','access-1','new-password-123'],['signout','access-1']]);
  assert.equal(res.headers['set-cookie'].length,2);
  assert.ok(res.headers['set-cookie'].every((cookie)=>cookie.includes('Max-Age=0')));
});
