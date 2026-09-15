import { runtimeAppIntegrationInventory, resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const HEAD_SHA = process.env.HEAD_SHA ?? null;
const integrations = runtimeAppIntegrationInventory();
const bySeries = (manufacturer, series) => {
  const row = integrations.find((x) => x.manufacturer === manufacturer && x.series === series && x.selectable !== false);
  if (!row) throw new Error(`INTEGRATION_MISSING ${manufacturer}/${series}`);
  return row.id;
};
const same = (a,b) => String(a) === String(b);
const enabled = (field) => (field?.values ?? []).filter((v) => v.disabled !== true);
const specTokens = (value) => String(value ?? '').split('|').map((x) => x.trim()).filter(Boolean);
const choiceSpecs = (choice) => {
  const raw = choice?.runtimeValueRow?.metadata?.specific_spec;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    if (Array.isArray(raw.$in)) return raw.$in.flatMap(specTokens);
    if (raw.$eq !== undefined) return specTokens(raw.$eq);
  }
  return specTokens(raw);
};
const blockedThermos = {
  'サーモスⅡ-H': [
    ['WT-S2H-SHUTTER-HIKI',['SP-S2H-SHUT-E-STD','SP-S2H-SHUT-E-VENT','SP-S2H-SHUT-E-WIND','SP-S2H-SHUT-M-STD','SP-S2H-SHUT-M-WIND']],
    ['WT-S2H-AMADO-HIKI',['SP-S2H-AMADO-LOUVER','SP-S2H-AMADO-DAN','SP-S2H-AMADO-ADJ']],
    ['WT-S2H-MENKOSHI-HIKI',['SP-S2H-GRILLE-V','SP-S2H-GRILLE-H','SP-S2H-GRILLE-DIA','SP-S2H-GRILLE-IGETA','SP-S2H-GRILLE-HIGH-V','SP-S2H-GRILLE-ADJ']],
    ['WT-S2H-TATE-SUBERI',['SP-S2H-TATE-OP-T','SP-S2H-TATE-CAM-T','SP-S2H-TATE-OP-TF','SP-S2H-TATE-OP-TFT','SP-S2H-TATE-CAM-TF','SP-S2H-TATE-CAM-TFT']],
    ['WT-S2H-YOKO-SUBERI',['SP-S2H-YOKO-OP','SP-S2H-YOKO-CAM']],
    ['WT-S2H-KOSHO-YOKO',['SP-S2H-HIGH-CHAIN','SP-S2H-HIGH-ELECTRIC']],
    ['WT-S2H-MENKOSHI-AGE-FS',['SP-S2H-GRILLE-UP-V','SP-S2H-GRILLE-UP-H','SP-S2H-GRILLE-UP-DIA','SP-S2H-GRILLE-UP-IGETA','SP-S2H-GRILLE-UP-HIGH-V','SP-S2H-GRILLE-UP-ADJ']],
    ['WT-S2H-SOTODAOSHI',['SP-S2H-OUTWARD-E','SP-S2H-OUTWARD-EE']],
    ['WT-S2H-KAZARI-HIKI',['SP-S2H-KAZARI-H','SP-S2H-KAZARI-HK','SP-S2H-KAZARI-HKK']],
    ['WT-S2H-KATTEGUCHI-VENT-FS',['SP-S2H-KSF-GRID-V','SP-S2H-KSF-GRID-H','SP-S2H-KSF-GRID-DH','SP-S2H-KSF-GRID-DIA','SP-S2H-KSF-GRID-IGETA','SP-S2H-KSF-GRID-NONE']],
    ['WT-S2H-KATTEGUCHI',['SP-S2H-KD-WAIST','SP-S2H-KD-FULLGLASS']],
  ],
  'サーモスL': [
    ['WT-SL-SHUTTER-HIKI',['SP-SL-SHUT-E-STD','SP-SL-SHUT-M-STD','SP-SL-SHUT-E-VENT','SP-SL-SHUT-E-WIND','SP-SL-SHUT-M-WIND']],
    ['WT-SL-MENKOSHI-HIKI',['SP-SL-GRILLE-V','SP-SL-GRILLE-DIA','SP-SL-GRILLE-IGETA','SP-SL-GRILLE-H']],
    ['WT-SL-TATE-SUBERI',['SP-SL-TATE-OP-T','SP-SL-TATE-OP-TF-OUT','SP-SL-TATE-OP-TFT-OUT','SP-SL-TATE-OP-TF-IN','SP-SL-TATE-OP-TFT-IN','SP-SL-TATE-CAM-T','SP-SL-TATE-CAM-TF-OUT','SP-SL-TATE-CAM-TFT-OUT','SP-SL-TATE-CAM-TF-IN','SP-SL-TATE-CAM-TFT-IN']],
    ['WT-SL-YOKO-SUBERI',['SP-SL-YOKO-OP','SP-SL-YOKO-CAM']],
    ['WT-SL-MENKOSHI-AGE-FS',['SP-SL-AGE-GRILLE-V','SP-SL-AGE-GRILLE-H','SP-SL-AGE-GRILLE-DIA','SP-SL-AGE-GRILLE-IGETA']],
    ['WT-SL-SOTODAOSHI',['SP-SL-OUTWARD-E','SP-SL-OUTWARD-EE']],
    ['WT-SL-KAZARI-HIKI',['SP-SL-KAZARI-H','SP-SL-KAZARI-HK','SP-SL-KAZARI-HKK']],
  ],
};

async function scanThermos(series, windowId, targets) {
  const productId = bySeries('LIXIL', series);
  let selection = { window_type: windowId };
  const seen = new Set();
  const targetSet = new Set(targets);
  const hits = [];
  for (let step = 0; step < 10; step += 1) {
    const result = await resolveRuntimeAppProduct(productId, selection);
    for (const field of result.fields ?? []) {
      for (const choice of enabled(field)) {
        const specs = choiceSpecs(choice);
        const matched = specs.filter((spec) => targetSet.has(spec));
        if (matched.length) hits.push({ step, field: field.key, choice: choice.value, matched, all_specific_specs: specs });
      }
    }
    if (hits.length) break;
    const canonical = { ...(result.selection ?? {}) };
    const next = (result.fields ?? []).find((f) => f.required && !f.readOnly && f.key !== 'window_type' && f.key !== 'size_mode' && f.key !== 'size' && !canonical[f.key] && enabled(f).length);
    if (!next) break;
    const choice = enabled(next)[0];
    selection = { ...canonical, [next.key]: next.dataType === 'MULTI_ENUM' ? [choice.value] : choice.value };
    const key = JSON.stringify(selection);
    if (seen.has(key)) break;
    seen.add(key);
  }
  return { series, window_id: windowId, targets, hits };
}

async function routeApw431(windowId, region, panel) {
  const productId = bySeries('YKK AP', 'APW431');
  let selection = { window_type: windowId };
  const trace = [];
  for (let step = 0; step < 8; step += 1) {
    const result = await resolveRuntimeAppProduct(productId, selection);
    const canonical = { ...(result.selection ?? {}) };
    const fieldMap = new Map((result.fields ?? []).map((f) => [f.key, f]));
    trace.push({
      step,
      selection: canonical,
      fields: (result.fields ?? []).map((f) => ({ key: f.key, required: f.required, readOnly: f.readOnly, values: enabled(f).map((v) => v.value) })),
    });
    const sizeMode = fieldMap.get('size_mode');
    if (sizeMode) return { window_id: windowId, region, panel, final_selection: canonical, size_modes: enabled(sizeMode).map((v) => v.value), trace };
    const forced = [
      ['region_standard', region],
      ['panel_count', panel],
      ['window_configuration', panel],
    ].find(([key, value]) => fieldMap.has(key) && !canonical[key] && enabled(fieldMap.get(key)).some((v) => same(v.value, value)));
    if (forced) {
      selection = { ...canonical, [forced[0]]: forced[1] };
      continue;
    }
    const next = (result.fields ?? []).find((f) => f.required && !f.readOnly && f.key !== 'window_type' && !canonical[f.key] && enabled(f).length);
    if (!next) return { window_id: windowId, region, panel, final_selection: canonical, size_modes: [], trace, stopped: 'NO_NEXT_REQUIRED_FIELD' };
    selection = { ...canonical, [next.key]: enabled(next)[0].value };
  }
  return { window_id: windowId, region, panel, size_modes: [], trace, stopped: 'STEP_LIMIT' };
}

const thermos = [];
for (const [series, rows] of Object.entries(blockedThermos)) for (const [windowId, targets] of rows) thermos.push(await scanThermos(series, windowId, targets));
const apw431 = [];
for (const panel of ['単窓','2連窓','3連窓']) apw431.push(await routeApw431('W431-004','北海道',panel));
for (const panel of ['単窓','2連窓','3連窓']) apw431.push(await routeApw431('W431-005','本州',panel));
apw431.push(await routeApw431('W431-006','本州','単窓'));
apw431.push(await routeApw431('W431-006','北海道','単窓'));

console.log(JSON.stringify({ exact_head_sha: HEAD_SHA, thermos, apw431 }, null, 2));
const thermosMisses = thermos.filter((row) => row.hits.length === 0);
console.log(`TARGETED_THERMOS_METADATA windows=${thermos.length} misses=${thermosMisses.length}`);
console.log(`TARGETED_APW431 routes=${apw431.length} custom_visible=${apw431.filter((row)=>row.size_modes.includes('CUSTOM')).length}`);
