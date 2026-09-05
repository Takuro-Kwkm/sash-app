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

const child=spawnSync(process.execPath,[path.resolve('scripts/run-apw430-gemini-live-v24.mjs'),...args],{stdio:'inherit',env:process.env});
if(!fs.existsSync(resultPath))process.exit(child.status??1);
let result=null;
try{result=JSON.parse(fs.readFileSync(resultPath,'utf8'));}
catch{process.exit(child.status??1);}

if(result?.pass===true&&result?.status==='IMPORTED'&&result?.transportGate==='PASS'&&result?.evidenceInboxGate==='PASS'){
  const reviewQueue=buildProductMasterReviewQueue({evidenceInboxDir,changeControlDir,productId:'SER-YKK-APW430'});
  const items=Array.isArray(reviewQueue.items)?reviewQueue.items:[];
  const evidenceItems=items.filter((row)=>row.kind==='EVIDENCE_CANDIDATE');
  const corrected={
    ...result,
    queueVisible:evidenceItems.length>0,
    queueRecordCount:evidenceItems.length,
    reviewQueueGate:evidenceItems.length>0?'PASS':'FAIL',
    reviewQueueSummary:reviewQueue.summary??null,
    authorityBoundary:reviewQueue.authorityBoundary??null
  };
  fs.writeFileSync(resultPath,JSON.stringify(corrected,null,2));
  fs.writeFileSync(path.join(artifactDir,'review-queue.json'),JSON.stringify(reviewQueue,null,2));
  console.log(JSON.stringify(corrected,null,2));
  process.exit(corrected.queueVisible?0:1);
}
process.exit(child.status??1);
