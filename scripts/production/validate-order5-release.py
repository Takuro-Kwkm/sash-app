"""Native byte guard. Shared Harness owns Decisions, CI, Work, resume and publication."""
import hashlib,json,subprocess,sys
from pathlib import Path
def validate(root):
 root=Path(root)
 scope=json.loads((root/'contracts/production/order5-release-scope.v1.json').read_text())
 assets=json.loads((root/'contracts/production/order5-assets.v1.json').read_text())
 profile=json.loads((root/'contracts/production/release-profile.v1.json').read_text())
 def digest(b):return hashlib.sha256(b).hexdigest()
 def git(*args):return subprocess.check_output(['git',*args],cwd=root,stderr=subprocess.PIPE)
 errors=[]
 try:
  assert scope['starting_main']=='c46fc42319ef711e20497beba9f4cc49a2e2c75b' and set(scope['allowed_paths'])=={'contracts/production/order5-ew-assets/PackageManifest.json', 'contracts/production/order5-ew-assets/PRODUCT_MASTER_MANIFEST.json', 'contracts/production/current-authority-successor.json', 'contracts/production/authority-successors/order5-batch1-predecessor-selection.v1.json', 'contracts/production/shared-release-authority.v1.bundle', 'contracts/production/shared-release-authority.v1.json', 'scripts/production/validate-order5-release.py', 'contracts/production/authority-successors/order5-batch1.v4.json', 'contracts/production/authority-successors/order5-batch1-predecessor-profile.v1.json', 'test/browser/ew-october-2026-browser-qa.mjs', 'contracts/production/order5-ew-assets/content-qa.json', 'contracts/production/order5-ew-assets/source-identity.json', 'docs/ORDER5_BATCH1.md', 'contracts/production/release-profile.v1.json', 'contracts/production/order5-assets.v1.json', 'contracts/production/order5-ew-assets/selection-scope.json', '.github/workflows/common-release-contract.yml', 'contracts/production/order5-release-scope.v1.json'},'ORDER5_SCOPE_IDENTITY'
  assert scope['schema']=='ORDER5_NATIVE_CONNECTION_SCOPE_V1' and scope['product_fact_mutation_allowed'] is False
  assert assets['product_id']==scope['product_id']==profile['scope_admission']['product_id']
  assert assets['scope']==scope['scope']==profile['scope_admission']['scope']
  assert 'conditional_release_policy' not in profile,'EXPIRED_ORDER4_APPROVAL'
  names=git('ls-tree','-rz','--name-only',scope['starting_main']).decode().split('\0')[:-1]
  expected={p:digest(git('show',scope['starting_main']+':'+p)) for p in names if p not in scope['allowed_paths']}
  assert expected==scope['protected_sha256'],'INCOMPLETE_NATIVE_PROTECTION'
  assert profile['publication_policy']['protected_files']==expected,'PUBLICATION_PROTECTION_CHANGED'
  for p,h in expected.items():
   f=root/p
   if not f.is_file() or f.is_symlink() or digest(f.read_bytes())!=h:errors.append('PROTECTED_DRIFT:'+p)
  changed=git('diff','--name-only',scope['starting_main']).decode().splitlines()+git('ls-files','--others','--exclude-standard').decode().splitlines()
  if any(p not in scope['allowed_paths'] for p in changed):errors.append('UNAUTHORIZED_NATIVE_PATH')
  for name,asset in assets['assets'].items():
   assert digest((root/asset['path']).read_bytes())==asset['sha256'],name
   assert {k:v for k,v in asset.items() if k!='path'}==profile['scope_admission']['asset_identities'][name],name
 except (AssertionError,OSError,KeyError,ValueError,subprocess.CalledProcessError) as e:errors.append(str(e))
 result={'status':'FAIL_CLOSED' if errors else 'PASS','product_id':scope['product_id'],'scope':scope['scope'],'protected_files':len(scope['protected_sha256']),'errors':errors,'product_fact_mutations':0,'deployment':'NOT_EXECUTED','human_decision':'NEW_FIXED_PACKET_REQUIRED'}
 return result
if __name__=='__main__':
 result=validate(Path(__file__).resolve().parents[2]);print(json.dumps(result));sys.exit(2 if result['status']!='PASS' else 0)
