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
  $("inventory").innerHTML=health.inventory.map(x=>`<div class="inventory-row"><div><strong>${esc(x.manufacturer)} ${esc(x.series)}</strong><small>${esc(x.productId)}</small></div><div>${x.definitions} fields / ${x.allowedValues} values / ${x.dependencies} deps</div></div>`).join("");
  $("build").textContent=`${health.buildId} · ${health.buildTimestamp} · ${health.catalogVersion}`;
  $("status").textContent="CATALOG CONNECTED";$("status").classList.add("ok");
}
function renderWarnings(result){
  const items=[...(result.notices??[]),...(result.manualWarnings??[])];
  $("warnings").innerHTML=items.length?`<div class="notice warning">${items.map(esc).join("<br>")}</div>`:"";
}
function renderSummary(result){
  const labels=new Map();
  for(const field of result.fields)for(const v of field.values)labels.set(`${field.key}:${v.value}`,v.displayLabel);
  const rows=Object.entries(result.selection).map(([k,v])=>{
    const f=result.fields.find(x=>x.key===k);
    return f?`<div><span>${esc(f.displayLabel)}</span><strong>${esc(labels.get(`${k}:${v}`)??v)}</strong></div>`:"";
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
    const options=field.values.map(v=>`<option value="${esc(v.value)}"${state.selection[field.key]===v.value?" selected":""}>${esc(v.displayLabel)}${v.manualCheck?"（要確認）":""}</option>`).join("");
    const disabled=field.values.length===0?" disabled":"";
    return `<div class="field" data-key="${esc(field.key)}"><label>${esc(field.displayLabel)}${field.required?'<span class="required">必須</span>':""}</label><select data-spec-key="${esc(field.key)}"${disabled}><option value="">選択してください</option>${options}</select></div>`;
  }).join("");
  document.querySelectorAll("[data-spec-key]").forEach(el=>el.addEventListener("change",async()=>{
    const key=el.dataset.specKey;
    if(el.value)state.selection[key]=el.value;else delete state.selection[key];
    await resolve();
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
