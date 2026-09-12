const MONITORING_ENDPOINT='/api/public-saas/monitoring/client-error';
const MONITORING_PROBE_MESSAGE='PUBLIC_SAAS_MONITORING_PROBE';
const MAX_EVENTS_PER_WINDOW=5;
const RATE_WINDOW_MS=60_000;
const MAX_SOURCE_LENGTH=160;
const ALLOWED_KINDS=new Set(['window_error','unhandled_rejection','monitoring_probe']);

function clampInteger(value){
  const parsed=Number.parseInt(String(value??0),10);
  if(!Number.isFinite(parsed)||parsed<0)return 0;
  return Math.min(parsed,10_000_000);
}

function originFromWindow(win){
  try{return String(win?.location?.origin??'');}catch{return '';}
}

export function safeClientSource(value,origin=''){
  if(value==='unhandled-promise')return 'unhandled-promise';
  if(!value)return 'external-or-unknown';
  try{
    const base=origin||'https://public-saas.invalid';
    const url=new URL(String(value),base);
    if(origin&&url.origin!==origin)return 'external-or-unknown';
    if(!url.pathname.startsWith('/public-saas/'))return 'external-or-unknown';
    if(!/\.(?:js|mjs)$/.test(url.pathname))return 'external-or-unknown';
    return url.pathname.slice(0,MAX_SOURCE_LENGTH);
  }catch{
    return 'external-or-unknown';
  }
}

export function sanitizeClientErrorPayload(input={},origin=''){
  const kind=ALLOWED_KINDS.has(input.kind)?input.kind:'window_error';
  return Object.freeze({
    kind,
    source:safeClientSource(input.source,origin),
    line:clampInteger(input.line),
    column:clampInteger(input.column),
  });
}

function probeRequested(win){
  try{
    const url=new URL(win.location.href);
    return url.hostname.endsWith('.vercel.app')&&url.searchParams.get('monitoring_probe')==='1';
  }catch{
    return false;
  }
}

export function installClientErrorMonitoring({win=globalThis.window,fetchImpl=globalThis.fetch,now=()=>Date.now()}={}){
  if(!win||typeof win.addEventListener!=='function'||typeof fetchImpl!=='function')return {installed:false};
  if(win.__PUBLIC_SAAS_MONITORING_INSTALLED__)return {installed:true,duplicate:true};
  win.__PUBLIC_SAAS_MONITORING_INSTALLED__=true;

  const sentAt=[];
  const origin=originFromWindow(win);
  const withinBudget=()=>{
    const current=now();
    while(sentAt.length&&current-sentAt[0]>RATE_WINDOW_MS)sentAt.shift();
    if(sentAt.length>=MAX_EVENTS_PER_WINDOW)return false;
    sentAt.push(current);
    return true;
  };

  const send=(input)=>{
    if(!withinBudget())return;
    const payload=sanitizeClientErrorPayload(input,origin);
    void Promise.resolve(fetchImpl(MONITORING_ENDPOINT,{
      method:'POST',
      credentials:'same-origin',
      keepalive:true,
      headers:{'content-type':'application/json'},
      body:JSON.stringify(payload),
    })).catch(()=>{});
  };

  win.addEventListener('error',(event)=>{
    const isProbe=event?.error?.message===MONITORING_PROBE_MESSAGE;
    if(isProbe)win.document?.documentElement?.setAttribute?.('data-public-saas-monitoring-probe','attempted');
    send({
      kind:isProbe?'monitoring_probe':'window_error',
      source:event?.filename,
      line:event?.lineno,
      column:event?.colno,
    });
  });

  win.addEventListener('unhandledrejection',()=>{
    send({kind:'unhandled_rejection',source:'unhandled-promise',line:0,column:0});
  });

  win.__PUBLIC_SAAS_MONITORING_READY__=true;
  if(probeRequested(win)){
    win.setTimeout(()=>{throw new Error(MONITORING_PROBE_MESSAGE);},50);
  }
  return {installed:true};
}

if(typeof window!=='undefined')installClientErrorMonitoring();
