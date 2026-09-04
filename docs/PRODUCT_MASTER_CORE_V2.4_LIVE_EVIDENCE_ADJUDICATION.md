# Product Master Core v2.4 — LIVE Evidence Adjudication & Controlled Change Proposal

## Purpose

Phase 3 proved a real APW430 `LIVE_EXTERNAL` Gemini round trip through Transport, Evidence Inbox, and Unified Review Queue.

v2.4 performs the next authority-safe step:

`LIVE Evidence Candidate -> ChatGPT adjudication -> Canonical Evidence -> Controlled Product Master Change Proposal -> HUMAN_REQUIRED`

It does **not** approve, stage, write the formal Google Sheet, regenerate Runtime, or write Production.

## Audited input

- Product: `SER-YKK-APW430`
- Batch: `BATCH-202607-APW430-P69-71`
- Producer mode: `LIVE_EXTERNAL`
- Official source Drive ID: `1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9`
- Source title: `202607_YKKAP_APW430_商品カタログ.pdf`
- Reviewed source scope: PDF pp.71–73 / printed pp.69–71

The repository fixture is the exact structured Evidence batch persisted by the successful Phase 3 LIVE run.

## Phase 4 adjudication

All five Candidates are independently reviewed against the official PDF and accepted by `CHATGPT` as allowed by the Evidence authority policy.

| Candidate | Field | Decision | Formal workbook disposition |
| --- | --- | --- | --- |
| EC-APW430-FIX-001 | window_type | ACCEPT | already represented |
| EC-APW430-FIX-002 | construction | ACCEPT | already represented |
| EC-APW430-FIX-003 | configuration | ACCEPT | already represented |
| EC-APW430-FIX-004 | specific_spec | ACCEPT | schema gap, non-mutating |
| EC-APW430-FIX-005 | size | ACCEPT | already represented |

`ACCEPT` means the source claim is valid Canonical Evidence. It does not mean a formal workbook cell must change.

## Current formal coverage audit

The current APW430 Authoring Master was re-read from Google Drive before this Phase:

- Drive ID: `1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo`
- `03A_シリーズ窓種設定` already contains the FIX window type / terrace conventional / terrace 2x4 structure and angle-frame-only notes.
- `06_サイズ` already contains conventional terrace H24 / 2430 mm rows for 036, 060, 074, 083, 119, 160, and 165.
- No safe existing atomic workbook field was identified for the 115 mm frame-depth plus 45 mm usable-glass-total-thickness statement. That Evidence is retained without inventing a new formal field.

Therefore Phase 4 formal mutation count is zero.

## Controlled proposal

v2.4 still creates a Control Plane Product Master proposal that adds the five accepted Canonical Evidence records to the abstract Product Master evidence collection.

The proposal is always:

- `status = PROPOSED`
- `approvalPolicy = HUMAN_REQUIRED`
- change scope = `CONTROL_PLANE_EVIDENCE_ONLY`

Negative controls prove:

- ChatGPT self-approval is rejected.
- Unapproved STAGING apply is rejected.
- Formal Product Master write = 0.
- Runtime write = 0.
- Production write = 0.

## Review Queue result

After adjudication:

- five Evidence Candidate items are `APPROVED`, non-actionable.
- one Master Change Proposal item is `HUMAN_REQUIRED`, actionable.
- queue mutation authority remains `NONE`.

The next controlled action is explicit human approval or rejection of the exact proposal fingerprint. A generic implementation instruction such as “next” is not approval.
