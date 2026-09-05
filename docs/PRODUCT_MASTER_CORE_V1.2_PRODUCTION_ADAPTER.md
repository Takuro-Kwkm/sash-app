# Product Master Core v1.2｜Production Adapter / Formal Master Diff Preview

Status: **IMPLEMENTATION PASS / APW430 PRODUCTION_SYNCED_NO_OP**

Formal Product Master write: **0**

Runtime write: **0**

## Purpose

v1.2 adds the production boundary after an explicitly approved STAGING Product Master change.

```text
Official Source
→ NotebookLM / Gemini Evidence Candidate
→ Persistent Evidence Inbox
→ Evidence Adjudication
→ VERIFIED Canonical Evidence
→ Product Master Change Proposal
→ HUMAN approval
→ STAGING Master
→ Production Diff Preview
→ Formal Master validation
├─ no formal mutation → PRODUCTION_SYNCED_NO_OP
└─ real formal mutation → separate HUMAN Production Approval required
                         → production write set
                         → formal Google Sheets write
```

The Production Adapter must not translate every new Canonical Evidence record into a new formal Product Master row. It first determines whether the official fact is already represented by the formal Product Master.

## Formal production target

The actual formal APW430 Product Master was re-read from Google Drive before implementing this adapter.

- title: `20260830_YKKAP_APW430_商品マスター_正本`
- Drive / Spreadsheet ID: `1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo`
- version: `20260830`
- folder: `01_正本`
- MIME: native Google Sheets
- modifiedTime at validation: `2026-08-30T11:39:41.909Z`

The formal Google Sheet remains authoritative. `src/catalog/modules/apw430-source.mjs` is a generated Runtime source derived from Drive canonical `01_正本` and must not be hand-edited as a substitute for a formal Master write.

## Formal workbook observation

The existing workbook already contains the APW430 FIX product hierarchy.

`03A_シリーズ窓種設定`:

- row 63: `SWT-YKK-APW430-FIX-MADO` / FIX窓 窓タイプ / ACTIVE / 公式確認済
- row 64: `SWT-YKK-APW430-FIX-TR-ZAIRAI` / FIX窓 テラスタイプ（在来） / ACTIVE / 公式確認済 / アングル付のみ
- row 65: `SWT-YKK-APW430-FIX-TR-204` / FIX窓 テラスタイプ（2×4） / ACTIVE / 公式確認済 / アングル付のみ

The workbook does not currently expose a dedicated Evidence Registry tab for the Core Evidence records. v1.2 therefore does not silently add a new workbook tab or reshape the formal schema.

## Formal size verification

The formal `06_サイズ` sheet already contains every size represented by the eight accepted size Evidence records.

### FIX窓 テラスタイプ（在来）

Rows `1898–1925` contain exactly 28 ACTIVE records:

- H18: `03618 / 06018 / 07418 / 08318 / 11918 / 16018 / 16518`
- H20: `03620 / 06020 / 07420 / 08320 / 11920 / 16020 / 16520`
- H22: `03622 / 06022 / 07422 / 08322 / 11922 / 16022 / 16522`
- H24: `03624 / 06024 / 07424 / 08324 / 11924 / 16024 / 16524`

Formal construction value: `在来・アングル付`

No conventional W069 size record exists.

### FIX窓 テラスタイプ（2×4）

Rows `1926–1941` contain exactly 16 ACTIVE records:

- H18: `03618 / 06018 / 06918 / 16018`
- H20: `03620 / 06020 / 06920 / 16020`
- H22: `03622 / 06022 / 06922 / 16022`
- H24: `03624 / 06024 / 06924 / 16024`

Formal construction value: `2×4・アングル付`

Total verified formal size records: `44`.

## STAGING input

Source approved Proposal:

`PMCP-YKK-APW430-FIX-LIVE-20260902-001`

Approved STAGING result Master fingerprint:

`sha256:36b71fdabfc58a8690e10b9dec8ac89afd180c0a53355fcdfa2874b6961292e0`

STAGING contains nine newly adjudicated Canonical Evidence records.

## Production mapping result

The nine STAGING Evidence records map to the formal workbook as follows:

```text
8 × size Evidence
→ EXACT_PRESENT
→ existing ACTIVE 06_サイズ records
→ formal mutation = 0

1 × construction Evidence
→ FIX窓 窓タイプ = 在来工法
→ existing formal FIX窓 窓タイプ record/source is present
→ current 03A schema has no dedicated atomic construction field for this fact
→ SCHEMA_GAP_NON_MUTATING
→ formal mutation = 0
```

It would be incorrect to add nine new formal rows simply because nine new Canonical Evidence records were created in the Core Evidence plane.

## Production Preview

Preview ID:

`PMPREV-YKK-APW430-FIX-20260902-001`

Preview fingerprint:

`sha256:20ac505a4af03a5c1f818b167397724e411a1dcb4d261fd257f19548ff9e4c8b`

Result:

```text
accepted Canonical Evidence       9
EXACT_PRESENT                     8
SCHEMA_GAP_NON_MUTATING           1
MUTATION_REQUIRED                 0
CONFLICT                          0
UNRESOLVED                        0
formal mutation count             0
open BLOCKING PENDING             0
open NON_BLOCKING PENDING         4
```

Production status:

`PRODUCTION_SYNCED_NO_OP`

Production write approval:

`NOT_APPLICABLE_NO_WRITE`

This is a deliberate synchronization result, not an incomplete or skipped Production step. The formal Product Master already represents the product facts that would affect selection/runtime behavior, so writing cells would create unnecessary or duplicate changes.

## Non-blocking PENDING

Four open NON_BLOCKING PENDING items remain from the dimension-formula extraction path.

They represent official dimension formulas for which the Product Master Core does not yet define a dedicated Canonical Field.

These PENDING items do not justify guessing a field or modifying the formal workbook schema. They remain open for a later Field Registry design decision.

## Production safety boundary

v1.2 defines the following behavior for future Product Master changes:

### No formal mutation

```text
Production Preview
→ all Evidence = EXACT_PRESENT / EVIDENCE_ENRICHMENT_ONLY / SCHEMA_GAP_NON_MUTATING
→ formalMutationCount = 0
→ Production approval not applicable
→ no Google Sheets write
→ PRODUCTION_SYNCED_NO_OP
```

### Real formal mutation

```text
Production Preview
→ MUTATION_REQUIRED >= 1
→ READY_FOR_HUMAN_PRODUCTION_APPROVAL
→ exact Preview fingerprint must be explicitly approved by HUMAN
→ fresh live Drive metadata + target-cell re-read required
→ drift check
→ production write set
→ Google Sheets mutation
→ post-write readback / validation
```

ChatGPT cannot self-approve a real Production write.

A Production approval is separate from the prior approval that allowed STAGING apply.

## Drift protection

The GitHub production target snapshot is an audit/validation snapshot, not the production authority.

Before any future real Google Sheets mutation, the adapter must re-read the formal Drive file and target cells. A changed file ID, unexpected title, changed relevant values, modified target row, or other target drift must invalidate the pending write until a new Preview is generated and approved.

## Implementation

Added:

- `src/product-master-core/production-adapter.mjs`
- `src/product-master-core/poc/apw430-production-target-snapshot.mjs`
- `scripts/run-product-master-production-preview-v12.mjs`
- `test/17-product-master-core-v12-production-adapter.test.mjs`
- `master:production-preview:v12` npm command
- `product_master_production_preview_v12` GitHub Actions job

Production mapping classifications:

- `EXACT_PRESENT`
- `EVIDENCE_ENRICHMENT_ONLY`
- `SCHEMA_GAP_NON_MUTATING`
- `MUTATION_REQUIRED`
- `CONFLICT`
- `UNRESOLVED`

The adapter blocks `CONFLICT`, `UNRESOLVED`, STAGING fingerprint drift, target drift, and open BLOCKING PENDING.

A real mutation path requires a separate HUMAN approval bound to the exact Preview fingerprint.

## CI Gate

Latest v1.2 code Gate:

- Workflow: `V2 Recovery CI`
- Run: `#259`
- Run ID: `33599582422`
- head: `2272b0cf4660721fe4390022a00e059aea6d5d39`
- conclusion: **SUCCESS**

Tests:

- `npm test`: **182 / 182 PASS**
- v1.2 Production Adapter tests: **6 / 6 PASS**
- Runtime smoke: **PASS**
- Product Master LIVE Evidence: **PASS**
- v1.1 Change Proposal: **PASS**
- v1.1 approved STAGING apply: **PASS**
- v1.2 Production Preview: **PASS**
- Browser QA: **PASS**

v1.2 test coverage includes:

1. exact formal Google Sheets target snapshot validation
2. STAGING fingerprint drift rejection
3. no-formal-mutation Preview and no-op finalization
4. unresolved/conflicting mapping rejection
5. separate HUMAN approval requirement for an actual Production mutation
6. open BLOCKING PENDING rejection

## CI Artifact

- name: `product-master-production-preview-v12-apw430`
- artifact ID: `9834639743`
- size: `12,327 bytes`
- SHA-256: `4bea63920d8a7e678f5d30e4a3c8dd2232dc9c95ad4a206d0ea81885c4f1f36d`

Artifact contents include:

- `production-preview.json`
- `production-finalization.json`
- `production-preview-report.json`
- supporting LIVE Evidence round-trip audit state

## Gate result

```text
FORMAL_DRIVE_MASTER_IDENTIFIED            PASS
FORMAL_MASTER_LIVE_READ                   PASS
STAGING_FINGERPRINT_MATCH                 PASS
PRODUCTION_TARGET_SNAPSHOT                PASS
FORMAL_FIX_HIERARCHY_MATCH                PASS
FORMAL_ZAIRAI_SIZE_28                     PASS
FORMAL_2X4_SIZE_16                        PASS
FORMAL_SIZE_TOTAL_44                      PASS
Zairai_W069_PHANTOM_RECORD                0
EVIDENCE_MAPPING_9_OF_9                   PASS
EXACT_PRESENT                             8
SCHEMA_GAP_NON_MUTATING                   1
MUTATION_REQUIRED                         0
CONFLICT                                  0
UNRESOLVED                                0
OPEN_BLOCKING_PENDING                     0
OPEN_NON_BLOCKING_PENDING                 4
PRODUCTION_WRITE_APPROVAL                 NOT_APPLICABLE_NO_WRITE
FORMAL_PRODUCT_MASTER_WRITE               0
RUNTIME_WRITE                             0
NPM_TEST                                  182/182 PASS
GITHUB_ACTIONS_RUN_259                    SUCCESS
```

## v1.2 decision

`Product Master Core v1.2 Production Adapter = PASS`

`APW430 PMCP-YKK-APW430-FIX-LIVE-20260902-001 = PRODUCTION_SYNCED_NO_OP`

The formal APW430 Google Sheet did not require a cell mutation because the approved STAGING facts were already represented by the formal Master. This is the correct production outcome for this Proposal.

The next architectural decision is whether Evidence provenance should remain intentionally separated from the formal selectable Product Master, or whether a future explicitly approved schema migration should introduce a dedicated Evidence Registry surface in the formal workbook. v1.2 does not make that schema decision automatically.
