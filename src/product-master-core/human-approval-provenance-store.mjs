import fs from'node:fs';
import path from'node:path';
import{validateHumanApprovalProvenance}from'./human-approval-provenance.mjs';

const error=(code,message,details={})=>({code,message,...details});

function writeAtomic(filePath,content){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}
function filePathFor(rootDir,proposalId){return path.join(path.resolve(rootDir),'approval-provenance',`${proposalId}.human-approval.json`);}

export function persistHumanApprovalProvenance(record,{
  rootDir=path.resolve('data/master-change-control'),proposal=null,approval=null,reviewQueue=null,adjudicationStore=null,baseMaster=null
}={}){
  const validation=validateHumanApprovalProvenance(record,{proposal,approval,reviewQueue,adjudicationStore,baseMaster});
  if(!validation.pass)return{pass:false,status:'HUMAN_APPROVAL_PROVENANCE_PERSIST_BLOCKED',filePath:null,errors:validation.errors};
  const filePath=filePathFor(rootDir,record.proposalId);
  if(fs.existsSync(filePath))return{pass:false,status:'HUMAN_APPROVAL_PROVENANCE_PERSIST_BLOCKED',filePath,errors:[error('HUMAN_APPROVAL_PROVENANCE_ALREADY_EXISTS',`Human Approval Provenance already exists for ${record.proposalId}`,{proposalId:record.proposalId})]};
  writeAtomic(filePath,`${JSON.stringify(record,null,2)}\n`);
  return{pass:true,status:'HUMAN_APPROVAL_PROVENANCE_PERSISTED',filePath,errors:[]};
}

export function loadHumanApprovalProvenance(proposalId,{rootDir=path.resolve('data/master-change-control')}={}){
  const filePath=filePathFor(rootDir,proposalId);
  if(!fs.existsSync(filePath))return{pass:false,status:'HUMAN_APPROVAL_PROVENANCE_NOT_FOUND',record:null,filePath,errors:[error('HUMAN_APPROVAL_PROVENANCE_NOT_FOUND',`Human Approval Provenance not found for ${proposalId}`,{proposalId})]};
  try{
    const record=JSON.parse(fs.readFileSync(filePath,'utf8'));
    const validation=validateHumanApprovalProvenance(record,{});
    if(!validation.pass)return{pass:false,status:'HUMAN_APPROVAL_PROVENANCE_INVALID',record:null,filePath,errors:validation.errors};
    return{pass:true,status:'HUMAN_APPROVAL_PROVENANCE_LOADED',record,filePath,errors:[]};
  }catch(cause){
    return{pass:false,status:'HUMAN_APPROVAL_PROVENANCE_INVALID',record:null,filePath,errors:[error('HUMAN_APPROVAL_PROVENANCE_JSON_INVALID',cause.message)]};
  }
}
