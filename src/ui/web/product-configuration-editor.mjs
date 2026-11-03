import { createProductConfigurationSnapshot, applyDeclaredInputClears } from '/work-management/domain.mjs';
import { productChoices, choiceForMember, memberForChoice } from '/product-choice-model.mjs';
import { withConfigurationMigrationAudit } from '/work-management/configuration-migration.mjs';

const esc=(value)=>String(value??'').replace(/[&<>'\"]/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"})[character]);
const reviewChoiceLabel=(value)=>`${esc(value.displayLabel)}${value.manualCheck&&!String(value.displayLabel).includes('要確認')?'（要確認）':''}`;
const TECHNICAL_TOKEN=/\b(?:CUSTOM_DIMENSION|RUNTIME|ORDER_READY|[A-Z][A-Z0-9]+(?:_[A-Z0-9]+){1,})\b/;
const STATUS_LABELS=Object.freeze({
  BLOCK:'製作範囲外',BLOCKED:'選択できません',REVIEW_REQUIRED:'要確認',MANUAL_CHECK:'要確認',
  PENDING:'確認待ち',INCOMPLETE:'入力が必要です',INVALID:'入力内容を確認してください',
  PASS:'入力可能',VALID:'入力可能',ACCEPTED:'入力可能',
});
function runtimeFieldLabel(result,key){
  return result.fields?.find((field)=>field.key===key)?.displayLabel
    ??({custom_width:'特注W',custom_height:'特注H',size_mode:'サイズ方式',size:'規格サイズ'})[key]
    ??'入力内容';
}
function runtimeErrorCode(error){return String(error?.errorCode??error?.code??'');}
function friendlyValidationError(error,result){
  const code=runtimeErrorCode(error);
  if(code==='CUSTOM_DIMENSION_OUT_OF_FORMAL_OUTER_BOUNDS')return '入力した特注サイズは、この仕様の製作範囲外です。W・Hを変更してください。';
  if(code==='CUSTOM_DIMENSION_FORMAL_RULE_MISSING')return 'この仕様の特注サイズは自動判定できません。メーカーへの確認が必要です。';
  const message=String(error?.message??'').trim();
  if(message&&!TECHNICAL_TOKEN.test(message))return message;
  return `${runtimeFieldLabel(result,error?.field)}の入力内容を確認してください。`;
}
function friendlyDimension(dimension){
  const code=String(dimension?.code??'');
  if(code==='CUSTOM_DIMENSION_OUT_OF_FORMAL_OUTER_BOUNDS')return {status:'製作範囲外',message:'入力した特注サイズは、この仕様の製作範囲外です。W・Hを変更してください。'};
  if(code==='CUSTOM_DIMENSION_FORMAL_REVIEW_REQUIRED')return {status:'要確認',message:'入力した特注サイズは外枠範囲内ですが、原本グラフ・ガラス構成・耐風圧などはメーカー一次資料で確認してください。'};
  if(code==='CUSTOM_DIMENSION_FORMAL_RULE_MISSING')return {status:'確認が必要です',message:'この仕様の特注サイズは自動判定できません。メーカーへの確認が必要です。'};
  const rawStatus=String(dimension?.status??'');
  const rawMessage=String(dimension?.message??'').trim();
  return {status:STATUS_LABELS[rawStatus]??'確認が必要です',message:rawMessage&&!TECHNICAL_TOKEN.test(rawMessage)?rawMessage:''};
}
function friendlyNotice(value){
  const text=String(typeof value==='string'?value:value?.message??value?.code??'').trim();
  if(!text)return'';
  if(/^ORDER_READY\s*=\s*false\s*[:：]?/i.test(text))return text.replace(/^ORDER_READY\s*=\s*false\s*[:：]?\s*/i,'');
  if(/^成立不可Rule\s*[:：]/.test(text))return 'この組み合わせは成立しません。';
  if(TECHNICAL_TOKEN.test(text))return 'この内容は追加確認が必要です。';
  return text;
}
function uniqueFriendlyNotices(values){return [...new Set(values.map(friendlyNotice).filter(Boolean))];}

async function getJson(url){
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.error??`${response.status} ${url}`);}
  return response.json();
}

function fill(select,rows,placeholder='選択してください'){
  const current=select.value;
  select.innerHTML=`<option value="">${placeholder}</option>`+rows.map((row)=>`<option value="${esc(row.value)}"${row.disabled?' disabled':''}>${esc(row.label)}</option>`).join('');
  select.disabled=rows.length===0;
  if(rows.some((row)=>String(row.value)===String(current)&&!row.disabled))select.value=current;
}

function variantDefinitionFor(product,configuration={}){
  const contract=product?.productVariantContract;
  if(!contract)return null;
  const value=configuration?.[contract.fieldKey]??contract.defaultVariant;
  return contract.variants?.find((row)=>row.value===value)??null;
}

function identityFor(product,configuration={}){
  const variant=variantDefinitionFor(product,configuration);
  if(variant?.identity)return variant.identity;
  const canonical=product.sourceType==='RUNTIME_MASTER';
  return product.canonicalRuntimeReference?.runtimeManifestDriveFileId
    ??(!canonical?product.source?.id??null:null);
}

function packageVersionFor(product,configuration={}){
  return variantDefinitionFor(product,configuration)?.packageVersion??product.packageVersion??product.source?.version??'LEGACY-UNVERSIONED';
}

export class ProductConfigurationEditor {
  constructor(root,{initialSnapshot=null,initialProductId=null,onSnapshot=()=>{},showInventory=false}={}){
    this.root=root;this.initialSnapshot=initialSnapshot;this.initialProductId=initialProductId;this.onSnapshot=onSnapshot;this.showInventory=showInventory;
    this.state={products:[],productChoiceId:null,productId:null,productSource:'CATALOG',selection:{},resolved:null,resolveRevision:0,snapshot:initialSnapshot,userRequirements:initialSnapshot?.user_requirements??null,stale:false};
    this.boundChange=(event)=>this.handleChange(event);
    this.boundClick=(event)=>this.handleClick(event);
  }

  async mount(){
    this.root.innerHTML=`
      <section class="card runtime-editor">
        <div class="section-heading"><div><h2>商品仕様</h2><p class="lead">正式Runtime / 既存共通Catalogから商品設定を入力します。</p></div><span id="runtimeVersionBadge" class="version-badge" hidden></span></div>
        <div id="runtimeStaleNotice"></div>
        <div class="field"><label for="manufacturer">メーカー</label><select id="manufacturer"><option value="">選択してください</option></select></div>
        <div class="field"><label for="product">商品</label><select id="product" disabled><option value="">選択してください</option></select></div>
        <div id="productSpecificationField" class="field" hidden><label for="productSpecification">仕様<span class="required">必須</span></label><select id="productSpecification" required disabled><option value="">選択してください</option></select></div>
        <div id="dynamicForm"></div><div id="warnings"></div>
        <section data-user-requirements-section hidden>
          <div class="field" data-workflow-control="special_specification_requested" data-label="特別仕様の相談" data-semantic-stage="OPTION">
            <label>特別仕様の相談</label><div class="multi-enum-group" role="group" aria-label="特別仕様の相談"><label class="multi-enum-option"><input type="checkbox" data-special-specification-request><span>特別仕様について相談する（積算確認）</span></label></div>
          </div>
          <div class="field"><label>ユーザーの要望</label><textarea rows="3" data-workflow-control="user_requirements" data-label="ユーザーの要望" data-semantic-stage="OPTION" placeholder="ご希望や積算への相談内容を入力"></textarea></div>
        </section>
      </section>
      <section class="card compact"><h2>選択内容</h2><div id="selectionSummary" class="summary muted">商品を選択してください。</div></section>
      <section id="productCodeCard" class="card compact" hidden><h2>品番結果</h2><div id="productCodeResults" class="summary"></div></section>
      ${this.showInventory?'<section class="card compact"><h2>Runtime Catalog</h2><div id="inventory"></div></section>':''}`;
    this.root.addEventListener('change',this.boundChange);
    this.root.addEventListener('click',this.boundClick);
    const [catalogProducts,runtimeProducts,health]=await Promise.all([
      getJson('/api/catalog/products'),getJson('/api/runtime-master/integrations'),getJson('/api/health'),
    ]);
    // If the App Runtime Integration Registry knows a product, never expose a legacy/skeleton
    // Catalog row for the same app product id. READY or BLOCKED Runtime identity is authoritative.
    const runtimeIds=new Set(runtimeProducts.map((row)=>row.id));
    this.state.products=[
      ...catalogProducts.filter((row)=>!runtimeIds.has(row.id)).map((row)=>({...row,sourceType:'CATALOG'})),
      ...runtimeProducts.map((row)=>({...row,sourceType:'RUNTIME_MASTER'})),
    ];
    this.productChoices=productChoices(this.state.products);
    const manufacturers=[...new Set(this.state.products.map((row)=>row.manufacturer))].sort((a,b)=>a.localeCompare(b,'ja'));
    fill(this.root.querySelector('#manufacturer'),manufacturers.map((value)=>({value,label:value})));
    if(this.showInventory)this.renderInventory(health);
    const status=document.querySelector('#status');
    if(this.showInventory&&status){status.textContent='CATALOG CONNECTED';status.classList.add('ok');}
    const build=document.querySelector('#build');
    if(build)build.textContent=health.candidateIdentity?'UI候補 · 仕様・寸法・画像をご確認ください':`${health.buildId} · ${health.catalogVersion}`;
    await this.restoreSnapshot();
    if(!this.initialSnapshot&&this.initialProductId){
      const product=this.state.products.find(row=>row.id===this.initialProductId);
      const choice=choiceForMember(this.productChoices,this.initialProductId);
      if(!product&&choice?.grouped&&choice.selectable!==false){
        this.selectManufacturer(choice.manufacturer);
        this.root.querySelector('#product').value=choice.id;
        this.state.productChoiceId=choice.id;this.renderSpecificationChoice(choice);
        this.root.querySelector('#selectionSummary').textContent=`${choice.specificationLabel}を選択してください。`;
        return;
      }
      if(!product||product.selectable===false)throw Error('指定した商品Runtimeを利用できません。');
      this.restoreProductControls(product);
      this.state.productId=product.id;this.state.productSource=product.sourceType;
      await this.resolve({notify:false});
    }
  }

  destroy(){this.closeImagePreview();this.root.removeEventListener('change',this.boundChange);this.root.removeEventListener('click',this.boundClick);}
  getSnapshot(){return this.state.snapshot;}

  productsForManufacturer(manufacturer){return this.state.products.filter((row)=>row.manufacturer===manufacturer);}
  selectManufacturer(manufacturer){
    this.root.querySelector('#manufacturer').value=manufacturer??'';
    fill(this.root.querySelector('#product'),this.productChoices.filter(row=>row.manufacturer===manufacturer).map((row)=>({
      value:row.id,
      label:row.grouped?row.displayName:row.sourceType==='RUNTIME_MASTER'
        ?(row.selectable===false?`${row.displayName??row.series}（利用不可）`:`${row.displayName??row.series} [Runtime]`)
        :(row.displayName??row.series),
      disabled:row.selectable===false,
    })));
    this.root.querySelector('#product').value='';this.renderSpecificationChoice(null);
  }

  renderSpecificationChoice(choice){
    const field=this.root.querySelector('#productSpecificationField'),select=this.root.querySelector('#productSpecification');
    field.hidden=!choice?.grouped;
    fill(select,(choice?.members??[]).map(member=>({value:member.id,label:member.productSelectionGroup.specificationName,disabled:member.selectable===false})));
    select.value='';select.required=Boolean(choice?.grouped);
    if(choice?.grouped)field.querySelector('label').innerHTML=`${esc(choice.specificationLabel)}<span class="required">必須</span>`;
  }

  restoreProductControls(product){
    this.selectManufacturer(product.manufacturer);
    const choice=choiceForMember(this.productChoices,product.id);
    this.state.productChoiceId=choice.id;this.root.querySelector('#product').value=choice.id;
    this.renderSpecificationChoice(choice);
    if(choice.grouped)this.root.querySelector('#productSpecification').value=product.id;
  }

  resetProductConfiguration(){
    this.state.resolveRevision+=1;this.state.productId=null;this.state.selection={};this.state.resolved=null;this.state.snapshot=null;this.state.stale=false;
    for(const id of ['dynamicForm','warnings','runtimeStaleNotice'])this.root.querySelector('#'+id).innerHTML='';
    this.root.querySelector('#runtimeVersionBadge').hidden=true;this.root.querySelector('#productCodeCard').hidden=true;
    this.root.querySelector('#selectionSummary').textContent='商品を選択してください。';
  }

  async restoreSnapshot(){
    const snapshot=this.initialSnapshot;
    if(!snapshot)return;
    const product=this.state.products.find((row)=>row.id===snapshot.product_id);
    if(!product){this.renderFrozenSnapshot('保存時の商品経路を現在のアプリで読み込めません。');return;}
    this.restoreProductControls(product);
    this.state.productId=product.id;this.state.productSource=product.sourceType;this.state.selection={...snapshot.configuration};
    for(const field of product.salesRequestExtension?.fields??[]){
      const value=snapshot.sales_request_handoff?.[field.handoffKey];
      if(this.state.selection[field.key]===undefined&&value!==undefined)this.state.selection[field.key]=value;
    }
    this.state.stale=identityFor(product,snapshot.configuration)!==snapshot.runtime_manifest_identity||String(packageVersionFor(product,snapshot.configuration))!==String(snapshot.package_version);
    if(this.state.stale){this.renderFrozenSnapshot('旧Runtimeで作成された設定です。保存時Snapshotは自動更新されません。',true);return;}
    await this.resolve({notify:false});
    // Persist a semantic workflow migration on reload, including detached legacy
    // survey values, even when the user does not edit a visible product field.
    if(this.state.resolved?.workflowScope==='estimate')this.onSnapshot(this.state.snapshot,this.state.resolved);
  }

  renderFrozenSnapshot(message,canRevalidate=false){
    this.root.querySelector('#runtimeStaleNotice').innerHTML=`<div class="notice warning"><strong>${esc(message)}</strong>${canRevalidate?'<button class="button secondary small" type="button" data-runtime-action="revalidate">現在Runtimeで再検証</button>':''}</div>`;
    const badge=this.root.querySelector('#runtimeVersionBadge');badge.hidden=false;badge.textContent=`保存時 ${this.initialSnapshot?.package_version??'不明'}`;
    const rows=this.initialSnapshot?.display_summary??[];
    this.root.querySelector('#selectionSummary').innerHTML=rows.length?rows.map((row)=>`<div><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong></div>`).join(''):'保存時の表示要約はありません。';
    this.root.querySelector('#dynamicForm').innerHTML='<p class="muted">再検証するまで保存時Snapshotを保持します。</p>';
  }

  async handleClick(event){
    const preview=event.target.closest('[data-image-preview-field]');
    if(preview){this.openImagePreview(preview.dataset.imagePreviewField,preview);return;}
    if(event.target.closest('[data-image-preview-close]')){this.closeImagePreview();return;}
    const remove=event.target.closest('[data-multi-remove-key]');
    if(remove&&!remove.disabled){
      const control=[...this.root.querySelectorAll('select[data-spec-key]')].find(row=>row.dataset.specKey===remove.dataset.multiRemoveKey);
      if(control&&!control.disabled){const option=[...control.options].find(row=>row.value===remove.dataset.multiRemoveValue);if(option){option.selected=false;await this.handleChange({target:control});}}
      return;
    }
    const choice=event.target.closest('[data-image-choice-field]');
    if(choice&&!choice.disabled){
      const control=[...this.root.querySelectorAll('select[data-spec-key]')].find(one=>one.dataset.specKey===choice.dataset.imageChoiceField);
      if(control&&!control.disabled&&!this.imageChoicePending){
        const key=choice.dataset.imageChoiceField,value=choice.dataset.imageChoiceValue,modal=choice.closest('dialog[data-choice-image-preview]');
        this.imageChoicePending=true;if(modal)modal.setAttribute('aria-busy','true');
        try{
          if(control.multiple){const option=[...control.options].find(row=>row.value===value);if(!option||option.disabled)return;option.selected=!option.selected;}
          else control.value=value;
          await this.handleChange({target:control});
          if(modal){
            const opener=[...this.root.querySelectorAll('[data-image-preview-field]')].find(row=>row.dataset.imagePreviewField===key);
            if(opener)opener.focus();
          }
        }finally{this.imageChoicePending=false;if(modal?.isConnected)modal.removeAttribute('aria-busy');}
      }
      return;
    }
    if(!event.target.closest('[data-runtime-action="revalidate"]'))return;
    this.state.stale=false;this.root.querySelector('#runtimeStaleNotice').innerHTML='';
    await this.resolve({notify:true});
  }

  async handleChange(event){
    const target=event.target;
    if(target.matches?.('[data-special-specification-request],textarea[data-workflow-control="user_requirements"]')){
      if(!this.state.snapshot||!this.state.resolved)return;
      const section=this.root.querySelector('[data-user-requirements-section]');
      const requirements={special_specification_requested:section.querySelector('[data-special-specification-request]').checked,text:section.querySelector('textarea').value};
      this.state.userRequirements=requirements;
      const product=this.state.products.find(row=>row.id===this.state.productId);
      this.state.snapshot=createProductConfigurationSnapshot({product,result:this.state.resolved,previousSnapshot:{...this.state.snapshot,user_requirements:requirements}});
      this.onSnapshot(this.state.snapshot,this.state.resolved);return;
    }
    if(target.id==='manufacturer'){
      this.resetProductConfiguration();this.state.productChoiceId=null;
      this.selectManufacturer(target.value);
      this.root.querySelector('#dynamicForm').innerHTML='';this.root.querySelector('#warnings').innerHTML='';
      this.root.querySelector('#selectionSummary').textContent='商品を選択してください。';this.root.querySelector('#productCodeCard').hidden=true;
      this.onSnapshot(null);return;
    }
    if(target.id==='product'){
      this.resetProductConfiguration();this.state.productChoiceId=target.value||null;
      const choice=this.productChoices.find(row=>row.id===this.state.productChoiceId);
      this.renderSpecificationChoice(choice);
      if(choice?.grouped){
        this.root.querySelector('#selectionSummary').textContent=`${choice.specificationLabel}を選択してください。`;
        this.onSnapshot(null);return;
      }
      this.state.productId=choice?.id??null;
      const product=this.state.products.find((row)=>row.id===this.state.productId);this.state.productSource=product?.sourceType??'CATALOG';
      if(!product){this.onSnapshot(null);return;}
      await this.resolve({notify:true});return;
    }
    if(target.id==='productSpecification'){
      this.resetProductConfiguration();
      const choice=this.productChoices.find(row=>row.id===this.state.productChoiceId);
      const product=memberForChoice(choice,target.value);
      if(!product){
        target.value='';this.root.querySelector('#selectionSummary').textContent=`${choice?.specificationLabel??'仕様'}を選択してください。`;
        this.onSnapshot(null);return;
      }
      this.state.productId=product.id;this.state.productSource=product.sourceType;
      await this.resolve({notify:true});return;
    }
    if(target.matches?.('select[data-multi-add-key]')){
      const control=[...this.root.querySelectorAll('select[data-spec-key]')].find(row=>row.dataset.specKey===target.dataset.multiAddKey);
      if(control&&!control.disabled&&target.value){const option=[...control.options].find(row=>row.value===target.value);if(option&&!option.disabled){option.selected=true;await this.handleChange({target:control});}}
      return;
    }
    const multiGroup=target.closest?.('[data-multi-enum="true"][data-multi-key]')??null;
    const control=multiGroup??target;
    if(!multiGroup&&!control.matches?.('[data-spec-key]'))return;
    const key=multiGroup?.dataset.multiKey??control.dataset.specKey;
    const previousValue=JSON.stringify(this.state.selection[key]);
    const field=this.state.resolved?.fields?.find((row)=>row.key===key);
    const canonicalChoice=(raw)=>{
      const match=field?.values?.find((row)=>String(row.value)===String(raw));
      if(!match)throw new Error(`Runtime option is not available for ${key}: ${raw}`);
      return match.value;
    };
    if(multiGroup){
      const values=[...multiGroup.querySelectorAll('input[data-multi-value]:checked')].map((input)=>canonicalChoice(input.value));
      if(values.length)this.state.selection[key]=values;else delete this.state.selection[key];
      const native=multiGroup.closest('.field')?.querySelector('select[data-spec-key]');
      if(native)for(const option of native.options)option.selected=values.some(value=>String(value)===String(option.value));
    }else if(target.type==='number'){
      if(target.value!=='')this.state.selection[key]=Number(target.value);else delete this.state.selection[key];
    }else if(target.type==='text'){
      if(target.value.trim()!=='')this.state.selection[key]=target.value;else delete this.state.selection[key];
    }else if(target.multiple){
      const values=[...target.selectedOptions].map((option)=>canonicalChoice(option.value));
      if(values.length)this.state.selection[key]=values;else delete this.state.selection[key];
    }else if(target.value)this.state.selection[key]=canonicalChoice(target.value);else delete this.state.selection[key];
    if(previousValue!==JSON.stringify(this.state.selection[key]))this.state.selection=applyDeclaredInputClears(this.state.selection,[key],this.state.resolved?.fields??[]);
    await this.resolve({notify:true,changedFields:previousValue!==JSON.stringify(this.state.selection[key])?[key]:[]});
  }

  async resolve({notify=true,changedFields=[]}={}){
    const revision=++this.state.resolveRevision,productId=this.state.productId;
    if(!productId){this.root.querySelector('#dynamicForm').innerHTML='';return;}
    const query=new URLSearchParams({productId,selection:JSON.stringify(this.state.selection)});
    if(changedFields.length)query.set('selectionContext',JSON.stringify({changedFields}));
    if(this.state.snapshot?.product_id===productId&&this.state.snapshot.package_version)query.set('configurationVersion',this.state.snapshot.package_version);
    const endpoint=this.state.productSource==='RUNTIME_MASTER'?'/api/runtime-master/resolve':'/api/catalog/resolve';
    let result=await getJson(`${endpoint}?${query}`);
    if(revision!==this.state.resolveRevision||productId!==this.state.productId)return;
    const clearedLabels=(result.clearedFields??[]).map(key=>this.state.resolved?.fields?.find(field=>field.key===key)?.displayLabel).filter(Boolean);
    if(clearedLabels.length)result.notices=[...(result.notices??[]),`条件変更により解除しました：${clearedLabels.join('、')}。必要な項目を再選択してください。`];
    this.closeImagePreview();
    this.state.selection=result.selection;this.state.resolved=result;
    const dynamicForm=this.root.querySelector('#dynamicForm');
    dynamicForm.innerHTML=this.renderFields(result.fields);
    dynamicForm.dataset.resolveRevision=String(revision);
    this.renderWarnings(result);this.renderSummary(result);this.renderProductCodes(result);
    const product=this.state.products.find((row)=>row.id===productId);
    const previousSnapshot=this.state.userRequirements?{...this.state.snapshot,user_requirements:this.state.userRequirements}:this.state.snapshot;
    this.state.snapshot=withConfigurationMigrationAudit(createProductConfigurationSnapshot({product,result,previousSnapshot}),this.state.snapshot,result.configurationMigration);
    const requirements=this.root.querySelector('[data-user-requirements-section]');
    requirements.hidden=result.presentation?.independentUserRequirements!==true;
    requirements.querySelector('[data-special-specification-request]').checked=this.state.snapshot.user_requirements?.special_specification_requested===true;
    requirements.querySelector('textarea').value=this.state.snapshot.user_requirements?.text??'';
    const badge=this.root.querySelector('#runtimeVersionBadge');badge.hidden=false;badge.textContent=`${this.state.snapshot.source_mode==='CANONICAL_RUNTIME'?'Runtime':'Legacy'} ${this.state.snapshot.package_version}`;
    if(notify)this.onSnapshot(this.state.snapshot,result);
  }

  renderFields(fields=[]){
    const product=this.state.products.find((row)=>row.id===this.state.productId);
    const groupIndividualOptions=product?.uiCategory==='INNER_WINDOW';
    let optionHeadingShown=false,previousGroup=null;
    return fields.map((field)=>{
      const group=field.presentationGroup;
      const showGroup=group?.id&&group.id!==previousGroup;
      if(group?.id)previousGroup=group.id;
      const showOptionHeading=!group&&groupIndividualOptions&&!optionHeadingShown&&field.semanticStage==='OPTION';
      if(showOptionHeading)optionHeadingShown=true;
      const feedback=field.feedback;
      return `${showGroup?`<div class="runtime-field-group-heading" data-semantic-group="${esc(group.id)}">${esc(group.label)}</div>`:''}${showOptionHeading?'<div class="runtime-field-group-heading" data-semantic-group="OPTION">オプション</div>':''}${this.renderField(field)}${feedback?`<div class="notice ${feedback.severity==='error'?'error':feedback.severity==='warning'?'warning':''}" data-field-feedback="${esc(field.key)}" role="status">${esc(feedback.message)}</div>`:''}`;
    }).join('');
  }

  renderField(field){
    const dataAttributes=`data-semantic-stage="${esc(field.semanticStage)}" data-semantic-slot="${esc(field.semanticSlot)}" data-label="${esc(field.displayLabel)}" data-read-only="${Boolean(field.readOnly)}"`;
    const attributes=`${dataAttributes}${field.required?' required':''}${field.disabled?' disabled':''}`;
    const required=field.required?'<span class="required">必須</span>':'';
    if(field.readOnly&&field.selectionMode==='DERIVED'){
      const choice=field.values.find(value=>String(value.value)===String(this.state.selection[field.key]));
      const display=field.dataType==='NUMBER'?(this.state.selection[field.key]??field.emptyLabel??'寸法の入力後に表示'):(choice?.displayLabel??'本体色の選択後に表示');
      return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}</label><output class="runtime-derived-value" data-spec-key="${esc(field.key)}" ${dataAttributes}>${esc(display)}</output>${this.renderChoiceImages(field, true)}${field.helpText?`<small class="field-help">${esc(field.helpText)}</small>`:''}</div>`;
    }
    if(field.dataType==='NUMBER')return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><div class="number-input"><input type="number" inputmode="decimal" step="${esc(field.step??'any')}" data-spec-key="${esc(field.key)}" ${attributes} value="${esc(this.state.selection[field.key]??'')}" placeholder="数値を入力">${field.unit?`<span>${esc(field.unit)}</span>`:''}</div>${field.helpText?`<small class="field-help">${esc(field.helpText)}</small>`:''}</div>`;
    if(field.dataType==='TEXT')return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><input type="text" data-spec-key="${esc(field.key)}" ${attributes} value="${esc(this.state.selection[field.key]??'')}" placeholder="入力してください">${field.helpText?`<small class="field-help">${esc(field.helpText)}</small>`:''}</div>`;
    const selected=Array.isArray(this.state.selection[field.key])?this.state.selection[field.key]:[this.state.selection[field.key]];
    const multi=field.dataType==='MULTI_ENUM';
    if(multi&&field.control==='DROPDOWN_MULTI'){
      const nativeOptions=field.values.map(value=>`<option value="${esc(value.value)}"${value.disabled?' disabled':''}${selected.some(one=>String(one)===String(value.value))?' selected':''}>${esc(value.displayLabel)}</option>`).join('');
      const addOptions=field.values.map(value=>`<option value="${esc(value.value)}"${value.disabled||selected.some(one=>String(one)===String(value.value))?' disabled':''}>${esc(value.displayLabel)}</option>`).join('');
      const chosen=field.values.filter(value=>selected.some(one=>String(one)===String(value.value))).map(value=>`<li><span>${esc(value.displayLabel)}</span><button type="button" data-multi-remove-key="${esc(field.key)}" data-multi-remove-value="${esc(value.value)}" aria-label="${esc(value.displayLabel)}を解除"${field.disabled||field.readOnly?' disabled':''}>解除</button></li>`).join('');
      return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><select class="multi-enum-native-control" data-spec-key="${esc(field.key)}" ${attributes} multiple aria-hidden="true" tabindex="-1">${nativeOptions}</select><select data-multi-add-key="${esc(field.key)}" aria-label="${esc(field.displayLabel)}を追加"${field.disabled||field.readOnly?' disabled':''}><option value="">選択して追加</option>${addOptions}</select>${chosen?`<ul class="multi-dropdown-selected" aria-label="${esc(field.displayLabel)}の選択内容">${chosen}</ul>`:''}${this.renderChoiceImages(field)}${field.helpText?`<small class="field-help">${esc(field.helpText)}</small>`:''}</div>`;
    }
    if(multi){
      const choices=field.values.map((value)=>`<label class="multi-enum-option"><input type="checkbox" data-multi-value="true" value="${esc(value.value)}"${value.disabled||field.disabled||field.readOnly?' disabled':''}${selected.some((one)=>String(one)===String(value.value))?' checked':''}><span>${reviewChoiceLabel(value)}</span>${value.image&&this.state.resolved?.presentation?.choiceImages?.mode!=='MODAL_ON_DEMAND'?`<img src="${esc(value.image.src)}" alt="${esc(value.image.alt)}" data-field="${esc(field.key)}" data-value="${esc(value.value)}" style="max-width:160px;max-height:120px;object-fit:contain"><small>${esc(value.image.source_label)}</small>`:''}</label>`).join('');
      const nativeOptions=field.values.map((value)=>`<option value="${esc(value.value)}"${value.disabled?' disabled':''}${selected.some((one)=>String(one)===String(value.value))?' selected':''}>${esc(value.displayLabel)}</option>`).join('');
      return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><select class="multi-enum-native-control" data-spec-key="${esc(field.key)}" ${attributes} multiple aria-hidden="true" tabindex="-1">${nativeOptions}</select><div class="multi-enum-group" role="group" aria-label="${esc(field.displayLabel)}" data-multi-enum="true" data-multi-key="${esc(field.key)}">${choices}</div>${this.state.resolved?.presentation?.choiceImages?.mode==='MODAL_ON_DEMAND'?this.renderChoiceImages(field):''}<small class="field-help">${esc(field.helpText??'複数選択できます')}</small></div>`;
    }
    const options=field.values.map((value)=>`<option value="${esc(value.value)}"${value.disabled?' disabled':''}${selected.some((one)=>String(one)===String(value.value))?' selected':''}>${reviewChoiceLabel(value)}</option>`).join('');
    return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><select data-spec-key="${esc(field.key)}" ${attributes}><option value="">選択してください</option>${options}</select>${this.renderChoiceImages(field)}${field.helpText?`<small class="field-help">${esc(field.helpText)}</small>`:''}</div>`;
  }

  renderChoiceImages(field,readOnly=false){
    const selected=this.state.selection[field.key];
    const values=field.values.filter(row=>row.image&&(!readOnly||String(row.value)===String(selected)));
    if(!values.length)return '';
    if(this.state.resolved?.presentation?.choiceImages?.mode==='MODAL_ON_DEMAND')return `<button type="button" class="choice-image-preview-trigger" data-image-preview-field="${esc(field.key)}" aria-haspopup="dialog" aria-label="${esc(field.displayLabel)}の画像を確認">画像で確認</button>`;
    return `<div class="runtime-choice-images" role="group" aria-label="${esc(field.displayLabel)}の画像">${values.map(row=>{
      const visual=row.image,contents=`<img src="${esc(visual.src)}" alt="${esc(visual.alt)}" data-field="${esc(field.key)}" data-value="${esc(row.value)}"><span>${esc(row.displayLabel)}</span><small>${esc(visual.source_label)}</small>`;
      return readOnly?`<div class="runtime-choice-image">${contents}</div>`:`<button type="button" class="runtime-choice-image" data-image-choice-field="${esc(field.key)}" data-image-choice-value="${esc(row.value)}" aria-pressed="${String(row.value)===String(selected)}"${row.disabled||field.disabled?' disabled':''}>${contents}</button>`;
    }).join('')}</div>`;
  }

  closeImagePreview(){
    const dialog=this.root.querySelector('dialog[data-choice-image-preview]');
    if(dialog){if(dialog.open)dialog.close();this.finishImagePreview(dialog);}
  }

  finishImagePreview(dialog){
    if(this.imagePreviewDialog!==dialog)return;
    const opener=this.imagePreviewOpener;this.imagePreviewDialog=null;this.imagePreviewOpener=null;dialog.remove();if(opener?.isConnected)opener.focus();
  }

  openImagePreview(key,opener){
    const field=this.state.resolved?.fields?.find(f=>f.key===key);if(!field)return;
    this.closeImagePreview();
    const selected=this.state.selection[key],selectedValues=Array.isArray(selected)?selected:[selected];
    const readOnly=field.readOnly&&field.selectionMode==='DERIVED';
    const values=field.values.filter(row=>row.image&&(!readOnly||selectedValues.some(v=>String(v)===String(row.value))));
    if(!values.length)return;
    const dialog=document.createElement('dialog');dialog.className='runtime-image-dialog';dialog.dataset.choiceImagePreview=key;dialog.setAttribute('aria-label',field.displayLabel+'の画像');
    dialog.innerHTML=`<header><h2>${esc(field.displayLabel)}の画像</h2><button type="button" data-image-preview-close autofocus>閉じる</button></header><p>${readOnly?'現在の選択内容を表示しています。':field.dataType==='MULTI_ENUM'?'画像を選ぶと追加・解除して閉じます。複数選択はもう一度開いて追加できます。':'画像を選ぶと項目に反映して閉じます。'}</p><div class="runtime-choice-images" role="group" aria-label="${esc(field.displayLabel)}の選択肢">${values.map(row=>{
      const active=selectedValues.some(v=>String(v)===String(row.value));
      const contents=`<img src="${esc(row.image.src)}" alt="${esc(row.image.alt)}" data-field="${esc(key)}" data-value="${esc(row.value)}"><span class="image-choice-caption"><strong>${esc(row.displayLabel)}</strong>${active?'<span class="image-preview-selected">選択中</span>':''}</span><small>${esc(row.image.source_label)}</small>`;
      return readOnly?`<div class="runtime-choice-image" data-selected="${active}">${contents}</div>`:`<button type="button" class="runtime-choice-image" data-selected="${active}" data-image-choice-field="${esc(key)}" data-image-choice-value="${esc(row.value)}" aria-pressed="${active}"${row.disabled||field.disabled||field.readOnly?' disabled':''}>${contents}</button>`;
    }).join('')}</div>`;
    this.imagePreviewDialog=dialog;this.imagePreviewOpener=opener;
    dialog.addEventListener('close',()=>this.finishImagePreview(dialog),{once:true});
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)this.closeImagePreview();}});
    this.root.append(dialog);dialog.showModal();
  }

  renderWarnings(result){
    const errors=result.validation?.errors??[];const dimension=result.dimensionResult;
    const dimensionCode=String(dimension?.code??'');
    const visibleErrors=dimensionCode?errors.filter((error)=>runtimeErrorCode(error)!==dimensionCode):errors;
    const friendly=dimension?friendlyDimension(dimension):null;
    const catalogConfirmations=(result.confirmationRequests??[]).filter(row=>row.customer_visible!==false);
    const notices=uniqueFriendlyNotices([...(result.notices??[]),...(result.manualWarnings??[]),...catalogConfirmations]);
    this.root.querySelector('#warnings').innerHTML=(visibleErrors.length?`<div class="notice error"><strong>入力内容を確認してください</strong>${visibleErrors.map((error)=>`<span>${esc(friendlyValidationError(error,result))}</span>`).join('')}</div>`:'')
      +(dimension?`<div class="notice dimension ${esc(String(dimension.status).toLowerCase())}"><strong>${esc(friendly.status)}</strong>${friendly.message?`<span>${esc(friendly.message)}</span>`:''}</div>`:'')
      +(notices.length?`<div class="notice warning">${notices.map(esc).join('<br>')}</div>`:'');
  }

  renderSummary(result){
    const product=this.state.products.find((row)=>row.id===this.state.productId);
    const rows=createProductConfigurationSnapshot({product,result}).display_summary;
    const target=this.root.querySelector('#selectionSummary');target.classList.toggle('muted',!rows.length);
    target.innerHTML=rows.length?rows.map((row)=>`<div><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong></div>`).join(''):'項目を選択してください。';
  }

  renderProductCodes(result){
    const rows=result.optionCodeResults??[];const card=this.root.querySelector('#productCodeCard');card.hidden=!rows.length;
    this.root.querySelector('#productCodeResults').innerHTML=rows.map((row)=>`<div><span>${esc(row.label)}</span><strong>${esc(row.productCode??row.codeTemplates?.join(' / ')??'品番未確定')}</strong></div>`).join('');
  }

  renderInventory(health){
    const catalog=(health.inventory??[]).map((row)=>`<div class="inventory-row"><div><strong>${esc(row.manufacturer)} ${esc(row.series)}</strong><small>${esc(row.productId)}</small></div><div>${row.definitions} fields / ${row.allowedValues} values</div></div>`).join('');
    const runtime=(health.runtimeMasterIntegrations??[]).map((row)=>`<div class="inventory-row"><div><strong>${esc(row.manufacturer)} ${esc(row.series)}</strong><small>${esc(row.id)} · Runtime Master</small></div><div>${esc(row.status)}</div></div>`).join('');
    this.root.querySelector('#inventory').innerHTML=catalog+runtime;
  }
}
