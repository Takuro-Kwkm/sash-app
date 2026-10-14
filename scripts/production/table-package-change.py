"""Native table/XLSX validation only. Shared v2 owns gates, Decisions and storage."""
import argparse, importlib.util, json, subprocess, sys, zipfile
from pathlib import Path

def run(stage, contract, work, shared):
    sys.path.insert(0,str(shared))
    from harness.core import read_json, require, sha, fingerprint
    from harness.changed_path import checked_bytes, validate_plan
    from harness.production import native_registry
    c=read_json(contract); checkout=Path(c['checkout']);p=read_json(c['profile']['path'])
    checked_bytes(c['profile'])
    connection=next(x for x in read_json(checkout/'contracts/production/work-connections.v2.json')['products'] if x['product_id']==p['product_id'])
    require(connection['native_change_profile']=={'path':str(Path(c['profile']['path']).relative_to(checkout)), 'sha256':c['profile']['sha256']},'NATIVE_PROFILE_CHANGED','Native profile is not the admitted bytes',stage)
    result={'status':'PASS','stage':stage,'product_id':p['product_id'],'scope':p['scope']}
    if stage=='CURRENT_FORMAL_RESOLUTION':
        row=native_registry(read_json(c['registry_response']['path']),p['manufacturer'],p['series'])
        require(row==c['registry_before'] and row['package_version']==p['baseline_revision'],'NATIVE_FORMAL_DRIFT','Current row differs',stage)
        manifest=json.loads(checked_bytes(c['runtime_manifest']))
        require(manifest['package_version']==p['baseline_revision'],'NATIVE_FORMAL_DRIFT','Current manifest differs',stage)
        for item in c['components']:
            data=checked_bytes(item['live_baseline']); require(sha(data)==item['baseline']['sha256'],'BASELINE_DRIFT',item['id'],stage)
            checked_bytes(item['baseline'])
        result['baseline_revision']=p['baseline_revision']
    elif stage=='SOURCE_AND_SCOPE':
        for ref in c['sources']+c['reviews']+c['governance']: checked_bytes(ref)
        require(c['source_scope']['adoption_mode']=='REVIEWED_CLAIMS_ONLY' and c['source_scope']['whole_catalogue_adoption'] is False,'SOURCE_SCOPE_EXPANDED','No blanket catalogue adoption',stage)
        require(c['formal_scope']['runtime_scope']=='NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL' and c['formal_scope']['automatic_price'] is False and c['formal_scope']['automatic_manufacturing'] is False,'FORMAL_SCOPE_EXPANDED','Keep integration and automation separate',stage)
        result['source_scope']=c['source_scope'];result['formal_scope']=c['formal_scope']
    elif stage=='AUTHORING_AND_DEPENDENCY_QA':
        import openpyxl
        loader=importlib.util.spec_from_file_location('table_compiler',checkout/'scripts/production/compile-table-projection.py');compiler=importlib.util.module_from_spec(loader);loader.loader.exec_module(compiler)
        counts={'workbooks':0,'cells':0,'modules':0}
        index=json.loads(checked_bytes(c['runtime_index']))
        require(len(index['products'])==len(c['components']),'COMPONENT_SET_CHANGED','All components required',stage)
        require(len({x['id'] for x in c['components']})==len(c['components']) and set(p['components'])=={x['id'] for x in c['components']},'COMPONENT_SET_CHANGED','Duplicate or missing native component',stage)
        for item in c['components']:
            entry=next(x for x in index['products'] if x['id']==p['runtime_product_ids'][item['id']])
            require(item['module']['sha256']==entry['sha256'],'MODULE_IDENTITY_CHANGED',item['id'],stage)
            checked_bytes(item['authoring']);data=json.loads(checked_bytes(item['table_data']));module=json.loads(checked_bytes(item['module']));projection=json.loads(checked_bytes(item['projection']))
            with zipfile.ZipFile(item['authoring']['path']) as z: require(z.testzip() is None,'AUTHORING_CORRUPT',item['id'],stage)
            wb=openpyxl.load_workbook(item['authoring']['path'],read_only=True,data_only=True)
            for sheet,table in data['tables'].items():
                rows=table['values'];observed=list(wb[sheet].iter_rows(min_row=1,max_row=len(rows),max_col=max(map(len,rows)),values_only=True))
                for i,row in enumerate(rows):
                    for j,value in enumerate(row):
                        require(observed[i][j]==value or observed[i][j] is None and value=='','AUTHORING_PARITY',f"{item['id']}:{sheet}:{i+1}:{j+1}",stage);counts['cells']+=1
            wb.close();compiled=compiler.compile_profile(projection,checkout/p['table_root'])
            require(compiled==module,'MODULE_PARITY',item['id'],stage)
            require(module['pricing']=={'price':None,'bom':None,'set_code':None} and module['formal_adoption'] is False,'CANDIDATE_PROMOTED_EARLY',item['id'],stage)
            require(all(v.get('evidenceIds') and v.get('displayLabel') for v in module['product_module']['allowedValues']),'EVIDENCE_MISSING',item['id'],stage)
            counts['workbooks']+=1;counts['modules']+=1
        for argv in p['validation_commands']:
            x=subprocess.run(argv,cwd=checkout,text=True,capture_output=True,timeout=240)
            require(x.returncode==0,'NATIVE_VALIDATOR_FAILURE',(x.stdout+x.stderr)[-1500:],stage)
        result['validated']=counts
    elif stage=='FORMAL_REVIEW':
        for item in c['review_artifacts']:checked_bytes(item)
        plan=json.loads(checked_bytes(c['formal_plan']))
        result.update(candidate_revision=p['candidate_revision'],baseline_revision=p['baseline_revision'],
            proposed_formal_plan_sha256=validate_plan(plan),formal_scope=c['formal_scope'],source_scope=c['source_scope'],
            candidate_artifacts=c['review_artifacts'],native_storage_requests=c['native_storage_requests'],
            registry_before=c['registry_before'],registry_after=plan['native_registry_after'],
            downstream_plan=c['downstream_plan'],qa=read_json(Path(work)/'AUTHORING_AND_DEPENDENCY_QA.json'),
            human_decision='NOT_ACCEPTED',formal_adoption=False)
        result['payload_sha256']=fingerprint(result)
    else:raise ValueError('Unsupported native stage '+stage)
    return result

if __name__=='__main__':
    a=argparse.ArgumentParser()
    for k in ['stage','contract','work','out','harness-root']:a.add_argument('--'+k,required=True)
    o=a.parse_args();sys.path.insert(0,o.harness_root)
    from harness.core import write_json,Blocked
    try:r=run(o.stage,o.contract,o.work,Path(o.harness_root))
    except (Blocked,OSError,ValueError,KeyError,StopIteration) as e:r={'status':'FAIL','blocking_reason':getattr(e,'data',{'reason':str(e)})}
    write_json(o.out,r)
