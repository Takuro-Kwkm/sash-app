# Uchirimo pending-work scheduling change — 2026-09-28

NON-PRODUCT-MASTER TASK; PRODUCT_MASTER_MUTATION=0.
User authorization: 2026-09-28 20:13 JST, optimize pending-unit distribution and the 64-unit generation cap.
Baseline: 000e147b0895b938209c65748e02070ef891f70a, PR #24, feat/new-construction-runtime-ui-v16-20260910.
Authority read: CURRENT_INFORMATION_SOURCE_MANIFEST v1.2 ACTIVE; Common Product App Standard v2.0; Sash Full Coverage specification v1.1; APP_CHANGE_GUARDRAIL v1.1; supplied Sash Project Instructions v2.0.

## Change

The new scheduling entry point sorts the immutable pending frontier deterministically, round-robins it across the existing 16 lanes, and uses the existing scheduleLane function with waveLimit=8. Each batch still contains exactly one unit. This raises the generation cap from 64 to 128 without raising the two-jobs-per-lane concurrency limit. NORMAL and HEAVY timeouts remain 300,000 and 3,000,000 ms.

The selector implementation, resolver, batch executor, recovery-controller functions, split/domain certificates, cumulative state reader/writer, checkpoint validation/import, and finalizer are unchanged. Product Master, Runtime, Registry, UI, canonical mapping, Human Approval, Release Scope, main and Production are untouched. Pre-splitting and dependency-install caching were not part of this change.

The existing checkpoint compatibility check requires byte-identical execution files. They remain byte-identical. The new scheduler only assigns existing unit payloads to jobs and produces the existing lane-summary contract. It never issues PASS or mutates constraints, proof hashes or retry counters. The existing execution eligibility checks still reject completed or compute-failed units.

An old-HEAD automatic dispatch may reach the updated branch with a nonzero generation. A dependent routing change sends that first cross-HEAD invocation to the existing verified generation-zero checkpoint importer. Same-HEAD continuation resumes its requested generation. Generation zero here is import/bookkeeping, not product QA restart. An absent source HEAD or invalid generation is rejected; checkpoint lineage, execution, population and hash validation are not bypassed.

## Validation

- Scheduler tests: 0/1/15/16/17/64/128/129/1491 pending units; all pending tasks assigned exactly once to scheduled or deferred sets; no PASS/blocked unit scheduled; stable output under reversed input order; immutable input; no replay in the next wave.
- Skew fixture: all units from one parent still distribute over 16 lanes.
- Existing identity, population and failed-compute protections verified.
- Same-HEAD continuation, cross-HEAD import routing, missing-source and invalid-generation rejection verified.
- Existing continuation failure/cancellation/durable-save tests, controller tests, checkpoint preservation tests and evidence-binding tests pass.
- Both changed workflow YAML files parse; diff whitespace validation passes.
- Actual generation-27 saved checkpoint validates: 3,803 closed parents, 1,499 PASS child units, 1,491 pending units. The locally regenerated canonical plan has the identical parent-population hash. Scheduling comparison does not execute selectors or generate product PASS.
- Old lane populations: [70,108,143,132,115,122,115,114,100,88,62,74,81,55,63,49]. New lane populations: [94,94,94,93,93,93,93,93,93,93,93,93,93,93,93,93].
- Scheduled per wave: 64 -> 128. Previously PASS units scheduled: 0. State, units, parents and certificates unchanged by planning.

## Adoption and measurement

Adopt only after the running generation has saved its cumulative checkpoint. Recheck remote HEAD immediately before fast-forwarding the existing integration branch. Let the normal controller chain continue; verify compatible import, preserved counts, 128 distinct scheduled pending IDs, and subsequent durable advance/resume. Do not start a second writer or reset the canonical parent population.

The larger wave reduces generation-boundary frequency but can delay split feedback; lane balancing primarily helps skew and the tail of the queue. No speedup factor or completion deadline is claimed from scheduling tests. Measure completed units per elapsed minute and parent closures after the first new wave. Product QA final aggregate and APP_INTEGRATION_READY remain unverified until their own gates complete.
