import { ACTIVE, has, uniq, clone, same, meaningfulHanding, selectedOne, selectedMany, sourceSpecId, sourceWindowId, sourceGlassId, createModel, baseValueRows, labelsToValues, findSize } from './canonical-workbook-reference-v1-model.mjs';

function allowedByField(model, selection) {
  const allowed = new Map(model.fields.map((def) => [def.field_name, []]));
  const visible = new Set(['window_type']);
  const required = new Set(['window_type']);
  const windowId = selectedOne(selection,'window_type');
  const specId = selectedOne(selection,'window_spec');
  const variant = selectedOne(selection,'variant');
  const sizeMode = selectedOne(selection,'size_mode');
  const sizeId = selectedOne(selection,'size');
  const screenPresence = selectedOne(selection,'screen_presence');
  const screenForm = selectedOne(selection,'screen_form');
  const glassId = selectedOne(selection,'glass_base');

  allowed.set('window_type', labelsToValues(baseValueRows(model,'window_type')));

  const window = model.windows.find((row) => row.id === windowId);
  if (window) {
    visible.add('window_spec'); required.add('window_spec');
    const specRows = model.specs.filter((row) => sourceWindowId(row) === windowId);
    allowed.set('window_spec', specRows.map((row) => row.spec_id));

    if (specId && specRows.some((row) => row.spec_id === specId)) {
      const variantPossible = model.variantRelations.some((row) =>
        row['選択可否'] === '可' && sourceWindowId(row) === windowId && sourceSpecId(row) === specId
      );
      if (variantPossible && model.variants.length > 1) {
        visible.add('variant');
        allowed.set('variant', model.variants.filter((row) => row.variant_id === model.standardVariant || model.designVariantIds.has(row.variant_id)).map((row) => row.variant_id));
      }

      const sizeRows = model.normalizedSizes.filter((row) => row.window_id === windowId && row.spec_id === specId);
      const customRows = model.customRanges.filter((row) => sourceWindowId(row) === windowId && sourceSpecId(row) === specId);
      const handings = uniq(sizeRows.flatMap((row) => meaningfulHanding(row.handing)), (row) => row);
      if (handings.length) { visible.add('handing'); allowed.set('handing', handings); }

      visible.add('size_mode'); required.add('size_mode');
      const modes = [];
      if (sizeRows.length) modes.push('STANDARD');
      if (customRows.length) modes.push('CUSTOM');
      allowed.set('size_mode', modes);

      if (sizeMode === 'STANDARD' && sizeRows.length) {
        visible.add('size'); required.add('size');
        allowed.set('size', sizeRows.map((row) => row.id));
      } else if (sizeMode === 'CUSTOM' && customRows.length) {
        visible.add('custom_w'); visible.add('custom_h'); required.add('custom_w'); required.add('custom_h');
      }

      const effectiveVariant = variant || (!variantPossible ? model.standardVariant : null);
      if (!variantPossible || effectiveVariant) {
        const colorRows = model.colors.filter((row) => row.variant_id === effectiveVariant && (row.available === true || row.available === '○' || row.available === '可'));
        visible.add('exterior_color'); required.add('exterior_color');
        allowed.set('exterior_color', uniq(colorRows.map((row) => row.exterior_id), (row) => row));
        const ext = selectedOne(selection,'exterior_color');
        if (ext) {
          visible.add('interior_color'); required.add('interior_color');
          allowed.set('interior_color', uniq(colorRows.filter((row) => row.exterior_id === ext).map((row) => row.interior_id), (row) => row));
        }
      }

      if (window.screen !== 'なし') {
        visible.add('screen_presence');
        allowed.set('screen_presence',['なし','あり']);
        if (screenPresence === 'あり') {
          const candidates = model.screens.filter((row) => row.window_id === windowId && row.presence === 'あり');
          const forms = uniq(candidates.map((row) => row.screen_type ?? row.label).filter(has),(row)=>row);
          if (forms.length) { visible.add('screen_form'); allowed.set('screen_form',forms); }
          const formCandidates = candidates.filter((row) => !screenForm || (row.screen_type ?? row.label) === screenForm);
          const midrails = uniq(formCandidates.map((row) => row.midrail).filter((value) => has(value) && !['対象外','なし（固定）'].includes(value)),(row)=>row);
          if (midrails.length) { visible.add('screen_midrail'); allowed.set('screen_midrail',midrails); }
          if (screenForm || forms.length === 1) {
            const meshes = uniq(formCandidates.map((row) => row.mesh).filter((value)=>has(value) && value !== '対象外'),(row)=>row);
            if (meshes.length) { visible.add('screen_net'); allowed.set('screen_net',meshes); }
          }
        }
      }

      let glassIds = [];
      if (sizeMode === 'STANDARD' && sizeId) {
        glassIds = findSize(model,sizeId)?.glass_ids ?? [];
      } else if (sizeMode === 'CUSTOM') {
        glassIds = uniq(customRows.map((row) => sourceGlassId(row)).filter(has),(row)=>row);
      } else {
        glassIds = uniq([...sizeRows.flatMap((row)=>row.glass_ids), ...customRows.map((row)=>sourceGlassId(row))].filter(has),(row)=>row);
      }
      if (effectiveVariant && effectiveVariant !== model.standardVariant) {
        glassIds = glassIds.filter((id) => model.variantRelations.some((row) =>
          row.variant_id === effectiveVariant && sourceWindowId(row) === windowId && sourceSpecId(row) === specId &&
          sourceGlassId(row) === id && row['選択可否'] === '可'
        ));
        if (sizeId) {
          const sourceSizeIds = new Set(findSize(model,sizeId)?.source_ids ?? []);
          glassIds = glassIds.filter((id) => !model.variantExclusions.some((row) =>
            row.variant_id === effectiveVariant && sourceSpecId(row) === specId && sourceGlassId(row) === id &&
            (sourceSizeIds.has(row.size_id) || row['呼称コード'] === findSize(model,sizeId)?.size_code) &&
            row['判定'] === '不可'
          ));
        }
      }
      glassIds = uniq(glassIds,(row)=>row);
      if (glassIds.length) {
        visible.add('glass_base'); required.add('glass_base'); allowed.set('glass_base',glassIds);
      }

      if (glassId && glassIds.includes(glassId)) {
        const details = model.glassDetails.filter((row) => row.glass_id === glassId);
        if (details.length) { visible.add('glass_detail'); allowed.set('glass_detail',details.map((row)=>row.glass_detail_id)); }
        const features = model.glassFeatures.filter((row) => row['対象glass_id'] === glassId);
        if (features.length) { visible.add('glass_function'); allowed.set('glass_function',features.map((row)=>row.feature_id)); }
        const selectedDetail = details.find((row) => row.glass_detail_id === selectedOne(selection,'glass_detail'));
        const glass = model.glasses.find((row) => row.id === glassId);
        const spacer = selectedDetail?.['スペーサー'] ?? glass?.spacer ?? glass?.['スペーサー'];
        const gas = selectedDetail?.['ガス'] ?? glass?.gas ?? glass?.['基本ガス'];
        if (has(spacer)) { visible.add('glass_spacer'); allowed.set('glass_spacer',[spacer]); }
        if (has(gas)) { visible.add('glass_air_layer'); allowed.set('glass_air_layer',[gas]); }
      }

      visible.add('option');
      const selectedOptions = new Set(selectedMany(selection,'option'));
      const optionRows = model.options.filter((row) =>
        (row.window_id === '*' || row.window_id === windowId) &&
        (!has(row['固有仕様ID']) || row['固有仕様ID'] === '*' || row['固有仕様ID'] === specId)
      );
      const optionIds = [];
      for (const row of optionRows) {
        const rel = model.optionApplicability.find((one) => one.window_id === windowId && one.option_id === row.id);
        if (rel?.applicability === 'NON_APPLICABLE') continue;
        if (rel?.applicability === 'CONDITIONAL_APPLICABLE' && rel.dependency_option_id && !selectedOptions.has(rel.dependency_option_id)) continue;
        optionIds.push(row.id);
      }
      allowed.set('option',uniq(optionIds,(row)=>row));
    }
  }
  return {allowed, visible, required};
}

function normalizeArrays(model, selection) {
  const out = {};
  const defs = new Map(model.fields.map((row)=>[row.field_name,row]));
  for (const [key,value] of Object.entries(selection ?? {})) {
    const def = defs.get(key);
    if (!def) continue;
    out[key] = def.data_type === 'array'
      ? (Array.isArray(value) ? [...new Set(value.filter(has))] : has(value) ? [value] : [])
      : value;
  }
  return out;
}

function resolveModel(model, inputSelection = {}) {
  const selection = normalizeArrays(model,inputSelection);
  const cleared = [];
  const errors = [];
  let allowedState;

  for (let iteration=0; iteration<16; iteration++) {
    const before = JSON.stringify(selection);
    allowedState = allowedByField(model,selection);

    if (allowedState.visible.has('variant') && !has(selection.variant) && model.standardVariant &&
        (allowedState.allowed.get('variant') ?? []).includes(model.standardVariant)) {
      selection.variant = model.standardVariant;
    }

    for (const def of model.fields) {
      const key = def.field_name;
      if (!allowedState.visible.has(key)) {
        if (key in selection) { delete selection[key]; cleared.push({field:key,reason:'NOT_APPLICABLE'}); }
        continue;
      }
      if (!(key in selection)) continue;
      if (def.data_type === 'array') {
        const permitted = new Set(allowedState.allowed.get(key) ?? []);
        const next = selection[key].filter((value)=>permitted.has(value));
        if (next.length !== selection[key].length) cleared.push({field:key,reason:'DEPENDENCY',removed:selection[key].filter((value)=>!next.includes(value))});
        if (next.length) selection[key]=next; else delete selection[key];
      } else if (['enum'].includes(def.data_type)) {
        const permitted = allowedState.allowed.get(key) ?? [];
        if (has(selection[key]) && !permitted.some((value)=>same(value,selection[key]))) {
          const removed=selection[key]; delete selection[key]; cleared.push({field:key,reason:'DEPENDENCY',removed});
        }
      }
    }

    allowedState = allowedByField(model,selection);
    for (const key of ['glass_spacer','glass_air_layer']) {
      if (!has(selection[key]) && allowedState.visible.has(key) && (allowedState.allowed.get(key) ?? []).length === 1) {
        selection[key] = allowedState.allowed.get(key)[0];
      }
    }

    if (before === JSON.stringify(selection)) break;
    if (iteration === 15) {
      const error = new Error('Canonical workbook Runtime resolution exceeded 16 iterations');
      error.code = 'RUNTIME_RESOLUTION_LOOP';
      throw error;
    }
  }

  allowedState = allowedByField(model,selection);

  if (selection.size_mode === 'CUSTOM' && allowedState.visible.has('custom_w') && allowedState.visible.has('custom_h')) {
    const w = Number(selection.custom_w), h = Number(selection.custom_h);
    if (has(selection.custom_w) && !Number.isFinite(w)) errors.push({code:'CUSTOM_SIZE_INVALID_NUMBER',field:'custom_w'});
    if (has(selection.custom_h) && !Number.isFinite(h)) errors.push({code:'CUSTOM_SIZE_INVALID_NUMBER',field:'custom_h'});
    if (Number.isFinite(w) && Number.isFinite(h)) {
      const matches = model.customRanges.filter((row) =>
        sourceWindowId(row) === selection.window_type && sourceSpecId(row) === selection.window_spec &&
        w >= Number(row['W_MIN(mm)']) && w <= Number(row['W_MAX(mm)']) &&
        h >= Number(row['H_MIN(mm)']) && h <= Number(row['H_MAX(mm)'])
      );
      if (!matches.length) errors.push({code:'CUSTOM_SIZE_OUT_OF_RANGE',field:'size',message:'入力寸法は正式Runtimeの特注製作範囲外です。'});
    }
  }

  const warnings = [];
  let manualCheck = false;
  if (selection.screen_presence === 'あり' && has(selection.screen_net)) {
    const candidates = model.screens.filter((row) =>
      row.window_id === selection.window_type && row.presence === 'あり' &&
      (!has(selection.screen_form) || (row.screen_type ?? row.label) === selection.screen_form) &&
      row.mesh === selection.screen_net
    );
    if (candidates.some((row)=>row.unconfirmed_state === 'NEEDS_MFR_CONFIRMATION' || row.estimate_finalization === 'MANUFACTURER_CONFIRMATION_REQUIRED')) {
      manualCheck = true;
      warnings.push({code:'NEEDS_MFR_CONFIRMATION',message:'この機能性ネットはサイズにより対応できない場合があります。見積確定前にメーカー確認が必要です。'});
    }
  }

  const fields = {};
  for (const def of model.fields) {
    const isVisible = allowedState.visible.has(def.field_name);
    const allowed = allowedState.allowed.get(def.field_name) ?? [];
    const value = def.field_name in selection ? clone(selection[def.field_name]) : null;
    fields[def.field_name] = {
      value,
      state: !isVisible ? 'NOT_APPLICABLE' : value === null ? 'UNSET' : ['glass_spacer','glass_air_layer'].includes(def.field_name) ? 'RESOLVED' : 'SELECTED',
      visibility: isVisible ? 'SHOW' : 'HIDE',
      required: isVisible && allowedState.required.has(def.field_name),
      allowed_values: allowed,
    };
  }
  const missing = Object.entries(fields).filter(([,state]) => state.required && state.visibility === 'SHOW' && !has(state.value)).map(([name])=>name);
  const status = errors.length ? 'INVALID' : missing.length ? 'INCOMPLETE' : manualCheck ? 'MANUAL_CHECK' : 'VALID';
  return {
    fields,
    derived_components:new Set(),
    derived_entities:[],
    derived_options:[],
    warnings,
    matched_invalid_rules:[],
    errors,
    status,
    missing_required_fields:missing,
    cleared_fields:cleared,
  };
}

export function adaptCanonicalWorkbookReferenceV1(runtimePackage) {
  const document = runtimePackage?.documents?.runtime_master ?? runtimePackage?.documents?.RUNTIME_MASTER ?? Object.values(runtimePackage?.documents ?? {})[0];
  if (!document) {
    const error = new Error('Canonical workbook Runtime package is missing runtime_master document');
    error.code = 'RUNTIME_ADAPTER_SCHEMA_MISMATCH';
    throw error;
  }
  const model = createModel(document);
  const master = Object.freeze({
    fields:Object.freeze(model.fields.map((row)=>Object.freeze(row))),
    values:Object.freeze(model.values.map((row)=>Object.freeze(row))),
    capabilities:Object.freeze({
      runtimeContract:document.runtime_contract,
      newConstructionExteriorWindow:true,
      standardSizeRecords:model.normalizedSizes.length,
      sourceStandardSizeRows:model.provider.sizes?.filter(ACTIVE).length ?? 0,
      targetWindowSizeRows:Object.fromEntries(model.windows.map((window)=>[window.id,(model.provider.sizes ?? []).filter((row)=>ACTIVE(row)&&row.window_id===window.id).length])),
      customDimensionRules:model.customRanges.length,
      manualConfirmation:true,
      sourcePackageVersion:document.package_version,
    }),
    canonicalWorkbook:model,
  });
  return Object.freeze({
    master,
    resolver:(selection)=>resolveModel(model,selection),
  });
}
