# Product Master Core v1.3｜Technical Evidence Boundary

Status: **IMPLEMENTATION PASS / APW430 PENDING 4→0**

Formal Product Master write: **0**

Runtime write: **0**

## Architecture decision

The formal Google Sheets Product Master remains focused on **product selection, applicability, dependency and selectable size data**.

Evidence provenance and official technical facts that do not represent a user-selectable Canonical Field are retained in the **GitHub Control Plane**.

```text
Official PDF
→ Gemini / NotebookLM extraction
→ Evidence Inbox
→ ChatGPT adjudication
├─ selectable / dependency fact → Canonical Evidence / Product Master change control
└─ non-selection technical fact → Technical Fact Registry
                                  → PENDING resolution
                                  → no automatic Workbook or Runtime mutation
```

A technical formula must not be forced into `size_mode` or another unrelated Canonical Field merely because a field is required by the Evidence Candidate transport contract.

## Why no new Canonical Field was added

The APW430 p.70 formulas describe derived internal dimensions from sash W/H. They do not select a product, enumerate a standard size, decide CUSTOM availability, or represent a user input field.

Therefore v1.3 does **not** add a `dimension_formula` Canonical Field.

Instead, the formulas are stored as `TECHNICAL_FACT / DIMENSION_FORMULA` records with:

- `canonicalField = null`
- `formalWorkbookPolicy = CONTROL_PLANE_ONLY`
- `runtimePolicy = REFERENCE_ONLY_NOT_CONSUMED`
- exact official PDF locator
- normalized formula terms
- source Gemini Transport Issue linkage

A future feature may consume these facts only through an explicit adapter and its own approval / regression gate.

## APW430 FIX Technical Facts

Official source:

- `202607_YKKAP_APW430_商品カタログ.pdf`
- Drive File ID: `1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9`
- printed p.70 / PDF file p.72

Registered facts:

1. `TF-YKK-APW430-FIX-MADO-ANGLE-DIMENSION-P70`
   - FIX窓 窓タイプ / アングル付枠
   - `w = sash_w - 60mm`
   - `h = sash_h - 60mm`

2. `TF-YKK-APW430-FIX-TR-ZAIRAI-ANGLE-DIMENSION-P70`
   - FIX窓 テラスタイプ / 在来工法 / アングル付枠
   - `w = sash_w - 60mm`
   - `h = sash_h - 30mm`

3. `TF-YKK-APW430-FIX-TR-204-ANGLE-DIMENSION-P70`
   - FIX窓 テラスタイプ / 2×4工法 / アングル付枠
   - `w = sash_w - 60mm`
   - `h = sash_h - 45mm`

4. `TF-YKK-APW430-FIX-MADO-NOANGLE-DIMENSION-P70`
   - FIX窓 窓タイプ / アングル無枠
   - `w = sash_w - 40mm`
   - `h = sash_h - 70mm`

## PENDING lifecycle extension

Before v1.3, `RESOLVED` PENDING required Canonical Evidence.

v1.3 keeps that behavior but additionally allows a PENDING to be resolved by an independently validated Technical Fact when the issue is specifically about non-selection technical information.

Resolved linkage is stored as:

```text
resolutionEvidenceIds
resolutionTechnicalFactIds
resolutionRuleIds
resolutionNote
```

Unknown Technical Fact IDs are mechanically rejected.

## LIVE APW430 result

Input:

- `BATCH-GEMINI-APW430-FIX-20260901213858`
- producer mode: `LIVE_EXTERNAL`
- four Transport Issues concerning p.70 dimension formulas

Result:

```text
Technical Facts               4
Dimension Formula Facts       4
Open PENDING before           4
Open PENDING after            0
Resolved by Technical Fact    4
Canonical Field added         0
Workbook schema mutation      0
Formal Workbook write         0
Runtime auto-consumption      0
Runtime write                 0
```

## Gate

```text
TECHNICAL_FACT_REGISTRY          PASS
EXACT_OFFICIAL_SOURCE_LOCATORS   PASS
CANONICAL_FIELD_POLLUTION        0
FORMAL_WORKBOOK_SCHEMA_MUTATION  0
RUNTIME_AUTO_CONSUMPTION         0
PENDING_4_TO_0                   PASS
npm test                         188/188 PASS
v1.3 tests                       6/6 PASS
Technical Fact CI job            SUCCESS
```

GitHub Actions evidence:

- workflow: `V2 Recovery CI`
- run: `#279`
- run ID: `33600568539`
- head SHA: `401c07b95f58584b86cfb4a9d46c83026d1e2c81`
- Artifact: `product-master-technical-facts-v13-apw430`
- Artifact ID: `9835006798`
- Artifact SHA-256: `b116f0398d68697d823727ead4bf1aa589e22cda777d45381948c347f27c608a`

## Boundary going forward

### Formal Workbook owns

- series / window types
- user-selectable specifications
- applicability relationships
- standard size records
- CUSTOM / dimension rules when they are required for product selection
- colors / glass / screens / options and related runtime dependencies

### GitHub Control Plane owns

- Evidence Candidate raw transport
- adjudication history
- Canonical Evidence provenance
- Technical Facts not directly consumed by product selection
- exact PDF locators
- PENDING lifecycle / resolution trace
- Change Proposal / STAGING / Production Preview audit records

This separation prevents the formal Workbook from becoming an unbounded evidence archive while preserving complete auditability.
