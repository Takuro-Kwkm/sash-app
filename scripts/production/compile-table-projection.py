"""Compile explicit table projections to the existing Catalog contract.

This compiler knows column mappings and Catalog roles, never product identities.
Conditions must already be reviewed selectors in the profile; prose is retained
as manual review evidence rather than interpreted as executable expressions.
"""
import argparse, json, hashlib
from pathlib import Path

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p, d): p.write_text(json.dumps(d, ensure_ascii=False, indent=2)+'\n')

def compile_profile(profile, root):
    source = root / profile['source']['path']
    assert sha(source) == profile['source']['sha256'], 'SOURCE_BYTES_CHANGED'
    doc = json.loads(source.read_text())
    pid = profile['product']['id']
    module = {'product': profile['product'], **{k: [] for k in
        ['specificationDefinitions','allowedValues','requiredFieldRules','ruleSets','dependencies','evidence']}}
    field_keys = set()
    for field in profile['fields']:
        key = field['key']; assert key not in field_keys, 'DUPLICATE_FIELD'; field_keys.add(key)
        definition = {k:v for k,v in field.items() if k not in ['choices','required','source_refs']}
        definition.update(id=pid+':field:'+key, productId=pid, status='ACTIVE')
        module['specificationDefinitions'].append(definition)
        if field.get('required'):
            module['requiredFieldRules'].append({'id':pid+':required:'+key,'productId':pid,
                'specificationKey':key,'required':True,'selector':field.get('selector',{})})
        for i, choice in enumerate(field.get('choices', [])):
            row = {**choice,'id':pid+':value:'+key+':'+str(i),'productId':pid,'specificationKey':key}
            assert row.get('displayLabel') and 'value' in row, 'CHOICE_LABEL_REQUIRED'
            row.setdefault('status','ACTIVE');module['allowedValues'].append(row)
    for k in ['dependencies','ruleSets','evidence']:
        module[k] = [{**v,'productId':pid,'id':pid+':'+k+':'+v['id']} for v in profile.get(k,[])]
    evs = {e['source_id'] for e in module['evidence']}
    for field in profile['fields']:
        for c in field.get('choices',[]):
            assert c.get('evidenceIds'), 'CHOICE_EVIDENCE_REQUIRED'
    assert doc['component_id'] == profile['source']['component_id'], 'COMPONENT_MISMATCH'
    return {'schema':'PRODUCT_MODULE_CANDIDATE_V1','candidate_revision':profile['candidate_revision'],
        'baseline':profile['source'],'scope':profile['scope'],'product_module':module,
        'composition':profile.get('composition'),'numeric_constraints':profile.get('numeric_constraints',[]),
        'linear_transforms':profile.get('linear_transforms',[]),'unsupported_rules':profile.get('unsupported_rules',[]),
        'formal_adoption':False,'source_adoption':False,'pricing':{'price':None,'bom':None,'set_code':None}}

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--profile',required=True);p.add_argument('--root',required=True);p.add_argument('--out',required=True)
    a=p.parse_args();write(Path(a.out),compile_profile(json.loads(Path(a.profile).read_text()),Path(a.root)))
