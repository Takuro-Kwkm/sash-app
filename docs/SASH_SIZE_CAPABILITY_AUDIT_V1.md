# Sash Size Capability Audit v1

## 1. Final Status

- Common Sash Sales Input Contract v1.0: **FORMAL PASS**
- Size Capability Audit v1: **PARTIAL PASS**
- Generic Audit Core integrity: **PASS**
- Managed blocking PENDING: **10**
- Formal Product Master / workbook write: **0**
- Runtime manufacturer-value write: **0**
- Automatic approval / mutation: **0**

Human approval is still required for the CR-SL-036 Product Master Change Proposal. This audit does not advance that proposal to STAGING or Production.

## 2. Audit Scope

Only the current four residential sash series are in scope.

| Product | Active nodes | Canonical STANDARD | Runtime STANDARD | CUSTOM |
| --- | ---: | ---: | ---: | --- |
| LIXIL サーモスⅡ-H | 17 | 2,131 | 2,131 | source confirmed / exact rules pending |
| LIXIL サーモスL | 17 | 1,495 | 1,495 | 50 rules audited |
| YKK AP APW430 | 25 | 718 | 718 | source confirmed / exact rules pending |
| YKK AP APW431 | 6 | 538 | 538 | 29 rules audited |

No new series is included.

## 3. Architecture

The audit path is:

`Official Manufacturer Source → Evidence / Adjudication → Canonical Product Master → Runtime`

Any confirmed Product Master difference follows:

`Official Source → Evidence → Adjudication → Product Master Change Proposal → HUMAN Approval → STAGING → Production → Runtime Regeneration`

Manufacturer W/H limits, polygons, ratios, areas, or selectors are not written directly into Runtime by this audit.

`src/product-master-core/size-capability-audit-core.mjs` remains product-agnostic. Product IDs, window names, manufacturer rules, source pages, and selector differences live in Product Profile / Capability Record / Source Manifest / Rule Audit / Evidence records.

## 4. Official Source Priority

`artifacts/size-capability-audit/source-manifest.json` is the audit source registry.

Primary sources are manufacturer official price/business documents and official product catalogs. Canonical workbooks are comparison targets, not substitutes for official source coverage. A current Canonical↔Runtime match is therefore never promoted to Official Source PASS by itself.

## 5. STANDARD Audit Methodology

STANDARD is audited as three distinct layers:

1. Official manufacturer setting
2. Canonical STANDARD Size Master
3. Runtime STANDARD inventory

The current Canonical→Runtime consistency remains:

- サーモスⅡ-H: **2131 / 2131**
- サーモスL: **1495 / 1495**
- APW430: **718 / 718**
- APW431: **538 / 538**

Official full-series selector-state enumeration is not complete, so incomplete products remain `PENDING` or `PARTIAL_PASS`.

### Thermos L verified reference slice

`シャッター付引違い窓 / 手動 / 標準タイプ / printed p.54–61`

- Official: **97**
- Canonical: **97**
- Runtime: **97**
- Missing: **0**
- Extra: **0**
- Slice status: **PASS**

This is a slice-level PASS only; it is not full Thermos L STANDARD coverage.

## 6. STANDARD Union / Construction-Hidden Policy

`construction` is an internal Product Master selector and stays hidden from sales UI. STANDARD candidates are the union of valid internal construction records after dependency filtering.

The Runtime must not expose construction as a sales input or silently select a construction-dependent CUSTOM PASS when the required internal condition cannot be resolved.

## 7. CUSTOM Audit Methodology

A missing Runtime Dimension Rule does not mean manufacturer `CUSTOM_NOT_APPLICABLE`.

CUSTOM source capability and exact Runtime rule availability are audited separately. Each extraction state uses:

- `EXACT_RULE_EXTRACTED`
- `SOURCE_GRAPH_REVIEW_REQUIRED`
- `SOURCE_INSUFFICIENT`
- `PENDING`

Complex graph, diagonal, glass, weight, wind-pressure, or compound conditions are not forced into `AUTO_RECT`.

## 8. CUSTOM REVIEW_REQUIRED Policy

When official conditions cannot be evaluated completely from W/H alone, the safe status is `SOURCE_GRAPH_REVIEW_REQUIRED`, `COMPOUND_GATE`, or `RUNTIME_SAFETY_REVIEW_REQUIRED`.

Managed REVIEW/PENDING is allowed to produce overall `PARTIAL_PASS`; it does not fail CI unless the record/schema/integrity itself is broken.

## 9. Thermos L — 50 Dimension Rules

All 50 current Dimension Rules have explicit audit records.

- MATCH: **37**
- SOURCE_GRAPH_REVIEW_REQUIRED: **12**
- RULE_MISMATCH: **1**
- Total: **50 / 50**

### CR-SL-036 / 内倒し窓

Current rule:

- `240<=W<=870: 350<=H<=943`
- `870<W<=1690: 350<=H<=500`

Selector:

- `window_type = WT-SL-UCHIDAOSHI`
- `specific_spec = *`
- `construction = 在来 / 204`
- `leaf_configuration = 単窓`
- W/H unit: `mm`

Official P221 shows source-readable W/H boundary values including `W=815`, `W=870`, `H=943`, `H=755`, and `H=500`. The current AUTO rule can auto-pass part of the W=815–870 region up to H=943 even though the safe W/H-only boundary falls to H=755. Therefore CR-SL-036 remains `RULE_MISMATCH`.

The revalidated safe boundary uses only source-readable vertices:

`(240,350) → (240,943) → (815,943) → (815,755) → (870,755) → (870,500) → (1690,500) → (1690,350)`

No interpolated point was added.

Boundary convention recorded by the proposal:

- `240 <= W <= 815`: upper H `943` inclusive
- `815 < W <= 870`: upper H `755` inclusive
- `870 < W <= 1690`: upper H `500` inclusive
- lower H `350` inclusive

P221 also contains a 3-A-3-only / glass-composition condition. That condition is not silently converted into a pure W/H rule. It remains a separate `RUNTIME_SAFETY_REVIEW_REQUIRED` concern.

## 10. CR-SL-036 Product Master Change Proposal

Formal Change Control record:

- Proposal ID: `PMCP-LIX-SAMOSL-INNER-TILT-RANGE-20260903-001`
- Proposal fingerprint: `sha256:bf89762cd1cf88be8620b93599d2987c23d50fcb335e6c2b525f5a14175184ee`
- Status: `PROPOSED`
- Approval policy: `HUMAN_REQUIRED`
- Approval status: `PENDING`
- Target: `06C_特注寸法範囲 / CR-SL-036`
- Operation: `UPDATE_DIMENSION_RULE`
- Formal workbook write: `false`
- Runtime write: `false`
- Auto approval: `false`

The Proposal ID/fingerprint predates the current canonical-payload hash implementation and is preserved as the immutable legacy Proposal identity requested for this Change Control record. Current payload integrity is independently protected by `payloadIntegrityFingerprint`; CI recomputes that canonical SHA-256 and fails on payload tampering.

No formal Product Master write, STAGING application, Production promotion, or Runtime regeneration has been performed.

## 11. Thermos L Grille PENDING

`高強度縦格子` and `目隠し可動ルーバー` stay managed PENDING until all of the following are source-confirmed together:

- current 2026 setting
- Thermos L applicability
- Product Node vs Selector modeling
- STANDARD sizes
- CUSTOM manufacturing range
- Canonical omission status

No Product Node is added by inference.

## 12. APW431 — 29 Dimension Rules

- MATCH: **21**
- SOURCE_GRAPH_REVIEW_REQUIRED: **8**
- RULE_MISMATCH: **0**
- Total: **29 / 29**

Shutter / large-opening sliding and other graph/compound conditions keep `SOURCE_GRAPH_GATE` or `COMPOUND_GATE` where automatic rectangular conversion is not source-proven. Wind pressure, glass, diagonal zones, weight, and compound restrictions are not guessed.

## 13. サーモスⅡ-H CUSTOM

- Active Product Nodes: **17**
- CUSTOM Source Capability: **CONFIRMED**
- Runtime Dimension Rules: **0**
- EXACT_RULE_EXTRACTED: **0**
- PENDING: **17**

Official special-order dimension sections are mapped for all 17 Product Nodes. Exact rule payload and current-2026 continuity verification are not complete, so the state is `CUSTOM_AVAILABLE_SOURCE_CONFIRMED / RULE_EXTRACTION_PENDING`, never `CUSTOM_NOT_APPLICABLE`.

## 14. APW430 CUSTOM

- Active Product Nodes: **25**
- CUSTOM Source Capability: **CONFIRMED**
- Runtime Dimension Rules: **0**
- EXACT_RULE_EXTRACTED: **0**
- PENDING: **25**

Official 2026.08 business-document manufacturing-range pages are mapped for all 25 Product Nodes. Exact selector/rule extraction remains PENDING; no inferred geometry is promoted.

## 15. Runtime Safety

The generic Dimension Resolver does not by itself fully evaluate every manufacturer restriction involving:

- glass composition / glass thickness
- glass weight / sash weight
- wind-pressure class
- emergency-entrance conditions
- special members
- other compound dependencies

Where those conditions remain unresolved, the audit records `RUNTIME_SAFETY_REVIEW_REQUIRED` rather than expanding AUTO eligibility.

## 16. Generic Gate / CI Policy

The Generic Core distinguishes:

- `FORMAL_PASS`
- `PARTIAL_PASS`
- `FAIL`

Managed PENDING or Human Approval pending does **not** fail CI.

CI fails for integrity defects such as schema errors, count/identity inconsistency, missing required artifacts, broken proposal payload integrity, unexpected mutation, Runtime contamination, or test failure.

The official command is:

`npm run audit:size-capability`

The Size Capability workflow validates the Generic Core test, audit runner, required artifact set, proposal approval state, non-mutation flags, deterministic gate artifact, and unchanged Runtime inventory.

## 17. Runtime Integrity and Browser QA

Runtime inventory must remain:

- サーモスⅡ-H: **2131**
- サーモスL: **1495**
- APW430: **718**
- APW431: **538**

The Common Sales Input Contract QA baseline remains:

- Desktop: PASS
- 390×844: PASS
- construction UI rendered: 0
- horizontalOverflowPx: 0
- consoleErrors: 0
- pageErrors: 0

This audit does not add manufacturer values directly to Runtime or alter the sales input flow.

## 18. Final Gate

| Gate | Status |
| --- | --- |
| Common Sales Input Contract | FORMAL PASS |
| Generic Size Capability Audit Core | PASS |
| Thermos L Rule Audit | PASS as audit record / 1 Change Proposal pending |
| APW431 Rule Audit | PASS |
| S2H CUSTOM Audit | PARTIAL_PASS / extraction pending |
| APW430 CUSTOM Audit | PARTIAL_PASS / extraction pending |
| 4-Series STANDARD Official Source Audit | PARTIAL_PASS / managed PENDING |
| Product Master Change Proposal | PROPOSAL_READY / HUMAN_APPROVAL_PENDING |
| Runtime Integrity | PASS required |
| Browser QA | PASS required |
| GitHub Actions | latest-head SUCCESS required |

Overall Size Capability Audit v1 remains **PARTIAL_PASS** because managed source work and Human Approval are still open.

## 19. Next Human Approval Step

The next and only Product Master Change Proposal requiring explicit Human Approval in this audit scope is:

`PMCP-LIX-SAMOSL-INNER-TILT-RANGE-20260903-001`

Stop at `PROPOSAL_READY / HUMAN_APPROVAL_PENDING`. Do not apply to formal Product Master, STAGING, Production, or Runtime until explicit approval is received.
