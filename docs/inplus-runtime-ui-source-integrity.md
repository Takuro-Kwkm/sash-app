# Inplus Runtime UI Source Integrity

Canonical formal Runtime package is read-only.

The app-side projection keeps the canonical source IDs and hashes, and each materialized projection file is pinned by Git blob SHA in `projection-manifest.json`.

A projection mismatch, unsupported schema, missing source identity, or unsupported critical rule must not silently degrade to an empty selector. It must block integration or surface MANUAL_CHECK according to the formal Runtime state.
