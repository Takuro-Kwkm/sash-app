import fs from'node:fs';
import path from'node:path';
import{
  adjudicatePersistedCandidate,evidenceAdjudicationSummary,
  persistCandidateUnderReview,transitionPersistedPending
}from'../src/product-master-core/evidence-adjudication-store.mjs';
import{registerPersistedTransportIssue}from'../src/product-master-core/transport-issue-lifecycle.mjs';

const rootDir=path.resolve(process.env.EVIDENCE_INBOX_DIR??'data/evidence-inbox');
const argv=process.argv.slice(2);
const command=argv.shift();

function fail(message,code=2){console.error(message);process.exit(code);}
function parseOptions(args){
  const options={};
  for(const arg of args){
    if(!arg.startsWith('--'))continue;
    const index=arg.indexOf('=');
    const key=(index<0?arg.slice(2):arg.slice(2,index)).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    const value=index<0?true:arg.slice(index+1);
    if(options[key]===undefined)options[key]=value;
    else if(Array.isArray(options[key]))options[key].push(value);
    else options[key]=[options[key],value];
  }
  return options;
}
function arrayValue(value){return value===undefined?[]:Array.isArray(value)?value:[value];}
function loadExternalCanonical(file){
  if(!file)return[];
  const parsed=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));
  if(Array.isArray(parsed))return parsed;
  if(Array.isArray(parsed.evidence))return parsed.evidence;
  if(Array.isArray(parsed.canonicalEvidence))return parsed.canonicalEvidence;
  throw new Error('Existing Canonical Evidence file must be an array or contain evidence/canonicalEvidence array');
}
function emit(result){
  console.log(JSON.stringify(result,null,2));
  process.exit(result?.pass===false?1:0);
}

if(!command)fail('Usage: npm run evidence:adjudicate -- <review|adjudicate|issue|pending|summary> ...');

if(command==='summary')emit({pass:true,status:'EVIDENCE_ADJUDICATION_SUMMARY',rootDir,summary:evidenceAdjudicationSummary(rootDir)});

if(command==='review'){
  const batchId=argv.shift();
  const candidateId=argv.shift();
  if(!batchId||!candidateId)fail('Usage: ... review <batchId> <candidateId> [--by=CHATGPT]');
  const opts=parseOptions(argv);
  emit(persistCandidateUnderReview({rootDir,batchId,candidateId,by:opts.by??'CHATGPT'}));
}

if(command==='adjudicate'){
  const batchId=argv.shift();
  const candidateId=argv.shift();
  const decision=argv.shift();
  if(!batchId||!candidateId||!decision)fail('Usage: ... adjudicate <batchId> <candidateId> <ACCEPT|REJECT|PENDING> --reason=...');
  const opts=parseOptions(argv);
  if(!opts.reason)fail('--reason is required');
  let existingCanonicalEvidence=[];
  try{existingCanonicalEvidence=loadExternalCanonical(opts.existingCanonicalFile);}catch(err){fail(err.message);}
  emit(adjudicatePersistedCandidate({
    rootDir,batchId,candidateId,decision,
    reason:opts.reason,
    adjudicatorType:opts.adjudicatorType??'CHATGPT',
    adjudicatedBy:opts.by??'CHATGPT',
    canonicalEvidenceId:opts.canonicalEvidenceId??null,
    pendingId:opts.pendingId??null,
    pendingSeverity:opts.pendingSeverity??'NON_BLOCKING',
    pendingQuestion:opts.pendingQuestion??null,
    existingCanonicalEvidence
  }));
}

if(command==='issue'){
  const batchId=argv.shift();
  const issueId=argv.shift();
  const pendingId=argv.shift();
  if(!batchId||!issueId||!pendingId)fail('Usage: ... issue <batchId> <issueId> <pendingId> [--severity=NON_BLOCKING|BLOCKING] [--by=CHATGPT]');
  const opts=parseOptions(argv);
  emit(registerPersistedTransportIssue({
    rootDir,batchId,issueId,pendingId,
    severity:opts.severity??'NON_BLOCKING',
    by:opts.by??'CHATGPT'
  }));
}

if(command==='pending'){
  const pendingId=argv.shift();
  const nextStatus=argv.shift();
  if(!pendingId||!nextStatus)fail('Usage: ... pending <pendingId> <OPEN|INVESTIGATING|RESOLVED|REJECTED> [options]');
  const opts=parseOptions(argv);
  emit(transitionPersistedPending({
    rootDir,pendingId,nextStatus,
    evidenceIds:arrayValue(opts.evidenceId),
    technicalFactIds:arrayValue(opts.technicalFactId),
    ruleIds:arrayValue(opts.ruleId),
    resolutionNote:opts.resolutionNote??null,
    externalCanonicalEvidenceIds:arrayValue(opts.externalEvidenceId),
    externalTechnicalFactIds:arrayValue(opts.externalTechnicalFactId),
    by:opts.by??'CHATGPT'
  }));
}

fail(`Unknown command: ${command}`);
