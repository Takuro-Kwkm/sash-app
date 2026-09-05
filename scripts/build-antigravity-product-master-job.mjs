import crypto from'node:crypto';
import fs from'node:fs';
import path from'node:path';
import{buildGeminiJobInputFromProductProfile}from'../src/product-master-core/product-profile.mjs';
import{createGeminiJob}from'../src/product-master-core/gemini-execution-bridge.mjs';
import{ANTIGRAVITY_PRODUCER_SYSTEM,ANTIGRAVITY_WORKER_PROVIDER,buildAntigravityTransportSchema,buildAntigravityWorkerPrompt}from'../src/product-master-core/antigravity-worker-adapter.mjs';

const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const required=(name)=>{const found=value(name);if(!found)throw new Error(`Missing --${name}=...`);return path.resolve(found);};
const sha256File=(file)=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sha256Text=(text)=>crypto.createHash('sha256').update(text).digest('hex');
const safe=(value)=>String(value??'').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'JOB';

const profilePath=required('profile');
const sourcePdfPath=required('source-pdf');
const sourceScopeTextPath=required('source-scope-text');
const outDir=required('out-dir');
const sourceScopeImageDir=value('source-scope-image-dir')?path.resolve(value('source-scope-image-dir')):null;

for(const file of[profilePath,sourcePdfPath,sourceScopeTextPath])if(!fs.existsSync(file))throw new Error(`Required input not found: ${file}`);
fs.mkdirSync(outDir,{recursive:true});

const profile=JSON.parse(fs.readFileSync(profilePath,'utf8'));
const expectedSha=profile?.source?.authoritativeSha256??null;
const actualSha=sha256File(sourcePdfPath);
if(!expectedSha||actualSha!==expectedSha)throw new Error(`Source SHA mismatch: expected=${expectedSha} actual=${actualSha}`);
const sourceScopeTextContent=fs.readFileSync(sourceScopeTextPath,'utf8');
if(!sourceScopeTextContent.trim())throw new Error('Scoped source text is empty');

const runSuffix=safe(process.env.GITHUB_RUN_ID??crypto.randomUUID().slice(0,8));
const attempt=safe(process.env.GITHUB_RUN_ATTEMPT??'1');
const repository=safe(process.env.GITHUB_REPOSITORY??'LOCAL');
const jobId=`GJOB-${safe(profile.manufacturer)}-${safe(profile.series)}-AGY-${runSuffix}-${attempt}`;
const executionReference=process.env.GITHUB_RUN_ID
  ?`GITHUB_ACTIONS_RUN:${process.env.GITHUB_REPOSITORY??'UNKNOWN'}:${process.env.GITHUB_RUN_ID}:${process.env.GITHUB_RUN_ATTEMPT??'1'}`
  :`ANTIGRAVITY_LOCAL:${runSuffix}:${attempt}`;
const built=buildGeminiJobInputFromProductProfile(profile,{
  execution_mode:'LIVE_EXTERNAL',
  execution_channel:'GEMINI_AI_PRO',
  preferred_execution_channel:'GEMINI_AI_PRO',
  fallback_execution_channel:'GEMINI_API',
  fallback_allowed:false,
  transport_method:'GEMINI_AI_PRO_STRUCTURED_HANDOFF',
  execution_reference:executionReference,
  job_id:jobId,
  metadata:{
    workerProvider:ANTIGRAVITY_WORKER_PROVIDER,
    producerSystem:ANTIGRAVITY_PRODUCER_SYSTEM,
    authenticationMode:'GOOGLE_AI_PRO_OAUTH',
    liveProducerMode:'LIVE_EXTERNAL'
  }
});
if(!built.pass)throw new Error(`Profile invalid: ${JSON.stringify(built.errors)}`);
const created=createGeminiJob(built.jobInput);
if(!created.pass)throw new Error(`Job invalid: ${JSON.stringify(created.errors)}`);
const job=created.job;

const schema=buildAntigravityTransportSchema(job);
const prompt=buildAntigravityWorkerPrompt(job,{
  sourceScopeTextContent,
  sourceSha256:actualSha
});

const jobPath=path.join(outDir,'live-job.json');
const schemaPath=path.join(outDir,'transport-schema.json');
const promptPath=path.join(outDir,'worker-prompt.txt');
const manifestPath=path.join(outDir,'antigravity-adapter-manifest.json');
fs.writeFileSync(jobPath,`${JSON.stringify(job,null,2)}\n`,'utf8');
fs.writeFileSync(schemaPath,`${JSON.stringify(schema,null,2)}\n`,'utf8');
fs.writeFileSync(promptPath,`${prompt}\n`,'utf8');
const manifest={
  recordType:'ANTIGRAVITY_PRODUCT_MASTER_WORKER_MANIFEST',
  schemaVersion:'1.1',
  jobId:job.jobId,
  manufacturer:job.manufacturer,
  series:job.series,
  productId:job.productId,
  workerProvider:ANTIGRAVITY_WORKER_PROVIDER,
  producerSystem:ANTIGRAVITY_PRODUCER_SYSTEM,
  authenticationMode:'GOOGLE_AI_PRO_OAUTH',
  executionMode:job.executionMode,
  executionChannel:job.executionChannel,
  preferredExecutionChannel:job.preferredExecutionChannel,
  fallbackExecutionChannel:job.fallbackExecutionChannel,
  fallbackAllowed:job.fallbackAllowed,
  transportMethod:job.transportMethod,
  executionReference:job.executionReference,
  evidenceDeliveryMode:'INLINE_VERIFIED_PAGE_SCOPED_TEXT',
  source:{
    driveFileId:job.sourceContext.driveFileId,
    title:job.sourceContext.title,
    authoritativeSha256:expectedSha,
    localVerifiedSha256:actualSha,
    scopeTextSha256:sha256File(sourceScopeTextPath),
    scopeTextBytes:Buffer.byteLength(sourceScopeTextContent,'utf8'),
    pageScope:job.pageScope,
    printedPageScope:job.printedPageScope
  },
  artifacts:{
    liveJob:path.basename(jobPath),
    transportSchema:path.basename(schemaPath),
    workerPrompt:path.basename(promptPath),
    promptSha256:sha256Text(prompt),
    schemaSha256:sha256Text(JSON.stringify(schema))
  },
  runner:{repository,runId:runSuffix,attempt},
  modelToolAuthority:'NONE',
  mutationAuthority:'NONE'
};
fs.writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`,'utf8');
console.log(JSON.stringify({pass:true,jobId:job.jobId,jobPath,schemaPath,promptPath,manifestPath,sourceSha256:actualSha,scopeTextSha256:manifest.source.scopeTextSha256,evidenceDeliveryMode:manifest.evidenceDeliveryMode,producerSystem:ANTIGRAVITY_PRODUCER_SYSTEM,executionChannel:job.executionChannel,transportMethod:job.transportMethod,executionReference:job.executionReference},null,2));
