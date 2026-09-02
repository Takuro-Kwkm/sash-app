import fs from'node:fs';
import path from'node:path';
import{importGeminiTransport}from'../src/product-master-core/gemini-transport.mjs';
import{APW430_GEMINI_INBOX_POC}from'../src/product-master-core/poc/apw430-gemini-inbox-poc.mjs';

const inputPath=process.argv[2];
if(!inputPath){
  console.error('Usage: node scripts/import-gemini-evidence-transport.mjs <transport.json>');
  process.exit(2);
}
const absolute=path.resolve(inputPath);
const raw=fs.readFileSync(absolute,'utf8');
const knownFields=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.fields);
const nodeIds=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.productNodes.map((row)=>row.id));
const report=importGeminiTransport(raw,{expectedProductId:'SER-YKK-APW430',knownFields,nodeIds});

if(!report.pass){
  console.error(JSON.stringify({status:'REJECTED_AT_TRANSPORT_BOUNDARY',file:absolute,errors:report.errors},null,2));
  process.exit(1);
}
console.log(JSON.stringify({
  status:'ACCEPTED_TO_EVIDENCE_INBOX',
  canonicalWritePerformed:false,
  batch:report.batch,
  candidateCount:report.candidates.length,
  issueCount:report.issues.length,
  nextAction:'CHATGPT_OR_HUMAN_ADJUDICATION_REQUIRED'
},null,2));
