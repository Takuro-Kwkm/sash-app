# Sash Size Capability Audit v1

## 1. Final Status

- Common Sash Sales Input Contract v1.0: **FORMAL PASS**
- Size Capability Audit v1: **PARTIAL PASS**
- Generic Audit Core integrity: **PASS**
- Managed blocking PENDING: **8**
- Active Product Master Change Proposal awaiting Human Approval: **1**
- S2H CUSTOM extraction: **17/17 classified**
- CR-SL-036 Change Control: **FORMAL MASTER APPLIED / RUNTIME REGENERATED v1.9**
- Audit process automatic mutation: **0**

The audit artifacts remain non-mutating. Manufacturer data reaches a Formal Product Master only through Change Control and HUMAN Approval.

## 2. Scope

Only these four current residential sash series are in scope.

| Product | Active nodes | Canonical STANDARD | Runtime STANDARD | CUSTOM |
| --- | ---: | ---: | ---: | --- |
| LIXIL サーモスⅡ-H | 17 | 2,131 | 2,131 | 17/17 classified; Proposal pending |
| LIXIL サーモスL | 17 | 1,495 | 1,495 | 50 rules audited |
| YKK AP APW430 | 25 | 718 | 718 | source confirmed / exact rules pending |
| YKK AP APW431 | 6 | 538 | 538 | 29 rules audited |

No new series, branch, PR, or sales-UI design is introduced by this audit.

## 3. Architecture and Source Priority

Audit path:

`Official Manufacturer Source → Evidence / Adjudication → Canonical Product Master → Runtime`

Controlled manufacturer-data change path:

`Official Source → Evidence → Adjudication → Product Master Change Proposal → HUMAN Approval → STAGING → Production Preview → Formal Product Master → Runtime Regeneration`

Canonical↔Runtime equality alone never creates Official Source PASS. Generic audit and Runtime cores remain product-agnostic.

## 4. STANDARD Audit

Current Canonical→Runtime equality remains:

- サーモスⅡ-H: **2131 / 2131**
- サーモスL: **1495 / 1495**
- APW430: **718 / 718**
- APW431: **538 / 538**

Full Official Source selector-state enumeration is still incomplete, therefore the overall audit stays `PARTIAL_PASS`.

Thermos L verified STANDARD slice remains `シャッター付引違い窓 / 手動 / 標準タイプ`: Official 97 / Canonical 97 / Runtime 97.

## 5. Construction-Hidden Policy

`construction` is an internal selector and stays hidden from sales UI. If a hidden construction or another internal condition prevents a unique safe CUSTOM result, Runtime returns `REVIEW_REQUIRED`; it must not silently choose a construction-dependent PASS.

## 6. CUSTOM Audit and REVIEW Policy

Extraction states:

- `EXACT_RULE_EXTRACTED`
- `SOURCE_GRAPH_REVIEW_REQUIRED`
- `SOURCE_INSUFFICIENT`
- `PENDING`

Complex graph, diagonal, glass, weight, wind-pressure, emergency, or compound restrictions are not guessed into simple rectangular rules. Source graphs are never converted into interpolated polygons without source-confirmed vertices.

## 7. サーモスⅡ-H CUSTOM — 17/17 Classification Complete

Current 2026 continuity was revalidated against the project copy of the 444-page SM3100 catalog and LIXIL's current catalog listing. The official web catalog metadata retains `SM3100 / 2022-10` as the source-lineage base date; the current project PDF is a 2026 revised issue of that lineage.

Formal Product Master used for diff:

- Drive file ID: `1kTRcb7UdghZl7h3lYdmnZuB7fUVUAduU`
- Title: `サーモスⅡH_商品マスター_v0.9_納まりアンカー追補_GoldenTest版.xlsx`
- SHA-256: `8dea8b2ecec1715445db74255f591b4f2bcf404027f0006f168a585365df29d6`

The current v0.9 workbook has no CUSTOM Dimension Rule sheet. `06C` is already used for `面格子設定可否`, therefore the proposal target is a new `06E_特注寸法範囲`; **no workbook write has occurred**.

Node-level result:

- Active Product Nodes: **17 / 17**
- Official Source coverage: **17 / 17**
- `EXACT_RULE_EXTRACTED`: **7**
- `SOURCE_GRAPH_REVIEW_REQUIRED`: **10**
- `SOURCE_INSUFFICIENT`: **0**
- `PENDING`: **0**
- Runtime Dimension Rules written: **0**
- Formal Product Master writes: **0**

Exact W/H geometry was extracted for:

- 縦すべり出し窓
- 横すべり出し窓
- 高所用横すべり出し窓
- 上げ下げ窓FS
- 内倒し窓
- 外倒し窓
- 採風勝手口ドアFS

The following remain source-graph review gates rather than guessed geometry:

- 単体引違い窓
- シャッター付引違い窓
- 雨戸付引違い窓
- 面格子付引違い窓
- 面格子付上げ下げ窓FS
- FIX窓（外押縁タイプ）
- FIX窓（内押縁タイプ）
- 装飾引違い窓
- テラスドア
- 勝手口ドア

### S2H-specific grille confirmation

The current official common H/L catalog confirms `高強度縦格子` and `目隠し可動ルーバー` as S2H/L grille variations. Their P144/P199 graph labels are not fully safe for mechanical numeric extraction, so this audit records them as `SOURCE_GRAPH_REVIEW_REQUIRED`, not guessed AUTO rules.

### S2H inner-tilt safety

The common-source P221 boundary is retained with source-confirmed vertices only:

`(240,350) → (240,943) → (815,943) → (815,755) → (870,755) → (870,500) → (1690,500) → (1690,350)`

Safe W/H geometry:

- `240<=W<=815: 350<=H<=943`
- `815<W<=870: 350<=H<=755`
- `870<W<=1690: 350<=H<=500`

Because the 3-A-3 / glass-composition condition remains, the proposed final rule is `COMPOUND_GATE`, `automatic=false`, `RUNTIME_SAFETY_REVIEW_REQUIRED`.

## 8. S2H Product Master Change Proposal

Proposal:

- ID: `PMCP-LIX-SAMOS2H-CUSTOM-DIMENSION-RULESET-20260903-001`
- Fingerprint: `sha256:bd5900002f8d54d322fb7c50bb0b4b121f54a81ece7ec0e60baaffe6914df08e`
- Status: `PROPOSED`
- Approval policy: `HUMAN_REQUIRED`
- Approval status: `PENDING`
- Operation: `ADD_DIMENSION_RULESET`
- Target: `06E_特注寸法範囲 / CR-S2H-CUSTOM-RULESET-001`
- Formal workbook write: **false**
- Runtime write: **false**
- Auto approval: **false**
- Source-boundary interpolation added: **false**

`PEND-SIZE-S2H-CUSTOM-001` is resolved as an **extraction/classification pending** because every one of the 17 nodes now has a definitive Exact/Review state. Formal application is a separate gated action and has not been performed.

Final gate for this task: **PROPOSAL_READY / HUMAN_APPROVAL_PENDING**.

## 9. Thermos L — 50 Dimension Rules

Current audit after CR-SL-036 controlled application:

- MATCH: **38**
- SOURCE_GRAPH_REVIEW_REQUIRED: **12**
- RULE_MISMATCH: **0**
- Total: **50 / 50**

CR-SL-036 remains formally applied and Runtime v1.9 remains the current Thermos L baseline. Its historical proposal manifest remains immutable; Human Approval/Application are represented by separate Change Control records.

## 10. Runtime Integrity

No S2H manufacturer CUSTOM values were written directly to Runtime or Generic Core.

Runtime STANDARD inventory must remain:

- サーモスⅡ-H: **2131**
- サーモスL: **1495**
- APW430: **718**
- APW431: **538**

The S2H proposal may only reach Runtime after HUMAN Approval, STAGING, Production Preview, Formal Master write/readback, and Runtime regeneration.

## 11. Remaining Blocking PENDING

Resolved in this step:

- `PEND-SIZE-S2H-CUSTOM-001`

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

## 12. APW431

- MATCH: **21**
- SOURCE_GRAPH_REVIEW_REQUIRED: **8**
- RULE_MISMATCH: **0**
- Total: **29 / 29**

## 13. APW430 CUSTOM

- Active Product Nodes: **25**
- Source Capability: **CONFIRMED**
- Exact Runtime rules: **0 / 25**
- PENDING: **25**

This remains the next recommended CUSTOM extraction target after the S2H proposal is dispositioned.

## 14. Generic Gate / CI

The Generic Core distinguishes `FORMAL_PASS`, `PARTIAL_PASS`, and `FAIL`.

Current expected gate:

- `status = PARTIAL_PASS`
- `integrityGate = PASS`
- `blockingPending = 8`
- `proposalCount = 1`
- `proposalApprovalGate = HUMAN_APPROVAL_PENDING`
- manufacturer-data mutation by audit = **false**

CI enforces deterministic `gate-report.json`, Product Master Change Proposal fingerprint integrity, Runtime inventory preservation, repository tests, Runtime smoke and Browser QA.

## 15. Browser QA Acceptance

Latest-head V2 Recovery CI must confirm existing UI behavior remains green:

- Desktop: PASS
- 390×844: PASS
- horizontalOverflowPx: 0
- construction UI hidden
- consoleErrors: 0

Only report `pageErrors = 0` if the harness explicitly exposes that metric; otherwise report `no page-error failure observed`.

## 16. Final Gate

| Gate | Status |
| --- | --- |
| Common Sales Input Contract | FORMAL PASS |
| Generic Size Capability Audit Core | PASS |
| S2H CUSTOM Source Coverage | 17 / 17 |
| S2H CUSTOM Classification | 7 EXACT / 10 REVIEW / 0 PENDING |
| S2H Formal Master | NOT WRITTEN |
| S2H Runtime CUSTOM | NOT WRITTEN |
| S2H Change Proposal | HUMAN APPROVAL PENDING |
| Thermos L Rule Audit | 38 MATCH / 12 REVIEW / 0 MISMATCH |
| CR-SL-036 Formal Master / Runtime | APPLIED / v1.9 |
| APW431 Rule Audit | PASS |
| APW430 CUSTOM | PARTIAL_PASS / extraction pending |
| 4-Series STANDARD Official Source | PARTIAL_PASS / managed PENDING |
| Remaining blocking PENDING | 8 |

Overall Size Capability Audit v1 remains **PARTIAL_PASS**. The S2H CUSTOM extraction phase itself is complete and has reached **PROPOSAL_READY / HUMAN_APPROVAL_PENDING**.
