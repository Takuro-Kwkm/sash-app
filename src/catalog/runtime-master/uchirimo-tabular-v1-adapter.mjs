import { innerWindowDisplayOrder } from './inner-window-runtime-ui-contract.mjs';

const NA = new Set(['NOT_APPLICABLE', 'N/A', 'not_applicable']);
const NODE_AXES = ['room_specification', 'window_type', 'sash_configuration', 'size_class'];
const GLASS_AXES = [
  'glass_family', 'glass_structure', 'low_e_type', 'glass_coating_color',
  'glass_surface_type', 'safety_treatment', 'grille_type', 'grille_material',
  'muntin_type', 'vacuum_glass_product', 'spacer_type', 'gas_fill',
];
const SUPPORTED_ACTIONS = new Set([
  'allow_only', 'auto_select', 'exclude_scope_classes', 'require', 'auto_formula',
  'route_exception', 'auto_calculated_by_size', 'incompatible', 'fixed_by',
  'exclude', 'evaluate_phase3_r2_reinforcement_master',
]);
const SUPPORTED_OPS = new Set(['eq', 'neq', 'in']);

const VALUE_LABELS = Object.freeze({
  insulating_glass: '複層ガラス', single_glazing: '単板ガラス', vacuum_glass: '真空ガラス',
  insulating: '断熱タイプ', solar_control: '遮熱タイプ', none: 'なし',
  clear: '透明', frosted: 'すり板', pattern: '型板', washi: '和紙調',
  standard: '一般', tempered: '強化', safety_laminated_30mil: '安全合わせ30mil',
  aluminum: 'アルミスペーサー', resin: '樹脂スペーサー', air: '空気層', argon: 'アルゴンガス入り',
  residential: '居室仕様', bathroom: '浴室仕様', sliding_window: '引違い窓', fix_window: 'FIX窓',
  inward_opening_window: '内開き窓', opening_window_terrace: '開き窓テラス',
  custom: '特注', left: '左吊元', right: '右吊元', yes: 'あり', no: 'なし', unknown: '未確認',
  reinforcement_square_pipe: '補強角パイプ', reinforcement_bracket: '補強ブラケット',
  reinforcement_bundle: '補強束', construction_material_floor_supported: '建材床支持',
  stepped_fukashi_60: '段差ふかし枠60',
});

const FIELD_LABELS = Object.freeze({
  room_specification: '仕様', window_type: '窓種類', glass_family: 'ガラス仕様',
  glass_structure: 'ガラス構成', low_e_type: 'Low-E性能', glass_coating_color: 'Low-E膜色',
  spacer_type: 'スペーサー', gas_fill: '中空層', cavity_thickness_mm: '中空層厚',
  frame_color: '本体色', frame_installation_mode: '枠仕様 / 納まり', size_mode: '特注サイズ',
  size_w: '製品W', size_h: '製品H',
});

function fail(code, message, details = {}) {
  const error = new Error(message); error.code = code; Object.assign(error, details); throw error;
}

const has = (value) => value !== null && value !== undefined && value !== '';
const same = (a, b) => Object.is(a, b) || String(a) === String(b);
const unique = (rows) => [...new Map(rows.map((row) => [JSON.stringify(row), row])).values()];
const valueLabel = (value, fallback) => VALUE_LABELS[value] ?? fallback ?? String(value);

function canonicalDocument(documents) {
  return documents.canonical_runtime ?? documents.canonical_master ??
    Object.entries(documents).find(([, value]) => value?.field_registry && value?.product_nodes)?.[1];
}

function roleDocument(documents, predicate) {
  return Object.values(documents).find(predicate) ?? null;
}

function assertUnique(rows, key, label) {
  const seen = new Set();
  for (const row of rows) {
    const id = row?.[key];
    if (!id || seen.has(id)) fail('RUNTIME_DUPLICATE_ID', `${label} has missing or duplicate ${key}: ${id}`);
    seen.add(id);
  }
}

function validateReferences(canonical, judgment) {
  assertUnique(canonical.field_registry, 'field_name', 'field_registry');
  assertUnique(canonical.product_nodes, 'node_id', 'product_nodes');
  assertUnique(canonical.glass_specs, 'glass_spec_id', 'glass_specs');
  assertUnique(canonical.dependency_rules, 'rule_id', 'dependency_rules');
  const fields = new Set(canonical.field_registry.map((row) => row.field_name));
  fields.add('size_mode'); fields.add('node_id'); fields.add('glass_spec_id');
  fields.add('glass_size_constraint_group'); fields.add('FINAL_PRODUCT_STATUS');
  const values = new Map();
  for (const row of canonical.allowed_values) {
    if (!fields.has(row.field_name)) fail('RUNTIME_REFERENCE_BROKEN', `Allowed value references unknown field: ${row.field_name}`);
    if (!values.has(row.field_name)) values.set(row.field_name, new Set());
    values.get(row.field_name).add(String(row.allowed_value));
  }
  for (const rule of canonical.dependency_rules) {
    if (!SUPPORTED_ACTIONS.has(rule.effect?.action)) fail('RUNTIME_RULE_ACTION_UNSUPPORTED', `Unsupported dependency action: ${rule.effect?.action}`, { ruleId: rule.rule_id });
    for (const condition of rule.conditions ?? []) {
      if (!SUPPORTED_OPS.has(condition.op)) fail('RUNTIME_RULE_OPERATOR_UNSUPPORTED', `Unsupported dependency operator: ${condition.op}`, { ruleId: rule.rule_id });
      if (!fields.has(condition.field)) fail('RUNTIME_REFERENCE_BROKEN', `Rule ${rule.rule_id} references unknown field ${condition.field}`);
    }
    const derivedOutput = ['auto_calculated_by_size', 'route_exception'].includes(rule.effect.action);
    if (!fields.has(rule.effect.target_field) && !derivedOutput) fail('RUNTIME_REFERENCE_BROKEN', `Rule ${rule.rule_id} targets unknown field ${rule.effect.target_field}`);
  }
  const declared = new Set(canonical.dependency_rules.map((row) => row.rule_id));
  for (const id of judgment?.rule_references?.dependency_rule_ids ?? []) {
    if (!declared.has(id)) fail('RUNTIME_REFERENCE_BROKEN', `Judgment engine references missing dependency rule ${id}`);
  }
  const nodeIds = new Set(canonical.product_nodes.map((row) => row.node_id));
  const glassIds = new Set(canonical.glass_specs.map((row) => row.glass_spec_id));
  for (const row of canonical.glass_node_matrix) {
    if (!nodeIds.has(row.node_id) || !glassIds.has(row.glass_spec_id)) fail('RUNTIME_REFERENCE_BROKEN', 'glass_node_matrix contains a broken reference', { row });
  }
}

function dataType(raw) {
  if (raw === 'number') return 'number';
  if (raw === 'string') return 'string';
  return 'enum';
}

function buildModel(runtimePackage) {
  const canonical = canonicalDocument(runtimePackage.documents);
  const judgment = roleDocument(runtimePackage.documents, (value) => value?.engine_role === 'SALES_LEVEL_JUDGMENT_ENGINE');
  const sizeInstallation = roleDocument(runtimePackage.documents, (value) => value?.size_selection_contract && value?.installation_input_contract);
  const vacuum = roleDocument(runtimePackage.documents, (value) => Array.isArray(value?.curves));
  if (!canonical || !judgment || !sizeInstallation || !vacuum) fail('RUNTIME_COMPONENT_RESOLUTION_ERROR', 'The four manifest-declared Runtime roles could not be resolved');
  validateReferences(canonical, judgment);

  const registry = canonical.field_registry.filter((row) => !['DEPRECATED', 'FIXED_HIDDEN'].includes(row.runtime_status));
  if (!registry.some((row) => row.field_name === 'size_mode')) registry.push({
    field_name: 'size_mode', domain: 'SIZE', value_type: 'enum', runtime_status: 'FIXED', display_name: '特注サイズ', note: 'Runtime size_selection_contract',
  });
  const fixedByField = new Map();
  for (const row of canonical.allowed_values) {
    if (row.status === 'FIXED') fixedByField.set(row.field_name, row.allowed_value);
  }
  fixedByField.set('size_mode', sizeInstallation.size_selection_contract.fixed_value);

  const glassSelectable = new Set(GLASS_AXES);
  const fields = registry.map((row, index) => {
    const fixed = fixedByField.has(row.field_name) && !glassSelectable.has(row.field_name);
    return {
      field_name: row.field_name,
      domain: row.domain,
      data_type: dataType(row.value_type),
      selection_mode: fixed ? 'FIXED' : row.runtime_status === 'REQUIRED' ? 'USER_SELECTABLE' : 'CONDITIONAL_SELECTABLE',
      required_mode: row.runtime_status === 'REQUIRED' ? 'REQUIRED' : 'OPTIONAL',
      visibility_mode: ['manufacturer', 'series', 'product_category'].includes(row.field_name) ? 'HIDDEN' : 'CONDITIONAL',
      default_value: fixed ? fixedByField.get(row.field_name) : null,
      display_label: FIELD_LABELS[row.field_name] ?? row.display_name ?? row.field_name,
      display_order: innerWindowDisplayOrder(row, index),
      unit: /(^|_)mm$/.test(row.field_name) || row.note === 'mm' ? 'mm' : null,
      runtime_included: true,
      show_read_only: row.field_name === 'size_mode',
      parent_fields: [],
    };
  });
  const definitionNames = new Set(fields.map((row) => row.field_name));
  const values = [];
  const valueKeys = new Set();
  for (const row of canonical.allowed_values) {
    if (!definitionNames.has(row.field_name) || NA.has(row.allowed_value)) continue;
    const key = `${row.field_name}\u0000${JSON.stringify(row.allowed_value)}`;
    if (valueKeys.has(key)) continue;
    valueKeys.add(key);
    values.push({
      field_name: row.field_name, canonical_value: row.allowed_value, status: 'CURRENT',
      display_label: valueLabel(row.allowed_value, row.display_name), user_selectable: row.status !== 'FIXED', runtime_selectable: true,
    });
  }
  if (!valueKeys.has('size_mode\u0000"custom"')) values.push({ field_name: 'size_mode', canonical_value: 'custom', status: 'CURRENT', display_label: '特注', user_selectable: false, runtime_selectable: true });
  const fieldByName = new Map(fields.map((row) => [row.field_name, row]));
  return Object.freeze({
    fields: Object.freeze(fields), values: Object.freeze(values), fieldByName,
    canonical, judgment, sizeInstallation, vacuum,
    capabilities: Object.freeze({
      runtimeContract: 'uchirimo_tabular_v1', dependencyRules: canonical.dependency_rules.length,
      productNodes: canonical.product_nodes.length, glassSpecs: canonical.glass_specs.length,
      standardSizeRecords: 0, sizeMode: sizeInstallation.size_selection_contract.fixed_value,
      options: canonical.option_master.length, bom: 'NOT_PROVIDED_BY_RUNTIME', lifecycle: 'NOT_PROVIDED_BY_RUNTIME',
      manualCheckCount: judgment.manual_check_routes?.length ?? 0, orderReady: runtimePackage.rawManifest.order_ready === true,
    }),
  });
}

function baseAllowed(model, field) {
  return unique(model.values.filter((row) => row.field_name === field && row.status === 'CURRENT').map((row) => row.canonical_value));
}

function conditionMatches(condition, selection) {
  const value = selection[condition.field];
  if (condition.op === 'eq') return same(value, condition.value);
  if (condition.op === 'neq') return has(value) && !same(value, condition.value);
  if (condition.op === 'in') return (condition.value ?? []).some((candidate) => same(value, candidate));
  return false;
}

function ruleMatches(rule, selection) {
  return (rule.conditions ?? []).every((condition) => conditionMatches(condition, selection));
}

function filterNodeCandidates(nodes, selection, skipField = null) {
  return nodes.filter((node) => NODE_AXES.every((field) => field === skipField || !has(selection[field]) || same(node[field === 'room_specification' ? 'room' : field], selection[field])));
}

function configureNodeAxes(model, selection, visible, required, allowed) {
  let candidates = model.canonical.product_nodes;
  for (const field of NODE_AXES) {
    const source = field === 'room_specification' ? 'room' : field;
    const scoped = filterNodeCandidates(candidates, selection, field);
    const choices = unique(scoped.map((row) => row[source]).filter(has));
    allowed.set(field, choices);
    const shouldShow = field === 'room_specification' || field === 'window_type' ||
      (field === 'sash_configuration' && selection.window_type === 'sliding_window') ||
      (field === 'size_class' && selection.window_type === 'sliding_window' && has(selection.sash_configuration));
    if (shouldShow || has(selection[field])) visible.add(field);
    if (visible.has(field)) required.add(field);
    if (has(selection[field])) candidates = candidates.filter((row) => same(row[source], selection[field]));
  }
  return candidates;
}

function applyGlassScopeRules(model, selection, glasses) {
  let out = glasses;
  for (const rule of model.canonical.dependency_rules) {
    if (rule.effect.action !== 'exclude_scope_classes' || !ruleMatches(rule, selection)) continue;
    const denied = new Set(rule.effect.values ?? []);
    out = out.filter((row) => !denied.has(row.scope_class));
  }
  return out;
}

function configureGlass(model, nodeId, selection, visible, required, allowed, derived) {
  for (const field of GLASS_AXES) { visible.delete(field); required.delete(field); }
  const availableIds = new Set(model.canonical.glass_node_matrix.filter((row) => row.node_id === nodeId && row.status !== 'NOT_APPLICABLE').map((row) => row.glass_spec_id));
  let candidates = applyGlassScopeRules(model, selection, model.canonical.glass_specs.filter((row) => availableIds.has(row.glass_spec_id)));
  for (const field of GLASS_AXES) {
    const effective = { ...selection, ...derived };
    const prerequisite = field === 'glass_family' ||
      (field === 'glass_structure' && has(effective.glass_family)) ||
      (field === 'low_e_type' && effective.glass_family === 'insulating_glass') ||
      (field === 'glass_coating_color' && has(effective.low_e_type) && effective.low_e_type !== 'none') ||
      (['glass_surface_type', 'safety_treatment', 'grille_type', 'muntin_type'].includes(field) && has(effective.glass_structure)) ||
      (field === 'grille_material' && has(effective.grille_type) && effective.grille_type !== 'none') ||
      (field === 'vacuum_glass_product' && effective.glass_family === 'vacuum_glass') ||
      (['spacer_type', 'gas_fill'].includes(field) && effective.glass_family === 'insulating_glass' && has(effective.glass_structure));
    const meaningful = unique(candidates.map((row) => row[field]).filter((value) => has(value) && !NA.has(value)));
    allowed.set(field, meaningful);
    if (prerequisite && (meaningful.length > 1 || meaningful.length === 1 || has(selection[field]))) {
      visible.add(field); required.add(field);
    }
    if (prerequisite && meaningful.length === 1 && !has(selection[field])) derived[field] = meaningful[0];
    const chosen = has(selection[field]) ? selection[field] : derived[field];
    if (has(chosen)) candidates = candidates.filter((row) => same(row[field], chosen));
  }
  if (candidates.length === 1) {
    const glass = candidates[0];
    derived.glass_spec_id = glass.glass_spec_id;
    derived.glass_size_constraint_group = glass.glass_size_constraint_group;
    for (const field of ['cavity_thickness_mm']) {
      if (has(glass[field]) && !NA.has(glass[field])) { derived[field] = glass[field]; visible.add(field); }
    }
  }
  return candidates;
}

function matrixFor(model, nodeId) {
  return model.canonical.detail_field_matrix.find((row) => row.node_id === nodeId) ?? null;
}

function configureDetailFields(model, matrix, visible, required) {
  if (!matrix) return;
  for (const [field, status] of Object.entries(matrix)) {
    if (field === 'node_id' || ['NOT_APPLICABLE', 'FIXED'].includes(status) || field === 'glass_spec_id') continue;
    if (!model.fieldByName.has(field)) continue;
    visible.add(field);
    if (status === 'REQUIRED') required.add(field);
  }
  for (const field of ['frame_installation_mode', 'extension_frame_type']) if (model.fieldByName.has(field)) visible.add(field);
}

function applyRules(model, selection, visible, required, allowed, derived, notices, exceptions, errors) {
  for (const rule of [...model.canonical.dependency_rules].sort((a, b) => a.priority - b.priority || a.rule_id.localeCompare(b.rule_id))) {
    if (!ruleMatches(rule, { ...selection, ...derived })) continue;
    const effect = rule.effect;
    const current = allowed.get(effect.target_field) ?? baseAllowed(model, effect.target_field);
    if (effect.action === 'allow_only') {
      allowed.set(effect.target_field, current.filter((value) => (effect.values ?? []).some((candidate) => same(value, candidate))));
      for (const [field, values] of Object.entries(effect.also ?? {})) allowed.set(field, (allowed.get(field) ?? baseAllowed(model, field)).filter((value) => values.some((candidate) => same(value, candidate))));
    } else if (effect.action === 'exclude') {
      allowed.set(effect.target_field, current.filter((value) => !(effect.values ?? []).some((candidate) => same(value, candidate))));
    } else if (effect.action === 'require') {
      visible.add(effect.target_field); required.add(effect.target_field); allowed.set(effect.target_field, effect.values ?? current);
    } else if (effect.action === 'auto_select') {
      derived[effect.target_field] = effect.value; visible.add(effect.target_field); allowed.set(effect.target_field, [effect.value]);
    } else if (effect.action === 'fixed_by') {
      if (has(selection[effect.field])) derived[effect.target_field] = selection[effect.field];
    } else if (effect.action === 'auto_formula') {
      derived[effect.target_field] = 'AUTO_EQUAL_FOUR';
      const width = Number(selection.size_w);
      const offset = /\+(\d+(?:\.\d+)?)/.exec(effect.value)?.[1];
      if (Number.isFinite(width) && offset) {
        const d = Number(offset);
        Object.assign(derived, { sash_w1: width / 4 + d, sash_w2: width / 4 - d, sash_w3: width / 4 - d, sash_w4: width / 4 + d });
      }
    } else if (effect.action === 'auto_calculated_by_size') {
      if (has(selection.size_w) && has(selection.size_h)) notices.push(`${rule.rule_id}: ${effect.target_field}は正式サイズルールで自動計算対象です。`);
    } else if (effect.action === 'incompatible') {
      errors.push({ code: effect.status ?? 'INCOMPATIBLE', field: effect.target_field, ruleId: rule.rule_id });
    } else if (effect.action === 'route_exception') {
      exceptions.push({ status: effect.status, ruleId: rule.rule_id });
    } else if (effect.action === 'evaluate_phase3_r2_reinforcement_master') {
      visible.add(effect.target_field); required.add(effect.target_field);
    }
  }
}

function evaluateBaseSize(model, nodeId, selection) {
  const rule = model.canonical.size_rules.find((row) => row[1] === nodeId);
  if (!rule) return { status: 'BLOCK', message: '対応する正式Dimension Ruleがありません。', matchedRuleIds: [] };
  const [ruleId,,, expression] = rule;
  const w = Number(selection.size_w), h = Number(selection.size_h);
  if (!has(selection.size_w) || !has(selection.size_h)) return { status: 'PENDING', message: '製品W・Hを入力してください。', matchedRuleIds: [ruleId] };
  if (!Number.isFinite(w) || !Number.isFinite(h)) return { status: 'BLOCK', message: '製品W・Hは数値で入力してください。', matchedRuleIds: [ruleId] };
  const failures = [];
  for (const match of expression.matchAll(/(\d+(?:\.\d+)?)<=([WH])<=(\d+(?:\.\d+)?)/g)) {
    const value = match[2] === 'W' ? w : h;
    if (value < Number(match[1]) || value > Number(match[3])) failures.push(match[0]);
  }
  for (const match of expression.matchAll(/H<=(-?\d+(?:\.\d+)?)\*W([+-]\d+(?:\.\d+)?)/g)) {
    if (h > Number(match[1]) * w + Number(match[2])) failures.push(match[0]);
  }
  const conditional = /if W>(\d+(?:\.\d+)?) then H<=(-?\d+(?:\.\d+)?)\*W([+-]\d+(?:\.\d+)?)/.exec(expression);
  if (conditional && w > Number(conditional[1]) && h > Number(conditional[2]) * w + Number(conditional[3])) failures.push(conditional[0]);
  const bath = /unit_bath W(\d+)-(\d+); tile W(\d+)-(\d+); H(\d+)-(\d+)/.exec(expression);
  if (bath) {
    const type = selection.bathroom_installation_type;
    if (!has(type)) return { status: 'PENDING', message: '浴室納まりを選択してください。', matchedRuleIds: [ruleId] };
    const min = Number(type === 'unit_bath' ? bath[1] : bath[3]);
    const max = Number(type === 'unit_bath' ? bath[2] : bath[4]);
    if (w < min || w > max || h < Number(bath[5]) || h > Number(bath[6])) failures.push(expression);
  }
  if (failures.length) return { status: 'BLOCK', message: `正式寸法条件外です: ${failures.join(' / ')}`, matchedRuleIds: [ruleId] };
  if (/standard|transom|individual Wi check/.test(expression)) return { status: 'REVIEW_REQUIRED', message: '正式Runtimeが個別障子寸法または欄間条件の人間確認を要求します。', matchedRuleIds: [ruleId] };
  return { status: 'PASS', message: '正式Runtimeの基本寸法条件に適合しています。', matchedRuleIds: [ruleId] };
}

function installationVisibility(model, selection, visible, required) {
  if (selection.room_specification === 'bathroom') { visible.add('bathroom_installation_type'); required.add('bathroom_installation_type'); }
  if (selection.frame_installation_mode === 'frame_projection') { visible.add('frame_projection'); required.add('frame_projection'); }
  if (selection.extension_frame_type === 'fukashi_60') { visible.add('extension_frame_reinforcement'); required.add('extension_frame_reinforcement'); }
  for (const input of model.sizeInstallation.installation_input_contract.raw_inputs ?? []) {
    const expr = input.required_when ?? '';
    const [field] = expr.split(/\s+/);
    let matches = false;
    const inMatch = /^(\w+) in \[([^\]]+)\]/.exec(expr);
    const eqMatch = /^(\w+) == (\w+)/.exec(expr);
    const neqMatch = /^(\w+) != (\w+)/.exec(expr);
    if (inMatch) matches = inMatch[2].split(',').map((x) => x.trim()).includes(String(selection[inMatch[1]]));
    else if (eqMatch) matches = same(selection[eqMatch[1]], eqMatch[2]);
    else if (neqMatch) matches = has(selection[neqMatch[1]]) && !same(selection[neqMatch[1]], neqMatch[2]);
    if (expr.includes(' AND ')) {
      const clauses = expr.split(' AND ');
      matches = clauses.every((clause) => {
        const eq = /^(\w+) == (\w+)/.exec(clause); const inn = /^(\w+) in \[([^\]]+)\]/.exec(clause);
        return eq ? same(selection[eq[1]], eq[2]) : inn ? inn[2].split(',').map((x) => x.trim()).includes(String(selection[inn[1]])) : false;
      });
    }
    if (matches && model.fieldByName.has(input.field_name)) { visible.add(input.field_name); required.add(input.field_name); }
    void field;
  }
}

function buildState(model, input = {}) {
  const selection = { ...input, size_mode: model.sizeInstallation.size_selection_contract.fixed_value };
  const cleared = [], errors = [], notices = [], exceptions = [], derived = {};
  const visitedSelections = new Set();
  let final = null;
  for (let iteration = 0; iteration < 32; iteration += 1) {
    for (const key of Object.keys(derived)) delete derived[key];
    const before = JSON.stringify(selection);
    const visible = new Set(), required = new Set(), allowed = new Map();
    for (const def of model.fields) allowed.set(def.field_name, baseAllowed(model, def.field_name));
    visible.add('size_mode'); derived.size_mode = selection.size_mode;
    const nodeCandidates = configureNodeAxes(model, selection, visible, required, allowed);
    const node = nodeCandidates.length === 1 ? nodeCandidates[0] : null;
    if (node) {
      derived.node_id = node.node_id;
      configureDetailFields(model, matrixFor(model, node.node_id), visible, required);
      configureGlass(model, node.node_id, selection, visible, required, allowed, derived);
      installationVisibility(model, selection, visible, required);
      visible.add('frame_color'); required.add('frame_color');
      visible.add('size_w'); visible.add('size_h'); required.add('size_w'); required.add('size_h');
    }
    applyRules(model, selection, visible, required, allowed, derived, notices, exceptions, errors);
    for (const def of model.fields) {
      const field = def.field_name;
      if (!has(selection[field]) || field === 'size_mode') continue;
      if (!visible.has(field)) { delete selection[field]; cleared.push({ field, reason: 'NOT_APPLICABLE' }); continue; }
      if (def.data_type === 'enum' && !(allowed.get(field) ?? []).some((value) => same(value, selection[field]))) {
        const removed = selection[field]; delete selection[field]; cleared.push({ field, reason: 'DEPENDENCY', removed });
        errors.push({ code: 'SELECTION_INCOMPATIBLE', field, value: removed });
      }
    }
    for (const [field, value] of Object.entries(derived)) if (model.fieldByName.has(field) && !has(selection[field])) selection[field] = value;
    final = { visible, required, allowed, node, derived };
    const after = JSON.stringify(selection);
    if (before === after) break;
    if (visitedSelections.has(after)) fail('RUNTIME_RESOLUTION_CYCLE', 'Runtime resolution entered a deterministic selection cycle');
    visitedSelections.add(before);
    if (iteration === 31) fail('RUNTIME_RESOLUTION_LOOP', 'Runtime resolution exceeded 32 deterministic iterations');
  }
  const { visible, required, allowed, node } = final;
  const dimension = node ? evaluateBaseSize(model, node.node_id, selection) : { status: 'PENDING', message: '商品構成を選択してください。', matchedRuleIds: [] };
  const manualWarnings = [];
  const gsc = final.derived.glass_size_constraint_group;
  const manualRoute = model.judgment.manual_check_routes?.find((row) => row.gsc_id === gsc);
  if (manualRoute) {
    exceptions.push({ status: 'MANUAL_CHECK', ruleId: manualRoute.id });
    manualWarnings.push(`要確認理由: 正式サイズ範囲が未確定 / 該当Rule: ${manualRoute.id} (${gsc}) / 確認先: メーカー見積`);
  }
  for (const exception of exceptions) {
    if (exception.status === 'SPECIAL_CHECK_REQUIRED') manualWarnings.push(`要確認理由: 特殊ガラス成立確認 / 該当Rule: ${exception.ruleId} / 確認先: メーカー`);
    if (exception.status === 'MANUAL_CHECK_REQUIRED') manualWarnings.push(`要確認理由: 施工条件未確認 / 該当Rule: ${exception.ruleId} / 確認先: 現場・メーカー`);
  }
  const fields = {};
  for (const def of model.fields) {
    const value = selection[def.field_name] ?? null;
    fields[def.field_name] = {
      value,
      state: has(value) ? (def.selection_mode === 'FIXED' || def.show_read_only || def.field_name in derived ? 'RESOLVED' : 'SELECTED') : 'UNSET',
      visibility: visible.has(def.field_name) ? 'SHOW' : 'HIDE',
      required: required.has(def.field_name), allowed_values: allowed.get(def.field_name) ?? null,
      readOnly: def.selection_mode === 'FIXED' || def.show_read_only || def.field_name in derived,
      display_label: def.display_label, unit: def.unit,
    };
  }
  const missing = [...required].filter((field) => !has(selection[field]));
  let status = errors.length ? 'INVALID' : missing.length ? 'PENDING' : dimension.status === 'BLOCK' ? 'BLOCKED' : dimension.status === 'REVIEW_REQUIRED' ? 'MANUAL_CHECK' : 'VALID';
  if (!errors.length && exceptions.some((row) => ['MANUAL_CHECK', 'MANUAL_CHECK_REQUIRED', 'SPECIAL_CHECK_REQUIRED'].includes(row.status))) status = 'MANUAL_CHECK';
  return {
    fields, warnings: notices, manual_warnings: manualWarnings, errors,
    missing_required_fields: missing, status, cleared_fields: unique(cleared),
    derived_entities: [], derived_components: [], derived_options: [], option_code_results: [], option_code_linkage_count: 0,
    matched_invalid_rules: [], dimension_result: dimension, order_ready: false,
  };
}

export function adaptUchirimoTabularV1(runtimePackage) {
  const master = buildModel(runtimePackage);
  return Object.freeze({ master, resolver: (selection) => buildState(master, selection) });
}
