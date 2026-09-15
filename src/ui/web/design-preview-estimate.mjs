const estimateItems=[
  {id:'opening-01',no:'01',room:'LDK 南面',kind:'外窓 / 引違い窓',product:'Sample Window A',design:'2枚建',color:'ブラック',chip:'#171b1e',specs:['Low-E複層ガラス','アルゴンガス','樹脂スペーサー','W1690 × H2030'],feature:'大きな開口でも、窓の構成・色・主要仕様をひと目で確認できる見せ方のサンプル。',qty:'1窓',amount:168000,fallback:'共通窓種図',visual:'window'},
  {id:'opening-02',no:'02',room:'寝室 東面',kind:'外窓 / FIX窓',product:'Sample Window B',design:'FIX',color:'ブラック',chip:'#171b1e',specs:['Low-E複層ガラス','透明ガラス','アルミスペーサー','W0740 × H1170'],feature:'画像が未整備でも、図面やシルエットで窓種と主要仕様を判断できる状態を維持する。',qty:'1窓',amount:92000,fallback:'公式図面想定',visual:'drawing'},
  {id:'opening-03',no:'03',room:'玄関',kind:'玄関ドア / 片開き',product:'Sample Door C',design:'フラッシュ',color:'ブラック',chip:'#111416',specs:['縦長ハンドル','採光なし','電気錠：未接続','W900 × H2300'],feature:'顧客提案では型番より先に、色・デザイン・特徴が伝わるカード表現を想定する。',qty:'1セット',amount:328000,fallback:'汎用アイコン',visual:'door'}
];

let activeEstimateMode='estimate';
let selectedEstimateId=estimateItems[0].id;
const yen=(value)=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(value);
const totalAmount=estimateItems.reduce((sum,item)=>sum+item.amount,0);

function isEstimateView(){
  const url=new URL(location.href);
  return url.pathname.replace(/\/+$/,'')==='/design-preview'&&url.searchParams.get('view')==='estimate';
}

function visualMarkup(item){
  const shape=item.visual==='window'?'<div class="fallback-window"><span></span><span></span></div>':item.visual==='drawing'?'<div class="fallback-drawing"><span></span></div>':'<div class="fallback-door"></div>';
  return `<div class="estimate-visual" role="img" aria-label="${item.product}の画像Fallbackサンプル"><span class="estimate-visual-badge">${item.fallback}</span>${shape}<span class="fallback-caption">FORMAL IMAGE NOT CONNECTED / UI FALLBACK</span></div>`;
}

function summaryMarkup(){
  return `<section class="estimate-summary-strip" aria-label="見積サマリー"><div class="estimate-summary-card"><span>OPENINGS</span><strong>${estimateItems.length} 開口</strong><small>Sample Data</small></div><div class="estimate-summary-card"><span>ESTIMATE TOTAL</span><strong>${yen(totalAmount)}</strong><small>参考表示 / 正式価格ではありません</small></div><div class="estimate-summary-card"><span>PRODUCT IMAGE</span><strong>0 / ${estimateItems.length} 正式接続</strong><small>FallbackでUI継続</small></div><div class="estimate-summary-card"><span>DATA SOURCE</span><strong>Design Pilot</strong><small>PRODUCT_MASTER_MUTATION=0</small></div></section>`;
}

function rowMarkup(item){
  return `<button class="estimate-item-row${item.id===selectedEstimateId?' active':''}" type="button" data-estimate-item="${item.id}"><span class="estimate-opening-no">${item.no}</span><span class="estimate-item-main"><strong>${item.room}</strong><span>${item.product}</span><small>${item.kind} · ${item.design} · ${item.color}</small></span><span class="estimate-qty">${item.qty}</span><span class="estimate-amount"><strong>${yen(item.amount)}</strong><small>参考表示</small></span></button>`;
}

function detailMarkup(item){
  return `<aside class="panel estimate-detail" aria-live="polite"><div class="estimate-detail-top"><div><span class="eyebrow">SELECTED OPENING ${item.no}</span><h2>${item.room}</h2><small>${item.kind}</small></div><span class="estimate-sample-note">Sample</span></div>${visualMarkup(item)}<div class="estimate-product-title"><strong>${item.product}</strong><span>${item.design}</span></div><div class="estimate-color-line"><span class="estimate-color-chip" style="--chip:${item.chip}"></span><strong>${item.color}</strong><span>外観色 / Sample</span></div><div class="estimate-spec-grid">${item.specs.map((spec,index)=>`<div class="estimate-spec"><span>${index===3?'SIZE':'SPEC '+String(index+1).padStart(2,'0')}</span><strong>${spec}</strong></div>`).join('')}</div><div class="estimate-feature"><h3>特徴・確認ポイント</h3><p>${item.feature}</p></div><div class="estimate-detail-price"><div><span>参考見積</span><strong>${yen(item.amount)}</strong><small>正式価格データ接続前</small></div><span>${item.qty}</span></div></aside>`;
}

function estimateModeMarkup(){
  const selected=estimateItems.find((item)=>item.id===selectedEstimateId)??estimateItems[0];
  return `${summaryMarkup()}<section class="estimate-workbench"><div class="panel estimate-list-panel"><div class="estimate-list-head"><span>開口</span><span>商品・仕様</span><span style="text-align:right">数量</span><span style="text-align:right">金額</span></div>${estimateItems.map(rowMarkup).join('')}</div>${detailMarkup(selected)}</section>`;
}

function proposalCardMarkup(item){
  return `<article class="proposal-card">${visualMarkup(item)}<div class="proposal-card-body"><div class="proposal-card-kicker">OPENING ${item.no} / ${item.room}</div><h3>${item.product}</h3><div class="proposal-card-sub">${item.kind} · ${item.design}</div><div class="estimate-color-line"><span class="estimate-color-chip" style="--chip:${item.chip}"></span><strong>${item.color}</strong></div><div class="proposal-specs">${item.specs.slice(0,3).map((spec)=>`<span>${spec}</span>`).join('')}</div><p class="proposal-feature">${item.feature}</p><div class="proposal-price"><span>参考見積</span><strong>${yen(item.amount)}</strong></div></div></article>`;
}

function proposalModeMarkup(){
  return `<section class="proposal-sheet"><div class="proposal-cover"><div><span class="eyebrow">CUSTOMER PROPOSAL / SAMPLE</span><h2>窓・玄関ドア ご提案イメージ</h2><p>商品画像・色・デザイン・主な仕様・特徴を、型番一覧だけにせず見える形でまとめる。</p></div><div class="proposal-cover-meta">案件名：Sample House<br>作成日：Design Pilot</div></div><div class="proposal-grid">${estimateItems.map(proposalCardMarkup).join('')}</div><div class="proposal-footer-note">この画面はDesign Pilotです。商品画像・商品名・仕様・価格はすべてSample / Placeholderであり、正式なメーカー情報・商品マスター・見積価格ではありません。正式運用時は権利確認済み画像と正式Runtime / 価格データへ接続します。</div></section>`;
}

function renderEstimateContent(){
  const container=document.querySelector('#estimateVisualContent');
  if(!container)return;
  document.querySelectorAll('[data-estimate-mode]').forEach((button)=>button.classList.toggle('active',button.dataset.estimateMode===activeEstimateMode));
  container.innerHTML=activeEstimateMode==='proposal'?proposalModeMarkup():estimateModeMarkup();
}

function renderEstimatePilot(){
  if(!isEstimateView())return;
  document.querySelectorAll('.design-nav a').forEach((link)=>link.classList.toggle('active',link.dataset.section==='estimate'));
  const main=document.querySelector('#designMain');
  if(!main)return;
  main.innerHTML=`<div data-estimate-pilot-root><div class="page-head"><div><div class="eyebrow">Design Pilot / Estimate & Proposal Visual</div><h1>見積確認・顧客提案</h1><p class="lead">商品画像と仕様をセットで確認し、そのまま顧客へ見せやすい提案表現へ切り替える。</p></div><div class="estimate-head-actions"><span class="estimate-sample-note">Sample / Placeholder</span><div class="estimate-mode-switch" role="group" aria-label="表示モード"><button type="button" class="active" data-estimate-mode="estimate">見積確認</button><button type="button" data-estimate-mode="proposal">顧客提案プレビュー</button></div></div></div><div id="estimateVisualContent"></div></div>`;
  renderEstimateContent();
}

document.addEventListener('click',(event)=>{
  if(!isEstimateView())return;
  const mode=event.target.closest('[data-estimate-mode]');
  if(mode){activeEstimateMode=mode.dataset.estimateMode==='proposal'?'proposal':'estimate';renderEstimateContent();return;}
  const item=event.target.closest('[data-estimate-item]');
  if(item){selectedEstimateId=item.dataset.estimateItem;renderEstimateContent();}
});

const main=document.querySelector('#designMain');
if(main){
  const ensureEstimatePilot=()=>{
    if(isEstimateView()&&!main.querySelector('[data-estimate-pilot-root]'))renderEstimatePilot();
  };
  const observer=new MutationObserver(ensureEstimatePilot);
  observer.observe(main,{childList:true});
  ensureEstimatePilot();
}
