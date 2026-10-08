"""Fixed native byte boundary only; Shared owns Work and Release execution."""
import hashlib,json,subprocess,sys
from pathlib import Path
BASELINE='866b98bab41c090e2ed62d9d1e2dd9989670d2a6'
SCOPE='ORDER4_SASH_STAGED_PUBLICATION_V1'
ALLOWED={'contracts/production/shared-release-authority.v1.json', 'contracts/production/current-authority-successor.json', 'scripts/production/validate-current-authority-successor.py', 'test/browser/eight-series-business-flow-qa.mjs', '.github/workflows/app-production-hotfix.yml', 'contracts/production/authority-successors/order4-predecessor-release-profile.v1.json', 'contracts/production/order4-release-scope.v1.json', '.github/workflows/common-release-contract.yml', 'scripts/vercel-rest-deploy.mjs', 'docs/ORDER4_RELEASE.md', 'contracts/production/release-profile.v1.json', 'test/vercel-staged-executor.test.mjs', 'scripts/production/validate-order4-release.py', 'scripts/production/unpack-release-authority.py', 'contracts/production/authority-successors/order4-release-enforcement.v3.json', 'contracts/production/shared-release-authority.v1.bundle', '.github/workflows/tw-production-finalize.yml', 'test/browser/release-regression-browser-qa.mjs', 'scripts/production/release-contract.py', 'contracts/production/authority-successors/order4-predecessor-selection.v1.json'}
def git(root,*args):return subprocess.check_output(['git',*args],cwd=root,stderr=subprocess.PIPE)
def digest(data):return hashlib.sha256(data).hexdigest()
def validate(root):
 root=Path(root);doc=json.loads((root/'contracts/production/order4-release-scope.v1.json').read_bytes());errors=[]
 if doc.get('starting_main')!=BASELINE or doc.get('scope_id')!=SCOPE or doc.get('product_fact_mutation_allowed') is not False or set(doc.get('allowed_paths',[]))!=ALLOWED:
  return {'status':'FAIL_CLOSED','errors':['ORDER4_SCOPE_IDENTITY']}
 names=git(root,'ls-tree','-rz','--name-only',BASELINE).decode().split('\0')[:-1]
 expected={p:digest(git(root,'show',BASELINE+':'+p)) for p in names if p not in ALLOWED}
 if doc.get('protected_sha256')!=expected:errors.append('ORDER4_PROTECTION_INCOMPLETE')
 for p,h in expected.items():
  file=root/p
  if not file.is_file() or file.is_symlink() or digest(file.read_bytes())!=h:errors.append('ORDER4_PROTECTED_DRIFT:'+p)
 changed=git(root,'diff','--name-only',BASELINE).decode().splitlines()+git(root,'ls-files','--others','--exclude-standard').decode().splitlines()
 if any(p not in ALLOWED for p in changed):errors.append('ORDER4_UNAUTHORIZED_PATH')
 return {'status':'PASS' if not errors else 'FAIL_CLOSED','errors':errors,'protected_files':len(expected),'product_runtime_ui_mutations':0 if not errors else 'BLOCKED'}
if __name__=='__main__':
 try:result=validate(Path(__file__).resolve().parents[2])
 except (OSError,ValueError,KeyError,TypeError,subprocess.CalledProcessError) as error:result={'status':'FAIL_CLOSED','errors':[str(error)]}
 print(json.dumps(result));sys.exit(0 if result['status']=='PASS' else 2)
