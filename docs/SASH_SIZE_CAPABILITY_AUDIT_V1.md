# Sash Size Capability Audit v1

## 1. Current Status

- Common Sash Sales Input Contract v1.0: **FORMAL PASS**
- Size Capability Audit v1: **PARTIAL PASS**
- Generic Audit Core integrity: **PASS**
- Managed blocking PENDING: **7**
- Active Product Master Change Proposal awaiting Human Approval: **0**
- S2H CUSTOM: **17/17 classified / Formal Master applied / Runtime v1.0**
- Thermos L CR-SL-036: **Formal Master applied / Runtime v1.9**
- APW430 CUSTOM: **25/25 classified / Formal Master applied / Runtime v1.0**

The audit itself remains non-mutating. Manufacturer data reaches a Formal Product Master only through explicit Change Control and HUMAN Approval.

## 2. Scope

| Product | Active nodes | Canonical STANDARD | Runtime STANDARD | CUSTOM |
| --- | ---: | ---: | ---: | --- |
| LIXIL サーモスⅡ-H | 17 | 2,131 | 2,131 | 17 formal rules; 7 exact / 10 review |
| LIXIL サーモスL | 17 | 1,495 | 1,495 | 50 rules audited |
| YKK AP APW430 | 25 | 718 | 718 | 25 formal rules; 20 exact / 5 review |
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

- Active Product Nodes: **17 / 17**
- Official Source coverage: **17 / 17**
- `EXACT_RULE_EXTRACTED`: **7**
- `SOURCE_GRAPH_REVIEW_REQUIRED`: **10**
- Runtime Dimension Rules: **17**
- Runtime final AUTO rules: **0**
- Runtime REVIEW rules: **17**

Proposal `PMCP-LIX-SAMOS2H-CUSTOM-DIMENSION-RULESET-20260903-001` was applied through external HUMAN Change Control. Formal target `06E_特注寸法範囲` contains 17 rules and Runtime was regenerated from the Formal Product Master as v1.0.

`PEND-SIZE-S2H-CUSTOM-001` is resolved.

## 7. Thermos L — 50 Dimension Rules

- MATCH: **38**
- SOURCE_GRAPH_REVIEW_REQUIRED: **12**
- RULE_MISMATCH: **0**
- Total: **50 / 50**

CR-SL-036 remains formally applied and Runtime v1.9 remains the current Thermos L baseline.

## 8. APW430 CUSTOM — Formal Application Complete

Current official source set:

- `202608_YKKAP_APW430_業務用資料集.pdf` / `XAAAA-H26-075S1` / 2026-08 / printed P2–P8
- supporting `202607_YKKAP_APW430_商品カタログ.pdf` / `XAAAA-H26-074-1` / 2026-07

Node-level result:

- Active Product Nodes: **25 / 25**
- Official Source coverage: **25 / 25**
- `EXACT_RULE_EXTRACTED`: **20**
- `SOURCE_GRAPH_REVIEW_REQUIRED`: **5**
- `SOURCE_INSUFFICIENT`: **0**
- `PENDING`: **0**
- Source-interpolated points added: **0**
- Runtime Dimension Rules: **25**
- Runtime final AUTO rules: **0**
- Runtime REVIEW rules: **25**

All rules remain safety-side. Even exact source geometry does not become a final W/H-only AUTO PASS where glass weight, glass composition, wind-pressure, component, or other conditions apply. The five unresolved graph families remain `SOURCE_GRAPH_GATE`.

### APW430 Product Master Change Control

- Proposal ID: `PMCP-YKK-APW430-CUSTOM-DIMENSION-RULESET-20260903-001`
- Fingerprint: `sha256:894ca2e99cfd482b0093bfbc1d1763383a8e01c5c8614d75ac1560938ae5eb78`
- Formal Master Drive file ID: `1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo`
- Target sheet: `06C_特注寸法範囲`
- Backup Drive file ID: `1xx4HQJKbMTYpJK7QBe7i2sNioIHsqP1bkVFORndzKhw`
- STAGING Drive file ID: `1XVB3uGSL63_Ru0lHeUOllQArz4RHTLA6N8yYx-WnaEU`
- Pre-write Drive revision: `11`
- Post-write Drive revision: `13`
- Post-write modified time: `2026-09-03T12:55:43.206Z`
- Formal semantic fingerprint: `sha256:1940a1ce7b768ccd2cc0fa1f44ebc1e3ba65e26c40089d618b0b837607ae6966`
- Added rule records: **25**
- Unexpected changed existing sheets: **0**
- STANDARD Size Master changed: **false**

Native Google Sheet XLSX export bytes are not used as the live concurrency token because repeated exports of an unchanged Sheet are nondeterministic. The controlled write was guarded by Drive revision / modified time / pre-write sheet state, while the immutable proposal retains its approved base snapshot fingerprint.

Runtime regeneration:

- Runtime version: **v1.0**
- Source of truth: **FORMAL_PRODUCT_MASTER**
- Dimension Rules: **25**
- `dimensionAuto`: **0**
- `dimensionReview`: **25**
- Generic Core manufacturer-value write: **false**
- Runtime formal delta: `src/catalog/modules/apw430-runtime-formal-dimension-delta-v10.mjs`

`PEND-SIZE-APW430-CUSTOM-001` is resolved and the proposal is no longer an active Human Approval gate.

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
- `proposalCount = 0`
- `proposalApprovalGate = NO_PROPOSAL_PENDING`
- manufacturer-data mutation by generic audit = **false**

CI enforces deterministic `gate-report.json`, Change Control integrity, Runtime inventory preservation, repository tests, Runtime smoke and Browser QA.

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
| APW430 Formal Master | APPLIED / READBACK PASS / 06C |
| APW430 Runtime CUSTOM | REGENERATED v1.0 / 25 REVIEW |
| APW430 Change Proposal | APPLIED via external HUMAN Change Control |
| APW431 Rule Audit | PASS |
| 4-Series STANDARD Official Source | PARTIAL_PASS / managed PENDING |
| Remaining blocking PENDING | 7 |

Overall Size Capability Audit v1 remains **PARTIAL_PASS**. APW430 CUSTOM is formally applied and is no longer an active proposal gate.
