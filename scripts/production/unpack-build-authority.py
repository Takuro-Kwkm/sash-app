"""Readback the exact adopted Central dependency for isolated CI only."""
import hashlib,json,tarfile,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
manifest=json.loads((root/'contracts/production/shared-build-authority.json').read_text())
archive=root/'contracts/production/shared-build-authority.tar.gz'
assert hashlib.sha256(archive.read_bytes()).hexdigest()==manifest['archive_sha256']
dest=Path(sys.argv[1]).resolve();dest.mkdir(parents=True,exist_ok=False)
with tarfile.open(archive,'r:gz') as tar:
    assert {m.name for m in tar.getmembers()}==set(manifest['member_sha256'])
    assert all(m.isfile() and not Path(m.name).is_absolute() and '..' not in Path(m.name).parts for m in tar.getmembers())
    tar.extractall(dest,filter='data')
for p,h in manifest['member_sha256'].items():assert hashlib.sha256((dest/p).read_bytes()).hexdigest()==h
sys.path.insert(0,str(dest))
from harness.current_authority import compatibility
assert compatibility(dest,root)['status']=='PASS'
print(json.dumps({'status':'PASS','source_commit':manifest['source_commit'],'archive_sha256':manifest['archive_sha256']}))
