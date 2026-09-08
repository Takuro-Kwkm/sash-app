# Product Master Core v0.6｜Gemini Prompt Calibration Report

Status: EXPERIMENTAL / NON-CANONICAL

## Purpose

Compare the first two LIVE_EXTERNAL NotebookLM Evidence Candidate batches for YKK AP APW 430 FIX windows and measure whether prompt constraints improve source extraction quality without granting Gemini any Canonical authority.

## Source

- productId: SER-YKK-APW430
- Drive file: 1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9
- title: 202607_YKKAP_APW430_商品カタログ.pdf
- official page map used for adjudication:
  - printed p.69 = PDF p.71: FIX window product hierarchy
  - printed p.70 = PDF p.72: angle-frame limitation + inside-dimension formulas + beginning of standard-size section
  - printed p.71 = PDF p.73: terrace-type size matrix including H24 rows

## Compared LIVE batches

### V1

- batchId: BATCH-GEMINI-APW430-FIX-20260901190207
- candidates: 11
- issues: 1
- prompt: APW430_FIX_EVIDENCE_EXTRACTION_PROMPT_V1.md

Observed defects:

1. pdfPage was treated as if it were printedPage.
2. window-type construction was over-generalized to 2x4.
3. dimension formulas were incorrectly assigned to size_mode.
4. FL adjustment material and lower-frame-cover facts were incorrectly forced into window_type.
5. H24 size availability was over-generalized instead of listing actual matrix cells.

### V2

- batchId: BATCH-GEMINI-APW430-FIX-20260901212236
- candidates: 7
- issues: 5
- prompt: APW430_FIX_EVIDENCE_EXTRACTION_PROMPT_V2.md

Improvements:

1. Product hierarchy was correctly split into window type and terrace type.
2. Construction was correctly separated:
   - window type -> conventional construction
   - terrace type -> conventional construction + 2x4 construction
3. angle-attached-only fact moved to construction instead of window_type.
4. dimension formulas were no longer emitted as Candidates; they were moved to issues because a suitable Canonical Field is absent.
5. out-of-scope FL adjustment material / lower-frame-cover facts disappeared from Candidates.
6. H24 size claims list exact size codes rather than a width range.
7. printedPage/pdfPage offset was learned for p.69 and for formula issues on p.70.

## Strict V2 adjudication

### Candidate 001

Decision: SOURCE_SUPPORTED / LOCATOR_CORRECT

- Claim supported on printed p.69 / PDF p.71.
- Field window_type is appropriate.

### Candidate 002

Decision: SOURCE_SUPPORTED / LOCATOR_CORRECT

- Window type is shown as conventional construction only.
- Field construction is appropriate.

### Candidate 003

Decision: SOURCE_SUPPORTED / LOCATOR_CORRECT

- Terrace type is shown with conventional and 2x4 branches.
- Field construction is appropriate.

### Candidate 004

Decision: SOURCE_SUPPORTED / LOCATOR_CORRECTION_REQUIRED

- Fact is correct: terrace type is angle-attached-frame only.
- Correct locator is printed p.70 / PDF p.72, not p.69 / PDF p.71.
- Correct locatorText should identify the explicit angle-frame statement, not generic `規格サイズ一覧`.

### Candidate 005

Decision: SOURCE_SUPPORTED / LOCATOR_CORRECTION_REQUIRED

- H24 conventional terrace size codes are correct:
  03624 / 06024 / 07424 / 08324 / 11924 / 16024 / 16524.
- The H24 matrix row is on printed p.71 / PDF p.73, not p.70 / PDF p.72.

### Candidate 006

Decision: SOURCE_SUPPORTED / LOCATOR_CORRECTION_REQUIRED

- H24 2x4 terrace size codes are correct:
  03624 / 06024 / 06924 / 16024.
- The H24 matrix row is on printed p.71 / PDF p.73, not p.70 / PDF p.72.

### Candidate 007

Decision: HOLD / SEMANTIC_AND_LOCATOR_REVIEW

- Existence of a `規格サイズ一覧` does support the presence of standard-size records, but the source does not explicitly define the Product Master Core semantic `size_mode`.
- The given locator p.69 / PDF p.71 does not contain the standard-size list itself.
- Do not promote automatically to a canonical `size_mode = STANDARD` assertion from this wording alone.

## V2 issues adjudication

### Issue 001

Decision: RESOLVED_NO_PENDING

- The V2 prompt explicitly defines blank matrix cells as no setting.
- The conventional terrace matrix shows W069 header but no populated 069xx cells.
- Existing APW430 canonical size records also contain no conventional-terrace 069xx rows.
- This should not remain SOURCE_AMBIGUOUS under the current extraction contract.
- Correct page for the terrace matrix is printed p.71 / PDF p.73.

### Issues 002-005

Decision: VALID_NON_BLOCKING_FIELD_GAP

- All four dimension formulas are explicit on printed p.70 / PDF p.72.
- Gemini correctly did not force them into size_mode.
- Product Master Core currently lacks a dedicated Canonical Field / dimension-expression concept for these formulas.

## V1 -> V2 calibration metrics

| Metric | V1 | V2 |
|---|---:|---:|
| Candidate count | 11 | 7 |
| Issue count | 1 | 5 |
| Wrong generalized construction claim | 1 | 0 |
| Dimension formulas incorrectly emitted as size_mode Candidates | 4 | 0 |
| Out-of-scope option/color Candidates | 2 | 0 |
| Exact H24 size-code enumeration | partial/incorrect | correct |
| Fully correct candidate Field assignment | low | 6/7 |
| Candidates with correct exact page locator | 0/11 | 3/7 |
| Formula issues with correct page locator | n/a | 4/4 |

Interpretation:

V2 materially improves semantic extraction and scope control. The remaining dominant error class is exact source locator selection when a section spans multiple printed pages.

## Gate

- LIVE transport schema: PASS
- Source-content extraction quality: PASS_WITH_LOCATOR_CORRECTIONS
- Canonical Field semantic alignment: PARTIAL_PASS
- Exact locator accuracy: PARTIAL_PASS
- Direct Canonical promotion: BLOCKED until locator corrections / semantic adjudication are applied
- Existing APW430 Size Master correction required by this round: NO

## Required V3 prompt changes

1. Never use the section start page as the locator for a claim that is visibly printed on a later page.
2. For size matrix Claims, locate the exact row containing the cited size codes.
3. For explicit text Claims, locatorText must contain a distinctive phrase from the same page.
4. A matrix header without populated cells is not ambiguous under this contract; blank cell = no setting unless a footnote explicitly overrides it.
5. Do not infer `size_mode` merely from the presence of a `規格サイズ一覧`; require an explicit source statement or leave it unsubmitted.

## Outcome

V2 calibration is successful. Gemini/NotebookLM is useful as an Evidence Candidate extractor when constrained by Canonical Field semantics and strict scope rules, but exact source-location validation remains a required downstream adjudication step.
