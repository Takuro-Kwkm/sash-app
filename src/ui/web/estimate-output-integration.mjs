import { createEstimateOutputModel, outputStateLabel } from '/estimate-output/model.mjs';
import { createEstimatePdfBlob, estimatePdfFileName } from '/estimate-output/pdf-renderer.mjs';
import { createEstimateXlsxBlob, estimateXlsxFileName } from '/estimate-output/xlsx-renderer.mjs';

const esc=(value)=>String(value??'').replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#39;"})[character]);
const show=(value)=>value===null||value===undefined||value===''?'—':esc(value);

function identity(){
  const parts=location.pathname.split('/').filter(Boolean);
  if(parts[0]!=='projects'||parts[2]!=='estimates'||!parts[1]||!parts[3])return null;
  if(parts[4]&&parts[4]!=='summary')return null;
  return {projectId:parts[1],estimateId:parts[3]};
}

function modelFor(route){
  const db=window.__sashWorkApp?.readDatabase?.();
  const project=(db?.projects??[]).find((row)=>row.project_id===route.projectId&&!row.deleted_at);
  const estimate=(db?.estimates??[]).find((row)=>row.estimate_id===route.estimateId&&!row.deleted_at);
  if(!project||!estimate)throw new Error('対象の案件または見積が見つかりません。');
  const openings=(db?.openings??[]).filter((row)=>row.estimate_id===route.estimateId&&!row.deleted_at).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));
  return createEstimateOutputModel({project,estimate,openings});
}

function saveBlob(blob,fileName){
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=fileName;link.hidden=true;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function renderOutput(route){
  const model=modelFor(route);const main=document.querySelector('#appMain');if(!main)return;
  const header=document.querySelector('#headerContext');if(header)header.textContent='見積出力';
  main.innerHTML=outputMarkup(model);
  document.querySelector('#estimateOutputBack')?.addEventListener('click',(event)=>{event.preventDefault();const url=new URL(location.href);url.searchParams.delete('estimateOutput');history.replaceState({},'',url.pathname);window.dispatchEvent(new PopStateEvent('popstate'));});
  document.querySelector('#estimateOutputPdf')?.addEventListener('click',()=>saveBlob(createEstimatePdfBlob(model),estimatePdfFileName(model)));
  document.querySelector('#estimateOutputExcel')?.addEventListener('click',()=>saveBlob(createEstimateXlsxBlob(model),estimateXlsxFileName(model)));
  document.querySelector('#estimateOutputPrint')?.addEventListener('click',()=>window.print());
}

function outputMarkup(model){
  return `<div class="breadcrumbs"><a href="${esc(location.pathname)}" id="estimateOutputBack">見積へ戻る</a></div>
  <div class="page-heading estimate-output-heading"><div><div class="eyebrow">商品仕様見積依頼書</div><h1>見積出力</h1><p class="lead">${show(model.project.project_name)} · 見積 ${model.estimate.estimate_no} · Revision ${model.estimate.revision_no}</p></div><div class="button-row estimate-output-actions"><button class="button" id="estimateOutputPrint">印刷</button><button class="button" id="estimateOutputExcel">Excel</button><button class="button primary" id="estimateOutputPdf">PDF</button></div></div>
  <div class="notice ${model.state==='COMPLETE'?'success':'warning'}"><strong>出力前確認: ${esc(outputStateLabel(model.state))}</strong><p>金額未保持の場合は0円を補わず、要確認として出力します。</p></div>
  <section class="card"><dl class="detail-grid"><div><dt>依頼会社</dt><dd>${show(model.project.request_company)}</dd></div><div><dt>依頼会社担当</dt><dd>${show(model.project.request_company_contact)}</dd></div><div><dt>営業担当</dt><dd>${show(model.project.sales_person)}</dd></div><div><dt>施主名</dt><dd>${show(model.project.customer_name)}</dd></div><div class="span-2"><dt>住所</dt><dd>${show(model.project.address)}</dd></div></dl></section>
  <section class="estimate-output-counts"><div><strong>${model.counts.total}</strong><span>全件</span></div><div><strong>${model.counts.complete}</strong><span>完了</span></div><div><strong>${model.counts.incomplete}</strong><span>未入力</span></div><div><strong>${model.counts.needs_confirmation}</strong><span>要確認</span></div><div><strong>${model.counts.invalid}</strong><span>無効</span></div></section>
  <section class="summary-table-wrap estimate-output-table-wrap"><table class="estimate-summary"><thead><tr><th>No.</th><th>部屋 / 位置</th><th>メーカー / シリーズ</th><th>窓・ドア種類</th><th>主要仕様</th><th>サイズ</th><th>状態</th><th>監査情報</th></tr></thead><tbody>${model.rows.map((row)=>`<tr><td>${row.opening_no}</td><td><strong>${show(row.room_name)}</strong><small>${show(row.location)} / ${show(row.opening_name)}</small></td><td>${show(row.manufacturer)}<small>${show(row.series)}</small></td><td>${show(row.opening_type)}</td><td>${show(row.major_specifications)}</td><td>${show(row.size)}</td><td>${esc(outputStateLabel(row.state))}<small>${row.issues.map((issue)=>esc(issue.message)).join('<br>')}</small></td><td><small>${show(row.audit?.package_version)}<br>${show(row.audit?.validation_state)}<br>${show(row.audit?.source_mode)}</small></td></tr>`).join('')}</tbody></table></section>`;
}

function sync(){
  const route=identity();if(!route)return;
  const outputMode=new URL(location.href).searchParams.get('estimateOutput')==='1';
  if(outputMode){if(!document.querySelector('#estimateOutputPdf'))renderOutput(route);return;}
  if(document.querySelector('#estimateOutputLaunch'))return;
  const actions=document.querySelector('.page-heading > .button-row');if(!actions)return;
  const button=document.createElement('button');button.type='button';button.className='button';button.id='estimateOutputLaunch';button.textContent='見積出力';
  button.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('estimateOutput','1');history.pushState({},'',url);renderOutput(route);});
  actions.prepend(button);
}

new MutationObserver(()=>queueMicrotask(sync)).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('popstate',()=>queueMicrotask(sync));queueMicrotask(sync);
