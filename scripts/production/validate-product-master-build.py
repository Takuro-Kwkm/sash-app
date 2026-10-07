#!/usr/bin/env python3
"""Native gate wrapper; shared domain/schema validation is retained."""
import argparse
import json
import sys
from pathlib import Path


def validate(harness_root, package, project_qa=None, decision=None):
    sys.path.insert(0, str(Path(harness_root).resolve()))
    from product_master.validators.validate import validate as shared_validate
    from product_master.identity import digest
    from harness.core import require
    # Native project scope QA is required before calling this a project PASS.
    require(project_qa and project_qa.get('package_sha256') == digest(package) and
            project_qa.get('status') == 'PASS' and project_qa.get('scope_review_ref'),
            'NATIVE_PROJECT_QA_REQUIRED', 'Bind executed same-package native Selection Scope QA', 'NATIVE_QA')
    require(package.get('work_type') == 'NEW BUILD', 'BUILD_SCOPE', 'Existing Master uses Change/Carry-Forward', 'NATIVE_QA')
    require(package.get('lifecycle_status') != 'FORMAL', 'HUMAN_DECISION_REQUIRED',
            'Builder validates candidates; existing admitted shared storage owns Formal', 'NATIVE_QA')
    return shared_validate(package, project_qa=project_qa, decision=decision)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--harness-root', required=True); p.add_argument('--package', required=True)
    p.add_argument('--project-qa', required=True); p.add_argument('--out', required=True)
    args = p.parse_args()
    try:
        result = validate(args.harness_root, json.loads(Path(args.package).read_text()),
                          json.loads(Path(args.project_qa).read_text()))
    except Exception as error:
        result = {'status': 'FAIL', 'blocking_reason': getattr(error, 'data', {'reason': str(error)})}
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    raise SystemExit(0 if result['status'] == 'PASS' else 2)
