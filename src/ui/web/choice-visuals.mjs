const assetPattern=/^\/api\/runtime-master\/choice-image\/[a-f0-9]{64}\.(?:png|jpg|webp)\?productId=[A-Za-z0-9%._~-]+$/;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=visual=>visual&&(assetPattern.test(visual.src??'')||/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(visual.src??''));
const extension=choice=>/^data:image\/(png|webp);/.exec(choice.visual.src)?.[1]??/\.(png|webp)\?/.exec(choice.visual.src)?.[1]??'jpg';
const filename=choice=>{
  const declared=choice.visual.download_name;
  if(typeof declared==='string' && /^[^<>:"/\\|?*\u0000-\u001f]{1,100}$/.test(declared) && !declared.startsWith('.') && declared.endsWith('.'+extension(choice)))return declared;
  return String(choice.value).replace(/[^A-Za-z0-9_-]/g,'_')+'.'+extension(choice);
};
const badge=choice=>choice.presentationBadge?`<span class="choice-feature-badge" style="display:inline-block;border-radius:5px;background:#e4f5ee;color:#146347;padding:2px 7px;font-size:12px;font-weight:700">${esc(choice.presentationBadge)}</span>`:'';

const recommendationBadge=choice=>choice.visualRecommendationLabel?`<span class="choice-recommendation-badge" style="display:inline-block;border-radius:5px;background:#e5f0ff;color:#20518c;padding:2px 7px;font-size:12px;font-weight:700">${esc(choice.visualRecommendationLabel)}</span>`:'';
export function recommendationOptionAttributes(field,choice,selected=[]){
  if(!field.visualRecommendation?.enabled)return '';
  const preferred=!!choice.visualRecommendationLabel,picked=selected.some(value=>String(value)===String(choice.value));
  return ` data-visual-recommended="${preferred}"${!preferred&&!picked?' hidden style="display:none"':''}`;
}
export function renderChoiceRecommendationScope(field,selected=[],inDialog=false){
  const r=field.visualRecommendation;if(!r)return '';
  const excluded=r.enabled&&selected.some(value=>value!=null&&value!==''&&!r.standardValues.includes(String(value))&&!r.recommendedValues.includes(String(value)));
  return `<div class="choice-recommendation-scope" style="margin:8px 0;padding:10px;border:1px solid #b9c8d4;border-radius:8px;background:#f4f8fa">${r.enabled?`<label style="display:grid;gap:4px;font-weight:600">${esc(r.label)}<select data-visual-scope="${esc(field.key)}" style="padding:8px;font-size:16px"><option value="recommended">標準・推奨候補</option><option value="all">全候補を表示</option></select></label><small>標準・推奨以外の候補も「全候補を表示」から選べます。</small>`:''}${r.notice?`<p style="font-size:13px;margin:6px 0">${esc(r.notice)}</p>`:''}${!inDialog?`<p data-visual-scope-selected ${excluded?'':'hidden'} style="font-size:13px">選択中の候補は標準・推奨以外です。選択内容を保持してプルダウンに表示しています。</p>`:''}</div>`;
}

export function renderChoiceVisuals(field, selected=[]) {
  const choices=field.values.filter(choice=>safe(choice.visual));
  if(!choices.length)return '';
  const picked=choices.find(choice=>selected.some(value=>String(value)===String(choice.value)));
  const minCard=Number.isFinite(field.visualLayout?.minCardWidth)?field.visualLayout.minCardWidth:120;
  const thumbHeight=Number.isFinite(field.visualLayout?.thumbnailHeight)?field.visualLayout.thumbnailHeight:128;
  const caption=choice=>choice.visual.caption?`<p class="choice-image-caption" style="margin:6px 0;font-size:13px;font-weight:600">${esc(choice.visual.caption)}</p>`:'';
  const picture=(choice,large=false)=>`<img src="${esc(choice.visual.src)}" alt="${esc(choice.visual.alt)}" ${large?'':'loading="lazy"'} decoding="async" style="width:100%;height:${large?'min(36vh,330px)':thumbHeight+'px'};object-fit:contain;background:#fff">`;
  const preview=picked?`<figure class="choice-image-preview" data-field="${esc(field.key)}" data-value="${esc(picked.value)}" style="margin:12px auto;padding:12px;border:1px solid #d6dce2;border-radius:10px;background:#fff;max-width:420px">${picture(picked,true)}<figcaption><strong>${esc(picked.displayLabel)}</strong> ${recommendationBadge(picked)}${picked.visualRecommendationLabel?' ':''}${badge(picked)}${caption(picked)}<p style="font-size:12px;color:#52606d">${esc(picked.visual.note)}</p><small>${esc(picked.visual.source_label)}</small><br><a href="${esc(picked.visual.src)}" download="${esc(filename(picked))}" class="choice-image-download">画像を保存</a></figcaption></figure>`:'<p>画像を選ぶと、この項目の選択に反映されます。</p>';
  const filters=Array.isArray(field.visualFilters)?field.visualFilters:[];
  const scope=renderChoiceRecommendationScope(field,selected,true);
  const filterbar=filters.length?`<section class="choice-image-filters" aria-label="画像の絞り込み" style="padding:12px;border:1px solid #b9c8d4;border-radius:8px;background:#f4f8fa;margin:8px 0 16px"><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">${filters.map(filter=>`<label style="display:grid;gap:4px;min-width:120px;font-weight:600">${esc(filter.label)}<select data-visual-filter="${esc(filter.key)}" style="padding:8px;font-size:16px"><option value="">すべて</option>${filter.options.map(option=>`<option value="${esc(option.value)}">${esc(option.label)}</option>`).join('')}</select></label>`).join('')}<button type="button" data-visual-filter-reset style="padding:8px">条件を解除</button></div><p data-visual-filter-count role="status" aria-live="polite">該当 ${choices.length}件 / 候補 ${choices.length}件</p><p data-visual-filter-selected hidden style="font-size:13px">選択中の候補は絞り込み条件の対象外です。選択内容は変更していません。</p><p style="margin-bottom:0;font-size:12px;color:#52606d">現在の商品・扉デザインに対応する候補から絞り込みます。画像をクリックすると選択して閉じます。</p></section>`:'';
  const title=field.displayLabel??'選択肢';
  return `<div class="choice-visual-launcher"><button type="button" data-visual-open="${esc(field.key)}" aria-haspopup="dialog" style="margin-top:8px">画像で確認・選択</button>${picked?.presentationBadge?` ${badge(picked)}`:''}</div><dialog class="choice-image-modal" data-visual-dialog="${esc(field.key)}" aria-label="${esc(title)}の画像" style="box-sizing:border-box;width:calc(100vw - 24px);max-width:920px;max-height:85vh;padding:18px;border:1px solid #b9c8d4;border-radius:12px;overflow:auto"><header style="display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:-18px;background:#fff;padding:10px 0;z-index:1"><strong>${esc(title)}の画像</strong><button type="button" data-visual-close="${esc(field.key)}" aria-label="画像を閉じる">閉じる</button></header>${scope}${filters.length?filterbar:preview}<div class="choice-image-gallery" data-field="${esc(field.key)}"><p>画像で選ぶ（${choices.length}候補）</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(${minCard}px,100%),1fr));gap:8px;padding:4px">${choices.map(choice=>`<button type="button" data-visual-choice-key="${esc(field.key)}" data-value="${esc(choice.value)}"${field.visualRecommendation?.enabled?` data-visual-recommended="${!!choice.visualRecommendationLabel}"`:""}${filters.length?` data-visual-facets="${esc(JSON.stringify(choice.visualFacets??{}))}"`:""} aria-label="${esc(choice.displayLabel)}${choice.visualRecommendationLabel?" "+esc(choice.visualRecommendationLabel):""}${choice.presentationBadge?' '+esc(choice.presentationBadge):''}を選択" aria-pressed="${selected.some(value=>String(value)===String(choice.value))}" ${choice.disabled||field.disabled||field.readOnly?'disabled':''} style="min-width:0;padding:8px;border:1px solid ${selected.some(value=>String(value)===String(choice.value))?'#166e83':'#d6dce2'};border-radius:8px;background:#fff;color:#172b3a;cursor:pointer">${picture(choice)}<span>${esc(choice.displayLabel)}</span> ${recommendationBadge(choice)}${choice.visualRecommendationLabel?' ':''}${badge(choice)}${caption(choice)}</button>`).join('')}</div>${filters.length?'<p data-visual-filter-empty hidden>該当する候補がありません。条件を変更してください。</p>':''}</div>${filters.length?preview.replace('<figcaption>','<figcaption><small>選択中の候補</small><br>'):''}<p style="font-size:12px;color:#52606d">${esc(picked?.visual.note??choices[0].visual.note)}</p><button type="button" data-visual-close="${esc(field.key)}">選択を確認して閉じる</button></dialog>`;
}

export function applyChoiceVisualFilters(dialog){
  const active=[...dialog.querySelectorAll('[data-visual-filter]')].filter(node=>node.value);
  const recommended=dialog.querySelector('[data-visual-scope]')?.value==='recommended';
  const cards=[...dialog.querySelectorAll('[data-visual-choice-key]')];
  let count=0,selectedExcluded=false;
  for(const card of cards){
    let facets={};try{facets=JSON.parse(card.dataset.visualFacets??'{}');}catch{}
    const matches=(!recommended||card.dataset.visualRecommended==='true')&&active.every(control=>facets[control.dataset.visualFilter]===control.value);
    card.hidden=!matches;card.style.display=matches?'':'none';
    if(matches)count++;
    if(!matches&&card.getAttribute('aria-pressed')==='true')selectedExcluded=true;
  }
  const status=dialog.querySelector('[data-visual-filter-count]');
  if(status)status.textContent=`該当 ${count}件 / 候補 ${cards.length}件`;
  const empty=dialog.querySelector('[data-visual-filter-empty]');if(empty)empty.hidden=count!==0;
  const notice=dialog.querySelector('[data-visual-filter-selected]');if(notice)notice.hidden=!selectedExcluded;
}
export function handleChoiceVisualFilter(root,event){
  const scope=event.target.closest('[data-visual-scope]');
  if(scope&&root.contains(scope)){
    const field=scope.closest('.field[data-key]');if(!field)return false;
    const preferred=scope.value==='recommended';
    for(const control of field.querySelectorAll('[data-visual-scope]'))control.value=scope.value;
    for(const option of field.querySelectorAll('select[data-spec-key] option[data-visual-recommended]')){
      const visible=!preferred||option.dataset.visualRecommended==='true'||option.selected;
      option.hidden=!visible;option.style.display=visible?'':'none';
    }
    const notice=field.querySelector('[data-visual-scope-selected]');if(notice)notice.hidden=!preferred||![...field.querySelectorAll('select[data-spec-key] option:checked')].some(option=>option.dataset.visualRecommended==='false');
    for(const dialog of field.querySelectorAll('dialog[data-visual-dialog]'))applyChoiceVisualFilters(dialog);
    return true;
  }
  const control=event.target.closest('[data-visual-filter]');
  if(!control||!root.contains(control))return false;
  const dialog=control.closest('dialog[data-visual-dialog]');if(!dialog)return false;
  applyChoiceVisualFilters(dialog);return true;
}

export function showChoiceVisualDialog(root,key){
  const dialog=[...root.querySelectorAll('dialog[data-visual-dialog]')].find(node=>node.dataset.visualDialog===key);
  if(!dialog)return;
  dialog.onclose=()=>[...root.querySelectorAll('[data-visual-open]')].find(node=>node.dataset.visualOpen===key)?.focus();
  applyChoiceVisualFilters(dialog);
  dialog.showModal();
}

export function handleChoiceVisualDialog(root,event){
  const reset=event.target.closest('[data-visual-filter-reset]');
  if(reset){const dialog=reset.closest('dialog[data-visual-dialog]');if(dialog){for(const control of dialog.querySelectorAll('[data-visual-filter]'))control.value='';applyChoiceVisualFilters(dialog);return true;}}
  const open=event.target.closest('[data-visual-open]'),close=event.target.closest('[data-visual-close]');
  const key=open?.dataset.visualOpen??close?.dataset.visualClose;
  const dialog=[...root.querySelectorAll('dialog[data-visual-dialog]')].find(node=>node.dataset.visualDialog===key);
  if(open&&dialog){showChoiceVisualDialog(root,key);return true;}
  if(close&&dialog){dialog.close();return true;}
  if(event.target.matches('dialog[data-visual-dialog]')){
    const box=event.target.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.target.close();
    return true;
  }
  return false;
}
