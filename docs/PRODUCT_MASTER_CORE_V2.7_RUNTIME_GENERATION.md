# Product Master Core v2.7 — Runtime Generation Provenance

## Purpose

This contract governs generation of a Runtime **candidate** from an Authoring STAGING candidate.

It does not publish a canonical Runtime package and does not make the application integration-ready.

Standard boundary:

`Authoring STAGING Provenance PASS -> Runtime generator -> Runtime candidate validation -> Runtime Generation Provenance PASS -> later SAVEPOINT / Formal package gates`

The later SAVEPOINT / Formal package operations apply only when an actual specific-series PRODUCT MASTER TASK is being executed. This common infrastructure contract performs none of those Drive operations itself.

## Runtime candidate manifest

Record type:

`PRODUCT_MASTER_RUNTIME_CANDIDATE_MANIFEST`

Schema:

`1.1`

Status:

`STAGING_CANDIDATE`

The manifest contains:

- `productId`
- `proposalId`
- generator id/version
- exact Authoring Master fingerprint
- Runtime file descriptors (`role`, `name`, `fingerprint`)
- generation timestamp

`runtime_manifest.json` is the entry point of the candidate package, but its presence alone does not make the package formal.

## Runtime Generation Provenance

Record type:

`PRODUCT_MASTER_RUNTIME_GENERATION_PROVENANCE`

Schema:

`1.1`

Stage:

`RUNTIME_STAGING_CANDIDATE`

The provenance binds:

- Product / Proposal identity
- exact Authoring STAGING Master fingerprint
- exact Authoring STAGING Provenance fingerprint
- Runtime manifest fingerprint
- complete Runtime file-set fingerprint
- per-file role/name/fingerprint
- generator id/version
- post-generation validation fingerprint
- generation timestamp

## Runtime file rules

A Runtime candidate requires at least one JSON artifact.

Each artifact must have:

- a unique semantic role
- a unique safe file name
- JSON-serializable content

Duplicate roles or names are rejected. File content is fingerprinted before persistence.

## Fail-closed behavior

Generation or validation is blocked when, among other conditions:

- Authoring STAGING provenance is not `PASS / STAGING_CANDIDATE`
- Authoring Master fingerprint differs from the Authoring provenance
- generator id/version is missing
- no Runtime file is supplied
- Runtime roles or names collide
- post-generation validation fails
- manifest identity or fingerprint changes
- Runtime file content changes
- declared Runtime file set changes
- an undeclared file is introduced into the persisted candidate package

## Append-only package storage

Common control-plane storage uses:

`runtime-candidates/<proposalId>/runtime_manifest.json`

`runtime-candidates/<proposalId>/<runtime-json-files>`

`runtime-provenance/<proposalId>.runtime-generation.json`

The package is append-only. Existing package/provenance paths are not overwritten.

On load, the store:

1. reads the manifest and provenance,
2. requires every declared Runtime file,
3. rejects undeclared file injection,
4. re-hashes each Runtime JSON file,
5. re-hashes the manifest and file set,
6. validates the complete provenance chain.

## Authority boundary

A PASS Runtime Generation Provenance record means only that a controlled Runtime candidate was generated.

It records:

- `runtimeCandidateGenerated = true`
- `canonicalRuntimeWritePerformed = false`
- `productionMasterWritePerformed = false`
- `registryWritePerformed = false`
- `formalPass = false`
- `appIntegrationReady = false`

Therefore this stage must not be reported as:

- Runtime finalized
- Canonical Runtime adopted
- Product Master completed
- Registry completed
- `FORMAL PASS`
- `APP_INTEGRATION_READY`

Those states require the later specific-series Product Master savepoint/package/storage/registry/formal gates.

## Legacy compatibility

Existing series-specific Runtime regeneration and historical Runtime audit files are not rewritten by this contract.

The new v2.7 layer is series-agnostic and can sit in front of existing or future Runtime generators. A series-specific generator supplies its Runtime JSON artifacts; the common layer controls identity, fingerprinting, persistence, and authority boundaries.
