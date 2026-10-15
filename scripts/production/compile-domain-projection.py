"""Project a fixed standard Product Master into the existing Catalog contract.

This is a schema adapter, not a product resolver. Conditions become existing
Catalog selectors; the common resolver remains responsible for selection.
Authoring bytes and manufacturer facts are never changed by this projection.
"""
import argparse
import hashlib
import json
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
    key, op, value = condition['field'], condition['op'], condition['value']
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


def compile_profile(profile, root):
    source = root / profile['source']['path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == profile['source']['sha256'], 'SOURCE_BYTES_CHANGED'
    master = json.loads(source.read_bytes())
    assert master['schema_version'] == '1.0' and master['lifecycle_status'] == 'FORMAL', 'ADOPTED_MASTER_REQUIRED'
    assert master['product']['product_id'] == profile['source']['product_id'], 'PRODUCT_IDENTITY'
    assert master['product']['revision'] == profile['source']['revision'], 'REVISION_IDENTITY'
    fields = {f['field_id']: f for f in master['fields']}
    assert len(fields) == len(master['fields']) and set(fields) == set(profile['fields']), 'FIELD_SCOPE_CHANGED'
    pid = profile['product']['id']
    module = {'product': profile['product'], **{k: [] for k in
              ('specificationDefinitions', 'allowedValues', 'requiredFieldRules', 'ruleSets', 'dependencies', 'evidence')}}
    hidden = {k for v in profile.get('selection_views', []) for k in v['source_fields']}
    for index, (key, f) in enumerate(fields.items()):
        assert f['roles']['sales_input'] and f['knowledge_status'] == 'KNOWN', 'UNREVIEWED_FIELD'
        assert all(r['action'] == 'REEVALUATE' for r in f['reset_condition']), 'UNSUPPORTED_RESET'
        opts = f['selectable_values']
        numeric = bool(opts) and all(type(o['value']) in (int, float) for o in opts)
        assert f['data_type'] in ('enum', 'multi_enum'), 'UNSUPPORTED_DOMAIN_TYPE'
        definition = dict(id=pid + ':field:' + key, productId=pid, key=key, displayLabel=f['label'],
                          dataType='MULTI_ENUM' if f['data_type'] == 'multi_enum' else 'ENUM',
                          displayOrder=index, status='ACTIVE', selector=selector(f['visibility_condition']),
                          parentFields=f['dependency'], autoSelectSingle=False,
                          evidenceIds=f['evidence_id'], helpText=f['notes'], uiHidden=key in hidden)
        if numeric:
            # Keep ENUM membership in the resolver, with number-input presentation.
            definition.update(uiControl='NUMBER', unit=f['unit'], step=1)
        module['specificationDefinitions'].append(definition)
        if f['required']:
            module['requiredFieldRules'].append(dict(id=pid + ':required:' + key, productId=pid,
                specificationKey=key, required=True, selector={'all': [selector(f['visibility_condition']), selector(f['required_when'])]}))
        for i, o in enumerate(opts):
            module['allowedValues'].append(dict(id=pid + ':value:' + key + ':' + str(i), productId=pid,
                specificationKey=key, value=o['value'], displayLabel=o['label'], displayOrder=i,
                selector=selector(o['when']), status='ACTIVE', evidenceIds=o['evidence_ids']))
    rules = []
    for c in master['constraints']:
        assert c['kind'] == 'FORBID', 'UNSUPPORTED_CONSTRAINT'
        rules.append(dict(id=c['rule_id'], when=selector(c['when']), fields=c['field_ids'],
                          message='選択した条件は適用範囲外です。仕様・現場条件を見直してください。', evidenceIds=c['evidence_ids']))
    module['ruleSets'].append(dict(id=pid + ':selection-validation', productId=pid, type='SELECTION_VALIDATION',
        status='ACTIVE', payload={'rejectUnknownFields': True, 'rules': rules, 'numbers': profile.get('request_fields', [])}))
    for field in profile.get('request_fields', []):
        key=field['key']; assert key not in fields and field['role']=='SALES_REQUEST_COUNT', 'REQUEST_FIELD_SCOPE'
        module['specificationDefinitions'].append(dict(id=pid + ':field:' + key, productId=pid, key=key,
            displayLabel=field['label'], dataType='NUMBER', displayOrder=len(fields)+1, status='ACTIVE',
            selector={}, parentFields=[], autoSelectSingle=False, unit=field['unit'], step=1, requestField=True))
        module['requiredFieldRules'].append(dict(id=pid + ':required:' + key, productId=pid,
            specificationKey=key, required=True, selector={}))
    for view in profile.get('selection_views', []):
        key = view['key']; assert key not in fields and set(view['source_fields']) <= set(fields), 'VIEW_SCOPE'
        module['specificationDefinitions'].append(dict(id=pid + ':field:' + key, productId=pid, key=key,
            displayLabel=view['label'], dataType='ENUM', displayOrder=len(fields), status='ACTIVE',
            selector={}, parentFields=view['parents'], autoSelectSingle=False))
        module['requiredFieldRules'].append(dict(id=pid + ':required:' + key, productId=pid,
            specificationKey=key, required=True, selector={}))
        for i, choice in enumerate(view['choices']):
            assigned = choice['assign']; assert set(assigned) == set(view['source_fields']), 'INCOMPLETE_VIEW'
            conditions = []
            evidence = set()
            for source_key, value in assigned.items():
                f = fields[source_key]
                matches = [o for o in f['selectable_values'] if type(o['value']) is type(value) and o['value'] == value]
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
        selection_views=profile.get('selection_views', []), formal_adoption=False, source_adoption=False,
        sales_handoff=profile.get('sales_handoff'), fixed_handoff_facts=profile.get('fixed_handoff_facts', []),
        pricing={'price': None, 'bom': None, 'set_code': None})


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for key in ('profile', 'root', 'out'): p.add_argument('--' + key, required=True)
    a = p.parse_args()
    Path(a.out).write_text(json.dumps(compile_profile(json.loads(Path(a.profile).read_bytes()), Path(a.root)), ensure_ascii=False, separators=(',', ':')) + '\n')
