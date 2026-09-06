# Product Master Core v3.1 — Profile Onboarding Preflight

## Purpose

Make ordinary third-series-and-later onboarding possible through **Product Profile + registered Adapter / Dependency Hook** without modifying Common Core.

This preflight is common infrastructure. It does not create or update a Product Master, does not replace the Product Master STARTUP GATE, and has no Canonical / Authoring / Runtime / Registry / Production mutation authority.

## Gate

`PROFILE_ONBOARDING_GATE = PASS_PROFILE_ONLY_ONBOARDING`

PASS means the supplied onboarding definition is structurally ready to enter the governed Product Master execution flow without a Common Core code change.

It does **not** mean:

- Product Master STARTUP GATE PASS;
- Gemini Job PASS;
- Working Savepoint PASS;
- Product Master FORMAL PASS;
- APP_INTEGRATION_READY.

Those remain separate runtime/governance gates.

## Inputs

The preflight evaluates:

1. Product Profile v1.1 validity.
2. Drive-derived Completion Policy Series Entry identity and required fields.
3. Profile / Policy manufacturer, series and registry key parity.
4. distinct series / canonical / old / working Folder IDs.
5. registered `schemaAdapter`.
6. registered `dependencyHooks`.
7. explicit execution routing:
   - preferred = `GEMINI_AI_PRO`;
   - fallback = `GEMINI_API`;
   - `fallbackAllowed` must be explicit;
   - no invented execution channel.
8. zero ordinary-onboarding modifications under Common Core.
9. zero product-specific references in Common Core for the candidate profile identity, product ID or source Drive File ID.
10. read-only preflight authority.
11. Drive Policy retrieval and Registry consistency verification signals.
12. common spec v1.1 and `COMMON_BASELINE_GATE = PASS_FIXED`.

## Policy authority

Product Profile must not contain or override:

- `series_folder_id`;
- `canonical_folder_id`;
- `old_folder_id`;
- `working_folder_id`;
- `required_package_roles`;
- `governing_spec`.

These remain Completion Policy authority and must be re-resolved in the real Product Master STARTUP GATE immediately before series work begins.

## Common Core change rule

For ordinary onboarding:

`commonCoreChangedPaths.length = 0`

If a new series genuinely requires a new generic capability, the preflight returns `COMMON_CORE_CHANGE_REQUIRED`. That is not bypassed by placing a manufacturer-specific special case into Common Core. The requirement must be reviewed as a common capability change, implemented generically, and regression-tested separately before onboarding resumes.

## Hard-code detector

`detectProductSpecificCommonCoreReferences()` checks candidate-profile identifiers against supplied Common Core source content. The default token set is:

- manufacturer;
- series;
- registrySeriesKey;
- productId;
- official source Drive File ID.

A hit returns `PRODUCT_SPECIFIC_REFERENCE_FOUND_IN_COMMON_CORE` and blocks profile-only onboarding.

The detector is deliberately narrow and deterministic. Product-specific fixtures, tests and config files may contain those tokens; the rule is specifically about Common Core production code.

## Fail Closed conditions

The preflight blocks on invalid Profile, missing Policy fields, Profile/Policy identity mismatch, duplicated governance Folder IDs, unregistered Adapter/Hook, invalid or implicit execution routing, Common Core changes, product-specific Common Core references, mutation authority, unverified Drive Policy/Registry context, wrong common spec version, or unfixed common baseline.

## Continuous monitoring

Until the scheduled readiness smoke and watchdog workflows are deployed on the repository default branch, a passing preflight may include:

`CONTINUOUS_MONITORING_PENDING_DEFAULT_BRANCH_MERGE`

This is a warning, not permission to bypass the per-job worker Readiness / Fail Closed gates.

## Implementation

- `src/product-master-core/profile-onboarding-readiness.mjs`
- `test/65-product-master-core-v31-profile-onboarding-readiness.test.mjs`

The repository-wide `npm test` automatically includes test 65.

## Target onboarding flow

```text
Candidate series
  -> Drive Policy / Registry context
  -> Product Profile v1.1
  -> Profile Onboarding Preflight
  -> PASS_PROFILE_ONLY_ONBOARDING
  -> real Product Master STARTUP GATE
  -> Gemini Job / Execution Channel Router
  -> Evidence Pipeline
  -> Human Approval / Change Control when mutation is required
  -> Working Savepoint
  -> Formal Gates
```

The target for the next real series is that **no Common Core modification is required** unless the series exposes a genuinely reusable capability gap.
