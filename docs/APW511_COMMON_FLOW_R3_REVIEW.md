# APW511 common-flow R3 review candidate

This successor fixes the sales selection UI while retaining all 40 Formal master fields, 16 constraints, their evidence, the original Formal receipt and R2 candidate. It is a local review candidate; the admitted Current native profile continues to identify R2. No AI flow approval, new Formal adoption, Registry write, merge or release has occurred.

The acquired Current router resolves APW511's existing native candidate adapter. The native preparer requires actual approval of the fixed candidate before starting its integration Workflow. This task prepares that review payload using the same compiler, common Catalog selectors, Global Window Selection Flow, source-parity validator and browser QA contract. It does not fabricate an authorization or run an unadmitted successor Workflow.

Changes:

- Standard size uses one ENUM selector for the finite W/H tuples in `R_STANDARD_CELL`. The original context and forbidden rules filter the candidates. Only custom mode shows numeric W/H. Labels use verified sash outside dimensions in mm; nominal codes are not inferred.
- Explicit shutter request is a sales-intent input: undecided, no request, and requested remain distinct. Type is required only for requested shutters. Removing the request clears type/details; FIX hides the shutter inputs.
- Canonical stage order matches TW and Thermos II-H: opening, configuration, size, finish, screen, glass, site/survey, options. All source dependencies and invalid-value reevaluation remain active.
- Shared tuple-view clearing removes both its display value and its hidden source dimensions. Saved snapshots retain W/H for the existing handoff/output pipeline.

The new tuple view and request selector are declared in `changes/apw511-runtime-ui-r3/projection.json`. There are no manufacturer/product-name UI or resolver branches. Existing R2 and Doorremo projection output remains exactly reproducible. The source-parity replay supplies explicit request context solely to represent unchanged manufacturer tests; it does not add UI defaults.

Scope validation includes all 154 source-admitted standard cells, source parity 55/55, focused transition/snapshot tests, common regression, and native browser operation/save/reopen checks. See the external immutable review receipt for exact commits, hashes and executed results. Browser persistence remains localStorage.
