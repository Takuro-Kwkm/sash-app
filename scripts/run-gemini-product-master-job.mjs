import fs from'node:fs';
import path from'node:path';
import{createGeminiJob,runGeminiProductMasterBridge}from'../src/product-master-core/gemini-execution-bridge.mjs';
import{runVerifiedGeminiLiveJob}from'../src/product-master-core/gemini-live-verified-runner.mjs';
import{buildGeminiJobInputFromProductProfile}from'../src/product-master-core/product-profile.mjs';
import{validateSourceAcquisitionRecord}from'../src/product-master-core/source-acquisition.mjs';
import{persistSourceAcquisitionForBatch}from'../src/product-master-core/source-acquisition-store.mjs';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';

const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const boolValue=(name)=>{const raw=value(name);if(raw===null)return undefined;if(raw==='true')return true;if(raw==='false')return false;throw new Error(`--${name} must be true or false`);};
const jobFile=value('job');
const profileFile=value('profile');
const executionMode=value('execution-mode');
const executionChannel=value('execution-channel');
const preferredExecutionChannel=value('preferred-execution-channel');
const fallbackExecutionChannel=value('fallback-execution-channel');
const fallbackAllowed=boolValue('fallback-allowed');
const transportMethod=value('transport-method');
const executionReference=value('execution-reference');
const model=value('model');
const mockFile=value('mock-response');
const replayFile=value('replay-response');
const externalFile=value('external-response');
const sourceFile=value('source-file')??process.env.GEMINI_SOURCE_FILE??null;
const sourceAcquisitionAuditFile=value('source-acquisition-audit');
const evidenceInboxDir=value('evidence-inbox')??'data/evidence-inbox';
const changeControlDir=value('change-control')??'data/master-change-control';
const auditDir=value('audit-dir')??'artifacts/gemini-bridge/jobs';

if(Boolean(jobFile)===Boolean(profileFile))throw new Error('Usage: supply exactly one of --job=<job.json> or --profile=<product-profile.json>');

let input=null;
let profileAudit=null;
if(profileFile){
  const resolvedProfile=path.resolve(profileFile);
  const profile=JSON.parse(fs.readFileSync(resolvedProfile,'utf8'));
  const resolvedMode=executionMode??undefined;
  const resolvedChannel=executionChannel??(resolvedMode==='LIVE_EXTERNAL'?'GEMINI_API':undefined);
  const built=buildGeminiJobInputFromProductProfile(profile,{
    execution_mode:resolvedMode,
    execution_channel:resolvedChannel,
    preferred_execution_channel:preferredExecutionChannel??undefined,
    fallback_execution_channel:fallbackExecutionChannel??undefined,
    fallback_allowed:fallbackAllowed,
    transport_method:transportMethod??undefined,
    execution_reference:executionReference??undefined,
    model:model??undefined
  });
  if(!built.pass){
    console.log(JSON.stringify({pass:false,status:'PROFILE_INVALID',profilePath:resolvedProfile,errors:built.errors},null,2));
    process.exitCode=2;
  }else{
    input=built.jobInput;
    profileAudit={
      profilePath:resolvedProfile,
      profileSchemaVersion:profile.profileSchemaVersion,
      manufacturer:profile.manufacturer,
      series:profile.series,
      registrySeriesKey:profile.registrySeriesKey,
      productId:profile.productId
    };
  }
}else input=JSON.parse(fs.readFileSync(path.resolve(jobFile),'utf8'));

if(input){
  const created=createGeminiJob(input);
  if(!created.pass){console.log(JSON.stringify({pass:false,status:'JOB_INVALID',profile:profileAudit,errors:created.errors},null,2));process.exitCode=2;}
  else{
    let sourceAcquisitionContext=null;
    let sourceAcquisitionValidation=null;
    if(sourceAcquisitionAuditFile){
      sourceAcquisitionContext=JSON.parse(fs.readFileSync(path.resolve(sourceAcquisitionAuditFile),'utf8'));
      sourceAcquisitionValidation=validateSourceAcquisitionRecord(sourceAcquisitionContext,{job:created.job});
      if(!sourceAcquisitionValidation.pass){
        const blocked={
          pass:false,status:'BLOCKED',job:created.job,profile:profileAudit,
          sourceAcquisitionContext,sourceAcquisitionValidation,
          canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false,
          errors:sourceAcquisitionValidation.errors
        };
        fs.mkdirSync(path.resolve(auditDir),{recursive:true});
        const auditPath=path.resolve(auditDir,`${created.job.jobId}.json`);
        fs.writeFileSync(auditPath,`${JSON.stringify(blocked,null,2)}\n`,'utf8');
        console.log(JSON.stringify({pass:false,status:'BLOCKED',jobId:created.job.jobId,sourceAcquisitionGate:'BLOCKED',auditPath,errors:blocked.errors},null,2));
        process.exitCode=3;
      }
    }

    if(process.exitCode===undefined||process.exitCode===0){
      const mockResponse=mockFile?fs.readFileSync(path.resolve(mockFile),'utf8'):null;
      const replayResponse=replayFile?fs.readFileSync(path.resolve(replayFile),'utf8'):null;
      const externalResponse=externalFile?fs.readFileSync(path.resolve(externalFile),'utf8'):null;
      const aiProLegacyHandoff=created.job.executionMode==='LIVE_EXTERNAL'&&created.job.executionChannel==='GEMINI_AI_PRO'?replayResponse:null;
      const common={
        evidenceInboxDir,changeControlDir,mockResponse,
        replayResponse:created.job.executionMode==='REPLAY'?replayResponse:null,
        externalResponse:externalResponse??aiProLegacyHandoff,
        sourceFilePath:sourceFile?path.resolve(sourceFile):null
      };
      let result=created.job.executionMode==='LIVE_EXTERNAL'&&created.job.executionChannel==='GEMINI_API'
        ?await runVerifiedGeminiLiveJob(created.job,{...common,argv:args})
        :await runGeminiProductMasterBridge(created.job,common);

      let sourceAcquisitionPersistence=null;
      if(result.pass&&sourceAcquisitionContext&&result.normalizedBatchId){
        sourceAcquisitionPersistence=persistSourceAcquisitionForBatch({
          evidenceInboxDir,batchId:result.normalizedBatchId,record:sourceAcquisitionContext,job:result.job
        });
        if(!sourceAcquisitionPersistence.pass){
          result={...result,pass:false,status:'BLOCKED',sourceAcquisitionPersistence,errors:sourceAcquisitionPersistence.errors};
        }else{
          result.executionContext={...(result.executionContext??{}),sourceAcquisition:sourceAcquisitionContext};
          if(result.inboxImport?.batch?.executionContext)result.inboxImport.batch.executionContext={...result.inboxImport.batch.executionContext,sourceAcquisition:sourceAcquisitionContext};
          result.reviewQueue=buildProductMasterReviewQueue({evidenceInboxDir,changeControlDir,productId:result.job.productId});
        }
      }

      fs.mkdirSync(path.resolve(auditDir),{recursive:true});
      const auditPath=path.resolve(auditDir,`${created.job.jobId}.json`);
      const audit={...result,profile:profileAudit,sourceAcquisitionContext,sourceAcquisitionValidation,sourceAcquisitionPersistence,rawResponse:undefined,providerResponse:undefined};
      fs.writeFileSync(auditPath,`${JSON.stringify(audit,null,2)}\n`,'utf8');
      console.log(JSON.stringify({
        pass:result.pass,status:result.status,jobId:created.job.jobId,profile:profileAudit,
        workerContractVersion:result.job?.workerContractVersion??created.job.workerContractVersion??null,
        executionChannel:result.job?.executionChannel??created.job.executionChannel??null,
        fallbackFrom:result.job?.fallbackFrom??null,
        transportMethod:result.job?.transportMethod??created.job.transportMethod??null,
        executionReference:result.job?.executionReference??created.job.executionReference??null,
        sourceAcquisitionGate:sourceAcquisitionContext?(sourceAcquisitionPersistence?.pass?'PASS':'BLOCKED'):'NOT_SUPPLIED',
        sourceIdentityMode:sourceAcquisitionContext?.identity?.mode??null,
        credentialPreflight:result.credentialPreflight??null,rawResponseSha256:result.rawResponseSha256??null,
        normalizedBatchId:result.normalizedBatchId??null,sourceAttachmentAudit:result.sourceAttachmentAudit??null,
        auditPath,canonicalWritePerformed:result.canonicalWritePerformed,runtimeWritePerformed:result.runtimeWritePerformed,
        productionWritePerformed:result.productionWritePerformed,errors:result.errors
      },null,2));
      if(!result.pass)process.exitCode=result.status==='BLOCKED'?3:1;
    }
  }
}
