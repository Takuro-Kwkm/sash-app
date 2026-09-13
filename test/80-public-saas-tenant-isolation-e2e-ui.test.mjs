import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { wrapPublicSaaSSecurityBoundary } from '../src/public-saas/security-boundary.mjs';

const app=readFileSync(new URL('../src/public-saas/ui/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../src/public-saas/ui/index.html',import.meta.url),'utf8');

function request({url='/public-saas',method='GET',headers={}}={}){
  const req=Readable.from([]);
  req.url=url;
  req.method=method;
  req.headers={host:'app.example.test',...headers};
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

test('Public SaaS Preview exposes a browser tenant-isolation E2E panel',()=>{
  for(const id of ['tenantIsolationCard','currentWorkspaceId','targetWorkspaceId','tenantReadTestButton','tenantWriteTestButton','tenantIsolationResult']){
    assert.match(html,new RegExp(`id=["']${id}["']`));
  }
  assert.match(html,/期待結果は403 DENIED/);
});

test('tenant isolation UI uses authenticated application APIs and only treats 403 as PASS',()=>{
  assert.match(app,/\/api\/public-saas\/work\/database\?workspace_id=/);
  assert.match(app,/\/api\/public-saas\/work\/projects/);
  assert.match(app,/S4_NEGATIVE_TEST_SHOULD_NOT_PERSIST/);
  assert.match(app,/if\(error\.status===403\)/);
  assert.match(app,/PASS \/ 403 DENIED/);
  assert.match(app,/FAIL \/ 200系で成立してしまいました/);
  assert.match(app,/INCONCLUSIVE/);
  assert.doesNotMatch(app,/service_role/i);
  assert.doesNotMatch(app,/sb_secret_/i);
});

test('tenant isolation test refuses same-workspace targets',()=>{
  assert.match(app,/if\(target===current\)/);
  assert.match(app,/自分のWorkspaceではなく、相手Workspace ID/);
});

test('Public SaaS security boundary emits restrictive browser security headers',async()=>{
  const handler=wrapPublicSaaSSecurityBoundary((_req,res)=>{res.writeHead(204);res.end();});
  const req=request(),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,204);
  assert.match(res.headers['content-security-policy'],/default-src 'self'/);
  assert.match(res.headers['content-security-policy'],/frame-ancestors 'none'/);
  assert.equal(res.headers['x-frame-options'],'DENY');
  assert.equal(res.headers['referrer-policy'],'no-referrer');
  assert.equal(res.headers['cross-origin-opener-policy'],'same-origin');
  assert.equal(res.headers['cross-origin-resource-policy'],'same-origin');
  assert.match(res.headers['permissions-policy'],/camera=\(\)/);
  assert.equal(res.headers['cache-control'],'no-store');
});

test('Public SaaS mutation fails closed when Origin is absent on an external host',async()=>{
  let called=false;
  const handler=wrapPublicSaaSSecurityBoundary((_req,res)=>{called=true;res.writeHead(204);res.end();});
  const req=request({url:'/api/public-saas/work/projects',method:'POST'}),res=response();
  await handler(req,res);
  assert.equal(called,false);
  assert.equal(res.statusCode,403);
  assert.equal(JSON.parse(res.body).code,'CSRF_REJECTED');
});

test('Public SaaS mutation allows an exact same-origin request and rejects cross-origin',async()=>{
  let called=0;
  const handler=wrapPublicSaaSSecurityBoundary((_req,res)=>{called+=1;res.writeHead(204);res.end();});

  const allowedReq=request({
    url:'/api/public-saas/work/projects',method:'POST',
    headers:{origin:'https://app.example.test','x-forwarded-proto':'https','sec-fetch-site':'same-origin'},
  }),allowedRes=response();
  await handler(allowedReq,allowedRes);
  assert.equal(allowedRes.statusCode,204);
  assert.equal(called,1);

  const blockedReq=request({
    url:'/api/public-saas/work/projects',method:'POST',
    headers:{origin:'https://evil.example','x-forwarded-proto':'https','sec-fetch-site':'cross-site'},
  }),blockedRes=response();
  await handler(blockedReq,blockedRes);
  assert.equal(blockedRes.statusCode,403);
  assert.equal(called,1);
});

test('Public SaaS security boundary also protects Vercel __path rewrites',async()=>{
  let called=false;
  const handler=wrapPublicSaaSSecurityBoundary((_req,res)=>{called=true;res.writeHead(204);res.end();});
  const req=request({url:'/?__path=api/public-saas/work/projects',method:'POST'}),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,403);
  assert.equal(called,false);
});

test('local development may omit Origin while the external fail-closed rule remains strict',async()=>{
  let called=false;
  const handler=wrapPublicSaaSSecurityBoundary((_req,res)=>{called=true;res.writeHead(204);res.end();});
  const req=request({url:'/api/public-saas/work/projects',method:'POST',headers:{host:'127.0.0.1:4173'}}),res=response();
  await handler(req,res);
  assert.equal(res.statusCode,204);
  assert.equal(called,true);
});
