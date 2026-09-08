# Product Master Core v0.1 PoC

Status: **EXPERIMENTAL / NON-CANONICAL**

This PoC tests whether the product-master concepts already used operationally can become a machine-enforced platform layer without rewriting the current Catalog Runtime.

## 1. Eight modules

| Concept | Core role | PoC implementation |
|---|---|---|
| Canonical Field | Official internal field vocabulary | `canonical-fields.mjs` |
| Product Node | Identifiable product-selection node | `productNodes[]` |
| Dependency Rule | Machine-readable relationship/auto-set rule | `dependencyRules[]` |
| Phase | Build progress unit | `phases[]` |
| Evidence | Traceable support for confirmed rules | `evidence[]` |
| PENDING | Explicit unresolved issue registry | `pending[]` |
| Gate | Machine decision on whether a phase can pass | `gate-engine.mjs` |
| Runtime | Consumption of approved Master logic | `runtime-projection.mjs` -> existing Catalog Runtime |

## 2. PoC vertical slice

Product: YKK AP APW 430

Only two existing Product Nodes are bridged:

1. `SWT-YKK-APW430-TATE-GREMON-SINGLE`
2. `SWT-YKK-APW430-FIX-MADO`

The PoC deliberately does **not** migrate all 25 APW430 window types. It proves one complete vertical path first:

`Evidence -> Canonical Field -> Product Node -> Dependency Rule -> Validator -> Gate -> Runtime projection -> existing formal Size Records`

## 3. Evidence boundary

For this experiment, Dependency Rules reuse the existing catalog Evidence `EV-APW430-MASTER`. This proves reference integrity, but it is not the final Evidence architecture.

The target architecture will distinguish at least:

- official PDF / official Web source Evidence;
- extracted Evidence Records (future Gemini/NotebookLM layer);
- canonical adjudication status;
- master-source / migration provenance.

A production Core Rule should ultimately be traceable to official source/page Evidence rather than only to an existing Master workbook.

## 4. Machine Gate

`GATE-CORE-POC-1` passes only when all of the following are true:

- Core validation has zero errors;
- the target Phase exists;
- open `BLOCKING` PENDING count is zero;
- Evidence records with `CONFLICT` status count is zero.

The negative tests intentionally inject a blocking PENDING, an unknown Canonical Field, and a broken Evidence link. Those conditions must be rejected automatically.

## 5. Runtime boundary

The current production Catalog Adapter / Resolver / Size Resolver / Dynamic UI are unchanged.

The PoC Runtime layer only projects a Product Node into the existing selection vocabulary (`window_type`, `size_mode`) and verifies that the projected `window_type` reaches at least one existing formal APW430 Size Record.

This keeps migration incremental:

`Product Master Core -> compatibility projection -> current Catalog Runtime`

rather than replacing the Runtime in one step.

## 6. Commands

```bash
npm run test:product-master-core
npm run validate:product-master-core
npm test
```

`validate:product-master-core` prints the Core validation result, Gate result, rule trace, and number of existing formal Size Records reachable from each PoC Product Node.

## 7. Non-goals for v0.1 PoC

- Do not convert every existing product Master.
- Do not change production selection behavior.
- Do not declare a new FORMAL PASS for APW430.
- Do not let Gemini directly edit canonical Master records.
- Do not create a management UI yet.

## 8. Next gate after PoC

If this experiment passes CI, v0.2 should add:

1. official-source Evidence Record schema;
2. Evidence strength / conflict / superseded statuses;
3. explicit PENDING lifecycle (`OPEN -> RESOLVED / REJECTED`);
4. Phase-specific Gate policies;
5. a bridge for one complete APW430 field family beyond size (glass or screen);
6. Gemini Audit findings as review inputs, never as direct canonical writes.
