# Sash Size Capability Audit v1

## 1. Final Status

- Common Sash Sales Input Contract v1.0: **FORMAL PASS**
- Size Capability Audit v1: **PARTIAL PASS**
- Generic Audit Core integrity: **PASS**
- Managed blocking PENDING: **9**
- Active Product Master Change Proposal awaiting Human Approval: **0**
- CR-SL-036 Change Control: **FORMAL MASTER APPLIED / RUNTIME REGENERATED v1.9**
- Audit process automatic mutation: **0**

The audit artifacts themselves remain non-mutating. The approved Product Master change was executed through the separate Change Control records and is referenced by the audit as an external controlled application.

## 2. Scope

Only these four current residential sash series are in scope.

| Product | Active nodes | Canonical STANDARD | Runtime STANDARD | CUSTOM |
| --- | ---: | ---: | ---: | --- |
| LIXIL サーモスⅡ-H | 17 | 2,131 | 2,131 | source confirmed / exact rules pending |
| LIXIL サーモスL | 17 | 1,495 | 1,495 | 50 rules audited |
| YKK AP APW430 | 25 | 718 | 718 | source confirmed / exact rules pending |
| YKK AP APW431 | 6 | 538 | 538 | 29 rules audited |

No new series, branch, PR, or sales-UI design is introduced by this audit.

## 3. Architecture and Source Priority

Audit path:

`Official Manufacturer Source → Evidence / Adjudication → Canonical Product Master → Runtime`

Controlled manufacturer-data change path:

`Official Source → Evidence → Adjudication → Product Master Change Proposal → HUMAN Approval → STAGING → Production Preview → Formal Product Master → Runtime Regeneration`

Official manufacturer documents are the primary evidence. Canonical workbooks are comparison and production targets; Canonical↔Runtime equality alone never creates Official Source PASS.

Generic audit and Runtime cores remain product-agnostic. Manufacturer-specific dimensions live in Product Master / Evidence / product-specific projection records, not product-name branches in generic Runtime code.

## 4. STANDARD Audit

STANDARD is checked independently at three layers:

1. Official manufacturer setting
2. Canonical STANDARD Size Master
3. Runtime STANDARD inventory

Current Canonical→Runtime equality remains:

- サーモスⅡ-H: **2131 / 2131**
- サーモスL: **1495 / 1495**
- APW430: **718 / 718**
- APW431: **538 / 538**

Full Official Source selector-state enumeration is still incomplete, therefore the overall audit stays `PARTIAL_PASS`.

### Thermos L verified slice

`シャッター付引違い窓 / 手動 / 標準タイプ / printed p.54–61`

- Official: **97**
- Canonical: **97**
- Runtime: **97**
- Missing: **0**
- Extra: **0**

This is a slice PASS, not full-series STANDARD PASS.

## 5. Construction-Hidden Policy

`construction` is an internal selector and stays hidden from sales UI. STANDARD candidate output is the union of valid internal construction records after dependency filtering.

For CUSTOM, if hidden construction or another internal condition prevents a unique safe result, Runtime returns `REVIEW_REQUIRED`; it must not silently choose a construction-dependent PASS.

## 6. CUSTOM Audit and REVIEW Policy

A missing Runtime Dimension Rule never means `CUSTOM_NOT_APPLICABLE` unless the official source proves non-applicability.

Extraction states include:

- `EXACT_RULE_EXTRACTED`
- `SOURCE_GRAPH_REVIEW_REQUIRED`
- `SOURCE_INSUFFICIENT`
- `PENDING`

Complex graph, diagonal, glass, weight, wind-pressure, emergency, or compound restrictions are not guessed into simple rectangular rules. Unresolved final conditions stay `REVIEW_REQUIRED` / `PENDING`.

## 7. Thermos L — 50 Dimension Rules

Current audit after CR-SL-036 controlled application:

- MATCH: **38**
- SOURCE_GRAPH_REVIEW_REQUIRED: **12**
- RULE_MISMATCH: **0**
- Total: **50 / 50**

### CR-SL-036 / 内倒し窓

Target selector:

- `window_type = WT-SL-UCHIDAOSHI`
- `specific_spec = *`
- `construction = 在来 / 204`
- `leaf_configuration = 単窓`
- unit: `mm`

Old rule:

- `240<=W<=870: 350<=H<=943`
- `870<W<=1690: 350<=H<=500`

Approved W/H safe boundary:

- `240<=W<=815: 350<=H<=943`
- `815<W<=870: 350<=H<=755`
- `870<W<=1690: 350<=H<=500`

Only the source-readable P221 vertices are used:

`(240,350) → (240,943) → (815,943) → (815,755) → (870,755) → (870,500) → (1690,500) → (1690,350)`

No interpolated point was added.

P221 also contains a 3-A-3-only / glass-composition condition. Therefore the final Runtime rule is `COMPOUND_GATE`, `automatic=false`, and `RUNTIME_SAFETY_REVIEW_REQUIRED`. W/H alone does not produce final AUTO PASS.

## 8. CR-SL-036 Change Control Completion

Proposal identity remains immutable:

- Proposal ID: `PMCP-LIX-SAMOSL-INNER-TILT-RANGE-20260903-001`
- Proposal fingerprint: `sha256:bf89762cd1cf88be8620b93599d2987c23d50fcb335e6c2b525f5a14175184ee`
- Payload integrity fingerprint: `sha256:14eb2445bca8165c29311bdcc37ec3bdb69eafea0d1a79fe82327212ddfd8b68`

The historical Proposal manifest remains `PROPOSED / HUMAN_REQUIRED / PENDING` because it is an immutable proposal artifact. Human approval, STAGING, Production approval, Production readback, and Runtime regeneration are persisted as separate Change Control records.

### STAGING

- status: **PASS**
- target: `06C_特注寸法範囲 / CR-SL-036 / Excel row 39`
- changed rules: **1**
- other Dimension Rules changed: **0**
- STANDARD Master changed: **false**
- other Product Nodes changed: **0**
- other series changed: **0**

### Production Preview

Preview fingerprint:

`sha256:41d91b6079ddc1a469ff7995bfadc3e51df0e57a35d54f9ca0c82ed5300116e4`

Approved write cells:

- `G39`
- `L39`
- `M39`
- `N39`
- `O39`
- `V39`

Expected and read-back unexpected changed cells: **0**.

### Formal Product Master

Drive target:

`17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL`

Pre-write SHA-256:

`664a51bd5b9ded22e19780b1ce339338cba45f292438221b0a60fc3974e1abf9`

Post-write SHA-256:

`cd6844218fcf0150a16cbbfa947f391aa08f5449b82ba6fc2249ccdb6894c3d3`

Post-write revision:

`0B1PsqngSohhlZVhYaTVRdUNPRFp4ZVB5Y05IdnJNYXI4YTlZPQ`

Backup before Production:

`1PQsjvO3lRRbFN1xX0NmfzHck4TU2vAnJ`

Readback confirmed exactly six changed cells in `06C_特注寸法範囲` and no value changes on the other sheets/rules.

## 9. Runtime Regeneration v1.9

Runtime was not patched by inserting the manufacturer values into generic code or the large legacy encoded data part.

Instead, the formal Master change is projected through:

`src/catalog/modules/thermosl-runtime-formal-dimension-delta-v19.mjs`

and loaded by:

`src/catalog/modules/thermosl-source.mjs`

The adapter validates that the legacy source still contains the expected old CR-SL-036 before overlaying the one formally approved rule. Dimension Rule count remains **50**.

Runtime STANDARD inventory must remain:

- サーモスⅡ-H: **2131**
- サーモスL: **1495**
- APW430: **718**
- APW431: **538**

Boundary regression explicitly covers W=815 / 816 / 870 / 871 / 1690 / 1691 and H=943 / 755 / 500 boundary cases. Within the CR-SL-036 outer range the final result remains `REVIEW_REQUIRED` until the glass/composition condition can also be resolved; values outside the outer range are `BLOCK`.

## 10. Remaining Thermos L PENDING

Resolved:

- `PEND-SIZE-SL-RULE-036`

Still open:

- `PEND-SIZE-SL-STANDARD-001`
- `PEND-SIZE-SL-GRILLE-001`
- `PEND-SIZE-SL-AUTO-SAFETY`

`高強度縦格子` and `目隠し可動ルーバー` remain PENDING until current setting, Thermos L applicability, Product Node vs Selector modeling, STANDARD sizes, CUSTOM range, and Canonical omission are all source-confirmed.

## 11. APW431

- MATCH: **21**
- SOURCE_GRAPH_REVIEW_REQUIRED: **8**
- RULE_MISMATCH: **0**
- Total: **29 / 29**

Graph/compound restrictions remain REVIEW where wind pressure, glass, weight, or other manufacturer conditions are not fully automatable.

## 12. サーモスⅡ-H CUSTOM

- Active Product Nodes: **17**
- Source Capability: **CONFIRMED**
- Exact Runtime rules: **0 / 17**
- PENDING: **17**

Official source sections are mapped, but exact payload extraction and current-2026 continuity remain open.

## 13. APW430 CUSTOM

- Active Product Nodes: **25**
- Source Capability: **CONFIRMED**
- Exact Runtime rules: **0 / 25**
- PENDING: **25**

Official manufacturing-range pages are mapped; exact selector/rule extraction remains PENDING.

## 14. Generic Gate / CI

The Generic Core distinguishes `FORMAL_PASS`, `PARTIAL_PASS`, and `FAIL`.

Managed PENDING is allowed while integrity defects fail CI. CI checks include:

- Generic audit tests
- immutable proposal fingerprint / payload integrity
- applied Human Approval / STAGING / Production records
- formal Master readback SHA record
- Runtime regeneration record
- exact Runtime STANDARD inventories
- deterministic `gate-report.json`
- full repository tests / runtime smoke / browser QA through V2 Recovery CI

The proposal is no longer an **active pending proposal** in `summary.json`; it is retained under `appliedProductMasterChangeProposals` and all immutable proposal artifacts remain auditable.

## 15. Browser QA Acceptance

Latest-head CI must confirm:

- Desktop: PASS
- 390×844: PASS
- horizontalOverflowPx: 0
- construction UI: 0
- consoleErrors: 0
- pageErrors: 0 or no page-error failure in the existing QA harness

No new UI design is required.

## 16. Final Gate

| Gate | Status |
| --- | --- |
| Common Sales Input Contract | FORMAL PASS |
| Generic Size Capability Audit Core | PASS |
| Thermos L Rule Audit | 38 MATCH / 12 REVIEW / 0 MISMATCH |
| CR-SL-036 Human Approval | APPROVED |
| CR-SL-036 STAGING | PASS |
| CR-SL-036 Production Preview | PASS |
| CR-SL-036 Formal Master | APPLIED / READBACK PASS |
| CR-SL-036 Runtime | REGENERATED v1.9 |
| APW431 Rule Audit | PASS |
| S2H CUSTOM | PARTIAL_PASS / extraction pending |
| APW430 CUSTOM | PARTIAL_PASS / extraction pending |
| 4-Series STANDARD Official Source | PARTIAL_PASS / managed PENDING |
| Remaining blocking PENDING | 9 |

Overall Size Capability Audit v1 remains **PARTIAL_PASS** because nine managed source/safety items are still open. CR-SL-036 itself is no longer a blocking mismatch.
