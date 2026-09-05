import fs from'node:fs';
import path from'node:path';
import{validateHumanApprovalReviewGateBinding}from'./human-approval-review-gate-binding.mjs';

const error=(code,message,details={})=>({code,message,...details});

function writeAtomic(filePath,content){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}
function filePathFor(rootDir,proposalId){return path.join(path.resolve(rootDir),'approval-provenance',`${proposalId}.review-queue-gates.json`);}

export function persistHumanApprovalReviewGateBinding(record,{
  rootDir=path.resolve('data/master-change-control'),proposal=null,humanApprovalProvenance=null,reviewQueueValidations=[]
}={}){
  const validation=validateHumanApprovalReviewGateBinding(record,{proposal,humanApprovalProvenance,reviewQueueValidations});
  if(!validation.pass)return{pass:false,status:'HUMAN_APPROVAL_REVIEW_GATE_BINDING_PERSIST_BLOCKED',filePath:null,errors:validation.errors};
  const filePath=filePathFor(rootDir,record.proposalId);
  if(fs.existsSync(filePath))return{pass:false,status:'HUMAN_APPROVAL_REVIEW_GATE_BINDING_PERSIST_BLOCKED',filePath,errors:[error('HUMAN_APPROVAL_REVIEW_GATE_BINDING_ALREADY_EXISTS',`Review Queue Gate binding already exists for ${record.proposalId}`,{proposalId:record.proposalId})]};
  writeAtomic(filePath,`${JSON.stringify(record,null,2)}\n`);
  return{pass:true,status:'HUMAN_APPROVAL_REVIEW_GATE_BINDING_PERSISTED',filePath,errors:[]};
}

export function loadHumanApprovalReviewGateBinding(proposalId,{rootDir=path.resolve('data/master-change-control')}={}){
  const filePath=filePathFor(rootDir,proposalId);
  if(!fs.existsSync(filePath))return{pass:false,status:'HUMAN_APPROVAL_REVIEW_GATE_BINDING_NOT_FOUND',record:null,filePath,errors:[error('HUMAN_APPROVAL_REVIEW_GATE_BINDING_NOT_FOUND',`Review Queue Gate binding not found for ${proposalId}`,{proposalId})]};
  try{
    const record=JSON.parse(fs.readFileSync(filePath,'utf8'));
    const validation=validateHumanApprovalReviewGateBinding(record,{});
    if(!validation.pass)return{pass:false,status:'HUMAN_APPROVAL_REVIEW_GATE_BINDING_INVALID',record:null,filePath,errors:validation.errors};
    return{pass:true,status:'HUMAN_APPROVAL_REVIEW_GATE_BINDING_LOADED',record,filePath,errors:[]};
  }catch(cause){
    return{pass:false,status:'HUMAN_APPROVAL_REVIEW_GATE_BINDING_INVALID',record:null,filePath,errors:[error('HUMAN_APPROVAL_REVIEW_GATE_BINDING_JSON_INVALID',cause.message)]};
  }
}
