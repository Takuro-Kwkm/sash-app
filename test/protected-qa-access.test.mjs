import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {configureProtectedQaBrowser,protectedQaFetch,protectedQaGet,safeQaError} from '../scripts/production/protected-qa-access.mjs';

async function server(handler){
 const instance=http.createServer(handler);
 await new Promise(resolve=>instance.listen(0,'127.0.0.1',resolve));
 return {origin:`http://127.0.0.1:${instance.address().port}`,close:()=>new Promise(resolve=>instance.close(resolve))};
}

test('protected HTTP keeps OIDC on the exact approved origin and preserves redirect cookies',async()=>{
 const requests=[];
 const app=await server((request,response)=>{
  requests.push({url:request.url,token:request.headers['x-vercel-trusted-oidc-idp-token'],cookie:request.headers.cookie});
  if(request.url==='/start'){response.writeHead(302,{location:'/middle','set-cookie':'access=granted; Path=/'});response.end();}
  else if(request.url==='/middle'){response.writeHead(302,{location:'/end'});response.end();}
  else{response.end('verified');}
 });
 try{
  const response=await protectedQaFetch(`${app.origin}/start`,{origin:app.origin,environment:{VERCEL_OIDC_TOKEN:'test-oidc',QA_AUTH_ORIGIN:app.origin}});
  assert.equal(await response.text(),'verified');
  assert.deepEqual(requests.map(request=>request.token),['test-oidc','test-oidc','test-oidc']);
  assert.deepEqual(requests.map(request=>request.cookie),[undefined,'access=granted','access=granted']);
 }finally{await app.close();}
});

test('protected HTTP rejects cross-origin redirects before contacting the destination',async()=>{
 let externalRequests=0;
 const external=await server((_request,response)=>{externalRequests++;response.end('unexpected');});
 const app=await server((_request,response)=>{response.writeHead(302,{location:`${external.origin}/receive`});response.end();});
 try{
  await assert.rejects(protectedQaFetch(`${app.origin}/start`,{origin:app.origin,environment:{VERCEL_SHARE_TOKEN:'test-share',QA_AUTH_ORIGIN:app.origin}}),/QA_REDIRECT_ORIGIN_MISMATCH/);
  assert.equal(externalRequests,0);
 }finally{await app.close();await external.close();}
});

test('origin mismatch and competing credentials fail before network activity',async()=>{
 let calls=0;
 const origin='https://approved.example';
 const fetchImplementation=async()=>{calls++;throw new Error('unexpected network');};
 await assert.rejects(protectedQaFetch(`${origin}/`,{origin,environment:{VERCEL_OIDC_TOKEN:'token',QA_AUTH_ORIGIN:'https://other.example'},fetchImplementation}),/QA_AUTH_ORIGIN_MISMATCH/);
 await assert.rejects(protectedQaFetch(`${origin}/`,{origin,environment:{VERCEL_OIDC_TOKEN:'token',VERCEL_SHARE_TOKEN:'share',QA_AUTH_ORIGIN:origin},fetchImplementation}),/QA_AUTH_METHOD_AMBIGUOUS/);
 assert.equal(calls,0);
});

test('Playwright HTTP uses one-hop requests and refuses a cross-origin redirect',async()=>{
 const origin='https://approved.example',calls=[];
 const request={get:async(url,options)=>{calls.push({url,options});return {status:()=>302,headers:()=>({location:'https://external.example/'})};}};
 await assert.rejects(protectedQaGet(request,`${origin}/api/health`,origin,{VERCEL_OIDC_TOKEN:'test-oidc',QA_AUTH_ORIGIN:origin}),/QA_REDIRECT_ORIGIN_MISMATCH/);
 assert.equal(calls.length,1);
 assert.equal(calls[0].options.maxRedirects,0);
 assert.equal(calls[0].options.headers['x-vercel-trusted-oidc-idp-token'],'test-oidc');
});

test('browser interception keeps clean URLs and aborts a protected cross-origin redirect',async()=>{
 const origin='https://approved.example';let handler,fetchOptions,fulfilled=false,abortReason;
 await configureProtectedQaBrowser({route:async(_pattern,callback)=>{handler=callback;}},origin,{VERCEL_SHARE_TOKEN:'test-share',QA_AUTH_ORIGIN:origin});
 await handler({
  request:()=>({url:()=>`${origin}/`,headers:()=>({}),method:()=>'GET'}),
  fetch:async(options)=>{fetchOptions=options;return {status:()=>302,headers:()=>({location:'https://external.example/?_vercel_share=test-share'})};},
  fulfill:async()=>{fulfilled=true;},abort:async(reason)=>{abortReason=reason;},
 });
 assert.equal(new URL(fetchOptions.url).searchParams.get('_vercel_share'),'test-share');
 assert.equal(fetchOptions.maxRedirects,0);
 assert.equal(fulfilled,false);
 assert.equal(abortReason,'blockedbyclient');
});

test('native error serialization removes raw and URL-encoded access credentials',()=>{
 const environment={VERCEL_OIDC_TOKEN:'oidc/token',VERCEL_SHARE_TOKEN:'share+token'};
 const serialized=safeQaError(new Error('oidc/token oidc%2Ftoken share+token share%2Btoken'),environment);
 for(const token of Object.values(environment)){
  assert.ok(!serialized.includes(token));assert.ok(!serialized.includes(encodeURIComponent(token)));
 }
 assert.equal(serialized.match(/\[REDACTED\]/g)?.length,4);
});
