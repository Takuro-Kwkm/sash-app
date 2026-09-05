#!/usr/bin/env node
import fs from'node:fs';
import path from'node:path';
import{buildHumanApprovalProvenance}from'../src/product-master-core/human-approval-provenance.mjs';
import{persistHumanApprovalProvenance}from'../src/product-master-core/human-approval-provenance-store.mjs';
import{buildHumanApprovalReviewGateBinding}from'../src/product-master-core/human-approval-review-gate-binding.mjs';
import{persistHumanApprovalReviewGateBinding}from'../src/product-master-core/human-approval-review-gate-binding-store.mjs';

function setArg(out,key,value){
  if(out[key]===undefined)out[key]=value;
  else if(Array.isArray(out[key]))out[key].push(value);
  else out[key]=[out[key],value];
}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const token=argv[i];
    if(!token.startsWith('--'))continue;
    const body=token.slice(2);
    const eq=body.indexOf('=');
    if(eq>=0){setArg(out,body.slice(0,eq),body.slice(eq+1));continue;}
    const next=argv[i+1];
    if(next!==undefined&&!next.startsWith('--')){setArg(out,body,next);i+=1;}else setArg(out,body,'true');
  }
  return out;
}
function readJson(file,label){
  if(!file)throw new Error(`${label} path is required`);
  const absolute=path.resolve(file);
  if(!fs.existsSync(absolute))throw new Error(`${label} not found: ${file}`);
  return JSON.parse(fs.readFileSync(absolute,'utf8'));
}
const asArray=(value)=>value===undefined?[]:Array.isArray(value)?value:[value];
function readReviewGate(file,index){
  const parsed=readJson(file,`Review Queue Gate ${index+1}`);
  return parsed?.reviewQueueValidation?.record??parsed?.reviewQueueValidation??parsed;
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  const proposal=readJson(args.proposal,'Proposal');
  const approval=readJson(args.approval,'Explicit Human approval');
  const reviewQueue=readJson(args['review-queue'],'Unified Review Queue');
  const adjudicationStore=readJson(args['adjudication-state'],'Evidence Adjudication state');
  const baseMaster=readJson(args['base-master'],'Base Product Master');
  const reviewGateFiles=asArray(args['review-queue-validation']);
  if(!reviewGateFiles.length)throw new Error('At least one --review-queue-validation=<gate-or-governed-job-audit.json> is required');
  const reviewQueueValidations=reviewGateFiles.map(readReviewGate);
  const rootDir=path.resolve(args['change-control-root']??'data/master-change-control');

  const built=buildHumanApprovalProvenance({proposal,approval,reviewQueue,adjudicationStore,baseMaster});
  if(!built.pass){
    console.error(JSON.stringify({pass:false,status:'HUMAN_APPROVAL_GATE_BLOCKED',errors:built.errors},null,2));
    process.exitCode=2;
    return;
  }
  const gateBinding=buildHumanApprovalReviewGateBinding({proposal,humanApprovalProvenance:built.record,reviewQueueValidations});
  if(!gateBinding.pass){
    console.error(JSON.stringify({pass:false,status:'REVIEW_QUEUE_GATE_BINDING_BLOCKED',errors:gateBinding.errors},null,2));
    process.exitCode=2;
    return;
  }

  const approvalDir=path.join(rootDir,'approval-provenance');
  const humanPath=path.join(approvalDir,`${proposal.id}.human-approval.json`);
  const reviewGatePath=path.join(approvalDir,`${proposal.id}.review-queue-gates.json`);
  if(fs.existsSync(humanPath)||fs.existsSync(reviewGatePath)){
    console.error(JSON.stringify({pass:false,status:'HUMAN_APPROVAL_PACKAGE_ALREADY_EXISTS',errors:[{code:'HUMAN_APPROVAL_PACKAGE_ALREADY_EXISTS',message:'Human Approval provenance package is append-only for a Proposal',humanPathExists:fs.existsSync(humanPath),reviewGatePathExists:fs.existsSync(reviewGatePath)}]},null,2));
    process.exitCode=2;
    return;
  }

  const persisted=persistHumanApprovalProvenance(built.record,{rootDir,proposal,approval,reviewQueue,adjudicationStore,baseMaster});
  if(!persisted.pass){
    console.error(JSON.stringify({pass:false,status:persisted.status,errors:persisted.errors},null,2));
    process.exitCode=2;
    return;
  }
  const persistedBinding=persistHumanApprovalReviewGateBinding(gateBinding.record,{rootDir,proposal,humanApprovalProvenance:built.record,reviewQueueValidations});
  if(!persistedBinding.pass){
    console.error(JSON.stringify({pass:false,status:persistedBinding.status,errors:persistedBinding.errors,humanApprovalFilePath:persisted.filePath},null,2));
    process.exitCode=2;
    return;
  }
  console.log(JSON.stringify({
    pass:true,status:'HUMAN_APPROVAL_PACKAGE_PERSISTED',proposalId:proposal.id,productId:proposal.productId,
    proposalFingerprint:built.record.proposalFingerprint,humanApprovalGate:'PASS',reviewQueueGateBinding:'PASS',changeControlOpenAllowed:true,
    sourceBatchIds:gateBinding.record.sourceBatchIds,reviewQueueGateSetFingerprint:gateBinding.record.reviewQueueGateSetFingerprint,
    productionMasterWritePerformed:false,runtimeWritePerformed:false,
    humanApprovalFilePath:persisted.filePath,reviewQueueGateBindingFilePath:persistedBinding.filePath
  },null,2));
}

try{main();}catch(error){
  console.error(JSON.stringify({pass:false,status:'CLI_FAILED',error:error?.message??String(error)},null,2));
  process.exitCode=2;
}
