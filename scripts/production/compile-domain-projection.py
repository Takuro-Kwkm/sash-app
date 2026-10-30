"""Project a fixed standard Product Master into the existing Catalog contract.

This is a schema adapter, not a product resolver. Conditions become existing
Catalog selectors; the common resolver remains responsible for selection.
Authoring bytes and manufacturer facts are never changed by this projection.
"""
import argparse
import hashlib
import json
from itertools import product
from pathlib import Path


def selector(condition, assigned=None):
    assigned = assigned or {}
    if isinstance(condition, bool):
        return {} if condition else {'any': []}
    if 'all' in condition or 'any' in condition:
        kind = 'all' if 'all' in condition else 'any'
        return {kind: [selector(c, assigned) for c in condition[kind]]}
    if 'not' in condition:
        return {'not': selector(condition['not'], assigned)}
    key, op = condition['field'], condition['op']
    if 'value_expr' in condition:
        expression = condition['value_expr']
        assert set(expression) == {'field'} and op in ('eq', 'ne', 'gte', 'lte'), 'UNSUPPORTED_DOMAIN_EXPRESSION'
        assert key not in assigned and expression['field'] not in assigned, 'DYNAMIC_VIEW_EXPRESSION_REQUIRES_REVIEW'
        return {key: {'$compare': {'operator': op, 'field': expression['field']}}}
    value = condition['value']
    if key in assigned:
        actual = assigned[key]
        checks = {'eq': lambda: actual == value, 'ne': lambda: actual != value,
                  'in': lambda: actual in value, 'exists': lambda: (actual is not None) == value,
                  'gte': lambda: isinstance(actual, (int, float)) and not isinstance(actual, bool) and actual >= value,
                  'lte': lambda: isinstance(actual, (int, float)) and not isinstance(actual, bool) and actual <= value}
        if op not in checks:
            raise ValueError('UNSUPPORTED_DOMAIN_OPERATOR:' + op)
        return selector(checks[op]())
    if op == 'eq':
        return {key: value}
    if op == 'ne':
        # Domain `ne` also matches an absent value. Catalog $ne alone does not.
        return {'not': {key: value}}
    if op not in ('in', 'exists', 'gte', 'lte'):
        raise ValueError('UNSUPPORTED_DOMAIN_OPERATOR:' + op)
    return {key: {'$' + op: value}}


def load_adopted_master(profile, root):
    source = root / profile['source']['path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == profile['source']['sha256'], 'SOURCE_BYTES_CHANGED'
    master = json.loads(source.read_bytes())
    if profile.get('adopted_snapshot_manifest'):
        receipt = profile['adopted_snapshot_manifest']
        manifest_bytes = (root / receipt['path']).read_bytes()
        assert hashlib.sha256(manifest_bytes).hexdigest() == receipt['sha256'], 'FORMAL_MANIFEST_CHANGED'
        manifest = json.loads(manifest_bytes)
        assert manifest['formal_state'] == 'ADOPTED_FOR_ADMITTED_STORAGE_TRANSACTION', 'ADOPTED_MASTER_REQUIRED'
        assert manifest['product_master_sha256'] == profile['source']['sha256'], 'ADOPTED_SNAPSHOT_CHANGED'
        assert manifest['product_id'] == master['product']['product_id'] and manifest['approved_packet_sha256'], 'ADOPTED_MASTER_REQUIRED'
        assert manifest['product_master_revision'] == master['product']['revision'], 'REVISION_IDENTITY'
    else:
        assert master['lifecycle_status'] == 'FORMAL', 'ADOPTED_MASTER_REQUIRED'
    assert master['schema_version'] in ('1.0', '1.1'), 'MASTER_SCHEMA_UNSUPPORTED'
    assert master['product']['product_id'] == profile['source']['product_id'], 'PRODUCT_IDENTITY'
    assert master['product']['revision'] == profile['source']['revision'], 'REVISION_IDENTITY'
    return master


def compile_profile(profile, root):
    master = load_adopted_master(profile, root)
    fields = {f['field_id']: f for f in master['fields']}
    assert len(fields) == len(master['fields']) and set(fields) == set(profile['fields']), 'FIELD_SCOPE_CHANGED'
    pid = profile['product']['id']
    module = {'product': profile['product'], **{k: [] for k in
              ('specificationDefinitions', 'allowedValues', 'requiredFieldRules', 'ruleSets', 'dependencies', 'evidence')}}
    if profile.get('input_validation_policy'):
        assert profile['input_validation_policy'] == 'INITIAL_STRICT_PARENT_REEVALUATE_V1', 'INPUT_VALIDATION_POLICY_UNSUPPORTED'
        module['selectionInputPolicy'] = profile['input_validation_policy']
    hidden = {k for v in profile.get('selection_views', []) if 'applicability' not in v for k in v['source_fields']}
    views = []
    for declared in profile.get('selection_views', []):
        view = dict(declared)
        if 'applicability' in view: view['selector'] = selector(view['applicability'])
        if view.get('source_constraint'):
            constraint = next(c for c in master['constraints'] if c['rule_id'] == view['source_constraint'])
            # Enumerate only the finite tuples explicitly admitted by this source rule.
            # Its original selector still owns context and combination validity.
            branches = next(c['not']['any'] for c in constraint['when']['all'] if 'not' in c)
            tuples = set()
            for branch in branches:
                axes = []
                for key in view['source_fields']:
                    axis = next(c for c in branch['all'] if c.get('field') == key)
                    assert axis['op'] == 'in' and all(type(v) in (int, float) for v in axis['value']), 'FINITE_SOURCE_TUPLES_REQUIRED'
                    axes.append(axis['value'])
                tuples.update(product(*axes))
            assert len(view['source_fields']) == 2 and constraint['kind'] == 'FORBID', 'STANDARD_SIZE_SOURCE_REQUIRED'
            view['choices'] = [dict(value='x'.join(map(str, values)),
                label='W ' + str(values[0]) + ' × H ' + str(values[1]) + ' mm',
                assign=dict(zip(view['source_fields'], values))) for values in sorted(tuples)]
        views.append(view)
    for index, (key, f) in enumerate(fields.items()):
        presentation = profile['fields'][key]
        confirmation = presentation.get('role') == 'CONFIRMATION_ONLY'
        request = presentation.get('role') == 'SALES_REQUEST_INPUT'
        evidence_only = presentation.get('role') == 'EVIDENCE_ONLY'
        assert (not evidence_only and f['roles']['sales_input'] and (f['knowledge_status'] == 'KNOWN' or confirmation or request)) or (evidence_only and f['roles']['evidence_only'] and not f['roles']['sales_input'] and f['visibility_condition'] is False), 'UNREVIEWED_FIELD'
        if f['knowledge_status'] != 'KNOWN':
            assert any(key in g['field_ids'] and not g['result_in_scope'] and g['confirmation_in_scope'] for g in master['gaps']), 'UNCONTROLLED_UNKNOWN'
        assert all(r['action'] in ('REEVALUATE','CLEAR') for r in f['reset_condition']), 'UNSUPPORTED_RESET'
        opts = f['selectable_values']
        numeric = bool(opts) and all(type(o['value']) in (int, float) for o in opts)
        assert f['data_type'] in ('enum', 'multi_enum', 'number', 'text', 'boolean'), 'UNSUPPORTED_DOMAIN_TYPE'
        datatype = {'multi_enum':'MULTI_ENUM', 'number':'NUMBER', 'text':'TEXT'}.get(f['data_type'], 'ENUM')
        definition = dict(id=pid + ':field:' + key, productId=pid, key=key, displayLabel=f['label'],
                          dataType=datatype,
                          displayOrder=index, status='ACTIVE', selector=selector(f['visibility_condition']),
                          parentFields=f['dependency'], autoSelectSingle=False,
                          evidenceIds=f['evidence_id'], helpText=f['notes'], uiHidden=key in hidden or confirmation or evidence_only)
        if presentation.get('user_selectable') is True: definition['userSelectable'] = True
        if 'presentation_when' in presentation: definition['presentationWhen'] = selector(presentation['presentation_when'])
        if 'input_when' in presentation:
            definition['selector'] = {'all': [definition['selector'], selector(presentation['input_when'])]}
        if presentation.get('additional_parents'):
            definition['parentFields'] = list(dict.fromkeys(definition['parentFields'] + presentation['additional_parents']))
        if presentation.get('auto_select_single'): definition['autoSelectSingle'] = True
        if datatype == 'NUMBER':
            definition.update(unit=f['unit'], step=presentation.get('step', 1))
        if confirmation or evidence_only: definition.update(internal=True, technical=True)
        clear = [r['on_change'] for r in f['reset_condition'] if r['action'] == 'CLEAR']
        if clear: definition['clearOnParentChange'] = clear
        if presentation.get('clear_on_change'):
            definition['clearOnParentChange'] = list(dict.fromkeys(clear + presentation['clear_on_change']))
        if presentation.get('fixed_single'):
            assert len(opts) == 1, 'FIXED_SINGLE_REQUIRED'
            definition['autoSelectSingle'] = True
        if numeric:
            # Keep ENUM membership in the resolver, with number-input presentation.
            definition.update(uiControl='NUMBER', unit=f['unit'], step=1)
        module['specificationDefinitions'].append(definition)
        if f['required'] and not confirmation and not evidence_only and (f['knowledge_status'] == 'KNOWN' or presentation.get('request_required') is True):
            module['requiredFieldRules'].append(dict(id=pid + ':required:' + key, productId=pid,
                specificationKey=key, required=True, selector={'all': [selector(f['visibility_condition']), selector(f['required_when'])]}))
        if presentation.get('request_required_when'):
            module['requiredFieldRules'].append(dict(id=pid + ':request-required:' + key, productId=pid,
                specificationKey=key, required=True, selector=selector(presentation['request_required_when'])))
        if f['data_type'] == 'boolean':
            opts = [dict(value=v, label='はい' if v else 'いいえ', when=True, evidence_ids=f['evidence_id']) for v in (False, True)]
        for i, o in enumerate(opts):
            value_selector = selector(o['when'])
            if 'value_condition' in f:
                value_selector = {'all': [value_selector, selector(f['value_condition'], {key: o['value']})]}
            module['allowedValues'].append(dict(id=pid + ':value:' + key + ':' + str(i), productId=pid,
                specificationKey=key, value=o['value'], displayLabel=presentation.get('value_labels', {}).get(str(o['value']), o['label']), displayOrder=i,
                selector=value_selector, status='ACTIVE', evidenceIds=o['evidence_ids']))
    rules = []
    for c in master['constraints']:
        assert c['kind'] == 'FORBID', 'UNSUPPORTED_CONSTRAINT'
        rules.append(dict(id=c['rule_id'], when=selector(c['when']), fields=c['field_ids'],
                          message='選択した条件は適用範囲外です。仕様・現場条件を見直してください。', evidenceIds=c['evidence_ids']))
    module['ruleSets'].append(dict(id=pid + ':selection-validation', productId=pid, type='SELECTION_VALIDATION',
        status='ACTIVE', payload={'rejectUnknownFields': True, 'rules': rules, 'numbers': profile.get('request_fields', []) + profile.get('numeric_fields', [])}))
    for field in profile.get('request_fields', []):
        key=field['key']; assert key not in fields and field['role']=='SALES_REQUEST_COUNT', 'REQUEST_FIELD_SCOPE'
        module['specificationDefinitions'].append(dict(id=pid + ':field:' + key, productId=pid, key=key,
            displayLabel=field['label'], dataType='NUMBER', displayOrder=len(fields)+1, status='ACTIVE',
            selector={}, parentFields=[], autoSelectSingle=False, unit=field['unit'], step=1, requestField=True))
        module['requiredFieldRules'].append(dict(id=pid + ':required:' + key, productId=pid,
            specificationKey=key, required=True, selector={}))
    for request in profile.get('request_selectors', []):
        key = request['key']
        assert key not in fields and request['role'] == 'SALES_REQUEST_CHOICE', 'REQUEST_SELECTOR_SCOPE'
        scope = profile['request_scope']
        assert hashlib.sha256((root / scope['path']).read_bytes()).hexdigest() == scope['sha256'], 'REQUEST_SCOPE_CHANGED'
        module['specificationDefinitions'].append(dict(id=pid + ':field:' + key, productId=pid, key=key,
            displayLabel=request['label'], dataType='ENUM', displayOrder=len(fields), status='ACTIVE',
            selector=selector(request['when']), parentFields=request['parents'],
            clearOnParentChange=request.get('clear_on_change', []), autoSelectSingle=False,
            requestField=True, helpText=request['help_text']))
        module['requiredFieldRules'].append(dict(id=pid + ':required:' + key, productId=pid,
            specificationKey=key, required=True, selector=selector(request['when'])))
        for i, choice in enumerate(request['choices']):
            module['allowedValues'].append(dict(id=pid + ':request:' + key + ':' + str(i), productId=pid,
                specificationKey=key, value=choice['value'], displayLabel=choice['label'], displayOrder=i,
                selector={}, status='ACTIVE', evidenceIds=[request['evidence_id']]))
    for view in views:
        key = view['key']; assert key not in fields and set(view['source_fields']) <= set(fields), 'VIEW_SCOPE'
        module['specificationDefinitions'].append(dict(id=pid + ':field:' + key, productId=pid, key=key,
            displayLabel=view['label'], dataType='ENUM', displayOrder=len(fields), status='ACTIVE',
            selector=selector(view.get('applicability', True)), parentFields=view['parents'], autoSelectSingle=False,
            **({'clearOnParentChange': view['clear_on_change']} if view.get('clear_on_change') else {})))
        module['requiredFieldRules'].append(dict(id=pid + ':required:' + key, productId=pid,
            specificationKey=key, required=True, selector=selector(view.get('applicability', True))))
        for i, choice in enumerate(view['choices']):
            assigned = choice['assign']; assert set(assigned) == set(view['source_fields']), 'INCOMPLETE_VIEW'
            conditions = []
            evidence = set()
            for source_key, value in assigned.items():
                f = fields[source_key]
                matches = [o for o in f['selectable_values'] if type(o['value']) is type(value) and o['value'] == value]
                if view.get('source_constraint'):
                    assert f['data_type'] == 'number' and type(value) in (int, float), 'VIEW_NUMERIC_SOURCE_REQUIRED'
                else:
                    assert matches, 'VIEW_VALUE_NOT_IN_MASTER'
                    conditions.append({'any': [selector(o['when'], assigned) for o in matches]})
                conditions.append(selector(f['visibility_condition'], assigned))
                evidence.update(f['evidence_id'])
            for c in master['constraints']:
                if set(c['field_ids']) & set(assigned):
                    conditions.append({'not': selector(c['when'], assigned)})
                    evidence.update(c['evidence_ids'])
            module['allowedValues'].append(dict(id=pid + ':view:' + key + ':' + str(i), productId=pid,
                specificationKey=key, value=choice['value'], displayLabel=choice['label'], displayOrder=i,
                selector={'all': conditions}, status='ACTIVE', evidenceIds=sorted(evidence)))
    for r in profile['confirmation_requests']:
        assert r['automatic_resolution'] is False, 'AUTOMATIC_CONFIRMATION_REFUSED'
        module['dependencies'].append(dict(id=pid + ':' + r['id'], productId=pid, mode='MANUAL_CHECK',
            when=selector(r['condition']), message=r['question'], metadata=r))
    module['evidence'] = [{**e, 'id': pid + ':' + e['evidence_id'], 'productId': pid} for e in master['evidence']]
    return dict(schema='PRODUCT_MODULE_CANDIDATE_V1', candidate_revision=profile['candidate_revision'],
        baseline=profile['source'], scope=profile['scope'], product_module=module,
        selection_views=views, **({'request_selectors': profile['request_selectors']} if profile.get('request_selectors') else {}), formal_adoption=False, source_adoption=False,
        sales_handoff=profile.get('sales_handoff'), fixed_handoff_facts=profile.get('fixed_handoff_facts', []),
        pricing={'price': None, 'bom': None, 'set_code': None})


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for key in ('profile', 'root', 'out'): p.add_argument('--' + key, required=True)
    a = p.parse_args()
    Path(a.out).write_text(json.dumps(compile_profile(json.loads(Path(a.profile).read_bytes()), Path(a.root)), ensure_ascii=False, separators=(',', ':')) + '\n')
