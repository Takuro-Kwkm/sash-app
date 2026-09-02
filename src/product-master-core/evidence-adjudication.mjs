import{EVIDENCE_SCHEMA_VERSION}from'./evidence-schema.mjs';
import{validateEvidenceCandidate}from'./evidence-inbox.mjs';

export const EVIDENCE_ADJUDICATION_DECISIONS=new Set(['ACCEPT','REJECT','PENDING']);
export const EVIDENCE_ADJUDICATOR_TYPES=new Set(['CHATGPT','HUMAN']);

export function adjudicateEvidenceCandidate(candidate,decision,{
  adjudicatorType='CHATGPT',adjudicatedBy='CHATGPT',reason,
  canonicalEvidenceId=null,pendingId=null,pendingSeverity='NON_BLOCKING',pendingQuestion=null,
  at=new Date().toISOString()
}={}){
  const validation=validateEvidenceCandidate(candidate);
  if(!validation.pass)throw new Error(validation.errors.map((row)=>`${row.code}: ${row.message}`).join('\n'));
  if(!EVIDENCE_ADJUDICATION_DECISIONS.has(decision))throw new Error(`Unsupported Evidence adjudication decision: ${decision}`);
  if(!EVIDENCE_ADJUDICATOR_TYPES.has(adjudicatorType))throw new Error(`Unsupported adjudicatorType: ${adjudicatorType}. Gemini/NotebookLM cannot adjudicate Canonical Evidence.`);
  if(!adjudicatedBy)throw new Error('adjudicatedBy is required');
  if(!reason)throw new Error('Adjudication reason is required');
  if(!['SUBMITTED','UNDER_REVIEW'].includes(candidate.status))throw new Error(`Candidate cannot be adjudicated from status ${candidate.status}`);

  const audit={
    id:`ADJ-${candidate.id}`,recordType:'EVIDENCE_ADJUDICATION',candidateId:candidate.id,decision,
    adjudicatorType,adjudicatedBy,reason,adjudicatedAt:at
  };
  const updatedCandidate={...candidate,status:'ADJUDICATED',adjudicationId:audit.id};

  if(decision==='ACCEPT'){
    if(!canonicalEvidenceId)throw new Error('ACCEPT requires canonicalEvidenceId');
    const evidence={
      schemaVersion:EVIDENCE_SCHEMA_VERSION,id:canonicalEvidenceId,productId:candidate.productId,
      status:'VERIFIED',strength:candidate.proposedStrength,title:candidate.title,subjectField:candidate.subjectField,
      claim:candidate.claim,productNodeIds:[...(candidate.productNodeIds??[])],source:{...candidate.source},
      adjudication:{
        extractedBy:candidate.sourceSystem,adjudicatedBy,status:'ACCEPTED',reason,
        sourceCandidateId:candidate.id,adjudicatorType
      },
      provenance:{candidateId:candidate.id,candidateSourceSystem:candidate.sourceSystem,producerMode:candidate.producerMode??'UNKNOWN'}
    };
    return{candidate:updatedCandidate,audit,evidence,pending:null};
  }

  if(decision==='PENDING'){
    if(!pendingId)throw new Error('PENDING decision requires pendingId');
    const pending={
      id:pendingId,status:'OPEN',severity:pendingSeverity,type:'EVIDENCE_CANDIDATE_REVIEW',field:candidate.subjectField,
      productNodeId:candidate.productNodeIds?.[0]??null,sourceCandidateId:candidate.id,
      question:pendingQuestion??`Evidence Candidate requires further verification: ${candidate.claim}`,
      reviewReason:reason,history:[{from:null,to:'OPEN',at,by:adjudicatedBy}]
    };
    return{candidate:updatedCandidate,audit,evidence:null,pending};
  }

  return{candidate:updatedCandidate,audit,evidence:null,pending:null};
}
