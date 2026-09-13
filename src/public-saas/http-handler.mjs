import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createPublicSaaSRequestHandler as createCorePublicSaaSRequestHandler } from './http-handler-core.mjs';
import { createClientMonitoringRequestHandler } from './client-monitoring-handler.mjs';

const UI_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'ui');
const CLIENT_MONITORING_ASSET={file:'client-monitoring.js',type:'text/javascript; charset=utf-8'};

function requestPath(req){
  const host=String(req.headers?.host??'localhost');
  let url;
  try{url=new URL(req.url??'/',`http://${host}`);}catch{return null;}
  const rewritten=url.searchParams.get('__path');
  return rewritten===null?url.pathname:`/${rewritten.replace(/^\/+/, '')}`;
}

async function serveStatic(req,res,{file,type,prefix=''}){
  const method=String(req.method??'GET').toUpperCase();
  if(method!=='GET'&&method!=='HEAD')return false;
  const source=await readFile(path.join(UI_ROOT,file));
  const body=prefix?Buffer.concat([Buffer.from(prefix,'utf8'),source]):source;
  res.statusCode=200;
  res.setHeader?.('content-type',type);
  res.setHeader?.('cache-control','no-store');
  res.setHeader?.('x-content-type-options','nosniff');
  if(method==='HEAD')return res.end();
  return res.end(body);
}

export function createPublicSaaSRequestHandler(options={}){
  const {monitoringFetch=globalThis.fetch,monitoringProjectToken,...coreOptions}=options;
  const core=createCorePublicSaaSRequestHandler(coreOptions);
  const monitoringEnv=coreOptions.env??process.env;
  const monitoring=createClientMonitoringRequestHandler({
    env:monitoringEnv,
    fetchImpl:monitoringFetch,
    projectToken:monitoringProjectToken??monitoringEnv.POSTHOG_PROJECT_TOKEN,
  });

  return async function publicSaaSRequestHandler(req,res){
    const pathname=requestPath(req);
    if(pathname==='/public-saas/client-monitoring.js')return serveStatic(req,res,CLIENT_MONITORING_ASSET);
    if(pathname==='/public-saas/app.js'){
      return serveStatic(req,res,{file:'app.js',type:'text/javascript; charset=utf-8',prefix:"import './client-monitoring.js';\n"});
    }
    if(pathname==='/api/public-saas/monitoring/status'){
      res.statusCode=200;
      res.setHeader?.('content-type','application/json; charset=utf-8');
      res.setHeader?.('cache-control','no-store');
      return res.end(JSON.stringify({
        ok:true,
        provider:'POSTHOG',
        configured:Boolean(monitoringProjectToken??monitoringEnv.POSTHOG_PROJECT_TOKEN),
        environment:String(monitoringEnv.VERCEL_ENV??'development').toLowerCase(),
      }));
    }
    if(pathname==='/api/public-saas/monitoring/client-error')return monitoring(req,res);
    return core(req,res);
  };
}
