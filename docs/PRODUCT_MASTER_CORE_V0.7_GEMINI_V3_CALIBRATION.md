# Product Master Core v0.7｜Gemini V3 Calibration Result

Status: EXPERIMENTAL / NON-CANONICAL

## Purpose

Evaluate the third LIVE_EXTERNAL NotebookLM Evidence Candidate batch for YKK AP APW 430 FIX windows after V1/V2 prompt calibration.

## Batch

- batchId: `BATCH-GEMINI-APW430-FIX-20260901213858`
- candidates: 12
- issues: 4
- producer: `GEMINI_NOTEBOOKLM / LIVE_EXTERNAL`
- prompt: `APW430_FIX_EVIDENCE_EXTRACTION_PROMPT_V3.md`

## Source truth used for adjudication

- printed p.69 = PDF p.71
  - FIX窓 product hierarchy
  - 窓タイプ -> 在来工法
  - テラスタイプ -> 在来工法 / 2×4工法
- printed p.70 = PDF p.72
  - `テラスタイプ：アングル付枠のみの設定となります。`
  - inside-dimension formulas
- printed p.71 = PDF p.73
  - terrace-type size matrix for conventional / 2×4, H18/H20/H22/H24

## Candidate adjudication

### 001 Product hierarchy

Decision: `SOURCE_SUPPORTED`

- `window_type` is appropriate.
- printed p.69 / PDF p.71 is correct.
- Product Nodes match the hierarchy.
- `locatorText=商品体系` identifies the section but could be more claim-specific.

### 002 Window type conventional construction

Decision: `SOURCE_SUPPORTED`

- Claim is explicit in the hierarchy diagram.
- `construction` is appropriate.
- Node assignment is correct.
- printed p.69 / PDF p.71 is correct.

### 003 Terrace type conventional + 2×4 construction

Decision: `SOURCE_SUPPORTED`

- Claim is explicit in the hierarchy diagram.
- `construction` is appropriate.
- Both terrace nodes are correctly referenced.
- printed p.69 / PDF p.71 is correct.

### 004 Terrace type angle-attached only

Decision: `SOURCE_SUPPORTED`

- Claim is explicitly supported on printed p.70 / PDF p.72.
- `construction` is appropriate.
- `locatorText` is sufficiently distinctive.

### 005-008 Conventional terrace H18/H20/H22/H24

Decision: `SOURCE_SUPPORTED`

Exact source-supported records:

- H18 / 1,830: `03618 / 06018 / 07418 / 08318 / 11918 / 16018 / 16518`
- H20 / 2,030: `03620 / 06020 / 07420 / 08320 / 11920 / 16020 / 16520`
- H22 / 2,230: `03622 / 06022 / 07422 / 08322 / 11922 / 16022 / 16522`
- H24 / 2,430: `03624 / 06024 / 07424 / 08324 / 11924 / 16024 / 16524`

All are on printed p.71 / PDF p.73.

The H24 locator is sufficiently row-specific. H18/H20/H22 use the broader locator `テラスタイプ 在来`; content and page are correct, but locatorText can still be improved by including each H row and actual H value.

### 009-012 2×4 terrace H18/H20/H22/H24

Decision: `SOURCE_SUPPORTED`

Exact source-supported records:

- H18 / 1,845: `03618 / 06018 / 06918 / 16018`
- H20 / 2,045: `03620 / 06020 / 06920 / 16020`
- H22 / 2,245: `03622 / 06022 / 06922 / 16022`
- H24 / 2,445: `03624 / 06024 / 06924 / 16024`

All are on printed p.71 / PDF p.73.

The H24 locator is sufficiently row-specific. H18/H20/H22 use the broader locator `テラスタイプ 2×4`; content and page are correct, but locatorText can still be made row-specific.

## Issue adjudication

### Issues 001-004

Decision: `VALID_NON_BLOCKING_FIELD_GAP`

All four dimension formulas are explicitly supported on printed p.70 / PDF p.72:

- angle-attached / window type: `w = W - 60`, `h = H - 60`
- angle-attached / terrace conventional: `w = W - 60`, `h = H - 30`
- angle-attached / terrace 2×4: `w = W - 60`, `h = H - 45`
- angle-less / window type: `w = W - 40`, `h = H - 70`

V3 correctly keeps these out of `size_mode` Candidates because Product Master Core lacks a dedicated dimension-expression Canonical concept.

## V1 -> V2 -> V3 metrics

| Metric | V1 | V2 | V3 |
|---|---:|---:|---:|
| Candidate count | 11 | 7 | 12 |
| Wrong generalized construction claim | 1 | 0 | 0 |
| Dimension formulas wrongly emitted as `size_mode` Candidates | 4 | 0 | 0 |
| Out-of-scope option/color Candidates | 2 | 0 | 0 |
| Blank W069 treated as ambiguous | yes | yes | no |
| Unsupported `size_mode` inference | n/a | 1 | 0 |
| Correct Field assignment | low | 6/7 | 12/12 |
| Correct printed/PDF page pair | 0/11 | 3/7 candidates | 12/12 candidates |
| Exact terrace size-row extraction | partial | H24 only | H18/H20/H22/H24 complete |
| Candidate content source-supported | mixed | 6/7 | 12/12 |

## Remaining locator-text issue

V3 solves page selection, but some `locatorText` values remain broader than the prompt requested.

Strictly row-specific locatorText is already present for:

- Candidate 004
- Candidate 008
- Candidate 012

Recommended normalization for remaining size Candidates:

- `テラスタイプ 在来 H18 1,830`
- `テラスタイプ 在来 H20 2,030`
- `テラスタイプ 在来 H22 2,230`
- `テラスタイプ 2×4 H18 1,845`
- `テラスタイプ 2×4 H20 2,045`
- `テラスタイプ 2×4 H22 2,245`

This is a locator-quality improvement, not a content correction.

## New architecture finding: Candidate identity collision

V1, V2, and V3 reused Candidate IDs such as:

`CAND-GEMINI-APW430-FIX-001`

The current v0.4 Transport Validator guarantees uniqueness only inside one envelope. It does not protect a persistent multi-batch Evidence Inbox from Candidate ID collision.

Before generalizing live ingestion, Product Master Core should adopt one of the following:

1. require globally unique Candidate IDs containing a batch-specific suffix/token; or
2. treat `(batchId, candidateId)` as the persistent identity key.

Preferred direction: globally unique Candidate IDs plus the existing `batchId`, because Canonical Evidence provenance currently stores `candidateId` directly.

## Gate

- LIVE Transport schema: `PASS`
- Source-content extraction: `PASS`
- Canonical Field semantic alignment: `PASS`
- Product Node alignment: `PASS`
- printedPage/pdfPage accuracy: `PASS`
- Exact locatorText specificity: `PARTIAL_PASS`
- Dimension formula handling: `PASS_WITH_NON_BLOCKING_FIELD_GAP`
- Direct automatic Canonical promotion: `NOT_YET_ENABLED`
- Prompt calibration result: `PASS`

## Conclusion

V3 demonstrates that NotebookLM/Gemini can reliably produce source-supported Evidence Candidates for this constrained APW430 FIX scope when given:

- explicit Canonical Field semantics,
- exact Product Node scope,
- blank-cell rules,
- exact page mapping,
- and row-level extraction requirements.

The dominant extraction errors from V1 have been removed. Remaining work is primarily infrastructure hardening rather than prompt-quality correction:

1. globally unique Candidate identity,
2. persistent Evidence Inbox / batch registry,
3. optional locatorText normalization,
4. a formal Canonical concept for dimension expressions,
5. adjudicated promotion/deduplication against existing Canonical Evidence.
