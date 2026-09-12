const active = (row) => row?.active !== false && row?.['有効'] !== false && row?.status !== '廃止' && row?.['状態'] !== '廃止';
const unique = (values) => [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))];
const scalar = (value) => Array.isArray(value) ? value[0] : value;
const same = (a,b) => String(a) === String(b);
const split = (value) => String(value ?? '').split(/[／|・、,]/).map((part)=>part.trim()).filter(Boolean);

function field(key, displayLabel, values, { required = false, dataType = 'ENUM', readOnly = false } = {}) {
  return { key, displayLabel, displayOrder: 0, dataType, required, readOnly, values };
}
function choice(value, displayLabel, runtimeValueRow = null) {
  return { value, displayLabel: displayLabel ?? String(value), manualCheck: false, disabled: false, ...(runtimeValueRow ? { runtimeValueRow } : {}) };
}
function canonicalDocuments(runtimePackage) {
  const core = runtimePackage.documents.CORE;
  const dimensions = runtimePackage.documents.DIMENSIONS;
  const options = runtimePackage.documents.OPTIONS;
  if (!core || !dimensions || !options) {
    const error = new Error('APW431 formal split Runtime requires CORE, DIMENSIONS and OPTIONS documents');
    error.code = 'APW431_FORMAL_SPLIT_INCOMPLETE';
    throw error;
  }
  return { core, dimensions, options };
}
function validOriginal(original, values, key) {
  const requested = scalar(original[key]);
  return values.some((value)=>same(value, requested)) ? values.find((value)=>same(value,requested)) : null;
}
function excludedByWindow(combo, window) {
  const excluded = split(combo['除外窓種']);
  return excluded.some((value)=>value === window.displayName || value === window.id);
}
function colorCombos(options, window) {
  return (options.color_combinations ?? []).filter(active).filter((row)=>!excludedByWindow(row,window));
}
function screenFor(options, windowId) {
  return (options.screen_master ?? []).filter(active).filter((row)=>row['対象window_id']===windowId);
}
function customRuleMatches(rule, selection, window) {
  if (!active(rule) || rule.windowId !== window.id) return false;
  const selector = rule.selector ?? {};
  if (selector.regionStandard && selection.region_standard && selector.regionStandard !== selection.region_standard) return false;
  const panel = selector.panelOrConfiguration;
  if (panel && panel !== '*' && selection.panel_count && panel !== selection.panel_count && panel !== selection.window_configuration) return false;
  const type = selector.typeOrSpec;
  if (type && type !== '*' && selection.window_configuration && type !== selection.window_configuration) return false;
  return true;
}
function customRuleAllows(rule, width, height) {
  const b = rule.bounds ?? {};
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (b.W_min != null && width < Number(b.W_min)) return false;
  if (b.W_max != null && width > Number(b.W_max)) return false;
  if (b.H_min != null && height < Number(b.H_min)) return false;
  if (b.H_max != null && height > Number(b.H_max)) return false;
  if (b.H_upper_a != null && b.H_upper_b != null && height > Number(b.H_upper_a) * width + Number(b.H_upper_b)) return false;
  return true;
}

export function adaptApw431FormalSplitV1(runtimePackage) {
  const { core, dimensions, options } = canonicalDocuments(runtimePackage);
  const windows = (core.series_windows ?? []).filter((row)=>active(row) && row.productId === 'SER-YKK-APW431' && row.selectable !== false)
    .sort((a,b)=>Number(a.displayOrder ?? 9999)-Number(b.displayOrder ?? 9999));
  const windowById = new Map(windows.map((row)=>[row.id,row]));
  const sizeById = new Map((dimensions.standard_sizes ?? []).filter(active).map((row)=>[row.id,row]));

  function resolveUi(inputSelection = {}) {
    const original = { ...(inputSelection ?? {}) };
    delete original.construction;
    delete original.legacyConstruction;
    delete original.legacyConfiguration;
    delete original.internal_construction;
    const selection = {};
    const fields = [];
    const notices = [];
    const manualWarnings = [];
    let dimensionResult = null;
    let orderReady = false;

    fields.push(field('window_type','窓種類',windows.map((row)=>choice(row.id,row.displayName,row)),{required:true}));
    const requestedWindow = scalar(original.window_type);
    const window = windowById.get(requestedWindow);
    if (!window) return finalize();
    selection.window_type = requestedWindow;

    let rows = (dimensions.standard_sizes ?? []).filter(active).filter((row)=>row.windowId===window.id);
    const regions = unique(rows.map((row)=>row.regionStandard));
    if (regions.length) {
      fields.push(field('region_standard','地域規格',regions.map((value)=>choice(value,value)),{required:true,readOnly:regions.length===1}));
      selection.region_standard = validOriginal(original,regions,'region_standard') ?? (regions.length===1 ? regions[0] : undefined);
      if (!selection.region_standard) return finalize();
      rows = rows.filter((row)=>same(row.regionStandard,selection.region_standard));
    }

    const panelLabels = unique(rows.map((row)=>row.panelCountLabel));
    if (panelLabels.length) {
      fields.push(field('panel_count','建具・枚数',panelLabels.map((value)=>choice(value,value)),{required:panelLabels.length>1,readOnly:panelLabels.length===1}));
      selection.panel_count = validOriginal(original,panelLabels,'panel_count') ?? (panelLabels.length===1 ? panelLabels[0] : undefined);
      if (!selection.panel_count && panelLabels.length>1) return finalize();
      if (selection.panel_count) rows = rows.filter((row)=>same(row.panelCountLabel,selection.panel_count));
    }

    if (window.id === 'W431-003') {
      const configurations = unique(rows.map((row)=>row.windowConfiguration));
      fields.push(field('window_configuration','連窓構成',configurations.map((value)=>choice(value,value)),{required:configurations.length>1,readOnly:configurations.length===1}));
      selection.window_configuration = validOriginal(original,configurations,'window_configuration') ?? (configurations.length===1 ? configurations[0] : undefined);
      if (!selection.window_configuration && configurations.length>1) return finalize();
      if (selection.window_configuration) rows = rows.filter((row)=>same(row.windowConfiguration,selection.window_configuration));
    }

    let candidateRows = (dimensions.integrated_candidates ?? []).filter(active).filter((row)=>row.windowId===window.id);
    if (selection.region_standard) candidateRows = candidateRows.filter((row)=>same(row.regionStandard,selection.region_standard));
    if (selection.panel_count) candidateRows = candidateRows.filter((row)=>same(row.panelOrConfiguration,selection.panel_count));
    if (selection.window_configuration) candidateRows = candidateRows.filter((row)=>same(row.typeOrSpec,selection.window_configuration) || same(sizeById.get(row.sizeId)?.windowConfiguration,selection.window_configuration));

    if (window.id === 'W431-002') {
      const shutterMap = new Map();
      for (const candidate of candidateRows) {
        const shutter = candidate.shutter ?? {};
        if (!shutter.typeId || shutter.typeId === 'ST-NONE') continue;
        shutterMap.set(shutter.typeId, shutter);
      }
      const shutterValues = [...shutterMap.values()];
      fields.push(field('shutter_type','シャッター種類',shutterValues.map((row)=>choice(row.typeId,row.displayName,row)),{required:true}));
      const requestedShutter = scalar(original.shutter_type);
      if (shutterMap.has(requestedShutter)) selection.shutter_type = requestedShutter;
      if (!selection.shutter_type) return finalize();
      candidateRows = candidateRows.filter((row)=>row.shutter?.typeId===selection.shutter_type);
    }

    const hasCustom = (dimensions.custom_dimension_rules ?? []).some((rule)=>customRuleMatches(rule,selection,window));
    const sizeModes = ['STANDARD', ...(hasCustom ? ['CUSTOM'] : [])];
    fields.push(field('size_mode','サイズ方式',sizeModes.map((value)=>choice(value,value==='STANDARD'?'規格サイズ':'特注寸法')),{required:true}));
    selection.size_mode = sizeModes.includes(original.size_mode) ? original.size_mode : 'STANDARD';

    if (selection.size_mode === 'CUSTOM') {
      fields.push(field('custom_width','特注W（mm）',[],{required:true,dataType:'NUMBER'}));
      fields.push(field('custom_height','特注H（mm）',[],{required:true,dataType:'NUMBER'}));
      if (Number.isFinite(Number(original.custom_width))) selection.custom_width = Number(original.custom_width);
      if (Number.isFinite(Number(original.custom_height))) selection.custom_height = Number(original.custom_height);
      const width = Number(selection.custom_width), height = Number(selection.custom_height);
      if (Number.isFinite(width) && Number.isFinite(height)) {
        const matches = (dimensions.custom_dimension_rules ?? []).filter((rule)=>customRuleMatches(rule,selection,window)).filter((rule)=>customRuleAllows(rule,width,height));
        if (matches.length === 1) {
          const matched = matches[0];
          dimensionResult = { status:'PASS', code:'CUSTOM_RULE_MATCH', ruleId:matched.id, derivedConstruction:matched.selector?.construction ?? null };
          manualWarnings.push('APW431特注寸法は正式Runtimeの製作範囲ルールで一次判定しています。SOURCE_GRAPH指定の耐風圧境界等はメーカー資料で最終確認してください。');
        } else if (matches.length > 1) {
          dimensionResult = { status:'REVIEW_REQUIRED', code:'REVIEW_REQUIRED_CONSTRUCTION_AMBIGUOUS', candidateRuleIds:matches.map((row)=>row.id) };
          manualWarnings.push('工法候補をUIで推測しません。複数の正式製作範囲ルールが成立するためメーカー資料確認が必要です。');
        } else {
          dimensionResult = { status:'BLOCKED', code:'CUSTOM_DIMENSION_OUT_OF_RANGE' };
        }
      }
    } else {
      let allowedSizeIds = null;
      if (window.id === 'W431-002' && selection.shutter_type) allowedSizeIds = new Set(candidateRows.map((row)=>row.sizeId));
      if (allowedSizeIds) rows = rows.filter((row)=>allowedSizeIds.has(row.id));
      const sizes = [...new Map(rows.map((row)=>[row.id,row])).values()];
      fields.push(field('size','サイズ',sizes.map((row)=>choice(row.id,row.sizeLabel,row)),{required:true}));
      const requestedSize = scalar(original.size);
      if (sizes.some((row)=>row.id===requestedSize)) selection.size = requestedSize;
      if (!selection.size) return finalize();
      const selectedSize = sizeById.get(selection.size);
      if (selectedSize) {
        dimensionResult = { status:'PASS', code:'STANDARD_EXACT_CANDIDATE', sizeId:selectedSize.id, derivedConstruction:selectedSize.construction ?? null };
      }
    }

    const combos = colorCombos(options,window);
    const exteriorCodes = unique(combos.map((row)=>row['外観コード']));
    if (exteriorCodes.length) {
      fields.push(field('exterior_color','外観色',exteriorCodes.map((code)=>choice(code,combos.find((row)=>row['外観コード']===code)?.['外観色'])),{required:true}));
      selection.exterior_color = validOriginal(original,exteriorCodes,'exterior_color') ?? (exteriorCodes.length===1 ? exteriorCodes[0] : undefined);
      if (!selection.exterior_color) return finalize();
      const interiorRows = combos.filter((row)=>row['外観コード']===selection.exterior_color);
      const interiorCodes = unique(interiorRows.map((row)=>row['内観コード']));
      fields.push(field('interior_color','内観色',interiorCodes.map((code)=>choice(code,interiorRows.find((row)=>row['内観コード']===code)?.['内観色'])),{required:true,readOnly:interiorCodes.length===1}));
      selection.interior_color = validOriginal(original,interiorCodes,'interior_color') ?? (interiorCodes.length===1 ? interiorCodes[0] : undefined);
      if (!selection.interior_color) return finalize();
    }

    const screens = screenFor(options,window.id);
    if (screens.length) {
      fields.push(field('screen_presence','網戸',[choice('なし','なし'),choice('あり','あり')]));
      if (['なし','あり'].includes(original.screen_presence)) selection.screen_presence = original.screen_presence;
      if (selection.screen_presence === 'あり') {
        const forms = unique(screens.map((row)=>row['正式網戸形式']));
        fields.push(field('screen_form','網戸形式',forms.map((value)=>choice(value,value)),{required:true,readOnly:forms.length===1}));
        selection.screen_form = validOriginal(original,forms,'screen_form') ?? (forms.length===1 ? forms[0] : undefined);
        if (!selection.screen_form) return finalize();
        const mids = unique(screens.flatMap((row)=>{
          const text=String(row['中桟']??'');
          const values=[]; if(text.includes('中桟なし')) values.push('中桟なし'); if(text.includes('中桟付')) values.push('中桟付'); return values;
        }));
        if (mids.length) {
          fields.push(field('screen_midrail','網戸中桟',mids.map((value)=>choice(value,value)),{required:mids.length>1,readOnly:mids.length===1}));
          selection.screen_midrail = validOriginal(original,mids,'screen_midrail') ?? (mids.length===1 ? mids[0] : undefined);
          if (!selection.screen_midrail && mids.length>1) return finalize();
        }
        const nets = unique(screens.flatMap((row)=>split(row['ネット種類'])));
        if (nets.length) {
          fields.push(field('screen_net','網戸ネット',nets.map((value)=>choice(value,value)),{required:nets.length>1,readOnly:nets.length===1}));
          selection.screen_net = validOriginal(original,nets,'screen_net') ?? (nets.length===1 ? nets[0] : undefined);
          if (!selection.screen_net && nets.length>1) return finalize();
        }
      }
    }

    const glassRows = (options.glass_master ?? []).filter(active);
    if (glassRows.length) {
      fields.push(field('glass_base','ガラス',glassRows.map((row)=>choice(row.glass_id,`${row['大分類']}｜${row['日射区分']}｜${row['ガラス色']}`,row)),{required:true}));
      const glassIds = glassRows.map((row)=>row.glass_id);
      selection.glass_base = validOriginal(original,glassIds,'glass_base') ?? undefined;
      if (!selection.glass_base) return finalize();
    }

    const optionsRows = (options.other_options ?? []).filter(active);
    if (optionsRows.length) {
      fields.push(field('option','その他オプション',[choice('なし','なし'),...optionsRows.map((row)=>choice(row.option_id,row['表示名'],row))]));
      const optionIds = ['なし',...optionsRows.map((row)=>row.option_id)];
      if (optionIds.includes(original.option)) selection.option = original.option;
    }

    orderReady = Boolean(selection.size || (selection.size_mode==='CUSTOM' && dimensionResult?.status==='PASS'));
    return finalize();

    function finalize() {
      const missingRequiredFields = fields.filter((f)=>f.required && f.dataType!=='NUMBER' && selection[f.key]===undefined).map((f)=>f.key);
      if (fields.some((f)=>f.key==='custom_width'&&f.required) && !Number.isFinite(Number(selection.custom_width))) missingRequiredFields.push('custom_width');
      if (fields.some((f)=>f.key==='custom_height'&&f.required) && !Number.isFinite(Number(selection.custom_height))) missingRequiredFields.push('custom_height');
      const errors = [];
      if (dimensionResult?.status==='BLOCKED') errors.push({ errorCode:dimensionResult.code, field:'size', message:'入力寸法は正式Runtimeの製作範囲外です。' });
      if (dimensionResult?.status==='REVIEW_REQUIRED') errors.push({ errorCode:dimensionResult.code, field:'size', message:'正式Runtime上で工法候補が一意に決まりません。' });
      return {
        selection,
        fields,
        notices,
        manualWarnings,
        validation:{ status: errors.length ? (dimensionResult?.status ?? 'INVALID') : (missingRequiredFields.length ? 'INCOMPLETE' : 'VALID'), errors, missingRequiredFields },
        dimensionResult,
        orderReady,
        runtimeCapabilities:{ orderReady:false, failClosed:true, standardFirst:true, sourceGraphNoInterpolation:true },
      };
    }
  }

  return Object.freeze({ master:null, resolver:null, uiResolver:resolveUi });
}
