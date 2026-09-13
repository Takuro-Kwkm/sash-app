const surveyOpenings=[
  {id:'opn-sample-01',openingNo:1,room:'リビング',location:'南面',name:'掃き出し窓',w:'1690',h:'2030',status:'IN_PROGRESS',memo:'既存枠まわりを写真で記録。仕上げ材との取り合いは正式な現場調査項目へ接続して確認する。',photos:2},
  {id:'opn-sample-02',openingNo:2,room:'洋室',location:'東面',name:'腰窓',w:'1650',h:'1100',status:'COMPLETE',memo:'Sample開口。入力値はUI確認用で、正式な採寸記録ではありません。',photos:3},
  {id:'opn-sample-03',openingNo:3,room:'浴室',location:'北面',name:'小窓',w:'780',h:'700',status:'DRAFT',memo:'',photos:1}
];

let activeOpeningIndex=0;
let activeDimension='w';

function isSurveyView(){
  const url=new URL(location.href);
  return url.pathname.replace(/\/+$/,'')==='/design-preview'&&url.searchParams.get('view')==='survey';
}

function statusLabel(status){
  if(status==='COMPLETE')return '採寸完了';
  if(status==='IN_PROGRESS')return '入力中';
  return '未着手';
}

function openingButton(opening,index){
  const complete=opening.status==='COMPLETE';
  return `<button type="button" class="survey-opening-button${index===activeOpeningIndex?' active':''}" data-survey-opening="${index}" aria-pressed="${index===activeOpeningIndex}"><strong>開口 ${opening.openingNo}｜${opening.room}</strong><small>${opening.location}・${opening.name}</small><span class="survey-opening-state${complete?' complete':''}">${statusLabel(opening.status)}</span></button>`;
}

function photoMarkup(opening){
  return [0,1,2].map((index)=>{
    const filled=index<opening.photos;
    return `<button type="button" class="survey-photo${filled?' filled':''}" data-survey-photo="${index}" aria-label="現場写真 ${index+1}${filled?'を確認':'を追加'}">${filled?`<span><b>▧</b>現場写真 ${index+1}</span>`:`<span><b>＋</b>写真を追加</span>`}</button>`;
  }).join('');
}

function diagramMarkup(opening){
  const w=opening.w||'—';
  const h=opening.h||'—';
  return `<svg class="survey-diagram" data-active="${activeDimension}" viewBox="0 0 560 430" role="img" aria-label="採寸図。現在は${activeDimension==='w'?'W 横寸法':'H 縦寸法'}を強調表示"><g class="window-body"><rect class="frame" x="120" y="75" width="330" height="260" rx="3"/><rect class="glass" x="136" y="91" width="144" height="228"/><rect class="glass" x="290" y="91" width="144" height="228"/><line class="meeting" x1="285" y1="88" x2="285" y2="322"/></g><g class="dimension dimension-w"><line x1="120" y1="370" x2="450" y2="370"/><line x1="120" y1="358" x2="120" y2="382"/><line x1="450" y1="358" x2="450" y2="382"/><path d="M120 370 l14 -7 v14 z"/><path d="M450 370 l-14 -7 v14 z"/></g><text class="dimension-text dimension-text-w" x="285" y="402" text-anchor="middle">W ${w} mm</text><g class="dimension dimension-h"><line x1="82" y1="75" x2="82" y2="335"/><line x1="70" y1="75" x2="94" y2="75"/><line x1="70" y1="335" x2="94" y2="335"/><path d="M82 75 l-7 14 h14 z"/><path d="M82 335 l-7 -14 h14 z"/></g><text class="dimension-text dimension-text-h" x="36" y="205" text-anchor="middle" transform="rotate(-90 36 205)">H ${h} mm</text><text x="285" y="45" text-anchor="middle" fill="var(--text-secondary)" font-size="11">GENERIC MEASUREMENT FIGURE / SAMPLE</text></svg>`;
}

function mainMarkup(){
  const opening=surveyOpenings[activeOpeningIndex];
  const completeCount=surveyOpenings.filter((row)=>row.status==='COMPLETE').length;
  const isComplete=opening.status==='COMPLETE';
  return `<div id="surveyPilotRoot"><div class="page-head survey-page-head"><div><div class="eyebrow">Design Pilot / Field Survey & Measurement</div><h1>現場で測る、その場で残す</h1><p class="lead">開口を切り替えながら、入力値と採寸図を連動。iPadでのタッチ操作と現場での視認性を優先する。</p></div><span class="survey-sample-note">Sample / UI確認用</span></div><div class="survey-project-bar"><div class="survey-project-meta"><strong>Sample Project｜戸建改修 現場調査</strong><small>既存 Work Management の Project → Estimate → Opening を想定した表示例</small></div><div class="survey-progress"><span>調査進捗</span><b>${completeCount} / ${surveyOpenings.length}</b><span>開口完了</span></div></div><section class="survey-layout"><aside class="panel survey-openings"><div class="survey-panel-head"><span class="eyebrow">OPENINGS</span><h2>調査する開口</h2></div><div class="survey-opening-list">${surveyOpenings.map(openingButton).join('')}</div></aside><section class="panel survey-form"><div class="survey-form-head"><div><span class="eyebrow">OPENING ${opening.openingNo}</span><h2>${opening.room}｜${opening.name}</h2><p>${opening.location}・Opening ID: ${opening.id}</p></div><span class="survey-form-status${isComplete?' complete':''}">${statusLabel(opening.status)}</span></div><div class="survey-fields"><div class="survey-field"><label for="surveyWidth">W 横寸法 <small>Generic Sample Field</small></label><div class="survey-input-wrap"><input id="surveyWidth" class="survey-input" data-survey-dimension="w" inputmode="numeric" value="${opening.w}" aria-label="W 横寸法"><span class="survey-unit">mm</span></div><div class="survey-field-note">入力欄を選ぶと、右の採寸図でW位置を強調します。</div></div><div class="survey-field"><label for="surveyHeight">H 縦寸法 <small>Generic Sample Field</small></label><div class="survey-input-wrap"><input id="surveyHeight" class="survey-input" data-survey-dimension="h" inputmode="numeric" value="${opening.h}" aria-label="H 縦寸法"><span class="survey-unit">mm</span></div><div class="survey-field-note">商品・工法ごとに必要な追加寸法は、正式な業務仕様から表示する前提です。</div></div><div class="survey-field"><label>現場写真 <small>${opening.photos} / 3 Sample</small></label><div class="survey-photos">${photoMarkup(opening)}</div></div><div class="survey-field"><label for="surveyMemo">現場メモ <small>Opening memo想定</small></label><textarea id="surveyMemo" class="survey-input survey-textarea" data-survey-memo aria-label="現場メモ">${opening.memo}</textarea></div></div><div class="survey-actions"><button type="button" class="survey-primary" data-survey-complete>${isComplete?'採寸完了を解除':'この開口の採寸を完了'}</button><button type="button" class="survey-secondary" data-survey-next>次の開口へ</button></div></section><aside class="panel survey-diagram-panel"><div class="survey-diagram-head"><div><span class="eyebrow">MEASUREMENT GUIDE</span><h2>採寸図</h2><p>入力中の寸法だけを強調し、視線移動を減らす。</p></div><span class="survey-active-chip">${activeDimension==='w'?'W を入力中':'H を入力中'}</span></div><div class="survey-diagram-stage">${diagramMarkup(opening)}<div class="survey-touch-tip"><span>i</span><p><strong>タッチ端末向け：</strong> 入力欄・開口切替・完了操作は44px以上の操作領域を確保。採寸図は入力フォームからすぐ確認できる位置に置く。</p></div></div><div class="survey-diagram-caption"><strong>Design boundary：</strong> この図はW/H連動のUI確認用共通図です。実際の商品・工法で必要な採寸箇所、寸法定義、許容範囲、判定ロジックをここで新規定義しません。</div></aside></section><div class="survey-footer-note"><strong>Sample only：</strong> 開口名・寸法・写真・メモはDesign Pilot用。正式実装では既存Project / Estimate / Openingとの整合を保ち、商品固有の採寸項目や成立条件をUI側で推測・ハードコードしません。</div></div>`;
}

function renderSurvey(){
  if(!isSurveyView())return;
  document.querySelectorAll('.design-nav a').forEach((link)=>link.classList.toggle('active',link.dataset.section==='survey'));
  const main=document.querySelector('#designMain');
  if(!main)return;
  main.innerHTML=mainMarkup();
}

function mountSurvey(){
  if(!isSurveyView())return;
  const main=document.querySelector('#designMain');
  if(!main||main.querySelector('#surveyPilotRoot'))return;
  renderSurvey();
}

document.addEventListener('click',(event)=>{
  if(!isSurveyView())return;
  const openingButton=event.target.closest('[data-survey-opening]');
  if(openingButton){activeOpeningIndex=Number(openingButton.dataset.surveyOpening);activeDimension='w';renderSurvey();return;}
  const completeButton=event.target.closest('[data-survey-complete]');
  if(completeButton){const opening=surveyOpenings[activeOpeningIndex];opening.status=opening.status==='COMPLETE'?'IN_PROGRESS':'COMPLETE';renderSurvey();return;}
  const nextButton=event.target.closest('[data-survey-next]');
  if(nextButton){activeOpeningIndex=(activeOpeningIndex+1)%surveyOpenings.length;activeDimension='w';renderSurvey();return;}
  const photoButton=event.target.closest('[data-survey-photo]');
  if(photoButton){const opening=surveyOpenings[activeOpeningIndex];const index=Number(photoButton.dataset.surveyPhoto);if(index>=opening.photos&&opening.photos<3)opening.photos+=1;renderSurvey();}
});

document.addEventListener('focusin',(event)=>{
  if(!isSurveyView())return;
  const input=event.target.closest('[data-survey-dimension]');
  if(!input)return;
  activeDimension=input.dataset.surveyDimension==='h'?'h':'w';
  const diagram=document.querySelector('.survey-diagram');
  if(diagram){diagram.dataset.active=activeDimension;diagram.setAttribute('aria-label',`採寸図。現在は${activeDimension==='w'?'W 横寸法':'H 縦寸法'}を強調表示`);}
  const chip=document.querySelector('.survey-active-chip');
  if(chip)chip.textContent=activeDimension==='w'?'W を入力中':'H を入力中';
});

document.addEventListener('input',(event)=>{
  if(!isSurveyView())return;
  const dimension=event.target.closest('[data-survey-dimension]');
  if(dimension){const key=dimension.dataset.surveyDimension==='h'?'h':'w';surveyOpenings[activeOpeningIndex][key]=dimension.value.replace(/[^0-9]/g,'');dimension.value=surveyOpenings[activeOpeningIndex][key];const text=document.querySelector(`.dimension-text-${key}`);if(text)text.textContent=`${key.toUpperCase()} ${dimension.value||'—'} mm`;return;}
  const memo=event.target.closest('[data-survey-memo]');
  if(memo)surveyOpenings[activeOpeningIndex].memo=memo.value;
});

const rootObserver=new MutationObserver(()=>mountSurvey());
const start=()=>{const main=document.querySelector('#designMain');if(main)rootObserver.observe(main,{childList:true});mountSurvey();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
