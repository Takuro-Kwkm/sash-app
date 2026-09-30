# INNER_WINDOW Canonical Frame / Uchirimo R4 Change Work

Business scope: sales estimate requests. Product Master Change for Inplus and Uchirimo was authorized explicitly, followed by read-only App reintegration of the adopted Formal bytes. No merge or production promotion. Human Flow Review remains **PENDING**, so **APP_INTEGRATION_READY = FALSE**.

## Adopted Formal identities

| Product | Revision | Formal Authoring | Runtime Manifest |
|---|---|---|---|
| LIXIL インプラス | v0.4-R3 / InnerWindowCanonicalFrame_R1 | `1bDisz0WrUGgb3qx5bT_QS6TXG0wDNIK-` | `1N1sQQM616oeuQm7kehqaz3EMQDrNzfhy` |
| YKK AP ウチリモ 内窓 | v1.0-P7R1-R4 / InnerWindowCanonicalFrame_R1 | `17j_kWiJW9TrbkopivSBA-aZXc1MNueYq` | `10wOlwX4c0E0lCRuCKl-EdrW0vwwHTEGV` |

Both: QA_READY, QA_PASS, Runtime QA, Package, Storage, Registry and Post-Save Verification PASS. New revisions were staged and read back before adoption; old Formal files were archived without changing their bytes. Registry `正本Registry` rows 8 and 20 were updated and read back. See `product-formal-verification.json` for all 15 saved files and hashes. Uchirimo Runtime revision is `SLIM-V4-INNER-WINDOW-CANONICAL-FRAME-20260930`.

Working Authoring IDs: Inplus `1yXAkUIzKn5YNJf6GGBP94GfO8ryP2C3N`; Uchirimo `1uMmEy7rQ3EYxO0AaPFeJIeMo-SXKJS0B`. Working folders remain `1D4ei5PpcM5wGkb6AuXr2QBUmU1tPey92` and `1ToOa_3UStpMJfUzW5Dl0Ah_Q-kkX88n3`. Working and Formal metadata/contents were verified separately.

## Semantic contract and compatibility

Both have `frame_spec`, `upper_frame_spec`, `lower_frame_spec`, `fukashi_presence`, `fukashi_sides`, `fukashi_depth`, `fukashi_reinforcement`. `installation_environment` is used only where the product contract provides it. Uchirimo `upper_frame_spec` is NOT_APPLICABLE; `fukashi_sides` is SELECTABLE (`three_side` / `four_side`) when a fukashi frame is present, backed by EV-UCH-028. Inplus depths are 20/40/50/70; Uchirimo depths are 25/40/60. Allowed values and dependencies remain product data.

Legacy names migrate at the input boundary and never appear in new public selections, snapshots or estimate output. Historical source fields remain inside the source evaluator to preserve existing rules; the current public master removes them. Old snapshot identities still require the existing explicit revalidation flow. Historical UI aliases exist only for source-evaluator regression, not as the current App contract.

L-type handle is an Inplus terrace sliding-sash option. Known prohibitions clear conflicting downstream selections. Unproven compound selections remain MANUAL_CHECK / ESTIMATE_CONFIRM_REQUIRED with confirmation recipients; they never establish automatic order readiness. Uchirimo's existing glass-confirmation routes remain intact. Source selectors hidden from sales are bound internally only when the actual source Runtime proves a single allowed value. Ambiguous size classes remain confirmation paths without an H-only heuristic.

## App changes and discovered adapter defects

- Global Flow owns the seven canonical installation slots. Manufacturer/series/product-specific Flow branches were not added.
- Upstream choices remain selectable when a downstream choice conflicts; selecting the upstream choice clears the conflicting downstream value. Empty candidate domains are hidden.
- Canonical/source evaluation converges before emitting selections. Clear history, invalid input errors and confirmation requests survive internal reevaluation.
- The manifest loader preserves every component with a repeated role. The Uchirimo adapter prefers the complete installation component over the embedded projection and consumes its explicit projection/60mm incompatibility. No manufacturer fact is inferred.
- W/H stays in the declarative pre-option SIZE presentation. Size mode and size class remain internal.
- The self-contained eight-series preview uses the same modules, adopted Runtime bytes and resolver as the deployed application.

## QA boundaries

The new affected semantics receive fresh QA in `test/87-inner-window-canonical-frame.test.mjs` and `test/browser/inner-window-canonical-frame-qa.mjs`: shared fields, unique IDs, manufacturer separation, N/A omission, every declared value, source delegation, clear/retain transitions, no-guess routes and round trips. Browser checks run on desktop/tablet/phone and compare API/DOM, internal state, summary, snapshot, restore and estimate output. The full eight-series primary-flow and business suites also run.

The prior 995 dimension/glass and 153 source-matrix cases remain regression witnesses for unchanged facts. Historical Slim factorized QA is explicitly a frozen source-evaluator witness, not a proof of the new canonical model. The current governance workflow validates the eight-series integration identity and fresh affected scope; the old seven-series production release scope is not changed. No all-combinations mathematical coverage is claimed.

Six exterior Runtime package identities remain unchanged, verified in `runtime-identities.json`; App tests cover shared-code effects. No unrelated manufacturer facts were re-extracted.

## Closure gate

`PMD-INPLUS-FRAME-CARDINALITY-001` is superseded by `PMD-INNER-WINDOW-FRAME-CANONICAL-CONTRACT-001` covering both products. Closure requires both adopted Formal contracts, separated values, current Adapter/Flow bindings, API/DOM mismatch 0 and downstream stale values 0. Exact-HEAD CI artifacts and the PR description record the execution result; this document does not self-certify unexecuted CI or Preview deployment.

Human review of the actual deployed Preview is a separate remaining gate. The AI does not grant that PASS. Formal Product Master PASS is not revoked while Human Flow Review is pending.

## R4 correction

- Uchirimo frame color value `clear` keeps the Formal display label `クリア`; generic adapter labels are fallback-only.
- With `fukashi_presence=present`, `fukashi_sides` exposes `three_side` / `four_side` as `三方` / `四方`. Returning to `none` clears sides, depth and reinforcement.
- Official evidence: `EV-UCH-028`, XAAAA-K25-527F2 (2026-02), P21.
