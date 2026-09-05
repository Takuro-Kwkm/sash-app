#!/usr/bin/env node
import fs from'node:fs';
import path from'node:path';
import{buildGeminiJobInputFromProductProfile}from'../src/product-master-core/product-profile.mjs';
import{createGeminiJob}from'../src/product-master-core/gemini-execution-bridge.mjs';
import{runGovernedGeminiV11}from'../src/product-master-core/governed-gemini-v11-runner.mjs';

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

const readJson=(file,label)=>{
  if(!file)throw new Error(`${label} path is required`);
  const absolute=path.resolve(file);
  if(!fs.existsSync(absolute))throw new Error(`${label} not found: ${file}`);
  return JSON.parse(fs.readFileSync(absolute,'utf8'));
};
const readText=(file,label)=>{
  if(!file)return null;
  const absolute=path.resolve(file);
  if(!fs.existsSync(absolute))throw new Error(`${label} not found: ${file}`);
  return fs.readFileSync(absolute,'utf8');
};
const parseBool=(value,defaultValue=false)=>{
  if(value===undefined||value===null||value==='')return defaultValue;
  if(typeof value==='boolean')return value;
  const normalized=String(value).trim().toLowerCase();
  if(['1','true','yes','on'].includes(normalized))return true;
  if(['0','false','no','off'].includes(normalized))return false;
  throw new Error(`Invalid boolean: ${value}`);
};
const safeName=(value)=>String(value??'gemini-job').replace(/[^A-Za-z0-9._-]+/g,'_');

function scrubSecrets(value,secrets){
  const texts=secrets.filter((row)=>typeof row==='string'&&row.length>0);
  if(!texts.length)return value;
  const replace=(text)=>texts.reduce((acc,secret)=>acc.split(secret).join('[REDACTED]'),text);
  return JSON.parse(replace(JSON.stringify(value)));
}

function validateCreatedJob(input){
  const created=createGeminiJob(input);
  if(!created.pass)throw new Error(`Gemini Job validation failed: ${JSON.stringify(created.errors)}`);
  return created.job;
}

function buildJob(args){
  if(args.job){
    const input=readJson(args.job,'Gemini Job');
    return{job:validateCreatedJob(input),profile:null};
  }
  if(!args.profile)throw new Error('Either --job or --profile is required');
  const profile=readJson(args.profile,'Product Profile');
  const overrides={
    execution_mode:args['execution-mode']??'LIVE_EXTERNAL',
    execution_channel:args['execution-channel']??null,
    preferred_execution_channel:args['preferred-execution-channel']??'GEMINI_AI_PRO',
    fallback_execution_channel:args['fallback-execution-channel']??'GEMINI_API',
    fallback_allowed:parseBool(args['fallback-allowed'],false),
    transport_method:args['transport-method']??null,
    execution_reference:args['execution-reference']??null,
    ...(Object.prototype.hasOwnProperty.call(args,'model')?{model:args.model||null}:{})
  };
  const built=buildGeminiJobInputFromProductProfile(profile,overrides);
  if(!built.pass)throw new Error(`Product Profile could not build Gemini Job: ${JSON.stringify(built.errors)}`);
  return{job:validateCreatedJob(built.jobInput),profile};
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  const {job}=buildJob(args);
  const sourceAcquisition=readJson(args['source-acquisition-audit'],'Source Acquisition Audit');
  const sourceDelivery=args['source-delivery-audit']?readJson(args['source-delivery-audit'],'Source Delivery Audit'):null;
  const geminiExecution=args['gemini-execution-audit']?readJson(args['gemini-execution-audit'],'Gemini Execution Audit'):null;
  const externalResponse=readText(args['external-response'],'External Gemini response');
  const evidenceInboxDir=path.resolve(args['evidence-inbox']??'data/evidence-inbox');
  const changeControlDir=path.resolve(args['change-control']??'data/master-change-control');
  const auditDir=path.resolve(args['audit-dir']??'artifacts/gemini-v11-jobs');
  fs.mkdirSync(auditDir,{recursive:true});

  const result=await runGovernedGeminiV11(job,{
    sourceAcquisition,
    sourceDelivery,
    geminiExecution,
    externalResponse,
    sourceFilePath:args['source-file']?path.resolve(args['source-file']):null,
    apiKey:process.env.GEMINI_API_KEY??null,
    model:args.model??job.model??process.env.GEMINI_MODEL??null,
    evidenceInboxDir,
    changeControlDir,
    allowDuplicateClaims:parseBool(args['allow-duplicate-claims'],false),
    argv:process.argv.slice(2)
  });

  const audit=scrubSecrets(result,[process.env.GEMINI_API_KEY]);
  const auditPath=path.join(auditDir,`${safeName(job.jobId)}-v11.json`);
  fs.writeFileSync(auditPath,`${JSON.stringify(audit,null,2)}\n`,'utf8');
  const summary={
    pass:result.pass===true,
    status:result.status??null,
    jobId:result.job?.jobId??job.jobId,
    executionChannel:result.job?.executionChannel??job.executionChannel??null,
    rawResponseSha256:result.rawResponseSha256??null,
    normalizedBatchId:result.normalizedBatchId??null,
    sourceAcquisitionGate:result.sourceAcquisitionValidation?.pass===true?'PASS':'BLOCKED',
    sourceDeliveryGate:result.sourceDeliveryValidation?.pass===true?'PASS':'BLOCKED',
    geminiExecutionGate:result.geminiExecutionValidation?.pass===true?'PASS':'BLOCKED',
    preInboxGuard:result.preInboxGuard?.status??'NOT_REACHED',
    transportProvenanceGate:result.transportProvenance?.status??result.preInboxGuard?.record?.transportProvenance?.status??'NOT_REACHED',
    evidenceInboxGate:result.inboxImport?.pass===true?'PASS':'NOT_WRITTEN',
    canonicalWritePerformed:result.canonicalWritePerformed===true,
    runtimeWritePerformed:result.runtimeWritePerformed===true,
    productionWritePerformed:result.productionWritePerformed===true,
    auditPath,
    errors:result.errors??[]
  };
  console.log(JSON.stringify(summary,null,2));
  if(!result.pass)process.exitCode=2;
}

main().catch((error)=>{
  console.error(JSON.stringify({pass:false,status:'CLI_FAILED',error:error?.message??String(error)},null,2));
  process.exitCode=2;
});
