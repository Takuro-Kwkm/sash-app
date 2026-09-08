const $=(id)=>document.getElementById(id);
const state={products:[],productId:null,productSource:"CATALOG",selection:{},resolved:null,resolveRevision:0};
async function getJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok){const body=await r.json().catch(()=>null);throw new Error(body?.error??`${r.status} ${url}`);}return r.json();}
function esc(v){return String(v??"").replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[c]));}
function fill(select,rows,placeholder="選択してください"){
  const current=select.value;
  select.innerHTML=`<option value="">${placeholder}</option>`+rows.map(x=>`<option value="${esc(x.value)}"${x.disabled?" disabled":""}>${esc(x.label)}</option>`).join("");
  select.disabled=rows.length===0;
  if(rows.some(x=>x.value===current&&!x.disabled))select.value=current;
}
function inventoryStats(x){return `${x.definitions} fields / ${x.allowedValues} values / ${x.dependencies} deps`;}
function renderInventory(health){
  const catalogRows=health.inventory.map(x=>`<div class="inventory-row"><div><strong>${esc(x.manufacturer)} ${esc(x.series)}</strong><small>${esc(x.productId)}</small></div><div>${esc(inventoryStats(x))}</div></div>`).join("");
  const runtimeRows=(health.runtimeMasterIntegrations??[]).map(x=>`<div class="inventory-row"><div><strong>${esc(x.manufacturer)} ${esc(x.series)}</strong><small>${esc(x.id)} · Runtime Master</small></div><div>${esc(x.status)}${x.blockReason?`<small>${esc(x.blockReason)}</small>`:""}</div></div>`).join("");
  $("inventory").innerHTML=catalogRows+runtimeRows;
  $("build").textContent=`${health.buildId} · ${health.buildTimestamp} · ${health.catalogVersion}`;
  $("status").textContent="CATALOG CONNECTED";$("status").classList.add("ok");
}
function renderWarnings(result){
  const items=[...(result.notices??[]),...(result.manualWarnings??[])];
  const validationErrors=result.validation?.errors??[];
  const validationHtml=validationErrors.length?`<div class="notice error"><strong>入力内容を確認してください</strong>${validationErrors.map(error=>`<span>${esc(error.message)}${error.errorCode?`<small>${esc(error.errorCode)}</small>`:""}</span>`).join("")}</div>`:"";
  const dimension=result.dimensionResult;
  const dimensionHtml=dimension?`<div class="notice dimension ${esc(String(dimension.status).toLowerCase())}"><strong>${esc(dimension.status)}</strong><span>${esc(dimension.message)}</span>${dimension.matchedRuleIds?.length?`<small>${esc(dimension.matchedRuleIds.join(" / "))}</small>`:""}</div>`:"";
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
function renderField(field){
  const required=field.required?'<span class="required">必須</span>':"";
  if(field.dataType==="NUMBER"){
    const value=state.selection[field.key]??"",unit=field.unit??"";
    return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><div class="number-input"><input type="number" inputmode="numeric" step="1" data-spec-key="${esc(field.key)}" value="${esc(value)}" placeholder="数値を入力">${unit?`<span>${esc(unit)}</span>`:""}</div></div>`;
  }
  if(field.dataType==="TEXT"){
    const value=state.selection[field.key]??"";
    return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><input type="text" data-spec-key="${esc(field.key)}" value="${esc(value)}" placeholder="入力してください"></div>`;
  }
  const selected=Array.isArray(state.selection[field.key])?state.selection[field.key]:[state.selection[field.key]];
  const options=field.values.map(v=>`<option value="${esc(v.value)}"${selected.some(one=>String(one)===String(v.value))?" selected":""}>${esc(v.displayLabel)}${v.manualCheck?"（要確認）":""}</option>`).join("");
  const multi=field.dataType==="MULTI_ENUM";
  const disabled=field.readOnly||field.values.length===0?" disabled":"";
  return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${required}</label><select data-spec-key="${esc(field.key)}"${multi?' multiple size="5"':""}${disabled}>${multi?"":'<option value="">選択してください</option>'}${options}</select>${multi?'<small class="field-help">複数選択できます</small>':""}</div>`;
}
async function resolve(){
  const revision=++state.resolveRevision;
  if(!state.productId){$("dynamicForm").innerHTML="";return;}
  const q=new URLSearchParams({productId:state.productId,selection:JSON.stringify(state.selection)});
  const endpoint=state.productSource==="RUNTIME_MASTER"?"/api/runtime-master/resolve":"/api/catalog/resolve";
  const result=await getJson(`${endpoint}?${q}`);
  if(revision!==state.resolveRevision)return;
  state.selection=result.selection;state.resolved=result;
  $("dynamicForm").innerHTML=result.fields.map(renderField).join("");
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
  renderWarnings(result);renderSummary(result);
}
async function init(){
  const [catalogProducts,runtimeProducts,health]=await Promise.all([getJson("/api/catalog/products"),getJson("/api/runtime-master/integrations"),getJson("/api/health")]);
  state.products=[
    ...catalogProducts.map(x=>({...x,source:"CATALOG"})),
    ...runtimeProducts.map(x=>({id:x.id,manufacturer:x.manufacturer,series:x.series,displayName:x.displayName??x.series,source:"RUNTIME_MASTER",selectable:x.selectable!==false,blockReason:x.blockReason??null}))
  ];
  const manufacturers=[...new Set(state.products.map(x=>x.manufacturer))].sort((a,b)=>a.localeCompare(b,'ja'));
  fill($("manufacturer"),manufacturers.map(x=>({value:x,label:x})));
  renderInventory(health);
}
$("manufacturer").addEventListener("change",()=>{
  state.productId=null;state.productSource="CATALOG";state.selection={};state.resolved=null;
  const m=$("manufacturer").value;
  fill($("product"),state.products.filter(x=>x.manufacturer===m).map(x=>({value:x.id,label:x.displayName,disabled:x.selectable===false})));
  $("dynamicForm").innerHTML="";$("warnings").innerHTML="";$("selectionSummary").textContent="シリーズを選択してください。";
});
$("product").addEventListener("change",async()=>{
  state.productId=$("product").value||null;state.selection={};state.resolved=null;
  const product=state.products.find(x=>x.id===state.productId);
  state.productSource=product?.source??"CATALOG";
  await resolve();
});
init().catch(e=>{$("status").textContent="CATALOG ERROR";$("build").textContent=e.message;});
