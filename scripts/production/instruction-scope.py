"""Documentation-only successor. Inspect the original native guard; run no Work."""
import argparse
import hashlib
import importlib.util
import io
import json
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

BASE = '3f9f1668c92dd2dbb1561ced681158d2c53bbeab'
SCOPE = 'contracts/production/harness-instructions-scope.v1.json'
ALLOWED = {
    '.github/workflows/new-product-actual-build.yml',
    '.github/workflows/harness-instructions.yml','scripts/production/new-product-environment-scope.py', 'contracts/production/harness-instructions-scope.v1.json', 'scripts/production/instruction-scope.py', 'AGENTS.md', 'scripts/production/test_instruction_scope.py'}

def digest(data): return hashlib.sha256(data).hexdigest()
def git(root, *args): return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.PIPE)

def verify(root):
    root = Path(root).resolve()
    record = root/SCOPE
    assert not record.is_symlink(), 'SYMLINKED_SCOPE'
    scope = json.loads(record.read_bytes())
    assert scope['schema'] == 'HARNESS_INSTRUCTIONS_ONLY_V1' and scope['starting_main'] == BASE, 'SCOPE_IDENTITY'
    assert scope['product_work_mutation_allowed'] is False and set(scope['allowed_paths']) == ALLOWED, 'SCOPE_EXPANSION'
    with tarfile.open(fileobj=io.BytesIO(git(root, 'archive', BASE))) as archive:
        before = {m.name: archive.extractfile(m).read() for m in archive if m.isfile()}
    protected = {p:digest(b) for p,b in before.items() if p not in ALLOWED}
    assert scope['protected_sha256'] == protected, 'INCOMPLETE_PROTECTION'
    assert set(scope['candidate_sha256']) == ALLOWED-{SCOPE}, 'INCOMPLETE_CANDIDATE'
    for path, expected in {**protected, **scope['candidate_sha256']}.items():
        file = root/path
        assert file.is_file() and not file.is_symlink() and digest(file.read_bytes()) == expected, 'BYTE_DRIFT:'+path
    changed = set(git(root, 'diff', '--name-only', BASE).decode().splitlines())
    changed.update(git(root, 'ls-files', '--others', '--exclude-standard').decode().splitlines())
    assert changed <= ALLOWED, 'OUT_OF_SCOPE:'+','.join(sorted(changed-ALLOWED))
    return {'status':'PASS', 'errors':[], 'scope':'HARNESS_INSTRUCTIONS_ONLY',
        'authorized_paths':sorted(ALLOWED), 'verified_unchanged_sha256':protected,
        'protected_files':len(protected), 'completed_work':'INSPECT_ONLY',
        'product_work_mutations':0, 'deployment':'NOT_EXECUTED'}

def materialize(root, destination):
    root, destination = Path(root).resolve(), Path(destination).resolve()
    assert not destination.exists() and not destination.is_relative_to(root), 'ISOLATED_DESTINATION_REQUIRED'
    subprocess.run(['git','clone','--quiet','--shared','--dissociate',str(root),str(destination)],check=True)
    subprocess.run(['git','-C',str(destination),'checkout','--quiet','--detach',BASE],check=True)

def validate(root):
    if (Path(root)/'contracts/production/giesta2-formal-scope.v1.json').exists():
        definition=importlib.util.spec_from_file_location('formal_scope',Path(root)/'scripts/production/formal-connection-scope.py')
        module=importlib.util.module_from_spec(definition);definition.loader.exec_module(module)
        return module.validate(root)
    try:
        if (Path(root)/'contracts/production/working-master-sales-scope.v1.json').exists():
            file=Path(root)/'scripts/production/native-change-scope.py'
            definition=importlib.util.spec_from_file_location('working_sales_native_guard',file)
            module=importlib.util.module_from_spec(definition);definition.loader.exec_module(module)
            return module.validate(root)
        result = verify(root)
        with tempfile.TemporaryDirectory(prefix='instruction-inspect-') as directory:
            baseline = Path(directory)/'native'
            materialize(root, baseline)
            file = baseline/'scripts/production/auth-cooldown-scope.py' if (baseline/'contracts/production/auth-cooldown-scope.v1.json').exists() else baseline/'scripts/production/new-product-environment-scope.py'
            spec = importlib.util.spec_from_file_location('sealed_instruction_guard',file)
            module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
            assert module.validate(baseline)['status'] == 'PASS', 'PREDECESSOR_GUARD_FAILED'
        return result
    except (AssertionError,OSError,ValueError,KeyError,TypeError,subprocess.CalledProcessError) as error:
        return {'status':'FAIL_CLOSED','errors':[str(error)],'authorized_paths':[],
            'verified_unchanged_sha256':{},'product_work_mutations':0,'deployment':'NOT_EXECUTED'}

def delegate_cli(root, entry, arguments):
    result = validate(root)
    if result['status'] != 'PASS':
        print(json.dumps(result)); return 2
    with tempfile.TemporaryDirectory(prefix='instruction-original-cli-') as directory:
        baseline = Path(directory)/'native'
        materialize(root, baseline)
        relative = Path(entry).resolve().relative_to(Path(root).resolve())
        return subprocess.run([sys.executable,'-B',str(baseline/relative),*arguments],cwd=baseline).returncode

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__);parser.add_argument('--parent')
    args = parser.parse_args(); root = Path(__file__).resolve().parents[2]
    result = validate(root)
    if result['status']=='PASS' and args.parent:
        materialize(root, args.parent);result['inspection_parent']=args.parent
    print(json.dumps({k:v for k,v in result.items() if k not in ('authorized_paths','verified_unchanged_sha256')}))
    raise SystemExit(0 if result['status']=='PASS' else 2)
