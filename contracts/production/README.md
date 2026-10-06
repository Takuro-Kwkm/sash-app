# Production EW connection

This is the native consumer adapter for the existing central Shared Harness v2.
The first real run uses normal EW v1.4, its actual accepted IS8800 source and
all 51 native authoring sheets. It is a no-change production execution; it does
not certify a new changed-field Formal adoption or full Phase 3 PASS.

The host acquires Current manifest/governance, release, native Registry,
authoring FORMULA ranges, Formal ZIP, official PDF, Working state, remote branch
and complete tree through authenticated connectors. `prepare-ew.py` binds these
receipts and actual bytes. `work-connections.v2.json` owns product routing; it
never routes an unsupported product into fixtures.

```sh
python scripts/production/prepare-ew.py --harness-root CENTRAL --checkout . --captures CAPTURES.json --destination WORK_ROOT --instruction 'EWの変更作業を正式採用まで進めて'
python CENTRAL/scripts/production-work.py run --root WORK_ROOT --work WORK_ROOT/checkpoint --spec WORK_ROOT/spec.json --live-state FRESH_CURRENT.json --stop-after IMPACT_SCOPE
python CENTRAL/scripts/production-work.py resume --root WORK_ROOT --work WORK_ROOT/checkpoint --spec WORK_ROOT/spec.json --live-state REACQUIRED_CURRENT.json
python CENTRAL/scripts/production-work.py checkpoint --root WORK_ROOT --work WORK_ROOT/checkpoint --spec WORK_ROOT/spec.json --destination SAVEPOINT
```

These are host adapter arguments, not a required long user prompt. The Current
envelope has `repository` (fresh branch response) and `observations` (all keyed
Current authority/Registry/source/authoring responses). Capture keys and native
IDs are recorded in the durable Working savepoint. Restore original bound paths
and verify every hash before continuing. A changed Current identity or HEAD
requires an impact-scoped successor Work.

Current evidence is under `evidence/phase3-ew`. The master/source bytes and exact
private checkpoint are saved to the native product Working folder; cloud proof
uses a fresh download, not the upload success message. The public evidence is
limited to normal EW product and technical verification results.

Scope limitations are explicit in `real-work-result.json` and `recovery.json`.
Changed source without a complete native review blocks. New Formal storage and
changed downstream adapters are incomplete and block by name; the AI cannot
turn a fixed review packet into Human Approval. TW, EW fire, Interior and SC
are registered pending adapters. The existing application/runtime/UI/master
remain byte-identical to the starting production commit.

`Production Connection EW` CI checks the real existing runtime, application
tests, build and three-width browser behavior. It grants no release/deployment
authority and does not mutate the native product Registry.
