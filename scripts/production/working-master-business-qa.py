#!/usr/bin/env python3
"""Existing Working authoring adapter. Shared v2 owns build, rules and workflow.

No product facts or product-name branches live here. Reviewed fields, evidence,
constraints and expected cases are immutable Work inputs. Passing this adapter
admits sales requests only, never Formal, manufacturing approval or deployment.
"""
import argparse
import json
import sys
from pathlib import Path


def setup(harness_root):
    sys.path.insert(0, str(Path(harness_root).resolve()))
    global require, read_json, write_json, capture, sha, digest, build, validate, handoff
    from harness.core import require, read_json, write_json, sha
    from harness.resolvers import capture
    from product_master.identity import digest
    from product_master.build import build
    from product_master.validators.validate import validate, handoff


def verified(ref):
    return capture(Path('/'), ref)


def candidate(contract):
    for ref in contract['inputs'].values():
        verified(ref)
    for ref in contract['governance'].values():
        verified(ref)
    profile=json.loads(verified(contract['profile']))
    require(profile['status']=='ADOPTED' and profile['scope']=='EXISTING_WORKING_SALES_QA',
            'NATIVE_PROFILE_SCOPE', 'An admitted existing Working profile is required', 'BUILD')
    obs=read_json(contract['inputs']['observations']['path'])
    baseline=read_json(contract['inputs']['baseline']['path'])
    original=read_json(contract['inputs']['original']['path'])
    require(obs['target']==profile['product_id']==original['product_id'],
            'PRODUCT_IDENTITY', 'One existing product must be preserved', 'BUILD')
    require(obs['context']['registry_state']=='PRESENT' and obs['context']['existing_master']
            and obs['context']['intent']=='change' and obs['existing_master']==baseline,
            'EXISTING_WORKING_REQUIRED', 'Never use the absent-product intake for this Work', 'BUILD')
    require(baseline['provenance']['baseline_hash']==sha(verified(contract['inputs']['original'])),
            'BASELINE_IDENTITY', 'The review projection must retain its complete original Working', 'BUILD')
    require(not original.get('qa_ready') and not original.get('formal_pass'),
            'BASELINE_SCOPE', 'This profile admits the reviewed DRAFT recovery, not a Formal mutation', 'BUILD')
    master=build(obs, {'product_id':profile['product_id'], 'master_state':'PRESENT'})
    require(master['work_type']=='CHANGE WORK' and master['lifecycle_status']=='DRAFT'
            and master['provenance']['baseline_hash']==digest(baseline),
            'CANDIDATE_SCOPE', 'A fixed DRAFT successor and its review baseline are required', 'BUILD')
    # Source contents and governance are acquired inputs, not string-only refs.
    by_path={str(Path(r['path']).resolve()):r for r in contract['inputs'].values()}
    for source in master['sources']:
        ref=by_path.get(str(Path(source['location']).resolve()))
        require(ref and source['content_identifier']=={'kind':'SHA256_BYTES','value':ref['sha256']},
                'SOURCE_BYTES', 'Every Source must be bound to actual acquired bytes', 'BUILD')
    review=read_json(contract['inputs']['review']['path'])
    require(review['product_id']==master['product']['product_id'] and review['candidate_sha256']==digest(master)
            and review['scope']==master['scope']['scope_id'], 'REVIEW_IDENTITY', 'Review must bind this candidate', 'BUSINESS_QA')
    require(set(review['reviewed_evidence_ids'])=={e['evidence_id'] for e in master['evidence']}
            and review['critical_unknowns']==[] and review['critical_conflicts']==[],
            'SOURCE_REVIEW_REQUIRED', 'All current claims and critical defects need an actual Source review', 'BUSINESS_QA')
    require(review['human_adoption'] is False and review['automatic_orderability'] is False,
            'GATE_BOUNDARY', 'AI source review grants neither Human adoption nor orderability', 'BUSINESS_QA')
    require(review['confirmation_requests'] and all(r.get('condition') is not None and r.get('status')
            and r.get('owner') and r.get('question') and r.get('source_reason') for r in review['confirmation_requests']),
            'HANDOFF_CONFIRMATION_REQUIRED', 'Unresolved downstream facts must reach the estimator', 'BUSINESS_QA')
    return master,baseline,review


def request_envelope(master, review, request):
    """Use the shared handoff evaluator and attach explicit estimation questions."""
    from product_master.validators.validate import condition
    quantity=request['quantity']
    require(isinstance(quantity,int) and not isinstance(quantity,bool) and quantity>0,
            'REQUEST_QUANTITY', 'Sales request quantity must be a positive integer', 'HANDOFF')
    valid,output,errors=handoff(master,dict(before={},changes=request['selection']))
    confirmations=[r for r in review['confirmation_requests'] if condition(r['condition'],output)]
    return dict(product=master['product'],quantity=quantity,quantity_role='SALES_REQUEST_COUNT',
                request_valid=valid,selection=output,errors=errors,confirmation_requests=confirmations,
                automatic_orderability=False,manufacturing_approval=False,price=None,bom=None,set_code=None)


def execute(contract_path,stage,work,out):
    contract=read_json(contract_path);work=Path(work).resolve();out=Path(out).resolve()
    require(out.is_relative_to(work) and not out.is_symlink() and not (work/'product-master.json').is_symlink(),
            'OUTPUT_PATH', 'Regular Work-owned outputs required', stage)
    master,baseline,review=candidate(contract)
    if stage=='BUILD':
        write_json(work/'candidate-draft.json',master)
        result={'status':'PASS','work_type':master['work_type'],'candidate_sha256':digest(master)}
    elif stage=='BUSINESS_QA':
        require(read_json(work/'candidate-draft.json')==master,'CANDIDATE_CHANGED','Build differs from fixed observations',stage)
        result=validate(master,baseline=baseline)
        require(result['status']=='PASS','BUSINESS_QA_FAILED',json.dumps(result['findings'],ensure_ascii=False),stage)
        samples=[]
        for sample in review['request_samples']:
            envelope=request_envelope(master,review,sample)
            require(envelope['request_valid']==sample['expected_valid'] and
                    {r['id'] for r in envelope['confirmation_requests']}==set(sample['expected_confirmation_ids']),
                    'REQUEST_HANDOFF_FAILED',sample['id'],stage)
            for key,value in sample.get('expected_selection',{}).items():
                require(envelope['selection'].get(key)==value,'REQUEST_HANDOFF_FAILED',sample['id']+': '+key,stage)
            samples.append({'id':sample['id'],**envelope})
        write_json(work/'request-samples.json',samples)
        # The exact candidate and a separate result record carry the gate. Never
        # mutate the tested payload just to change a lifecycle label to PASS.
        write_json(work/'product-master.json',master)
        result.update(scope=master['scope']['scope_id'],qa_ready=True,formal=False,
                      executed_test_count=len(master['handoff_tests']),request_sample_count=len(samples),
                      source_review=contract['inputs']['review'],automatic_orderability=False,
                      historical_tests='NOT_REUSED_AS_CURRENT_EXECUTION')
    else:
        require(stage=='REVIEW_PACKET','NATIVE_GATE_SCOPE','Only candidate sales QA is admitted',stage)
        qa=read_json(work/'BUSINESS_QA.json')
        require(qa.get('qa_ready') and qa['package_sha256']==digest(master),'QA_IDENTITY','Same candidate QA required',stage)
        result=dict(status='PASS',product=master['product'],candidate_sha256=digest(master),
                    content_gate='QA_READY',adoption='NOT_FORMAL',qa_report='BUSINESS_QA.json',
                    confirmations=review['confirmation_requests'],original_working=contract['inputs']['original'],
                    authority_refs=contract['governance'],source_refs=master['sources'],
                    excluded_actions=['Formal Registry adoption','Runtime/UI integration','Production release'])
    write_json(out,result)
    return result


def main():
    p=argparse.ArgumentParser()
    for k in ('harness-root','contract','stage','work','out'):p.add_argument('--'+k,required=True)
    a=p.parse_args();setup(a.harness_root)
    from harness.core import Blocked
    try:result=execute(a.contract,a.stage,a.work,a.out)
    except (Blocked,OSError,ValueError,KeyError,TypeError) as e:
        result={'status':'FAIL','blocking_reason':getattr(e,'data',{'reason':str(e)})};write_json(a.out,result)
    return 0 if result['status']=='PASS' else 2


if __name__=='__main__':raise SystemExit(main())
