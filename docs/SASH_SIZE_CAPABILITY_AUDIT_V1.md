# Sash Size Capability Audit v1

## 1. Current Status

- Common Sash Sales Input Contract v1.0: **FORMAL PASS**
- Size Capability Audit v1: **PARTIAL PASS**
- Generic Audit Core integrity: **PASS**
- Managed blocking PENDING: **8**
- Active Product Master Change Proposal awaiting Human Approval: **0**
- S2H CUSTOM extraction: **17/17 classified**
- S2H CUSTOM Change Control: **FORMAL MASTER APPLIED / RUNTIME REGENERATED v1.0**
- Thermos L CR-SL-036 Change Control: **FORMAL MASTER APPLIED / RUNTIME REGENERATED v1.9**

The audit itself remains non-mutating. Manufacturer data reaches a Formal Product Master only through explicit Change Control and HUMAN Approval.

## 2. Scope

Only these four current residential sash series are in scope.

| Product | Active nodes | Canonical STANDARD | Runtime STANDARD | CUSTOM |
| --- | ---: | ---: | ---: | --- |
| LIXIL サーモスⅡ-H | 17 | 2,131 | 2,131 | 17 formal rules connected; 7 exact / 10 review |
| LIXIL サーモスL | 17 | 1,495 | 1,495 | 50 rules audited |
| YKK AP APW430 | 25 | 718 | 718 | source confirmed / exact rules pending |
| YKK AP APW431 | 6 | 538 | 538 | 29 rules audited |

No new series, branch, PR, or sales-UI-specific manufacturer branch is introduced by this audit.

## 3. Architecture and Source Priority

Audit path:

`Official Manufacturer Source → Evidence / Adjudication → Canonical Product Master → Runtime`

Controlled manufacturer-data change path:

`Official Source → Evidence → Adjudication → Product Master Change Proposal → HUMAN Approval → Backup → STAGING → Production Preview → Formal Product Master → readback → Runtime Regeneration`

Canonical↔Runtime equality alone never creates Official Source PASS. Generic audit and Runtime cores remain product-agnostic.

## 4. STANDARD Audit

Current Canonical→Runtime equality remains unchanged:

- サーモスⅡ-H: **2131 / 2131**
- サーモスL: **1495 / 1495**
- APW430: **718 / 718**
- APW431: **538 / 538**

Full Official Source selector-state enumeration is still incomplete, therefore the overall audit stays `PARTIAL_PASS`.

Thermos L verified STANDARD slice remains `シャッター付引違い窓 / 手動 / 標準タイプ`: Official 97 / Canonical 97 / Runtime 97.

## 5. Construction-Hidden Policy

`construction` is an internal selector and stays hidden from sales UI. If a hidden construction or another internal condition prevents a unique safe CUSTOM result, Runtime returns `REVIEW_REQUIRED`; it must not silently choose a construction-dependent PASS.

## 6. サーモスⅡ-H CUSTOM — Formal Application Complete

Current 2026 continuity was revalidated against the project copy of the 444-page SM3100 catalog and LIXIL current catalog lineage. No source graph was converted into invented/interpolated geometry.

Node-level result:

- Active Product Nodes: **17 / 17**
- Official Source coverage: **17 / 17**
- `EXACT_RULE_EXTRACTED`: **7**
- `SOURCE_GRAPH_REVIEW_REQUIRED`: **10**
- `SOURCE_INSUFFICIENT`: **0**
- `PENDING`: **0**
- Runtime Dimension Rules: **17**
- Runtime final AUTO rules: **0**
- Runtime REVIEW rules: **17**

Exact W/H geometry was extracted for:

- 縦すべり出し窓
- 横すべり出し窓
- 高所用横すべり出し窓
- 上げ下げ窓FS
- 内倒し窓
- 外倒し窓
- 採風勝手口ドアFS

The remaining ten nodes stay `SOURCE_GRAPH_GATE` / review rather than guessed geometry.

### S2H inner-tilt safety

Source-confirmed vertices only:

`(240,350) → (240,943) → (815,943) → (815,755) → (870,755) → (870,500) → (1690,500) → (1690,350)`

Safe W/H geometry:

- `240<=W<=815: 350<=H<=943`
- `815<W<=870: 350<=H<=755`
- `870<W<=1690: 350<=H<=500`

Because the 3-A-3 / glass-composition condition remains, the final rule is `COMPOUND_GATE`, `automatic=false`, `RUNTIME_SAFETY_REVIEW_REQUIRED`.

## 7. S2H Product Master Change Control

Proposal identity remains immutable:

- ID: `PMCP-LIX-SAMOS2H-CUSTOM-DIMENSION-RULESET-20260903-001`
- Fingerprint: `sha256:bd5900002f8d54d322fb7c50bb0b4b121f54a81ece7ec0e60baaffe6914df08e`
- Historical proposal manifest: `PROPOSED / HUMAN_REQUIRED / PENDING`

Approval/application state is represented by separate Change Control records.

Formal target:

- Drive file ID: `1kTRcb7UdghZl7h3lYdmnZuB7fUVUAduU`
- Title: `サーモスⅡH_商品マスター_v0.9_納まりアンカー追補_GoldenTest版.xlsx`
- Pre-write SHA-256: `8dea8b2ecec1715445db74255f591b4f2bcf404027f0006f168a585365df29d6`
- Post-write/readback SHA-256: `7ca8f5cca19187bfb841bc3f3393fb29de591dc554714627faf3a652130cd8a7`
- Backup Drive file ID: `16ZywYmiuVOp7iUsKroJIlQ76vQ8fSOCZ`
- Added sheet: `06E_特注寸法範囲`
- Added rule records: **17**
- Unexpected changes to existing sheets: **0**
- STANDARD Size Master changed: **false**

Runtime regeneration:

- Runtime version: **v1.0**
- Source of truth: **FORMAL_PRODUCT_MASTER**
- Dimension Rules: **17**
- `dimensionAuto`: **0**
- `dimensionReview`: **17**
- Generic Core manufacturer-value write: **false**
- Legacy compressed base-source direct edit: **false**

The historical S2H v0.7 base-source lineage remains preserved separately from the newly applied v1.0 CUSTOM formal delta.

`PEND-SIZE-S2H-CUSTOM-001` is resolved.

## 8. Thermos L — 50 Dimension Rules

Current audit after CR-SL-036 controlled application:

- MATCH: **38**
- SOURCE_GRAPH_REVIEW_REQUIRED: **12**
- RULE_MISMATCH: **0**
- Total: **50 / 50**

CR-SL-036 remains formally applied and Runtime v1.9 remains the current Thermos L baseline.

## 9. Remaining Blocking PENDING

Still open:

- `PEND-SIZE-S2H-STANDARD-001`
- `PEND-SIZE-SL-STANDARD-001`
- `PEND-SIZE-SL-GRILLE-001`
- `PEND-SIZE-SL-AUTO-SAFETY`
- `PEND-SIZE-APW430-STANDARD-001`
- `PEND-SIZE-APW430-CUSTOM-001`
- `PEND-SIZE-APW431-STANDARD-001`
- `PEND-SIZE-APW431-AUTO-SAFETY`

Blocking count: **8**.

## 10. APW431

- MATCH: **21**
- SOURCE_GRAPH_REVIEW_REQUIRED: **8**
- RULE_MISMATCH: **0**
- Total: **29 / 29**

## 11. APW430 CUSTOM

- Active Product Nodes: **25**
- Source Capability: **CONFIRMED**
- Exact Runtime rules: **0 / 25**
- PENDING: **25**

This is the next recommended CUSTOM extraction target.

## 12. Generic Gate / CI

Current expected gate:

- `status = PARTIAL_PASS`
- `integrityGate = PASS`
- `blockingPending = 8`
- `proposalCount = 0`
- `proposalApprovalGate = NO_PROPOSAL_PENDING`
- manufacturer-data mutation by generic audit = **false**

CI enforces deterministic `gate-report.json`, Change Control integrity, Runtime inventory preservation, repository tests, Runtime smoke and Browser QA.

## 13. Browser QA Acceptance

Latest-head V2 Recovery CI must confirm:

- Desktop: PASS
- 390×844: PASS
- horizontalOverflowPx: 0
- construction UI hidden
- consoleErrors: 0
- S2H size mode: `STANDARD / CUSTOM`

Only report `pageErrors = 0` if the harness explicitly exposes that metric; otherwise report `no page-error failure observed`.

## 14. Current Gate

| Gate | Status |
| --- | --- |
| Common Sales Input Contract | FORMAL PASS |
| Generic Size Capability Audit Core | PASS |
| S2H CUSTOM Source Coverage | 17 / 17 |
| S2H CUSTOM Classification | 7 EXACT / 10 REVIEW / 0 PENDING |
| S2H Formal Master | APPLIED / READBACK PASS |
| S2H Runtime CUSTOM | REGENERATED v1.0 / 17 REVIEW |
| S2H Change Proposal | APPLIED via external HUMAN Change Control |
| Thermos L Rule Audit | 38 MATCH / 12 REVIEW / 0 MISMATCH |
| CR-SL-036 Formal Master / Runtime | APPLIED / v1.9 |
| APW431 Rule Audit | PASS |
| APW430 CUSTOM | PARTIAL_PASS / extraction pending |
| 4-Series STANDARD Official Source | PARTIAL_PASS / managed PENDING |
| Remaining blocking PENDING | 8 |

Overall Size Capability Audit v1 remains **PARTIAL_PASS**. S2H CUSTOM is formally applied and no longer an active proposal gate.
