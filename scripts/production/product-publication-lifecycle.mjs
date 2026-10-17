/** Profile-selected native entry. Shared v2 owns publication, gates and storage. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function acquiredPath(name){
 const path=resolve(ROOT,name),rel=relative(ROOT,path);
 assert.ok(!isAbsolute(rel)&&!rel.startsWith('..'),'NATIVE_PROFILE_PATH_INVALID');
 return path;
}
export function acquireProductLifecycle(central,profileName){
 const shared=resolve(central);
 const profilePath=acquiredPath(profileName);
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
 assert.deepEqual(readFileSync(profilePath),execFileSync('git',['show',`${head}:${profileName}`],{cwd:ROOT}),'NATIVE_PROFILE_NOT_COMMITTED');
 const profile=JSON.parse(readFileSync(profilePath));
 assert.equal(profile.lifecycle?.mode,'EXISTING_V2_RELEASE_LIFECYCLE_V1');
 assert.equal(profile.lifecycle.entry,'scripts/production/product-publication-lifecycle.mjs');
 assert.equal(profile.lifecycle.shared_entry,'scripts/release-provider-host.mjs');
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:shared,encoding:'utf8'}).trim(),profile.shared_contract.ref,'SHARED_IMPLEMENTATION_SHA_MISMATCH');
 for(const [base,files]of [[ROOT,profile.native_files],[shared,profile.shared_contract.files]])for(const [name,expected]of Object.entries(files)){
  assert.equal(sha(readFileSync(resolve(base,name))),expected,`LIFECYCLE_IMPLEMENTATION_DRIFT:${name}`);
 }
 return {native:ROOT,shared,profile,config:JSON.parse(readFileSync(acquiredPath(profile.lifecycle.configuration)))};
}
export async function runProductPublicationLifecycle(options,adapters){
 const acquired=acquireProductLifecycle(options.central,options.profile);
 const {completePublication}=await import(pathToFileURL(resolve(acquired.shared,acquired.profile.lifecycle.shared_entry)).href);
 return completePublication({...options,native:acquired.native},adapters);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 assert.ok(args.length===2&&args[0]==='--options','Use --options FIXED_RUNTIME_OPTIONS.json');
 const options=JSON.parse(readFileSync(resolve(args[1])));
 const acquired=acquireProductLifecycle(options.central,options.profile);
 const {createCliAdapters}=await import(pathToFileURL(resolve(acquired.shared,'scripts/release-lifecycle-cli.mjs')).href);
 const adapters=await createCliAdapters({...options,native:ROOT});
 const result=await runProductPublicationLifecycle(options,adapters);
 console.log(JSON.stringify(result));
 process.exitCode=result.status==='PASS'&&result.release_state==='RELEASE_COMPLETED'?0:2;
}
