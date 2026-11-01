// Native row-table format projection. Execution stays in the existing engines.
import {evaluateConfiguration, applySelection} from './generic-rule-engine.mjs';
import {evaluateCondition} from './runtime-condition.mjs';
import {evaluateDimension} from '../dimension-resolver.mjs';
import {selectorMatches} from '../selector.mjs';

const present = v => v !== null && v !== undefined && v !== '';
const unique = values => [...new Set(values)];
const fail = message => { throw new Error(`ROW_TABLE_PROJECTION: ${message}`); };
const parsed = (row, key) => JSON.parse(row[key]);
const hasValue = field => ({all:[{field, operator:'NEQ', value:null}, {field, operator:'NEQ', value:''}]});
const both = (...all) => ({all});

export function normalizeRowCondition(source) {
  if (Array.isArray(source.all)) return {all:source.all.map(normalizeRowCondition)};
  if (Array.isArray(source.any)) return {any:source.any.map(normalizeRowCondition)};
  const names = {eq:'EQ', ne:'NEQ', neq:'NEQ', in:'IN', not_in:'NOT_IN', gt:'GT', gte:'GTE', lt:'LT', lte:'LTE'};
  if (source.operator === 'exists' && source.value === true) return hasValue(source.field);
  if (!names[source.operator]) fail(`unsupported condition ${source.operator}`);
  return {field:source.field, operator:names[source.operator],
    ...(['in','not_in'].includes(source.operator) ? {values:source.value} : {value:source.value})};
}

function geometry(row, policy) {
  const selector = {};
  for (const [field,column] of Object.entries(policy.dimension_selector_map)) if (present(row[column])) selector[field] = row[column];
  const bounds = {minW:row.width_min, maxW:row.width_max, minH:row.height_min, maxH:row.height_max};
  const base = {id:row.custom_size_region_id, selector, bounds, source:row, evidence_refs:row.evidence_refs};
  if (row.region_availability === 'MANUAL_CONFIRMATION_REQUIRED' || row.boundary_type === 'source_graph') {
    return {...base, type:'SOURCE_GRAPH_GATE'};
  }
  if (row.region_availability !== 'AVAILABLE') fail(`unsupported region state ${row.region_availability}`);
  if (row.boundary_type === 'rectangle') return {...base, type:'AUTO_RECT'};
  if (row.boundary_type === 'polygon') {
    const points = parsed(row, 'vertices_json');
    if (!Array.isArray(points) || points.length < 3 || !points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) fail('invalid polygon');
    return {...base, type:'AUTO_POLYGON', points};
  }
  if (row.boundary_type !== 'formula') fail(`unsupported boundary ${row.boundary_type}`);
  const formula = row.boundary_formula;
  let match = /^H<=min\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\*W\)$/.exec(formula);
  if (match) return {...base, type:'AUTO_RATIO', ratio:Number(match[2]), bounds:{...bounds, maxH:Math.min(bounds.maxH, Number(match[1]))}};
  match = /^H\/W<=(\d+(?:\.\d+)?)$/.exec(formula);
  if (match) return {...base, type:'AUTO_RATIO', ratio:Number(match[1])};
  match = /^H<=(\d+(?:\.\d+)?)$/.exec(formula);
  if (match) return {...base, type:'AUTO_RECT', bounds:{...bounds, maxH:Math.min(bounds.maxH, Number(match[1]))}};
  match = /^([a-z_]+)=([a-zA-Z0-9_]+)(; custom only)?$/.exec(formula);
  if (match && policy.dimension_selector_fields.includes(match[1])) return {...base, type:'AUTO_RECT', selector:{...selector, [match[1]]:match[2]}, custom_only:Boolean(match[3])};
  fail(`unparsed formula ${formula}`);
}

export function projectRowTableMaster(source, policy) {
  const document = structuredClone(source);
  const series = document.series_master;
  if (series.length !== 1 || series[0].series_id !== policy.source_series_id) fail('source series identity');
  const identity = series[0];
  const fields = document.field_master.map(r => ({field_name:r.field_name, display_label:r.display_name,
    display_order:r.sort_order, data_type:r.value_type === 'integer' ? 'number' : r.selection_type === 'multi_select' ? 'array' : 'enum',
    required_mode:r.default_required ? 'REQUIRED' : 'OPTIONAL', selection_mode:'USER_SELECTABLE',
    visibility_mode:r.default_visibility ? 'VISIBLE' : 'HIDDEN', parent_fields:[], source:r}));
  const byName = new Map(fields.map(f => [f.field_name, f]));
  if (byName.size !== fields.length) fail('duplicate field');
  const values = [], labelsMissing = [], seen = new Set();
  const add = (field, value, label, sourceRow) => {
    if (!byName.has(field) || !present(value) || value === 'NOT_APPLICABLE' || !['enum','array'].includes(byName.get(field).data_type)) return;
    const key = JSON.stringify([field,value]);
    if (seen.has(key)) return;
    seen.add(key);
    if (!present(label)) labelsMissing.push({field, value});
    values.push({field_name:field, canonical_value:value, display_label:label ?? null, status:'CURRENT', source:sourceRow});
  };
  for (const r of document.option_value_master) if (r.is_active) add(r.field_name, r.canonical_value, r.display_name, r);
  for (const spec of policy.value_sources) for (const r of document[spec.table]) {
    if (r.is_active === false) continue;
    add(spec.field, r[spec.value], spec.label ? r[spec.label] : null, r);
  }
  for (const [field, column] of Object.entries(policy.fixed_identity)) {
    if (!byName.has(field) || !present(identity[column])) fail(`identity field ${field}`);
    Object.assign(byName.get(field), {selection_mode:'FIXED', default_value:identity[column], visibility_mode:'HIDDEN'});
    add(field, identity[column], null, identity);
  }
  const master = {fields, values, designs:[], dependency_rules:[], auto_resolve_rules:[], visibility_rules:[], invalid_rules:[],
    schemas:{configuration:{properties:Object.fromEntries(fields.map(f => [f.field_name,{}]))}},
    component_sets:{component_sets:[]}, migration_aliases:{field_aliases:{},value_aliases:{}}};
  const sourceRule = new Map(), manual = [], reset = [];
  const reasonIds = new Set(document.reason_code_master.map(r => r.reason_code));
  for (const code of Object.values(policy.reason_bindings ?? {})) if (!reasonIds.has(code)) fail(`unknown reason binding ${code}`);
  const rule = (r, conditions, effects) => ({rule_id:r.dependency_rule_id ?? r.presentation_rule_id ?? r.size_availability_id,
    conditions, effects, priority:Number(r.priority ?? 0), source:r});
  const invalid = (r, conditions) => { const out = rule(r, conditions, []); master.invalid_rules.push(out);
    sourceRule.set(out.rule_id, {...r, reason_code:r.reason_code || policy.reason_bindings?.[out.rule_id]}); };
  const ensureField = name => { if (!byName.has(name)) fail(`unknown target ${name}`); };
  for (const r of document.dependency_rule_master) {
    if (!r.is_active) continue;
    const conditions = normalizeRowCondition(parsed(r, 'condition_json')), result = parsed(r, 'result_json');
    const field = result.target_field, action = result.action, nativeValues = result.values;
    if (action === 'clear_value') {
      // VALUE_RESET is an upstream-change event, never an always-on rule.
      const parents = parsed(r, 'condition_json').all ?? [];
      if (field !== '*' || parents.length !== 1 || parents[0].operator !== 'exists') fail('unsupported reset shape');
      ensureField(parents[0].field);
      for (const target of nativeValues) { ensureField(target); byName.get(target).parent_fields.push(parents[0].field); }
      reset.push(r); continue;
    }
    ensureField(field);
    for (const value of nativeValues) add(field, value, null, r);
    let effects;
    if (action === 'allow_only') effects = [{action:'ALLOW_VALUES', field, values:nativeValues}];
    else if (action === 'exclude') effects = [{action:'DENY_VALUES', field, values:nativeValues}];
    else if (action === 'set_required') effects = [{action:'REQUIRE_FIELD', field}];
    else if (action === 'set_not_applicable') {
      invalid(r, both(conditions, hasValue(field), {field, operator:'NEQ', value:'NOT_APPLICABLE'}));
      effects = [{action:'SET_STATE', field, state:'NOT_APPLICABLE'}];
    } else if (action === 'set_value') {
      if (nativeValues.length !== 1) fail('ambiguous assigned value');
      effects = [{action:'SET_VALUE', field, value:nativeValues[0]}];
      invalid({...r, dependency_rule_id:r.dependency_rule_id+':conflict'}, both(conditions, hasValue(field), {field,operator:'NEQ',value:nativeValues[0]}));
    } else if (action === 'set_invalid') { invalid(r, conditions); continue; }
    else if (action === 'require_manual_confirmation') { manual.push({row:r, conditions}); continue; }
    else fail(`unsupported action ${action}`);
    master.dependency_rules.push(rule(r, conditions, effects));
  }
  // Required and visible fields come directly from the original window bundle.
  for (const bundle of document.rule_bundle_master) for (const field of parsed(bundle,'required_fields_json')) {
    ensureField(field);
    master.dependency_rules.push({rule_id:bundle.bundle_id+':required:'+field, priority:0,
      conditions:{field:'window_type',operator:'EQ',value:bundle.window_type_id}, effects:[{action:'REQUIRE_FIELD',field}],source:bundle});
  }
  for (const r of document.field_presentation_rule_master) {
    ensureField(r.target_field);
    if (typeof r.visibility !== 'boolean' || typeof r.required !== 'boolean' || typeof r.selectable !== 'boolean') fail('presentation flags');
    const effects = [{action:r.visibility ? 'SHOW_FIELD' : 'HIDE_FIELD', field:r.target_field}];
    if (r.required) effects.push({action:'REQUIRE_FIELD',field:r.target_field});
    master.visibility_rules.push(rule(r, normalizeRowCondition(parsed(r,'condition_json')), effects));
    // Assignments are already represented by the original dependency rules;
    // retained presentation values are verified during the native producer QA.
  }
  for (const r of document.size_availability_master) {
    ensureField(r.target_field);
    const conditions = both({field:'window_type',operator:'EQ',value:r.window_type_id},
      {field:r.target_field,operator:'EQ',value:r.target_value}, normalizeRowCondition(parsed(r,'condition_json')));
    if (r.availability === 'INVALID') invalid(r, conditions);
    else if (['MANUAL_CONFIRMATION_REQUIRED','WARNING'].includes(r.availability)) manual.push({row:r, conditions});
    else fail(`unsupported availability ${r.availability}`);
  }
  for (const f of fields) f.parent_fields = unique(f.parent_fields);
  const dimensional = document.custom_size_region_master.map(r => geometry(r,policy));
  const dimensionCatalog = {products:[],allowedValues:[],ruleSets:[{productId:policy.source_series_id,type:'DIMENSION_RULES',status:'ACTIVE',payload:dimensional}]};
  return {schema:'NATIVE_ROW_TABLE_RUNTIME_PROJECTION_CANDIDATE_V1', document, policy, master, manual, reset, sourceRule,
    dimensionCatalog, dimensional, labelsMissing, formal_mutation:false, product_qa_ready:false};
}

export function evaluateRowTableProjection(projection, input = {}) {
  const {master,document,policy} = projection;
  const inputIssues = [];
  const normalizedInput = {...input};
  const fields = new Map(master.fields.map(f => [f.field_name,f]));
  for (const [field,value] of Object.entries(input)) {
    const definition = fields.get(field);
    if (!definition) {inputIssues.push({field,code:'UNKNOWN_INPUT_FIELD'});continue;}
    if (definition.selection_mode === 'FIXED') {
      if (!Object.is(value,definition.default_value)) inputIssues.push({field,code:'FIXED_IDENTITY_CONFLICT',supplied_value:value});
      // The shared hydrator accepts caller nulls. Keep the native identity at
      // this input boundary and reject the conflict without changing the engine.
      normalizedInput[field] = definition.default_value;
      continue;
    }
    if (value === null || value === undefined || value === '') continue;
    if (definition.data_type === 'number' && !Number.isSafeInteger(value)) inputIssues.push({field,code:'INTEGER_REQUIRED'});
    if (definition.data_type === 'array') {
      const domain = master.values.filter(r => r.field_name === field).map(r => r.canonical_value);
      if (!Array.isArray(value) || value.some(v => !domain.includes(v))) inputIssues.push({field,code:'UNSOURCED_MULTI_SELECT_VALUE'});
    }
  }
  let state = evaluateConfiguration(master,normalizedInput);
  const values = Object.fromEntries(Object.entries(state.fields).map(([k,v]) => [k,v.value]));
  // N/A is retained as a source selector for geometry, never a UI choice.
  for (const r of document.dependency_rule_master) if (r.is_active) {
    const action = parsed(r,'result_json');
    if (action.action === 'set_not_applicable' && evaluateCondition(normalizeRowCondition(parsed(r,'condition_json')),state)) values[action.target_field] = 'NOT_APPLICABLE';
  }
  let standardRows = [];
  if (present(values.size_code)) {
    standardRows = document.size_master.filter(row => {
      const selector = Object.fromEntries(Object.entries(policy.dimension_selector_map)
        .filter(([,column]) => present(row[column])).map(([field,column]) => [field,row[column]]));
      return row.size_code === values.size_code && selectorMatches(selector,values);
    });
    if (!standardRows.length) inputIssues.push({field:'size_code',code:'STANDARD_SIZE_SCOPE_MISMATCH'});
    const dimensions = unique(standardRows.map(r => JSON.stringify([r.width,r.height])));
    if (dimensions.length > 1) inputIssues.push({field:'size_code',code:'STANDARD_SIZE_AMBIGUOUS'});
    if (dimensions.length === 1) {
      const [w,h] = JSON.parse(dimensions[0]);
      if ((present(input.width) && input.width !== w) || (present(input.height) && input.height !== h)) {
        inputIssues.push({field:'size_code',code:'STANDARD_DIMENSION_MISMATCH'});
      } else {
        const derived = {...normalizedInput,width:w,height:h};
        state = evaluateConfiguration(master,derived);
        values.width = w;values.height = h;
      }
    }
  }
  const width = values.width, height = values.height;
  const numeric = typeof width === 'number' && Number.isFinite(width) && typeof height === 'number' && Number.isFinite(height);
  let dimension = numeric ? evaluateDimension(projection.dimensionCatalog,policy.source_series_id,
    {...values,size_mode:'CUSTOM',custom_width:width,custom_height:height}) : {status:'PENDING',matchedRuleIds:[]};
  if (standardRows.length && !inputIssues.some(i => i.field === 'size_code')) {
    const verified = standardRows.every(r => r.standard_size_status === 'AVAILABLE' && r.verification_status === 'VERIFIED_OFFICIAL');
    dimension = {status:verified ? 'PASS' : 'REVIEW_REQUIRED',matchedRuleIds:standardRows.map(r => r.size_master_id),ruleTypes:['SOURCE_STANDARD_SIZE_ROW']};
  }
  const matchedManual = projection.manual.filter(r => evaluateCondition(r.conditions,state));
  const matchedInvalid = unique(state.matched_invalid_rules);
  const explicitInvalidReasons = matchedInvalid.map(id => projection.sourceRule.get(id)?.reason_code).filter(present);
  const manualReasons = matchedManual.map(r => r.row.reason_code).filter(present);
  const dimensionReasons = dimension.status === 'BLOCK' ? [policy.reason_bindings?.dimension_outside].filter(present) : [];
  // The original native cases report a specific source prohibition before the
  // generic outer-range message. Keep every diagnostic separately; no invalid
  // condition, dimension result or automatic-order boundary is removed.
  const reasonCodes = unique([...explicitInvalidReasons,...manualReasons,...(explicitInvalidReasons.length ? [] : dimensionReasons)]);
  const allReasonCodes = unique([...explicitInvalidReasons,...manualReasons,...dimensionReasons]);
  const hardManual = matchedManual.some(r => r.row.availability !== 'WARNING');
  const invalid = inputIssues.length > 0 || matchedInvalid.length > 0 || state.errors.length > 0 || dimension.status === 'BLOCK';
  const constraintStatus = invalid ? 'INVALID' : dimension.status === 'PENDING' ? 'INCOMPLETE' : hardManual || dimension.status === 'REVIEW_REQUIRED' ? 'MANUAL_CONFIRMATION_REQUIRED' : 'VALID';
  return {state,values,dimension,constraint_status:constraintStatus,reason_codes:reasonCodes,all_reason_codes:allReasonCodes,input_issues:inputIssues,
    standard_source_row_ids:standardRows.map(r => r.size_master_id),
    unmapped_invalid_rule_ids:matchedInvalid.filter(id => !projection.sourceRule.get(id)?.reason_code),
    source_invalid_rule_ids:matchedInvalid,source_manual_rule_ids:matchedManual.map(r => r.row.dependency_rule_id ?? r.row.size_availability_id),
    request_complete:state.status === 'VALID' && constraintStatus === 'VALID',
    automatic_orderability:false,formal_adoption:false,product_qa_ready:false};
}

export function applyRowTableSelection(projection, prior, field, value) {
  return applySelection(projection.master,prior,field,value);
}
