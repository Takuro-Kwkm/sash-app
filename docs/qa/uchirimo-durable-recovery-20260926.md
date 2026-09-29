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


---

# V12 Deterministic Recovery Controller Contract

Status: DESIGN FREEZE CANDIDATE. This section defines the replacement control model for Uchirimo V11 recovery. It does not declare QA PASS.

## 1. Objective

Uchirimo Full Coverage QA must not depend on an AI choosing the next recovery action. Given the same Runtime, parent population, evidence and controller version, the next state and next scheduled work MUST be identical.

The controller is a deterministic state machine. AI/chat may inspect BLOCKED states, but MUST NOT choose routine timeout recovery, batching, retries, evidence reuse, split axes, aggregation rules, or next-run dispatch.

## 2. Immutable canonical parent population

The canonical selector denominator is the frozen parent partition population derived from the approved V11 baseline. Its identity is stored as:

- parent_population_count
- parent_population_sha256
- runtime_manifest_sha256
- parent_planner_contract_version

Recovery MUST NOT increase or decrease this canonical denominator.

A timeout does not create new canonical partitions. It creates recovery units inside exactly one parent partition.

Historical hard-coded timeout-family expansion may remain only where it is part of the frozen parent baseline. New observed hotspots MUST NOT be added as product/family name hard-codes. New recovery is evidence-driven.

## 3. Recovery unit identity

Every executable unit has:

- parent_shard_index
- parent_partition_key
- parent_seed_sha256
- decision_constraints
- decision_constraints_sha256
- recovery_unit_id
- parent_recovery_unit_id
- recovery_depth
- execution_class: NORMAL | HEAVY
- attempt_ordinal

The root unit has empty decision_constraints.

recovery_unit_id is SHA-256 over the stable canonical tuple:

parent_partition_key + NUL + stable_json(decision_constraints)

The same parent and same constraints MUST always produce the same recovery_unit_id.

Recovery unit count is diagnostic only. It is never substituted for canonical parent coverage.

## 4. Fixed state machine

Allowed unit states:

PENDING_NORMAL
RUNNING_NORMAL
PENDING_HEAVY
RUNNING_HEAVY
SPLIT_REQUIRED
PENDING_CHILDREN
PASS
BLOCKED_SEMANTIC
BLOCKED_INTEGRITY
BLOCKED_INFRA
BLOCKED_UNSPLITTABLE
BLOCKED_NO_PROGRESS

Allowed deterministic transitions:

- no compatible evidence -> PENDING_NORMAL
- NORMAL PASS -> PASS
- NORMAL timeout / compute limit -> PENDING_HEAVY
- HEAVY PASS -> PASS
- HEAVY timeout / compute limit -> SPLIT_REQUIRED
- SPLIT_REQUIRED + valid split axis -> PENDING_CHILDREN
- all exact-cover children PASS -> parent unit PASS
- transient infrastructure failure -> retry same unit, maximum 2 retries
- third identical infrastructure failure -> BLOCKED_INFRA
- semantic/runtime/identity/hash/coverage failure -> corresponding BLOCKED state
- HEAVY timeout with no remaining valid required ENUM split axis -> BLOCKED_UNSPLITTABLE
- a recovery generation that produces no state transition -> BLOCKED_NO_PROGRESS

No other transition is legal.

## 5. Failure classifier

The classifier is code, not AI.

COMPUTE_RECOVERABLE:
- child timeout
- configured state limit reached
- configured terminal limit reached

INFRA_TRANSIENT:
- explicitly enumerated GitHub/API/network transient failures

SEMANTIC_BLOCK:
- UNKNOWN / UNMAPPED / invalid visible technical field
- seed rejected
- constraint rejected or cleared
- Runtime/Product identity mismatch
- proof assertion failure

INTEGRITY_BLOCK:
- artifact hash mismatch
- exact-head binding mismatch
- dependency fingerprint mismatch
- duplicate/missing coverage identity

Unknown failure codes fail closed as BLOCKED_SEMANTIC. They are never automatically retried.

## 6. Deterministic split rule

Only HEAVY compute-recoverable failures are split.

The split axis is selected by the existing Runtime-derived field order:

1. Resolve the parent seed plus current decision constraints.
2. Select the first visible field satisfying all conditions:
   - required == true
   - readOnly != true
   - dataType == ENUM
   - not technical
   - not continuous
   - not already fixed by seed or constraints
   - more than one enabled value
3. Create exactly one child for every enabled value.
4. Append exactly one decision constraint for that field to each child.
5. Resolve every child and require the decision and all prefix decisions to survive.
6. Emit a split certificate.

No product node name, glass family, color, handing, or other product-specific timeout family may determine this split rule.

## 7. Split certificate and exact-cover invariant

Every split emits:

- controller_contract_version
- exact_head
- runtime_manifest_sha256
- proof_execution_fingerprint
- parent_partition_key
- parent_recovery_unit_id
- parent_constraints_sha256
- split_field_key
- split_field_domain_sha256
- ordered domain values
- ordered child_recovery_unit_ids
- child constraint hashes
- parent selection sha256
- certificate sha256

The aggregator MUST prove:

- all child IDs are expected by the certificate
- no unexpected child exists
- child decisions are unique
- child decision domain == full enabled parent domain
- every child preserves the parent seed and parent constraints
- no child overlaps another child
- all leaves are PASS or recursively covered by a valid split certificate

Only then may children close their parent.

## 8. Evidence file contract

Recovery child evidence MUST use unique filenames. Multiple children of one parent MUST never overwrite the same shard report.

Required naming:

unit-<parent_shard>-<recovery_unit_id>-report.json
unit-<parent_shard>-<recovery_unit_id>-terminal-digests.jsonl
unit-<parent_shard>-<recovery_unit_id>-progress.json
unit-<parent_shard>-<recovery_unit_id>-failure.json

Each report carries parent_partition_key and recovery_unit_id.

Root PASS evidence may retain the canonical shard report name only after parent closure synthesis.

## 9. Parent closure synthesis

Canonical aggregate coverage remains one result per frozen parent partition.

A parent closes in one of two ways:

ROOT_PASS:
- compatible root unit PASS.

RECOVERY_TREE_PASS:
- root is not PASS
- every leaf of the certified recovery tree is PASS
- every internal split certificate passes exact-cover validation.

For RECOVERY_TREE_PASS the aggregator synthesizes one canonical parent report:

shard-<parent_shard>-report.json

and one deterministic combined parent case artifact. Leaf terminal-digest files are concatenated in recovery_unit_id order and re-hashed. The synthesized parent report records the recovery tree root hash and all leaf evidence identities.

Carry-forward may reuse this synthesized parent proof only when Runtime, proof execution semantics, parent identity, split certificates and artifact hashes remain compatible.

## 10. Capacity control

GitHub matrix limit remains a hard guard. It is never raised or bypassed.

Per lane:

- Heavy recovery unit: exactly 1 unit per matrix job.
- Normal recovery units: batch size 1 by default.
- Normal batch size may become 2 only when required to remain within the 256-entry matrix limit.
- A batch of 2 is sequential and both unit results remain independently evidenced.
- If heavy_count + ceil(normal_count / 2) > 256, the controller creates deterministic execution waves. It does not create a larger batch.

Wave scheduling:
- stable order by parent_shard_index then recovery_depth then recovery_unit_id
- first 256 legal batches execute in current wave
- remaining batches are DEFERRED, not failed
- deferred units execute in the next controller generation
- formal Full Coverage aggregate remains BLOCKED while any DEFERRED unit exists

## 11. Generation controller

Recovery generations are repository-controlled, not chat-controlled.

State artifact:

uchirimo-v11-controller-state.json

Required fields:
- schema_version
- controller_contract_version
- exact_head
- generation
- source_controller_run_id
- parent_population_count/hash
- runtime hash
- execution fingerprint
- planner fingerprint
- closed_parent_count
- open_parent_count
- pass_unit_count
- pending_normal_count
- pending_heavy_count
- split_required_count
- deferred_count
- blocked counts by class
- recovery_tree_root_hash
- prior_state_sha256
- current_state_sha256
- next_action

next_action is one of:
EXECUTE
DISPATCH_NEXT_GENERATION
FINAL_AGGREGATE
BLOCKED
COMPLETE

A generation MUST change current_state_sha256 relative to prior_state_sha256 unless COMPLETE. Otherwise BLOCKED_NO_PROGRESS.

Maximum automatic recovery generations is fixed by contract. Reaching the maximum without closure is BLOCKED_NO_PROGRESS, never an infinite retry loop.

## 12. Automatic next-run dispatch

After current-generation artifacts are uploaded, Project Governance evaluates the controller state.

If next_action == DISPATCH_NEXT_GENERATION:
- verify same exact source HEAD
- verify no other active current-generation owner
- verify state progress
- dispatch Project Governance on the same branch/ref
- pass generation + 1 and source_controller_run_id
- do not modify source code
- do not require chat/user confirmation

Routine recovery therefore requires no AI-authored commit.

workflow_dispatch recovery runs must be permitted to reach the same final Non-TW/TW/finalization path once Full Coverage is achieved. Human Review is re-read and remains authoritative; it is not synthesized by the controller.

## 13. Carry-forward contract

Carry-forward is evaluated per canonical parent and recovery unit.

Reusable:
- canonical parent ROOT_PASS proof
- synthesized RECOVERY_TREE_PASS parent proof
- compatible PASS recovery leaf evidence

Never reusable as PASS:
- timeout
- YIELDED
- partial frontier
- missing artifact
- failed constraint
- a child whose split certificate is incompatible

Planner changes are fingerprinted separately from proof execution semantics. A planner-only scheduling change does not invalidate a completed proof when execution semantics, Runtime and evidence identity remain unchanged.

## 14. Aggregate modes

PROGRESS_AGGREGATE:
- may run with pending/deferred/recoverable units
- reports exact state
- cannot emit Full Coverage PASS
- feeds the generation controller

FINAL_AGGREGATE:
- requires every canonical parent closed
- pending == 0
- deferred == 0
- recoverable failure == 0
- blocked == 0
- exact parent coverage == frozen parent population
- all split certificates valid
- all evidence integrity checks PASS

Only FINAL_AGGREGATE may feed GLOBAL_WINDOW_SELECTION_FLOW_GATE.

## 15. AI boundary

AI/chat is not allowed to decide:
- Normal vs Heavy promotion
- retry count
- split field
- split depth
- batching
- wave membership
- carry-forward acceptance
- parent closure
- next generation dispatch
- PASS/BLOCKED

AI may inspect only:
- BLOCKED_SEMANTIC
- BLOCKED_INTEGRITY
- BLOCKED_UNSPLITTABLE
- BLOCKED_NO_PROGRESS

Any change to the state machine requires a new controller_contract_version and repository review. It is not an ad-hoc recovery action.

## 16. Migration from the current V11 run

Migration MUST restore the frozen parent population rather than treating the temporary expanded 7,780 plan as the new denominator.

- Preserve every compatible PASS proof already issued.
- Map temporary deeper static partitions to recovery evidence only when exact parent/constraint identity can be proven.
- Do not infer parent PASS from a subset of temporary children.
- Remove newly-added product/family-specific timeout expansion from canonical planning.
- Keep the Runtime and product specification unchanged.
- Re-run only parents/recovery leaves not closed by compatible evidence.

The first migrated controller run must emit the frozen parent population hash and a migration report before heavy execution.
