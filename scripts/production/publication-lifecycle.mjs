/** Native composition entry; acquired Shared v2 owns every release state. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export function acquireLifecycle(central){
 const shared=resolve(central);
 const profile=JSON.parse(readFileSync(resolve(ROOT,'contracts/production/release-profile.v1.json')));
 assert.equal(profile.lifecycle?.mode,'EXISTING_V2_RELEASE_LIFECYCLE_V1');
 assert.equal(profile.lifecycle.entry,'scripts/production/publication-lifecycle.mjs');
 assert.equal(profile.lifecycle.shared_entry,'scripts/release-provider-host.mjs');
 assert.equal(profile.lifecycle.configuration,'contracts/production/publication-lifecycle.v1.json');
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:shared,encoding:'utf8'}).trim(),profile.shared_contract.ref,'SHARED_IMPLEMENTATION_SHA_MISMATCH');
 for(const [base,files]of [[ROOT,profile.native_files],[shared,profile.shared_contract.files]])for(const [name,expected]of Object.entries(files)){
  assert.equal(createHash('sha256').update(readFileSync(resolve(base,name))).digest('hex'),expected,`LIFECYCLE_IMPLEMENTATION_DRIFT:${name}`);
 }
 return {native:ROOT,shared,profile,config:JSON.parse(readFileSync(resolve(ROOT,profile.lifecycle.configuration)))};
}

export async function runPublicationLifecycle(arguments_,adapters){
 const acquired=acquireLifecycle(arguments_.central);
 const {completePublication}=await import(pathToFileURL(resolve(acquired.shared,acquired.profile.lifecycle.shared_entry)).href);
 return completePublication({...arguments_,native:acquired.native},adapters);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length===3&&args[0]==='--check'&&args[1]==='--central'){
  const acquired=acquireLifecycle(args[2]);
  console.log(JSON.stringify({status:'PASS',scope:'NATIVE_LIFECYCLE_IMPLEMENTATION_ACQUIRED',shared_ref:acquired.profile.shared_contract.ref,external_operations:0,release_state:'NOT_RELEASED'}));
 }else{
  assert.ok(args.length===2&&args[0]==='--options','Use --options FIXED_RUNTIME_OPTIONS.json or --check --central SHARED');
  const options=JSON.parse(readFileSync(resolve(args[1])));
  const acquired=acquireLifecycle(options.central);
  const {createCliAdapters}=await import(pathToFileURL(resolve(acquired.shared,'scripts/release-lifecycle-cli.mjs')).href);
  const adapters=await createCliAdapters({...options,native:ROOT});
  const result=await runPublicationLifecycle(options,adapters);
  console.log(JSON.stringify(result));
  process.exitCode=result.status==='PASS'&&result.release_state==='RELEASE_COMPLETED'?0:2;
 }
}
