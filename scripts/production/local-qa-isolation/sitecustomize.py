import os,sys,json
from pathlib import Path
value=os.environ.get('STAGING_TEST_TRANSPORT')
if value:
    manifest=json.loads(Path(json.loads(Path(value).read_text())['manifest']['path']).read_text())
    forbidden={os.path.abspath(o['original_ref']) for o in manifest['objects']}
    forbidden |= {os.path.realpath(p) for p in forbidden}
    def guard(event,args):
        if event=='open' and args and isinstance(args[0],(str,bytes)):
            path=os.path.abspath(os.fsdecode(args[0]))
            if path in forbidden:
                raise FileNotFoundError('TEST_ISOLATION: historical host original unavailable')
    sys.addaudithook(guard)
    os.environ['STAGING_ORIGINAL_PATH_GUARD']='ACTIVE'
