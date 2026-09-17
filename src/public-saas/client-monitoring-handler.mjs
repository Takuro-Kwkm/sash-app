const CAPTURE_URL='https://us.i.posthog.com/i/v0/e/';
const MAX_BODY_BYTES=2048;
const ALLOWED_KINDS=new Set(['window_error','unhandled_rejection','monitoring_probe']);
const KIND_CODES=Object.freeze({
  window_error:'CLIENT_RUNTIME_ERROR',
  unhandled_rejection:'CLIENT_UNHANDLED_REJECTION',
  monitoring_probe:'CLIENT_MONITORING_PROBE',
});
function clampInteger(value){
  const parsed=Number.parseInt(String(value??0),10);
  if(!Number.isFinite(parsed)||parsed<0)return 0;
  return Math.min(parsed,10_000_000);
}

function safeSource(value){
  const text=String(value??'');
  if(text==='unhandled-promise')return text;
  if(text==='external-or-unknown')return text;
  if(text.length>160)return 'external-or-unknown';
  if(!text.startsWith('/public-saas/'))return 'external-or-unknown';
  if(/[?#\\]/.test(text))return 'external-or-unknown';
  if(!/^[A-Za-z0-9/_\-.]+$/.test(text))return 'external-or-unknown';
  if(!/\.(?:js|mjs)$/.test(text))return 'external-or-unknown';
  return text;
}

export function sanitizeMonitoringInput(input={}){
  const kind=ALLOWED_KINDS.has(input.kind)?input.kind:'window_error';
  return Object.freeze({
    kind,
    code:KIND_CODES[kind],
    source:safeSource(input.source),
    line:clampInteger(input.line),
    column:clampInteger(input.column),
  });
}

function safeCommitSha(value){
  const sha=String(value??'').trim().toLowerCase();
  return /^[a-f0-9]{7,40}$/.test(sha)?sha:null;
}

export function buildSanitizedExceptionProperties(input={},env={}){
  const safe=sanitizeMonitoringInput(input);
  const environment=String(env.VERCEL_ENV??'development').toLowerCase();
  const releaseSha=safeCommitSha(env.VERCEL_GIT_COMMIT_SHA??env.PUBLIC_SAAS_HEAD_SHA);
  const fingerprint=`public-saas:${safe.code}:${safe.source}`.slice(0,240);
  const properties={
    distinct_id:'public-saas-preview-browser',
    '$process_person_profile':false,
    '$exception_list':[
      {
        type:'PublicSaaSClientError',
        value:safe.code,
        mechanism:{type:'generic',handled:false,synthetic:safe.kind==='monitoring_probe'},
      },
    ],
    '$exception_fingerprint':fingerprint,
    '$issue_name':`Public SaaS ${safe.code}`,
    '$issue_description':`Sanitized client-side JavaScript exception (${safe.kind})`,
    '$exception_level':'error',
    public_saas_environment:environment,
    public_saas_source:safe.source,
    public_saas_line:safe.line,
    public_saas_column:safe.column,
  };
  if(releaseSha)properties.public_saas_release_sha=releaseSha;
  return Object.freeze(properties);
}

function isLocalHost(host){
  const hostname=String(host??'').toLowerCase().split(':')[0];
  return hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]';
}

function originAccepted(req){
  const host=String(req.headers?.host??'').trim().toLowerCase();
  if(!host||/[\s/\\]/.test(host))return false;
  const fetchSite=String(req.headers?.['sec-fetch-site']??'').trim().toLowerCase();
  if(fetchSite==='cross-site')return false;
  const origin=req.headers?.origin;
  if(!origin)return isLocalHost(host);
  let parsed;
  try{parsed=new URL(String(origin));}catch{return false;}
  const forwarded=String(req.headers?.['x-forwarded-proto']??'').split(',')[0].trim().toLowerCase();
  const protocol=forwarded==='http'||forwarded==='https'?forwarded:(isLocalHost(host)?'http':'https');
  return parsed.origin.toLowerCase()===`${protocol}://${host}`.toLowerCase();
}

function writeJson(res,status,body){
  res.statusCode=status;
  res.setHeader?.('content-type','application/json; charset=utf-8');
  res.setHeader?.('cache-control','no-store');
  res.end(JSON.stringify(body));
}

async function readJson(req){
  if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
  if(typeof req.body==='string'){
    if(Buffer.byteLength(req.body,'utf8')>MAX_BODY_BYTES)throw Object.assign(new Error('payload too large'),{statusCode:413,code:'MONITORING_PAYLOAD_TOO_LARGE'});
    try{return JSON.parse(req.body);}catch{throw Object.assign(new Error('invalid json'),{statusCode:400,code:'MONITORING_INVALID_JSON'});}
  }
  let size=0;
  const chunks=[];
  for await(const chunk of req){
    const buffer=Buffer.from(chunk);
    size+=buffer.byteLength;
    if(size>MAX_BODY_BYTES)throw Object.assign(new Error('payload too large'),{statusCode:413,code:'MONITORING_PAYLOAD_TOO_LARGE'});
    chunks.push(buffer);
  }
  const text=Buffer.concat(chunks).toString('utf8');
  if(!text)return {};
  try{return JSON.parse(text);}catch{throw Object.assign(new Error('invalid json'),{statusCode:400,code:'MONITORING_INVALID_JSON'});}
}

export function createClientMonitoringRequestHandler({env=process.env,fetchImpl=globalThis.fetch,projectToken=env.POSTHOG_PROJECT_TOKEN}={}){
  if(typeof fetchImpl!=='function')throw new TypeError('Monitoring fetch implementation is required.');
  return async function clientMonitoringRequestHandler(req,res){
    const method=String(req.method??'GET').toUpperCase();
    if(method!=='POST'){
      res.setHeader?.('allow','POST');
      return writeJson(res,405,{error:'Method not allowed.',code:'MONITORING_METHOD_NOT_ALLOWED'});
    }
    if(!originAccepted(req))return writeJson(res,403,{error:'Monitoring request origin rejected.',code:'MONITORING_ORIGIN_REJECTED'});
    const contentType=String(req.headers?.['content-type']??'').toLowerCase();
    if(!contentType.startsWith('application/json'))return writeJson(res,415,{error:'JSON body required.',code:'MONITORING_CONTENT_TYPE_REQUIRED'});

    const environment=String(env.VERCEL_ENV??'development').toLowerCase();
    if(environment==='production')return writeJson(res,503,{error:'Client monitoring is disabled in production.',code:'MONITORING_PRODUCTION_DISABLED'});
    if(!projectToken)return writeJson(res,503,{error:'Monitoring provider is not configured.',code:'MONITORING_PROVIDER_UNCONFIGURED'});

    let input;
    try{input=await readJson(req);}catch(error){return writeJson(res,error.statusCode??400,{error:'Invalid monitoring payload.',code:error.code??'MONITORING_INVALID_PAYLOAD'});}
    const properties=buildSanitizedExceptionProperties(input,env);
    const body={api_key:projectToken,event:'$exception',properties};

    let response;
    try{
      const signal=typeof AbortSignal?.timeout==='function'?AbortSignal.timeout(4_000):undefined;
      response=await fetchImpl(CAPTURE_URL,{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(body),
        signal,
      });
    }catch{
      return writeJson(res,502,{error:'Monitoring provider request failed.',code:'MONITORING_PROVIDER_FAILED'});
    }
    if(!response?.ok)return writeJson(res,502,{error:'Monitoring provider rejected the event.',code:'MONITORING_PROVIDER_REJECTED'});
    return writeJson(res,202,{ok:true,code:'CLIENT_ERROR_CAPTURED'});
  };
}
