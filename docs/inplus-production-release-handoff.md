# LIXIL インプラス v0.4-R1 Production Release Handoff

- Task Classification: NON-PRODUCT-MASTER
- PRODUCT_MASTER_MUTATION: 0
- Source integration PR: #3
- Source verified HEAD: `2a7767f7d07c4972e01526d5476d45f42aa097ef`
- Source integration merge: `b1cf1419d85ca0539b44b6fe30b02052aceb7690`
- Production base at handoff: `1d4438783f07c0affb681954498a0c3e67752c81`
- Release branch: `release/lixil-inplus-v0.4-r1-production-20260908`
- Formal Runtime package: `v0.4-R1`
- Runtime manifest SHA-256: `39017746404c98b59a3238890bfece9f46acb122870def6a1361472dad5390ed`
- Runtime JSON SHA-256: `3f8468bfd089d6077489311aab6f8c5664eec096e41298fa4325d36cf2cc6c71`
- Runtime schema SHA-256: `e6de5896b3e39c1e77df72a89f499735a045748b7744d84072dc5057c403c3ec`
- UI template: `INPLUS_V04R1`
- Existing production Runtime integrations preserved: `SER-LIX-EW`, `SER-LIXIL-TW`
- Added production Runtime integration: `SER-LIXIL-INPLUS`

Release gates:

1. Pull-request CI against `main`
2. Release-branch Vercel Preview identity/build preflight
3. Local and Preview Runtime/Browser QA where access permits
4. Merge with commit title `release LIXIL Inplus v0.4-R1 production`
5. Exact merge-SHA Production deployment
6. Production Runtime smoke and desktop/mobile Browser QA
7. Automatic rollback to previous READY production deployment on post-deploy verification failure

The formal Product Master package is read-only throughout this release.
