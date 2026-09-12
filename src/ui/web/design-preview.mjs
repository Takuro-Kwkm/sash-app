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
let activeNotificationFilter='all';
let selectedNotificationId='price-update';

const notificationItems=[
  {id:'price-update',group:'maker',type:'価格改定',className:'price',title:'メーカー価格改定情報を更新',summary:'見積前に確認したい価格改定情報を、業務の入口で見落とさないための表示例。',date:'09/12',source:'メーカー情報',priority:'重要',body:'正式運用では、対象メーカー・シリーズ・改定日・影響範囲を明示し、見積開始前に確認できる情報面へ接続する。',action:'商品選定へ',href:'/design-preview/product'},
  {id:'master-update',group:'master',type:'仕様変更',className:'spec',title:'商品仕様・商品マスター更新',summary:'Runtimeや商品選定条件の変更を、利用者が日々の業務の中で把握するための表示例。',date:'09/12',source:'商品マスター',priority:'重要',body:'正式運用では、更新されたシリーズ、変更点、適用開始日、影響する選定条件をEvidence付きで確認できる構造を想定する。',action:'商品選定へ',href:'/design-preview/product'},
  {id:'discontinued',group:'maker',type:'廃番',className:'retired',title:'廃番・販売終了情報',summary:'販売終了や代替品確認が必要な情報を、見積着手前に気づけるようにする表示例。',date:'09/11',source:'メーカー情報',priority:'要確認',body:'正式データ接続後は、対象商品・終了時期・代替候補・既存案件への影響をまとめて確認できるようにする。',action:'ホームへ戻る',href:'/design-preview'},
  {id:'catalog-update',group:'maker',type:'カタログ',className:'catalog',title:'カタログ更新情報',summary:'新しいカタログや技術資料が追加されたことを知らせる表示例。',date:'09/11',source:'カタログ',priority:'通常',body:'正式運用では、改訂版カタログ・技術資料・差し替えページへの導線を持たせ、古い資料の参照を減らす。',action:'ホームへ戻る',href:'/design-preview'},
  {id:'estimate-task',group:'work',type:'未完了',className:'task',title:'見積未完了の案件があります',summary:'途中保存された案件や期限が近い見積を、再開しやすくする業務通知の表示例。',date:'09/10',source:'案件・見積',priority:'要対応',body:'正式運用ではユーザー自身の案件データを参照し、期限、最終更新、入力不足などを条件に通知する。',action:'案件・見積へ',href:'/'},
  {id:'survey-task',group:'work',type:'現場調査',className:'task',title:'現場調査の入力が未完了です',summary:'採寸や写真、現場条件に不足がある案件を知らせる業務通知の表示例。',date:'09/10',source:'現場調査',priority:'要対応',body:'正式運用では入力必須項目や写真不足を判定し、該当案件の未完了箇所へ直接戻れるようにする。',action:'案件・見積へ',href:'/'}
];

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

function heroArchitecture(){
  return `
    <div class="hero-architecture" role="img" aria-label="昼の和モダン住宅。グレー系タイル外壁、ブラックの2枚建引違い掃き出し窓、ブラックのフラッシュ玄関ドアを配したコンセプトイメージ">
      <svg class="hero-architecture-svg" viewBox="0 0 1600 720" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#dbe5eb"/><stop offset="1" stop-color="#f1f3f1"/></linearGradient>
          <linearGradient id="glass" x1="0" x2="1"><stop offset="0" stop-color="#74818a"/><stop offset="0.46" stop-color="#909b9f"/><stop offset="1" stop-color="#69757d"/></linearGradient>
          <linearGradient id="interior" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d8d0c3"/><stop offset="1" stop-color="#a9957e"/></linearGradient>
          <linearGradient id="deck" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#91969a"/><stop offset="1" stop-color="#696f73"/></linearGradient>
          <pattern id="tile" width="72" height="34" patternUnits="userSpaceOnUse"><rect width="72" height="34" fill="#7e8588"/><path d="M0 33.5H72M71.5 0V34" stroke="#6f7679" stroke-width="1"/><path d="M0 1H72" stroke="#92999c" stroke-width="1" opacity=".6"/></pattern>
        </defs>
        <rect width="1600" height="720" fill="url(#sky)"/>
        <rect y="488" width="1600" height="232" fill="url(#deck)"/>
        <g opacity=".22" stroke="#3f4548" stroke-width="2"><path d="M0 540H1600M0 594H1600M0 648H1600"/><path d="M180 488V720M410 488V720M650 488V720M890 488V720M1130 488V720M1370 488V720"/></g>
        <rect x="420" y="128" width="1120" height="382" fill="url(#tile)"/>
        <rect x="356" y="92" width="1224" height="76" fill="#101519"/>
        <rect x="418" y="168" width="1124" height="18" fill="#0f1417"/>

        <rect x="692" y="180" width="540" height="304" fill="#111619"/>
        <rect x="710" y="198" width="504" height="268" fill="url(#glass)"/>
        <rect x="718" y="206" width="238" height="252" fill="url(#interior)" opacity=".95"/>
        <rect x="968" y="206" width="238" height="252" fill="url(#interior)" opacity=".9"/>
        <rect x="956" y="198" width="14" height="268" fill="#0d1114"/>
        <rect x="952" y="198" width="3" height="268" fill="#30383c"/>
        <rect x="970" y="198" width="3" height="268" fill="#30383c"/>
        <rect x="718" y="206" width="488" height="5" fill="#cfd2cf" opacity=".25"/>
        <rect x="718" y="412" width="488" height="46" fill="#6f6252" opacity=".55"/>
        <rect x="754" y="356" width="134" height="58" rx="6" fill="#8f8273"/>
        <rect x="1072" y="320" width="76" height="138" fill="#b8ae9f" opacity=".7"/>
        <circle cx="1108" cy="310" r="31" fill="#59694d"/>
        <circle cx="1133" cy="286" r="24" fill="#69775d"/>

        <rect x="1262" y="180" width="218" height="304" fill="#111619"/>
        <rect x="1282" y="200" width="178" height="266" fill="#151a1d"/>
        <rect x="1426" y="256" width="9" height="154" rx="4" fill="#727b7f"/>
        <rect x="1428" y="258" width="3" height="150" rx="2" fill="#9ba2a5"/>

        <rect x="418" y="484" width="1124" height="18" fill="#4c5357"/>
        <rect x="418" y="502" width="1124" height="26" fill="#b7b7b2"/>
        <rect x="418" y="528" width="1124" height="9" fill="#555d61"/>

        <rect x="458" y="244" width="166" height="220" fill="#858c8f" opacity=".5"/>
        <g stroke="#6e7578" stroke-width="3" opacity=".42"><path d="M458 292H624M458 340H624M458 388H624M514 244V464M570 244V464"/></g>
        <rect x="336" y="168" width="84" height="370" fill="#747b7e"/>
        <rect x="316" y="538" width="124" height="18" fill="#565d61"/>
        <path d="M220 500c48-86 85-108 122-28 20 44 36 67 67 82H205z" fill="#687463" opacity=".9"/>
      </svg>
    </div>`;
}

function featureTiles(){
  return [
    ['▣','商品選定','Runtimeに沿って商品・仕様を選ぶ','/design-preview/product','internal'],
    ['▤','案件・見積','案件情報と見積作業を開く','/','external'],
    ['⌖','現場調査','採寸・現場条件の入力へつなぐ','/','external'],
    ['⌘','Runtime QA','Runtime接続状態を確認する','/runtime-lab','external'],
  ].map(([icon,title,detail,href,type])=>`<a class="feature-tile" href="${href}"${type==='internal'?' data-design-nav="/design-preview/product"':''}><span class="feature-icon">${icon}</span><span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span></a>`).join('');
}

async function renderHome(){
  setActiveNav('home');
  let projects=[];
  try{projects=await service.listProjects();}catch{}
  const recent=projects.slice(0,4);
  const rows=recent.map((project)=>`<div class="project-row"><span><strong>${esc(project.project_name)}</strong><small>${esc(project.request_company??'依頼会社未入力')}</small></span><span class="state-pill">${esc(project.estimate_status??'案件')}</span><small>${date(project.updated_at)}</small></div>`).join('');
  const latest=recent[0];
  const secondaryCta=latest?'<a class="hero-cta hero-cta-secondary" href="/">前回の続き</a>':'';
  const resume=latest?`<div class="resume-card"><div><span class="eyebrow">CONTINUE</span><strong>${esc(latest.project_name)}</strong><small>${esc(latest.request_company??'依頼会社未入力')} · ${date(latest.updated_at)} 更新</small></div><a href="/">案件を開く</a></div>`:'<div class="design-empty compact">作業中の案件はまだありません。</div>';

  $('#designMain').innerHTML=`
    <section class="home-hero" aria-labelledby="homeHeroTitle">
      ${heroArchitecture()}
      <div class="home-hero-shade" aria-hidden="true"></div>
      <div class="home-hero-copy">
        <div class="home-hero-kicker">サッシ業務を、もっと分かりやすく。</div>
        <h1 id="homeHeroTitle">暮らしをつくる、マドとトビラで。</h1>
        <p>窓・玄関ドアの商品選定・見積・現場調査を、迷いにくい流れでつなぐ。</p>
        <div class="hero-actions">
          <a class="hero-cta hero-cta-primary" href="/"><span aria-hidden="true">＋</span>案件を新規作成</a>
          ${secondaryCta}
        </div>
      </div>
      <span class="concept-label">CONCEPT IMAGE</span>
    </section>

    <section class="announcement-strip panel" aria-labelledby="announcementTitle">
      <div class="section-head announcement-head"><div><span class="eyebrow">UPDATE</span><h2 id="announcementTitle">お知らせ</h2></div><a href="/design-preview/notifications" data-design-nav="/design-preview/notifications">すべて見る</a></div>
      <div class="announcement-grid">
        <article class="announcement-item"><span class="notice-type price">価格改定</span><div><strong>メーカー価格改定情報を更新</strong><p>見積前に最新の価格情報を確認してね。</p></div><time>09/12</time></article>
        <article class="announcement-item"><span class="notice-type spec">仕様変更</span><div><strong>商品仕様・商品マスター更新</strong><p>選定条件と最新Runtimeの変更点を反映。</p></div><time>09/12</time></article>
        <article class="announcement-item"><span class="notice-type catalog">カタログ</span><div><strong>カタログ更新情報</strong><p>新しい資料・廃番情報の確認ができる。</p></div><time>09/11</time></article>
      </div>
    </section>

    <section class="home-content-grid">
      <div class="panel feature-panel"><div class="section-head"><div><span class="eyebrow">WORK</span><h2>よく使う機能</h2></div></div><div class="feature-grid">${featureTiles()}</div></div>
      <div class="panel resume-panel"><div class="section-head"><div><span class="eyebrow">RESUME</span><h2>続きから再開</h2></div></div>${resume}</div>
    </section>

    <section class="home-content-grid lower-grid">
      <div class="panel"><div class="section-head"><div><span class="eyebrow">RECENT</span><h2>最近の案件</h2></div><a href="/">案件一覧へ</a></div>${rows||'<div class="design-empty">このブラウザには案件データがまだありません。現行UIで案件を作成するとここにも表示されます。</div>'}</div>
      <div class="panel"><div class="section-head"><div><span class="eyebrow">SHORTCUT</span><h2>ショートカット</h2></div></div><div class="shortcut-grid">
        <a class="shortcut" href="/"><strong>＋</strong><span>案件を新規作成</span></a>
        <a class="shortcut" href="/design-preview/product" data-design-nav="/design-preview/product"><strong>▣</strong><span>商品を選ぶ</span></a>
        <a class="shortcut" href="/runtime-lab"><strong>⌘</strong><span>Runtime QA</span></a>
        <a class="shortcut" href="/"><strong>⌖</strong><span>現行UIへ戻る</span></a>
      </div></div>
    </section>`;
}

function visibleNotifications(){
  return activeNotificationFilter==='all'?notificationItems:notificationItems.filter((item)=>item.group===activeNotificationFilter);
}

function notificationRows(){
  return visibleNotifications().map((item)=>`<button class="notification-row${item.id===selectedNotificationId?' active':''}" type="button" data-notice-id="${esc(item.id)}"><span class="notice-type ${esc(item.className)}">${esc(item.type)}</span><span class="notification-row-main"><strong>${esc(item.title)}</strong><p>${esc(item.summary)}</p><small>${esc(item.source)} · ${esc(item.priority)}</small></span><time>${esc(item.date)}</time></button>`).join('');
}

function renderNotificationDetail(){
  const item=notificationItems.find((entry)=>entry.id===selectedNotificationId)??visibleNotifications()[0]??notificationItems[0];
  selectedNotificationId=item.id;
  const detail=$('#notificationDetail');
  if(!detail)return;
  detail.innerHTML=`<div class="notification-detail-head"><span class="notice-type ${esc(item.className)}">${esc(item.type)}</span><span class="sample-data-note">Sample Data</span></div><h2>${esc(item.title)}</h2><p class="detail-summary">${esc(item.summary)}</p><div class="notification-meta"><div><span>SOURCE</span><strong>${esc(item.source)}</strong></div><div><span>PRIORITY</span><strong>${esc(item.priority)}</strong></div><div><span>UPDATED</span><strong>${esc(item.date)}</strong></div><div><span>STATUS</span><strong>Pilot表示</strong></div></div><div class="notification-body"><h3>この通知で確認すること</h3><p>${esc(item.body)}</p><h3>正式運用について</h3><p>現在はUI確認用のサンプル。メーカー公式情報、商品マスター、案件データ等の正式ソースへ接続するまでは実業務の更新情報として扱わない。</p></div><div class="notification-actions"><a href="${esc(item.href)}"${item.href.startsWith('/design-preview')?` data-design-nav="${esc(item.href)}"`:''}>${esc(item.action)}</a><button type="button" disabled>正式データ接続前</button></div>`;
}

function syncNotificationView(){
  const visible=visibleNotifications();
  if(!visible.some((item)=>item.id===selectedNotificationId))selectedNotificationId=visible[0]?.id??notificationItems[0].id;
  const list=$('#notificationList');if(list)list.innerHTML=notificationRows();
  const count=$('#notificationCount');if(count)count.textContent=`${visible.length}件を表示`;
  document.querySelectorAll('[data-notice-filter]').forEach((button)=>button.classList.toggle('active',button.dataset.noticeFilter===activeNotificationFilter));
  renderNotificationDetail();
}

function renderNotifications(){
  setActiveNav('notifications');
  $('#designMain').innerHTML=`
    <div class="page-head"><div><div class="eyebrow">Design Pilot / Notifications</div><h1>お知らせ</h1><p class="lead">メーカー変更・商品マスター更新・業務上の未完了を、ひとつの情報面で確認する。</p></div><span class="sample-data-note">Sample Data / UI確認用</span></div>
    <section class="notification-layout">
      <div class="panel notification-panel">
        <div class="notification-toolbar"><div class="notification-filters" aria-label="お知らせ種別"><button class="notification-filter active" type="button" data-notice-filter="all">すべて</button><button class="notification-filter" type="button" data-notice-filter="maker">メーカー・資料</button><button class="notification-filter" type="button" data-notice-filter="master">商品マスター</button><button class="notification-filter" type="button" data-notice-filter="work">案件・現場</button></div><span id="notificationCount" class="notification-count"></span></div>
        <div id="notificationList" class="notification-list"></div>
      </div>
      <aside id="notificationDetail" class="panel notification-detail" aria-live="polite"></aside>
    </section>`;
  syncNotificationView();
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
  if(path==='/design-preview/notifications')return renderNotifications();
  if(path==='/design-preview/product')return renderProduct();
  return renderHome();
}

const savedTheme=localStorage.getItem('sash.ui-theme')??'system';setTheme(savedTheme);
$('#themeSelect').addEventListener('change',(event)=>setTheme(event.target.value));
document.addEventListener('click',(event)=>{
  const filter=event.target.closest('[data-notice-filter]');
  if(filter){activeNotificationFilter=filter.dataset.noticeFilter??'all';syncNotificationView();return;}
  const notice=event.target.closest('[data-notice-id]');
  if(notice){selectedNotificationId=notice.dataset.noticeId;syncNotificationView();return;}
  const link=event.target.closest('[data-design-nav]');if(!link)return;
  event.preventDefault();navigate(link.getAttribute('href'));
});
window.addEventListener('popstate',()=>{productEditor?.destroy();productEditor=null;renderRoute();});

try{
  const health=await fetch('/api/health',{cache:'no-store'}).then((response)=>response.json());
  $('#build').textContent=`Design Pilot · ${health.buildId}`;
}catch{}
await renderRoute();