import { ACTIVE, has, uniq, clone, same, meaningfulHanding, selectedOne, selectedMany, sourceSpecId, sourceWindowId, sourceGlassId, createModel, baseValueRows, labelsToValues, findSize } from './canonical-workbook-reference-v1-model.mjs';

const isAvailable = (value) => value === true || value === '○' || value === '可';
const screenFormOf = (row) => row.screen_type ?? row.label;
const splitTargets = (value) => String(value ?? '').split(/[・、,]/).map((part) => part.trim()).filter(Boolean);

function targetContainsForm(raw, form) {
  return splitTargets(raw).some((target) => target === form || String(form).includes(target) || target.includes(String(form)));
}

function screenOrderRule(model, form, mesh) {
  if (!has(form) || !has(mesh)) return null;
  const exact = model.screenOrderRules.find((row) => row['網戸タイプ'] === form && row['ネット種類'] === mesh);
  if (exact) return exact;
  const netSpec = model.screenNetSpecs.find((row) => row['ネット種類'] === mesh && targetContainsForm(row['対象網戸'], form));
  if (!netSpec) return null;
  return model.screenOrderRules.find((row) => row['網戸タイプ'] === netSpec['タイプ'] && row['ネット種類'] === mesh) ?? null;
}

function screenCandidateAllowed(model, form, mesh) {
  const rule = screenOrderRule(model, form, mesh);
  if (!rule) return true;
  return rule['商品候補表示'] !== '非表示' && rule['見積確定可否'] !== '不可' && rule['未確認時アプリ状態'] !== 'ERROR';
}

function windowIdMatches(raw, windowId) {
  return String(raw ?? '').split('/').map((part) => part.trim()).includes(windowId);
}

function fixedMidrailRule(model, windowId, form) {
  return model.screenRules.find((row) =>
    windowIdMatches(row['窓種ID'], windowId) && row['網戸形式'] === form && ['固定','継承'].includes(row['判定'])
  ) ?? null;
}

function customRangeMatches(row, selection) {
  const w = Number(selection.custom_w), h = Number(selection.custom_h);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return true;
  return w >= Number(row['W_MIN(mm)']) && w <= Number(row['W_MAX(mm)']) &&
    h >= Number(row['H_MIN(mm)']) && h <= Number(row['H_MAX(mm)']);
}

function allowedByField(model, selection) {
  const allowed = new Map(model.fields.map((def) => [def.field_name, []]));
  const visible = new Set(['window_type']);
  const required = new Set(['window_type']);
  const readOnly = new Set();
  const labels = new Map();
  const autoValues = new Map();
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
    const specRows = model.specs.filter((row) => sourceWindowId(row) === windowId);
    if (specRows.length) {
      visible.add('window_spec'); required.add('window_spec');
      labels.set('window_spec', window.spec_type || '窓種固有仕様');
      allowed.set('window_spec', specRows.map((row) => row.spec_id));
      if (specRows.length === 1 && String(window.spec_required ?? '').includes('不要')) {
        autoValues.set('window_spec', specRows[0].spec_id);
        readOnly.add('window_spec');
      }
    }

    if (specId && specRows.some((row) => row.spec_id === specId)) {
      const eligibleVariants = uniq(model.variantRelations.filter((row) =>
        row['選択可否'] === '可' && sourceWindowId(row) === windowId && sourceSpecId(row) === specId
      ).map((row) => row.variant_id).filter(has), (row) => row);
      const variantIds = uniq([model.standardVariant, ...eligibleVariants].filter(has), (row) => row);
      const variantPossible = variantIds.length > 1;
      if (variantPossible) {
        visible.add('variant');
        allowed.set('variant', variantIds.filter((id) => model.variants.some((row) => row.variant_id === id)));
      }

      const sizeRows = model.normalizedSizes.filter((row) => row.window_id === windowId && row.spec_id === specId);
      const customRows = model.customRanges.filter((row) => sourceWindowId(row) === windowId && sourceSpecId(row) === specId);
      const handings = uniq(sizeRows.flatMap((row) => meaningfulHanding(row.handing)), (row) => row);
      if (handings.length) {
        visible.add('handing'); required.add('handing'); allowed.set('handing', handings);
      }

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
        const colorRows = model.colors.filter((row) => row.variant_id === effectiveVariant && isAvailable(row.available));
        if (colorRows.length) {
          visible.add('exterior_color'); required.add('exterior_color');
          allowed.set('exterior_color', uniq(colorRows.map((row) => row.exterior_id), (row) => row));
          const ext = selectedOne(selection,'exterior_color');
          if (ext) {
            visible.add('interior_color'); required.add('interior_color');
            allowed.set('interior_color', uniq(colorRows.filter((row) => row.exterior_id === ext).map((row) => row.interior_id), (row) => row));
          }
        }
      }

      const windowScreenCandidates = model.screens.filter((row) => row.window_id === windowId && row.presence === 'あり');
      if (windowScreenCandidates.length) {
        visible.add('screen_presence');
        allowed.set('screen_presence',['なし','あり']);
        if (screenPresence === 'あり') {
          const forms = uniq(windowScreenCandidates.map(screenFormOf).filter(has),(row)=>row);
          if (forms.length) { visible.add('screen_form'); allowed.set('screen_form',forms); }
          const formCandidates = windowScreenCandidates.filter((row) => !screenForm || screenFormOf(row) === screenForm);
          if (screenForm || forms.length === 1) {
            const effectiveForm = screenForm || forms[0];
            const meshes = uniq(formCandidates.map((row) => row.mesh).filter((value)=>
              has(value) && value !== '対象外' && screenCandidateAllowed(model, effectiveForm, value)
            ),(row)=>row);
            if (meshes.length) { visible.add('screen_net'); allowed.set('screen_net',meshes); }
            const fixedRule = fixedMidrailRule(model, windowId, effectiveForm);
            const midrails = uniq(formCandidates.map((row) => row.midrail).filter((value) => has(value) && !['対象外','なし（固定）'].includes(value)),(row)=>row);
            if (!fixedRule && midrails.length) { visible.add('screen_midrail'); allowed.set('screen_midrail',midrails); }
          }
        }
      }

      let glassIds = [];
      if (sizeMode === 'STANDARD' && sizeId) {
        glassIds = findSize(model,sizeId)?.glass_ids ?? [];
      } else if (sizeMode === 'CUSTOM') {
        const rangeRows = customRows.filter((row) => customRangeMatches(row, selection));
        glassIds = uniq((rangeRows.length ? rangeRows : customRows).map((row) => sourceGlassId(row)).filter(has),(row)=>row);
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
        if (has(spacer)) { visible.add('glass_spacer'); readOnly.add('glass_spacer'); allowed.set('glass_spacer',[spacer]); }
        if (has(gas)) { visible.add('glass_air_layer'); readOnly.add('glass_air_layer'); allowed.set('glass_air_layer',[gas]); }
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
  return {allowed, visible, required, readOnly, labels, autoValues};
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

function explicitUnknownErrors(model, inputSelection) {
  const errors = [];
  for (const def of model.fields) {
    if (!(def.field_name in (inputSelection ?? {})) || !['enum','array'].includes(def.data_type)) continue;
    const base = baseValueRows(model, def.field_name).map((row) => row.canonical_value);
    const raw = def.data_type === 'array'
      ? (Array.isArray(inputSelection[def.field_name]) ? inputSelection[def.field_name] : [inputSelection[def.field_name]])
      : [inputSelection[def.field_name]];
    for (const value of raw.filter(has)) {
      if (!base.some((candidate) => same(candidate,value) || String(candidate) === String(value))) {
        errors.push({code:'SELECTION_NOT_ALLOWED',field:def.field_name,value});
      }
    }
  }
  return errors;
}

function resolveModel(model, inputSelection = {}) {
  const selection = normalizeArrays(model,inputSelection);
  const cleared = [];
  const errors = explicitUnknownErrors(model,inputSelection);
  let allowedState;

  for (let iteration=0; iteration<16; iteration++) {
    const before = JSON.stringify(selection);
    allowedState = allowedByField(model,selection);

    for (const [key,value] of allowedState.autoValues.entries()) {
      if (!has(selection[key])) selection[key] = value;
    }
    if (allowedState.visible.has('variant') && !has(selection.variant) && model.standardVariant &&
        (allowedState.allowed.get('variant') ?? []).includes(model.standardVariant)) {
      selection.variant = model.standardVariant;
    }

    // Auto-resolved parents can expose valid downstream fields in the same request.
    // Re-evaluate before pruning so a child supplied with an omitted default parent is not discarded.
    allowedState = allowedByField(model,selection);

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
        if (next.length !== selection[key].length) {
          const removed = selection[key].filter((value)=>!next.includes(value));
          cleared.push({field:key,reason:'DEPENDENCY',removed});
          errors.push({code:'SELECTION_INCOMPATIBLE',field:key,value:removed});
        }
        if (next.length) selection[key]=next; else delete selection[key];
      } else if (def.data_type === 'enum') {
        const permitted = allowedState.allowed.get(key) ?? [];
        if (has(selection[key]) && !permitted.some((value)=>same(value,selection[key]))) {
          const removed=selection[key]; delete selection[key]; cleared.push({field:key,reason:'DEPENDENCY',removed});
          errors.push({code:'SELECTION_INCOMPATIBLE',field:key,value:removed});
        }
      }
    }

    allowedState = allowedByField(model,selection);
    for (const [key,value] of allowedState.autoValues.entries()) {
      if (!has(selection[key])) selection[key] = value;
    }
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
        sourceWindowId(row) === selection.window_type && sourceSpecId(row) === selection.window_spec && customRangeMatches(row,selection)
      );
      if (!matches.length) errors.push({code:'CUSTOM_SIZE_OUT_OF_RANGE',field:'size',message:'入力寸法は正式Runtimeの特注製作範囲外です。'});
    }
  }

  const warnings = [];
  let manualCheck = false;
  if (selection.screen_presence === 'あり' && has(selection.screen_net)) {
    const candidates = model.screens.filter((row) =>
      row.window_id === selection.window_type && row.presence === 'あり' &&
      (!has(selection.screen_form) || screenFormOf(row) === selection.screen_form) &&
      row.mesh === selection.screen_net
    );
    const orderRule = screenOrderRule(model, selection.screen_form || screenFormOf(candidates[0]), selection.screen_net);
    if (candidates.some((row)=>row.unconfirmed_state === 'NEEDS_MFR_CONFIRMATION' || row.estimate_finalization === 'MANUFACTURER_CONFIRMATION_REQUIRED') ||
        orderRule?.['未確認時アプリ状態'] === 'NEEDS_MFR_CONFIRMATION') {
      manualCheck = true;
      warnings.push({
        code:'NEEDS_MFR_CONFIRMATION',
        message:'この機能性ネットはサイズにより対応できない場合があります。見積確定前にメーカー確認が必要です。',
        ruleId:orderRule?.rule_id ?? null,
      });
    }
  }

  const fields = {};
  for (const def of model.fields) {
    const isVisible = allowedState.visible.has(def.field_name);
    const allowed = allowedState.allowed.get(def.field_name) ?? [];
    const value = def.field_name in selection ? clone(selection[def.field_name]) : null;
    const resolved = isVisible && has(value) && (allowedState.readOnly.has(def.field_name) || ['glass_spacer','glass_air_layer'].includes(def.field_name));
    fields[def.field_name] = {
      value,
      state: !isVisible ? 'NOT_APPLICABLE' : value === null ? 'UNSET' : resolved ? 'RESOLVED' : 'SELECTED',
      visibility: isVisible ? 'SHOW' : 'HIDE',
      required: isVisible && allowedState.required.has(def.field_name),
      allowed_values: allowed,
      readOnly: isVisible && allowedState.readOnly.has(def.field_name),
      display_label: allowedState.labels.get(def.field_name) ?? null,
      unit:def.unit ?? null,
    };
  }
  const missing = Object.entries(fields).filter(([,state]) => state.required && state.visibility === 'SHOW' && !has(state.value)).map(([name])=>name);
  const uniqueErrors = uniq(errors, (row) => JSON.stringify([row.code,row.field,row.value,row.message]));
  const status = uniqueErrors.length ? 'INVALID' : missing.length ? 'INCOMPLETE' : manualCheck ? 'MANUAL_CHECK' : 'VALID';
  return {
    fields,
    derived_components:new Set(),
    derived_entities:[],
    derived_options:[],
    warnings,
    matched_invalid_rules:uniqueErrors.filter((row)=>row.ruleId).map((row)=>row.ruleId),
    errors:uniqueErrors,
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