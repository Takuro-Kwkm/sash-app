import { readJson,writeJson,currentExactHead } from './governance-lib.mjs';
const config=readJson('project-governance/project-state.json');
const policy=readJson('project-governance/human-review-policy.json');
const review=readJson('artifacts/governance/human-flow-review.json');
const head=currentExactHead();
let human={status:'BLOCKED',reviewed_exact_head:null,review_artifact_identity:null,human_approval_reference:null,approved_at:null};
let latest=null;
for(let page=1;;page++){
 const r=await fetch(`https://api.github.com/repos/${config.repository}/issues/24/comments?per_page=100&page=${page}`,{headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json'}});
 if(!r.ok)throw Error(`APPROVAL_READ_FAILED_${r.status}`);
 const rows=await r.json();
 for(const row of rows){
  if(!policy.authorized_github_logins.includes(row.user?.login)||row.user?.type!=='User'||!row.body?.startsWith('HUMAN_FLOW_REVIEW_APPROVAL\n'))continue;
  let a;try{a=JSON.parse(row.body.slice('HUMAN_FLOW_REVIEW_APPROVAL\n'.length));}catch{continue;}
  if(a.reviewed_exact_head!==head||a.review_artifact_identity!==review.review_artifact_identity)continue;
  if(!latest||row.id>latest.id)latest={...a,id:row.id,url:row.html_url,updated_at:row.updated_at};
 }
 if(rows.length<100)break;
}
if(latest?.decision==='APPROVE')human={status:'PASS',reviewed_exact_head:head,review_artifact_identity:review.review_artifact_identity,human_approval_reference:latest.url,approved_at:latest.updated_at};
writeJson('artifacts/governance/human-approval-observation.json',{...human,exact_head:head,source:'GITHUB_PR_COMMENT_BY_AUTHORIZED_HUMAN',observed_at:new Date().toISOString()});
console.log(`EXPLICIT_HUMAN_APPROVAL=${human.status}`);
