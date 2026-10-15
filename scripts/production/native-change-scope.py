"""Inspect the sealed predecessor; validate only this immutable successor scope."""
import hashlib, io, json, subprocess, tarfile
from pathlib import Path

SCOPE_PATH = 'contracts/production/native-change-scope.v1.json'
def digest(data): return hashlib.sha256(data).hexdigest()
def git(root, *args): return subprocess.check_output(['git', *args], cwd=root, stderr=subprocess.PIPE)
def snapshot(root, revision):
    with tarfile.open(fileobj=io.BytesIO(git(root, 'archive', revision))) as archive:
        return {m.name: archive.extractfile(m).read() for m in archive if m.isfile()}

def validate(root):
    if SCOPE_PATH == 'contracts/production/native-change-scope.v1.json' and (Path(root)/'contracts/production/giesta2-formal-scope.v1.json').exists():
        import importlib.util
        spec=importlib.util.spec_from_file_location('formal_scope',Path(root)/'scripts/production/formal-connection-scope.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        return module.validate(root)
    root=Path(root); errors=[]
    try:
        s=json.loads((root/SCOPE_PATH).read_bytes())
        assert s['schema']=='NATIVE_IMMUTABLE_CHANGE_SCOPE_V1' and s['formal_writes_before_human'] is False, 'SCOPE_IDENTITY'
        before=snapshot(root,s['baseline_commit']); allowed=set(s['allowed_paths'])
        protected={p:digest(b) for p,b in before.items() if p not in allowed}
        assert s['protected_sha256']==protected, 'INCOMPLETE_PROTECTION'
        for p,h in protected.items():
            f=root/p
            assert f.is_file() and not f.is_symlink() and digest(f.read_bytes())==h, 'PROTECTED_DRIFT:'+p
        changed=set(git(root,'diff','--name-only',s['baseline_commit']).decode().splitlines())
        changed.update(git(root,'ls-files','--others','--exclude-standard').decode().splitlines())
        assert changed<=allowed, 'OUT_OF_SCOPE:'+','.join(sorted(changed-allowed))
        assert set(s['candidate_sha256'])==allowed-set(s['cyclic_paths']), 'CANDIDATE_PIN_SET'
        for p,h in s['candidate_sha256'].items():
            assert not (root/p).is_symlink() and digest((root/p).read_bytes())==h, 'CANDIDATE_DRIFT:'+p
        # Completed infrastructure Work is inspected at its actual merged revision.
        # Never apply its whole-repository change allowlist to a later product Work.
        old=snapshot(root,s['completed_work']['commit'])
        scope=json.loads(old[s['completed_work']['scope_path']])
        assert digest(old[s['completed_work']['scope_path']])==s['completed_work']['scope_sha256'], 'SEALED_SCOPE_DRIFT'
        pins=scope.get('candidate_files_sha256',scope.get('candidate_sha256'))
        assert isinstance(pins,dict) and pins, 'SEALED_CANDIDATE_PINS_REQUIRED'
        for p,h in {**scope['protected_sha256'],**pins}.items():
            assert digest(old[p])==h, 'SEALED_WORK_DRIFT:'+p
        return {'status':'PASS','scope':s['scope_id'],'protected_files':len(protected),
                'completed_work':'INSPECT_ONLY','formal_mutations':0,'release':'NOT_EXECUTED'}
    except (AssertionError,OSError,KeyError,ValueError,subprocess.CalledProcessError) as e:
        errors.append(str(e))
    return {'status':'FAIL_CLOSED','errors':errors,'formal_mutations':0}

if __name__=='__main__':
    import sys
    result=validate(Path(__file__).resolve().parents[2]);print(json.dumps(result))
    sys.exit(0 if result['status']=='PASS' else 2)
