import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {captureReleaseHttp} from '../scripts/production/release-http-artifacts.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const revision='a'.repeat(40),body='adopted UI',health=JSON.stringify({releaseCommitSha:revision});
const profile={publication_policy:{http_artifacts:{'/app.js':sha(body)},build_identity:{path:'/api/health',sha_pointer:['releaseCommitSha']}}};
const response=(body,status=200,redirected=false)=>({status,redirected,arrayBuffer:async()=>Buffer.from(body)});
async function scratch(t){const p=await mkdtemp(join(tmpdir(),'release-http-'));t.after(()=>rm(p,{recursive:true,force:true}));return p;}
test('publication pins and complete HTTP bytes are checked before browser QA',async t=>{
 const outputDir=await scratch(t),report=await captureReleaseHttp(profile,{url:'https://candidate.example',gitSha:revision,outputDir,fetcher:async u=>response(u.pathname==='/api/health'?health:body)});
 assert.equal(report.status,'PASS');assert.equal(report.artifacts.length,2);
 assert.equal((await readFile(report.artifacts[0].body.path)).toString(),body);
});
test('a stale publication pin is rejected even when application health is valid',async t=>{
 let calls=0;await assert.rejects(captureReleaseHttp(profile,{url:'https://candidate.example',gitSha:revision,outputDir:await scratch(t),fetcher:async()=>{calls++;return response('changed UI');}}),/PUBLICATION_ARTIFACT_PIN_DRIFT/);assert.equal(calls,1);
});
test('redirects and a different build revision cannot satisfy publication proof',async t=>{
 const outputDir=await scratch(t);await assert.rejects(captureReleaseHttp(profile,{url:'https://candidate.example',gitSha:revision,outputDir,fetcher:async()=>response(body,200,true)}),/HTTP_ARTIFACT_REDIRECT/);
 await assert.rejects(captureReleaseHttp(profile,{url:'https://candidate.example',gitSha:'b'.repeat(40),outputDir,fetcher:async u=>response(u.pathname==='/api/health'?health:body)}),/PUBLICATION_BUILD_IDENTITY_DRIFT/);
});
