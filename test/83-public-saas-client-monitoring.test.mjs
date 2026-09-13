import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import {
  installClientErrorMonitoring,
  safeClientSource,
  sanitizeClientErrorPayload,
} from '../src/public-saas/ui/client-monitoring.js';
import {
  buildSanitizedExceptionProperties,
  createClientMonitoringRequestHandler,
  sanitizeMonitoringInput,
} from '../src/public-saas/client-monitoring-handler.mjs';

const secrets={
  email:'person@example.com',
  password:'Password-Do-Not-Send-123!',
  token:'eyJhbGciOiJub25lIn0.secret-token',
  cookie:'sb-access-token=private-cookie',
  workspace:'workspace-secret-id-12345',
};

function responseRecorder(){
  return {
    statusCode:0,
    headers:{},
    body:'',
    setHeader(name,value){this.headers[String(name).toLowerCase()]=String(value);},
    end(value=''){this.body+=Buffer.isBuffer(value)?value.toString('utf8'):String(value);},
  };
}

test('client source strips query/hash and rejects external locations',()=>{
  const origin='https://preview.example.test';
  assert.equal(
    safeClientSource(`${origin}/public-saas/app-main.js?token=${secrets.token}#${secrets.cookie}`,origin),
    '/public-saas/app-main.js',
  );
  assert.equal(safeClientSource(`https://evil.test/app.js?password=${secrets.password}`,origin),'external-or-unknown');
  assert.equal(safeClientSource(`${origin}/api/private.js?workspace=${secrets.workspace}`,origin),'external-or-unknown');
});

test('client sanitizer emits only the strict allowlist',()=>{
  const payload=sanitizeClientErrorPayload({
    kind:'window_error',
    source:`https://preview.example.test/public-saas/app.js?token=${secrets.token}`,
    line:'42',
    column:'7',
    email:secrets.email,
    password:secrets.password,
    token:secrets.token,
    cookie:secrets.cookie,
    workspace_id:secrets.workspace,
    message:Object.values(secrets).join(' '),
  },'https://preview.example.test');
  assert.deepEqual(payload,{kind:'window_error',source:'/public-saas/app.js',line:42,column:7});
  const serialized=JSON.stringify(payload);
  for(const value of Object.values(secrets))assert.equal(serialized.includes(value),false);
});

test('browser monitoring never forwards raw error/rejection content',async()=>{
  const handlers=new Map();
  const requests=[];
  const win={
    location:{origin:'https://preview.example.test',href:'https://preview.example.test/public-saas'},
    addEventListener(type,handler){handlers.set(type,handler);},
    setTimeout,
  };
  const fetchImpl=async(url,init)=>{
    requests.push({url,init});
    return {ok:true,status:202};
  };
  const result=installClientErrorMonitoring({win,fetchImpl,now:()=>1_000});
  assert.equal(result.installed,true);
  handlers.get('error')({
    filename:`https://preview.example.test/public-saas/app-main.js?token=${secrets.token}`,
    lineno:12,
    colno:3,
    message:Object.values(secrets).join(' '),
    error:new Error(Object.values(secrets).join(' ')),
  });
  handlers.get('unhandledrejection')({reason:Object.values(secrets).join(' ')});
  await new Promise((resolve)=>setImmediate(resolve));
  assert.equal(requests.length,2);
  for(const request of requests){
    assert.equal(request.url,'/api/public-saas/monitoring/client-error');
    assert.equal(request.init.credentials,'same-origin');
    const serialized=request.init.body;
    for(const value of Object.values(secrets))assert.equal(serialized.includes(value),false);
    assert.equal(serialized.includes('message'),false);
    assert.equal(serialized.includes('reason'),false);
  }
});

test('server sanitizer and PostHog properties contain no application secret fields',()=>{
  const input={
    kind:'monitoring_probe',
    source:`/public-saas/app-main.js?token=${secrets.token}`,
    line:10,
    column:2,
    email:secrets.email,
    password:secrets.password,
    access_token:secrets.token,
    cookie:secrets.cookie,
    workspace_id:secrets.workspace,
  };
  const sanitized=sanitizeMonitoringInput(input);
  assert.equal(sanitized.source,'external-or-unknown');
  assert.equal(sanitized.code,'CLIENT_MONITORING_PROBE');

  const properties=buildSanitizedExceptionProperties(input,{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:'abcdef1234567'});
  const serialized=JSON.stringify(properties);
  for(const value of Object.values(secrets))assert.equal(serialized.includes(value),false);
  for(const key of ['password','access_token','cookie','workspace_id','email'])assert.equal(Object.prototype.hasOwnProperty.call(properties,key),false);
  assert.equal(properties.distinct_id,'public-saas-preview-browser');
  assert.equal(properties.$process_person_profile,false);
  assert.equal(properties.public_saas_environment,'preview');
});

test('server proxy sends only sanitized exception properties to PostHog',async()=>{
  let outbound;
  const fetchImpl=async(url,init)=>{
    outbound={url,init};
    return {ok:true,status:200};
  };
  const handler=createClientMonitoringRequestHandler({
    env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:'abcdef1234567'},
    fetchImpl,
    projectToken:'posthog-public-write-only-project-token',
  });
  const req=Readable.from([JSON.stringify({
    kind:'window_error',
    source:'/public-saas/app-main.js',
    line:20,
    column:5,
    email:secrets.email,
    password:secrets.password,
    token:secrets.token,
    cookie:secrets.cookie,
    workspace_id:secrets.workspace,
  })]);
  req.method='POST';
  req.headers={host:'app.example.test',origin:'https://app.example.test','x-forwarded-proto':'https','content-type':'application/json'};
  const res=responseRecorder();
  await handler(req,res);
  assert.equal(res.statusCode,202);
  const body=JSON.parse(outbound.init.body);
  assert.equal(body.event,'$exception');
  assert.equal(body.api_key,'posthog-public-write-only-project-token');
  const propertiesSerialized=JSON.stringify(body.properties);
  for(const value of Object.values(secrets))assert.equal(propertiesSerialized.includes(value),false);
  assert.equal(body.properties.public_saas_source,'/public-saas/app-main.js');
  assert.equal(body.properties.$exception_list[0].value,'CLIENT_RUNTIME_ERROR');
});

test('client monitoring proxy is hard-disabled in production',async()=>{
  let calls=0;
  const handler=createClientMonitoringRequestHandler({
    env:{VERCEL_ENV:'production'},
    fetchImpl:async()=>{calls+=1;return {ok:true};},
    projectToken:'posthog-public-write-only-project-token',
  });
  const req=Readable.from(['{}']);
  req.method='POST';
  req.headers={host:'app.example.test',origin:'https://app.example.test','x-forwarded-proto':'https','content-type':'application/json'};
  const res=responseRecorder();
  await handler(req,res);
  assert.equal(res.statusCode,503);
  assert.equal(JSON.parse(res.body).code,'MONITORING_PRODUCTION_DISABLED');
  assert.equal(calls,0);
});

test('client monitoring proxy rejects cross-site posts before provider work',async()=>{
  let calls=0;
  const handler=createClientMonitoringRequestHandler({
    env:{VERCEL_ENV:'preview'},
    fetchImpl:async()=>{calls+=1;return {ok:true};},
    projectToken:'posthog-public-write-only-project-token',
  });
  const req=Readable.from(['{}']);
  req.method='POST';
  req.headers={host:'app.example.test',origin:'https://evil.example','sec-fetch-site':'cross-site','content-type':'application/json'};
  const res=responseRecorder();
  await handler(req,res);
  assert.equal(res.statusCode,403);
  assert.equal(JSON.parse(res.body).code,'MONITORING_ORIGIN_REJECTED');
  assert.equal(calls,0);
});
