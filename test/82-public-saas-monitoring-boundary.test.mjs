import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { wrapPublicSaaSMonitoringBoundary } from '../src/public-saas/monitoring-boundary.mjs';

function request({url='/api/public-saas/session',method='GET',headers={}}={}){
  const req=Readable.from([]);
  req.url=url;
  req.method=method;
  req.headers={host:'app.example.test',...headers};
  return req;
}

function response(){
  return {
    statusCode:200,headers:{},body:'',
    setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},
    writeHead(status){this.statusCode=status;},
    end(value=''){this.body+=String(value);},
  };
}

function logger(){
  const lines=[];
  return {
    lines,
    warn(line){lines.push(['warn',line]);},
    error(line){lines.push(['error',line]);},
  };
}

test('monitoring records bounded error context without body, query, cookies, or tokens',async()=>{
  const log=logger();
  const handler=wrapPublicSaaSMonitoringBoundary((_req,res)=>{
    res.writeHead(403);
    res.end(JSON.stringify({
      error:'password=super-secret-token',
      code:'WORKSPACE_ACCESS_DENIED',
    }));
  },{logger:log});

  const req=request({
    url:'/api/public-saas/work/database?workspace_id=tenant-secret&token=query-secret',
    headers:{
      cookie:'sash_ps_access=cookie-secret; sash_ps_refresh=refresh-secret',
      authorization:'Bearer bearer-secret',
      'x-vercel-id':'hnd1::abc123',
    },
  }),res=response();
  await handler(req,res);

  assert.equal(log.lines.length,1);
  const [level,line]=log.lines[0];
  assert.equal(level,'warn');
  const record=JSON.parse(line);
  assert.deepEqual(record,{
    event:'public_saas_request_error',
    method:'GET',
    path:'/api/public-saas/work/database',
    status:403,
    code:'WORKSPACE_ACCESS_DENIED',
    request_id:'hnd1::abc123',
  });
  for(const secret of ['super-secret-token','tenant-secret','query-secret','cookie-secret','refresh-secret','bearer-secret']){
    assert.equal(line.includes(secret),false);
  }
});

test('monitoring emits no event for successful requests',async()=>{
  const log=logger();
  const handler=wrapPublicSaaSMonitoringBoundary((_req,res)=>{res.writeHead(200);res.end('{"ok":true}');},{logger:log});
  await handler(request(),response());
  assert.equal(log.lines.length,0);
});

test('unhandled server errors are logged with a safe code only and rethrown',async()=>{
  const log=logger();
  const handler=wrapPublicSaaSMonitoringBoundary(()=>{
    const error=new Error('database password super-secret');
    error.code='DB_INTERNAL_FAILURE';
    throw error;
  },{logger:log});

  await assert.rejects(()=>handler(request(),response()),/database password super-secret/);
  assert.equal(log.lines.length,1);
  const [level,line]=log.lines[0];
  assert.equal(level,'error');
  const record=JSON.parse(line);
  assert.equal(record.event,'public_saas_unhandled_error');
  assert.equal(record.status,500);
  assert.equal(record.code,'DB_INTERNAL_FAILURE');
  assert.equal(line.includes('super-secret'),false);
});

test('non Public SaaS routes delegate without monitoring instrumentation',async()=>{
  const log=logger();
  const handler=wrapPublicSaaSMonitoringBoundary((_req,res)=>{res.writeHead(500);res.end('legacy failure');},{logger:log});
  const res=response();
  await handler(request({url:'/legacy'}),res);
  assert.equal(res.statusCode,500);
  assert.equal(log.lines.length,0);
});
