import fs from'node:fs';
import path from'node:path';
import{createGeminiJob,runGeminiProductMasterBridge}from'../src/product-master-core/gemini-execution-bridge.mjs';

const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const jobFile=value('job');
const mockFile=value('mock-response');
const replayFile=value('replay-response');
const sourceFile=value('source-file')??process.env.GEMINI_SOURCE_FILE??null;
const evidenceInboxDir=value('evidence-inbox')??'data/evidence-inbox';
const changeControlDir=value('change-control')??'data/master-change-control';
const auditDir=value('audit-dir')??'artifacts/gemini-bridge/jobs';
if(!jobFile)throw new Error('Usage: node scripts/run-gemini-product-master-job.mjs --job=<job.json> [--source-file=<Drive-fetched.pdf>|--mock-response=file|--replay-response=file]');
const input=JSON.parse(fs.readFileSync(path.resolve(jobFile),'utf8'));
const created=createGeminiJob(input);
if(!created.pass){console.log(JSON.stringify({pass:false,status:'JOB_INVALID',errors:created.errors},null,2));process.exitCode=2;}
else{
  const mockResponse=mockFile?fs.readFileSync(path.resolve(mockFile),'utf8'):null;
  const replayResponse=replayFile?fs.readFileSync(path.resolve(replayFile),'utf8'):null;
  const result=await runGeminiProductMasterBridge(created.job,{evidenceInboxDir,changeControlDir,mockResponse,replayResponse,sourceFilePath:sourceFile?path.resolve(sourceFile):null});
  fs.mkdirSync(path.resolve(auditDir),{recursive:true});
  const auditPath=path.resolve(auditDir,`${created.job.jobId}.json`);
  const audit={...result,rawResponse:undefined,providerResponse:undefined};
  fs.writeFileSync(auditPath,`${JSON.stringify(audit,null,2)}\n`,'utf8');
  console.log(JSON.stringify({pass:result.pass,status:result.status,jobId:created.job.jobId,rawResponseSha256:result.rawResponseSha256,normalizedBatchId:result.normalizedBatchId??null,sourceAttachmentAudit:result.sourceAttachmentAudit??null,auditPath,canonicalWritePerformed:result.canonicalWritePerformed,runtimeWritePerformed:result.runtimeWritePerformed,productionWritePerformed:result.productionWritePerformed,errors:result.errors},null,2));
  if(!result.pass)process.exitCode=1;
}
