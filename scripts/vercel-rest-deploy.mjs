import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync,spawn } from 'node:child_process';
import path from 'node:path';

const mode = process.argv[2] ?? 'preview';
const outputPath = process.argv[3] ?? 'artifacts/vercel-deployment.json';
if (!['preview', 'production'].includes(mode)) {
  throw new Error(`Unsupported deployment mode: ${mode}`);
}

const token = process.env.VERCEL_TOKEN_EFFECTIVE??process.env.VERCEL_TOKEN;
const authenticatedCli=process.env.VERCEL_API_CLI;
if(!token&&(!authenticatedCli||!path.isAbsolute(authenticatedCli)))throw new Error('EXISTING_VERCEL_AUTHENTICATION_REQUIRED');
const teamId = process.env.VERCEL_ORG_ID;
const projectId = process.env.VERCEL_PROJECT_ID;
const projectName = process.env.VERCEL_PROJECT_NAME ?? 'sash-app-wave3-preview';
const githubSha = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const githubRefName = process.env.GITHUB_REF_NAME ?? execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
const repository = process.env.GITHUB_REPOSITORY ?? 'Takuro-Kwkm/sash-app';
const repositoryId = process.env.GITHUB_REPOSITORY_ID ?? '1351370514';

for (const [name, value] of Object.entries({ teamId, projectId, projectName, githubSha })) {
  if (!value) throw new Error(`Missing required value: ${name}`);
}

const actualSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (actualSha !== githubSha) {
  throw new Error(`Git SHA mismatch: checkout=${actualSha} event=${githubSha}`);
}
execFileSync('git', ['diff', '--exit-code', 'HEAD', '--'], { stdio: 'pipe' });
const releaseTarget=JSON.parse(await readFile('contracts/production/app-release.v1.json','utf8'));
if (repository!==releaseTarget.repository || teamId!==releaseTarget.deployment.team_id || projectId!==releaseTarget.deployment.project_id || projectName!==releaseTarget.deployment.project_name) {
  throw new Error('APP_RELEASE_TARGET_MISMATCH');
}
if (mode==='production' && githubRefName!==releaseTarget.production_branch) throw new Error('PRODUCTION_MAIN_REQUIRED');

// The existing executor persists the provider operation before writing its
// caller's result file. A successful create is inspected before any retry.
const operationPath=outputPath+'.operation.json';
let previous=null;
try {previous=JSON.parse(await readFile(operationPath,'utf8'));}
catch(error) {if(error.code!=='ENOENT')throw error;}
if(previous && (previous.schema!=='VERCEL_STAGED_BUILD_OPERATION_V1' ||
  previous.githubSha!==githubSha || previous.projectId!==projectId || previous.teamId!==teamId || previous.mode!==mode)) {
  throw new Error('EXISTING_BUILD_OPERATION_IDENTITY_MISMATCH');
}
if(previous && !previous.providerResponse?.id) throw new Error('EXISTING_BUILD_OPERATION_UNRESOLVED: inspect provider before retry');
const api = async (url, init = {}) => {
 if(token)return fetch(url,{...init,headers:{Authorization:`Bearer ${token}`,...(init.headers??{})}});
 const endpoint=new URL(url);if(endpoint.origin!=='https://api.vercel.com')throw new Error('VERCEL_API_ORIGIN_REQUIRED');
 const argv=['api',endpoint.pathname+endpoint.search,'--scope',teamId,'--method',init.method??'GET','--include','--raw'];
 for(const[name,value]of Object.entries(init.headers??{}))argv.push('--header',name+':'+value);
 if(init.body!==undefined)argv.push('--input','-');
 return new Promise((accept,reject)=>{
  const child=spawn(authenticatedCli,argv,{stdio:['pipe','pipe','pipe']}),stdout=[],stderr=[];let count=0;
  child.stdout.on('data',b=>{count+=b.length;if(count>16*1024*1024){child.kill();reject(new Error('VERCEL_API_RESPONSE_LIMIT'));}else stdout.push(b);});child.stderr.on('data',b=>stderr.push(b));child.on('error',reject);
  child.on('close',code=>{const raw=Buffer.concat(stdout).toString('utf8').replaceAll('\r\n','\n'),match=raw.match(/^HTTP(?:\/\S+)?\s+(\d{3})\b/),split=raw.indexOf('\n\n');if(!match||split<0)return reject(new Error('VERCEL_CLI_API_RESPONSE_REQUIRED:exit='+code));const status=Number(match[1]),body=raw.slice(split+2);accept({ok:status>=200&&status<300,status,text:async()=>body});});
  child.stdin.on('error',reject);child.stdin.end(init.body??undefined);
 });
};

const aliasHost=new URL(releaseTarget.deployment.production_url).hostname;
const acquireAlias=async()=>{
  const response=await api(`https://api.vercel.com/v4/aliases/${aliasHost}?teamId=${encodeURIComponent(teamId)}`);
  const raw=await response.text();
  if(!response.ok)throw new Error(`ALIAS_ACQUISITION_FAILED:${response.status}`);
  const result=JSON.parse(raw);
  if(result.alias!==aliasHost || result.projectId!==projectId || !result.deploymentId)throw new Error('ALIAS_IDENTITY_REQUIRED');
  return result;
};
const aliasBefore=mode==='production'?await acquireAlias():null;
const commitMessage = execFileSync('git', ['log', '-1', '--format=%s'], { encoding: 'utf8' }).trim();
const authorName = execFileSync('git', ['log', '-1', '--format=%an'], { encoding: 'utf8' }).trim();
const authorEmail = execFileSync('git', ['log', '-1', '--format=%ae'], { encoding: 'utf8' }).trim();
const [owner] = repository.split('/');
const deploySource = process.env.VERCEL_DEPLOY_SOURCE ?? (mode === 'preview' ? 'inline' : 'files');
if (!['inline', 'files', 'gitSource'].includes(deploySource)) {
  throw new Error(`Unsupported VERCEL_DEPLOY_SOURCE: ${deploySource}`);
}
if (mode === 'production' && deploySource !== 'files') {
  throw new Error('Production deployment must use the established files source');
}
let effectiveDeploySource = previous?.deploySource??deploySource;

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' })
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
  .sort();
if (!files.length) throw new Error('No tracked files found for deployment');

const fileBuffers = previous?[]:await Promise.all(files.map(async (file) => ({ file, data: await readFile(file) })));
let privateReleasePackages=0;
if(!previous){
 let registry={packages:[]};try{registry=JSON.parse(await readFile('contracts/production/released-runtime-packages.v1.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 privateReleasePackages=registry.packages.length;
 if(registry.packages.length){
  if(deploySource!=='files')throw new Error('RELEASE_RUNTIME_FILES_SOURCE_REQUIRED');
  const root=process.env.SASH_RELEASE_RUNTIME_SOURCE_ROOT;if(!root||!path.isAbsolute(root))throw new Error('RELEASE_RUNTIME_SOURCE_REQUIRED');
  for(const pkg of registry.packages){
   if(!pkg.root.startsWith('src/catalog/runtime-release-data/')||pkg.root.split('/').includes('..'))throw new Error('RELEASE_RUNTIME_PATH');
   for(const[name,expected]of Object.entries(pkg.files)){
    if(path.isAbsolute(name)||name.split('/').includes('..')||name.includes('\\'))throw new Error('RELEASE_RUNTIME_PATH');
    const source=path.resolve(root,name);const{lstat}=await import('node:fs/promises');for(let p=source;p!==path.resolve(root);p=path.dirname(p))if((await lstat(p)).isSymbolicLink())throw new Error('RELEASE_RUNTIME_PATH');
    const data=await readFile(source);if(data.length!==expected.bytes||createHash('sha256').update(data).digest('hex')!==expected.sha256)throw new Error('RELEASE_RUNTIME_BYTES_CHANGED');
    const file=pkg.root+'/'+name;if(fileBuffers.some(x=>x.file===file))throw new Error('RELEASE_RUNTIME_DUPLICATE');fileBuffers.push({file,data});
   }
  }
 }
}
const totalBytes = previous?.totalBytes??fileBuffers.reduce((sum, row) => sum + row.data.byteLength, 0);
let deploymentFiles = [];

if (!previous && deploySource === 'inline') {
  deploymentFiles = fileBuffers.map(({ file, data }) => ({
    file,
    data: data.toString('base64'),
    encoding: 'base64',
  }));
  console.log(`VERCEL_INLINE_DEPLOYMENT files=${deploymentFiles.length} bytes=${totalBytes}`);
} else if (!previous && deploySource === 'files') {
  const uploadOne = async ({ file, data }) => {
    const sha = createHash('sha1').update(data).digest('hex');
    const response = await api(`https://api.vercel.com/v2/files?teamId=${encodeURIComponent(teamId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(data.byteLength),
        'x-Vercel-Digest': sha,
        'x-Now-Digest': sha,
        'x-Now-Size': String(data.byteLength),
      },
      body: data,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Vercel file upload failed (${response.status}) for ${file}: ${body.slice(0, 500)}`);
    }
    return { file, sha, size: data.byteLength };
  };

  deploymentFiles = new Array(fileBuffers.length);
  const concurrency = 8;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, fileBuffers.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= fileBuffers.length) return;
      deploymentFiles[index] = await uploadOne(fileBuffers[index]);
    }
  });
  try {
    await Promise.all(workers);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (mode === 'production' && privateReleasePackages===0 && message.includes('Vercel file upload failed (429)')) {
      effectiveDeploySource = 'gitSource';
      deploymentFiles = [];
      console.log('VERCEL_FILE_UPLOAD_RATE_LIMIT_FALLBACK=gitSource');
    } else {
      throw error;
    }
  }
}

const payload = {
  name: projectName,
  project: projectId,
  env: { SASH_RELEASE_COMMIT_SHA: githubSha },
  meta: {
    releaseCommitSha: githubSha,
    releaseSeries: process.env.RELEASE_SERIES ?? 'LIXIL EW',
    releasePackageVersion: process.env.RELEASE_PACKAGE_VERSION ?? 'v1.1',
    releaseMode: mode,
  },
};

const gitSourceForHead = () => {
  const numericRepositoryId = Number(repositoryId);
  if (!Number.isSafeInteger(numericRepositoryId) || numericRepositoryId <= 0) {
    throw new Error(`Invalid GitHub repository id: ${repositoryId}`);
  }
  return {
    type: 'github',
    repoId: numericRepositoryId,
    ref: githubRefName,
    sha: githubSha,
  };
};
if (effectiveDeploySource === 'gitSource') {
  payload.gitSource = gitSourceForHead();
} else {
  payload.files = deploymentFiles;
  payload.gitMetadata = {
    remoteUrl: `https://github.com/${repository}.git`,
    commitAuthorName: authorName,
    commitAuthorEmail: authorEmail,
    commitMessage,
    commitRef: githubRefName,
    commitSha: githubSha,
    dirty: false,
    ci: process.env.GITHUB_ACTIONS==='true',
    ciType: process.env.GITHUB_ACTIONS==='true'?'github-actions':'local-qa',
    ciGitProviderUsername: owner,
    ciGitRepoVisibility: 'public',
    rootDirectory: '',
  };
}
if (mode === 'production') {
  payload.target = 'production';
  payload.autoAssignCustomDomains = false;
}

// The provider limits a create body to 10 MB. Select the established exact-SHA
// Git source before any create, rather than sending an oversized inline body.
if (!previous && mode === 'preview' && effectiveDeploySource === 'inline' &&
    Buffer.byteLength(JSON.stringify(payload)) > 10_000_000) {
  effectiveDeploySource = 'gitSource';
  delete payload.files;
  delete payload.gitMetadata;
  payload.gitSource = gitSourceForHead();
  console.log('VERCEL_INLINE_BODY_LIMIT_SOURCE=gitSource');
}
const payloadBytes = Buffer.byteLength(JSON.stringify(payload));
if (!previous && payloadBytes > 10_000_000) throw new Error('DEPLOYMENT_CREATE_BODY_TOO_LARGE');

await mkdir(path.dirname(operationPath), { recursive: true });
const intent=previous??{schema:'VERCEL_STAGED_BUILD_OPERATION_V1',mode,githubSha,projectId,teamId,
  aliasBefore,totalBytes,fileCount:previous?.fileCount??fileBuffers.length,deploySource:effectiveDeploySource,autoAssignCustomDomains:mode==='production'?false:null,
  payloadBytes,state:'CREATE_INTENT_SAVED',external_create_operations:0};
if(!previous)await writeFile(operationPath,JSON.stringify(intent,null,2)+'\n');
let created=previous?.providerResponse;
if(!created) {
  const forceNew=mode==='production'?'forceNew=1&':'';
  const createResponse=await api(`https://api.vercel.com/v13/deployments?${forceNew}skipAutoDetectionConfirmation=1&teamId=${encodeURIComponent(teamId)}`, {
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const createdText=await createResponse.text();
  try {created=JSON.parse(createdText);} catch {throw new Error('DEPLOYMENT_CREATE_RESPONSE_INVALID');}
  await writeFile(operationPath,JSON.stringify({...intent,state:createResponse.ok?'PROVIDER_RETURNED':'PROVIDER_FAILED',
    providerHttpStatus:createResponse.status,providerResponse:created,external_create_operations:1},null,2)+'\n');
  if(!createResponse.ok)throw new Error(`Vercel deployment creation failed (${createResponse.status})`);
}

const deploymentId = created.id;
if (!deploymentId) throw new Error(`Deployment response missing id: ${JSON.stringify({id:created.id,readyState:created.readyState})}`);

let deployment = created;
const terminalFailure = new Set(['ERROR', 'CANCELED']);
for (let attempt = 0; attempt < 120; attempt += 1) {
  const state = deployment.readyState ?? deployment.status ?? deployment.state;
  if (state === 'READY') break;
  if (terminalFailure.has(state)) {
    throw new Error(`Vercel deployment failed: ${JSON.stringify({ id: deploymentId, state, errorCode: deployment.errorCode, errorMessage: deployment.errorMessage })}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const response = await api(`https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${encodeURIComponent(teamId)}`);
  const text = await response.text();
  if (!response.ok) throw new Error(`Vercel deployment poll failed (${response.status}): ${text.slice(0, 1000)}`);
  deployment = JSON.parse(text);
}

const finalState = deployment.readyState ?? deployment.status ?? deployment.state;
if (finalState !== 'READY') {
  throw new Error(`Vercel deployment did not become READY: ${JSON.stringify({ id: deploymentId, state: finalState })}`);
}

const deploymentGitSha = deployment.meta?.githubCommitSha ?? created.meta?.githubCommitSha ?? null;
const releaseCommitSha = deployment.meta?.releaseCommitSha ?? created.meta?.releaseCommitSha ?? null;
if (effectiveDeploySource === 'gitSource' && deploymentGitSha !== githubSha) {
  throw new Error(`Vercel Git source SHA mismatch: deployment=${deploymentGitSha ?? 'missing'} expected=${githubSha}`);
}
if (effectiveDeploySource !== 'gitSource' && releaseCommitSha !== githubSha) {
  throw new Error(`Vercel release SHA mismatch: deployment=${releaseCommitSha ?? 'missing'} expected=${githubSha}`);
}

const deploymentUrl = deployment.url ? `https://${deployment.url}` : created.url ? `https://${created.url}` : null;
if (!deploymentUrl) throw new Error('READY deployment has no URL');

const aliasAfter=mode==='production'?await acquireAlias():null;
const savedOperation=JSON.parse(await readFile(operationPath,'utf8'));
await writeFile(operationPath,JSON.stringify({...savedOperation,state:'DEPLOYMENT_ACQUIRED',
  acquiredDeployment:deployment,aliasAfter},null,2)+'\n');
if(mode==='production' && aliasAfter.deploymentId!==aliasBefore.deploymentId)throw new Error('ALIAS_DRIFT: staged build unexpectedly changed production alias');
const result = {
  releaseState:mode==='production'?'STAGED_NOT_RELEASED':'PREVIEW_READY',
  publication:'NOT_EXECUTED',
  autoAssignCustomDomains:mode==='production'?false:null,
  aliasBefore,aliasAfter,
  externalCreateOperations:previous?0:1,
  resumedExistingOperation:Boolean(previous),
  mode,
  deploymentId,
  deploymentUrl,
  readyState: finalState,
  githubSha,
  githubRefName,
  deploymentGitSha,
  releaseCommitSha,
  deploySource: effectiveDeploySource,
  projectId,
  teamId,
  fileCount: previous?.fileCount??fileBuffers.length,
  totalBytes,
  createdAt: deployment.createdAt ?? created.createdAt ?? null,
  readyAt: deployment.ready ?? deployment.readyAt ?? null,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
if (process.env.GITHUB_ENV) {
  const { appendFile } = await import('node:fs/promises');
  await appendFile(process.env.GITHUB_ENV, `DEPLOY_ID=${deploymentId}\nDEPLOY_URL=${deploymentUrl}\n`, 'utf8');
}
