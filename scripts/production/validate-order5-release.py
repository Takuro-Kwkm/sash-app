"""Fixed native EW output bytes; the Shared Harness owns Decisions and publication."""
import hashlib,json,subprocess,sys
from pathlib import Path
ALLOWED={'contracts/production/order5-release-scope.v2.json', 'contracts/production/order5-ew-assets/selection-scope.json', 'test/74-estimate-output.test.mjs', 'scripts/production/release-contract.py', 'contracts/production/authority-successors/order5-ew-output-predecessor-profile.v1.json', 'contracts/production/order5-ew-assets/content-qa.json', 'contracts/production/order5-assets.v1.json', 'contracts/production/shared-release-authority.v1.bundle', 'contracts/production/current-authority-successor.json', 'contracts/production/work-connections.v2.json', 'contracts/production/order5-assets.v2.json', 'contracts/production/order5-ew-output.v2.json', 'contracts/production/order5-ew-assets/source-identity.json', 'contracts/production/authority-successors/order5-ew-output-predecessor-selection.v1.json', 'scripts/production/ew-change.py', '.github/workflows/common-release-contract.yml', 'contracts/production/authority-successors/order5-batch1-predecessor-profile.v1.json', 'test/browser/ew-october-2026-browser-qa.mjs', 'contracts/production/order5-ew-assets/PackageManifest.json', 'docs/ORDER5_BATCH1.md', 'contracts/production/shared-release-authority.v1.json', 'contracts/production/authority-successors/order5-batch1-predecessor-selection.v1.json', 'contracts/production/authority-successors/order5-ew-output.v4.json', 'src/estimate-output/xlsx-renderer.mjs', 'scripts/production/validate-order5-release.py', 'scripts/production/prepare-ew.py', '.github/workflows/ew-output-successor.yml', 'scripts/production/test_ew_output_successor.py', 'contracts/production/authority-successors/order5-batch1.v4.json', 'contracts/production/order5-ew-assets/PRODUCT_MASTER_MANIFEST.json', 'contracts/production/validator-registry.v2.json', 'contracts/production/release-profile.v1.json', 'contracts/production/order5-release-scope.v1.json'}
def validate(root):
 root=Path(root);errors=[];digest=lambda b:hashlib.sha256(b).hexdigest()
 def git(*args):return subprocess.check_output(['git',*args],cwd=root,stderr=subprocess.PIPE)
 try:
  profile=json.loads((root/'contracts/production/release-profile.v1.json').read_bytes());scope=json.loads((root/profile['scope_admission']['scope_guard']).read_bytes());assets=json.loads((root/'contracts/production/order5-assets.v2.json').read_bytes());output=json.loads((root/'contracts/production/order5-ew-output.v2.json').read_bytes())
  assert scope['schema']=='ORDER5_NATIVE_OUTPUT_SCOPE_V2' and scope['starting_main']=='c46fc42319ef711e20497beba9f4cc49a2e2c75b' and set(scope['allowed_paths'])==ALLOWED,'ORDER5_SCOPE_IDENTITY'
  assert scope['scope']==assets['scope']==profile['scope_admission']['scope']==output['scope']=='EW_NORMAL_29_FIELDS_XLSX_ORDER5_BATCH1_V2' and scope['product_fact_mutation_allowed'] is False
  assert scope['product_id']==assets['product_id']==profile['scope_admission']['product_id']==output['product_id']=='SER-LIX-EW'
  assert output['schema']=='EW_OUTPUT_SUCCESSOR_V1' and output['product_fact_mutation_allowed'] is False and output['predecessor_commit']=='8540167f0fc49f03a88f94b11e6fba8dd9314102'
  assert profile['scope_admission']['mode']=='REVIEWED_UI_OUTPUT_SUCCESSOR_V1' and 'conditional_release_policy' not in profile
  names=git('ls-tree','-rz','--name-only',scope['starting_main']).decode().split('\0')[:-1]
  expected={p:digest(git('show',scope['starting_main']+':'+p)) for p in names if p not in ALLOWED}
  assert expected==scope['protected_sha256']==profile['publication_policy']['protected_files'],'INCOMPLETE_NATIVE_PROTECTION'
  for p,h in expected.items():
   f=root/p
   if not f.is_file() or f.is_symlink() or digest(f.read_bytes())!=h:errors.append('PROTECTED_DRIFT:'+p)
  changed=git('diff','--name-only','-z',scope['starting_main']).decode().split('\0')[:-1]+git('ls-files','--others','--exclude-standard','-z').decode().split('\0')[:-1]
  assert set(changed)<=ALLOWED,'UNAUTHORIZED_NATIVE_PATH'
  paths={'src/estimate-output/xlsx-renderer.mjs','test/74-estimate-output.test.mjs'}
  assert set(output['changes'])==paths
  for p,d in output['changes'].items():
   assert d['before_sha256']==digest(git('show',output['predecessor_commit']+':'+p)) and d['after_sha256']==digest((root/p).read_bytes()),'OUTPUT_CANDIDATE_BYTES'
  prior=json.loads(git('show',output['predecessor_commit']+':contracts/production/order5-assets.v1.json'))
  assert (root/'contracts/production/order5-assets.v1.json').read_bytes()==git('show',output['predecessor_commit']+':contracts/production/order5-assets.v1.json')
  for name,asset in assets['assets'].items():
   assert digest((root/asset['path']).read_bytes())==asset['sha256']
   assert {k:v for k,v in asset.items() if k!='path'}==profile['scope_admission']['asset_identities'][name]
   if name!='UI':assert asset==prior['assets'][name],'FORMAL_RUNTIME_FACT_DRIFT'
  assert assets['assets']['UI']['path']=='src/estimate-output/xlsx-renderer.mjs' and assets['assets']['UI']['version']==output['ui_asset_version']
  assert profile['scope_admission']['predecessor_asset_identities']=={k:{f:v for f,v in a.items() if f!='path'} for k,a in prior['assets'].items()}
 except (AssertionError,OSError,KeyError,ValueError,subprocess.CalledProcessError) as e:errors.append(str(e))
 return {'status':'FAIL_CLOSED' if errors else 'PASS','product_id':'SER-LIX-EW','scope':'EW_NORMAL_29_FIELDS_XLSX_ORDER5_BATCH1_V2','protected_files':len(expected) if 'expected' in locals() else 0,'errors':errors,'product_fact_mutations':0,'deployment':'NOT_EXECUTED','human_decision':'NEW_UI_OUTPUT_RELEASE_REQUIRED'}
if __name__=='__main__':
 result=validate(Path(__file__).resolve().parents[2]);print(json.dumps(result));sys.exit(0 if result['status']=='PASS' else 2)
