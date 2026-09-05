#!/usr/bin/env node
import fs from'node:fs';
import path from'node:path';
import{buildHumanApprovalProvenance}from'../src/product-master-core/human-approval-provenance.mjs';
import{persistHumanApprovalProvenance}from'../src/product-master-core/human-approval-provenance-store.mjs';

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
  return JSON.parse(fs.readFileSync(absolute,'utf8'));
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  const proposal=readJson(args.proposal,'Proposal');
  const approval=readJson(args.approval,'Explicit Human approval');
  const reviewQueue=readJson(args['review-queue'],'Unified Review Queue');
  const adjudicationStore=readJson(args['adjudication-state'],'Evidence Adjudication state');
  const baseMaster=readJson(args['base-master'],'Base Product Master');
  const rootDir=path.resolve(args['change-control-root']??'data/master-change-control');

  const built=buildHumanApprovalProvenance({proposal,approval,reviewQueue,adjudicationStore,baseMaster});
  if(!built.pass){
    console.error(JSON.stringify({pass:false,status:'HUMAN_APPROVAL_GATE_BLOCKED',errors:built.errors},null,2));
    process.exitCode=2;
    return;
  }
  const persisted=persistHumanApprovalProvenance(built.record,{rootDir,proposal,approval,reviewQueue,adjudicationStore,baseMaster});
  if(!persisted.pass){
    console.error(JSON.stringify({pass:false,status:persisted.status,errors:persisted.errors},null,2));
    process.exitCode=2;
    return;
  }
  console.log(JSON.stringify({
    pass:true,status:'HUMAN_APPROVAL_PROVENANCE_PERSISTED',proposalId:proposal.id,productId:proposal.productId,
    proposalFingerprint:built.record.proposalFingerprint,humanApprovalGate:'PASS',changeControlOpenAllowed:true,
    productionMasterWritePerformed:false,runtimeWritePerformed:false,filePath:persisted.filePath
  },null,2));
}

try{main();}catch(error){
  console.error(JSON.stringify({pass:false,status:'CLI_FAILED',error:error?.message??String(error)},null,2));
  process.exitCode=2;
}
