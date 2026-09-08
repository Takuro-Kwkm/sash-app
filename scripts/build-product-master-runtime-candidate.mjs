#!/usr/bin/env node
import fs from'node:fs';
import path from'node:path';
import{loadAuthoringStagingPackage}from'../src/product-master-core/authoring-staging-provenance-store.mjs';
import{buildRuntimeGenerationProvenance}from'../src/product-master-core/runtime-generation-provenance.mjs';
import{persistRuntimeCandidatePackage}from'../src/product-master-core/runtime-generation-provenance-store.mjs';

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
function readJson(file,label){
  if(!file)throw new Error(`${label} path is required`);
  const absolute=path.resolve(file);
  if(!fs.existsSync(absolute))throw new Error(`${label} not found: ${file}`);
  return{absolute,value:JSON.parse(fs.readFileSync(absolute,'utf8'))};
}
function resolveRuntimeFiles(spec,specPath){
  if(!Array.isArray(spec.runtimeFiles))return spec.runtimeFiles;
  const base=path.dirname(specPath);
  return spec.runtimeFiles.map((row)=>{
    if(Object.prototype.hasOwnProperty.call(row,'content'))return{role:row.role,name:row.name,content:row.content};
    if(!row.sourcePath)return{role:row.role,name:row.name,content:undefined};
    const source=path.resolve(base,row.sourcePath);
    if(!fs.existsSync(source))throw new Error(`Runtime source file not found: ${row.sourcePath}`);
    return{role:row.role,name:row.name,content:JSON.parse(fs.readFileSync(source,'utf8'))};
  });
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  const proposalId=args['proposal-id'];
  if(!proposalId)throw new Error('--proposal-id is required');
  const changeControlRoot=path.resolve(args['change-control-root']??'data/master-change-control');
  const runtimeRoot=path.resolve(args['runtime-root']??changeControlRoot);
  const specRead=readJson(args.spec,'Runtime candidate spec');
  const spec=specRead.value;
  const authoring=loadAuthoringStagingPackage(proposalId,{rootDir:changeControlRoot});
  if(!authoring.pass){
    console.error(JSON.stringify({pass:false,status:'AUTHORING_STAGING_GATE_BLOCKED',proposalId,errors:authoring.errors},null,2));
    process.exitCode=2;
    return;
  }
  const runtimeFiles=resolveRuntimeFiles(spec,specRead.absolute);
  const built=buildRuntimeGenerationProvenance({
    authoringMaster:authoring.appliedMaster,
    authoringStagingProvenance:authoring.record,
    runtimeFiles,
    generator:spec.generator,
    validation:spec.validation??{pass:true},
    generatedAt:spec.generatedAt??new Date().toISOString()
  });
  if(!built.pass){
    console.error(JSON.stringify({pass:false,status:'RUNTIME_GENERATION_BLOCKED',proposalId,errors:built.errors},null,2));
    process.exitCode=2;
    return;
  }
  const persisted=persistRuntimeCandidatePackage({
    record:built.record,manifest:built.manifest,files:built.files,
    authoringMaster:authoring.appliedMaster,authoringStagingProvenance:authoring.record,
    generator:spec.generator,validation:spec.validation??{pass:true}
  },{rootDir:runtimeRoot});
  if(!persisted.pass){
    console.error(JSON.stringify({pass:false,status:persisted.status,proposalId,errors:persisted.errors},null,2));
    process.exitCode=2;
    return;
  }
  console.log(JSON.stringify({
    pass:true,status:'RUNTIME_STAGING_CANDIDATE_PERSISTED',proposalId,productId:built.record.productId,
    runtimeManifestPath:persisted.manifestPath,runtimeProvenancePath:persisted.provenancePath,
    runtimeFiles:built.record.runtimeFiles,
    authority:built.record.authority,
    canonicalRuntimeWritePerformed:false,productionMasterWritePerformed:false,registryWritePerformed:false,
    formalPass:false,appIntegrationReady:false
  },null,2));
}

try{main();}catch(cause){
  console.error(JSON.stringify({pass:false,status:'CLI_FAILED',error:cause?.message??String(cause)},null,2));
  process.exitCode=2;
}
