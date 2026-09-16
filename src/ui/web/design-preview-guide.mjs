const guideTopics={
  lowe:{
    label:'Low-E性能',
    summary:'専門用語を別マニュアルへ探しに行かず、その場で意味と選択の考え方を確認するための表示例。',
    meaning:{title:'Low-E性能とは',body:'ガラス表面の特殊金属膜によって熱の移動を抑える考え方。ここでは「用語の意味」を短く示し、詳細資料を常時画面へ広げない。'},
    condition:{title:'選択するときに見るもの',items:['断熱を重視するか、日射遮蔽を重視するか','方位や開口条件','対象商品で正式に選択可能か']},
    caution:{title:'注意',body:'このPilotの説明はUI確認用Sample。正式な商品可否・性能値・ガラス構成はRuntime / Evidenceへ接続して判定する。'},
    evidence:{title:'根拠情報',body:'正式運用ではメーカー資料・商品マスターEvidence・適用条件へのリンクをここへ表示する。'}
  },
  spacer:{
    label:'スペーサー',
    summary:'「樹脂とアルミで何が違う？」のような迷いを、入力欄を離れず確認するためのContext Guide例。',
    meaning:{title:'スペーサーとは',body:'複層ガラスのガラス間隔を保持する部材。名称だけでは判断しづらいので、役割を短く補足する。'},
    condition:{title:'選択条件',items:['対象ガラス構成で選べる候補','商品・シリーズごとの正式な組合せ','必要に応じて性能や価格への影響']},
    caution:{title:'注意',body:'表示候補をUI側で推測しない。正式運用では選択可能値をRuntimeから受け取り、不可候補は出さない。'},
    evidence:{title:'根拠情報',body:'正式な選択可否はRuntime / Dependency / Evidenceを参照し、Context Guideはその説明面として利用する。'}
  },
  size:{
    label:'サイズ方式',
    summary:'STANDARD / CUSTOMの違いを、ユーザーが入力フロー内で理解するための表示例。',
    meaning:{title:'サイズ方式',body:'規格サイズから選ぶか、特注寸法を入力するかを切り替える項目。現在の作業に必要な説明だけをPrimary付近へ出す。'},
    condition:{title:'選択条件',items:['RuntimeでSTANDARD対応しているか','RuntimeでCUSTOM対応しているか','CUSTOMの場合はW/Hの成立範囲があるか']},
    caution:{title:'注意',body:'CUSTOM不可ケースに特注導線を出さない。上流条件変更でCUSTOMが無効になった場合は、入力済みW/Hもクリアする。'},
    evidence:{title:'根拠情報',body:'正式運用ではSize Master / Runtime Ruleの判定結果を説明付きで表示する。'}
  }
};

let activeGuideId=null;
let activeGuideTab='meaning';

function isGuideView(){
  const url=new URL(location.href);
  return url.pathname.replace(/\/+$/,'')==='/design-preview'&&url.searchParams.get('view')==='guide';
}

function guideContentMarkup(topic){
  const content=topic[activeGuideTab]??topic.meaning;
  const main=content.items
    ? `<ul>${content.items.map((item)=>`<li>${item}</li>`).join('')}</ul>`
    : `<p>${content.body}</p>`;
  return `<div class="context-guide-content"><h3>${content.title}</h3>${main}<div class="context-guide-evidence"><span>INFORMATION LEVEL</span><strong>${activeGuideTab==='evidence'?'DETAIL':'SECONDARY'}</strong></div></div>`;
}

function guidePanelMarkup(){
  if(!activeGuideId){
    return `<aside class="panel context-guide-panel"><div class="guide-quiet-state"><div class="guide-quiet-icon">?</div><strong>必要なときだけ確認</strong><p>入力項目の「？」を押すと、意味・選択条件・注意・根拠情報をこの場所に表示します。作業画面から離れません。</p><div class="guide-flow-note"><b>理想フロー</b> 入力する → 分からない → その場で確認 → 入力を続ける</div></div></aside>`;
  }
  const topic=guideTopics[activeGuideId];
  return `<aside class="panel context-guide-panel" aria-live="polite"><div class="context-guide-head"><div class="context-guide-head-row"><div><span class="eyebrow">CONTEXT GUIDE / SECONDARY</span><h2>${topic.label}</h2><p>${topic.summary}</p></div><span class="context-guide-badge">SAMPLE</span></div></div><div class="context-guide-body"><div class="context-guide-tabs" role="tablist" aria-label="Context Guide表示"><button type="button" class="context-guide-tab${activeGuideTab==='meaning'?' active':''}" data-guide-tab="meaning">意味</button><button type="button" class="context-guide-tab${activeGuideTab==='condition'?' active':''}" data-guide-tab="condition">選択条件</button><button type="button" class="context-guide-tab${activeGuideTab==='caution'?' active':''}" data-guide-tab="caution">注意</button><button type="button" class="context-guide-tab${activeGuideTab==='evidence'?' active':''}" data-guide-tab="evidence">根拠</button></div>${guideContentMarkup(topic)}<div class="context-guide-actions"><button type="button" class="context-guide-primary" data-guide-close>確認して入力へ戻る</button><button type="button" class="context-guide-secondary" data-guide-tab="evidence">根拠情報を見る</button></div></div></aside>`;
}

function fieldMarkup({label,topic,value,state='入力済み',type='value'}){
  const help=topic?`<button type="button" class="guide-help-button${activeGuideId===topic?' active':''}" data-guide-topic="${topic}" aria-label="${label}の説明を開く">?</button>`:'';
  const control=type==='select'
    ? `<select class="guide-control" aria-label="${label}"><option>${value}</option><option>別候補（Sample）</option></select>`
    : `<div class="guide-value">${value}</div>`;
  return `<div class="guide-field"><div class="guide-field-label">${label}${help}</div>${control}<span class="guide-state">${state}</span></div>`;
}

function mainMarkup(){
  return `<div id="guidePilotRoot"><div class="page-head guide-page-head"><div><div class="eyebrow">Design Pilot / Information Hierarchy & Context Guide</div><h1>迷ったときだけ、すぐ確認できる商品選定</h1><p class="lead">作業に必要な情報は常時表示し、判断補助と詳細情報は必要なときだけ段階的に展開する。</p></div><span class="guide-sample-note">Sample / UI確認用</span></div><section class="guide-layout"><div class="panel guide-form-panel"><div class="guide-panel-head"><div><span class="eyebrow">PRIMARY / CURRENT TASK</span><h2>商品仕様</h2><p>いま入力に必要な項目だけを主役にする。</p></div><div class="hierarchy-key"><span class="hierarchy-pill">PRIMARY 常時</span><span class="hierarchy-pill">SECONDARY 必要時</span><span class="hierarchy-pill">DETAIL 展開時</span></div></div><div class="guide-fields">${fieldMarkup({label:'商品',value:'Sample Window / 外窓',state:'Sample'})}${fieldMarkup({label:'窓種類',value:'引違い窓',type:'select'})}${fieldMarkup({label:'ガラス仕様',value:'Low-E複層ガラス',type:'select'})}${fieldMarkup({label:'Low-E性能',topic:'lowe',value:'断熱タイプ',type:'select'})}${fieldMarkup({label:'スペーサー',topic:'spacer',value:'樹脂スペーサー',type:'select'})}${fieldMarkup({label:'サイズ方式',topic:'size',value:'STANDARD',type:'select'})}</div><div class="guide-inline-tip"><strong>Secondary情報：</strong> 選択理由・用語説明・不可理由などは「？」から確認。常時長文を表示せず、作業の流れを止めない。</div><button class="guide-detail-toggle" type="button" data-guide-detail aria-expanded="false">成立条件・依存関係を見る <span class="sr-only">Detail情報</span></button><div class="guide-detail" data-guide-detail-panel hidden><dl class="guide-dependency"><dt>サイズ方式</dt><dd>上流条件に応じてSTANDARD / CUSTOM候補をRuntimeから表示</dd><dt>下流クリア</dt><dd>上流変更で無効になった値は保持しない</dd><dt>判断不能</dt><dd>REVIEW_REQUIRED / MANUAL_CHECKとして推測しない</dd><dt>正式根拠</dt><dd>Runtime / Dependency / Evidenceをread-only参照</dd></dl></div></div><div data-guide-panel>${guidePanelMarkup()}</div></section><div class="proposal-footer-note">この画面はDesign Pilotです。商品名・候補・説明はUI確認用Sampleであり、正式なメーカー情報や商品マスターではありません。正式運用ではContext Guideの候補・成立条件・根拠を正式Runtime / Evidenceへ接続し、UI側で商品仕様を推測しません。</div></div>`;
}

function mountGuide(){
  if(!isGuideView())return;
  document.querySelectorAll('.design-nav a').forEach((link)=>link.classList.toggle('active',link.dataset.section==='guide'));
  const main=document.querySelector('#designMain');
  if(!main||main.querySelector('#guidePilotRoot'))return;
  main.innerHTML=mainMarkup();
}

function renderGuidePanel(){
  const host=document.querySelector('[data-guide-panel]');
  if(!host)return;
  host.innerHTML=guidePanelMarkup();
  document.querySelectorAll('[data-guide-topic]').forEach((button)=>button.classList.toggle('active',button.dataset.guideTopic===activeGuideId));
}

document.addEventListener('click',(event)=>{
  if(!isGuideView())return;
  const topicButton=event.target.closest('[data-guide-topic]');
  if(topicButton){activeGuideId=topicButton.dataset.guideTopic;activeGuideTab='meaning';renderGuidePanel();return;}
  const tabButton=event.target.closest('[data-guide-tab]');
  if(tabButton&&activeGuideId){activeGuideTab=['meaning','condition','caution','evidence'].includes(tabButton.dataset.guideTab)?tabButton.dataset.guideTab:'meaning';renderGuidePanel();return;}
  const closeButton=event.target.closest('[data-guide-close]');
  if(closeButton){activeGuideId=null;activeGuideTab='meaning';renderGuidePanel();return;}
  const detailButton=event.target.closest('[data-guide-detail]');
  if(detailButton){const panel=document.querySelector('[data-guide-detail-panel]');const expanded=detailButton.getAttribute('aria-expanded')==='true';detailButton.setAttribute('aria-expanded',String(!expanded));if(panel)panel.hidden=expanded;}
});

const rootObserver=new MutationObserver(()=>mountGuide());
const start=()=>{const main=document.querySelector('#designMain');if(main)rootObserver.observe(main,{childList:true});mountGuide();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
