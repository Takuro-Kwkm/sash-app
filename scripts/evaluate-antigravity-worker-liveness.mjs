#!/usr/bin/env node
import fs from'node:fs';
import path from'node:path';
import{evaluateGeminiAiProWorkerLiveness}from'../src/product-master-core/worker-liveness.mjs';

const argv=process.argv.slice(2);
const arg=(name,fallback=null)=>{
  const prefix=`${name}=`;
  const value=argv.find((item)=>item.startsWith(prefix));
  return value?value.slice(prefix.length):fallback;
};
const inputPath=arg('--input');
const outputPath=arg('--output');
const expectedBranch=arg('--expected-branch');
const maxAgeMinutes=Number(arg('--max-age-minutes','90'));
const queueGraceMinutes=Number(arg('--queue-grace-minutes','20'));
const nowArg=arg('--now');

if(!inputPath) throw new Error('--input=<workflow-runs.json> is required');
const payload=JSON.parse(fs.readFileSync(path.resolve(inputPath),'utf8'));
const runs=Array.isArray(payload)?payload:Array.isArray(payload.workflow_runs)?payload.workflow_runs:[];
const now=nowArg?Date.parse(nowArg):Date.now();
const result=evaluateGeminiAiProWorkerLiveness({
  runs,
  now,
  maxAgeMinutes,
  queueGraceMinutes,
  expectedBranch
});
const audit={...result,generatedAt:new Date(Number.isFinite(now)?now:Date.now()).toISOString()};
const serialized=JSON.stringify(audit,null,2)+'\n';
if(outputPath){
  fs.mkdirSync(path.dirname(path.resolve(outputPath)),{recursive:true});
  fs.writeFileSync(path.resolve(outputPath),serialized);
}
process.stdout.write(serialized);
process.exitCode=result.status==='BLOCKED'?2:0;
