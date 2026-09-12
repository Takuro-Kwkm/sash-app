import { BrowserStorageDocumentStore } from '/work-management/storage.mjs';
import { createRepositoryBundle } from '/work-management/repositories.mjs';
import { WorkManagementService } from '/work-management/service.mjs';
import { ProductConfigurationEditor } from '/product-configuration-editor.mjs';

const $=(selector)=>document.querySelector(selector);
const esc=(value)=>String(value??'').replace(/[&<>'\"]/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"})[character]);
const date=(value)=>value?new Intl.DateTimeFormat('ja-JP',{month:'2-digit',day:'2-digit'}).format(new Date(value)):'—';

const store=new BrowserStorageDocumentStore(localStorage);
const repositories=createRepositoryBundle(store);
const service=new WorkManagementService(repositories);
let productEditor=null;

function setTheme(value){
  const theme=['system','light','dark'].includes(value)?value:'system';
  document.documentElement.dataset.theme=theme;
  localStorage.setItem('sash.ui-theme',theme);
  const select=$('#themeSelect');if(select)select.value=theme;
}

function setActiveNav(section){
  document.querySelectorAll('.design-nav a').forEach((link)=>link.classList.toggle('active',link.dataset.section===section));
}

function navigate(path){
  productEditor?.destroy();productEditor=null;
  history.pushState({},'',path);
  renderRoute();
}

function productTiles(){
  return [
    ['引違い窓','LIXIL TW'],['縦すべり出し窓','YKK AP APW430'],['FIX窓','LIXIL サーモスL'],['玄関ドア','LIXIL ジエスタ'],['内窓','LIXIL インプラス'],
  ].map(([name,series])=>`<div class="product-tile"><div class="mini-window" aria-hidden="true"></div><strong>${esc(name)}</strong><span>${esc(series)}</span></div>`).join('');
}

async function renderHome(){
  setActiveNav('home');
  let projects=[];
  try{projects=await service.listProjects();}catch{}
  const rows=projects.slice(0,4).map((project)=>`<div class="project-row"><span><strong>${esc(project.project_name)}</strong><small>${esc(project.request_company??'依頼会社未入力')}</small></span><span class="state-pill">${esc(project.estimate_status??'案件')}</span><small>${date(project.updated_at)}</small></div>`).join('');
  $('#designMain').innerHTML=`
    <div class="page-head"><div><div class="eyebrow">Design Pilot / Home</div><h1>ホーム</h1><p class="lead">日々の業務と商品情報の変化を、ひとつの画面から確認。</p></div><span class="pilot-chip">A案 80% + B案 20%</span></div>
    <section class="home-hero-grid">
      <div class="home-hero"><div class="eyebrow">サッシ業務を、もっと分かりやすく。</div><h2>窓から、よりよい暮らしをつくる。</h2><p>商品選定・見積・現場調査を、迷いにくい流れでつなぐ。</p><div class="window-visual" aria-hidden="true"></div></div>
      <div class="panel"><div class="section-head"><h2>お知らせ</h2><a href="#">すべて見る</a></div><div class="notice-list">
        <div class="notice-item"><span class="notice-dot"></span><strong>商品仕様の更新を確認</strong><span class="notice-date">09/12</span></div>
        <div class="notice-item"><span class="notice-dot"></span><strong>メーカー価格改定情報</strong><span class="notice-date">09/11</span></div>
        <div class="notice-item"><span class="notice-dot warning"></span><strong>確認が必要な見積があります</strong><span class="notice-date">2件</span></div>
        <div class="notice-item"><span class="notice-dot error"></span><strong>未完了の現場調査があります</strong><span class="notice-date">1件</span></div>
      </div></div>
    </section>
    <section class="home-grid">
      <div class="panel"><div class="section-head"><h2>よく使う商品</h2><a href="/design-preview/product" data-design-nav="/design-preview/product">商品選定へ</a></div><div class="product-grid">${productTiles()}</div></div>
      <div class="panel"><div class="section-head"><h2>ショートカット</h2></div><div class="shortcut-grid">
        <a class="shortcut" href="/" ><strong>▤</strong>案件・見積を開く</a>
        <a class="shortcut" href="/design-preview/product" data-design-nav="/design-preview/product"><strong>▣</strong>商品を選ぶ</a>
        <a class="shortcut" href="/runtime-lab"><strong>⌘</strong>Runtime QA</a>
        <a class="shortcut" href="/"><strong>⌖</strong>現行UIへ戻る</a>
      </div></div>
    </section>
    <section class="home-grid">
      <div class="panel"><div class="section-head"><h2>最近の案件</h2><a href="/">案件一覧へ</a></div>${rows||'<div class="design-empty">このブラウザには案件データがまだありません。現行UIで案件を作成するとここにも表示されます。</div>'}</div>
      <div class="panel"><div class="section-head"><h2>Context Guide</h2></div><div class="guide-grid">
        <div class="guide-card"><strong>分からない項目だけ確認</strong><p>必要な時だけ意味・用途・注意点を表示。</p></div>
        <div class="guide-card"><strong>画像で選定を補助</strong><p>商品やオプションを視覚で比較する。</p></div>
        <div class="guide-card"><strong>ベテランは高速操作</strong><p>補助を開かず、そのまま業務を進められる。</p></div>
      </div></div>
    </section>`;
}

function updateProductPreview(snapshot){
  const title=$('#previewProductTitle');
  const detail=$('#previewProductDetail');
  const list=$('#previewSummary');
  if(!snapshot){
    title.textContent='商品を選択してください';detail.textContent='選択内容に応じて、ここに商品プレビューと主要仕様を表示します。';list.innerHTML='<li>メーカー → 商品 → 仕様の順に入力</li><li>商品画像は正式メーカー画像へ差替予定</li>';
    return;
  }
  title.textContent=[snapshot.manufacturer,snapshot.series].filter(Boolean).join(' ');
  const rows=snapshot.display_summary??[];
  detail.textContent=rows.slice(0,2).map((row)=>row.value).join(' / ')||'仕様を入力してください';
  list.innerHTML=rows.slice(0,5).map((row)=>`<li><strong>${esc(row.label)}:</strong> ${esc(row.value)}</li>`).join('')||'<li>項目を入力してください</li>';
}

async function renderProduct(){
  setActiveNav('product');
  $('#designMain').innerHTML=`
    <div class="page-head"><div><div class="eyebrow">Design Pilot / Product Selection</div><h1>商品選定</h1><p class="lead">A案の業務性を軸に、選定時だけB案の視覚情報を強くする。</p></div><span class="pilot-chip">Read-only Runtime Integration</span></div>
    <section class="product-layout">
      <div class="product-form-stack runtime-editor-shell"><div id="runtimeProductEditor"></div></div>
      <aside class="product-preview">
        <div class="preview-stage"><div class="section-head"><h2>選択中の商品</h2><span class="pilot-chip">Preview</span></div><div class="preview-window-wrap"><div class="preview-window" aria-label="商品画像プレースホルダー"></div></div><div class="preview-caption"><strong id="previewProductTitle">商品を選択してください</strong><span id="previewProductDetail">選択内容に応じて、ここに商品プレビューと主要仕様を表示します。</span></div></div>
        <div class="context-card"><h3>Context Guide</h3><p>現在の入力内容に合わせて、意味・成立条件・注意点をその場で確認する領域。</p><ul id="previewSummary"><li>メーカー → 商品 → 仕様の順に入力</li><li>商品画像は正式メーカー画像へ差替予定</li></ul></div>
        <div class="context-card"><h3>今回のPilot範囲</h3><p>商品マスターは変更せず、既存Runtime/Catalogをそのまま読み込む。</p><ul><li>商品選定UIの情報階層</li><li>Desktop / iPadレイアウト</li><li>Light / Dark Theme</li></ul></div>
      </aside>
    </section>`;
  productEditor=new ProductConfigurationEditor($('#runtimeProductEditor'),{showInventory:false,onSnapshot:(snapshot)=>updateProductPreview(snapshot)});
  await productEditor.mount();
  updateProductPreview(productEditor.getSnapshot());
}

async function renderRoute(){
  const path=location.pathname.replace(/\/+$/,'')||'/design-preview';
  if(path==='/design-preview/product')return renderProduct();
  return renderHome();
}

const savedTheme=localStorage.getItem('sash.ui-theme')??'system';setTheme(savedTheme);
$('#themeSelect').addEventListener('change',(event)=>setTheme(event.target.value));
document.addEventListener('click',(event)=>{
  const link=event.target.closest('[data-design-nav]');if(!link)return;
  event.preventDefault();navigate(link.getAttribute('href'));
});
window.addEventListener('popstate',()=>{productEditor?.destroy();productEditor=null;renderRoute();});

try{
  const health=await fetch('/api/health',{cache:'no-store'}).then((response)=>response.json());
  $('#build').textContent=`Design Pilot · ${health.buildId}`;
}catch{}
await renderRoute();
