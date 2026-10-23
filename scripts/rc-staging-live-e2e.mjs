import fs from 'node:fs';

const origin=String(process.env.STAGING_ALIAS??'').replace(/\/+$/,'');
const marker=`rc-${process.env.GITHUB_RUN_ID}`;

const required=(name)=>{
  const value=String(process.env[name]??'').trim();
  if(!value)throw new Error(`${name}_MISSING`);
  return value;
};

const users={
  a:{email:required('RC_STAGING_USER_A_EMAIL').toLowerCase(),password:required('RC_STAGING_USER_A_PASSWORD')},
  b:{email:required('RC_STAGING_USER_B_EMAIL').toLowerCase(),password:required('RC_STAGING_USER_B_PASSWORD')},
};
if(!origin)throw new Error('STAGING_ALIAS_MISSING');
if(users.a.email===users.b.email)throw new Error('RC_STAGING_FIXTURE_USERS_MUST_DIFFER');

class Jar{
  constructor(){this.cookies=new Map()}
  absorb(response){
    const values=typeof response.headers.getSetCookie==='function'?response.headers.getSetCookie():[];
    for(const raw of values){
      const first=raw.split(';',1)[0];
      const index=first.indexOf('=');
      if(index<1)continue;
      const name=first.slice(0,index),value=first.slice(index+1);
      if(!value)this.cookies.delete(name);else this.cookies.set(name,value);
    }
  }
  header(){return[...this.cookies.entries()].map(([key,value])=>`${key}=${value}`).join('; ')}
  clear(){this.cookies.clear()}
}

async function request(jar,path,{method='GET',body,expected}={}){
  const headers={accept:'application/json'};
  if(jar?.header())headers.cookie=jar.header();
  if(method!=='GET'&&method!=='HEAD'){
    headers.origin=origin;
    headers['sec-fetch-site']='same-origin';
    if(body!==undefined)headers['content-type']='application/json';
  }
  const response=await fetch(`${origin}${path}`,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
  jar?.absorb(response);
  const text=await response.text();
  let payload=null;
  try{payload=text?JSON.parse(text):null}catch{payload={raw:text.slice(0,200)}}
  const allowed=Array.isArray(expected)?expected:[expected??200];
  if(!allowed.includes(response.status))throw new Error(`${method} ${path} expected=${allowed.join('/')} actual=${response.status} code=${payload?.code??'unknown'}`);
  return{status:response.status,body:payload};
}

async function signIn(user,jar){
  const login=await request(jar,'/api/public-saas/auth/sign-in',{method:'POST',body:{email:user.email,password:user.password},expected:200});
  if(login.body?.ok!==true||!login.body?.user_id)throw new Error('sign-in identity missing');
  const session=await request(jar,'/api/public-saas/session',{expected:200});
  const sessionId=session.body?.principal?.user_id;
  if(sessionId!==login.body.user_id||!session.body?.principal?.email_verified_at)throw new Error('verified session mismatch');
  user.id=sessionId;
}

const jarA=new Jar();
await signIn(users.a,jarA);
const workspaceAResponse=await request(jarA,'/api/public-saas/workspaces',{method:'POST',body:{name:`${marker}-workspace-A`},expected:201});
const workspaceA=workspaceAResponse.body?.workspace?.workspace_id??workspaceAResponse.body?.workspace_id??workspaceAResponse.body?.workspace?.id;
if(!workspaceA)throw new Error('workspace A id missing');

const projectResponse=await request(jarA,'/api/public-saas/work/projects',{method:'POST',body:{workspace_id:workspaceA,project:{project_name:`${marker}-project-A`,customer_name:'RC Test A'}},expected:201});
const projectA=projectResponse.body?.project?.project_id;
const firstEstimateA=projectResponse.body?.estimate?.estimate_id;
if(!projectA||!firstEstimateA)throw new Error('project A response incomplete');

const estimateResponse=await request(jarA,'/api/public-saas/work/estimates',{method:'POST',body:{workspace_id:workspaceA,project_id:projectA,estimate:{estimate_title:`${marker}-estimate-2`}},expected:201});
const estimateA=estimateResponse.body?.estimate?.estimate_id;
if(!estimateA)throw new Error('estimate A id missing');

const openingResponse=await request(jarA,'/api/public-saas/work/openings',{method:'POST',body:{workspace_id:workspaceA,project_id:projectA,estimate_id:estimateA,opening:{room_name:'LDK',location:'南',opening_name:`${marker}-opening-A`,memo:'RC staging persistence'}},expected:201});
const openingA=openingResponse.body?.opening?.opening_id;
if(!openingA)throw new Error('opening A id missing');

const databaseA1=await request(jarA,`/api/public-saas/work/database?workspace_id=${encodeURIComponent(workspaceA)}`,{expected:200});
if(!databaseA1.body?.projects?.some(row=>row.project_id===projectA)||!databaseA1.body?.openings?.some(row=>row.opening_id===openingA))throw new Error('A readback missing rows');

await request(jarA,'/api/public-saas/auth/sign-out',{method:'POST',body:{},expected:200});
jarA.clear();
await signIn(users.a,jarA);
const databaseA2=await request(jarA,`/api/public-saas/work/database?workspace_id=${encodeURIComponent(workspaceA)}`,{expected:200});
if(!databaseA2.body?.projects?.some(row=>row.project_id===projectA)||!databaseA2.body?.openings?.some(row=>row.opening_id===openingA))throw new Error('persistence restore failed');

const jarB=new Jar();
await signIn(users.b,jarB);
if(users.a.id===users.b.id)throw new Error('fixture identities collapsed');
const workspaceBResponse=await request(jarB,'/api/public-saas/workspaces',{method:'POST',body:{name:`${marker}-workspace-B`},expected:201});
const workspaceB=workspaceBResponse.body?.workspace?.workspace_id??workspaceBResponse.body?.workspace_id??workspaceBResponse.body?.workspace?.id;
if(!workspaceB||workspaceB===workspaceA)throw new Error('workspace B create failed');

const bRead=await request(jarB,`/api/public-saas/work/database?workspace_id=${encodeURIComponent(workspaceA)}`,{expected:[403,404]});
if(bRead.body?.ok===true)throw new Error('cross-tenant read succeeded');
const bWrite=await request(jarB,'/api/public-saas/work/projects',{method:'POST',body:{workspace_id:workspaceA,project:{project_name:`${marker}-cross-tenant`}},expected:[403,404]});
if(bWrite.body?.ok===true)throw new Error('cross-tenant write succeeded');
const aRead=await request(jarA,`/api/public-saas/work/database?workspace_id=${encodeURIComponent(workspaceB)}`,{expected:[403,404]});
if(aRead.body?.ok===true)throw new Error('reverse cross-tenant read succeeded');

fs.appendFileSync(process.env.GITHUB_ENV,`RC_MARKER=${marker}\nRC_WORKSPACE_A=${workspaceA}\nRC_WORKSPACE_B=${workspaceB}\n`);
console.log('STAGING_LIVE_API_E2E_GATE=PASS');
