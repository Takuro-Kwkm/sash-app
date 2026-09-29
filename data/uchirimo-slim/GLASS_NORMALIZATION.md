# Uchirimo Slim V2: glass specifications

This WORKING candidate factors the existing FORMAL glass configurations. It does
not assert new manufacturer availability, revise any evidence, or adopt a new
FORMAL master. The prior candidate remains in Git history and the FORMAL package
remains the immutable migration reference.

## Representation

| Record | Before (Slim V1) | V2 |
|---|---:|---:|
| Full glass specification | 566 | Derived on explicit projection |
| Glass ID → size group | 566 | Derived from rule assessment |
| Repeated glass-ID allowed-value rows | 566 | One projection descriptor |
| Base glass facts | — | 52 |
| Decoration facts | — | 14 |
| Gas/spacer combinations | — | 5 |
| Assessment bundles: size/scope/status/evidence/compatibility | — | 29 |
| Exact applicability rectangles | — | 29 |
| Original ID/display-name/component references | — | 566 |
| Physical data records in this scope | 1,698 | 695 + 1 descriptor |

The gas/spacer pairs remain coupled where required. Rectangle merging requires
identical domains in every other dimension and identical assessment metadata.
The rule union is disjoint, covers every original identity, and has exactly the
same cardinality. A hole, exception, MANUAL_CHECK, different source reference,
or compatibility profile cannot be generalized away. Existing Source IDs and
glass IDs are copied verbatim; only internal component/rule keys are new,
content-derived identifiers.

All unrelated canonical arrays, 23 glass size constraints, 29 dependency rules,
18 installation rules, 4 manual-check records, and 31 evidence records remain
unchanged. Full migration comparison projects 566 glass rows, their allowed
values/size joins, and all 8,490 node dispositions, checking complete payloads.

## Runtime and QA

The candidate resolver compiles rules and identity references into bounded
bitset indexes, preserving original option ordering. It filters these indexes
and reconstructs only a uniquely selected glass row. It does not load the full
566-row glass table or 8,490-row node matrix for each resolution. An explicit
debug/projection accessor remains available. Production registry still points
to the unchanged FORMAL runtime.

Recurring product-integrity QA checks 129 glass fact/rule records rather than
566 full specification records. It **also checks all 566 identity aliases**.
Whole-job authoritative records decrease from 794 to 357, but the separately
counted identity scan makes the V2 reported combined record visits 923. This is
not a claim that total integrity-check CPU time decreases. No materialized glass
or node/glass rows are used by recurring integrity QA.

`uchirimo-slim-glass-benchmark.mjs` compares V1 and V2 with identical 1,200 inputs,
five alternating rounds, and cleared facet caches. Its timing is a local
resolver measurement, not full selector-lane completion. The full selector
state-space still includes installation/options and must not be certified by
the smaller glass model or a sample benchmark alone.

## Reproduction

```sh
node scripts/governance/uchirimo-slim-normalize.mjs
cmp data/uchirimo-slim/working-candidate.json artifacts/uchirimo-slim/uchirimo-slim-working-candidate.json
node --test test/82-uchirimo-slim-canonical.test.mjs test/83-uchirimo-glass-rule-model.test.mjs
node scripts/governance/uchirimo-slim-recurring-qa.mjs
node scripts/governance/uchirimo-slim-glass-benchmark.mjs
node scripts/governance/uchirimo-slim-http-e2e.mjs
UCHIRIMO_SLIM_PREVIEW_INPUT=data/uchirimo-slim/working-candidate.json node scripts/build-uchirimo-runtime-review-preview.mjs
```

Migration-only selector differential and representative parent/heavy samples
remain separate CI jobs. Existing V12 results are archived, not imported as
fresh candidate PASS. Formal adoption and APP_INTEGRATION_READY require their
remaining gates; no automatic promotion is performed by these scripts.
