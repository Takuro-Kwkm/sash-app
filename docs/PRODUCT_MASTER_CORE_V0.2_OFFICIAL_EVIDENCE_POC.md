# Product Master Core v0.2｜Official Evidence Architecture PoC

Status: **EXPERIMENTAL / NON-CANONICAL**

Target: **YKK AP APW 430 / FIX窓 family**

This PoC upgrades v0.1 from a Master-workbook Evidence bridge to direct official-source Evidence records while leaving the production Catalog Runtime unchanged.

## 1. Official source

- Drive file id: `1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9`
- File: `202607_YKKAP_APW430_商品カタログ.pdf`
- Evidence was visually and textually verified against the actual PDF.

Verified locators:

| Evidence | Printed page | PDF page | Supported fact |
|---|---:|---:|---|
| `EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69` | 69 | 71 | FIX窓 = 窓タイプ / テラスタイプ、テラスタイプ = 在来工法 / 2×4工法 |
| `EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70` | 70 | 72 | FIX規格サイズ一覧、テラスタイプはアングル付枠のみ |

The PDF page number is two pages ahead of the printed catalog page in this section.

## 2. Evidence Record schema

Official PDF Evidence now requires:

- `schemaVersion`
- `id`
- `productId`
- `subjectField`
- `claim`
- `strength`
- `status`
- source type / Drive file id / title / version
- printed page
- actual PDF page
- locator text
- extraction and adjudication metadata

A `VERIFIED` official Evidence record without an exact PDF locator fails Core validation.

## 3. FIX Product Nodes

The v0.2 vertical slice contains:

1. `NODE-YKK-APW430-FIX-MADO`
2. `NODE-YKK-APW430-FIX-TR-ZAIRAI`
3. `NODE-YKK-APW430-FIX-TR-204`

Each node projects to the existing APW430 Runtime `window_type` and `size_mode=STANDARD`, and the compatibility test requires at least one existing formal Size Record to remain reachable.

## 4. Official constraint without invented Runtime value

The official catalog explicitly states that the FIX terrace type is available only with an angle-attached frame.

The current Core vocabulary has `construction`, but this PoC deliberately does not invent a Runtime enum value such as `ANGLE_ATTACHED` unless the existing Runtime mapping is formally established.

Therefore the official restriction is preserved as a machine-readable Rule assertion:

`FRAME_ANGLE_ATTACHED_ONLY / construction / ANGLE_ATTACHED_ONLY`

This is an intentional intermediate state: source truth is retained without fabricating a canonical value.

## 5. PENDING lifecycle

v0.2 adds explicit states:

`OPEN -> INVESTIGATING -> RESOLVED / REJECTED`

A `RESOLVED` PENDING requires:

- one or more resolution Evidence ids;
- a resolution note;
- optional resolution Rule ids.

The PoC uses a real locator discrepancy as the sample issue: the existing generated APW430 source metadata points the terrace item to `P.71`, while the current 202607 official PDF places the angle-attached-only statement at printed `p.70` / PDF `p.72`.

The original Master is not silently rewritten by this experiment. The discrepancy is retained as a resolved trace record.

## 6. Phase-specific Gate

`GATE-CORE-EVIDENCE-2` requires the v0.1 machine checks plus:

- every active Dependency Rule must reference at least one `VERIFIED` official Evidence record.

If official Evidence is removed, rejected, or no longer linked, the Gate becomes `BLOCKED` even if the Runtime still works.

This separates two questions:

1. Does the code run?
2. Is the rule formally supported by an official source?

Both must pass.

## 7. Runtime boundary

Production Catalog Adapter / Resolver / Size Resolver / Dynamic UI are unchanged.

The Core continues to use a compatibility projection into the current Runtime. Official assertions that do not yet have a formally mapped Runtime enum are preserved in Core but are not silently converted into guessed values.

## 8. Commands

```bash
npm run test:product-master-core:v02
npm run validate:product-master-core:v02
npm test
```

## 9. Next candidate

If this PoC passes CI, v0.3 should add a Gemini/NotebookLM Evidence Inbox with the following rule:

`Gemini Evidence Candidate -> ChatGPT adjudication -> VERIFIED / REJECTED / PENDING -> Canonical Evidence Registry`

Gemini must never write Canonical Master or PASS a Gate directly.
