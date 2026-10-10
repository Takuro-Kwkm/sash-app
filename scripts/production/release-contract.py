#!/usr/bin/env python3
"""Native acquisition/preflight and delegation; no second release engine."""
import argparse, hashlib, json, re, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser()
p.add_argument('--central')
p.add_argument('--check',action='store_true')
p.add_argument('args',nargs=argparse.REMAINDER)
a=p.parse_args()
def main():
 doc=json.loads((ROOT/'contracts/production/release-profile.v1.json').read_text())
 assert doc['status']=='CURRENT' and doc['schema']=='NATIVE_RELEASE_PROFILE_V1'
 assert doc['repository']=='Takuro-Kwkm/sash-app'
 assert re.fullmatch('[0-9a-f]{40}',doc['shared_contract']['ref'])
 assert doc['terminal_policy'].startswith('INSPECT_ONLY')
 assert all((ROOT/path).is_file() for path in doc['native_paths'])
 assert set(doc['native_files'])==set(doc['native_paths'])
 for name,digest in doc['native_files'].items():
  assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest,name
 assert doc['minimum_qa'] and doc['mandatory_approvals']==['Release']
 assert doc['shared_contract']['files']
 admission=doc.get('scope_admission')
 assert admission and admission['mode']=='INFRASTRUCTURE_RELEASE_SAME_BYTES'
 assert admission['product_fact_mutation_allowed'] is False
 assert admission['product_id']=='SER-LIX-SAMOSL' and admission['scope']=='THERMOSL_UNCHANGED_FORMAL_SELECTION_SAVE_OUTPUT_ORDER5_BATCH3_V1'

 def admitted(arguments):
  # Native identity check only; the Shared engine owns schema, assets, receipt
  # ordering, Decisions, CI, checkpoint, storage and terminal Work semantics.
  command=arguments[0] if arguments else None
  key='--binding' if command in ('prepare','gate','authorize-publication','authorize-recovery') else '--spec'
  if key not in arguments or arguments.index(key)+1>=len(arguments):
   return  # Shared CLI classifies missing/invalid operation arguments.
  try:
   path=Path(arguments[arguments.index(key)+1])
   if not path.is_absolute():path=ROOT/path
   value=json.loads(path.read_text())
   if key=='--spec':
    path=Path(value['input']['path'])
    if not path.is_absolute():path=ROOT/path
    value=json.loads(path.read_text())
  except (OSError,ValueError,KeyError,TypeError):
   return  # Shared CLI emits typed acquisition/schema refusal for bad input.
  if not isinstance(value,dict) or not {'product_id','scope'}<=set(value):return
  if value.get('product_id')!=admission['product_id'] or value.get('scope')!=admission['scope']:
   print(json.dumps({'status':'FAIL_CLOSED','blocking_reason':{'code':'NATIVE_RELEASE_SCOPE_MISMATCH','reason':'Use the one product and Scope explicitly admitted by this fixed native profile'},'deployment':'NOT_EXECUTED','cli':{'contract':'COMMON_RELEASE_CLI_RESULT_V1','command':command,'outcome':'REJECTED','exit_code':2}}))
   raise SystemExit(2)
 globals()['admitted']=admitted  # retain the native callable admission surface
 if a.central:
  central=Path(a.central).resolve()
  actual=subprocess.check_output(['git','rev-parse','HEAD'],cwd=central,text=True).strip()
  assert actual==doc['shared_contract']['ref'],'SHARED_IMPLEMENTATION_SHA_MISMATCH'
  for path,digest in doc['shared_contract']['files'].items():
   assert hashlib.sha256((central/path).read_bytes()).hexdigest()==digest,path
  if not a.check:
   assert a.args,'Pass --check or release arguments after --'
   arguments=a.args[1:] if a.args[0]=='--' else a.args
   admitted(arguments)
   raise SystemExit(subprocess.call([sys.executable,'-B',str(central/doc['shared_contract']['entry']),*arguments],cwd=ROOT))
 else:
  assert a.check,'AUTHORITY_ACQUISITION_REQUIRED: pass --central exact pinned checkout'
 print(json.dumps({'status':'PASS','repository':doc['repository'],'scope':'NATIVE_CONNECTION' if a.central else 'NATIVE_DECLARATION_ONLY','shared_ref':doc['shared_contract']['ref'],'deployment':'NOT_EXECUTED'}))

try:
 main()
except (AssertionError, OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError) as error:
 print(json.dumps({'status':'FAIL_CLOSED','blocking_reason':{'code':'NATIVE_RELEASE_PREFLIGHT_REJECTED','reason':str(error)},'deployment':'NOT_EXECUTED','cli':{'contract':'COMMON_RELEASE_CLI_RESULT_V1','command':a.args[1] if a.args and a.args[0]=='--' and len(a.args)>1 else a.args[0] if a.args else 'preflight','outcome':'REJECTED','exit_code':2}}))
 raise SystemExit(2)
