import { createPublicSaaSRequestHandler } from './http-handler.mjs';
import { wrapPublicSaaSMonitoringBoundary } from './monitoring-boundary.mjs';

const SAFE_METHODS=new Set(['GET','HEAD','OPTIONS']);
const CSP=[
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

function normalizedHost(req){
  return String(req.headers?.host??'').trim().toLowerCase();
}

function requestPath(req){
  const host=normalizedHost(req)||'localhost';
  let url;
  try{url=new URL(req.url??'/',`http://${host}`);}catch{return null;}
  const rewritten=url.searchParams.get('__path');
  return rewritten===null?url.pathname:`/${rewritten.replace(/^\/+/, '')}`;
}

function isPublicSaaSPath(path){
  return path==='/public-saas'||path?.startsWith('/public-saas/')||path?.startsWith('/api/public-saas/');
}

function isLocalHost(host){
  const hostname=host.split(':')[0];
  return hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]';
}

function expectedProtocol(req,host){
  const forwarded=String(req.headers?.['x-forwarded-proto']??'').split(',')[0].trim().toLowerCase();
  if(forwarded==='https'||forwarded==='http')return forwarded;
  return isLocalHost(host)?'http':'https';
}

function applySecurityHeaders(res){
  const headers={
    'cache-control':'no-store',
    'content-security-policy':CSP,
    'cross-origin-opener-policy':'same-origin',
    'cross-origin-resource-policy':'same-origin',
    'permissions-policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'referrer-policy':'no-referrer',
    'x-content-type-options':'nosniff',
    'x-frame-options':'DENY',
    'x-permitted-cross-domain-policies':'none',
  };
  for(const [name,value] of Object.entries(headers))res.setHeader?.(name,value);
}

function csrfFailure(req){
  const method=String(req.method??'GET').toUpperCase();
  if(SAFE_METHODS.has(method))return null;

  const host=normalizedHost(req);
  if(!host||/[\s/\\]/.test(host))return 'Invalid request host.';

  const fetchSite=String(req.headers?.['sec-fetch-site']??'').trim().toLowerCase();
  if(fetchSite==='cross-site')return 'Cross-site state-changing request rejected.';

  const origin=req.headers?.origin;
  if(!origin){
    if(isLocalHost(host))return null;
    return 'Origin header is required for state-changing requests.';
  }

  let parsed;
  try{parsed=new URL(String(origin));}catch{return 'Invalid request origin.';}
  const expected=`${expectedProtocol(req,host)}://${host}`;
  if(parsed.origin.toLowerCase()!==expected.toLowerCase())return 'Cross-origin state-changing request rejected.';
  return null;
}

function rejectCsrf(res,message){
  if(typeof res.writeHead==='function')res.writeHead(403);
  res.setHeader?.('content-type','application/json; charset=utf-8');
  res.end(JSON.stringify({error:message,code:'CSRF_REJECTED'}));
}

export function wrapPublicSaaSSecurityBoundary(handler){
  if(typeof handler!=='function')throw new TypeError('Public SaaS handler is required.');
  return async function securedPublicSaaSHandler(req,res){
    const path=requestPath(req);
    if(!isPublicSaaSPath(path))return handler(req,res);

    applySecurityHeaders(res);
    const failure=csrfFailure(req);
    if(failure)return rejectCsrf(res,failure);
    return handler(req,res);
  };
}

export function createSecurePublicSaaSRequestHandler(options={}){
  const app=createPublicSaaSRequestHandler(options);
  const secured=wrapPublicSaaSSecurityBoundary(app);
  return wrapPublicSaaSMonitoringBoundary(secured);
}

export const publicSaaSSecurityPolicy=Object.freeze({contentSecurityPolicy:CSP});
