"""Compile declared, evidence-bound native tables into the existing Catalog DSL.

No runtime selection engine lives here. Each map is an intersection of explicit
native row tuples; unavailable and unrecognized states never become choices.
"""
import argparse
import hashlib
import json
from pathlib import Path


def source_identity(master):
    return dict(product_id=master['metadata']['canonical_product_id'], revision=master['metadata']['package_version'])


def parity_count(master, profile):
    return sum(len(f.get('joins', [])) for f in profile['fields'])


def load_adopted_master(profile, root):
    source = root / profile['source']['path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == profile['source']['sha256'], 'SOURCE_BYTES_CHANGED'
    master = json.loads(source.read_bytes())
    assert master['metadata']['formal_pass'] is True and master['metadata']['status'] == 'FORMAL_PASS', 'ADOPTED_MASTER_REQUIRED'
    assert master['metadata']['canonical_product_id'] == profile['source']['product_id'], 'PRODUCT_IDENTITY'
    assert master['metadata']['package_version'] == profile['source']['revision'], 'REVISION_IDENTITY'
    return master


def compile_profile(profile, root):
    source = root / profile['source']['path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == profile['source']['sha256'], 'SOURCE_BYTES_CHANGED'
    master = load_adopted_master(profile, root)
    assert master['metadata']['formal_pass'] is True and master['metadata']['status'] == 'FORMAL_PASS', 'ADOPTED_MASTER_REQUIRED'
    assert master['metadata']['canonical_product_id'] == profile['source']['product_id'], 'PRODUCT_IDENTITY'
    assert master['metadata']['package_version'] == profile['source']['revision'], 'REVISION_IDENTITY'
    tables = {**master['masters'], **master['maps']}
    pid = profile['product']['id']
    module = dict(product=profile['product'], **{k: [] for k in ('specificationDefinitions', 'allowedValues', 'requiredFieldRules', 'ruleSets', 'dependencies', 'evidence')})
    for order, f in enumerate(profile['fields']):
        key = f['key']
        joins = f.get('joins', [])
        parents = list(dict.fromkeys(f.get('parents', []) + [k for j in joins for k in j['parents']]))
        definition = dict(id=pid+':field:'+key, productId=pid, key=key, displayLabel=f['label'], dataType=f.get('dataType', 'ENUM'),
                          status='ACTIVE', displayOrder=order, selector=f.get('when', {}), parentFields=parents,
                          autoSelectSingle=f.get('autoSelectSingle', False), helpText=f.get('helpText', ''),
                          evidenceIds=f.get('evidenceIds', []))
        for prop in ('unit', 'step', 'uiHidden', 'internal', 'technical', 'clearOnParentChange', 'defaultValue', 'requestField', 'presentationWhen'):
            if prop in f: definition[prop] = f[prop]
        module['specificationDefinitions'].append(definition)
        if f.get('required'):
            module['requiredFieldRules'].append(dict(id=pid+':required:'+key, productId=pid, specificationKey=key, required=True, selector=f.get('when', {})))
        if f.get('table'):
            rows = tables[f['table']]
            choices = []
            for row in rows:
                if not all(row.get(k) in allowed for k, allowed in f.get('row_filter', {}).items()): continue
                value, label = row[f['value']], str(row[f['label_column']])
                if f.get('show_official_code'): label += '（'+str(value)+'）'
                if value not in [r['value'] for r in choices]: choices.append(dict(value=value, label=label, evidence=[f['table']]))
        else:
            choices = f.get('choices', [])
        for i, choice in enumerate(choices):
            conditions = [choice.get('selector', {})]
            for join in joins:
                covered = [row for row in tables[join['table']] if row[join['value_column']] == choice['value']]
                if not covered and join.get('coverage') == 'PARTIAL': continue
                matches = [row for row in tables[join['table']] if row[join['value_column']] == choice['value']
                           and row.get(join.get('status_column', 'availability')) in join['admitted_states']]
                tuples = list({json.dumps({field: row[column] for field, column in join['parents'].items()}, sort_keys=True):
                               {field: row[column] for field, column in join['parents'].items()} for row in matches}.values())
                # The authoritative map must contain the candidate and complete parent context.
                conditions.append({'any': tuples})
            module['allowedValues'].append(dict(id=pid+':value:'+key+':'+str(i), productId=pid, specificationKey=key,
                value=choice['value'], displayLabel=choice['label'], displayOrder=i, status='ACTIVE',
                selector={'all': conditions}, evidenceIds=list(dict.fromkeys(choice.get('evidence', []) + [j['table'] for j in joins]))))
    module['ruleSets'].append(dict(id=pid+':validation', productId=pid, type='SELECTION_VALIDATION', status='ACTIVE',
                                  payload=dict(rejectUnknownFields=True, rejectDiscardedSelection=True, rules=profile['rules'], numbers=profile.get('numbers', []))))
    for request in profile['confirmation_requests']:
        assert request['automatic_resolution'] is False, 'AUTOMATIC_CONFIRMATION_REFUSED'
        module['dependencies'].append(dict(id=pid+':'+request['id'], productId=pid, mode='MANUAL_CHECK', when=request.get('when', {}),
                                          message=request['question'], metadata=request))
    module['evidence'] = [dict(id=name, productId=pid, table=name, source_identity=profile['source']) for name in tables]
    module['evidence'] += [dict(e, id=e['evidence_id'], productId=pid) for e in master['evidence_registry']]
    return dict(schema='PRODUCT_MODULE_CANDIDATE_V1', candidate_revision=profile['candidate_revision'], baseline=profile['source'],
                scope=profile['scope'], product_module=module, formal_adoption=False, source_adoption=False,
                selection_views=profile.get('selection_views', []),
                sales_handoff=profile['sales_handoff'], fixed_handoff_facts=profile['fixed_handoff_facts'],
                pricing=dict(price=None, bom=None, set_code=None), projection_schema=profile['schema'])


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for name in ('profile', 'root', 'out'): p.add_argument('--'+name, required=True)
    a = p.parse_args()
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(compile_profile(json.loads(Path(a.profile).read_bytes()), Path(a.root)), ensure_ascii=False, separators=(',', ':'))+'\n')
