#!/usr/bin/env python3
"""Thin native review validator, no execution or adoption authority."""
import argparse,json,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--central',required=True);p.add_argument('--input',required=True);p.add_argument('--gate',required=True);p.add_argument('--output',required=True)
a=p.parse_args();sys.path.insert(0,str(Path(a.central).absolute()))
from harness.core import Blocked, read_json, write_json
from harness.staging_admission import baseline_review_input, REVIEW_STEPS
try:
    if a.gate not in REVIEW_STEPS: raise ValueError('Unknown gate')
    value=baseline_review_input(a.central,Path(__file__).absolute().parents[2],read_json(a.input))
    value.update(status='PASS',gate=a.gate,adoption='NOT_GRANTED',execution_authority='NONE')
    write_json(a.output,value)
except (Blocked,OSError,ValueError,TypeError,KeyError) as exc:
    write_json(a.output,{'status':'FAIL_CLOSED','blocking_reason':getattr(exc,'data',{'reason':str(exc)}),'adoption':'NOT_GRANTED','execution_authority':'NONE'})
    sys.exit(2)
