import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const ISSUE_MARKER='[Public SaaS Monitor]';

function safeText(value,max=200){
  return String(value??'').replace(/[\r\n\t]/g,' ').slice(0,max);
}

export function findOpenMonitorIssue(issues=[]){
  return (Array.isArray(issues)?issues:[]).find((issue)=>!issue?.pull_request&&String(issue?.title??'').includes(ISSUE_MARKER))??null;
}

export function buildAlertBody(evidence={},env={}){
  const workflowUrl=env.GITHUB_SERVER_URL&&env.GITHUB_REPOSITORY&&env.GITHUB_RUN_ID
    ?`${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
    :null;
  const lines=[
    'Automated Public SaaS Preview health monitor alert.',
    '',
    `- Severity: ${safeText(evidence.severity||'P1',8)}`,
    `- Code: ${safeText(evidence.code||'MONITOR_FAILURE',80)}`,
    `- Checked: ${safeText(evidence.checkedAt||new Date().toISOString(),40)}`,
    `- Branch: ${safeText(env.PUBLIC_SAAS_HEAD_REF||'feat/public-saas-foundation-a1',120)}`,
  ];
  if(workflowUrl)lines.push(`- Workflow run: ${workflowUrl}`);
  lines.push('','No credentials, response bodies, cookies, user identifiers, or workspace identifiers are included in this issue.');
  return lines.join('\n');
}

async function githubApi(url,{token,fetchImpl=globalThis.fetch,...init}={}){
  const response=await fetchImpl(url,{
    ...init,
    headers:{
      accept:'application/vnd.github+json',
      authorization:`Bearer ${token}`,
      'x-github-api-version':'2022-11-28',
      ...(init.headers??{}),
    },
  });
  const text=await response.text();
  let json=null;
  try{json=text?JSON.parse(text):null;}catch{}
  if(!response.ok)throw new Error(`GitHub Issues API request failed with HTTP ${response.status}.`);
  return json;
}

export async function routePublicSaaSAlert({mode,evidence,token,repository,env=process.env,fetchImpl=globalThis.fetch}={}){
  if(!['failure','recovery'].includes(mode))throw new Error('Alert mode must be failure or recovery.');
  if(!token||!repository)throw new Error('GitHub alert route configuration is incomplete.');
  const [owner,repo]=repository.split('/');
  if(!owner||!repo)throw new Error('Invalid GitHub repository name.');
  const base=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const issues=await githubApi(`${base}/issues?state=open&per_page=100`,{token,fetchImpl});
  const existing=findOpenMonitorIssue(issues);

  if(mode==='recovery'){
    if(!existing)return {action:'no_open_issue'};
    await githubApi(`${base}/issues/${existing.number}/comments`,{
      token,fetchImpl,method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body:`Public SaaS Preview health recovered at ${safeText(evidence?.checkedAt||new Date().toISOString(),40)}.`}),
    });
    await githubApi(`${base}/issues/${existing.number}`,{
      token,fetchImpl,method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({state:'closed',state_reason:'completed'}),
    });
    return {action:'closed',issueNumber:existing.number};
  }

  const severity=safeText(evidence?.severity||'P1',8);
  const code=safeText(evidence?.code||'MONITOR_FAILURE',80);
  const title=`[${severity}]${ISSUE_MARKER} ${code}`;
  const body=buildAlertBody(evidence,env);
  if(existing){
    await githubApi(`${base}/issues/${existing.number}/comments`,{
      token,fetchImpl,method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body}),
    });
    await githubApi(`${base}/issues/${existing.number}`,{
      token,fetchImpl,method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({title}),
    });
    return {action:'updated',issueNumber:existing.number};
  }
  const created=await githubApi(`${base}/issues`,{
    token,fetchImpl,method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,body}),
  });
  return {action:'created',issueNumber:created?.number??null};
}

async function main(){
  const mode=process.argv[2];
  const evidencePath=process.argv[3]??'artifacts/public-saas-health/health.json';
  const evidence=JSON.parse(await readFile(evidencePath,'utf8'));
  const result=await routePublicSaaSAlert({
    mode,
    evidence,
    token:process.env.GITHUB_TOKEN,
    repository:process.env.GITHUB_REPOSITORY,
    env:process.env,
  });
  console.log(JSON.stringify(result));
}

const invoked=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(invoked)await main();
