# Fresh normalized selector QA

The product master is unchanged in this change. The QA input is the V2 Slim
candidate plus unchanged, hash-pinned Runtime support documents. The normal
entry point builds roots directly from the 15 nodes and their available glass
families. It neither opens the 8,490-row legacy canonical document nor submits
materialized pairs to a Heavy Shard. Existing V12 evidence is not imported.

## Representation and proof boundary

The audited dependency contract describes reads and writes of the pinned
adapter, glass index and UI conversion code. Every dependency condition, effect
(including `also` and `fixed_by`) and installation `required_when` contributes
an edge. Node axes and partition seeds are fixed inputs. Connected components
of the remaining discrete dependency graph have disjoint mutable fields.
Pure validation aggregation is not treated as a selector dependency: the
resolver never uses validation status to enable a choice or prune traversal.

Within each component, every reachable controlling choice is visited. Fields
that the audited adapter and data never read as inputs are sinks. After the
controlling choices settle, **every** sink value (and optional unset) is resolved
and checked to affect only that field's selection/runtimeState/missing marker.
All other response fields, errors, warnings and clearing events must be equal.
The status aggregation formula is checked on every resolver response. Sink
domains are multiplied using exact BigInt counts; their products are not expanded.
No BLOCK, INVALID or MANUAL_CHECK configuration is removed by status.

Each transition is checked for changes outside its component. Global display
rank is excluded from that particular comparison because it is a presentation
rank over the combined visible fields; relative ordering remains owned by the
pinned UI ordering code and separate UI gates. Cached components are keyed by
all fixed boundary values they read. Execution keeps the **complete** parent
seed so a dependent seed never loses its prerequisite. Runtime document role
order is preserved: changing it can change which embedded support contract the
existing adapter selects.

Given the reviewed read/write contract, the complete selector language is the
Cartesian product of component languages. Interleaving their local UI traces
is valid because no mutable field in one component changes a field in another.
The graph conservatively joins interacting inputs; a new supported rule adds
edges rather than assuming independence. Unknown operators/expressions/actions,
changed source pins, cross-component writes, sink side effects, rejected seeds,
empty factors and limits all fail closed.

The proof covers **reachable discrete selector normal forms for fixed node
axes**, including invalid/manual dispositions. It does not claim all arbitrary
user edit sequences, continuous dimension equivalence, browser operation, or
manufacturer confirmation. A passing report alone cannot promote the master.
Source hashes bind a reviewed dependency contract; hashes alone are not proof
of independence. The contract is checked by full terminal-set/response comparison
against explicit enumeration and negative tests that introduce side effects.

## Evidence and reproducibility

- A factor artifact records its fields, fixed inputs, rule IDs, terminal domains,
  exact multiplicities and semantic digest. There is no inherited PASS cache on
  disk; each process computes the factors afresh.
- The migration path can consume the existing 3,956-parent plan. This is only a
  mapping reference, not the recurring plan.
- The normal recurring plan has 42 node/family roots. Compare per-node/family
  counts with the sum over old parents before accepting the plan transition.
- Every run records candidate, Runtime source, dependency contract and plan
  hashes, visited states, transitions, sink checks, resolver calls and duration.
- Migration samples retain the logical counts 430,230,528 / 1,871,880,192 /
  1,871,880,192. Counts are represented symbolically, not claimed as individually
  executed resolver calls.

```sh
node --test test/84-uchirimo-factorized-selector.test.mjs
node scripts/governance/uchirimo-slim-factorized-samples.mjs
node scripts/governance/uchirimo-slim-factorized-qa.mjs
# Migration only, after generating the existing plan:
UCHIRIMO_FACTORIZED_PLAN=artifacts/uchirimo-slim/checkpoint-inventory-plan/all-partitions.json \
UCHIRIMO_FACTORIZED_OUT=artifacts/uchirimo-slim/factorized-legacy-plan \
node scripts/governance/uchirimo-slim-factorized-qa.mjs
```

`uchirimo-slim-runtime-support.mjs` when executed directly is a migration-only,
deterministic extractor. CI compares its output to the checked-in support
bundle. The recurring loader only reads the candidate and that support bundle.
Production registrations and the active V12 runner are unchanged.
