# Native new Product Master entry

Current resolves `new_product_build_profile` in `current-architecture.json` and
`work-connections.v2.json`. `sash-new-product-master-v1` is a repository-wide
planning profile. It has no product-specific facts, allowed values, prices or
Window-type defaults. Official source review determines the product family and
applicability of native fields. A requested label is provisional identity only.

The host acquires live central Current and Skill Authority, then invokes the
Canonical `architecture-router` intent helper in this repository context. For an
unregistered label it returns the native profile and `NEW_PRODUCT_BOOTSTRAP` in
planning mode. A complete live native Registry read is still required to prove
absence; failure/empty/truncated data never means ABSENT. Existing registered
products keep their native Change/Carry-Forward routing and pending adapters.

The resolved native planner is invoked with acquired inputs:

```sh
python -B scripts/production/product-master-build.py \
  --harness-root ACQUIRED_CENTRAL_CHECKOUT \
  --instruction '新シリーズの商品マスターを作成して' \
  --registry-observation COMPLETE_NATIVE_REGISTRY_RESPONSE.json \
  --work-root WORK_ROOT --out WORK_ROOT/bootstrap-plan.json
```

Use the central validation environment with its declared dependencies. The
output supplies the normalized candidate Registry row, source acquisition
requests, candidate/evidence/QA/review/checkpoint destinations and exact validator
references. Planning writes only this explicit Work output. Execute the returned
official-source requests, freeze source identity/locators and reviewed
observations, then use the retained `product_master/build.py` and native validator
in a Work bound to the existing `harness/workflow.py` / `production-work.py`.
The native validator requires executed, same-package project Selection Scope QA;
the shared structural check alone is not native QA or Human Approval.

`product-master-build-contract.json` records the live governance adoption
observations. Reacquire ACTIVE governance for every Work; its hashes are adoption
evidence, not a floating Current authority. The Data Dictionary and common sash
specification govern structure. Existing TW/EW/Samos/APW/Uchirimo workbook and
runtime layouts are preserved references; no historical workbook is regenerated
or imposed as the format for all new products.

QA_READY is the sales estimate-request business scope. QA_PASS fixes reviewed
Selection Scope. FORMAL requires package, storage, Registry identity and the
existing fixed-payload external Human Decision. Runtime is required only when
explicitly included in Product Master Formal Scope. App integration and Release
are separate. Native folders are resolved through actual Drive IDs, parents and
revisions under the current manufacturer/series layout, with saved-byte readback
and Current update last. An unregistered product does not acquire a READY Change
Adapter merely by beginning authoring. Checkpoint/Resume/terminal inspection and
Formal persistence remain owned by the shared v2 engine.
