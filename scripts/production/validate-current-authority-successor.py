"""Native declarations; compatibility is verified by acquired Shared Git."""
import argparse,json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--central',required=True);a=p.parse_args()
sys.path.insert(0,str(Path(a.central).resolve()))
from harness.current_authority import compatibility
print(json.dumps(compatibility(a.central,root)))
