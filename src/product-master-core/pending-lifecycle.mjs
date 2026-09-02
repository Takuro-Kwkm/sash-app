export const PENDING_STATUSES=new Set(['OPEN','INVESTIGATING','RESOLVED','REJECTED']);
const ALLOWED_TRANSITIONS=new Map([
  ['OPEN',new Set(['INVESTIGATING','RESOLVED','REJECTED'])],
  ['INVESTIGATING',new Set(['OPEN','RESOLVED','REJECTED'])],
  ['RESOLVED',new Set()],
  ['REJECTED',new Set()]
]);

export const isUnresolvedPending=(issue)=>['OPEN','INVESTIGATING'].includes(issue?.status);

export function transitionPending(issue,nextStatus,{
  evidenceIds=[],technicalFactIds=[],ruleIds=[],resolutionNote=null,
  at=new Date().toISOString(),by='CHATGPT'
}={}){
  if(!PENDING_STATUSES.has(issue?.status))throw new Error(`Invalid current PENDING status: ${issue?.status}`);
  if(!PENDING_STATUSES.has(nextStatus))throw new Error(`Invalid next PENDING status: ${nextStatus}`);
  if(!ALLOWED_TRANSITIONS.get(issue.status)?.has(nextStatus))throw new Error(`Invalid PENDING transition: ${issue.status} -> ${nextStatus}`);
  if(nextStatus==='RESOLVED'&&evidenceIds.length===0&&technicalFactIds.length===0)throw new Error('RESOLVED PENDING requires resolution Evidence or Technical Fact');
  if(nextStatus==='RESOLVED'&&!resolutionNote)throw new Error('RESOLVED PENDING requires resolution note');
  const history=[...(issue.history??[]),{from:issue.status,to:nextStatus,at,by}];
  return{
    ...issue,status:nextStatus,history,
    ...(nextStatus==='RESOLVED'?{
      resolutionEvidenceIds:[...evidenceIds],
      resolutionTechnicalFactIds:[...technicalFactIds],
      resolutionRuleIds:[...ruleIds],resolutionNote,resolvedAt:at,resolvedBy:by
    }:{})
  };
}
