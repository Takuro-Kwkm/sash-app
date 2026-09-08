import fs from'node:fs';
import path from'node:path';
import{buildProductMasterReviewQueue}from'./review-queue.mjs';

const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const json=(value)=>esc(JSON.stringify(value??null));
const statusOrder=['BLOCKED','HUMAN_REQUIRED','NEEDS_REVIEW','SUBMITTED','UNDER_REVIEW','APPROVED','APPLIED','RESOLVED','REJECTED'];

export function renderProductMasterReviewSurface(queue,{title='Product Master Review Queue'}={}){
  const items=[...queue.items].sort((a,b)=>{
    const ai=statusOrder.indexOf(a.reviewStatus),bi=statusOrder.indexOf(b.reviewStatus);
    return(ai<0?99:ai)-(bi<0?99:bi)||String(a.productId??'').localeCompare(String(b.productId??''))||String(a.sourceId).localeCompare(String(b.sourceId));
  });
  const rows=items.map((item)=>`<tr data-status="${esc(item.reviewStatus)}" data-kind="${esc(item.kind)}">
<td>${esc(item.productId)}</td><td>${esc(item.kind)}</td><td><code>${esc(item.sourceId)}</code></td>
<td><span class="status">${esc(item.reviewStatus)}</span></td><td>${esc(item.sourceStatus)}</td><td>${esc(item.sourceDecision)}</td>
<td>${esc(item.authority)}</td><td>${esc(item.nextAction)}</td><td>${esc(item.queueReason)}</td><td><code>${json(item.artifactState)}</code></td></tr>`).join('');
  const chips=statusOrder.filter((status)=>queue.summary.byStatus?.[status]).map((status)=>`<button type="button" data-filter="${esc(status)}">${esc(status)} <strong>${queue.summary.byStatus[status]}</strong></button>`).join('');
  return`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;margin:0;background:#f6f7f8;color:#17191c}main{max-width:1500px;margin:auto;padding:24px}.card{background:white;border:1px solid #dfe3e8;border-radius:12px;padding:18px;margin-bottom:16px}h1{margin:0 0 8px}.lead{color:#545b66}.toolbar{display:flex;gap:8px;flex-wrap:wrap}.toolbar button{border:1px solid #cbd1d8;background:#fff;border-radius:999px;padding:7px 11px;cursor:pointer}.toolbar button.active{font-weight:700;outline:2px solid currentColor}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #e5e8ec;text-align:left;padding:9px;vertical-align:top}th{position:sticky;top:0;background:#fff}.scroll{overflow:auto;max-height:70vh}.status{font-weight:700}code{font-size:12px;white-space:pre-wrap}.boundary{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}.boundary div{padding:10px;background:#f6f7f8;border-radius:8px}</style></head>
<body><main><section class="card"><h1>${esc(title)}</h1><p class="lead">Read-only operator surface. Review Queueには変更権限がありません。Canonical / Runtime / Productionへの直接書込みは行いません。</p>
<div class="boundary"><div>Total: <strong>${queue.summary.total}</strong></div><div>Actionable: <strong>${queue.summary.actionable}</strong></div><div>Master approval: <strong>${esc(queue.authorityBoundary.masterChangeApproval)}</strong></div><div>Queue mutation: <strong>${esc(queue.authorityBoundary.queueMutationAuthority)}</strong></div></div></section>
<section class="card"><div class="toolbar"><button type="button" data-filter="ALL" class="active">ALL <strong>${queue.summary.total}</strong></button>${chips}</div></section>
<section class="card scroll"><table><thead><tr><th>Product</th><th>Kind</th><th>Source ID</th><th>Review Status</th><th>Source Status</th><th>Decision</th><th>Authority</th><th>Next Action</th><th>Reason</th><th>Artifact State</th></tr></thead><tbody>${rows}</tbody></table></section></main>
<script>const buttons=[...document.querySelectorAll('[data-filter]')],rows=[...document.querySelectorAll('tbody tr')];for(const button of buttons)button.addEventListener('click',()=>{for(const b of buttons)b.classList.remove('active');button.classList.add('active');const filter=button.dataset.filter;for(const row of rows)row.hidden=filter!=='ALL'&&row.dataset.status!==filter;});</script></body></html>`;
}

export function writeProductMasterReviewSurface({
  evidenceInboxDir='data/evidence-inbox',
  changeControlDir='data/master-change-control',
  outputDir='artifacts/product-master-review',
  productId=null,
  actionableOnly=false,
  generatedAt=new Date().toISOString()
}={}){
  const queue=buildProductMasterReviewQueue({evidenceInboxDir,changeControlDir,productId,actionableOnly,generatedAt});
  const absolute=path.resolve(outputDir);
  fs.mkdirSync(absolute,{recursive:true});
  const htmlPath=path.join(absolute,'index.html');
  const jsonPath=path.join(absolute,'queue.json');
  fs.writeFileSync(htmlPath,renderProductMasterReviewSurface(queue,{title:productId?`Product Master Review Queue — ${productId}`:'Product Master Review Queue'}),'utf8');
  fs.writeFileSync(jsonPath,`${JSON.stringify(queue,null,2)}\n`,'utf8');
  return{pass:true,htmlPath,jsonPath,queue,mutationPerformed:false};
}
