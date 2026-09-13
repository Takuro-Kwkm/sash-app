import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTemporaryPreviewShare,
  evaluateHealthPayload,
  PublicSaaSMonitorError,
  runPublicSaaSHealthMonitor,
  selectLatestReadyPreview,
} from '../scripts/public-saas-health-monitor.mjs';
import { buildAlertBody, findOpenMonitorIssue, routePublicSaaSAlert } from '../scripts/public-saas-github-alert.mjs';

test('latest READY branch Preview is selected and production is excluded',()=>{
  const selected=selectLatestReadyPreview([
    {id:'old',readyState:'READY',target:null,url:'old.vercel.app',createdAt:100,meta:{githubCommitRef:'feat/public-saas-foundation-a1',githubCommitSha:'aaa'}},
    {id:'prod',readyState:'READY',target:'production',url:'prod.vercel.app',createdAt:400,meta:{githubCommitRef:'feat/public-saas-foundation-a1',githubCommitSha:'prod'}},
    {id:'other',readyState:'READY',target:null,url:'other.vercel.app',createdAt:300,meta:{githubCommitRef:'other-branch',githubCommitSha:'ccc'}},
    {id:'latest',readyState:'READY',target:null,url:'latest.vercel.app',createdAt:200,meta:{githubCommitRef:'feat/public-saas-foundation-a1',githubCommitSha:'bbb'}},
  ],{branch:'feat/public-saas-foundation-a1'});
  assert.equal(selected.id,'latest');
  assert.equal(selected.url,'https://latest.vercel.app');
  assert.equal(selected.sha,'bbb');
});

test('expected SHA mismatch is P1',()=>{
  assert.throws(
    ()=>selectLatestReadyPreview([{id:'d1',readyState:'READY',url:'preview.vercel.app',createdAt:1,meta:{githubCommitRef:'feat/public-saas-foundation-a1',githubCommitSha:'aaa'}}],{branch:'feat/public-saas-foundation-a1',expectedSha:'bbb'}),
    (error)=>error instanceof PublicSaaSMonitorError&&error.code==='PREVIEW_SHA_MISMATCH'&&error.severity==='P1',
  );
});

test('health payload requires Supabase configured and ok',()=>{
  assert.equal(evaluateHealthPayload({ok:true,configured:true,provider:'SUPABASE'},200),true);
  assert.throws(()=>evaluateHealthPayload({ok:true,configured:false,provider:'SUPABASE'},200),(error)=>error.code==='HEALTH_PROVIDER_UNCONFIGURED'&&error.severity==='P1');
  assert.throws(()=>evaluateHealthPayload({ok:false,configured:true,provider:'SUPABASE'},200),(error)=>error.code==='HEALTH_NOT_OK'&&error.severity==='P0');
});

test('temporary Preview access is scoped to the exact deployment and bounded TTL',async()=>{
  const calls=[];
  const fetchImpl=async(url,init={})=>{
    calls.push({url:String(url),init});
    return new Response(JSON.stringify({value:'share_value_test_123'}),{status:200,headers:{'content-type':'application/json'}});
  };
  const share=await createTemporaryPreviewShare({
    token:'vercel-token',
    teamId:'team_test',
    deploymentId:'dpl_test',
    ttlSeconds:900,
    fetchImpl,
  });
  assert.equal(share,'share_value_test_123');
  assert.match(calls[0].url,/\/aliases\/dpl_test\/protection-bypass\?teamId=team_test$/);
  assert.equal(calls[0].init.method,'PATCH');
  assert.equal(calls[0].init.headers.authorization,'Bearer vercel-token');
  assert.deepEqual(JSON.parse(calls[0].init.body),{ttl:900});
});

test('monitor uses Vercel API plus temporary protected Preview access without leaking secrets',async()=>{
  const calls=[];
  const share='share_value_test_456';
  const fetchImpl=async(url,init={})=>{
    const href=String(url);
    const parsed=new URL(href);
    calls.push({url:href,init});
    if(parsed.hostname==='api.vercel.com'&&parsed.pathname==='/v6/deployments'){
      return new Response(JSON.stringify({deployments:[{
        id:'dpl_test',
        readyState:'READY',
        target:null,
        url:'preview.vercel.app',
        createdAt:123,
        meta:{githubCommitRef:'feat/public-saas-foundation-a1',githubCommitSha:'abcdef'},
      }]}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(parsed.hostname==='api.vercel.com'&&parsed.pathname==='/aliases/dpl_test/protection-bypass'){
      return new Response(JSON.stringify({value:share}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(parsed.hostname==='preview.vercel.app'&&parsed.pathname==='/api/public-saas/health')return new Response(JSON.stringify({ok:true,configured:true,provider:'SUPABASE'}),{status:200,headers:{'content-type':'application/json'}});
    if(parsed.hostname==='preview.vercel.app'&&parsed.pathname==='/api/public-saas/monitoring/status')return new Response(JSON.stringify({ok:true,configured:true,provider:'POSTHOG',environment:'preview'}),{status:200,headers:{'content-type':'application/json'}});
    if(parsed.hostname==='preview.vercel.app'&&parsed.pathname==='/public-saas')return new Response('<title>Public SaaS Foundation</title>',{status:200,headers:{'content-type':'text/html'}});
    throw new Error(`unexpected URL ${href}`);
  };
  const token='vercel-secret-never-in-evidence';
  const result=await runPublicSaaSHealthMonitor({token,teamId:'team_test',projectId:'prj_test',branch:'feat/public-saas-foundation-a1',expectedSha:'abcdef',fetchImpl});
  assert.equal(result.ok,true);
  assert.equal(result.deploymentId,'dpl_test');
  assert.equal(result.previewProtection,'TEMPORARY_SHARE');
  assert.equal(JSON.stringify(result).includes(token),false);
  assert.equal(JSON.stringify(result).includes(share),false);
  assert.equal(calls[0].init.headers.authorization,`Bearer ${token}`);
  assert.equal(calls.some((call)=>call.url.includes(`_vercel_share=${share}`)),true);
});

test('GitHub alert body contains only safe monitor metadata',()=>{
  const evidence={
    severity:'P1',
    code:'HEALTH_NOT_OK',
    checkedAt:'2026-09-13T00:00:00Z',
    password:'never-send-this-password',
    token:'never-send-this-token',
    cookie:'never-send-this-cookie',
    workspace_id:'never-send-this-workspace',
  };
  const body=buildAlertBody(evidence,{
    GITHUB_SERVER_URL:'https://github.com',
    GITHUB_REPOSITORY:'Takuro-Kwkm/sash-app',
    GITHUB_RUN_ID:'123',
    PUBLIC_SAAS_HEAD_REF:'feat/public-saas-foundation-a1',
  });
  for(const secret of ['never-send-this-password','never-send-this-token','never-send-this-cookie','never-send-this-workspace'])assert.equal(body.includes(secret),false);
  assert.match(body,/Severity: P1/);
  assert.match(body,/HEALTH_NOT_OK/);
});

test('GitHub alert route creates an issue without exposing the GitHub token',async()=>{
  const requests=[];
  const fetchImpl=async(url,init={})=>{
    requests.push({url:String(url),init});
    if(String(url).includes('/issues?state=open'))return new Response('[]',{status:200});
    if(String(url).endsWith('/issues'))return new Response(JSON.stringify({number:77}),{status:201});
    throw new Error(`unexpected ${url}`);
  };
  const token='github-token-never-in-body';
  const result=await routePublicSaaSAlert({
    mode:'failure',
    evidence:{severity:'P0',code:'NO_READY_PREVIEW',checkedAt:'2026-09-13T00:00:00Z'},
    token,
    repository:'Takuro-Kwkm/sash-app',
    env:{GITHUB_SERVER_URL:'https://github.com',GITHUB_REPOSITORY:'Takuro-Kwkm/sash-app',GITHUB_RUN_ID:'123'},
    fetchImpl,
  });
  assert.deepEqual(result,{action:'created',issueNumber:77});
  assert.equal(findOpenMonitorIssue([]),null);
  assert.equal(requests[1].init.body.includes(token),false);
  assert.equal(requests[0].init.headers.authorization,`Bearer ${token}`);
});

test('monitor fails closed when PostHog Preview configuration is missing',async()=>{
  const fetchImpl=async(url,init={})=>{
    const href=String(url);
    const parsed=new URL(href);
    if(parsed.hostname==='api.vercel.com'&&parsed.pathname==='/v6/deployments')return new Response(JSON.stringify({deployments:[{id:'dpl_test',readyState:'READY',target:null,url:'preview.vercel.app',createdAt:123,meta:{githubCommitRef:'feat/public-saas-foundation-a1',githubCommitSha:'abcdef'}}]}),{status:200,headers:{'content-type':'application/json'}});
    if(parsed.hostname==='api.vercel.com'&&parsed.pathname==='/aliases/dpl_test/protection-bypass')return new Response(JSON.stringify({value:'share_value_missing_posthog'}),{status:200,headers:{'content-type':'application/json'}});
    if(parsed.hostname==='preview.vercel.app'&&parsed.pathname==='/api/public-saas/health')return new Response(JSON.stringify({ok:true,configured:true,provider:'SUPABASE'}),{status:200,headers:{'content-type':'application/json'}});
    if(parsed.hostname==='preview.vercel.app'&&parsed.pathname==='/api/public-saas/monitoring/status')return new Response(JSON.stringify({ok:true,configured:false,provider:'POSTHOG',environment:'preview'}),{status:200,headers:{'content-type':'application/json'}});
    throw new Error(`unexpected URL ${href} ${init.method??'GET'}`);
  };
  await assert.rejects(
    ()=>runPublicSaaSHealthMonitor({token:'token',teamId:'team',projectId:'project',branch:'feat/public-saas-foundation-a1',expectedSha:'abcdef',fetchImpl}),
    (error)=>error instanceof PublicSaaSMonitorError&&error.code==='CLIENT_MONITORING_UNCONFIGURED'&&error.severity==='P1',
  );
});
