import{
  findSizeByCode,findSizeRecords,getAvailableHeights,getAvailableWidths,
  getSelectedSizeMetadata,reconcileSizeDraft,toSizeRecords
}from"/size-presentation.js";

const $=(id)=>document.getElementById(id);
const emptySizeDraft=()=>({width:"",height:"",query:""});
const state={products:[],productId:null,selection:{},resolved:null,sizeDraft:emptySizeDraft(),resolveRevision:0};

async function getJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();}
function esc(v){return String(v??"").replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[c]));}
function has(v){return v!==undefined&&v!==null&&v!=="";}
function fill(select,rows,placeholder="選択してください"){
  const current=select.value;
  select.innerHTML=`<option value="">${placeholder}</option>`+rows.map(x=>`<option value="${esc(x.value)}">${esc(x.label)}</option>`).join("");
  select.disabled=rows.length===0;
  if(rows.some(x=>x.value===current))select.value=current;
}
function inventoryStats(x){
  const selectable=Number(x.selectableSizeRows??0),inactive=Number(x.inactiveSizeRows??0),coverage=Number(x.sizeCoverage);
  if(selectable>0||inactive>0)return `${selectable} sizes / ${inactive} inactive / ${(coverage*100).toFixed(2)}%`;
  return `${x.definitions} fields / ${x.allowedValues} values / ${x.dependencies} deps`;
}
function renderInventory(health){
  $("inventory").innerHTML=health.inventory.map(x=>`<div class="inventory-row"><div><strong>${esc(x.manufacturer)} ${esc(x.series)}</strong><small>${esc(x.productId)}</small></div><div>${esc(inventoryStats(x))}</div></div>`).join("");
  $("build").textContent=`${health.buildId} · ${health.buildTimestamp} · ${health.catalogVersion}`;
  $("status").textContent="CATALOG CONNECTED";$("status").classList.add("ok");
}
function renderWarnings(result){
  const items=[...(result.notices??[]),...(result.manualWarnings??[])];
  const validationErrors=result.validation?.errors??[];
  const validationHtml=validationErrors.length?`<div class="notice error"><strong>入力内容を確認してください</strong>${validationErrors.map(error=>`<span>${esc(error.message)}${error.errorCode?`<small>${esc(error.errorCode)}</small>`:""}</span>`).join("")}</div>`:"";
  const dimension=result.dimensionResult;
  const dimensionLabels={PASS:"○ 製作可能",BLOCK:"× 製作範囲外",REVIEW_REQUIRED:"△ 発注前に原本・メーカー確認が必要",PENDING:"寸法を入力してください"};
  const dimensionHtml=dimension?`<div class="notice dimension ${esc(String(dimension.status).toLowerCase())}"><strong>${esc(dimensionLabels[dimension.status]??dimension.status)}</strong><span>${esc(dimension.message)}</span><small>${esc(dimension.status)}${dimension.matchedRuleIds?.length?` · ${esc(dimension.matchedRuleIds.join(" / "))}`:""}</small></div>`:"";
  $("warnings").innerHTML=validationHtml+dimensionHtml+(items.length?`<div class="notice warning">${items.map(esc).join("<br>")}</div>`:"");
}
function renderSummary(result){
  const labels=new Map();
  for(const field of result.fields)for(const v of field.values)labels.set(`${field.key}:${v.value}`,v.displayLabel);
  const rows=Object.entries(result.selection).map(([k,v])=>{
    const f=result.fields.find(x=>x.key===k);
    const display=Array.isArray(v)?v.map(one=>labels.get(`${k}:${one}`)??one).join("、"):(labels.get(`${k}:${v}`)??v);
    return f?`<div><span>${esc(f.displayLabel)}</span><strong>${esc(display)}</strong></div>`:"";
  }).filter(Boolean);
  $("selectionSummary").classList.toggle("muted",rows.length===0);
  $("selectionSummary").innerHTML=rows.length?rows.join(""):"項目を選択してください。";
}

const selected=(value,current)=>String(value)===String(current)?" selected":"";
const sizeRecordLabel=(record)=>`${record.sizeCode||record.label}${has(record.actualW)&&has(record.actualH)?` ｜ ${record.actualW}×${record.actualH}mm`:""}`;
function groupedOptions(rows,current){return rows.map((row)=>`<option value="${esc(row.value)}"${selected(row.value,current)}>${esc(row.value)}${row.count>1?`（${row.count}候補）`:""}</option>`).join("");}
function recordOptions(rows,current){return rows.map((record)=>`<option value="${esc(record.id)}"${selected(record.id,current)}>${esc(sizeRecordLabel(record))}</option>`).join("");}

function renderSizeField(field){
  state.sizeDraft=reconcileSizeDraft(field.values,state.sizeDraft,state.selection.size);
  const widths=getAvailableWidths(field.values);
  const heights=getAvailableHeights(field.values,state.sizeDraft.width);
  const pair=state.sizeDraft.width&&state.sizeDraft.height?findSizeRecords(field.values,{nominalW:state.sizeDraft.width,nominalH:state.sizeDraft.height}):[];
  const chosen=getSelectedSizeMetadata(field.values,state.selection.size);
  const searchMatches=state.sizeDraft.query?findSizeByCode(field.values,state.sizeDraft.query):[];
  const required=field.required?'<span class="required">必須</span>':"";
  const actual=chosen&&has(chosen.actualW)&&has(chosen.actualH)?`<span><small>実寸</small><strong>${esc(chosen.actualW)} × ${esc(chosen.actualH)} mm</strong></span>`:"";
  const detail=chosen?`<div class="size-detail selected" data-size-selected-id="${esc(chosen.id)}"><div><b>正式サイズ確定</b><small>${esc(chosen.id)}</small></div><span><small>呼称</small><strong>${esc(chosen.sizeCode||`${chosen.nominalW}${chosen.nominalH}`)}</strong></span>${actual}</div>`:`<div class="size-detail"><span>呼称Wと呼称Hを選択してください。</span></div>`;
  const recordChoice=pair.length>1?`<div class="size-record-choice"><label for="formal-size-record">正式サイズ</label><select id="formal-size-record" data-size-record><option value="">仕様を選択してください</option>${recordOptions(pair,state.selection.size)}</select><small>同じ呼称W/Hに複数の正式Recordがあります。</small></div>`:"";
  const searchChoice=state.sizeDraft.query?`<div class="size-search-results"><label for="size-search-result">検索結果</label><select id="size-search-result" data-size-search-result ${searchMatches.length?"":"disabled"}><option value="">正式サイズを選択</option>${recordOptions(searchMatches,state.selection.size)}</select><small data-size-search-count>${searchMatches.length}件</small></div>`:'<div class="size-search-results" hidden></div>';
  return `<div class="field size-field" data-key="size"><label>${esc(field.displayLabel)}${required}</label><div class="size-tools"><input type="search" data-size-search aria-label="サイズコード検索" value="${esc(state.sizeDraft.query)}" placeholder="呼称・W・H・サイズIDで検索"><small class="size-count">正式候補 ${field.values.length}件</small></div>${searchChoice}<div class="size-axis-grid"><div class="size-axis"><label for="nominal-width">呼称W</label><select id="nominal-width" data-size-width><option value="">選択してください</option>${groupedOptions(widths,state.sizeDraft.width)}</select></div><div class="size-axis"><label for="nominal-height">呼称H</label><select id="nominal-height" data-size-height${state.sizeDraft.width?"":" disabled"}><option value="">${state.sizeDraft.width?"選択してください":"先に呼称Wを選択"}</option>${groupedOptions(heights,state.sizeDraft.height)}</select></div></div>${recordChoice}${detail}</div>`;
}

function renderField(field){
  const required=field.required?'<span class="required">必須</span>':"";
  if(field.key==="size")return renderSizeField(field);
  if(field.dataType==="NUMBER"){
    const value=state.selection[field.key]??"";
    return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><div class="number-input"><input type="number" inputmode="numeric" step="1" data-spec-key="${esc(field.key)}" value="${esc(value)}" placeholder="mm単位で入力"><span>mm</span></div></div>`;
  }
  const selectedValues=Array.isArray(state.selection[field.key])?state.selection[field.key]:[state.selection[field.key]];
  const options=field.values.map(v=>`<option value="${esc(v.value)}"${selectedValues.includes(v.value)?" selected":""}>${esc(v.displayLabel)}${v.manualCheck?"（要確認）":""}</option>`).join("");
  const multi=field.dataType==="MULTI_ENUM",disabled=field.values.length===0?" disabled":"";
  return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><select data-spec-key="${esc(field.key)}"${multi?' multiple size="5"':""}${disabled}>${multi?"":'<option value="">選択してください</option>'}${options}</select>${multi?'<small class="field-help">複数選択できます</small>':""}</div>`;
}

function sizeUpstreamChanged(result,key){
  if(key==="size_mode")return true;
  const changed=result.fields.find((field)=>field.key===key),size=result.fields.find((field)=>field.key==="size");
  return Boolean(changed&&size&&changed.displayOrder<size.displayOrder);
}

async function commitSizeRecord(field,recordId){
  const record=getSelectedSizeMetadata(field.values,recordId);
  if(record){state.sizeDraft={width:record.nominalW,height:record.nominalH,query:""};state.selection.size=record.id;}
  else delete state.selection.size;
  await resolve();
}

function bindSizePresentation(field){
  const search=document.querySelector("[data-size-search]");
  search?.addEventListener("input",()=>{
    state.sizeDraft.query=search.value;
    const matches=findSizeByCode(field.values,search.value),wrapper=document.querySelector(".size-search-results");
    if(!wrapper)return;
    wrapper.hidden=!search.value;
    wrapper.innerHTML=search.value?`<label for="size-search-result">検索結果</label><select id="size-search-result" data-size-search-result ${matches.length?"":"disabled"}><option value="">正式サイズを選択</option>${recordOptions(toSizeRecords(field.values),state.selection.size)}</select><small data-size-search-count>${matches.length}件</small>`:"";
    const matchIds=new Set(matches.map((record)=>record.id));
    wrapper.querySelectorAll("option[value]").forEach((option)=>{const match=matchIds.has(option.value);option.hidden=!match;});
    wrapper.querySelector("[data-size-search-result]")?.addEventListener("change",async(event)=>{if(event.target.value)await commitSizeRecord(field,event.target.value);});
  });
  document.querySelector("[data-size-search-result]")?.addEventListener("change",async(event)=>{if(event.target.value)await commitSizeRecord(field,event.target.value);});
  document.querySelector("[data-size-width]")?.addEventListener("change",async(event)=>{
    state.sizeDraft={width:event.target.value,height:"",query:""};delete state.selection.size;await resolve();
  });
  document.querySelector("[data-size-height]")?.addEventListener("change",async(event)=>{
    state.sizeDraft.height=event.target.value;state.sizeDraft.query="";delete state.selection.size;
    const records=findSizeRecords(field.values,{nominalW:state.sizeDraft.width,nominalH:state.sizeDraft.height});
    if(records.length===1)state.selection.size=records[0].id;
    await resolve();
  });
  document.querySelector("[data-size-record]")?.addEventListener("change",async(event)=>{await commitSizeRecord(field,event.target.value);});
}

function bindGenericFields(result){
  document.querySelectorAll("[data-spec-key]").forEach((el)=>el.addEventListener("change",async()=>{
    const key=el.dataset.specKey;
    if(sizeUpstreamChanged(result,key))state.sizeDraft=emptySizeDraft();
    if(el.type==="number"){
      if(el.value!=="")state.selection[key]=Number(el.value);else delete state.selection[key];
    }else if(el.multiple){
      const values=[...el.selectedOptions].map(option=>option.value);
      if(values.length)state.selection[key]=values;else delete state.selection[key];
    }else if(el.value)state.selection[key]=el.value;else delete state.selection[key];
    await resolve();
  }));
}

async function resolve(){
  if(!state.productId){$("dynamicForm").innerHTML="";return;}
  const revision=++state.resolveRevision,productId=state.productId;
  const q=new URLSearchParams({productId,selection:JSON.stringify(state.selection)});
  const result=await getJson(`/api/catalog/resolve?${q}`);
  if(revision!==state.resolveRevision||productId!==state.productId)return;
  state.selection=result.selection;state.resolved=result;
  $("dynamicForm").innerHTML=result.fields.map(renderField).join("");
  bindGenericFields(result);
  const sizeField=result.fields.find((field)=>field.key==="size");
  if(sizeField)bindSizePresentation(sizeField);else state.sizeDraft=emptySizeDraft();
  renderWarnings(result);renderSummary(result);
}

async function init(){
  const [products,health]=await Promise.all([getJson("/api/catalog/products"),getJson("/api/health")]);
  state.products=products;
  const manufacturers=[...new Set(products.map(x=>x.manufacturer))].sort();
  fill($("manufacturer"),manufacturers.map(x=>({value:x,label:x})));
  renderInventory(health);
}
$("manufacturer").addEventListener("change",()=>{
  state.resolveRevision+=1;state.productId=null;state.selection={};state.resolved=null;state.sizeDraft=emptySizeDraft();
  const manufacturer=$("manufacturer").value;
  fill($("product"),state.products.filter(x=>x.manufacturer===manufacturer).map(x=>({value:x.id,label:x.displayName})));
  $("dynamicForm").innerHTML="";$("selectionSummary").textContent="シリーズを選択してください。";
});
$("product").addEventListener("change",async()=>{
  state.resolveRevision+=1;state.productId=$("product").value||null;state.selection={};state.sizeDraft=emptySizeDraft();await resolve();
});
init().catch(e=>{$("status").textContent="CATALOG ERROR";$("build").textContent=e.message;});
