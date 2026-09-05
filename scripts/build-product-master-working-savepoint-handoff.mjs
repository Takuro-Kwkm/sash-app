#!/usr/bin/env node
import path from'node:path';
import{loadAuthoringStagingPackage}from'../src/product-master-core/authoring-staging-provenance-store.mjs';
import{loadRuntimeCandidatePackage}from'../src/product-master-core/runtime-generation-provenance-store.mjs';
import{buildWorkingSavepointHandoff}from'../src/product-master-core/working-savepoint-handoff.mjs';
import{persistWorkingSavepointHandoff}from'../src/product-master-core/working-savepoint-handoff-store.mjs';

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const token=argv[i];
    if(!token.startsWith('--'))continue;
    const body=token.slice(2);
    const eq=body.indexOf('=');
    if(eq>=0){out[body.slice(0,eq)]=body.slice(eq+1);continue;}
    const next=argv[i+1];
    if(next!==undefined&&!next.startsWith('--')){out[body]=next;i+=1;}else out[body]='true';
  }
  return out;
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  const proposalId=args['proposal-id'];
  if(!proposalId)throw new Error('--proposal-id is required');
  const rootDir=path.resolve(args.root??args['change-control-root']??'data/master-change-control');
  const authoring=loadAuthoringStagingPackage(proposalId,{rootDir});
  if(!authoring.pass){
    console.error(JSON.stringify({pass:false,status:'AUTHORING_STAGING_GATE_BLOCKED',proposalId,errors:authoring.errors},null,2));
    process.exitCode=2;
    return;
  }
  const runtime=loadRuntimeCandidatePackage(proposalId,{rootDir});
  if(!runtime.pass){
    console.error(JSON.stringify({pass:false,status:'RUNTIME_CANDIDATE_GATE_BLOCKED',proposalId,errors:runtime.errors},null,2));
    process.exitCode=2;
    return;
  }
  const built=buildWorkingSavepointHandoff({
    authoringMaster:authoring.appliedMaster,authoringStagingProvenance:authoring.record,
    runtimeManifest:runtime.manifest,runtimeFiles:runtime.files,runtimeGenerationProvenance:runtime.record,
    context:{manufacturer:args.manufacturer??null,series:args.series??null}
  });
  if(!built.pass){
    console.error(JSON.stringify({pass:false,status:'SAVEPOINT_HANDOFF_BLOCKED',proposalId,errors:built.errors},null,2));
    process.exitCode=2;
    return;
  }
  const persisted=persistWorkingSavepointHandoff(built.record,{
    authoringMaster:authoring.appliedMaster,authoringStagingProvenance:authoring.record,
    runtimeManifest:runtime.manifest,runtimeFiles:runtime.files,runtimeGenerationProvenance:runtime.record
  },{rootDir});
  if(!persisted.pass){
    console.error(JSON.stringify({pass:false,status:persisted.status,proposalId,errors:persisted.errors},null,2));
    process.exitCode=2;
    return;
  }
  console.log(JSON.stringify({
    pass:true,status:'WORKING_SAVEPOINT_HANDOFF_PERSISTED',proposalId,productId:built.record.productId,
    manufacturer:built.record.manufacturer,series:built.record.series,packageFingerprint:built.record.packageFingerprint,
    filePath:persisted.filePath,requiredNextAction:built.record.requiredNextAction,
    WORKING_SAVEPOINT_GATE:built.record.authority.workingSavepointGate,
    NEXT_PHASE_GATE:built.record.authority.nextPhaseGate,
    driveWritePerformed:false,formalPass:false,appIntegrationReady:false
  },null,2));
}

try{main();}catch(cause){
  console.error(JSON.stringify({pass:false,status:'CLI_FAILED',error:cause?.message??String(cause)},null,2));
  process.exitCode=2;
}
