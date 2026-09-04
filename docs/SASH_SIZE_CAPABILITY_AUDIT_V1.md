# Sash Size Capability Audit v1

## 1. Current Status

- Common Sash Sales Input Contract v1.0: **FORMAL PASS**
- Size Capability Audit v1: **PARTIAL PASS**
- Generic Audit Core integrity: **PASS**
- Managed blocking PENDING: **6**
- Active Product Master Change Proposal awaiting Human Approval: **1**
- S2H STANDARD official enumeration: **2309/2309 classified / Proposal READY**
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

No new branch or PR is introduced by this audit.

## 3. Architecture and Source Priority

Audit path:

`Official Manufacturer Source → Evidence / Adjudication → Canonical Product Master → Runtime`

Controlled manufacturer-data change path:

`Official Source → Evidence → Adjudication → Product Master Change Proposal → HUMAN Approval → Backup → STAGING → Production Preview → Formal Product Master → readback → Runtime Regeneration`

Canonical↔Runtime equality alone never creates Official Source PASS. Generic audit and Runtime cores remain product-agnostic.

## 4. サーモスⅡ-H STANDARD — Official Source Enumeration Complete

Current official source:

- `202604_LIXIL_サーモスⅡ－Ｈ_業務用資料集_完成品価格表.pdf`
- Drive file ID: `1x4lovMcyfkyFzulYiQIv8OE5dpq6wDor`
- edition label: **2026年5月価格掲載版**
- Current 2026 continuity: **CONFIRMED_CURRENT**

Enumeration result across all 17 Active Product Nodes:

- Official explicit records: **2,309**
- Current Formal Master records: **2,297**
- `MATCH`: **1,985**
- `VALUE_MISMATCH`: **312**
  - H actual-dimension correction: **310**
  - official `16524サイズは製作不可` availability corrections: **2**
- `MISSING_IN_MASTER`: **12**
- `EXTRA_IN_MASTER`: **0**
- `SELECTOR_MISMATCH`: **0**
- `SOURCE_SYMBOL_REVIEW_REQUIRED`: **0**
- `SOURCE_INSUFFICIENT`: **0**

The 310 H corrections are source-confirmed systematic groups: +15 mm = 136 records, +30 mm = 132 records, +40 mm = 42 records. No W×H Cartesian generation and no inferred source cell were used.

The 12 missing records are the four official call codes `15011`, `16011`, `25618-4`, `34718` across the three rain-door selector states. P313 resolves the movable-louver applicability: `15011` is inactive for that selector while the remaining new selector-state rows are source-classified.

Current Canonical/Runtime inventory is intentionally unchanged before approval:

- Formal rows: **2,297**
- selectable: **2,131**
- inactive: **166**
- Runtime selectable: **2,131**

Projected only after approved Formal apply:

- Formal rows: **2,309**
- selectable: **2,140**
- inactive: **169**

Change Proposal:

- Proposal ID: `PMCP-LIX-SAMOS2H-STANDARD-SOURCE-CORRECTION-20260904-001`
- Fingerprint: `sha256:b141224a4dc0981eee4d8c82574cc8b52e5b75e8ba70b1809053e9c9c27793d8`
- Base Formal Master SHA-256: `7ca8f5cca19187bfb841bc3f3393fb29de591dc554714627faf3a652130cd8a7`
- Base Drive revision: `0B1PsqngSohhlMnF3SHRHUm80TTlYR0hvb2VuS3dsK0dZeEJRPQ`
- Status: **PROPOSED / HUMAN_REQUIRED / PENDING**
- Formal Product Master write: **false**
- Runtime write: **false**

`PEND-SIZE-S2H-STANDARD-001` source-enumeration blocker is resolved and replaced by the explicit HUMAN Change-Control gate.

## 5. Construction-Hidden Policy

`construction` is an internal selector and stays hidden from sales UI. If a hidden construction or another internal condition prevents a unique safe CUSTOM result, Runtime returns `REVIEW_REQUIRED`; it must not silently choose a construction-dependent PASS.

## 6. サーモスⅡ-H CUSTOM

- Active Product Nodes: **17 / 17**
- Official Source coverage: **17 / 17**
- `EXACT_RULE_EXTRACTED`: **7**
- `SOURCE_GRAPH_REVIEW_REQUIRED`: **10**
- Runtime Dimension Rules: **17**
- Runtime final AUTO rules: **0**
- Runtime REVIEW rules: **17**

Proposal `PMCP-LIX-SAMOS2H-CUSTOM-DIMENSION-RULESET-20260903-001` remains historically immutable while external HUMAN Change Control records its completed application.

## 7. Thermos L

- 50 Dimension Rules audited
- MATCH: **38**
- SOURCE_GRAPH_REVIEW_REQUIRED: **12**
- RULE_MISMATCH: **0**
- CR-SL-036 Formal Master applied / Runtime v1.9

## 8. APW430 CUSTOM

- Active Product Nodes: **25 / 25**
- Official Source coverage: **25 / 25**
- Exact: **20**
- Review: **5**
- Runtime Dimension Rules: **25**
- final AUTO: **0**
- Formal Master applied / Runtime v1.0

## 9. APW431

- MATCH: **21**
- SOURCE_GRAPH_REVIEW_REQUIRED: **8**
- RULE_MISMATCH: **0**
- Total: **29 / 29**

## 10. Remaining Blocking PENDING

Still open:

- `PEND-SIZE-SL-STANDARD-001`
- `PEND-SIZE-SL-GRILLE-001`
- `PEND-SIZE-SL-AUTO-SAFETY`
- `PEND-SIZE-APW430-STANDARD-001`
- `PEND-SIZE-APW431-STANDARD-001`
- `PEND-SIZE-APW431-AUTO-SAFETY`

Blocking count: **6**.

Active Human Approval gate:

- `PMCP-LIX-SAMOS2H-STANDARD-SOURCE-CORRECTION-20260904-001`

## 11. Generic Gate / CI

Expected managed gate before Human Approval:

- `status = PARTIAL_PASS`
- `integrityGate = PASS`
- `blockingPending = 6`
- `proposalCount = 1`
- `proposalApprovalGate = HUMAN_APPROVAL_PENDING`
- manufacturer-data mutation by generic audit = **false**

Current runtime inventories remain S2H 2131 / Thermos L 1495 / APW430 718 / APW431 538 until approved production application.

## 12. Browser QA Acceptance

Latest-head V2 Recovery CI must confirm Desktop and 390×844 Browser QA, horizontal overflow 0, construction hidden and console errors 0. Only report `pageErrors = 0` when the harness explicitly exposes that metric; otherwise report `no page-error failure observed`.

## 13. Current Gate

Overall Size Capability Audit v1 remains **PARTIAL_PASS** and S2H STANDARD is **PROPOSAL_READY / HUMAN_APPROVAL_PENDING**.
