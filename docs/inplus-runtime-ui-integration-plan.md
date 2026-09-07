# LIXIL インプラス Runtime UI Integration

Task classification: NON-PRODUCT-MASTER.

The formal Product Master Runtime Package is read-only. Product Master Authoring Master, canonical Runtime files, runtime_manifest, and Canonical Registry are not modified by this branch.

Current integration source:
- manufacturer: LIXIL
- series: インプラス
- package_version: v0.4
- schema_version: 2.0
- runtime contract: MANIFEST_DECLARED_SEMANTIC_TABLE_BUNDLE
- runtime_manifest Drive File ID: 1z-FQwjdDLyFdpAsD-JDI-jGEwkHxNwH6
- runtime_manifest SHA-256: cfb33c43745daf32e83aee65a38532afa5c843d7c854b45b94e08bc2bbca14e6

Implementation path:
1. audit deterministic projections and provenance
2. add a generic SEMANTIC_TABLE_BUNDLE_V2 adapter
3. register Inplus in the app Runtime Integration Registry
4. implement fail-closed dependency/size/manual-check evaluation
5. add targeted integration tests and regression
6. run actual Runtime smoke and Desktop 1440x1000 / Smartphone 390x844 Browser QA
7. only mark APP_INTEGRATION_READY when all relevant CI and Browser gates pass

Known Product Master manual states are preserved and are not converted to PASS by app code.
