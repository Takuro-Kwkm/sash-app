#!/usr/bin/env python3
"""Native scope refusal and Shared v2 delegation; no native DAG or journal."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument('--central', required=True)
    p.add_argument('command', choices=('route','run','resume','checkpoint'))
    p.add_argument('--instruction', default='リプラスの既存商品マスター変更を監査して')
    p.add_argument('--root')
    p.add_argument('--work')
    p.add_argument('--spec')
    p.add_argument('--live-state')
    p.add_argument('--destination')
    p.add_argument('--stop-after')
    a = p.parse_args(argv)
    central = Path(a.central).resolve()
    sys.path.insert(0, str(central))
    from harness.architecture import route_instruction
    from harness.current_authority import compatibility
    from harness.core import Blocked, read_json, sha, require
    try:
        compatibility(central, ROOT)
        connection = next(x for x in read_json(ROOT/'contracts/production/work-connections.v2.json')['products']
                          if x['product_id'] == 'NATIVE_REGISTRY:LIXIL::リプラス')
        admitted = connection['existing_package_profile']
        path = ROOT/admitted['path']
        require(sha(path.read_bytes()) == admitted['sha256'], 'NATIVE_PROFILE_CHANGED', str(path), 'ENTRY')
        if a.command == 'route':
            route = route_instruction(central, {'Takuro-Kwkm/sash-app':str(ROOT)}, a.instruction)
            require(route['product_id'] == connection['product_id'] and route['target_gate'] == admitted['target_gate'],
                    'NATIVE_OPERATION_UNSUPPORTED', 'Only package audit is admitted', 'ENTRY')
            print(json.dumps(route, ensure_ascii=False, indent=2))
            return 0
        spec = read_json(a.spec)
        require(spec['target'] == connection['product_id'] and spec['target_gate'] == admitted['target_gate'],
                'NATIVE_OPERATION_UNSUPPORTED', 'Formal/Release/other product scope is unsupported', 'ENTRY')
        args = [a.command, '--root', a.root, '--work', a.work, '--spec', a.spec]
        for flag,value in [('--live-state',a.live_state),('--destination',a.destination),('--stop-after',a.stop_after)]:
            if value: args += [flag,value]
        return subprocess.call([sys.executable,'-B',str(central/'scripts/production-work.py'),*args], cwd=ROOT)
    except (Blocked, OSError, ValueError, KeyError, TypeError) as error:
        print(json.dumps({'state':'FAIL_CLOSED','blocking_reason':getattr(error,'data',{'reason':str(error)}),
                          'external_operations':0,'reference_fallback':False},ensure_ascii=False,indent=2))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
