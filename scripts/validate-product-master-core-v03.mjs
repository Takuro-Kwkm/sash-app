import{APW430_GEMINI_INBOX_POC}from'../src/product-master-core/poc/apw430-gemini-inbox-poc.mjs';
import{validateEvidenceCandidate}from'../src/product-master-core/evidence-inbox.mjs';
import{validateProductMasterCore}from'../src/product-master-core/validator.mjs';
import{evaluatePhaseGate}from'../src/product-master-core/gate-engine.mjs';

const master=APW430_GEMINI_INBOX_POC.acceptedMaster;
const nodeIds=new Set(master.productNodes.map((row)=>row.id));
const knownFields=new Set(master.fields);
const candidates=APW430_GEMINI_INBOX_POC.candidates.map((candidate)=>({
  id:candidate.id,producerMode:candidate.producerMode,
  validation:validateEvidenceCandidate(candidate,{productId:master.product.id,knownFields,nodeIds})
}));
const acceptedValidation=validateProductMasterCore(master);
const acceptedGate=evaluatePhaseGate(master);
const blockedGate=evaluatePhaseGate(APW430_GEMINI_INBOX_POC.blockedMaster);
const result={
  coreVersion:APW430_GEMINI_INBOX_POC.coreVersion,
  liveGeminiConnected:APW430_GEMINI_INBOX_POC.liveGeminiConnected,
  candidates,
  decisions:Object.fromEntries(Object.entries(APW430_GEMINI_INBOX_POC.adjudications).map(([key,value])=>[key,{decision:value.audit.decision,evidenceId:value.evidence?.id??null,pendingId:value.pending?.id??null}])),
  acceptedMaster:{validation:acceptedValidation,gate:acceptedGate},
  pendingPath:{gate:blockedGate}
};
console.log(JSON.stringify(result,null,2));
if(candidates.some((row)=>!row.validation.pass)||!acceptedValidation.pass||!acceptedGate.pass||blockedGate.pass)process.exitCode=1;
