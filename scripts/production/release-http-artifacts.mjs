import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {protectedQaFetch} from './protected-qa-access.mjs';

// Check the adopted publication contract before expensive browser QA or review.
// Keep complete HTTP bodies so the existing Shared validator can inspect them.
export async function captureReleaseHttp(profile,{url,gitSha,outputDir,fetcher=protectedQaFetch}){
 const origin=new URL(url).origin,policy=profile.publication_policy;
 assert.ok(policy?.http_artifacts&&Object.keys(policy.http_artifacts).length,'HTTP_ARTIFACT_CONTRACT_REQUIRED');
 const routes=new Set([...Object.keys(policy.http_artifacts),policy.build_identity.path]);
 const rows=[];await mkdir(outputDir,{recursive:true});
 for(const route of routes){
  assert.ok(route.startsWith('/')&&!route.startsWith('//'),'HTTP_ROUTE_SCOPE');
  const response=await fetcher(new URL(route,origin),{origin});
  assert.equal(response.status,200,`HTTP_ARTIFACT_STATUS:${route}`);
  assert.equal(response.redirected,false,`HTTP_ARTIFACT_REDIRECT:${route}`);
  const bytes=Buffer.from(await response.arrayBuffer()),hash=createHash('sha256').update(bytes).digest('hex');
  if(policy.http_artifacts[route])assert.equal(hash,policy.http_artifacts[route],`PUBLICATION_ARTIFACT_PIN_DRIFT:${route}`);
  if(route===policy.build_identity.path){
   const identity=JSON.parse(bytes);let revision=identity;
   for(const key of policy.build_identity.sha_pointer)revision=revision[key];
   assert.equal(revision,gitSha,'PUBLICATION_BUILD_IDENTITY_DRIFT');
  }
  const path=resolve(outputDir,createHash('sha256').update(route).digest('hex')+'.body');await writeFile(path,bytes);
  rows.push({origin,path:route,git_sha:gitSha,status:response.status,redirected:false,body_sha256:hash,
   body:{path,sha256:hash,location:origin+route,observed_at:new Date().toISOString()}});
 }
 return {status:'PASS',origin,git_sha:gitSha,artifacts:rows};
}
