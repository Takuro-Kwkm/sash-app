# Product Master Core v0.5｜First LIVE Gemini / NotebookLM Round Trip

Status: **PARTIAL_PASS / CANONICAL_PROMOTION_HELD**

Target: **YKK AP APW 430 / FIX窓 family**

Batch: `BATCH-GEMINI-APW430-FIX-20260901190207`

Producer: `GEMINI_NOTEBOOKLM / LIVE_EXTERNAL`

Source:
- Drive File ID: `1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9`
- `202607_YKKAP_APW430_商品カタログ.pdf`

## 1. What this round trip proved

This is the first real external NotebookLM/Gemini output received by Product Master Core.

The transport envelope is structurally compatible with v0.4: product id, source id, candidate schema, producer mode, known Canonical Fields and Product Node IDs all match the defined contract.

However, source adjudication found two systematic quality problems that must be fixed before automatic Canonical promotion:

1. NotebookLM returned printed catalog page numbers as `pdfPage` values. Actual PDF file pages are offset by two in the relevant section.
2. Several claims were mapped to an allowed Canonical Field name even though the semantic meaning of that Field was wrong.

Therefore no silent correction or direct Canonical promotion is allowed.

## 2. Verified page mapping

Visual inspection of the actual 140-page Drive PDF established:

- printed p.1 = PDF file page 3
- printed p.69 = PDF file page 71
- printed p.70 = PDF file page 72
- printed p.71 = PDF file page 73

The raw Gemini batch used `pdfPage = printedPage`, so all submitted PDF locators in this batch require correction.

## 3. Candidate adjudication

| Candidate | Decision | Source review |
|---|---|---|
| CAND-GEMINI-APW430-FIX-001 | ACCEPTABLE_AFTER_CORRECTION | Claim is correct: FIX窓 is divided into 窓タイプ and テラスタイプ. Correct locator is printed p.69 / PDF p.71. |
| CAND-GEMINI-APW430-FIX-002 | REJECT | Claim is false. Product hierarchy shows 窓タイプ -> 在来工法 only, while テラスタイプ -> 在来工法 / 2×4工法. |
| CAND-GEMINI-APW430-FIX-003 | ACCEPTABLE_AFTER_CORRECTION | Claim is correct: テラスタイプ is アングル付枠 only. `subjectField` should be `construction`, not `window_type`. Correct locator is printed p.70 / PDF p.72. |
| CAND-GEMINI-APW430-FIX-004 | NON_BLOCKING_PENDING | Formula is source-supported, but `size_mode` means STANDARD/CUSTOM-style size method and is semantically wrong for an inner-dimension formula. Current Canonical Field Registry has no proper formula field. |
| CAND-GEMINI-APW430-FIX-005 | NON_BLOCKING_PENDING | Formula is source-supported, but no proper Canonical Field exists for the dimensional relation. |
| CAND-GEMINI-APW430-FIX-006 | NON_BLOCKING_PENDING | Formula is source-supported, but no proper Canonical Field exists for the dimensional relation. |
| CAND-GEMINI-APW430-FIX-007 | NON_BLOCKING_PENDING | Formula is source-supported, but no proper Canonical Field exists for the dimensional relation. |
| CAND-GEMINI-APW430-FIX-008 | REJECT_OUT_OF_SCOPE | FL調整材 statement is source-supported, but it is an option/accessory fact and cannot be stored as `window_type`. Re-extract in an option phase later. |
| CAND-GEMINI-APW430-FIX-009 | REJECT_OUT_OF_SCOPE | 下枠カバー statement is source-supported, but it is an option/color-setting fact and cannot be stored as `window_type`. |
| CAND-GEMINI-APW430-FIX-010 | REJECT | Claim over-generalizes the 在来 H24 width range and uses an insufficient locator. The formal H24 rows are 03624 / 06024 / 07424 / 08324 / 11924 / 16024 / 16524. 06924 is not a 在来 standard size. |
| CAND-GEMINI-APW430-FIX-011 | ACCEPTABLE_AFTER_CORRECTION | Exact 2×4 H24 rows 03624 / 06024 / 06924 / 16024 are source-supported. Correct locator is printed p.71 / PDF p.73. |

Counts:

```text
ACCEPTABLE_AFTER_CORRECTION = 3
REJECT / REJECT_OUT_OF_SCOPE = 4
NON_BLOCKING_PENDING = 4
```

## 4. Transport issue adjudication

`ISSUE-GEMINI-APW430-FIX-001` reported uncertainty about the `069` column in the 在来 terrace table.

Source review result: **RESOLVED_NO_PENDING**.

The standard-size matrix contains no 在来 `069xx` size code. Existing Canonical APW430 data also contains no `FIX-TR-ZAIRAI` record with nominalW `069`. Blank cells must not be interpreted as selectable standard sizes.

## 5. Existing Canonical comparison

The existing APW430 Canonical Master already contains:

- `SWT-YKK-APW430-FIX-MADO`
- `SWT-YKK-APW430-FIX-TR-ZAIRAI`
- `SWT-YKK-APW430-FIX-TR-204`

and its formal size records match the visually verified terrace H24 matrices:

### 在来 H24

`03624 / 06024 / 07424 / 08324 / 11924 / 16024 / 16524`

### 2×4 H24

`03624 / 06024 / 06924 / 16024`

No Canonical size patch is required from this live round trip.

## 6. Gate status

```text
LIVE_GEMINI_TRANSPORT = PASS
SOURCE_REVIEW = PASS
CANONICAL_FIELD_SEMANTIC_ALIGNMENT = PARTIAL_PASS
PDF_LOCATOR_ACCURACY = FAIL_IN_RAW_BATCH
EXISTING_MASTER_CONFLICT = 0
CANONICAL_PROMOTION = HELD
```

The existing APW430 Runtime and Canonical Master remain unchanged.

## 7. Required v0.5 improvement

Before promoting a live AI Candidate, Product Master Core needs an explicit correction stage that records, rather than silently mutates:

- source locator correction;
- Canonical Field reclassification;
- claim narrowing/splitting;
- reason and adjudicator.

The next prompt version must also provide Canonical Field semantics and the source PDF page map, not only Field names.

## 8. Overall result

The experiment is successful as an architecture test.

Gemini/NotebookLM extracted many correct source facts, while ChatGPT/Core caught a false dependency claim, over-generalized size claim, wrong field semantics, and systematic page-locator errors before they reached Canonical Master.

This validates the intended separation:

`Gemini extracts -> ChatGPT adjudicates -> Core validates -> Canonical remains protected`.
