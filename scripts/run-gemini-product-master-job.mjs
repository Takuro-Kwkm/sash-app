import crypto from'node:crypto';
import fs from'node:fs';
import path from'node:path';
import{createGeminiJob,runGeminiProductMasterBridge}from'../src/product-master-core/gemini-execution-bridge.mjs';
import{runVerifiedGeminiLiveJob}from'../src/product-master-core/gemini-live-verified-runner.mjs';
import{buildGeminiJobInputFromProductProfile}from'../src/product-master-core/product-profile.mjs';
import{validateSourceAcquisitionRecord}from'../src/product-master-core/source-acquisition.mjs';
import{persistSourceAcquisitionForBatch}from'../src/product-master-core/source-acquisition-store.mjs';
import{buildGeminiApiAttachmentDelivery,validateSourceDeliveryRecord}from'../src/product-master-core/source-delivery-contract.mjs';
import{persistSourceDeliveryForBatch}from'../src/product-master-core/source-delivery-store.mjs';
import{buildApiGeminiExecutionAudit,validateGeminiExecutionAudit}from'../src/product-master-core/gemini-execution-contract.mjs';
import{persistGeminiExecutionForBatch}from'../src/product-master-core/gemini-execution-store.mjs';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';

const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const boolValue=(name)=>{const raw=value(name);if(raw===null)return undefined;if(raw==='true')return true;if(raw==='false')return false;throw new Error(`--${name} must be true or false`);};
const sha256Text=(value)=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
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
const sourceDeliveryAuditFile=value('source-delivery-audit');
const geminiExecutionAuditFile=value('gemini-execution-audit');
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

function writeBlockedAudit({job,profile,sourceAcquisitionContext,sourceAcquisitionValidation,sourceDeliveryContext,sourceDeliveryValidation,geminiExecutionContext,geminiExecutionValidation,errors}){
  const blocked={
    pass:false,status:'BLOCKED',job,profile,
    sourceAcquisitionContext,sourceAcquisitionValidation,sourceDeliveryContext,sourceDeliveryValidation,
    geminiExecutionContext,geminiExecutionValidation,
    canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false,errors
  };
  fs.mkdirSync(path.resolve(auditDir),{recursive:true});
  const auditPath=path.resolve(auditDir,`${job.jobId}.json`);
  fs.writeFileSync(auditPath,`${JSON.stringify(blocked,null,2)}\n`,'utf8');
  return auditPath;
}

if(input){
  const created=createGeminiJob(input);
  if(!created.pass){console.log(JSON.stringify({pass:false,status:'JOB_INVALID',profile:profileAudit,errors:created.errors},null,2));process.exitCode=2;}
  else{
    let sourceAcquisitionContext=null;
    let sourceAcquisitionValidation=null;
    let sourceDeliveryContext=null;
    let sourceDeliveryValidation=null;
    let geminiExecutionContext=null;
    let geminiExecutionValidation=null;
    if(sourceAcquisitionAuditFile){
      sourceAcquisitionContext=JSON.parse(fs.readFileSync(path.resolve(sourceAcquisitionAuditFile),'utf8'));
      sourceAcquisitionValidation=validateSourceAcquisitionRecord(sourceAcquisitionContext,{job:created.job});
      if(!sourceAcquisitionValidation.pass){
        const auditPath=writeBlockedAudit({job:created.job,profile:profileAudit,sourceAcquisitionContext,sourceAcquisitionValidation,sourceDeliveryContext:null,sourceDeliveryValidation:null,geminiExecutionContext:null,geminiExecutionValidation:null,errors:sourceAcquisitionValidation.errors});
        console.log(JSON.stringify({pass:false,status:'BLOCKED',jobId:created.job.jobId,sourceAcquisitionGate:'BLOCKED',sourceDeliveryGate:'NOT_OPENED',geminiExecutionGate:'NOT_OPENED',auditPath,errors:sourceAcquisitionValidation.errors},null,2));
        process.exitCode=3;
      }
    }
    if((process.exitCode===undefined||process.exitCode===0)&&sourceDeliveryAuditFile){
      sourceDeliveryContext=JSON.parse(fs.readFileSync(path.resolve(sourceDeliveryAuditFile),'utf8'));
      sourceDeliveryValidation=validateSourceDeliveryRecord(sourceDeliveryContext,{job:created.job,sourceAcquisition:sourceAcquisitionContext});
      if(!sourceDeliveryValidation.pass){
        const auditPath=writeBlockedAudit({job:created.job,profile:profileAudit,sourceAcquisitionContext,sourceAcquisitionValidation,sourceDeliveryContext,sourceDeliveryValidation,geminiExecutionContext:null,geminiExecutionValidation:null,errors:sourceDeliveryValidation.errors});
        console.log(JSON.stringify({pass:false,status:'BLOCKED',jobId:created.job.jobId,sourceAcquisitionGate:sourceAcquisitionContext?'PASS':'NOT_SUPPLIED',sourceDeliveryGate:'BLOCKED',geminiExecutionGate:'NOT_OPENED',auditPath,errors:sourceDeliveryValidation.errors},null,2));
        process.exitCode=3;
      }
    }
    if((process.exitCode===undefined||process.exitCode===0)&&created.job.workerContractVersion==='1.1'&&created.job.executionMode==='LIVE_EXTERNAL'&&created.job.executionChannel==='GEMINI_AI_PRO'&&sourceAcquisitionContext&&!sourceDeliveryContext){
      const errors=[{code:'SOURCE_DELIVERY_AUDIT_REQUIRED',message:'GEMINI_AI_PRO LIVE job with Source Acquisition requires a validated source delivery audit before Worker execution'}];
      const auditPath=writeBlockedAudit({job:created.job,profile:profileAudit,sourceAcquisitionContext,sourceAcquisitionValidation,sourceDeliveryContext:null,sourceDeliveryValidation:null,geminiExecutionContext:null,geminiExecutionValidation:null,errors});
      console.log(JSON.stringify({pass:false,status:'BLOCKED',jobId:created.job.jobId,sourceAcquisitionGate:'PASS',sourceDeliveryGate:'BLOCKED',geminiExecutionGate:'NOT_OPENED',auditPath,errors},null,2));
      process.exitCode=3;
    }

    const mockResponse=mockFile?fs.readFileSync(path.resolve(mockFile),'utf8'):null;
    const replayResponse=replayFile?fs.readFileSync(path.resolve(replayFile),'utf8'):null;
    const externalResponse=externalFile?fs.readFileSync(path.resolve(externalFile),'utf8'):null;
    const aiProLegacyHandoff=created.job.executionMode==='LIVE_EXTERNAL'&&created.job.executionChannel==='GEMINI_AI_PRO'?replayResponse:null;
    const governedExternalResponse=externalResponse??aiProLegacyHandoff;

    if((process.exitCode===undefined||process.exitCode===0)&&geminiExecutionAuditFile){
      geminiExecutionContext=JSON.parse(fs.readFileSync(path.resolve(geminiExecutionAuditFile),'utf8'));
      geminiExecutionValidation=validateGeminiExecutionAudit(geminiExecutionContext,{
        job:created.job,sourceAcquisition:sourceAcquisitionContext,sourceDelivery:sourceDeliveryContext,
        rawResponseSha256:governedExternalResponse?sha256Text(governedExternalResponse):null
      });
      if(!geminiExecutionValidation.pass){
        const auditPath=writeBlockedAudit({job:created.job,profile:profileAudit,sourceAcquisitionContext,sourceAcquisitionValidation,sourceDeliveryContext,sourceDeliveryValidation,geminiExecutionContext,geminiExecutionValidation,errors:geminiExecutionValidation.errors});
        console.log(JSON.stringify({pass:false,status:'BLOCKED',jobId:created.job.jobId,sourceAcquisitionGate:sourceAcquisitionContext?'PASS':'NOT_SUPPLIED',sourceDeliveryGate:sourceDeliveryContext?'PASS':'NOT_SUPPLIED',geminiExecutionGate:'BLOCKED',auditPath,errors:geminiExecutionValidation.errors},null,2));
        process.exitCode=3;
      }
    }
    if((process.exitCode===undefined||process.exitCode===0)&&created.job.workerContractVersion==='1.1'&&created.job.executionMode==='LIVE_EXTERNAL'&&created.job.executionChannel==='GEMINI_AI_PRO'&&sourceDeliveryContext&&!geminiExecutionContext){
      const errors=[{code:'GEMINI_EXECUTION_AUDIT_REQUIRED',message:'GEMINI_AI_PRO LIVE handoff with Source Delivery requires a normalized Gemini execution audit before Transport import'}];
      const auditPath=writeBlockedAudit({job:created.job,profile:profileAudit,sourceAcquisitionContext,sourceAcquisitionValidation,sourceDeliveryContext,sourceDeliveryValidation,geminiExecutionContext:null,geminiExecutionValidation:null,errors});
      console.log(JSON.stringify({pass:false,status:'BLOCKED',jobId:created.job.jobId,sourceAcquisitionGate:sourceAcquisitionContext?'PASS':'NOT_SUPPLIED',sourceDeliveryGate:'PASS',geminiExecutionGate:'BLOCKED',auditPath,errors},null,2));
      process.exitCode=3;
    }

    if(process.exitCode===undefined||process.exitCode===0){
      const common={
        evidenceInboxDir,changeControlDir,mockResponse,
        replayResponse:created.job.executionMode==='REPLAY'?replayResponse:null,
        externalResponse:governedExternalResponse,
        sourceFilePath:sourceFile?path.resolve(sourceFile):null
      };
      let result=created.job.executionMode==='LIVE_EXTERNAL'&&created.job.executionChannel==='GEMINI_API'
        ?await runVerifiedGeminiLiveJob(created.job,{...common,argv:args})
        :await runGeminiProductMasterBridge(created.job,common);

      if(result.pass&&sourceAcquisitionContext&&created.job.executionChannel==='GEMINI_API'&&!sourceDeliveryContext){
        const builtDelivery=buildGeminiApiAttachmentDelivery({
          sourceAcquisition:sourceAcquisitionContext,
          sourceAttachmentAudit:result.sourceAttachmentAudit,
          sourceAttachment:result.job?.sourceAttachment??null,
          executionReference:result.job?.executionReference??created.job.executionReference??null
        });
        sourceDeliveryValidation={pass:builtDelivery.pass,errors:builtDelivery.errors};
        if(!builtDelivery.pass)result={...result,pass:false,status:'BLOCKED',errors:builtDelivery.errors};
        else sourceDeliveryContext=builtDelivery.record;
      }

      if(result.pass&&sourceAcquisitionContext&&sourceDeliveryContext&&created.job.executionChannel==='GEMINI_API'&&!geminiExecutionContext){
        const builtExecution=buildApiGeminiExecutionAudit({job:result.job??created.job,sourceAcquisition:sourceAcquisitionContext,sourceDelivery:sourceDeliveryContext,result});
        geminiExecutionValidation={pass:builtExecution.pass,errors:builtExecution.errors};
        if(!builtExecution.pass)result={...result,pass:false,status:'BLOCKED',errors:builtExecution.errors};
        else geminiExecutionContext=builtExecution.record;
      }
      if(result.pass&&geminiExecutionContext){
        geminiExecutionValidation=validateGeminiExecutionAudit(geminiExecutionContext,{
          job:result.job??created.job,sourceAcquisition:sourceAcquisitionContext,sourceDelivery:sourceDeliveryContext,rawResponseSha256:result.rawResponseSha256??null
        });
        if(!geminiExecutionValidation.pass)result={...result,pass:false,status:'BLOCKED',errors:geminiExecutionValidation.errors};
      }

      let sourceAcquisitionPersistence=null;
      let sourceDeliveryPersistence=null;
      let geminiExecutionPersistence=null;
      if(result.pass&&sourceAcquisitionContext&&result.normalizedBatchId){
        sourceAcquisitionPersistence=persistSourceAcquisitionForBatch({
          evidenceInboxDir,batchId:result.normalizedBatchId,record:sourceAcquisitionContext,job:result.job
        });
        if(!sourceAcquisitionPersistence.pass)result={...result,pass:false,status:'BLOCKED',sourceAcquisitionPersistence,errors:sourceAcquisitionPersistence.errors};
      }
      if(result.pass&&sourceDeliveryContext&&result.normalizedBatchId){
        sourceDeliveryPersistence=persistSourceDeliveryForBatch({
          evidenceInboxDir,batchId:result.normalizedBatchId,record:sourceDeliveryContext,job:result.job,sourceAcquisition:sourceAcquisitionContext
        });
        if(!sourceDeliveryPersistence.pass)result={...result,pass:false,status:'BLOCKED',sourceDeliveryPersistence,errors:sourceDeliveryPersistence.errors};
      }
      if(result.pass&&geminiExecutionContext&&result.normalizedBatchId){
        geminiExecutionPersistence=persistGeminiExecutionForBatch({
          evidenceInboxDir,batchId:result.normalizedBatchId,record:geminiExecutionContext,job:result.job,
          sourceAcquisition:sourceAcquisitionContext,sourceDelivery:sourceDeliveryContext,rawResponseSha256:result.rawResponseSha256
        });
        if(!geminiExecutionPersistence.pass)result={...result,pass:false,status:'BLOCKED',geminiExecutionPersistence,errors:geminiExecutionPersistence.errors};
      }
      if(result.pass&&(sourceAcquisitionPersistence?.pass||sourceDeliveryPersistence?.pass||geminiExecutionPersistence?.pass)){
        result.executionContext={
          ...(result.executionContext??{}),
          ...(sourceAcquisitionContext?{sourceAcquisition:sourceAcquisitionContext}:{}),
          ...(sourceDeliveryContext?{sourceDelivery:sourceDeliveryContext}:{}),
          ...(geminiExecutionContext?{geminiExecution:geminiExecutionContext}:{})
        };
        if(result.inboxImport?.batch?.executionContext)result.inboxImport.batch.executionContext={
          ...result.inboxImport.batch.executionContext,
          ...(sourceAcquisitionContext?{sourceAcquisition:sourceAcquisitionContext}:{}),
          ...(sourceDeliveryContext?{sourceDelivery:sourceDeliveryContext}:{}),
          ...(geminiExecutionContext?{geminiExecution:geminiExecutionContext}:{})
        };
        result.reviewQueue=buildProductMasterReviewQueue({evidenceInboxDir,changeControlDir,productId:result.job.productId});
      }

      fs.mkdirSync(path.resolve(auditDir),{recursive:true});
      const auditPath=path.resolve(auditDir,`${created.job.jobId}.json`);
      const audit={
        ...result,profile:profileAudit,
        sourceAcquisitionContext,sourceAcquisitionValidation,sourceAcquisitionPersistence,
        sourceDeliveryContext,sourceDeliveryValidation,sourceDeliveryPersistence,
        geminiExecutionContext,geminiExecutionValidation,geminiExecutionPersistence,
        rawResponse:undefined,providerResponse:undefined
      };
      fs.writeFileSync(auditPath,`${JSON.stringify(audit,null,2)}\n`,'utf8');
      console.log(JSON.stringify({
        pass:result.pass,status:result.status,jobId:created.job.jobId,profile:profileAudit,
        workerContractVersion:result.job?.workerContractVersion??created.job.workerContractVersion??null,
        executionChannel:result.job?.executionChannel??created.job.executionChannel??null,
        fallbackFrom:result.job?.fallbackFrom??null,
        transportMethod:result.job?.transportMethod??created.job.transportMethod??null,
        executionReference:result.job?.executionReference??created.job.executionReference??null,
        sourceAcquisitionGate:sourceAcquisitionContext?(sourceAcquisitionPersistence?.pass?'PASS':result.pass?'PASS':'BLOCKED'):'NOT_SUPPLIED',
        sourceIdentityMode:sourceAcquisitionContext?.identity?.mode??null,
        sourceDeliveryGate:sourceDeliveryContext?(sourceDeliveryPersistence?.pass?'PASS':result.pass?'PASS':'BLOCKED'):'NOT_SUPPLIED',
        sourceDeliveryMethod:sourceDeliveryContext?.delivery?.method??null,
        geminiExecutionGate:geminiExecutionContext?(geminiExecutionPersistence?.pass?'PASS':result.pass?'PASS':'BLOCKED'):'NOT_SUPPLIED',
        geminiExecutionSurface:geminiExecutionContext?.surface?.id??null,
        model:geminiExecutionContext?.surface?.model??result.job?.model??created.job.model??null,
        credentialPreflight:result.credentialPreflight??null,rawResponseSha256:result.rawResponseSha256??null,
        normalizedBatchId:result.normalizedBatchId??null,sourceAttachmentAudit:result.sourceAttachmentAudit??null,
        auditPath,canonicalWritePerformed:result.canonicalWritePerformed,runtimeWritePerformed:result.runtimeWritePerformed,
        productionWritePerformed:result.productionWritePerformed,errors:result.errors
      },null,2));
      if(!result.pass)process.exitCode=result.status==='BLOCKED'?3:1;
    }
  }
}
