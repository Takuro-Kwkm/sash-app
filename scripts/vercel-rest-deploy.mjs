import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const mode = process.argv[2] ?? 'preview';
const outputPath = process.argv[3] ?? 'artifacts/vercel-deployment.json';
if (!['preview', 'production'].includes(mode)) {
  throw new Error(`Unsupported deployment mode: ${mode}`);
}

const token = process.env.VERCEL_TOKEN_EFFECTIVE;
const teamId = process.env.VERCEL_ORG_ID;
const projectId = process.env.VERCEL_PROJECT_ID;
const projectName = process.env.VERCEL_PROJECT_NAME ?? 'sash-app-wave3-preview';
const githubSha = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const githubRefName = process.env.GITHUB_REF_NAME ?? execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
const repository = process.env.GITHUB_REPOSITORY ?? 'Takuro-Kwkm/sash-app';

for (const [name, value] of Object.entries({ token, teamId, projectId, projectName, githubSha })) {
  if (!value) throw new Error(`Missing required value: ${name}`);
}

const actualSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (actualSha !== githubSha) {
  throw new Error(`Git SHA mismatch: checkout=${actualSha} event=${githubSha}`);
}

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' })
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
  .sort();

if (!files.length) throw new Error('No tracked files found for deployment');

const api = async (url, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  return response;
};

const uploadOne = async (file) => {
  const data = await readFile(file);
  const sha = createHash('sha1').update(data).digest('hex');
  const url = `https://api.vercel.com/v2/files?teamId=${encodeURIComponent(teamId)}`;
  const response = await api(url, {
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

const uploaded = [];
const concurrency = 8;
let cursor = 0;
const workers = Array.from({ length: Math.min(concurrency, files.length) }, async () => {
  while (true) {
    const index = cursor++;
    if (index >= files.length) return;
    uploaded[index] = await uploadOne(files[index]);
  }
});
await Promise.all(workers);

const commitMessage = execFileSync('git', ['log', '-1', '--format=%s'], { encoding: 'utf8' }).trim();
const authorName = execFileSync('git', ['log', '-1', '--format=%an'], { encoding: 'utf8' }).trim();
const authorEmail = execFileSync('git', ['log', '-1', '--format=%ae'], { encoding: 'utf8' }).trim();
const [owner] = repository.split('/');

const payload = {
  name: projectName,
  project: projectId,
  files: uploaded,
  gitMetadata: {
    remoteUrl: `https://github.com/${repository}.git`,
    commitAuthorName: authorName,
    commitAuthorEmail: authorEmail,
    commitMessage,
    commitRef: githubRefName,
    commitSha: githubSha,
    dirty: false,
    ci: true,
    ciType: 'github-actions',
    ciGitProviderUsername: owner,
    ciGitRepoVisibility: 'public',
    rootDirectory: '',
  },
  meta: {
    releaseCommitSha: githubSha,
    releaseSeries: 'LIXIL EW',
    releasePackageVersion: 'v1.1',
    releaseMode: mode,
  },
};
if (mode === 'production') payload.target = 'production';

const createUrl = `https://api.vercel.com/v13/deployments?forceNew=1&skipAutoDetectionConfirmation=1&teamId=${encodeURIComponent(teamId)}`;
const createResponse = await api(createUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const createdText = await createResponse.text();
let created;
try { created = JSON.parse(createdText); } catch { created = { raw: createdText }; }
if (!createResponse.ok) {
  throw new Error(`Vercel deployment creation failed (${createResponse.status}): ${createdText.slice(0, 1000)}`);
}

const deploymentId = created.id;
if (!deploymentId) throw new Error(`Deployment response missing id: ${createdText.slice(0, 1000)}`);

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

const deploymentUrl = deployment.url ? `https://${deployment.url}` : created.url ? `https://${created.url}` : null;
if (!deploymentUrl) throw new Error('READY deployment has no URL');

const result = {
  mode,
  deploymentId,
  deploymentUrl,
  readyState: finalState,
  githubSha,
  githubRefName,
  projectId,
  teamId,
  fileCount: uploaded.length,
  totalBytes: uploaded.reduce((sum, file) => sum + file.size, 0),
  createdAt: deployment.createdAt ?? created.createdAt ?? null,
  readyAt: deployment.ready ?? deployment.readyAt ?? null,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
if (process.env.GITHUB_ENV) {
  const line = `DEPLOY_ID=${deploymentId}\nDEPLOY_URL=${deploymentUrl}\n`;
  const { appendFile } = await import('node:fs/promises');
  await appendFile(process.env.GITHUB_ENV, line, 'utf8');
}
