# LIXIL EW October 2026 formal catalog adoption

EW normal-product v1.3 → v1.4. All 708 pages of LIXIL IS6400/IS8800 were acquired from the official download endpoint and compared. Official PDF byte hashes match the existing Drive sources. SN1900 remains the product-fact authority; only normal EW product sections apply. IT0600 and the separate EW fire-door Product/Runtime/Package are excluded.

Changes: eight net-material reference prices, four spline reference prices, eight small-opening-arm price Evidence rows and a custom-item price-nonpublication note. No independent body price is inferred from set prices, and no automatic pricing/order behavior is added.

The 29 formal Fields remain unchanged: DIRECT 0, INDIRECT 9, NO_IMPACT 20. `isolation.json` binds the unchanged Selection Contract bytes and unchanged canonical selection/rule content. Of 51 Authoring sheets, 44 carry forward unchanged. Dependency and Validation content is identical. Existing 15,120-case frame-angle QA is explicitly inherited on unchanged Rule content, while changed prices and sources were newly verified (56 scoped checks). Regression tests additionally compare the current package to the preserved v1.3 Runtime.

`work-input.json`, `bridge-receipts.json`, `harness-final.json` bind the saved Formal ZIP, fixed Drive folder, native Registry EW row and fresh downloaded bytes. The native Registry schema has no package-hash columns: its actual Authoring/Runtime Manifest/Documentation IDs are joined to the saved PackageManifest for normalization. Other Registry rows remain unchanged. All v1.3 artifacts and old source bytes remain preserved in Previous.

The static EW review preview uses the actual Runtime/UI/save/output modules. Only file routing and API transport are adapted for one-file review. It shows EW only and stores review inputs in the current browser. No production deployment is represented.
