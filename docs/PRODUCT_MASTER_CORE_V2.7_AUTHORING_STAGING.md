# Product Master Core v2.7 — Authoring STAGING Provenance

## Purpose

This contract governs the boundary after Human Approval / Change Control and before Runtime generation.

A successful Change Control apply does **not** create a Canonical Product Master. It creates an **Authoring STAGING candidate** whose exact ancestry must remain auditable.

Standard boundary:

`Human Approval PASS -> Review Queue Gate Binding PASS -> Change Control OPEN -> STAGING apply -> Authoring STAGING Provenance PASS -> Runtime Candidate generation`

## Record

Record type:

`PRODUCT_MASTER_AUTHORING_STAGING_PROVENANCE`

Schema:

`1.1`

Stage:

`STAGING_CANDIDATE`

The provenance binds:

- Proposal id and product id
- exact Proposal fingerprint
- Base Master fingerprint
- resulting Authoring STAGING Master fingerprint
- applied change-set fingerprint
- Human Approval Provenance fingerprint
- Human Approval Review Queue Gate Binding fingerprint
- Change Control Entry Gate fingerprint
- Review Queue Gate-set fingerprint
- post-apply validation fingerprint
- STAGING apply actor/time

## Fail-closed behavior

Authoring STAGING provenance is rejected when:

- Proposal is not `APPLIED`
- apply mode is not `STAGING`
- Human approval is absent or no longer HUMAN
- Base Master fingerprint changed
- resulting STAGING Master fingerprint changed
- Human Approval Provenance changed
- Review Queue Gate Binding changed
- Change Control Gate changed
- post-apply validation fails

Any drift requires returning to the appropriate earlier control boundary. Existing provenance is not silently rewritten.

## Authority boundary

A PASS Authoring STAGING record means only that a controlled candidate was produced.

It explicitly records:

- `authoringStagingCandidate = true`
- `canonicalMasterWritePerformed = false`
- `productionMasterWritePerformed = false`
- `runtimeWritePerformed = false`
- `registryWritePerformed = false`
- `formalPass = false`

Therefore `PASS` here must never be described as Product Master completion, canonicalization, production adoption, Runtime completion, Registry completion, `FORMAL PASS`, or `APP_INTEGRATION_READY`.

## Append-only package storage

The common control-plane store persists a pair:

- `staging/<proposalId>.authoring-master.json`
- `staging-provenance/<proposalId>.authoring-staging.json`

The pair is append-only. If either path already exists, a second persist is blocked rather than overwritten.

On load, the store re-hashes the Authoring Master and requires it to match `resultMasterFingerprint` in the provenance record. Missing pair members or fingerprint drift invalidate the package.

## Legacy compatibility

Historical Product Master staging artifacts are not rewritten and keep their existing fingerprints and paths.

This v2.7 contract applies to new governed common-pipeline work. It is a shared infrastructure contract and does not itself perform any Drive Product Master savepoint, canonical folder write, Registry update, or Formal Gate operation.
