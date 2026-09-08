import fs from'node:fs';
import path from'node:path';
import{validateRuntimeGenerationProvenance}from'./runtime-generation-provenance.mjs';

const error=(code,message,details={})=>({code,message,...details});
function writeAtomic(filePath,content){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}
function pathsFor(rootDir,proposalId){
  const root=path.resolve(rootDir);
  const runtimeDir=path.join(root,'runtime-candidates',proposalId);
  return{
    runtimeDir,
    manifestPath:path.join(runtimeDir,'runtime_manifest.json'),
    provenancePath:path.join(root,'runtime-provenance',`${proposalId}.runtime-generation.json`)
  };
}
function expectedRuntimeNames(manifest){return new Set(['runtime_manifest.json',...(manifest?.runtimeFiles??[]).map((row)=>row.name)]);}

export function persistRuntimeCandidatePackage({
  record,manifest,files,authoringMaster,authoringStagingProvenance,generator,validation={pass:true}
}={}, {rootDir=path.resolve('data/master-change-control')}={}){
  const runtimeFiles=(files??[]).map((row)=>({role:row.role,name:row.name,content:row.content}));
  const checked=validateRuntimeGenerationProvenance(record,{authoringMaster,authoringStagingProvenance,manifest,runtimeFiles,generator,validation});
  if(!checked.pass)return{pass:false,status:'RUNTIME_CANDIDATE_PERSIST_BLOCKED',errors:checked.errors};
  const paths=pathsFor(rootDir,record.proposalId);
  const collisions=[];
  if(fs.existsSync(paths.runtimeDir))collisions.push(paths.runtimeDir);
  if(fs.existsSync(paths.provenancePath))collisions.push(paths.provenancePath);
  if(collisions.length)return{pass:false,status:'RUNTIME_CANDIDATE_PERSIST_BLOCKED',...paths,errors:[error('RUNTIME_CANDIDATE_PACKAGE_ALREADY_EXISTS',`Runtime candidate package already exists for ${record.proposalId}`,{proposalId:record.proposalId,collisions})]};

  const created=[];
  try{
    fs.mkdirSync(paths.runtimeDir,{recursive:true});
    created.push(paths.runtimeDir);
    for(const file of files){
      const filePath=path.join(paths.runtimeDir,file.name);
      writeAtomic(filePath,`${JSON.stringify(file.content,null,2)}\n`);
      created.push(filePath);
    }
    writeAtomic(paths.manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
    created.push(paths.manifestPath);
    writeAtomic(paths.provenancePath,`${JSON.stringify(record,null,2)}\n`);
    created.push(paths.provenancePath);
    return{pass:true,status:'RUNTIME_CANDIDATE_PACKAGE_PERSISTED',...paths,runtimeFilePaths:files.map((row)=>path.join(paths.runtimeDir,row.name)),errors:[]};
  }catch(cause){
    for(const item of created.reverse()){
      try{if(fs.existsSync(item))fs.rmSync(item,{recursive:true,force:true});}catch{}
    }
    return{pass:false,status:'RUNTIME_CANDIDATE_PERSIST_FAILED',...paths,errors:[error('RUNTIME_CANDIDATE_PERSIST_IO_FAILED',cause.message)]};
  }
}

export function loadRuntimeCandidatePackage(proposalId,{rootDir=path.resolve('data/master-change-control')}={}){
  const paths=pathsFor(rootDir,proposalId);
  if(!fs.existsSync(paths.runtimeDir)||!fs.existsSync(paths.manifestPath)||!fs.existsSync(paths.provenancePath))return{
    pass:false,status:'RUNTIME_CANDIDATE_PACKAGE_NOT_FOUND',record:null,manifest:null,files:[],...paths,
    errors:[error('RUNTIME_CANDIDATE_PACKAGE_NOT_FOUND',`Runtime candidate package is incomplete or missing for ${proposalId}`,{proposalId,runtimeDirExists:fs.existsSync(paths.runtimeDir),manifestExists:fs.existsSync(paths.manifestPath),provenanceExists:fs.existsSync(paths.provenancePath)})]
  };
  try{
    const manifest=JSON.parse(fs.readFileSync(paths.manifestPath,'utf8'));
    const record=JSON.parse(fs.readFileSync(paths.provenancePath,'utf8'));
    const files=[];
    const missing=[];
    for(const descriptor of manifest.runtimeFiles??[]){
      const filePath=path.join(paths.runtimeDir,descriptor.name);
      if(!fs.existsSync(filePath)){missing.push(descriptor.name);continue;}
      files.push({role:descriptor.role,name:descriptor.name,content:JSON.parse(fs.readFileSync(filePath,'utf8'))});
    }
    if(missing.length)return{pass:false,status:'RUNTIME_CANDIDATE_PACKAGE_INVALID',record:null,manifest:null,files:[],...paths,errors:[error('RUNTIME_CANDIDATE_RUNTIME_FILE_MISSING','Runtime candidate package is missing declared files',{missing})]};
    const actualNames=new Set(fs.readdirSync(paths.runtimeDir).filter((name)=>fs.statSync(path.join(paths.runtimeDir,name)).isFile()));
    const expectedNames=expectedRuntimeNames(manifest);
    const unexpected=[...actualNames].filter((name)=>!expectedNames.has(name));
    const undeclared=[...expectedNames].filter((name)=>!actualNames.has(name));
    if(unexpected.length||undeclared.length)return{pass:false,status:'RUNTIME_CANDIDATE_PACKAGE_INVALID',record:null,manifest:null,files:[],...paths,errors:[error('RUNTIME_CANDIDATE_FILE_SET_MISMATCH','Stored Runtime candidate file set does not match manifest',{unexpected,undeclared})]};
    const checked=validateRuntimeGenerationProvenance(record,{manifest,runtimeFiles:files,generator:manifest.generator});
    if(!checked.pass)return{pass:false,status:'RUNTIME_CANDIDATE_PACKAGE_INVALID',record:null,manifest:null,files:[],...paths,errors:checked.errors};
    return{pass:true,status:'RUNTIME_CANDIDATE_PACKAGE_LOADED',record,manifest,files,...paths,errors:[]};
  }catch(cause){
    return{pass:false,status:'RUNTIME_CANDIDATE_PACKAGE_INVALID',record:null,manifest:null,files:[],...paths,errors:[error('RUNTIME_CANDIDATE_PACKAGE_JSON_INVALID',cause.message)]};
  }
}
