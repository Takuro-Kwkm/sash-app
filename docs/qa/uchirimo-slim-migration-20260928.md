# ウチリモ Slim Canonical 移行候補 — 2026-09-28

Task class: PRODUCT MASTER STRUCTURAL NORMALIZATION + QA INFRASTRUCTURE OPTIMIZATION. Product Master Mutation 1 / GitHub Mutation 1 / QA Workflow Mutation 1. This branch is a Working candidate. It does not change the Drive FORMAL, Canonical Registry, current production Runtime, or the in-progress V12 controller.

## Authority and source

- CURRENT_INFORMATION_SOURCE_MANIFEST v1.2 ACTIVE; Canonical Registry v2.0 row 18: YKK AP ウチリモ 内窓 FORMAL_PASS v1.0-P7R1-R2.
- FORMAL workbook Drive ID `11p2SkAXYNAAJwWYGBjmWOTVO6rZquyJf`, Runtime Manifest ID `1119yamXn21wLZd3C8LvamNWsTAx_1dt2` and Runtime SHA-256 `be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d`.
- Branch base `db2280c7ee15c0426dc0d4d154ac17f394dd16c5` on `feat/new-construction-runtime-ui-v16-20260910`; V12 PR #24 is an independent active writer.

## Structural audit

| Record | Before | Candidate | Classification |
| --- | ---: | ---: | --- |
| Product nodes | 15 | 15 | Independent Base Fact |
| Glass specs | 566 | 566 with profile references | Independent Base Fact |
| Node × Glass | 8,490 | 0 authoritative | Cartesian Expansion, all derived; 0 independent pair facts |
| Compatibility | implicit in matrix | 7 profiles, 105 node dispositions | Compatibility Mapping and Conditional Rule |
| Dependency rules | 29 | 29 | Conditional Rule / Constraint / Exception (2 `route_exception`, 1 `incompatible`) |
| Glass size rules | 23 | 23 | Constraint |
| Installation rules | 18 | 18 | Constraint / Manual Check |
| Evidence | 31 | 31 | Evidence Mapping |
| Manual check records | 4 | 4 | Manual Check; manufacturer quote recheck remains required |

The legacy 8,490 pairs are a frozen regression reference in the unchanged FORMAL workbook and Runtime package. Each row's `gsc` and scope are copied from its Glass Spec, and its disposition belongs to one of seven complete 15-node signatures. The candidate stores 566 profile references plus 7 profiles and 105 statuses. Its compatibility table is 112 physical rows, a reduction of 8,378 (98.68%). Across the 15 nodes, 566 Glass Specs and compatibility table, 9,071 becomes 693 records. This is a representation count; the source package contains other authoritative tables unchanged.

## Equivalence and safeguards

`scripts/governance/uchirimo-slim-normalize.mjs` checks the Formal manifest hash, builds the candidate deterministically and projects the full legacy matrix. Comparison: 8,490/8,490 matched; missing 0, extra 0, disposition/Glass Fact mismatch 0, evidence mismatch/orphan 0, other canonical fact mismatch 0. Duplicate node, glass, profile and pair IDs fail closed. All 566 Glass Specs and their evidence references, 29 dependency rules, 23 glass size rules, 18 installation rules, 31 evidence records and four manual checks are retained. `SPECIAL_CHECK_REQUIRED` (352 legacy pairs) and `NOT_APPLICABLE` (1,812 pairs) are reproduced exactly; no blocked or manual result becomes PASS. A repeated run produces the same candidate SHA-256 `81a33f01803099297a8fb9f92d512c9a2c450131b86b54186ed249fddbd8319f`.

The adapter accepts either the existing Formal matrix or the candidate profiles and rejects both together. Eligible Glass Spec ID sets match on every node. Representative Runtime resolution results match for each of the 15 nodes × 7 profiles (105 seeds). Existing Runtime/UI integration plus migration tests: 24 PASS, 0 FAIL locally.

## QA topology and carry-forward

- `scripts/governance/uchirimo-slim-recurring-qa.mjs` reads only the Git-versioned Working candidate, identical to the Drive Working file `1aXAx_N_UixlP1W3Vt3oZ49lxyRy89z6v` by SHA-256 `81a33f01803099297a8fb9f92d512c9a2c450131b86b54186ed249fddbd8319f`. It checks 794 authoritative records: 15 nodes, 566 glass specs, 7 profiles, 105 profile/node dispositions, 29 dependencies, 23 glass size constraints, 18 installation rules and 31 evidence rows. It evaluates **zero** legacy materialized pairs. Local run: PASS, approximately 8 ms, 9 MB observed heap, one job, zero retries/timeouts. These are local candidate-product-QA measurements, not V12 selector performance.
- The candidate workflow isolates recurring product QA from the migration equivalence job. The latter deliberately reads the 8,490 reference on PR migration verification; the former never does.
- SAFE_CARRY_FORWARD: unrelated Formal, installation, size and evidence gates remain unchanged. EQUIVALENCE_CARRY_FORWARD: existing V12 PASS child units remain in their durable checkpoint because full pair semantics and adapter decisions match; the last locally verified generation-27 checkpoint had 1,499 PASS units and 3,803 closed parents. RESIDUAL_RECHECK_REQUIRED: 1,491 pending child units at that checkpoint and any selector path changed by a future integration. No checkpoint is rewritten or replayed here.

## Performance boundary and adoption

The old adapter built node-indexed eligible Glass Specs once from the 8,490-row matrix. V12 Heavy Shard timeouts arise during reachable selector-state traversal (sampled NORMAL job hit 300,000 ms), so shrinking the source table alone does **not** prove their removal. The local 1,000-call adapter microbenchmark was approximately 1.10 s old versus 0.96 s candidate, a noisy smoke comparison. V12 recurring state count, Heavy Shard count, peak state population, retries and timeout rate after integration remain unmeasured. The active controller still schedules the existing 3,956 parent partitions and has not consumed this candidate.

Formal adoption is blocked until residual V12 QA, representative E2E, recurring selector-workload reduction, and Drive saved-byte re-fetch/hash gates pass. Keep FORMAL/Registry read-only. Do not replace the controller's durable evidence or label `QA_READY`, `FORMAL`, or `APP_INTEGRATION_READY` on the basis of this candidate product-QA run.
