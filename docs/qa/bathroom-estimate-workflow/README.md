# Bathroom estimate workflow separation

Task: NON-PRODUCT-MASTER. Continue PR #56, branch integration/window-flow-compliance-20260929. Baseline remote HEAD 0e7145e1922c74740d9f325cad7c137f3b22c475. Current main observed d273753590cd4351d4886339dc126d4ebcdc53d3. No merge/production/release.

Authority actually retrieved: CURRENT_INFORMATION_SOURCE_MANIFEST v1.5, SASH_PROJECT_INSTRUCTIONS v2.0, SASH_RUNTIME_UI v1.8, SASH_UI_STANDARD v2.1, Product Concept v1.1 and Sales QA_READY Boundary v1.1. Formal/Package/Registry metadata reverified; unchanged previously retrieved content carried forward. Formal Inplus SHA-256 remains 58397e2dfc4b4fb74f62b14b4d9b22943de96c866a107cc48d52dcadd2c1bfcb. Uchirimo current source package integrity checked by registered loader. Product Master, source packages, rule engines and Registry are not edited.

## Shared mechanism

`field-workflow-scope.mjs` is application responsibility metadata audited against all current Inplus Formal fields and Uchirimo INSTALLATION/MEASUREMENT fields, not a screenshot-only exclusion list. The correction is activated by declarative product/variant profile, only for the two bathroom contexts. Normal variants remain unchanged.

- Estimate selection excludes survey measurements, existing-state checks and site records BEFORE raw product evaluation.
- Survey field definitions and original raw site_survey rules remain available; no new survey UI is implemented.
- Estimate projection removes survey fields from DOM/Required/missing/save scope, dependency output and estimate handoff.
- Saved survey values move non-destructively into `workflow_data.site_survey.contexts[product::variant].values`, retaining exact original values including raw-array and individual legacy keys. Records remain DEFERRED_NOT_VERIFIED. They never rehydrate active estimate selection on variant changes.
- Product position selectors/P values (crescent, handle, midrail), frame/fukashi choices, fit/unit pattern, options and W/H remain. Presentation stage INSTALLATION_SURVEY does NOT imply site-only responsibility.
- Inplus gaps IB-G002 / IB-G005 / IB-G006 are preserved in deferred site workflow metadata, not closed or VERIFIED. Other four remain product estimate handoff records. Original seven definitions are unchanged.
- Uchirimo size rules depend on installation environment. Estimate evaluates ALL allowed Formal environment branches without choosing or persisting one. All-branch failure still blocks W/H; unanimous PASS is a scoped estimate result, not installation approval; mixed conditions remain REVIEW_REQUIRED. No numeric range is copied or invented.
- Legacy output projection excludes site values without mutating original storage. Reload editor notifies the migrated snapshot even without visible edits, ensuring actual Save uses the corrected scope.

## Verification

New unit tests cover both products, zero survey required blockers, exact legacy preservation, reload, variant changes, output sanitization, complete metadata coverage, raw manufacturer prohibitions and all-branch dimension bounds. Existing unit/runtime/dependency suites rerun.

The transition test now recognizes the existing post-W/H P presentation slot. Removing survey fields lets its traversal reach that existing slot sooner; its previously incomplete stage assertion must not misclassify it as a regression. No production order changed.

Historical source pins were reviewed and updated only for the new wrapper and workflow metadata. Historical raw normalize/resolver logic is unchanged; exact pin guards remain enabled. Current behavior has independent unit and browser proof.

Browser suite exercises actual opening editor DOM, save with no survey input or visible edit, legacy values, reload, variant toggles, estimate confirmation and output. The existing Inplus A-F, shared eight-series, canonical frame/hardware, persistence/output and theme suites remain enabled. The self-contained HTML uses the actual bundled Runtime and renderer; only HTTP is replaced by browser-local execution. Case save/output remain Preview-only.

Final exact-head CI and Preview results are recorded in the PR and downloaded reports, not predeclared here.
