"""Bind a committed native candidate profile to the single existing v2 workflow."""
import argparse
import json
from pathlib import Path
import subprocess
import sys


def prepare(shared,checkout,captures,destination,instruction):
    shared,checkout,root=map(lambda p:Path(p).resolve(),(shared,checkout,destination));sys.path.insert(0,str(shared))
    from harness.core import read_json,write_json,require,sha
    from harness.architecture import route_instruction
    from harness.current_authority import compatibility
    from harness.production import repository_binding,observation_fingerprint,connector_document
    compatibility(shared,checkout);c=read_json(captures)
    route=route_instruction(shared,{c['repository']:str(checkout)},instruction,c['product_id'])
    require(route['product_id']==c['product_id'] and not root.exists(),'CANDIDATE_WORK_REQUIRED','Use a fresh immutable successor', 'PREPARE')
    def ref(p):
        p=Path(p).resolve();return dict(path=str(p),sha256=sha(p.read_bytes()))
    connection=next(row for row in read_json(checkout/'contracts/production/work-connections.v2.json')['products'] if row['product_id']==c['product_id'])
    selected=connection.get('runtime_candidate_profile')
    require(selected,'NATIVE_RUNTIME_CANDIDATE_PROFILE_REQUIRED','Product has no admitted Runtime/UI candidate profile','PREPARE')
    profile=ref(checkout/selected['path']);p=read_json(profile['path'])
    require(profile['sha256']==selected['sha256'] and p['native_preparer']=='scripts/production/prepare-domain-runtime-candidate.py'
            and p['shared_entrypoint']=='scripts/production-work.py','CANDIDATE_PROFILE_CHANGED','Admitted native profile required','PREPARE')
    validators=read_json(checkout/'contracts/production/validator-registry.v2.json')['products'][c['product_id']]
    require(validators['runtime_candidate_profile']==selected,'CANDIDATE_PROFILE_CHANGED','Native validator admission differs','PREPARE')
    observed={k:read_json(v) for k,v in c['observations'].items()}
    require(connector_document(observed['central_branch'])['commit']['sha']==subprocess.check_output(['git','rev-parse','HEAD'],cwd=shared,text=True).strip(),
            'CURRENT_AUTHORITY_UNVERIFIED','Fresh executing central HEAD required','PREPARE')
    binding=repository_binding(c['repository'],read_json(c['branch']),read_json(c['tree']),{name:checkout/name for name in c['captured_paths']})
    binding.update(checkout=str(checkout),observations={k:observation_fingerprint(v) for k,v in observed.items()})
    root.mkdir(parents=True)
    contract=dict(product_id=c['product_id'],profile=profile,checkout=str(checkout),node=c['node'],
                  inputs={k:ref(v) for k,v in c['inputs'].items()},upstream={**c['upstream'],'spec':ref(c['upstream']['spec'])})
    if c.get('playwright_module'):contract['playwright_module']=c['playwright_module']
    write_json(root/'contract.json',contract);write_json(root/'production-binding.json',binding)
    write_json(root/'live-state.json',dict(repository=read_json(c['branch']),observations=observed))
    steps=[];worker=ref(checkout/p['native_worker'])
    for stage in ('FORMAL_IDENTITY','PROJECTION','PARITY','BROWSER','REVIEW'):
        steps.append(dict(id=stage,kind='validator',needs=[steps[-1]['id']] if steps else [],script=worker,
            args=['--harness-root',str(shared),'--contract','{input}','--stage',stage,'--work','{work}','--out','{work}/'+stage+'.json'],
            output='{work}/'+stage+'.json',result_path=['status'],expected_result='PASS',timeout_seconds=1800))
    for name in ('FORMAL_IDENTITY.json','PROJECTION.json','domain-parity.json','BROWSER.json','browser/report.json','REVIEW.json'):
        steps.append(dict(id='SAVE_'+name.replace('/','_').replace('.','_').replace('-','_').upper(),kind='storage',needs=[steps[-1]['id']],source='{work}/'+name,destination=name))
    workflow=dict(workflow_id='NATIVE_DOMAIN_RUNTIME_CANDIDATE_V1',version='1.0',status='CURRENT',work_skill='product-change-work',steps=steps,
        targets={'RUNTIME_UI_CANDIDATE_QA_REVIEW':[steps[-1]['id']]},scope='LOCAL_SALES_ESTIMATE_REQUEST_UI')
    write_json(root/'workflow.json',workflow)
    authorities=[dict(**ref(path),authority_id=k,authority_type=k,repository='LIVE_DRIVE_SASH_GOVERNANCE',version=c['authority_versions'][k],
        status='ACTIVE',scope_axis='PROJECT_CURRENT',resolution_source='LIVE_CURRENT_INFORMATION_SOURCE_MANIFEST') for k,path in c['authorities'].items()]
    authorities.append(dict(**ref(root/'workflow.json'),authority_id='NATIVE_RUNTIME_UI_WORKFLOW',authority_type='WORKFLOW',repository=c['repository'],version='1.0',status='CURRENT',scope_axis='PROJECT_CURRENT',resolution_source='ADOPTED_NATIVE_PROFILE'))
    write_json(root/'authority-index.json',dict(status='CURRENT',entries=authorities))
    write_json(root/'registry.json',dict(registry_id='NATIVE_FORMAL_RUNTIME_CANDIDATE',version=p['baseline_package_version'],status='CURRENT',products=[dict(product_id=c['product_id'],aliases=[p['series']],master_state='PRESENT',current_revision=p['baseline_package_version'])]))
    refs=[ref(checkout/name) for name in p['native_paths']]+list(contract['inputs'].values())+[contract['upstream']['spec']]+[ref(shared/name) for name in ('registries/current-architecture.v2.json','registries/skill-authority.v2.json')]
    spec=dict(workflow_id=c['work_id'],work_skill='product-change-work',target=c['product_id'],target_gate='RUNTIME_UI_CANDIDATE_QA_REVIEW',skill_root=str(checkout/'scripts/production'),
        authority_index=ref(root/'authority-index.json'),authorities=authorities,registry=ref(root/'registry.json'),sources=c['sources'],workflow=ref(root/'workflow.json'),input=ref(root/'contract.json'),
        runtime_refs=refs,storage_root=c['storage_root'],production_binding=ref(root/'production-binding.json'),production_routing=ref(checkout/'contracts/production/work-connections.v2.json'))
    write_json(root/'spec.json',spec)
    return dict(status='PREPARED',spec=str(root/'spec.json'),target_gate=spec['target_gate'],formal_adoption=False,release=False)


if __name__=='__main__':
    p=argparse.ArgumentParser()
    for key in ('harness-root','checkout','captures','destination','instruction'):p.add_argument('--'+key,required=True)
    a=p.parse_args();print(json.dumps(prepare(a.harness_root,a.checkout,a.captures,a.destination,a.instruction),ensure_ascii=False,indent=2))
