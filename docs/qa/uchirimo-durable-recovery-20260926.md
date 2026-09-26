# Uchirimo durable recovery — 2026-09-26

NON-PRODUCT-MASTER / PRODUCT_MASTER_MUTATION=0.
Start HEAD: `4c01e670c6302fafddbb7d34cce797b9e299441c`.

## Scope and authority

The four independent recovery triggers are removed. Project Governance remains the only controller; its existing Human Review authorization and the shared reusable authorization both remain required. Three obsolete entry paths fail closed rather than restarting the failed serial route. The existing NonBath workflow path now hosts the unified durable recovery. Existing running executions retain their original workflow revision.

## Exact coverage, not sampling

The immutable input is artifact 10887444330 from run 36189422570. Its archive identity, input SHA-256, Runtime manifest hash, all 476 parent IDs and all 7,364 partition IDs are checked. Eight disjoint lanes partition that identical population. Holding a still-running legacy root never removes it from the expected universe. Historical Bath38 evidence is preserved separately; NonBath completion alone never establishes Original514 or full application QA.

## Checkpoint contract

The original `scripts/uchirimo-full-selector-proof.mjs` and its source blob remain unchanged. Execution-only hooks are inserted into a generated, untracked runner. Each hook anchor must match once within `runShard`; any source drift blocks execution. Branch creation, traversal order, selector acceptance/rejection, visited-state identity, terminal digest format and limits are unchanged. Unit tests compare the actual original runner with repeatedly paused/resumed execution on exhaustive synthetic fixtures; these tests are NOT product Full Coverage evidence.

A checkpoint binds exact HEAD, semantic dependency fingerprint, Runtime SHA, partition and seed. It contains the frontier including resolved transient results, visited states, decision state, counters and signature counts. Terminal data is fsynced before an atomic checkpoint rename. On resume its certified prefix hash is checked before any uncommitted crash tail can be truncated. A corrupt/mismatched checkpoint blocks, never starts over silently. Completed terminal files are retained, not deleted. A hard execution error is recorded BLOCKED and is not automatically retried. Cooperative YIELDED means an advanced saved frontier, not QA failure or PASS.

## Handoff, parallelism and resumption

Legacy published artifacts are downloaded and individually hashed before handoff. The old broad run may only be cancelled when it has no observed active job after recheck; the root2 running recovery is never cancelled here. Unresolved active ownership is held and remains UNVERIFIED.

Each of eight workers executes six bounded waves and publishes a distinct immutable snapshot after each wave. `fail-fast: false` preserves other workers. Completed partitions are verified and skipped on subsequent waves. To resume after the bounded run, dispatch Project Governance on the same HEAD with `uchirimo_resume_run_id` set to the prior controller run. Restore selects the newest retained snapshot per lane and verifies its identity; cross-HEAD continuation is intentionally rejected pending a separate current-head binding proof.

## Aggregation and remaining gates

Aggregation rejects missing/duplicate lanes, duplicate or unexpected partition results, wrong parent/seed/Runtime/HEAD, and missing or corrupt terminal data. It reports verified/pending/blocked partitions and closed NonBath parents. Only complete exact coverage proves NonBath closure. Historical Bath38 current-head binding, Original514 closure, continuous-dimension proof, full browser QA and Final Gate remain separate requirements. `APP_INTEGRATION_READY=false` and `RELEASE_INPUT_GATE=BLOCKED` are retained; no deployment occurs in this lane.

## Validation record

Local checkpoint/inventory negative tests passed; actual frozen input has 7,364 unique partitions. The actual repository V10 differential test runs in CI before Human-authorized heavy execution. CI/QA outcomes are provided by exact-head Actions artifacts, not this document. No all-product QA PASS is declared here.

## Active legacy ownership refinement

Initial controller run 36220092744 passed the complete durable/original-oracle test and workflow authority check, but correctly reported no new verified partitions because its conservative handoff held all 476 roots while the legacy matrix remained active. The planner now verifies each exact two-root legacy matrix job identity. Only completed groups relinquish their roots; active, queued, missing and unparseable ownership never releases a root. The separately running root2 remains held. The full 7,364-partition denominator is unchanged. A YIELDED partition resumes before that worker opens the next partition, avoiding a full inventory sweep between slices. The scoped recovery lane suppresses unrelated current-release heavy QA without weakening authorization or changing the release scope.
