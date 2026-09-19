# Project Governance Foundation

This layer makes repository state and evidence authoritative instead of chat memory.

## Authoritative inputs

- `project-governance/project-state.json`: declared project phase, human review record and release flags.
- `project-governance/gate-definition.json`: gate order, gate types, Human Review reopen paths and release requirements.
- `project-governance/evidence-manifest.json`: durable evidence registry seed and evidence policy.
- `project-governance/execution-path-state.json`: execution-path priority and retry policy.

Generated current-head results are written to `artifacts/governance/` and are intentionally not committed.
This avoids the impossible self-reference of storing the SHA of a commit inside that same commit.

## Human Review rule

`HUMAN_FLOW_REVIEW_GATE` can only evaluate to `PASS` when all three fields are recorded:

1. `reviewed_exact_head`
2. `review_artifact_identity`
3. `human_approval_reference`

The evaluator then diffs `reviewed_exact_head..current HEAD` and reopens the gate if any configured Flow/UI/Runtime source path changed. A commit that only records approval does not invalidate the approval.

## Evidence rule

Automatic gates require evidence whose `exact_head` equals the current evaluated HEAD. Historical evidence remains historical and cannot silently satisfy a current-head gate.

Use:

```bash
node scripts/governance/collect-evidence.mjs --gate GATE_ID --status PASS --artifact path/to/report.json --command "command used"
```

## Release rule

`node scripts/governance/verify-release-input.mjs --strict` is the release-time guard. It must not pass unless the required gates, Human Review fields and `UNVERIFIED_QA_CASE_COUNT=0` are all satisfied.

`Project Governance Gate` is intentionally safe to run before Human Review. It verifies governance invariants and records evidence without executing post-Human-Review full coverage, browser, regression, staging or release work.
