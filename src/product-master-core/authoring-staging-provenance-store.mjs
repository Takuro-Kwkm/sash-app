import fs from'node:fs';
import path from'node:path';
import{productMasterFingerprint}from'./master-change-control.mjs';
import{validateAuthoringStagingProvenance}from'./authoring-staging-provenance.mjs';

const error=(code,message,details={})=>({code,message,...details});
function writeAtomic(filePath,content){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}
function pathsFor(rootDir,proposalId){
  const root=path.resolve(rootDir);
  return{
    masterPath:path.join(root,'staging',`${proposalId}.authoring-master.json`),
    provenancePath:path.join(root,'staging-provenance',`${proposalId}.authoring-staging.json`)
  };
}

export function persistAuthoringStagingPackage({
  record,appliedProposal,baseMaster,appliedMaster,humanApprovalProvenance,humanApprovalReviewGateBinding,humanApprovalGate
}={}, {rootDir=path.resolve('data/master-change-control')}={}){
  const validation=validateAuthoringStagingProvenance(record,{appliedProposal,baseMaster,appliedMaster,humanApprovalProvenance,humanApprovalReviewGateBinding,humanApprovalGate});
  if(!validation.pass)return{pass:false,status:'AUTHORING_STAGING_PERSIST_BLOCKED',masterPath:null,provenancePath:null,errors:validation.errors};
  if(record.resultMasterFingerprint!==productMasterFingerprint(appliedMaster))return{pass:false,status:'AUTHORING_STAGING_PERSIST_BLOCKED',masterPath:null,provenancePath:null,errors:[error('AUTHORING_STAGING_PERSIST_RESULT_MISMATCH','Authoring STAGING provenance result fingerprint does not match applied Master')]};
  const paths=pathsFor(rootDir,record.proposalId);
  if(fs.existsSync(paths.masterPath)||fs.existsSync(paths.provenancePath))return{pass:false,status:'AUTHORING_STAGING_PERSIST_BLOCKED',...paths,errors:[error('AUTHORING_STAGING_PACKAGE_ALREADY_EXISTS',`Authoring STAGING package already exists for ${record.proposalId}`,{proposalId:record.proposalId,masterExists:fs.existsSync(paths.masterPath),provenanceExists:fs.existsSync(paths.provenancePath)})]};
  writeAtomic(paths.masterPath,`${JSON.stringify(appliedMaster,null,2)}\n`);
  writeAtomic(paths.provenancePath,`${JSON.stringify(record,null,2)}\n`);
  return{pass:true,status:'AUTHORING_STAGING_PACKAGE_PERSISTED',...paths,errors:[]};
}

export function loadAuthoringStagingPackage(proposalId,{rootDir=path.resolve('data/master-change-control')}={}){
  const paths=pathsFor(rootDir,proposalId);
  if(!fs.existsSync(paths.masterPath)||!fs.existsSync(paths.provenancePath))return{pass:false,status:'AUTHORING_STAGING_PACKAGE_NOT_FOUND',record:null,appliedMaster:null,...paths,errors:[error('AUTHORING_STAGING_PACKAGE_NOT_FOUND',`Authoring STAGING package is incomplete or missing for ${proposalId}`,{proposalId,masterExists:fs.existsSync(paths.masterPath),provenanceExists:fs.existsSync(paths.provenancePath)})]};
  try{
    const appliedMaster=JSON.parse(fs.readFileSync(paths.masterPath,'utf8'));
    const record=JSON.parse(fs.readFileSync(paths.provenancePath,'utf8'));
    const validation=validateAuthoringStagingProvenance(record,{});
    if(!validation.pass)return{pass:false,status:'AUTHORING_STAGING_PACKAGE_INVALID',record:null,appliedMaster:null,...paths,errors:validation.errors};
    if(record.resultMasterFingerprint!==productMasterFingerprint(appliedMaster))return{pass:false,status:'AUTHORING_STAGING_PACKAGE_INVALID',record:null,appliedMaster:null,...paths,errors:[error('AUTHORING_STAGING_STORED_MASTER_MISMATCH','Stored Authoring STAGING Master fingerprint no longer matches provenance',{expected:record.resultMasterFingerprint,actual:productMasterFingerprint(appliedMaster)})]};
    return{pass:true,status:'AUTHORING_STAGING_PACKAGE_LOADED',record,appliedMaster,...paths,errors:[]};
  }catch(cause){
    return{pass:false,status:'AUTHORING_STAGING_PACKAGE_INVALID',record:null,appliedMaster:null,...paths,errors:[error('AUTHORING_STAGING_PACKAGE_JSON_INVALID',cause.message)]};
  }
}
