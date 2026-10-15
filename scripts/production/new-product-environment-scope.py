"""Load the pinned shared infrastructure guard; never run product Work."""
import argparse,importlib.util,json,os,subprocess,sys,tempfile
from pathlib import Path

def validate(root):
    if (Path(root)/'contracts/production/harness-instructions-scope.v1.json').exists():
        definition=importlib.util.spec_from_file_location('instruction_scope',Path(root)/'scripts/production/instruction-scope.py')
        module=importlib.util.module_from_spec(definition);definition.loader.exec_module(module)
        return module.validate(root)
    root=Path(root).resolve()
    if (root/'contracts/production/native-change-scope.v1.json').exists():
        definition=importlib.util.spec_from_file_location('current_native_scope',root/'scripts/production/native-change-scope.py')
        module=importlib.util.module_from_spec(definition);definition.loader.exec_module(module)
        return module.validate(root)
    with tempfile.TemporaryDirectory(prefix='new-product-scope-') as directory:
        central=Path(directory)/'shared'
        result=subprocess.run([sys.executable,'-B',str(root/'scripts/production/unpack-release-authority.py'),str(central)],capture_output=True,text=True)
        if result.returncode:
            return {'status':'FAIL_CLOSED','errors':['NEW_PRODUCT_SCOPE_ACQUISITION:'+result.stdout+result.stderr],'authorized_paths':[],'verified_unchanged_sha256':{}}
        spec=importlib.util.spec_from_file_location('new_product_guard',central/'scripts/verify-new-product-native-scope.py')
        guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)
        return guard.validate(root)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--predecessor')
    args=parser.parse_args();root=Path(__file__).resolve().parents[2]
    result=validate(root)
    if result['status']=='PASS' and args.predecessor:
        destination=Path(args.predecessor).resolve()
        if destination.exists() or destination.is_relative_to(root):raise ValueError('Isolated new predecessor destination required')
        scope=json.loads((root/'contracts/production/new-product-environment-scope.v1.json').read_text())
        subprocess.run(['git','clone','--quiet','--shared','--dissociate',str(root),str(destination)],check=True)
        subprocess.run(['git','checkout','--quiet','--detach',scope['starting_main']],cwd=destination,check=True)
        result.update(predecessor=str(destination),inspection='INSPECT_ONLY; NO_WORK_REPLAY')
    print(json.dumps({k:v for k,v in result.items() if k not in ('authorized_paths','verified_unchanged_sha256')}));return 0 if result['status']=='PASS' else 2
if __name__=='__main__' and (Path(__file__).resolve().parents[2]/'contracts/production/harness-instructions-scope.v1.json').exists():
    definition=importlib.util.spec_from_file_location('instruction_cli',Path(__file__).with_name('instruction-scope.py'))
    module=importlib.util.module_from_spec(definition);definition.loader.exec_module(module)
    raise SystemExit(module.delegate_cli(Path(__file__).resolve().parents[2],__file__,sys.argv[1:]))
if __name__=='__main__':raise SystemExit(main())
