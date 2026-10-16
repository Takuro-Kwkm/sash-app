# Giesta2 JSON successor connection candidate

Status: REVIEW_CANDIDATE, not connected, not QA_READY, not Formal.

The existing Giesta2 connection selects an R3 Sheets baseline although the adopted R4 authoring file is JSON. The new native JSON adapter checks an exact live Formal baseline, additive semantic delta, preservation of old rows/evidence/confirmations/commercial boundaries, actual native QA execution, and package parity. `sheet-package-formal.py` reuses its existing domain-adapter hook. Shared Human, save, Registry and readback stages are unchanged.

The new profile is deliberately unselected. `work-connections.proposed.json` is a review artifact, not a live selector. Live Current d9ad953 and unchanged consumer 8618e395 pass compatibility; selecting the proposed profile fails `CURRENT_AUTHORITY_INCOMPATIBLE`: `Only native build profile and reviewed frozen revision may advance`. This needs a centrally reviewed, versioned native connection successor. Do not edit the V8 predecessor, disable the check, hash-align adoption, or treat this file as a Human Decision.

The full JSON change/QA_READY route has not been admitted. Only the prospective Formal adapter hook has been implemented here. Existing Sheets change profile remains intact.

Validation: JSON delta boundary tests 8, existing native Formal tests 20, node regression 740; lint/typecheck PASS. Actual candidate has 113 content/rule/preservation checks PASS and a candidate-only schema PASS. These checks are not a Harness QA_READY or Formal verdict.

Candidate scope: standard H2330 frame combinations, backcheck, interior-trim types and dependencies, home-master-key requirements, plinth-color derivation and sleeve-glass bead details. Custom/high-size frame applicability remains a blocking source-review gap. Original six Controlled Unresolved and QA files remain exact.

No new formal Packet or runtime preview was issued. The existing compiler's ADOPTED_MASTER_REQUIRED check remains untouched. No browser QA, canonical writes, Registry writes, merge or release was performed.
