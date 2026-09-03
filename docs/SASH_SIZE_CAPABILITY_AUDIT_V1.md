# Sash Size Capability Audit v1

## 1. Current Status

- Common Sash Sales Input Contract v1.0: **FORMAL PASS**
- Size Capability Audit v1: **PARTIAL PASS**
- Generic Audit Core integrity: **PASS**
- Managed blocking PENDING: **7**
- Active Product Master Change Proposal awaiting Human Approval: **1**
- S2H CUSTOM extraction: **17/17 classified / Formal Master applied / Runtime v1.0**
- Thermos L CR-SL-036: **Formal Master applied / Runtime v1.9**
- APW430 CUSTOM extraction: **25/25 classified / Proposal ready / Human Approval pending**

The audit itself remains non-mutating. Manufacturer data reaches a Formal Product Master only through explicit Change Control and HUMAN Approval.

## 2. Scope

Only these four current residential sash series are in scope.

| Product | Active nodes | Canonical STANDARD | Runtime STANDARD | CUSTOM |
| --- | ---: | ---: | ---: | --- |
| LIXIL サーモスⅡ-H | 17 | 2,131 | 2,131 | 17 formal rules connected; 7 exact / 10 review |
| LIXIL サーモスL | 17 | 1,495 | 1,495 | 50 rules audited |
| YKK AP APW430 | 25 | 718 | 718 | 25/25 classified; 20 exact / 5 review; proposal pending |
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

- Active Product Nodes: **17 / 17**
- Official Source coverage: **17 / 17**
- `EXACT_RULE_EXTRACTED`: **7**
- `SOURCE_GRAPH_REVIEW_REQUIRED`: **10**
- `SOURCE_INSUFFICIENT`: **0**
- `PENDING`: **0**
- Runtime Dimension Rules: **17**
- Runtime final AUTO rules: **0**
- Runtime REVIEW rules: **17**

Proposal `PMCP-LIX-SAMOS2H-CUSTOM-DIMENSION-RULESET-20260903-001` was applied through external HUMAN Change Control. Formal target `06E_特注寸法範囲` contains 17 rules, post-write SHA-256 is `7ca8f5cca19187bfb841bc3f3393fb29de591dc554714627faf3a652130cd8a7`, and Runtime was regenerated from the Formal Product Master as v1.0.

`PEND-SIZE-S2H-CUSTOM-001` is resolved.

## 7. Thermos L — 50 Dimension Rules

Current audit after CR-SL-036 controlled application:

- MATCH: **38**
- SOURCE_GRAPH_REVIEW_REQUIRED: **12**
- RULE_MISMATCH: **0**
- Total: **50 / 50**

CR-SL-036 remains formally applied and Runtime v1.9 remains the current Thermos L baseline.

## 8. APW430 CUSTOM — Extraction Complete / Human Approval Gate

Current official source set:

- `202608_YKKAP_APW430_業務用資料集.pdf`
  - Source ID: `SRC-YKK-APW430-BUSINESS-202608`
  - Catalog code: `XAAAA-H26-075S1`
  - Issue: `2026-08`
  - CUSTOM printed pages: **P2–P8**
  - Current continuity: **CONFIRMED_CURRENT**
- `202607_YKKAP_APW430_商品カタログ.pdf`
  - Source ID: `SRC-YKK-APW430-CATALOG-202607`
  - Catalog code: `XAAAA-H26-074-1`
  - Issue: `2026-07`
  - Current continuity: **CONFIRMED_CURRENT**

Node-level result:

- Active Product Nodes: **25 / 25**
- Official Source coverage: **25 / 25**
- `EXACT_RULE_EXTRACTED`: **20**
- `SOURCE_GRAPH_REVIEW_REQUIRED`: **5**
- `SOURCE_INSUFFICIENT`: **0**
- `PENDING`: **0**
- Source-interpolated points added: **0**
- Formal Product Master write: **false**
- Runtime direct manufacturer write: **false**
- Runtime Dimension Rules remain: **0** until approved Formal Master application

All extracted rules remain safety-side. Even when source geometry is exact, glass weight, glass composition, wind-pressure, component, or other conditions prevent a W/H-only final AUTO PASS; these are represented as `COMPOUND_GATE / automatic=false / RUNTIME_SAFETY_REVIEW_REQUIRED` where applicable.

Five nodes remain Source Graph review rather than guessed geometry:

- 高所用すべり出し窓（端部操作仕様）単窓
- シャッター付引違い窓
- FIX窓 窓タイプ
- FIX窓 テラスタイプ（在来）
- FIX窓 テラスタイプ（2×4）

The current APW430 Formal Product Master has no CUSTOM Dimension Rule sheet. A controlled addition is proposed as `06C_特注寸法範囲`.

### APW430 Product Master Change Proposal

- Proposal ID: `PMCP-YKK-APW430-CUSTOM-DIMENSION-RULESET-20260903-001`
- Fingerprint: `sha256:894ca2e99cfd482b0093bfbc1d1763383a8e01c5c8614d75ac1560938ae5eb78`
- Base Formal Master Drive file ID: `1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo`
- Base XLSX snapshot SHA-256: `b149cc61ea2a2ddf119286ce39b4c03737ad789e7cbab2cec9e414f1dcffccd9`
- Target sheet: `06C_特注寸法範囲`
- Operation: `ADD_DIMENSION_RULESET`
- Status: `PROPOSED`
- Approval policy: `HUMAN_REQUIRED`
- Approval status: `PENDING`
- Formal workbook write performed: **false**
- Runtime write performed: **false**
- Auto approval performed: **false**

`PEND-SIZE-APW430-CUSTOM-001` is resolved as an extraction PENDING. Formal Master application is represented separately by this Human Approval gate.

## 9. APW431

- MATCH: **21**
- SOURCE_GRAPH_REVIEW_REQUIRED: **8**
- RULE_MISMATCH: **0**
- Total: **29 / 29**

## 10. Remaining Blocking PENDING

Still open:

- `PEND-SIZE-S2H-STANDARD-001`
- `PEND-SIZE-SL-STANDARD-001`
- `PEND-SIZE-SL-GRILLE-001`
- `PEND-SIZE-SL-AUTO-SAFETY`
- `PEND-SIZE-APW430-STANDARD-001`
- `PEND-SIZE-APW431-STANDARD-001`
- `PEND-SIZE-APW431-AUTO-SAFETY`

Blocking count: **7**.

Resolved extraction/control items include:

- `PEND-SIZE-SL-RULE-036`
- `PEND-SIZE-S2H-CUSTOM-001`
- `PEND-SIZE-APW430-CUSTOM-001`

## 11. Generic Gate / CI

Current expected gate:

- `status = PARTIAL_PASS`
- `integrityGate = PASS`
- `blockingPending = 7`
- `proposalCount = 1`
- `proposalApprovalGate = HUMAN_APPROVAL_PENDING`
- manufacturer-data mutation by generic audit = **false**

CI enforces deterministic `gate-report.json`, Change Control integrity, APW430 proposal immutability/fingerprint, Runtime inventory preservation, repository tests, Runtime smoke and Browser QA.

## 12. Browser QA Acceptance

Latest-head V2 Recovery CI must confirm:

- Desktop: PASS
- 390×844: PASS
- horizontalOverflowPx: 0
- construction UI hidden
- consoleErrors: 0

Only report `pageErrors = 0` if the harness explicitly exposes that metric; otherwise report `no page-error failure observed`.

## 13. Current Gate

| Gate | Status |
| --- | --- |
| Common Sales Input Contract | FORMAL PASS |
| Generic Size Capability Audit Core | PASS |
| S2H CUSTOM | FORMAL MASTER APPLIED / Runtime v1.0 |
| Thermos L CR-SL-036 | FORMAL MASTER APPLIED / Runtime v1.9 |
| APW430 CUSTOM Source Coverage | 25 / 25 |
| APW430 CUSTOM Classification | 20 EXACT / 5 REVIEW / 0 PENDING |
| APW430 Formal Master | NOT WRITTEN |
| APW430 Runtime CUSTOM | NOT WRITTEN / 0 rules |
| APW430 Change Proposal | HUMAN_APPROVAL_PENDING |
| APW431 Rule Audit | PASS |
| 4-Series STANDARD Official Source | PARTIAL_PASS / managed PENDING |
| Remaining blocking PENDING | 7 |

Overall Size Capability Audit v1 remains **PARTIAL_PASS**. APW430 CUSTOM extraction is complete and the current controlled stop point is `PROPOSAL_READY / HUMAN_APPROVAL_PENDING`.
