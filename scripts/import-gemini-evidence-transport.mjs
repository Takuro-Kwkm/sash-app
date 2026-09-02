import fs from'node:fs';
import path from'node:path';
import{persistGeminiTransport}from'../src/product-master-core/evidence-inbox-store.mjs';
import{APW430_GEMINI_INBOX_POC}from'../src/product-master-core/poc/apw430-gemini-inbox-poc.mjs';

const inputPath=process.argv[2];
if(!inputPath){
  console.error('Usage: node scripts/import-gemini-evidence-transport.mjs <transport.json> [--allow-duplicate-claims]');
  process.exit(2);
}
const absolute=path.resolve(inputPath);
const raw=fs.readFileSync(absolute,'utf8');
const knownFields=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.fields);
const nodeIds=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.productNodes.map((row)=>row.id));
const rootDir=path.resolve(process.env.EVIDENCE_INBOX_DIR??'data/evidence-inbox');
const allowDuplicateClaims=process.argv.includes('--allow-duplicate-claims');
const report=persistGeminiTransport(raw,{rootDir,allowDuplicateClaims,expectedProductId:'SER-YKK-APW430',knownFields,nodeIds});

if(!report.pass){
  console.error(JSON.stringify({status:report.status,file:absolute,inboxRoot:rootDir,errors:report.errors},null,2));
  process.exit(1);
}
console.log(JSON.stringify({
  status:report.status,
  canonicalWritePerformed:report.canonicalWritePerformed,
  batch:report.batch,
  candidateCount:report.candidateCount,
  issueCount:report.issueCount,
  batchPath:report.batchPath,
  manifestPath:report.manifestPath,
  rawSha256:report.rawSha256,
  nextAction:report.nextAction
},null,2));
