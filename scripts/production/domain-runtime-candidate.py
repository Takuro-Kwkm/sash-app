"""Native candidate validation; execution, storage and resume belong to Shared v2."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys


def execute(shared, contract_path, stage, work, output):
    sys.path.insert(0, str(Path(shared).resolve()))
    from harness.core import read_json, write_json, require, sha
    from harness.resolvers import capture
    from harness.production import native_registry, connector_document
    from harness.workflow import inspect
    from product_master.identity import digest
    contract=read_json(contract_path); checkout=Path(contract['checkout']); work=Path(work); output=Path(output)
    require(output.resolve().is_relative_to(work.resolve()) and not output.is_symlink(), 'OUTPUT_PATH', 'Work-owned output required', stage)
    require(subprocess.check_output(['git','rev-parse','HEAD'],cwd=checkout,text=True).strip()==contract['native_head'],
            'NATIVE_HEAD_CHANGED','Use the fixed native checkout for this Work',stage)
    for ref in contract['inputs'].values(): capture(Path('/'),ref)
    profile=json.loads(capture(Path('/'),contract['profile']))
    require(profile['status']=='ADOPTED' and profile['admission_state']=='CANDIDATE_ONLY'
            and not profile['formal_adoption'] and not profile['source_adoption'] and not profile['release'],
            'CANDIDATE_SCOPE', 'Native candidate profile only', stage)
    if profile.get('private_candidate'):
        require(contract.get('candidate_root') and not Path(contract['candidate_root']).resolve().is_relative_to(checkout),'PRIVATE_CANDIDATE_CAPTURE_REQUIRED','Explicit private captured root required',stage)
        definition=importlib.util.spec_from_file_location('private_candidate',checkout/'scripts/production/validate-domain-runtime-connection.py')
        private_module=importlib.util.module_from_spec(definition);definition.loader.exec_module(private_module)
        refs=private_module.capture_private_candidate(profile,contract['candidate_root'])
        require(all(contract['inputs'].get(k)==v for k,v in refs.items()),'PRIVATE_CANDIDATE_INPUT_CHANGED','Every private file must retain its immutable spec binding',stage)
        base=Path(contract['candidate_root'])
    else:base=checkout/profile['candidate_root']
    index=read_json(base/'index.json'); entry=index['products'][0]
    document=read_json(base/entry['path']); projection=read_json(base/'projection.json')
    require(len(index['products'])==1 and sha((base/entry['path']).read_bytes())==entry['sha256']
            and entry['id']==profile['runtime_product_id'] and document['baseline']==projection['source'],
            'CANDIDATE_IDENTITY', 'Fixed native candidate bytes required', stage)
    master=read_json(base/document['baseline']['path']); provenance=read_json(base/'review/formal-provenance.json')
    snapshot=profile.get('formal_storage_adapter')=='SHARED_CORE_DRIVE_BRIDGE'
    definition=importlib.util.spec_from_file_location('domain_compiler',checkout/profile['compiler'])
    compiler=importlib.util.module_from_spec(definition);definition.loader.exec_module(compiler)
    require(compiler.load_adopted_master(projection,base)==master
            and master['product']['product_id']==profile.get('authoring_product_id',profile['product_id'])
            and master['product']['revision']==profile.get('baseline_snapshot_revision',profile['baseline_package_version']),
            'ADOPTED_MASTER_REQUIRED', 'Do not reopen Product Master adoption', stage)
    node=contract['node']; env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'}
    def run(script,args):
        result=subprocess.run([node,str(checkout/script),*map(str,args)],cwd=checkout,env=env,text=True,capture_output=True,timeout=1800)
        require(result.returncode==0,'CANDIDATE_QA_FAILED',(result.stderr or result.stdout)[-10000:],stage)
    if stage=='FORMAL_IDENTITY':
        row=native_registry(read_json(contract['inputs']['registry']['path']),profile['manufacturer'],profile['series'])
        metadata=connector_document(read_json(contract['inputs']['master_metadata']['path']))
        require(row['package_version']==profile['baseline_package_version'] and row['authoring_file_id']==metadata['id']==provenance['master_file_id'],
                'FORMAL_IDENTITY', 'Current Registry and actual native Master must match',stage)
        require(sha(capture(Path('/'),contract['inputs']['master_bytes']))==provenance['master_sha256']==sha((base/document['baseline']['path']).read_bytes()),
                'FORMAL_BYTES_CHANGED','Acquired native bytes differ from projection baseline',stage)
        upstream=contract['upstream']; spec=read_json(upstream['spec']['path']); capture(Path('/'),upstream['spec'])
        receipt=read_json(contract['inputs']['formal_receipt']['path']); decision=read_json(contract['inputs']['formal_decision']['path'])
        if snapshot:
            from harness.core import plan,validate_authorization
            manifest=read_json(base/projection['adopted_snapshot_manifest']['path'])
            validate_authorization(spec,decision)
            require(receipt==json.loads(capture(Path('/'),upstream['completion_receipt']))
                    and decision==json.loads(capture(Path('/'),upstream['authorization']))
                    and plan(Path(upstream['work']),spec)['status']=='POST_SAVE_VERIFIED'
                    and spec['work_id']==provenance['completed_work'] and spec['adapter']=='drive_bridge'
                    and receipt['storage_state']=='POST_SAVE_VERIFIED' and receipt['state']=='FORMAL_PASS'
                    and receipt['candidate_sha256']==provenance['master_sha256']
                    and receipt['master_file_id']==metadata['id'] and receipt['formal_revision']==row['package_version']
                    and spec['expected']['revision']==manifest['formal_revision']==row['package_version']
                    and spec['expected']['package_sha256']==receipt['package_sha256']==provenance['package_sha256']
                    and manifest['decision_ref']==decision['decision_ref'],
                    'COMPLETED_FORMAL_REQUIRED','Inspect original core storage journal and same-payload authorization',stage)
            work_id=spec['work_id']
        else:
            state=inspect(Path(upstream['root']),Path(upstream['work']),spec)[0]
            require(receipt==read_json(Path(upstream['work'])/'native-formal-readback.json')
                    and decision==read_json(Path(upstream['spec']['path']).parent/'human-decision.json'),
                    'COMPLETED_FORMAL_REQUIRED','Reuse exact original completion receipt and admitted Human Decision',stage)
            require(state['state']=='COMPLETED' and spec['workflow_id']==provenance['completed_work']
                    and receipt['status']=='POST_SAVE_VERIFIED' and decision['actor_kind']=='HUMAN' and decision['decision']=='APPROVED'
                    and decision['payload_sha256']==provenance['human_packet_sha256'],
                    'COMPLETED_FORMAL_REQUIRED','Inspect original completed Work and actual external adoption evidence',stage)
            work_id=spec['workflow_id']
        result=dict(status='PASS',formal_work=work_id,terminal_policy='INSPECT_ONLY',master_sha256=provenance['master_sha256'])
    elif stage=='PROJECTION':
        definition=importlib.util.spec_from_file_location('domain_compiler',checkout/profile['compiler'])
        compiler=importlib.util.module_from_spec(definition);definition.loader.exec_module(compiler)
        require(compiler.compile_profile(projection,base)==document,'PROJECTION_CHANGED','Compiler output differs from fixed module',stage)
        run(profile['validator'],[base/'index.json'])
        result=dict(status='PASS',module_sha256=entry['sha256'],manufacturer_fact_mutations=0,formal_adoption=False,source_adoption=False)
    elif stage=='PARITY':
        path=work/'domain-parity.json';run(profile['parity_validator'],[base/'index.json',path]); report=read_json(path)
        require(report['status']=='PASS' and sum(row['cases'] for row in report['products'])==len(master['handoff_tests']),
                'PARITY_FAILED','All adopted handoff cases must execute',stage)
        result=dict(status='PASS',report_sha256=sha(path.read_bytes()),cases=len(master['handoff_tests']))
    elif stage=='FLOW_REVIEW_AUTHORIZATION':
        from harness.core import validate_authorization
        review=read_json(contract['inputs']['flow_review']['path']); authorization=read_json(contract['inputs']['flow_authorization']['path'])
        validate_authorization(review['authorization_scope'],authorization)
        expected=review['authorization_scope']['expected']
        require(expected['index_sha256']==sha((base/'index.json').read_bytes()) and expected['module_sha256']==entry['sha256'],
                'HUMAN_FLOW_REVIEW_REOPEN','Reviewed runtime/flow identity changed',stage)
        for path,digest_ in expected['code_sha256'].items():
            require(sha((checkout/path).read_bytes())==digest_,'HUMAN_FLOW_REVIEW_REOPEN','Reviewed implementation changed: '+path,stage)
        result=dict(status='PASS',gate='HUMAN_FLOW_REVIEW_GATE',decision_ref=authorization['decision_ref'],review_payload_sha256=authorization['review_payload_sha256'])
    elif stage=='BROWSER':
        identity=read_json(contract['inputs']['saved_candidate_identity']['path'])
        require(identity['status']=='NATIVE_CANDIDATE_BYTES_READBACK_PASS' and identity['index_sha256']==sha((base/'index.json').read_bytes())
                and identity['module_sha256']==entry['sha256'], 'SAVED_CANDIDATE_REQUIRED','Actual native index/module readback required',stage)
        port=str(profile['local_port']); qa_contract=read_json(base/profile['qa_contract'])
        qa_path=base/profile['qa_contract']
        if profile.get('candidate_identity_source')=='CAPTURED_NATIVE_READBACK':
            require(qa_contract['manifest_file_id']=='PENDING_NATIVE_CANDIDATE_SAVE','SAVED_CANDIDATE_REQUIRED','Only the admitted template may derive its saved identity',stage)
            qa_contract['manifest_file_id']=identity['index_file_id']
            qa_path=work/'captured-browser-qa.json';write_json(qa_path,qa_contract)
        require(identity['index_file_id']==qa_contract['manifest_file_id'], 'SAVED_CANDIDATE_REQUIRED','Snapshot identity differs',stage)
        env.update(SASH_CANDIDATE_MODE='INSPECT_LOCAL',SASH_CANDIDATE_RUNTIME_INDEX=str(base/'index.json'),
                   SASH_CANDIDATE_INDEX_SHA=identity['index_sha256'],SASH_CANDIDATE_MANIFEST_FILE_ID=identity['index_file_id'],
                   HOST='127.0.0.1',PORT=port,QA_BASE_URL='http://127.0.0.1:'+port,
                   QA_OUTPUT_DIR=str(work/'browser'),QA_RUNTIME_QA_CONTRACT=str(qa_path))
        env['QA_EXPECTED_COMMIT']=contract['native_head']
        if contract.get('playwright_module'):env['QA_PLAYWRIGHT_MODULE']=contract['playwright_module']
        require(not env.get('VERCEL') and env.get('NODE_ENV')!='production','LOCAL_CANDIDATE_ONLY','No production candidate fallback',stage)
        with (work/'candidate-server.log').open('w') as log:
            server=subprocess.Popen([node,str(checkout/'scripts/start-candidate-runtime.mjs')],cwd=checkout,env=env,stdout=log,stderr=log)
            try:
                import time,urllib.request
                for _ in range(100):
                    require(server.poll() is None,'LOCAL_SERVER_FAILED','Candidate server did not start',stage)
                    try:
                        with urllib.request.urlopen(env['QA_BASE_URL']+'/health',timeout=1) as response:
                            health=json.load(response)
                        if health.get('formalAdoption') is False: break
                    except OSError:time.sleep(0.1)
                else:require(False,'LOCAL_SERVER_FAILED','No candidate health response',stage)
                run(profile['browser_script'],[])
            finally:
                server.terminate()
                try:server.wait(timeout=10)
                except subprocess.TimeoutExpired:server.kill();server.wait()
        report=read_json(work/'browser/report.json')
        require(report['status']=='PASS' and report['errors']==[] and {row['width'] for row in report['viewports']}=={1280,768,390},
                'BROWSER_QA_FAILED','Actual rendering, transitions, save/reopen and outputs required',stage)
        result=dict(status='PASS',cases=sum(len(row['products']) for row in report['viewports']),persistence='BROWSER_LOCAL_STORAGE',
                    pdf_visual_review='SEPARATE_REQUIRED',formal_adoption=False,release=False)
    elif stage=='CARRY_FORWARD_UI_ADOPTION':
        from harness.workflow import inspect
        old_spec=read_json(contract['inputs']['ui_adoption_spec']['path']);old_contract=read_json(contract['inputs']['ui_adoption_contract']['path'])
        old_work=Path(contract['inputs']['ui_adoption_state']['path']).parent
        state=inspect(Path(old_contract['checkout']),old_work,old_spec)[0]
        receipt=read_json(contract['inputs']['ui_adoption_state']['path'])
        require(state['state']=='COMPLETED' and receipt['state']=='RUNTIME_UI_ADOPTED','ADOPTED_UI_WORK_REQUIRED','Inspect original completed adoption work','QA')
        original=read_json(contract['inputs']['flow_review']['path'])['authorization_scope']['expected']
        for name,digest_ in original['code_sha256'].items():require(sha((checkout/name).read_bytes())==digest_,'HUMAN_FLOW_REVIEW_REOPEN',name,stage)
        saved=read_json(contract['inputs']['formal_runtime_readback']['path']);formal_index=checkout/profile['runtime_ui_adoption']['formal_index'];formal=read_json(formal_index)
        require(saved['status']=='ACTUAL_FORMAL_RUNTIME_BYTES_MATCH' and saved['files'][0]['sha256']==sha(formal_index.read_bytes()) and saved['files'][0]['file_id']==profile['runtime_ui_adoption']['formal_manifest_file_id'] and saved['files'][1]['sha256']==sha((formal_index.parent/formal['products'][0]['path']).read_bytes()),'SAVED_FORMAL_RUNTIME_CHANGED','Fresh actual Drive byte identity must match',stage)
        result=dict(status='PASS',completed_adoption='INSPECT_ONLY',source_head=old_contract['native_head'],current_head=contract['native_head'],reviewed_implementation_files=len(original['code_sha256']),runtime_index_sha256=sha((checkout/profile['runtime_ui_adoption']['formal_index']).read_bytes()))
    elif stage in ('FULL_COVERAGE_MODEL','FULL_COVERAGE_RUNTIME'):
        full=profile['runtime_full_coverage'];index=checkout/profile['runtime_ui_adoption']['formal_index']
        if stage=='FULL_COVERAGE_MODEL':
            run(full['model'],[index,work/'coverage-model.json']);report=read_json(work/'coverage-model.json')
            result=dict(status=report['status'],proof_model=report['PROOF_MODEL_VERSION'],contexts=report['contexts'],standard_cells=report['standard_cells'],numeric_partitions=report['custom_partition_cells'],model_sha256=sha((work/'coverage-model.json').read_bytes()))
        else:
            run(full['validator'],[index,work/'coverage-model.json',work/'coverage']);report=read_json(work/'coverage/runtime-proof.json')
            require(report['status']=='PASS' and report['unverified_runtime_classes']==report['unverified_flow_signatures']==report['unverified_continuous_partitions']==report['unverified_transition_classes']==0,'FULL_COVERAGE_REQUIRED','Exact factored domain and every transition class required',stage)
            result=dict(status='PASS',report_sha256=sha((work/'coverage/runtime-proof.json').read_bytes()),materialized=report['materialized_runtime_cases'],flow_signatures=report['flow_signature_count'])
    elif stage=='FULL_COVERAGE_BROWSER':
        full=profile['runtime_full_coverage'];port=str(full['normal_ui_port'])
        env.update(HOST='127.0.0.1',PORT=port,QA_BASE_URL='http://127.0.0.1:'+port,QA_OUTPUT_DIR=str(work/'coverage-browser'),QA_RUNTIME_QA_CONTRACT=str(work/'coverage/browser-qa.json'),QA_EXPECTED_COMMIT=contract['native_head'],SASH_RELEASE_COMMIT_SHA=contract['native_head'])
        if contract.get('playwright_module'):env['QA_PLAYWRIGHT_MODULE']=contract['playwright_module']
        require(not any(env.get(k) for k in ('SASH_CANDIDATE_MODE','SASH_CANDIDATE_RUNTIME_INDEX','VERCEL')),'NORMAL_UI_REQUIRED','Full coverage uses the normal adopted UI',stage)
        with (work/'coverage-server.log').open('w') as log:
            server=subprocess.Popen([node,str(checkout/'scripts/start-step8-ui.mjs')],cwd=checkout,env=env,stdout=log,stderr=log)
            try:
                import time,urllib.request
                for _ in range(100):
                    require(server.poll() is None,'LOCAL_SERVER_FAILED','Normal UI server did not start',stage)
                    try:
                        with urllib.request.urlopen(env['QA_BASE_URL']+'/api/health',timeout=1) as response:health=json.load(response)
                        if health.get('releaseCommitSha')==contract['native_head']:break
                    except OSError:time.sleep(.1)
                else:require(False,'LOCAL_SERVER_FAILED','Same-HEAD normal UI required',stage)
                run(full['browser_projection'],[work/'coverage/browser-field-projections.json',work/'browser-projection-report.json'])
                run(profile['browser_script'],[])
            finally:
                server.terminate()
                try:server.wait(timeout=10)
                except subprocess.TimeoutExpired:server.kill();server.wait()
        browser=read_json(work/'coverage-browser/report.json');projection=read_json(work/'browser-projection-report.json');qa=read_json(work/'coverage/browser-qa.json')
        require(browser['status']=='PASS' and projection['status']=='PASS' and browser['errors']==browser['consoleErrors']==browser['failedResponses']==[] and projection['verified']==projection['classes'] and all(len(v['products'])==len(qa['rows']) for v in browser['viewports']),'FULL_BROWSER_REQUIRED','Every generated flow signature and parameterized field projection required',stage)
        result=dict(status='PASS',flow_signatures=read_json(work/'coverage/runtime-proof.json')['flow_signature_count'],browser_cases=sum(len(v['products']) for v in browser['viewports']),field_projection_classes=projection['classes'],unverified_browser_classes=0,persistence='BROWSER_LOCAL_STORAGE',production=False)
    elif stage=='APP_INTEGRATION_READY':
        for gate in ('FORMAL_IDENTITY','FLOW_REVIEW_AUTHORIZATION','CARRY_FORWARD_UI_ADOPTION','FULL_COVERAGE_MODEL','FULL_COVERAGE_RUNTIME','FULL_COVERAGE_BROWSER'):
            require(read_json(work/(gate+'.json'))['status']=='PASS','INTEGRATION_QA_REQUIRED',gate,stage)
        ci_path=work/'ci-readback.json'
        require(ci_path.is_file(),'EXACT_HEAD_CI_REQUIRED','Import actual GitHub connector runs through the existing CI bridge',stage)
        ci=read_json(ci_path)
        require(ci['status']=='PASS' and ci['repository']==profile['repository'] and ci['head_sha']==contract['native_head'],'EXACT_HEAD_CI_REQUIRED','CI must match this fixed work HEAD',stage)
        result=dict(status='PASS',state='APP_INTEGRATION_READY',APP_INTEGRATION_READY=True,product_id=profile['runtime_ui_adoption']['formal_product_id'],runtime_index_sha256=sha((checkout/profile['runtime_ui_adoption']['formal_index']).read_bytes()),current_exact_head=contract['native_head'],full_window_coverage_gate='PASS',custom_size_coverage_gate='PASS',full_browser_flow_qa_gate='PASS',global_window_selection_flow_gate='PASS',repository_gate='PASS',ci_sha256=sha(ci_path.read_bytes()),persistence='BROWSER_LOCAL_STORAGE',product_master_mutations=0,production_release=False,publication_gate='USER_REVIEW_BEFORE_PUBLICATION')
    elif stage=='UI_ADOPTION_IDENTITY':
        adoption=profile.get('runtime_ui_adoption')
        require(adoption,'UI_ADOPTION_NOT_ADMITTED','Explicit admitted adoption profile required',stage)
        identity=read_json(contract['inputs']['saved_formal_identity']['path'])
        require(identity['status']=='FORMAL_RUNTIME_BYTES_READBACK_PASS','FORMAL_RUNTIME_STORAGE_REQUIRED','Actual saved runtime bytes required',stage)
        formal_index=checkout/adoption['formal_index'];formal=read_json(formal_index)
        for item in identity['files']:
            path=formal_index if item['kind']=='index' else formal_index.parent/formal['products'][0]['path']
            require(item['sha256']==sha(path.read_bytes()) and item['bytes']==len(path.read_bytes()),'FORMAL_RUNTIME_STORAGE_CHANGED','Saved/readback bytes changed',stage)
        require(next(item['file_id'] for item in identity['files'] if item['kind']=='index')==adoption['formal_manifest_file_id'], 'FORMAL_RUNTIME_STORAGE_CHANGED','Registered Drive identity differs',stage)
        run(adoption['validator'],[formal_index,base/'index.json'])
        path=work/'formal-parity.json';run(profile['parity_validator'],[formal_index,path])
        require(read_json(path)['status']=='PASS','FORMAL_PARITY_FAILED','Normal UI runtime must preserve all source handoff cases',stage)
        result=dict(status='PASS',formal_product_id=adoption['formal_product_id'],formal_index_sha256=sha(formal_index.read_bytes()),source_cases=len(master['handoff_tests']),product_master_mutations=0)
    elif stage=='UI_ADOPTION_BROWSER':
        adoption=profile['runtime_ui_adoption'];port=str(adoption['normal_ui_port'])
        env.update(HOST='127.0.0.1',PORT=port,QA_BASE_URL='http://127.0.0.1:'+port,QA_OUTPUT_DIR=str(work/'formal-browser'),
            QA_RUNTIME_QA_CONTRACT=str(checkout/adoption['qa_contract']),QA_EXPECTED_COMMIT=contract['native_head'],SASH_RELEASE_COMMIT_SHA=contract['native_head'])
        if contract.get('playwright_module'):env['QA_PLAYWRIGHT_MODULE']=contract['playwright_module']
        require(not any(env.get(key) for key in ['SASH_CANDIDATE_MODE','SASH_CANDIDATE_RUNTIME_INDEX','VERCEL']),'NORMAL_UI_REQUIRED','Adopted UI must execute the normal manifest loader',stage)
        with (work/'formal-server.log').open('w') as log:
            server=subprocess.Popen([node,str(checkout/'scripts/start-step8-ui.mjs')],cwd=checkout,env=env,stdout=log,stderr=log)
            try:
                import time,urllib.request
                for _ in range(100):
                    require(server.poll() is None,'LOCAL_SERVER_FAILED','Normal UI server did not start',stage)
                    try:
                        with urllib.request.urlopen(env['QA_BASE_URL']+'/api/health',timeout=1) as response:health=json.load(response)
                        if health.get('releaseCommitSha')==contract['native_head']:break
                    except OSError:time.sleep(0.1)
                else:require(False,'LOCAL_SERVER_FAILED','No same-HEAD normal UI health',stage)
                run(profile['browser_script'],[])
            finally:
                server.terminate()
                try:server.wait(timeout=10)
                except subprocess.TimeoutExpired:server.kill();server.wait()
        report=read_json(work/'formal-browser/report.json')
        require(report['status']=='PASS' and report['errors']==[] and {r['width'] for r in report['viewports']}=={1440,768,390},'BROWSER_QA_FAILED','Normal product navigation, flow, save/restore and output required',stage)
        result=dict(status='PASS',cases=sum(len(row['products']) for row in report['viewports']),persistence='BROWSER_LOCAL_STORAGE',production=False)
    elif stage=='UI_ADOPTION':
        for name in ('REVIEW','UI_ADOPTION_IDENTITY','UI_ADOPTION_BROWSER'):
            require(read_json(work/(name+'.json'))['status']=='PASS','ADOPTION_QA_REQUIRED',name,stage)
        result=dict(status='PASS',state='RUNTIME_UI_ADOPTED',formal_product_id=profile['runtime_ui_adoption']['formal_product_id'],human_decision='IMPORTED_EXPLICIT_USER_R3_ADOPTION',
            product_master='COMPLETED_INSPECT_ONLY',APP_INTEGRATION_READY=False,full_coverage='SEPARATE_GATE_REQUIRED',release=False,source_adoption=False)
    elif stage=='REVIEW':
        for name in ('FORMAL_IDENTITY','PROJECTION','FLOW_REVIEW_AUTHORIZATION','PARITY','BROWSER'):
            require(read_json(work/(name+'.json'))['status']=='PASS','QA_REQUIRED',name,stage)
        result=dict(status='PASS',state='RUNTIME_UI_CANDIDATE_QA_REVIEW',product_id=profile['product_id'],
                    index_sha256=sha((base/'index.json').read_bytes()),module_sha256=entry['sha256'],
                    next_gate='FIXED_HUMAN_RUNTIME_UI_ADOPTION',formal_adoption=False,source_adoption=False,release=False,
                    product_master=digest(master),controlled_unresolved=len(projection['confirmation_requests']),persistence='BROWSER_LOCAL_STORAGE')
    else:require(False,'UNKNOWN_STAGE',stage,stage)
    write_json(output,result)


if __name__=='__main__':
    p=argparse.ArgumentParser()
    for key in ('harness-root','contract','stage','work','out'):p.add_argument('--'+key,required=True)
    a=p.parse_args();execute(a.harness_root,a.contract,a.stage,a.work,a.out)
