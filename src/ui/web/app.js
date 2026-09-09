import { SaveStatus, openingDisplayName } from '/work-management/domain.mjs';
import { BrowserStorageDocumentStore } from '/work-management/storage.mjs';
import { createRepositoryBundle } from '/work-management/repositories.mjs';
import { WorkManagementService } from '/work-management/service.mjs';
import { ProductConfigurationEditor } from './product-configuration-editor.mjs';

const $=(selector)=>document.querySelector(selector);
const esc=(value)=>String(value??'').replace(/[&<>'\"]/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"})[character]);
const display=(value,fallback='—')=>value?esc(value):fallback;
const dateTime=(value)=>value?new Intl.DateTimeFormat('ja-JP',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'—';
const address=(project)=>[project.postal_code?`〒${project.postal_code}`:null,project.prefecture,project.city,project.street,project.building].filter(Boolean).join(' ')||'住所未入力';
const draftKey=(id)=>`sash.work-draft.${id}`;

let persistenceFailure=false;
const controlledStorage={
  getItem:(key)=>localStorage.getItem(key),
  setItem:(key,value)=>{if(persistenceFailure)throw new Error('simulated persistence failure');localStorage.setItem(key,value);},
  removeItem:(key)=>localStorage.removeItem(key),
};
const store=new BrowserStorageDocumentStore(controlledStorage);
const repositories=createRepositoryBundle(store);
const service=new WorkManagementService(repositories);
let activeProductEditor=null;
let activeNavigationFlush=null;
let activePageHideHandler=null;
let activeOpeningLifecycle=null;
let renderedPath=location.pathname;

window.__sashWorkApp={
  setPersistenceFailure(value){persistenceFailure=Boolean(value);},
  storageKey:'sash.work-management.v1',
  readDatabase:()=>store.read(),
};

function setHeader(label,status='LOCAL SAVED'){
  $('#headerContext').textContent=label;
  const badge=$('#status');badge.textContent=status;badge.classList.toggle('ok',status!=='SAVE FAILED');
  $('#build').textContent='案件・見積・開口部管理 v1.0 · Browser Repository';
}
function clearPageHideHandler(){
  if(activePageHideHandler)window.removeEventListener('pagehide',activePageHideHandler);
  activePageHideHandler=null;
}
function deactivateOpeningLifecycle(){
  if(activeOpeningLifecycle)activeOpeningLifecycle.active=false;
  activeOpeningLifecycle=null;
}
async function flushActiveEditor(){
  if(!activeNavigationFlush)return true;
  const ok=await activeNavigationFlush();
  if(ok){activeNavigationFlush=null;clearPageHideHandler();}
  return ok;
}
async function navigate(path,{replace=false}={}){
  if(!await flushActiveEditor())return;
  history[replace?'replaceState':'pushState']({},'',path);renderedPath=location.pathname;
  await renderRoute();
}
function button(label,{action='',nav='',kind='secondary',disabled=false}={}){
  return `<button type="button" class="button ${kind}" ${action?`data-action="${action}"`:''} ${nav?`data-nav="${nav}"`:''}${disabled?' disabled':''}>${esc(label)}</button>`;
}
function snapshotValue(snapshot,keys){
  const row=(snapshot?.display_summary??[]).find((item)=>keys.includes(item.key));return row?.value??null;
}

function projectForm(project={}){
  return `<form id="projectForm" class="form-grid">
    <div class="field span-2"><label>物件名<span class="required">必須</span></label><input name="project_name" required value="${esc(project.project_name??'')}"></div>
    <div class="field"><label>依頼会社</label><input name="request_company" value="${esc(project.request_company??'')}"></div>
    <div class="field"><label>依頼会社担当</label><input name="request_company_contact" value="${esc(project.request_company_contact??'')}"></div>
    <div class="field"><label>営業担当</label><input name="sales_person" value="${esc(project.sales_person??'')}"></div>
    <div class="field"><label>施主名</label><input name="customer_name" value="${esc(project.customer_name??'')}"></div>
    <div class="field"><label>郵便番号</label><input name="postal_code" inputmode="numeric" value="${esc(project.postal_code??'')}"></div>
    <div class="field"><label>都道府県</label><input name="prefecture" value="${esc(project.prefecture??'')}"></div>
    <div class="field"><label>市区町村</label><input name="city" value="${esc(project.city??'')}"></div>
    <div class="field"><label>番地</label><input name="street" value="${esc(project.street??'')}"></div>
    <div class="field span-2"><label>建物名</label><input name="building" value="${esc(project.building??'')}"></div>
    <div class="field"><label>案件種別</label><select name="project_type"><option value="">選択してください</option><option value="NEW_BUILD" ${project.project_type==='NEW_BUILD'?'selected':''}>新築</option><option value="RENOVATION" ${project.project_type==='RENOVATION'?'selected':''}>リフォーム</option><option value="OTHER" ${project.project_type==='OTHER'?'selected':''}>その他</option></select></div>
    <div class="field span-2"><label>備考</label><textarea name="memo" rows="4">${esc(project.memo??'')}</textarea></div>
    <div class="form-actions span-2"><button class="button primary" type="submit">保存</button>${button('キャンセル',{nav:project.project_id?`/projects/${project.project_id}`:'/'})}</div>
    <div id="formError" class="notice error span-2" hidden></div>
  </form>`;
}

function formData(form){return Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,String(value).trim()||null]));}

async function renderProjectList(){
  setHeader('案件一覧');const projects=await service.listProjects();
  $('#appMain').innerHTML=`<div class="page-heading"><div><h1>案件一覧</h1><p class="lead">案件ごとに見積と複数の開口部を管理します。</p></div>${button('新しい案件',{nav:'/projects/new',kind:'primary'})}</div>
    <section class="project-list">${projects.length?projects.map((project)=>`<article class="project-card">
      <div class="project-card-main"><div class="eyebrow">${display(project.request_company,'依頼会社未入力')}</div><h2>${esc(project.project_name)}</h2><p>${esc(address(project))}</p>
      <div class="meta-row"><span>営業 ${display(project.sales_person)}</span><span>開口 ${project.opening_count}</span><span>${display(project.estimate_status,'見積なし')}</span><span>更新 ${dateTime(project.updated_at)}</span></div></div>
      <div class="card-actions">${button('案件を開く',{nav:`/projects/${project.project_id}`,kind:'primary'})}${button('編集',{nav:`/projects/${project.project_id}/edit`})}</div>
    </article>`).join(''):`<section class="empty-state"><h2>最初の案件を作成しましょう</h2><p>物件名だけで開始でき、あとから依頼会社や住所を追加できます。</p>${button('新しい案件',{nav:'/projects/new',kind:'primary'})}</section>`}</section>
    <div class="developer-link"><a href="/runtime-lab" data-nav="/runtime-lab">商品Runtime UI 単体確認</a></div>`;
}

async function renderProjectEditor(projectId){
  const project=projectId?await repositories.projects.require(projectId):{};setHeader(projectId?'案件編集':'新規案件');
  $('#appMain').innerHTML=`<section class="card"><h1>${projectId?'案件を編集':'新しい案件'}</h1><p class="lead">商品仕様とは分けて、物件・依頼元の情報を登録します。</p>${projectForm(project)}</section>`;
  $('#projectForm').addEventListener('submit',async(event)=>{
    event.preventDefault();const error=$('#formError');error.hidden=true;
    try{
      if(projectId){await service.updateProject(projectId,formData(event.currentTarget),{expectedUpdatedAt:project.updated_at});navigate(`/projects/${projectId}`);}
      else{const created=await service.createProject(formData(event.currentTarget));navigate(`/projects/${created.project.project_id}`);}
    }catch(cause){error.hidden=false;error.textContent=cause.message;}
  });
}

async function renderProjectDetail(projectId){
  const {project,estimates}=await service.getProjectDetail(projectId);setHeader(project.project_name);
  $('#appMain').innerHTML=`<div class="breadcrumbs"><a href="/" data-nav="/">案件一覧</a><span>/</span><strong>${esc(project.project_name)}</strong></div>
    <section class="card"><div class="section-heading"><div><div class="eyebrow">${esc(project.status)}</div><h1>${esc(project.project_name)}</h1></div><div class="button-row">${button('編集',{nav:`/projects/${projectId}/edit`})}${button('Archive',{action:'archive-project'})}</div></div>
      <dl class="detail-grid"><div><dt>依頼会社</dt><dd>${display(project.request_company)}</dd></div><div><dt>依頼会社担当</dt><dd>${display(project.request_company_contact)}</dd></div><div><dt>営業担当</dt><dd>${display(project.sales_person)}</dd></div><div><dt>施主名</dt><dd>${display(project.customer_name)}</dd></div><div class="span-2"><dt>住所</dt><dd>${esc(address(project))}</dd></div><div class="span-2"><dt>備考</dt><dd>${display(project.memo)}</dd></div></dl>
    </section>
    <div class="section-heading"><div><h2>見積</h2><p class="lead">案件内の見積Revisionを分離して管理します。</p></div>${button('見積を追加',{action:'add-estimate'})}</div>
    <section class="estimate-list">${estimates.map((estimate)=>`<article class="estimate-card"><div><div class="eyebrow">見積 ${estimate.estimate_no} · Revision ${estimate.revision_no}</div><h2>${esc(estimate.estimate_title??'見積')}</h2><p>開口 ${estimate.opening_count}件 · ${esc(estimate.status)}</p></div>${button('見積を開く',{nav:`/projects/${projectId}/estimates/${estimate.estimate_id}`,kind:'primary'})}</article>`).join('')}</section>`;
  $('[data-action="add-estimate"]').addEventListener('click',async()=>{const estimate=await service.createEstimate(projectId,{estimate_title:`見積 ${estimates.length+1}`});navigate(`/projects/${projectId}/estimates/${estimate.estimate_id}`);});
  $('[data-action="archive-project"]').addEventListener('click',async()=>{if(confirm('この案件をArchiveしますか？')){await service.archiveProject(projectId);navigate('/');}});
}

function openingCard(projectId,estimateId,opening,index,total){
  const snapshot=opening.product_configuration_snapshot;
  return `<article class="opening-card" data-opening-id="${opening.opening_id}"><div class="opening-number">${String(opening.opening_no).padStart(2,'0')}</div><div class="opening-content">
    <div class="section-heading"><div><div class="eyebrow">${esc(opening.status)}</div><h3>${esc(openingDisplayName(opening))}</h3></div><span class="state-pill ${opening.status.toLowerCase()}">${opening.status==='COMPLETE'?'入力完了':'入力途中'}</span></div>
    <div class="opening-spec"><span>${display(snapshot?.manufacturer)}</span><strong>${display(snapshot?.series)}</strong><span>${display(snapshotValue(snapshot,['window_type','opening_type','door_type']))}</span><span>${display(snapshotValue(snapshot,['size','custom_width','width']))} ${snapshotValue(snapshot,['custom_height','height'])?`× ${esc(snapshotValue(snapshot,['custom_height','height']))}`:''}</span></div>
    <div class="card-actions wrap">${button('編集',{nav:`/projects/${projectId}/estimates/${estimateId}/openings/${opening.opening_id}`,kind:'primary'})}${button('複製',{action:`duplicate:${opening.opening_id}`})}${button('↑',{action:`up:${opening.opening_id}`,disabled:index===0})}${button('↓',{action:`down:${opening.opening_id}`,disabled:index===total-1})}${button('削除',{action:`delete:${opening.opening_id}`,kind:'danger'})}</div>
  </div></article>`;
}

async function renderEstimate(projectId,estimateId){
  const {project,estimate,openings}=await service.getEstimateDetail(projectId,estimateId);setHeader(`${project.project_name} / 見積 ${estimate.estimate_no}`);
  $('#appMain').innerHTML=`<div class="breadcrumbs"><a href="/" data-nav="/">案件一覧</a><span>/</span><a href="/projects/${projectId}" data-nav="/projects/${projectId}">${esc(project.project_name)}</a><span>/</span><strong>見積 ${estimate.estimate_no}</strong></div>
    <div class="page-heading"><div><div class="eyebrow">Revision ${estimate.revision_no} · ${esc(estimate.status)}</div><h1>${esc(estimate.estimate_title??`見積 ${estimate.estimate_no}`)}</h1><p class="lead">${openings.length}開口を登録中</p></div><div class="button-row">${button('見積確認',{nav:`/projects/${projectId}/estimates/${estimateId}/summary`})}${button('開口部を追加',{nav:`/projects/${projectId}/estimates/${estimateId}/openings/new`,kind:'primary'})}</div></div>
    <section id="openingList" class="opening-list">${openings.length?openings.map((opening,index)=>openingCard(projectId,estimateId,opening,index,openings.length)).join(''):`<section class="empty-state"><h2>開口部はまだありません</h2><p>窓・ドアを1開口ずつ追加します。</p>${button('最初の開口部を追加',{nav:`/projects/${projectId}/estimates/${estimateId}/openings/new`,kind:'primary'})}</section>`}</section>`;
  $('#openingList').addEventListener('click',async(event)=>{
    const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;const [kind,id]=action.split(':');
    if(kind==='duplicate'){await service.duplicateOpening(projectId,estimateId,id);await renderEstimate(projectId,estimateId);}
    if(kind==='up'||kind==='down'){await service.moveOpening(projectId,estimateId,id,kind);await renderEstimate(projectId,estimateId);}
    if(kind==='delete'&&confirm('この開口部を削除しますか？（データはSoft Deleteで保持されます）')){await service.softDeleteOpening(projectId,estimateId,id);await renderEstimate(projectId,estimateId);}
  });
}

function saveStatusMarkup(status,message=''){
  const labels={UNSAVED:'未保存',SAVING:'保存中…',SAVED:'保存済み',SAVE_FAILED:'保存失敗'};
  return `<span class="save-status ${status.toLowerCase()}">${labels[status]}</span>${message?`<small>${esc(message)}</small>`:''}`;
}

async function renderOpeningEditor(projectId,estimateId,openingId){
  const detail=await service.getEstimateDetail(projectId,estimateId);const opening=await repositories.openings.require(openingId);
  if(opening.estimate_id!==estimateId)throw new Error('Opening does not belong to Estimate');
  setHeader(`${detail.project.project_name} / 開口 ${opening.opening_no}`,'SAVED');
  const emergency=localStorage.getItem(draftKey(openingId));let draft={...opening};
  if(emergency){try{const parsed=JSON.parse(emergency);if(parsed.updated_after===opening.updated_at)draft={...draft,...parsed.payload};}catch{/* ignore invalid emergency draft */}}
  let currentUpdatedAt=opening.updated_at;let status=emergency?SaveStatus.UNSAVED:SaveStatus.SAVED;let timer=null;let sequence=0;let saveChain=Promise.resolve();
  $('#appMain').innerHTML=`<div class="breadcrumbs"><a href="/" data-nav="/">案件一覧</a><span>/</span><a href="/projects/${projectId}/estimates/${estimateId}" data-opening-back>${esc(detail.estimate.estimate_title??'見積')}</a><span>/</span><strong>開口 ${opening.opening_no}</strong></div>
    <div class="page-heading"><div><div class="eyebrow">${esc(opening.status)}</div><h1>${esc(openingDisplayName(opening))}</h1></div><div id="saveState" class="save-state">${saveStatusMarkup(status)}</div></div>
    <section class="card"><h2>開口部情報</h2><div class="form-grid">
      <div class="field"><label>部屋名</label><input data-opening-field="room_name" value="${esc(draft.room_name??'')}" placeholder="LDK、洋室、浴室など"></div>
      <div class="field"><label>位置</label><input data-opening-field="location" value="${esc(draft.location??'')}" placeholder="南面、正面、階段横など"></div>
      <div class="field span-2"><label>開口名称</label><input data-opening-field="opening_name" value="${esc(draft.opening_name??'')}" placeholder="掃き出し窓、腰窓、玄関など"></div>
      <div class="field span-2"><label>備考</label><textarea data-opening-field="memo" rows="3">${esc(draft.memo??'')}</textarea></div>
    </div></section><div id="productEditor"></div>
    <section class="sticky-save"><div id="saveFailureHelp"></div><div class="button-row">${button('見積へ戻る',{action:'back-estimate'})}<button id="saveOpening" type="button" class="button primary">この開口部を保存</button></div></section>`;

  const statusTarget=$('#saveState');
  const failureHelpTarget=$('#saveFailureHelp');
  const headerStatusTarget=$('#status');
  const productEditorTarget=$('#productEditor');
  const lifecycle={active:true,statusTarget,failureHelpTarget,headerStatusTarget,productEditorTarget};
  deactivateOpeningLifecycle();activeOpeningLifecycle=lifecycle;
  const isActive=()=>lifecycle.active&&activeOpeningLifecycle===lifecycle&&statusTarget.isConnected&&failureHelpTarget.isConnected&&headerStatusTarget.isConnected;
  const setSaveStatus=(next,message='')=>{
    status=next;
    if(!isActive())return;
    statusTarget.innerHTML=saveStatusMarkup(next,message);
    headerStatusTarget.textContent=next==='SAVE_FAILED'?'SAVE FAILED':next;
    headerStatusTarget.classList.toggle('ok',next!=='SAVE_FAILED');
  };
  const clearFailureHelp=()=>{if(isActive())failureHelpTarget.innerHTML='';};
  const showFailureHelp=()=>{if(isActive())failureHelpTarget.innerHTML='<div class="notice error">入力内容はこの画面に保持されています。<button type="button" class="button secondary small" data-action="retry-save">再試行</button></div>';};
  const payload=()=>({room_name:draft.room_name??null,location:draft.location??null,opening_name:draft.opening_name??null,memo:draft.memo??null,product_configuration_snapshot:draft.product_configuration_snapshot??null});
  const keepEmergencyDraft=()=>{try{localStorage.setItem(draftKey(openingId),JSON.stringify({updated_after:currentUpdatedAt,payload:payload()}));}catch{/* formal save will surface storage errors */}};
  const persist=()=>{
    if(timer){clearTimeout(timer);timer=null;}const request=++sequence;const toSave=payload();
    saveChain=saveChain.then(async()=>{
      setSaveStatus(SaveStatus.SAVING);
      try{
        const saved=await service.updateOpening(projectId,estimateId,openingId,toSave,{expectedUpdatedAt:currentUpdatedAt});currentUpdatedAt=saved.updated_at;
        if(request===sequence){setSaveStatus(SaveStatus.SAVED);localStorage.removeItem(draftKey(openingId));clearFailureHelp();}
        return true;
      }catch(error){
        if(request===sequence){keepEmergencyDraft();setSaveStatus(SaveStatus.SAVE_FAILED,error.message);showFailureHelp();}
        return false;
      }
    });
    return saveChain;
  };
  const markDirty=()=>{setSaveStatus(SaveStatus.UNSAVED);keepEmergencyDraft();if(timer)clearTimeout(timer);timer=setTimeout(()=>persist(),800);};
  activeNavigationFlush=()=>!lifecycle.active||status===SaveStatus.SAVED?Promise.resolve(true):persist();
  clearPageHideHandler();
  activePageHideHandler=()=>{if(lifecycle.active&&status!==SaveStatus.SAVED)void persist();};
  window.addEventListener('pagehide',activePageHideHandler);
  $('[data-opening-back]').addEventListener('click',async(event)=>{event.preventDefault();const ok=status===SaveStatus.SAVED?true:await persist();if(ok)navigate(`/projects/${projectId}/estimates/${estimateId}`);});
  $('[data-action="back-estimate"]').addEventListener('click',async()=>{const ok=status===SaveStatus.SAVED?true:await persist();if(ok)navigate(`/projects/${projectId}/estimates/${estimateId}`);});
  $('#saveOpening').addEventListener('click',async()=>{const ok=await persist();if(ok)navigate(`/projects/${projectId}/estimates/${estimateId}`);});
  failureHelpTarget.addEventListener('click',(event)=>{if(event.target.closest('[data-action="retry-save"]'))void persist();});
  document.querySelectorAll('[data-opening-field]').forEach((input)=>input.addEventListener('input',()=>{draft[input.dataset.openingField]=input.value.trim()||null;markDirty();}));
  activeProductEditor=new ProductConfigurationEditor(productEditorTarget,{initialSnapshot:draft.product_configuration_snapshot,onSnapshot:(snapshot)=>{if(!isActive())return;draft.product_configuration_snapshot=snapshot;markDirty();}});
  try{await activeProductEditor.mount();}catch(error){if(isActive()&&productEditorTarget.isConnected)productEditorTarget.innerHTML=`<div class="notice error">商品Runtimeを読み込めませんでした: ${esc(error.message)}</div>`;}
  if(emergency){setSaveStatus(SaveStatus.UNSAVED,'前回の未保存入力を復元しました。');timer=setTimeout(()=>persist(),100);}
}

async function renderSummary(projectId,estimateId){
  const {project,estimate,openings}=await service.getEstimateDetail(projectId,estimateId);setHeader(`${project.project_name} / 見積確認`);
  const incomplete=openings.filter((row)=>row.status!=='COMPLETE');
  $('#appMain').innerHTML=`<div class="breadcrumbs"><a href="/projects/${projectId}/estimates/${estimateId}" data-nav="/projects/${projectId}/estimates/${estimateId}">見積へ戻る</a></div>
    <div class="page-heading"><div><h1>見積確認</h1><p class="lead">${esc(estimate.estimate_title??'見積')} · Revision ${estimate.revision_no}</p></div></div>
    ${incomplete.length?`<div class="notice warning"><strong>未完了の開口部が ${incomplete.length}件あります。</strong></div>`:'<div class="notice success">すべての開口部が入力完了です。</div>'}
    <section class="summary-table-wrap"><table class="estimate-summary"><thead><tr><th>No.</th><th>部屋 / 位置</th><th>メーカー / シリーズ</th><th>窓・ドア種類</th><th>主要仕様</th><th>サイズ</th><th>状態</th></tr></thead><tbody>${openings.map((opening)=>{
      const snapshot=opening.product_configuration_snapshot;const main=(snapshot?.display_summary??[]).filter((row)=>!['window_type','opening_type','door_type','size','custom_width','custom_height'].includes(row.key)).slice(0,3).map((row)=>row.value).join(' / ');
      return `<tr><td>${opening.opening_no}</td><td><strong>${display(opening.room_name)}</strong><small>${display(opening.location)}</small></td><td>${display(snapshot?.manufacturer)}<small>${display(snapshot?.series)}</small></td><td>${display(snapshotValue(snapshot,['window_type','opening_type','door_type']))}</td><td>${display(main)}</td><td>${display(snapshotValue(snapshot,['size','custom_width','width']))}</td><td><span class="state-pill ${opening.status.toLowerCase()}">${esc(opening.status)}</span></td></tr>`;
    }).join('')}</tbody></table></section>`;
}

async function renderRuntimeLab(){
  setHeader('商品Runtime UI 単体確認','LOADING');$('#appMain').innerHTML='<div class="breadcrumbs"><a href="/" data-nav="/">案件一覧へ戻る</a></div><div class="page-heading"><div><h1>商品Runtime UI 単体確認</h1><p class="lead">開発・QA用ルートです。ここでの入力は案件へ保存されません。</p></div></div><div id="runtimeLab"></div>';
  activeProductEditor=new ProductConfigurationEditor($('#runtimeLab'),{showInventory:true});await activeProductEditor.mount();
}

async function renderRoute(){
  deactivateOpeningLifecycle();activeProductEditor?.destroy();activeProductEditor=null;const parts=location.pathname.split('/').filter(Boolean);
  try{
    if(!parts.length)return renderProjectList();
    if(parts[0]==='runtime-lab')return renderRuntimeLab();
    if(parts[0]!=='projects')return navigate('/',{replace:true});
    if(parts[1]==='new')return renderProjectEditor(null);
    const projectId=parts[1];
    if(parts.length===2)return renderProjectDetail(projectId);
    if(parts[2]==='edit')return renderProjectEditor(projectId);
    if(parts[2]!=='estimates')return navigate(`/projects/${projectId}`,{replace:true});
    const estimateId=parts[3];
    if(parts.length===4)return renderEstimate(projectId,estimateId);
    if(parts[4]==='summary')return renderSummary(projectId,estimateId);
    if(parts[4]==='openings'&&parts[5]==='new'){
      const opening=await service.createOpening(projectId,estimateId);return navigate(`/projects/${projectId}/estimates/${estimateId}/openings/${opening.opening_id}`,{replace:true});
    }
    if(parts[4]==='openings'&&parts[5])return renderOpeningEditor(projectId,estimateId,parts[5]);
    return navigate(`/projects/${projectId}/estimates/${estimateId}`,{replace:true});
  }catch(error){setHeader('読み込みエラー','SAVE FAILED');$('#appMain').innerHTML=`<section class="notice error"><strong>画面を読み込めませんでした。</strong><p>${esc(error.message)}</p>${button('案件一覧へ',{nav:'/'})}</section>`;}
}

document.addEventListener('click',(event)=>{const target=event.target.closest('[data-nav]');if(!target)return;event.preventDefault();void navigate(target.dataset.nav);});
window.addEventListener('popstate',async()=>{
  if(!await flushActiveEditor()){history.pushState({},'',renderedPath);return;}
  renderedPath=location.pathname;await renderRoute();
});
void renderRoute();
