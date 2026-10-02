// Deployment-scoped temporary access for CI Browser QA. Never changes project
// protection or production access. Vercel REST aliases protection-bypass API.
import assert from 'node:assert/strict';
import {readFile,appendFile} from 'node:fs/promises';
const deployment=JSON.parse(await readFile(process.argv[2],'utf8'));
assert.equal(deployment.mode,'preview');assert.equal(deployment.readyState,'READY');
assert.equal(deployment.githubSha,process.env.GITHUB_SHA);
assert.equal(deployment.deploymentGitSha,process.env.GITHUB_SHA);
assert.ok(process.env.GITHUB_ENV&&process.env.VERCEL_TOKEN_EFFECTIVE);
const response=await fetch(`https://api.vercel.com/aliases/${encodeURIComponent(deployment.deploymentId)}/protection-bypass?teamId=${encodeURIComponent(deployment.teamId)}`,{
 method:'PATCH',headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN_EFFECTIVE}`,'Content-Type':'application/json'},body:JSON.stringify({ttl:3600}),
});
if(!response.ok)throw new Error(`Temporary Preview access failed: HTTP ${response.status}`);
const {value}=await response.json();assert.ok(typeof value==='string'&&value.length>0);
assert.equal(/[\r\n]/.test(value),false);
console.log(`::add-mask::${value}`);
await appendFile(process.env.GITHUB_ENV,`VERCEL_SHARE_TOKEN=${value}\n`);
console.log('PREVIEW_ACCESS=TEMPORARY_DEPLOYMENT_SCOPED_3600_SECONDS');
