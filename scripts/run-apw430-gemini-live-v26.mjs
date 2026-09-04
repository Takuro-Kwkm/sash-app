import fs from'node:fs';
import path from'node:path';
import{spawnSync}from'node:child_process';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';

const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const artifactDir=path.resolve(value('artifact-dir')??'artifacts/gemini-live-v23/apw430');
const evidenceInboxDir=path.join(artifactDir,'evidence-inbox');
const changeControlDir=path.resolve('data/master-change-control');
const resultPath=path.join(artifactDir,'live-roundtrip-result.json');
const retryAuditPath=path.join(artifactDir,'provider-retry-audit.json');
const maxAttempts=3;
const attempts=[];
const sleep=(ms)=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);

function finalizeImported(result,attempt){
  const reviewQueue=buildProductMasterReviewQueue({evidenceInboxDir,changeControlDir,productId:'SER-YKK-APW430'});
  const items=Array.isArray(reviewQueue.items)?reviewQueue.items:[];
  const evidenceItems=items.filter((row)=>row.kind==='EVIDENCE_CANDIDATE');
  const corrected={
    ...result,
    queueVisible:evidenceItems.length>0,
    queueRecordCount:evidenceItems.length,
    reviewQueueGate:evidenceItems.length>0?'PASS':'FAIL',
    reviewQueueSummary:reviewQueue.summary??null,
    authorityBoundary:reviewQueue.authorityBoundary??null,
    providerAttemptCount:attempt,
    transientProviderRetries:attempt-1
  };
  fs.mkdirSync(artifactDir,{recursive:true});
  fs.writeFileSync(resultPath,JSON.stringify(corrected,null,2));
  fs.writeFileSync(path.join(artifactDir,'review-queue.json'),JSON.stringify(reviewQueue,null,2));
  fs.writeFileSync(retryAuditPath,JSON.stringify({attempts,finalStatus:corrected.reviewQueueGate},null,2));
  console.log(JSON.stringify(corrected,null,2));
  process.exit(corrected.queueVisible?0:1);
}

for(let attempt=1;attempt<=maxAttempts;attempt+=1){
  if(fs.existsSync(resultPath))fs.rmSync(resultPath,{force:true});
  const child=spawnSync(process.execPath,[path.resolve('scripts/run-apw430-gemini-live-v24.mjs'),...args],{
    encoding:'utf8',maxBuffer:32*1024*1024,env:process.env
  });
  if(child.stdout)process.stdout.write(child.stdout);
  if(child.stderr)process.stderr.write(child.stderr);

  let result=null;
  if(fs.existsSync(resultPath)){
    try{result=JSON.parse(fs.readFileSync(resultPath,'utf8'));}catch{result=null;}
  }
  if(result?.pass===true&&result?.status==='IMPORTED'&&result?.transportGate==='PASS'&&result?.evidenceInboxGate==='PASS'){
    attempts.push({attempt,status:'IMPORTED',transient:false,exitCode:child.status??null});
    finalizeImported(result,attempt);
  }

  const combined=`${child.stdout??''}\n${child.stderr??''}`;
  const highDemand=combined.includes('"providerHttpStatus": 503')||combined.includes('currently experiencing high demand')||combined.includes('"status": "UNAVAILABLE"');
  const timedOut=combined.includes('"code": "GEMINI_TIMEOUT"')||combined.includes('This operation was aborted');
  const transient=highDemand||timedOut;
  attempts.push({attempt,status:highDemand?'PROVIDER_503':timedOut?'TIMEOUT':'NON_TRANSIENT_FAILURE',transient,exitCode:child.status??null});
  fs.mkdirSync(artifactDir,{recursive:true});
  fs.writeFileSync(retryAuditPath,JSON.stringify({attempts,finalStatus:attempt===maxAttempts?'FAILED':'RETRYING'},null,2));

  if(!transient||attempt===maxAttempts)process.exit(child.status??1);
  const delayMs=attempt*5000;
  console.log(`Transient Gemini provider failure detected; retrying same verified file after ${delayMs}ms (attempt ${attempt+1}/${maxAttempts}).`);
  sleep(delayMs);
}
process.exit(1);
