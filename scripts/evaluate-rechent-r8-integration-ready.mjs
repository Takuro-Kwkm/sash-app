import assert from 'node:assert/strict';
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const root=process.argv[2]??'artifacts/gate-input';
async function files(dir){const out=[];for(const row of await readdir(dir,{withFileTypes:true})){const path=join(dir,row.name);if(row.isDirectory())out.push(...await files(path));else out.push(path);}return out;}
const paths=await files(root);
async function one(suffix){const matches=paths.filter(path=>path.endsWith(suffix));assert.equal(matches.length,1,`missing/ambiguous ${suffix}`);return JSON.parse(await readFile(matches[0],'utf8'));}
const adoption=await one('rechent-r8-adoption/report.json');
const browser=await one('rechent-estimate-integration/report.json');
const flow=await one('rechent-entry-door-cover-global-flow-browser-qa/report.json');
const deployment=await one('rechent-preview/deployment.json');
const head=process.env.GITHUB_SHA;
assert.ok(head);for(const result of [adoption,browser,flow])assert.equal(result.status,'PASS');
for(const result of [adoption,browser,flow])assert.equal(result.exactHead,head);
assert.equal(deployment.githubSha,head);assert.equal(deployment.deploymentGitSha,head);
assert.equal(deployment.readyState,'READY');assert.equal(deployment.mode,'preview');
assert.equal(adoption.formalVersion,'v0.8-R8');assert.equal(browser.formalVersion,'v0.8-R8');
assert.equal(browser.runtimeIdentity.sourceHash,adoption.manifestSha256);
assert.equal(browser.serverRuntimeIntegrity.actual,adoption.manifestSha256);
assert.equal(browser.serverRuntimeIntegrity.files.length,8);assert.ok(browser.serverRuntimeIntegrity.files.every(row=>row.match&&row.actual===row.expected));
assert.equal(browser.baseUrl,deployment.deploymentUrl);assert.equal(flow.baseUrl,deployment.deploymentUrl);
assert.equal(browser.evidenceIdentity,adoption.evidenceIdentity);
assert.equal(browser.cases.length,81);
assert.deepEqual([...new Set(browser.cases.map(row=>row.device))].sort(),['desktop','mobile','tablet']);
assert.ok(browser.cases.every(row=>['selection','saveReload','handoff','dark','upstreamReset'].every(key=>row[key]==='PASS')));
assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.failedResponses,[]);
const report={APP_INTEGRATION_READY:'PASS',exactHead:head,formalVersion:adoption.formalVersion,evidenceIdentity:adoption.evidenceIdentity,deployment,technicalCI:'PASS',deployedBrowser:'PASS',humanFlowReview:'NOT_EXECUTED',productionDeploy:'NOT_EXECUTED',productMasterMutation:0};
await mkdir('artifacts/rechent-integration-ready',{recursive:true});await writeFile('artifacts/rechent-integration-ready/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
