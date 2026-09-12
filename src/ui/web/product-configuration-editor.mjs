import { createProductConfigurationSnapshot } from '/work-management/domain.mjs';

const esc=(value)=>String(value??'').replace(/[&<>'\"]/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"})[character]);

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

function identityFor(product){
  const canonical=product.sourceType==='RUNTIME_MASTER';
  return product.canonicalRuntimeReference?.runtimeManifestDriveFileId
    ??(!canonical?product.source?.id??null:null);
}

export class ProductConfigurationEditor {
  constructor(root,{initialSnapshot=null,onSnapshot=()=>{},showInventory=false}={}){
    this.root=root;this.initialSnapshot=initialSnapshot;this.onSnapshot=onSnapshot;this.showInventory=showInventory;
    this.state={products:[],productId:null,productSource:'CATALOG',selection:{},resolved:null,resolveRevision:0,snapshot:initialSnapshot,stale:false};
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
        <div id="dynamicForm"></div><div id="warnings"></div>
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
    const manufacturers=[...new Set(this.state.products.map((row)=>row.manufacturer))].sort((a,b)=>a.localeCompare(b,'ja'));
    fill(this.root.querySelector('#manufacturer'),manufacturers.map((value)=>({value,label:value})));
    if(this.showInventory)this.renderInventory(health);
    const status=document.querySelector('#status');
    if(this.showInventory&&status){status.textContent='CATALOG CONNECTED';status.classList.add('ok');}
    const build=document.querySelector('#build');
    if(build)build.textContent=`${health.buildId} · ${health.catalogVersion}`;
    await this.restoreSnapshot();
  }

  destroy(){this.root.removeEventListener('change',this.boundChange);this.root.removeEventListener('click',this.boundClick);}
  getSnapshot(){return this.state.snapshot;}

  productsForManufacturer(manufacturer){return this.state.products.filter((row)=>row.manufacturer===manufacturer);}
  selectManufacturer(manufacturer){
    this.root.querySelector('#manufacturer').value=manufacturer??'';
    fill(this.root.querySelector('#product'),this.productsForManufacturer(manufacturer).map((row)=>({
      value:row.id,
      label:row.sourceType==='RUNTIME_MASTER'
        ?(row.selectable===false?`${row.displayName??row.series}（利用不可）`:`${row.displayName??row.series} [Runtime]`)
        :(row.displayName??row.series),
      disabled:row.selectable===false,
    })));
  }

  async restoreSnapshot(){
    const snapshot=this.initialSnapshot;
    if(!snapshot)return;
    const product=this.state.products.find((row)=>row.id===snapshot.product_id);
    if(!product){this.renderFrozenSnapshot('保存時の商品経路を現在のアプリで読み込めません。');return;}
    this.selectManufacturer(product.manufacturer);
    this.root.querySelector('#product').value=product.id;
    this.state.productId=product.id;this.state.productSource=product.sourceType;this.state.selection={...snapshot.configuration};
    this.state.stale=identityFor(product)!==snapshot.runtime_manifest_identity||String(product.packageVersion??product.source?.version??'LEGACY-UNVERSIONED')!==String(snapshot.package_version);
    if(this.state.stale){this.renderFrozenSnapshot('旧Runtimeで作成された設定です。保存時Snapshotは自動更新されません。',true);return;}
    await this.resolve({notify:false});
  }

  renderFrozenSnapshot(message,canRevalidate=false){
    this.root.querySelector('#runtimeStaleNotice').innerHTML=`<div class="notice warning"><strong>${esc(message)}</strong>${canRevalidate?'<button class="button secondary small" type="button" data-runtime-action="revalidate">現在Runtimeで再検証</button>':''}</div>`;
    const badge=this.root.querySelector('#runtimeVersionBadge');badge.hidden=false;badge.textContent=`保存時 ${this.initialSnapshot?.package_version??'不明'}`;
    const rows=this.initialSnapshot?.display_summary??[];
    this.root.querySelector('#selectionSummary').innerHTML=rows.length?rows.map((row)=>`<div><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong></div>`).join(''):'保存時の表示要約はありません。';
    this.root.querySelector('#dynamicForm').innerHTML='<p class="muted">再検証するまで保存時Snapshotを保持します。</p>';
  }

  async handleClick(event){
    if(!event.target.closest('[data-runtime-action="revalidate"]'))return;
    this.state.stale=false;this.root.querySelector('#runtimeStaleNotice').innerHTML='';
    await this.resolve({notify:true});
  }

  clearRuntimeDescendants(key){
    const rows=this.state.resolved?.dependencyFields??[];
    const children=new Map();
    for(const row of rows){
      for(const parent of row.parentFields??[]){
        if(!children.has(parent))children.set(parent,new Set());
        children.get(parent).add(row.key);
      }
    }
    const queue=[...(children.get(key)??[])],seen=new Set();
    while(queue.length){
      const child=queue.shift();
      if(seen.has(child))continue;
      seen.add(child);delete this.state.selection[child];
      queue.push(...(children.get(child)??[]));
    }
  }

  async handleChange(event){
    const target=event.target;
    if(target.id==='manufacturer'){
      this.state.resolveRevision+=1;this.state.productId=null;this.state.selection={};this.state.resolved=null;this.state.snapshot=null;this.state.stale=false;
      this.selectManufacturer(target.value);
      this.root.querySelector('#dynamicForm').innerHTML='';this.root.querySelector('#warnings').innerHTML='';
      this.root.querySelector('#selectionSummary').textContent='商品を選択してください。';this.root.querySelector('#productCodeCard').hidden=true;
      this.onSnapshot(null);return;
    }
    if(target.id==='product'){
      this.state.productId=target.value||null;this.state.selection={};this.state.resolved=null;this.state.snapshot=null;this.state.stale=false;
      const product=this.state.products.find((row)=>row.id===this.state.productId);this.state.productSource=product?.sourceType??'CATALOG';
      await this.resolve({notify:true});return;
    }
    if(!target.matches('[data-spec-key]'))return;
    const key=target.dataset.specKey;
    if(this.state.productSource==='RUNTIME_MASTER')this.clearRuntimeDescendants(key);
    if(target.type==='number'){
      if(target.value!=='')this.state.selection[key]=Number(target.value);else delete this.state.selection[key];
    }else if(target.multiple){
      const values=[...target.selectedOptions].map((option)=>option.value);
      if(values.length)this.state.selection[key]=values;else delete this.state.selection[key];
    }else if(target.value)this.state.selection[key]=target.value;else delete this.state.selection[key];
    await this.resolve({notify:true});
  }

  async resolve({notify=true}={}){
    const revision=++this.state.resolveRevision,productId=this.state.productId;
    if(!productId){this.root.querySelector('#dynamicForm').innerHTML='';return;}
    const query=new URLSearchParams({productId,selection:JSON.stringify(this.state.selection)});
    const endpoint=this.state.productSource==='RUNTIME_MASTER'?'/api/runtime-master/resolve':'/api/catalog/resolve';
    const result=await getJson(`${endpoint}?${query}`);
    if(revision!==this.state.resolveRevision||productId!==this.state.productId)return;
    this.state.selection=result.selection;this.state.resolved=result;
    this.root.querySelector('#dynamicForm').innerHTML=result.fields.map((field)=>this.renderField(field)).join('');
    this.renderWarnings(result);this.renderSummary(result);this.renderProductCodes(result);
    const product=this.state.products.find((row)=>row.id===productId);
    this.state.snapshot=createProductConfigurationSnapshot({product,result});
    const badge=this.root.querySelector('#runtimeVersionBadge');badge.hidden=false;badge.textContent=`${this.state.snapshot.source_mode==='CANONICAL_RUNTIME'?'Runtime':'Legacy'} ${this.state.snapshot.package_version}`;
    if(notify)this.onSnapshot(this.state.snapshot,result);
  }

  renderField(field){
    const required=field.required?'<span class="required">必須</span>':'';
    if(field.dataType==='NUMBER')return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><div class="number-input"><input type="number" inputmode="numeric" step="1" data-spec-key="${esc(field.key)}" value="${esc(this.state.selection[field.key]??'')}" placeholder="数値を入力">${field.unit?`<span>${esc(field.unit)}</span>`:''}</div></div>`;
    if(field.dataType==='TEXT')return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><input type="text" data-spec-key="${esc(field.key)}" value="${esc(this.state.selection[field.key]??'')}" placeholder="入力してください"></div>`;
    const selected=Array.isArray(this.state.selection[field.key])?this.state.selection[field.key]:[this.state.selection[field.key]];
    const options=field.values.map((value)=>`<option value="${esc(value.value)}"${selected.some((one)=>String(one)===String(value.value))?' selected':''}>${esc(value.displayLabel)}${value.manualCheck?'（要確認）':''}</option>`).join('');
    const multi=field.dataType==='MULTI_ENUM';
    return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><select data-spec-key="${esc(field.key)}"${multi?' multiple size="5"':''}${field.readOnly||!field.values.length?' disabled':''}>${multi?'':'<option value="">選択してください</option>'}${options}</select>${multi?'<small class="field-help">複数選択できます</small>':''}</div>`;
  }

  renderWarnings(result){
    const errors=result.validation?.errors??[];const dimension=result.dimensionResult;
    this.root.querySelector('#warnings').innerHTML=(errors.length?`<div class="notice error"><strong>入力内容を確認してください</strong>${errors.map((error)=>`<span>${esc(error.message)}</span>`).join('')}</div>`:'')
      +(dimension?`<div class="notice dimension ${esc(String(dimension.status).toLowerCase())}"><strong>${esc(dimension.status)}</strong><span>${esc(dimension.message)}</span></div>`:'')
      +([...(result.notices??[]),...(result.manualWarnings??[])].length?`<div class="notice warning">${[...(result.notices??[]),...(result.manualWarnings??[])].map(esc).join('<br>')}</div>`:'');
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
