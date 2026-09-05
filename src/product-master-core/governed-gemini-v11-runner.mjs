import crypto from'node:crypto';
import{executeGeminiJob,validateBridgeTransport}from'./gemini-execution-bridge.mjs';
import{runVerifiedGeminiLiveJob}from'./gemini-live-verified-runner.mjs';
import{validateSourceAcquisitionRecord}from'./source-acquisition.mjs';
import{buildGeminiApiAttachmentDelivery,validateSourceDeliveryRecord}from'./source-delivery-contract.mjs';
import{validateGeminiExecutionAudit}from'./gemini-execution-contract.mjs';
import{buildApiGeminiExecutionAuditPreInbox}from'./gemini-execution-pre-inbox.mjs';
import{persistGeminiTransportAfterPreInboxGuard}from'./transport-pre-inbox-guard.mjs';
import{buildProductMasterReviewQueue}from'./review-queue.mjs';
import{validateGovernedReviewQueue}from'./review-queue-contract.mjs';

const sha256=(value)=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
const safety=()=>({canonicalWritePerformed:false,runtimeWritePerformed:false,productionWritePerformed:false});
const nowIso=()=>new Date().toISOString();
const makeError=(code,message,details={})=>({code,message,...details});

export async function executeGeminiTransportBoundary(job,executionOptions={}){
  const execution=await executeGeminiJob(job,executionOptions);
  if(!execution.pass)return{
    pass:false,status:execution.job?.status??'FAILED',job:execution.job??job,routeDecision:execution.routeDecision??null,
    rawResponse:null,rawResponseSha256:null,providerResponse:execution.providerResponse??null,sourceAttachmentAudit:execution.sourceAttachmentAudit??null,
    transportValidation:null,...safety(),errors:execution.errors??[]
  };
  const raw=execution.rawResponse;
  const rawResponseSha256=sha256(raw);
  const transportValidation=validateBridgeTransport(raw,execution.job,executionOptions.transportOptions??{});
  if(!transportValidation.pass)return{
    pass:false,status:'REJECTED_AT_TRANSPORT',job:execution.job,routeDecision:execution.routeDecision??null,
    rawResponse:raw,rawResponseSha256,providerResponse:execution.providerResponse??null,sourceAttachmentAudit:execution.sourceAttachmentAudit??null,
    transportValidation,...safety(),errors:transportValidation.errors
  };
  return{
    pass:true,status:'TRANSPORT_VALIDATED',job:execution.job,routeDecision:execution.routeDecision??null,
    rawResponse:raw,rawResponseSha256,providerResponse:execution.providerResponse??null,sourceAttachmentAudit:execution.sourceAttachmentAudit??null,
    transportValidation,...safety(),errors:[]
  };
}

function importedJob(job,batchId,rawResponseSha256){
  return{
    ...structuredClone(job),status:'IMPORTED',
    transitions:[...(job.transitions??[]),{status:'IMPORTED',at:nowIso(),rawResponseSha256,batchId}]
  };
}

export async function runGovernedGeminiV11(job,{
  sourceAcquisition,
  sourceDelivery=null,
  geminiExecution=null,
  evidenceInboxDir='data/evidence-inbox',
  changeControlDir='data/master-change-control',
  allowDuplicateClaims=false,
  importedAt=nowIso(),
  argv=[],
  ...executionOptions
}={}){
  if(job?.workerContractVersion!=='1.1'||job?.executionMode!=='LIVE_EXTERNAL')return{
    pass:false,status:'BLOCKED',job,sourceAcquisitionValidation:null,sourceDeliveryValidation:null,geminiExecutionValidation:null,preInboxGuard:null,inboxImport:null,reviewQueue:null,reviewQueueValidation:null,...safety(),
    errors:[makeError('GOVERNED_V11_LIVE_JOB_REQUIRED','Governed v1.1 runner requires workerContractVersion=1.1 and executionMode=LIVE_EXTERNAL')]
  };
  const sourceAcquisitionValidation=validateSourceAcquisitionRecord(sourceAcquisition,{job});
  if(!sourceAcquisitionValidation.pass)return{
    pass:false,status:'BLOCKED',job,sourceAcquisitionValidation,sourceDeliveryValidation:null,geminiExecutionValidation:null,preInboxGuard:null,inboxImport:null,reviewQueue:null,reviewQueueValidation:null,...safety(),errors:sourceAcquisitionValidation.errors
  };

  let preResult;
  let resolvedDelivery=sourceDelivery;
  let resolvedExecution=geminiExecution;
  let sourceDeliveryValidation=null;
  let geminiExecutionValidation=null;

  if(job.executionChannel==='GEMINI_API'){
    preResult=await runVerifiedGeminiLiveJob(job,{...executionOptions,argv,bridgeImpl:executeGeminiTransportBoundary});
    if(!preResult.pass)return{
      ...preResult,sourceAcquisitionValidation,sourceDeliveryValidation:null,geminiExecutionValidation:null,preInboxGuard:null,inboxImport:null,reviewQueue:null,reviewQueueValidation:null
    };
    const builtDelivery=buildGeminiApiAttachmentDelivery({
      sourceAcquisition,
      sourceAttachmentAudit:preResult.sourceAttachmentAudit,
      sourceAttachment:preResult.job?.sourceAttachment??null,
      executionReference:preResult.job?.executionReference??job.executionReference??null
    });
    sourceDeliveryValidation={pass:builtDelivery.pass,errors:builtDelivery.errors};
    if(!builtDelivery.pass)return{
      pass:false,status:'BLOCKED',job:preResult.job,rawResponseSha256:preResult.rawResponseSha256,transportValidation:preResult.transportValidation,
      sourceAcquisitionValidation,sourceDeliveryValidation,geminiExecutionValidation:null,preInboxGuard:null,inboxImport:null,reviewQueue:null,reviewQueueValidation:null,...safety(),errors:builtDelivery.errors
    };
    resolvedDelivery=builtDelivery.record;
    const builtExecution=buildApiGeminiExecutionAuditPreInbox({
      job:preResult.job,sourceAcquisition,sourceDelivery:resolvedDelivery,result:preResult
    });
    geminiExecutionValidation={pass:builtExecution.pass,errors:builtExecution.errors};
    if(!builtExecution.pass)return{
      pass:false,status:'BLOCKED',job:preResult.job,rawResponseSha256:preResult.rawResponseSha256,transportValidation:preResult.transportValidation,
      sourceAcquisitionValidation,sourceDeliveryValidation,geminiExecutionValidation,preInboxGuard:null,inboxImport:null,reviewQueue:null,reviewQueueValidation:null,...safety(),errors:builtExecution.errors
    };
    resolvedExecution=builtExecution.record;
  }else if(job.executionChannel==='GEMINI_AI_PRO'){
    sourceDeliveryValidation=validateSourceDeliveryRecord(resolvedDelivery,{job,sourceAcquisition});
    if(!sourceDeliveryValidation.pass)return{
      pass:false,status:'BLOCKED',job,sourceAcquisitionValidation,sourceDeliveryValidation,geminiExecutionValidation:null,preInboxGuard:null,inboxImport:null,reviewQueue:null,reviewQueueValidation:null,...safety(),errors:sourceDeliveryValidation.errors
    };
    if(!resolvedExecution)return{
      pass:false,status:'BLOCKED',job,sourceAcquisitionValidation,sourceDeliveryValidation,geminiExecutionValidation:null,preInboxGuard:null,inboxImport:null,reviewQueue:null,reviewQueueValidation:null,...safety(),
      errors:[makeError('GEMINI_EXECUTION_AUDIT_REQUIRED','AI Pro governed handoff requires Gemini Execution Audit before Transport import')]
    };
    preResult=await executeGeminiTransportBoundary(job,executionOptions);
    if(!preResult.pass)return{
      ...preResult,sourceAcquisitionValidation,sourceDeliveryValidation,geminiExecutionValidation:null,preInboxGuard:null,inboxImport:null,reviewQueue:null,reviewQueueValidation:null
    };
    geminiExecutionValidation=validateGeminiExecutionAudit(resolvedExecution,{
      job:preResult.job,sourceAcquisition,sourceDelivery:resolvedDelivery,rawResponseSha256:preResult.rawResponseSha256
    });
    if(!geminiExecutionValidation.pass)return{
      pass:false,status:'BLOCKED',job:preResult.job,rawResponseSha256:preResult.rawResponseSha256,transportValidation:preResult.transportValidation,
      sourceAcquisitionValidation,sourceDeliveryValidation,geminiExecutionValidation,preInboxGuard:null,inboxImport:null,reviewQueue:null,reviewQueueValidation:null,...safety(),errors:geminiExecutionValidation.errors
    };
  }else return{
    pass:false,status:'BLOCKED',job,sourceAcquisitionValidation,sourceDeliveryValidation:null,geminiExecutionValidation:null,preInboxGuard:null,inboxImport:null,reviewQueue:null,reviewQueueValidation:null,...safety(),
    errors:[makeError('GOVERNED_V11_CHANNEL_INVALID',`Unsupported executionChannel ${job.executionChannel??'null'}`)]
  };

  const persisted=persistGeminiTransportAfterPreInboxGuard(preResult.rawResponse,{
    job:preResult.job,transportValidation:preResult.transportValidation,sourceAcquisition,sourceDelivery:resolvedDelivery,geminiExecution:resolvedExecution,
    rootDir:evidenceInboxDir,allowDuplicateClaims,importedAt
  });
  if(!persisted.pass)return{
    pass:false,status:persisted.status,job:preResult.job,rawResponseSha256:preResult.rawResponseSha256,transportValidation:preResult.transportValidation,
    sourceAcquisitionValidation,sourceDeliveryContext:resolvedDelivery,sourceDeliveryValidation,geminiExecutionContext:resolvedExecution,geminiExecutionValidation,
    preInboxGuard:persisted.preInboxGuard,inboxImport:persisted.inboxImport,reviewQueue:null,reviewQueueValidation:null,...safety(),errors:persisted.errors
  };
  const finalJob=importedJob(preResult.job,persisted.normalizedBatchId,persisted.rawResponseSha256);
  const reviewQueue=buildProductMasterReviewQueue({evidenceInboxDir,changeControlDir,productId:finalJob.productId});
  const reviewQueueValidation=validateGovernedReviewQueue(reviewQueue,{job:finalJob,transportValidation:preResult.transportValidation});
  if(!reviewQueueValidation.pass)return{
    pass:false,status:'BLOCKED_AT_REVIEW_QUEUE',job:finalJob,routeDecision:preResult.routeDecision??null,rawResponseSha256:persisted.rawResponseSha256,
    responseReceivedAt:importedAt,normalizedBatchId:persisted.normalizedBatchId,sourceAttachmentAudit:preResult.sourceAttachmentAudit??null,
    transportValidation:preResult.transportValidation,sourceAcquisitionContext:sourceAcquisition,sourceAcquisitionValidation,
    sourceDeliveryContext:resolvedDelivery,sourceDeliveryValidation,geminiExecutionContext:resolvedExecution,geminiExecutionValidation,
    transportProvenance:persisted.transportProvenance,preInboxGuard:persisted.preInboxGuard,inboxImport:persisted.inboxImport,
    executionContext:persisted.executionContext,reviewQueue,reviewQueueValidation,...safety(),errors:reviewQueueValidation.errors
  };
  return{
    pass:true,status:'IMPORTED',job:finalJob,routeDecision:preResult.routeDecision??null,rawResponseSha256:persisted.rawResponseSha256,
    responseReceivedAt:importedAt,normalizedBatchId:persisted.normalizedBatchId,sourceAttachmentAudit:preResult.sourceAttachmentAudit??null,
    transportValidation:preResult.transportValidation,sourceAcquisitionContext:sourceAcquisition,sourceAcquisitionValidation,
    sourceDeliveryContext:resolvedDelivery,sourceDeliveryValidation,geminiExecutionContext:resolvedExecution,geminiExecutionValidation,
    transportProvenance:persisted.transportProvenance,preInboxGuard:persisted.preInboxGuard,inboxImport:persisted.inboxImport,
    executionContext:persisted.executionContext,reviewQueue,reviewQueueValidation,...safety(),errors:[]
  };
}
