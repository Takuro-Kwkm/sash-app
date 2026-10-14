/** In-memory, exact-origin access for native QA of protected Vercel builds. */
import assert from 'node:assert/strict';

const REDIRECTS=new Set([301,302,303,307,308]);
function access(origin,environment){
 assert.equal(new URL(origin).origin,origin,'QA_AUTH_ORIGIN_MUST_BE_AN_ORIGIN');
 const oidc=environment.VERCEL_OIDC_TOKEN,share=environment.VERCEL_SHARE_TOKEN;
 assert.ok(!(oidc&&share),'QA_AUTH_METHOD_AMBIGUOUS');
 if(oidc||share)assert.equal(environment.QA_AUTH_ORIGIN,origin,'QA_AUTH_ORIGIN_MISMATCH');
 return {
  active:Boolean(oidc||share),
  url(value){
   const url=new URL(value);
   assert.equal(url.origin,origin,'QA_REQUEST_ORIGIN_MISMATCH');
   assert.equal(url.username+url.password,'','QA_CREDENTIAL_URL_FORBIDDEN');
   if(share)url.searchParams.set('_vercel_share',share);
   return url.href;
  },
  headers(original={}){
   const headers={...original};
   for(const key of Object.keys(headers))if(['x-vercel-trusted-oidc-idp-token','x-vercel-protection-bypass'].includes(key.toLowerCase()))delete headers[key];
   if(oidc)headers['x-vercel-trusted-oidc-idp-token']=oidc;
   return headers;
  },
  redirect(location,current){
   const next=new URL(location,current);
   assert.equal(next.origin,origin,'QA_REDIRECT_ORIGIN_MISMATCH');
   next.searchParams.delete('_vercel_share');
   return next.href;
  },
 };
}

export function safeQaError(error,environment=process.env){
 let value=String(error?.stack??error?.message??error);
 for(const token of [environment.VERCEL_OIDC_TOKEN,environment.VERCEL_SHARE_TOKEN].filter(Boolean)){
  value=value.split(token).join('[REDACTED]').split(encodeURIComponent(token)).join('[REDACTED]');
 }
 return value;
}

export async function protectedQaFetch(url,{origin,environment=process.env,fetchImplementation=fetch}={}){
 const auth=access(origin,environment);
 let current=new URL(url).href;
 const cookies=new Map();
 for(let count=0;count<5;count++){
  const headers=auth.headers(cookies.size?{cookie:[...cookies.values()].join('; ')}:{});
  const response=await fetchImplementation(auth.url(current),{headers,redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(!REDIRECTS.has(response.status))return response;
  assert.ok(auth.active,'QA_UNEXPECTED_REDIRECT');
  const location=response.headers.get('location');assert.ok(location,'QA_REDIRECT_LOCATION_MISSING');
  current=auth.redirect(location,current);
  const setCookies=response.headers.getSetCookie?.()??[];
  for(const value of setCookies){
   const cookie=value.split(';',1)[0];
   cookies.set(cookie.split('=',1)[0],cookie);
  }
 }
 throw new Error('QA_AUTH_REDIRECT_LIMIT');
}

export async function protectedQaGet(request,url,origin,environment=process.env){
 const auth=access(origin,environment);
 let current=new URL(url).href;
 for(let count=0;count<5;count++){
  const response=await request.get(auth.url(current),{headers:auth.headers(),maxRedirects:0});
  if(!REDIRECTS.has(response.status()))return response;
  assert.ok(auth.active,'QA_UNEXPECTED_REDIRECT');
  const location=response.headers().location;assert.ok(location,'QA_REDIRECT_LOCATION_MISSING');
  current=auth.redirect(location,current);
 }
 throw new Error('QA_AUTH_REDIRECT_LIMIT');
}

export async function configureProtectedQaBrowser(context,origin,environment=process.env){
 const auth=access(origin,environment);
 if(!auth.active)return;
 await context.route('**/*',async route=>{
  try{
   const request=route.request(),url=new URL(request.url());
   const headers={...request.headers()};
   for(const key of Object.keys(headers))if(['x-vercel-trusted-oidc-idp-token','x-vercel-protection-bypass'].includes(key.toLowerCase()))delete headers[key];
   if(url.origin!==origin){await route.continue({headers});return;}
   // Playwright does not rerun routing for every browser redirect. Resolve each
   // approved hop here, then expose only the original clean URL to the browser.
   let current=url.href;
   for(let count=0;count<5;count++){
    const response=await route.fetch({url:auth.url(current),headers:auth.headers(headers),maxRedirects:0});
    const responseHeaders={...response.headers()};
    if(REDIRECTS.has(response.status())){
     assert.ok(['GET','HEAD'].includes(request.method()),'QA_AUTH_NON_GET_REDIRECT');
     assert.ok(responseHeaders.location,'QA_REDIRECT_LOCATION_MISSING');
     current=auth.redirect(responseHeaders.location,current);
     continue;
    }
    await route.fulfill({response,headers:responseHeaders});
    return;
   }
   throw new Error('QA_AUTH_REDIRECT_LIMIT');
  }catch{
   await route.abort('blockedbyclient');
  }
 });
}
