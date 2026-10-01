> Historical PR baseline at 58a4dda. Its old product identities, blockers and counts are superseded by [INNER_WINDOW Canonical Frame R3](../inner-window-canonical-frame/README.md). Retained as prior-work evidence, not current affected-scope PASS.

# Global Window Selection Flow compliance candidate — 2026-09-29

NON-PRODUCT-MASTER TASK. PRODUCT_MASTER_MUTATION = 0. Candidate only; no production promotion.

Baseline main: `53843307c2e68f94afcc98837b94450dd9b11f5f`.
Production: `dpl_2pJTbVz1yJJV6Li1noVNBPgkas2S`, same main SHA, READY.
Production URL: https://sash-app-wave3-preview-cv98q13ls-tk-4bb0.vercel.app
Production API identity readback: all eight READY Window integrations have unchanged packageVersion, sourceHash, canonicalRuntimeReference and status.

Authority actually retrieved: CURRENT_INFORMATION_SOURCE_MANIFEST v1.2 (`1xZ7gbinFDTL_Gm1XKwEP95aXQGxzKHH_IiwxZj2dg4A`); Project Instructions v2.0 (`1vuexA-sGCeoO6gOeqogvdQvHpDmAr0wia14tRPYen1k`); UI standard v1.9 (`1BVFe2qZXlLUVhz37trFUjz6mJOwjvW0P`, modified 2026-09-29T11:23:04.683Z); Global Flow v1.1 (`1Gfoyhy9xTZxJVLl6EnhFCvevZd4VPElACZiSko8OGUw`); Runtime UI v1.8 (`1fc_46QMEwnowrSFjs8T-4VCjbcew2MUvzgUJuWe57f0`); Common Development Standard v2.0. UI v1.9 is the explicit user authority and current formal document; the central manifest does not contain a separate UI-standard row. The discovered CURRENT_RELEASE_MANIFEST belongs to the interior app and is not used to roll back this user's explicit sash main/Production baseline.

Allowed: App adapters/contracts/Global Engine, generic editor, snapshot/save/estimate path and associated tests/workflow. Protected: all formal package data, Runtime Master Registry and Product Master Registry. No source files under the project `sources/` changed.

## Audit and changes

See flow-overrides.json for exact baseline conditional occurrences and identity-candidate-inventory.json for the broader source inventory. Identity lookups, schema adapters, runtime source joins and registration constants are declarative metadata, not flow overrides. Renderer/runtime bridge/Global Engine have no series-specific flow path.

- Removed Editor product-specific restore/change/resolve/render/snapshot/summary decisions.
- Removed estimate-summary product-specific sort and save-status product-specific check.
- Removed 3 post-resolve `result.fields.splice` call sites and 1 post-resolve `result.fields.filter` call site. Remaining field generation/order normalization occurs before or inside the Global Engine.
- Sales glazing requests are declared in App metadata, normalized before Global Flow, mapped to INNER_WINDOW glass_type/spacer_type/gas_fill slots. API owns selection and manufacturer-estimate handoff. No Uchirimo Browser parity exceptions.
- Global Engine emits visible/required/readOnly/disabled/semanticStage/semanticSlot, matched by actual controls. Summary follows the same fields sequence.
- Internal size mode comes from the formal CUSTOM-only capability. Size class evaluates formal candidates; ambiguous paths remain MANUAL_CHECK, never automatic order-ready. No fixed height threshold.
- W/H keep SIZE semantics and use INNER_WINDOW_FINAL_DIMENSION as the final sales-input step after options.
- Removed unconditional client descendant deletion; runtime revalidation preserves still-valid values.
- Eight-series business QA now includes Inplus, Excel, PDF and Print. Self-contained eight-series HTML uses the same modules/runtime.

## Confirmed blocker: PMD-INPLUS-FRAME-CARDINALITY-001

Type: PRODUCT_MASTER_DEFECT / INTEGRATION_BLOCKER. Evidence state: VERIFIED_CURRENT_FORMAL_DATA.
Product: LIXIL インプラス v0.4-R2; manifest `1TokjIpcipm8TPxwrSO0FjyPxxvhCq5iZ`, source hash `cbbdb6ba315c985f7d27f75a237e861be8ce635962ce1cd5a746d7f152c8e1f8`.

Formal semantic table maps `frame_install_spec` to one enum. Its candidates combine FR-LOW-PART (lower partition frame), FR-AL-RAIL, FR-L-HANDLE, FR-OFFSET, FR-ADJ, FR-F20/40/50/70, FR-RF50L/50S/70, FR-CORNER, FR-JOINT and FR-AUX. The model has no independent frame/projection/lower/fukashi composition/depth fields capable of carrying simultaneous selections. `upper_frame_spec` and `fukashi_spec` alone do not repair this single-value contract.

UI v1.9 requires independent slots and conditional subfields; merely renaming this enum to “下枠仕様” is incorrect. This candidate retains the source field, explicitly labels the unsupported separation, and does not invent independent product choices or combinations. Resume condition: authorized Product Master Change Work supplies a formal independent-field/cardinality/dependency contract; then revalidate only affected App mapping/flow cases. No formal data modified here. QA_READY is not revoked.

## QA interpretation / carry-forward

Formal evaluator regressions remain at the formal evaluator boundary (including the existing 995 Inplus dimension/glass cases), with new sales-presentation tests at the public API. Historical factorized source fingerprint is not declared an exact-source PASS after bridge changes; hash tamper detection is tested independently. No old V12 large selection-space recomputation.

The Browser suite exercises all 113 current window types at three viewports and first/second selectable choices along each primary path. Every step compares actual control labels, field sequence and semantic/presentation attributes. The downstream suite separately checks 519 transitions, internal state, snapshot, restore and estimate model. This is primary-flow coverage, not mathematical enumeration of all Selection Space combinations. Human Flow Review remains unperformed.

Final gate: APP_INTEGRATION_READY = FALSE while the confirmed frame contract defect remains; Human Flow Review is also pending. CI/Preview results are recorded against the exact commit, not fabricated here.

## Local candidate QA (before commit; CI must repeat against exact HEAD)

- Source lint and Runtime UI contract check: PASS.
- Unit/integration tests: 222 PASS, 0 FAIL.
- Global browser: 339 window/viewports, 6,282 primary transitions, 6,645 API/DOM comparisons; 0 mismatch, 0 console/page/unexpected-response errors.
- Downstream: 42 window/product/viewports, 519 transitions; valid-value retention, clear, internal selection, snapshot and restore PASS. Estimate-model equality is also enforced by the committed suite.
- Eight-series business flow: 24 saved/reopened products, 8 estimate rows at each viewport, Excel/PDF/Print PASS. Inplus fixtures VALID; Uchirimo remains manufacturer-estimate confirmation.
- Work-management, release and estimate-output browser regressions PASS.
- Self-contained eight-series HTML: 24 Runtime parity checks PASS.
- Flow overrides: 12 detected / 12 removed / 0 remaining in reviewed UI/save/summary flow. Post-Global fields mutations: 4 detected / 4 removed / 0 remaining.
- All eight source identities unchanged; no protected Formal data or Runtime Master Registry diff.

These PASS results do not close PMD-INPLUS-FRAME-CARDINALITY-001 or constitute human approval. Preview deployment and exact-HEAD CI are separate evidence.

## Formal QA boundary update

The old fixed source contract correctly rejected the changed bridge. It is preserved. `formal-evaluator-qa-contract.json` records reviewed current pins and edge-impact reasoning. The unchanged Formal evaluator is re-executed with a test-only projection for internal size selectors; the public App wrapper has separate 222-test and browser coverage. This projection is never imported by the App and is not a post-Global presentation mutation. Fresh factorized QA completed all 42 roots; no historical PASS imported. The original Formal package and historical contract remain unchanged.

## Estimate handoff completeness

Generic summary output no longer truncates after eight fields. Excel adds explicit confirmation messages. PDF wraps every specification and confirmation, sizes rows from measured text, and paginates long rows without dropping content or crossing the footer. Eight-series browser QA inspects actual canvas text for every saved major field and manufacturer-confirmation messages, in addition to checking the downloaded PDF. The 30-row regression now produces five measured pages rather than silently truncating into three.

The final browser fixtures explicitly exercise all three sales glazing requests together before changing glass family. Their applicability clearing and full PDF handoff are asserted without product-specific PASS exceptions.

## Deployment execution recovery

Vercel files-mode upload reached the `api-upload-free` 5,000 requests/day limit (HTTP 429). This is a STORAGE_EXECUTION_BLOCKER, not a Product Fact defect or content-QA failure. The Preview workflow now uses the existing gitSource deployment path and checks the resulting exact commit identity. Preview deployment is separated from the full QA workflow; deployment success alone never grants APP_INTEGRATION_READY.
