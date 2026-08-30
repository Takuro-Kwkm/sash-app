const $ = (id) => document.getElementById(id);
const state = { products: [], selectedProductId: null };

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function fill(select, rows, valueKey, labelKey, placeholder = "選択してください") {
  select.innerHTML = `<option value="">${placeholder}</option>` + rows.map((row) => `<option value="${escapeHtml(row[valueKey])}">${escapeHtml(row[labelKey])}</option>`).join("");
  select.disabled = rows.length === 0;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

function renderInventory(health) {
  $("inventory").innerHTML = health.inventory.map((row) => `
    <div class="inventory-row">
      <div><strong>${escapeHtml(row.manufacturer)} ${escapeHtml(row.series)}</strong><small>${escapeHtml(row.productId)}</small></div>
      <div>${row.definitions} fields / ${row.allowedValues} values</div>
    </div>`).join("");
  $("build").textContent = `${health.buildId} · ${health.buildTimestamp} · ${health.catalogVersion}`;
  $("status").textContent = "CATALOG CONNECTED";
  $("status").classList.add("ok");
}

async function init() {
  const [products, health] = await Promise.all([
    getJson("/api/catalog/products"),
    getJson("/api/health")
  ]);
  state.products = products;
  const manufacturers = [...new Set(products.map((p) => p.manufacturer))].sort();
  fill($("manufacturer"), manufacturers.map((name) => ({ value: name, label: name })), "value", "label");
  renderInventory(health);
}

$("manufacturer").addEventListener("change", () => {
  const manufacturer = $("manufacturer").value;
  const products = state.products.filter((product) => product.manufacturer === manufacturer);
  fill($("product"), products, "id", "displayName");
  fill($("window"), [], "value", "displayLabel");
  $("nextFields").innerHTML = "";
});

$("product").addEventListener("change", async () => {
  state.selectedProductId = $("product").value || null;
  $("nextFields").innerHTML = "";
  if (!state.selectedProductId) return fill($("window"), [], "value", "displayLabel");
  const values = await getJson(`/api/catalog/allowed-values?productId=${encodeURIComponent(state.selectedProductId)}&key=window_type`);
  fill($("window"), values, "value", "displayLabel");
});

$("window").addEventListener("change", async () => {
  if (!$("window").value || !state.selectedProductId) return $("nextFields").innerHTML = "";
  const fields = await getJson(`/api/catalog/fields?productId=${encodeURIComponent(state.selectedProductId)}`);
  const remaining = fields.filter((field) => field.key !== "window_type");
  $("nextFields").innerHTML = `<div class="notice">窓種選択完了。次段階ではこの共通Definition順に、サイズ・色・網戸・ガラス・OPをマスター制御表から接続します。</div>` + remaining.map((field) => `<div class="future-field"><span>${escapeHtml(field.displayOrder)}</span><strong>${escapeHtml(field.displayLabel)}</strong><small>${escapeHtml(field.sourceRole)}</small></div>`).join("");
});

init().catch((error) => {
  $("status").textContent = "CATALOG ERROR";
  $("build").textContent = error.message;
});
