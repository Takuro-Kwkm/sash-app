"""Field evidence acceptance and promotion; offline, content-bound, no app mutation.

Review records attest human decisions, not cryptographic reviewer authentication.
Repository review controls remain responsible for admitting those records.
"""
import copy
import datetime as dt
import hashlib
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

VERSION = '0.1'
SOURCE_CLASSES = ['OFFICIAL_PRIMARY_SOURCE', 'OFFICIAL_CATALOG', 'OFFICIAL_ORDER_REFERENCE',
                  'OFFICIAL_TECHNICAL_MATERIAL', 'OFFICIAL_PRODUCT_SPECIFICATION', 'OFFICIAL_WEB_SOURCE',
                  'FORMAL_PRODUCT_MASTER', 'FORMAL_REGISTRY', 'AUDITED_MAPPING',
                  'VERIFIED_RUNTIME_BEHAVIOR', 'HUMAN_REVIEWED_OFFICIAL_EVIDENCE', 'CONTRACT_AUTHORITY']
STRONG = SOURCE_CLASSES[:7] + ['HUMAN_REVIEWED_OFFICIAL_EVIDENCE']
CLAIMS = ['SEMANTIC_IDENTITY', 'MAPPING', 'PRODUCT_FACT', 'FIELD_RESPONSIBILITY', 'DERIVATION_AUTHORITY',
          'PRESENTATION', 'DEPENDENCY', 'RULE_CONFORMITY', 'EXCEPTION_REVIEW', 'RUNTIME_PARITY',
          'MEANING_EQUIVALENCE', 'PRODUCT_SPECIFIC_IDENTITY']
COMMON = ['SEMANTIC_IDENTITY', 'MAPPING', 'PRESENTATION', 'DEPENDENCY', 'RULE_CONFORMITY', 'EXCEPTION_REVIEW']
MEANING_SOURCES = STRONG + ['AUDITED_MAPPING', 'CONTRACT_AUTHORITY', 'FORMAL_REGISTRY']
CLAIM_SOURCES = {'PRODUCT_FACT': STRONG, 'SEMANTIC_IDENTITY': MEANING_SOURCES,
                 'MAPPING': MEANING_SOURCES, 'MEANING_EQUIVALENCE': MEANING_SOURCES,
                 'PRODUCT_SPECIFIC_IDENTITY': MEANING_SOURCES,
                 'FIELD_RESPONSIBILITY': STRONG + ['CONTRACT_AUTHORITY', 'FORMAL_REGISTRY'],
                 'DERIVATION_AUTHORITY': STRONG + ['CONTRACT_AUTHORITY', 'FORMAL_REGISTRY'],
                 'RUNTIME_PARITY': ['VERIFIED_RUNTIME_BEHAVIOR']}
GATES = ['schema', 'mapping', 'selection-contract', 'ui-standard', 'category-flow', 'dependency',
         'reset', 'exceptions', 'authority', 'coverage', 'output', 'presentation-resolution']
PURPOSES = ['APPLICATION_FIELD', 'CONTRACT_REFERENCE']
STATES = ['PROVISIONAL', 'FORMAL']
CLASSIFICATION = {'exact match': 'EXACT', 'semantic match': 'SEMANTIC', 'product specific': 'PRODUCT_SPECIFIC'}

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()

def runtime_identity(field):
    """Status-only promotion cannot invalidate the already proven Runtime identity."""
    return digest({k: v for k, v in field.items() if k != 'status'})

def error(code, field, reason):
    return {'code': code, 'path': str(field), 'message': reason}

def obj(properties, required=None):
    return {'type': 'object', 'properties': properties,
            'required': list(properties) if required is None else required, 'additionalProperties': False}

def schemas():
    s = {'type': 'string', 'minLength': 1, 'pattern': r'\S'}
    h = {'type': 'string', 'pattern': '^[a-f0-9]{64}$'}
    enum = lambda xs: {'enum': xs}
    arr = lambda item, n=0: {'type': 'array', 'items': item, 'minItems': n, 'uniqueItems': item.get('type') != 'object'}
    date = {'type': 'string', 'format': 'date'}
    ref = obj({'path': s, 'pointer': {'type': 'string', 'pattern': '^(/.*)?$'}, 'sha256': h})
    scope = obj({'field_id': s, 'category': s, 'purpose': enum(PURPOSES)})
    review = obj({'authority_id': s, 'decision_id': s, 'decision_ref': ref})
    evidence = obj({'evidence_id': s, 'source_class': enum(SOURCE_CLASSES), 'source_authority': s,
                    'source_identifier': s, 'document_version': s, 'page_or_section': s,
                    'captured_date': date, 'verification_state': enum(['VERIFIED', 'UNVERIFIED']),
                    'status': enum(['ACCEPTED', 'INSUFFICIENT', 'CONFLICTING', 'UNVERIFIED']),
                    'source_ref': ref, 'scope': scope, 'claims': arr(enum(CLAIMS), 1), 'review': review})
    authority = obj({'authority_id': s, 'kind': enum(['EVIDENCE_SOURCE', 'REVIEW_AUTHORITY']),
                     'status': enum(['CURRENT', 'RETIRED']), 'identity': ref,
                     'source_classes': arr(enum(SOURCE_CLASSES)), 'purposes': arr(enum(PURPOSES), 1)})
    approval = obj({'approval_id': s, 'field_id': s, 'category': s, 'purpose': enum(PURPOSES),
                    'status': enum(['APPROVED', 'REJECTED', 'PENDING']), 'contract_sha256': h,
                    'evidence_sha256': h, 'dossier_sha256': h, 'review': review})
    transition = obj({'from': enum(STATES), 'to': enum(STATES), 'reason': s,
                      'operation': enum(['STATUS_TRANSITION', 'REFERENCE_CERTIFICATION']),
                      'previous_contract': {'type': 'object'}, 'previous_contract_sha256': h})
    specific = obj({'reason': s, 'why_global_role_insufficient': s, 'owner': s,
                    'source': s, 'status': enum(['REVIEWED']), 'review_condition': s})
    dossier = obj({'dossier_id': s, 'field_id': s, 'category': s, 'purpose': enum(PURPOSES),
                   'fact_kind': enum(['PRODUCT_FACT', 'BUSINESS_INPUT', 'DERIVED', 'REFERENCE_CONTRACT']),
                   'mapping_classification': enum(['EXACT', 'SEMANTIC', 'PRODUCT_SPECIFIC']),
                   'mapping_rationale': s, 'evidence_ids': arr(s, 1), 'approval_id': s,
                   'contract_sha256': h, 'transition': transition, 'product_specific': specific},
                  ['dossier_id', 'field_id', 'category', 'purpose', 'fact_kind', 'mapping_classification',
                   'mapping_rationale', 'evidence_ids', 'approval_id', 'contract_sha256', 'transition'])
    blocker = obj({'blocker_id': s, 'field_id': s, 'status': enum(['OPEN', 'CLOSED']), 'reason': s})
    policy = obj({'version': {'const': VERSION}, 'package_version': {'const': '0.3.0'},
                  'states': {'const': STATES}, 'common_claims': {'const': COMMON},
                  'source_classes': {'const': SOURCE_CLASSES}, 'product_fact_sources': {'const': STRONG},
                  'claim_source_classes': {'const': CLAIM_SOURCES},
                  'validator_gates': {'const': GATES},
                  'mapping_claims': {'const': {'EXACT': ['MAPPING'], 'SEMANTIC': ['MAPPING', 'MEANING_EQUIVALENCE'],
                                             'PRODUCT_SPECIFIC': ['MAPPING', 'PRODUCT_SPECIFIC_IDENTITY']}},
                  'lifecycle': {'const': [['PROVISIONAL', 'FORMAL'], ['FORMAL', 'PROVISIONAL']]},
                  'reference_scope': {'const': 'SCHEMA_REFERENCE_ONLY_NOT_APPLICATION_ADOPTION'}})
    return {'formal-promotion-governance': policy,
            'evidence-acceptance': obj({'version': {'const': VERSION}, 'authorities': arr(authority), 'evidence': arr(evidence)}),
            'formal-promotion': obj({'version': {'const': VERSION}, 'approvals': arr(approval),
                                     'dossiers': arr(dossier), 'blockers': arr(blocker)})}

def schema_errors(name, value):
    return [error('PROMOTION_SCHEMA', name + '/' + '/'.join(map(str, e.absolute_path)), e.message)
            for e in Draft202012Validator(schemas()[name], format_checker=FormatChecker()).iter_errors(value)]

def resolve_ref(root, ref):
    """Exact cached bytes and JSON pointer; no floating web retrieval in CI."""
    root = Path(root).resolve()
    path = (root / ref['path']).resolve()
    if Path(ref['path']).is_absolute() or not path.is_relative_to(root) or not path.is_file():
        raise ValueError('reference must be a local file inside the adopted snapshot')
    if hashlib.sha256(path.read_bytes()).hexdigest() != ref['sha256']:
        raise ValueError('source bytes do not match sha256: ' + ref['path'])
    try:
        value = json.loads(path.read_text())
    except (UnicodeDecodeError, json.JSONDecodeError):
        if ref['pointer']: raise ValueError('JSON Pointer needs a JSON source artifact')
        return path.read_bytes()  # Catalog/PDF/image evidence can use byte identity + page/section.
    for token in ref['pointer'].split('/')[1:] if ref['pointer'] else []:
        token = token.replace('~1', '/').replace('~0', '~')
        value = value[int(token)] if isinstance(value, list) else value[token]
    return value

def unique(records, key, code):
    seen = set(); errors = []
    for record in records:
        identity = record[key]
        if identity in seen: errors.append(error(code, identity, 'Duplicate registered identity'))
        seen.add(identity)
    return errors

def check_review(root, record, authorities, purpose, payload):
    review = record['review']; authority = authorities.get(review['authority_id'])
    if not authority or authority['kind'] != 'REVIEW_AUTHORITY' or authority['status'] != 'CURRENT' or purpose not in authority['purposes']:
        raise ValueError('review authority is absent, retired, or not approved for this purpose')
    # The decision must come from the independently registered reviewer artifact.
    if any(review['decision_ref'][k] != authority['identity'][k] for k in ['path', 'sha256']):
        raise ValueError('decision artifact differs from registered review authority')
    decision = resolve_ref(root, review['decision_ref'])
    if not isinstance(decision, dict) or decision.get('decision_id') != review['decision_id'] or decision.get('status') != 'APPROVED' or decision.get('payload') != payload:
        raise ValueError('decision does not approve this exact record payload')

def acceptance_payload(record):
    return {k: v for k, v in record.items() if k != 'review'}

def approval_payload(record):
    return {k: v for k, v in record.items() if k != 'review'}

def validate_evidence(registry, root, today=None):
    errors = schema_errors('evidence-acceptance', registry)
    if errors: return errors
    today = today or dt.date.today()
    errors += unique(registry['authorities'], 'authority_id', 'DUPLICATE_PROMOTION_AUTHORITY')
    errors += unique(registry['evidence'], 'evidence_id', 'DUPLICATE_EVIDENCE_ID')
    authorities = {a['authority_id']: a for a in registry['authorities']}
    for a in authorities.values():
        try: resolve_ref(root, a['identity'])
        except (ValueError, KeyError, IndexError, TypeError, OSError) as e:
            errors.append(error('INVALID_PROMOTION_AUTHORITY', a['authority_id'], str(e)))
    for e in registry['evidence']:
        fid = e['scope']['field_id']; source = authorities.get(e['source_authority'])
        try:
            if not source or source['kind'] != 'EVIDENCE_SOURCE' or source['status'] != 'CURRENT' or e['source_class'] not in source['source_classes'] or e['scope']['purpose'] not in source['purposes']:
                raise ValueError('source class/purpose is not authorized by independent source registry')
            if e['source_ref'] != source['identity']:
                raise ValueError('evidence locator differs from registered source identity')
            resolve_ref(root, e['source_ref'])
            if dt.date.fromisoformat(e['captured_date']) > today: raise ValueError('captured date is in the future')
        except (ValueError, KeyError, IndexError, TypeError, OSError) as ex:
            errors.append(error('INVALID_EVIDENCE_REFERENCE', fid, str(ex)))
        if e['status'] == 'ACCEPTED':
            if any(e[k].strip() in {'UNKNOWN', 'N/A'} for k in ['source_identifier', 'document_version', 'page_or_section']):
                errors.append(error('INVALID_EVIDENCE_ACCEPTANCE', fid, 'ACCEPTED evidence needs resolved source/version/page identity'))
            if e['verification_state'] != 'VERIFIED':
                errors.append(error('EVIDENCE_NOT_VERIFIED', fid, 'ACCEPTED evidence must be VERIFIED'))
            try: check_review(root, e, authorities, e['scope']['purpose'], acceptance_payload(e))
            except (ValueError, KeyError, IndexError, TypeError, OSError) as ex:
                errors.append(error('INVALID_EVIDENCE_ACCEPTANCE', fid, str(ex)))
    return errors

def validate_promotion(policy, evidence_registry, promotion_registry, field_records, root, gate_errors,
                       mapping, today=None, exception_records=()):
    """field_records=(contract, trusted origin purpose); errors never assert product truth."""
    errors = schema_errors('formal-promotion-governance', policy)
    errors += schema_errors('formal-promotion', promotion_registry)
    evidence_errors = validate_evidence(evidence_registry, root, today)
    errors += evidence_errors
    if errors: return errors
    errors += unique(promotion_registry['dossiers'], 'dossier_id', 'DUPLICATE_PROMOTION_DOSSIER')
    errors += unique(promotion_registry['approvals'], 'approval_id', 'DUPLICATE_PROMOTION_APPROVAL')
    authorities = {a['authority_id']: a for a in evidence_registry['authorities']}
    evidences = {e['evidence_id']: e for e in evidence_registry['evidence']}
    approvals = {a['approval_id']: a for a in promotion_registry['approvals']}
    dossiers = promotion_registry['dossiers']
    targets = {(f['field_id'], purpose, digest(f)) for f, purpose in field_records}
    for d in dossiers:
        if (d['field_id'], d['purpose'], d['contract_sha256']) not in targets:
            errors.append(error('ORPHAN_PROMOTION_DOSSIER', d['field_id'], 'No matching contract and trusted origin'))
    # Invalid / orphan approvals are rejected even if no FORMAL field consumes them.
    for a in approvals.values():
        try: check_review(root, a, authorities, a['purpose'], approval_payload(a))
        except (ValueError, KeyError, IndexError, TypeError, OSError) as ex:
            errors.append(error('INVALID_PROMOTION_APPROVAL', a['field_id'], str(ex)))
        if not any(d['approval_id'] == a['approval_id'] for d in dossiers):
            errors.append(error('ORPHAN_PROMOTION_APPROVAL', a['field_id'], 'Approval has no dossier'))
    for field, purpose in field_records:
        fid = field['field_id']; status = field.get('status')
        matches = [d for d in dossiers if d['field_id'] == fid and d['purpose'] == purpose and d['contract_sha256'] == digest(field)]
        if status != 'FORMAL' and not matches: continue  # Existing PROVISIONAL needs no new evidence.
        if len(matches) != 1:
            errors.append(error('FORMAL_PROMOTION_REQUIRED', fid, 'FORMAL requires exactly one content-bound dossier and approval')); continue
        d = matches[0]; transition = d['transition']; prior = transition['previous_contract']
        pair = [transition['from'], transition['to']]
        legal = pair in policy['lifecycle'] if transition['operation'] == 'STATUS_TRANSITION' else (purpose == 'CONTRACT_REFERENCE' and pair == ['FORMAL', 'FORMAL'])
        if not legal or transition['to'] != status or prior.get('status') != transition['from'] or digest(prior) != transition['previous_contract_sha256']:
            errors.append(error('ILLEGAL_PROMOTION_TRANSITION', fid, 'Only approved PROVISIONAL↔FORMAL transitions with bound prior contract are allowed'))
        old = copy.deepcopy(prior); new = copy.deepcopy(field); old.pop('status', None); new.pop('status', None)
        if old != new: errors.append(error('PROMOTION_CONTRACT_MUTATION', fid, 'Promotion may change status only; semantics need separate adoption'))
        mapped = mapping.get(fid, {}); classification = CLASSIFICATION.get(mapped.get('mapping_type'))
        expected_mapping = {k: field.get(k) for k in ['field_id', 'category', 'semantic_role', 'runtime_key', 'canonical_key']}
        expected_mapping.update({k: field.get('scope', {}).get(k) for k in ['app', 'product']})
        if d['category'] != field['category'] or d['mapping_classification'] != classification or any(mapped.get(k) != v for k, v in expected_mapping.items()):
            errors.append(error('PROMOTION_MAPPING_MISMATCH', fid, 'Field/category/app/product/runtime/semantic identity or classification differs from registered mapping'))
        is_reference = field.get('scope', {}).get('kind') == 'REFERENCE_CONTRACT_NOT_INSTALLED'
        if (purpose == 'CONTRACT_REFERENCE') != (d['fact_kind'] == 'REFERENCE_CONTRACT') or (purpose == 'CONTRACT_REFERENCE') != is_reference:
            errors.append(error('PROMOTION_SCOPE_MISMATCH', fid, 'Reference certification cannot authorize an application Field'))
        selected = []
        for eid in d['evidence_ids']:
            e = evidences.get(eid)
            if not e: errors.append(error('INVALID_EVIDENCE_REFERENCE', fid, 'Unknown evidence_id: ' + eid)); continue
            selected.append(e)
            if e['scope'] != {'field_id': fid, 'category': field['category'], 'purpose': purpose}:
                errors.append(error('EVIDENCE_SCOPE_MISMATCH', fid, 'Evidence is scoped to another Field/category/purpose: ' + eid))
            if status == 'FORMAL' and e['status'] != 'ACCEPTED':
                errors.append(error('FORMAL_EVIDENCE_NOT_ACCEPTED', fid, eid + ' is ' + e['status']))
        a = approvals.get(d['approval_id'])
        if not a or a['status'] != 'APPROVED' or any(a[k] != d[k] for k in ['field_id', 'category', 'purpose', 'contract_sha256']) or a['dossier_sha256'] != digest(d) or a['evidence_sha256'] != digest(selected):
            errors.append(error('INVALID_PROMOTION_APPROVAL', fid, 'Approval is missing, not APPROVED, or stale against contract/evidence/dossier'))
        if status != 'FORMAL': continue  # Approved demotion leaves the existing PROVISIONAL rules intact.
        needed = set(policy['common_claims'] + policy['mapping_claims'][d['mapping_classification']])
        kind_claim = {'PRODUCT_FACT': 'PRODUCT_FACT', 'BUSINESS_INPUT': 'FIELD_RESPONSIBILITY', 'DERIVED': 'DERIVATION_AUTHORITY'}
        if d['fact_kind'] in kind_claim: needed.add(kind_claim[d['fact_kind']])
        if purpose == 'APPLICATION_FIELD': needed.add('RUNTIME_PARITY')
        claims = set()
        for e in selected:
            if e['status'] != 'ACCEPTED': continue
            for claim in e['claims']:
                if claim == 'PRODUCT_FACT' and e['source_class'] not in policy['product_fact_sources']:
                    errors.append(error('INSUFFICIENT_PRODUCT_FACT_AUTHORITY', fid, 'Runtime/registry/mapping is supporting evidence, not product fact authority')); continue
                if claim == 'RUNTIME_PARITY' and e['source_class'] != 'VERIFIED_RUNTIME_BEHAVIOR':
                    errors.append(error('INVALID_RUNTIME_PARITY_EVIDENCE', fid, 'Runtime parity requires verified runtime behavior evidence')); continue
                if claim == 'RUNTIME_PARITY':
                    report = resolve_ref(root, e['source_ref'])
                    if not isinstance(report, dict) or any(report.get(k) != value for k, value in
                            {'field_id': fid, 'runtime_identity_sha256': runtime_identity(field),
                             'runtime_parity': 'PASS', 'flow_parity': 'PASS'}.items()):
                        errors.append(error('INVALID_RUNTIME_PARITY_EVIDENCE', fid, 'Accepted report must prove this exact Runtime identity and Runtime/Flow PASS')); continue
                if claim in policy['claim_source_classes'] and e['source_class'] not in policy['claim_source_classes'][claim]:
                    errors.append(error('INSUFFICIENT_CLAIM_AUTHORITY', fid, claim + ' cannot rely on ' + e['source_class'])); continue
                claims.add(claim)
        if needed - claims:
            errors.append(error('FORMAL_REQUIREMENTS_UNMET', fid, 'Missing accepted evidence claims: ' + ', '.join(sorted(needed - claims))))
        if d['mapping_classification'] == 'PRODUCT_SPECIFIC' and not d.get('product_specific'):
            errors.append(error('PRODUCT_SPECIFIC_PROMOTION_GOVERNANCE', fid, 'Reason, global insufficiency, owner/source/status/review condition required'))
        if d['mapping_classification'] == 'PRODUCT_SPECIFIC' and d.get('product_specific'):
            ps = d['product_specific']; owner = authorities.get(ps['owner'], {}); source = authorities.get(ps['source'], {})
            if owner.get('kind') != 'REVIEW_AUTHORITY' or owner.get('status') != 'CURRENT' or purpose not in owner.get('purposes', []) or source.get('kind') != 'EVIDENCE_SOURCE' or source.get('status') != 'CURRENT' or purpose not in source.get('purposes', []) or any(ps[k].strip() in {'UNKNOWN', 'N/A'} for k in ['reason', 'why_global_role_insufficient', 'review_condition']):
                errors.append(error('PRODUCT_SPECIFIC_PROMOTION_GOVERNANCE', fid, 'Product-specific owner/source must resolve to active scoped authorities; rationale/review condition cannot be UNKNOWN'))
        # Conflicts cannot be hidden by omitting their IDs from the chosen evidence list.
        if any(e['scope']['field_id'] == fid and e['scope']['purpose'] == purpose and e['status'] == 'CONFLICTING' for e in evidences.values()) or any(x['field_id'] == fid and x['status'] == 'OPEN' for x in promotion_registry['blockers']):
            errors.append(error('UNRESOLVED_PROMOTION_BLOCKER', fid, 'Registered conflict or promotion blocker remains open'))
        if any(fid in ex.get('field_id', []) and ex.get('status') in {'PENDING_REVIEW', 'LEGACY_EXCEPTION'} for ex in exception_records):
            errors.append(error('UNRESOLVED_PROMOTION_EXCEPTION', fid, 'Scoped pending/legacy exception requires resolution before FORMAL'))
        for gate in policy['validator_gates']:
            if gate not in gate_errors or gate_errors[gate]:
                errors.append(error('PROMOTION_GATE_FAILED', fid, 'Existing validator gate has not passed: ' + gate))
    return errors
