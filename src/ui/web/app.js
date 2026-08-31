const $=(id)=>document.getElementById(id);
const state={products:[],productId:null,selection:{},resolved:null};
async function getJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();}
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function fill(select,rows,placeholder="選択してください"){
  const current=select.value;
  select.innerHTML=`<option value="">${placeholder}</option>`+rows.map(x=>`<option value="${esc(x.value)}">${esc(x.label)}</option>`).join("");
  select.disabled=rows.length===0;
  if(rows.some(x=>x.value===current))select.value=current;
}
function renderInventory(health){
  $("inventory").innerHTML=health.inventory.map(x=>`<div class="inventory-row"><div><strong>${esc(x.manufacturer)} ${esc(x.series)}</strong><small>${esc(x.productId)}</small></div><div>${x.selectableSizeRows} sizes / ${x.inactiveSizeRows} inactive / ${(Number(x.sizeCoverage)*100).toFixed(2)}%</div></div>`).join("");
  $("build").textContent=`${health.buildId} · ${health.buildTimestamp} · ${health.catalogVersion}`;
  $("status").textContent="CATALOG CONNECTED";$("status").classList.add("ok");
}
function renderWarnings(result){
  const items=[...(result.notices??[]),...(result.manualWarnings??[])];
  const dimension=result.dimensionResult;
  const dimensionHtml=dimension?`<div class="notice dimension ${esc(String(dimension.status).toLowerCase())}"><strong>${esc(dimension.status)}</strong><span>${esc(dimension.message)}</span>${dimension.matchedRuleIds?.length?`<small>${esc(dimension.matchedRuleIds.join(" / "))}</small>`:""}</div>`:"";
  $("warnings").innerHTML=dimensionHtml+(items.length?`<div class="notice warning">${items.map(esc).join("<br>")}</div>`:"");
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
async function resolve(){
  if(!state.productId){$("dynamicForm").innerHTML="";return;}
  const q=new URLSearchParams({productId:state.productId,selection:JSON.stringify(state.selection)});
  const result=await getJson(`/api/catalog/resolve?${q}`);
  state.selection=result.selection;state.resolved=result;
  $("dynamicForm").innerHTML=result.fields.map(field=>{
    const required=field.required?'<span class="required">必須</span>':"";
    if(field.dataType==="NUMBER"){
      const value=state.selection[field.key]??"";
      return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><input type="number" inputmode="numeric" step="1" data-spec-key="${esc(field.key)}" value="${esc(value)}" placeholder="mm単位で入力"></div>`;
    }
    const selected=Array.isArray(state.selection[field.key])?state.selection[field.key]:[state.selection[field.key]];
    const options=field.values.map(v=>`<option value="${esc(v.value)}"${selected.includes(v.value)?" selected":""}>${esc(v.displayLabel)}${v.manualCheck?"（要確認）":""}</option>`).join("");
    const multi=field.dataType==="MULTI_ENUM";
    const disabled=field.values.length===0?" disabled":"";
    const sizeSearch=field.key==="size"?`<div class="size-tools"><input type="search" data-size-search="${esc(field.key)}" aria-label="サイズ検索" placeholder="呼称・W・H・サイズIDで検索"><small class="size-count" data-size-count>${field.values.length}件</small></div>`:"";
    return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label>${sizeSearch}<select data-spec-key="${esc(field.key)}"${multi?' multiple size="5"':""}${disabled}>${multi?"":'<option value="">選択してください</option>'}${options}</select>${multi?'<small class="field-help">複数選択できます</small>':""}</div>`;
  }).join("");
  document.querySelectorAll("[data-spec-key]").forEach(el=>el.addEventListener("change",async()=>{
    const key=el.dataset.specKey;
    if(el.type==="number"){
      if(el.value!=="")state.selection[key]=Number(el.value);else delete state.selection[key];
    }else if(el.multiple){
      const values=[...el.selectedOptions].map(option=>option.value);
      if(values.length)state.selection[key]=values;else delete state.selection[key];
    }else if(el.value)state.selection[key]=el.value;else delete state.selection[key];
    await resolve();
  }));
  document.querySelectorAll("[data-size-search]").forEach(input=>input.addEventListener("input",()=>{
    const wrapper=input.closest(".field"),select=wrapper?.querySelector("select[data-spec-key='size']");
    if(!select)return;
    const query=input.value.trim().toLocaleLowerCase("ja");
    let visible=0;
    for(const option of select.querySelectorAll("option[value]")){
      const match=!query||`${option.value} ${option.textContent}`.toLocaleLowerCase("ja").includes(query);
      option.hidden=!match;if(match)visible++;
    }
    const count=wrapper.querySelector("[data-size-count]");
    if(count)count.textContent=`${visible} / ${select.querySelectorAll("option[value]").length}件`;
  }));
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
  state.productId=null;state.selection={};state.resolved=null;
  const m=$("manufacturer").value;
  fill($("product"),state.products.filter(x=>x.manufacturer===m).map(x=>({value:x.id,label:x.displayName})));
  $("dynamicForm").innerHTML="";$("selectionSummary").textContent="シリーズを選択してください。";
});
$("product").addEventListener("change",async()=>{
  state.productId=$("product").value||null;state.selection={};await resolve();
});
init().catch(e=>{$("status").textContent="CATALOG ERROR";$("build").textContent=e.message;});
