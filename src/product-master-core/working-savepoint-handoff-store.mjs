import fs from'node:fs';
import path from'node:path';
import{validateWorkingSavepointHandoff}from'./working-savepoint-handoff.mjs';

const error=(code,message,details={})=>({code,message,...details});
function writeAtomic(filePath,content){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const temp=`${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,content,'utf8');
  fs.renameSync(temp,filePath);
}
function pathFor(rootDir,proposalId){return path.join(path.resolve(rootDir),'savepoint-handoff',`${proposalId}.working-package-handoff.json`);}

export function persistWorkingSavepointHandoff(record,context={}, {rootDir=path.resolve('data/master-change-control')}={}){
  const checked=validateWorkingSavepointHandoff(record,context);
  if(!checked.pass)return{pass:false,status:'SAVEPOINT_HANDOFF_PERSIST_BLOCKED',filePath:null,errors:checked.errors};
  const filePath=pathFor(rootDir,record.proposalId);
  if(fs.existsSync(filePath))return{pass:false,status:'SAVEPOINT_HANDOFF_PERSIST_BLOCKED',filePath,errors:[error('SAVEPOINT_HANDOFF_ALREADY_EXISTS',`Working Savepoint handoff already exists for ${record.proposalId}`,{proposalId:record.proposalId})]};
  try{
    writeAtomic(filePath,`${JSON.stringify(record,null,2)}\n`);
    return{pass:true,status:'SAVEPOINT_HANDOFF_PERSISTED',filePath,errors:[]};
  }catch(cause){
    return{pass:false,status:'SAVEPOINT_HANDOFF_PERSIST_FAILED',filePath,errors:[error('SAVEPOINT_HANDOFF_PERSIST_IO_FAILED',cause.message)]};
  }
}

export function loadWorkingSavepointHandoff(proposalId,{rootDir=path.resolve('data/master-change-control')}={}){
  const filePath=pathFor(rootDir,proposalId);
  if(!fs.existsSync(filePath))return{pass:false,status:'SAVEPOINT_HANDOFF_NOT_FOUND',record:null,filePath,errors:[error('SAVEPOINT_HANDOFF_NOT_FOUND',`Working Savepoint handoff not found: ${proposalId}`)]};
  try{
    const record=JSON.parse(fs.readFileSync(filePath,'utf8'));
    const checked=validateWorkingSavepointHandoff(record);
    if(!checked.pass)return{pass:false,status:'SAVEPOINT_HANDOFF_INVALID',record:null,filePath,errors:checked.errors};
    return{pass:true,status:'SAVEPOINT_HANDOFF_LOADED',record,filePath,errors:[]};
  }catch(cause){
    return{pass:false,status:'SAVEPOINT_HANDOFF_INVALID',record:null,filePath,errors:[error('SAVEPOINT_HANDOFF_JSON_INVALID',cause.message)]};
  }
}
