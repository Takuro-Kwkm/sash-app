# Shared publication lifecycle adoption

This infrastructure successor starts at native Main
`fe6c87c1169c407bfd8a286aed19262592a29760`. Product masters, Formal decisions,
Runtime, UI, and output bytes remain exact. The completed Order5 Work and its
historical release profiles and evidence remain available for inspection.

`contracts/production/publication-lifecycle.v1.json` selects native command
arguments. The shared `release-contract.py preflight --native NATIVE --plan PLAN`
acquires the entire route, native adapter, validator, profile, destination and
upstream Work before any product work or provider operation. A plan uses one
exact production origin from `app-release.v1.json`; it cannot replace the target
with a convenient preview URL.

`scripts/production/publication-lifecycle.mjs` verifies the acquired native and
shared implementation bytes, then delegates to shared `completePublication`.
The connector host supplies acquired provider and storage adapters. The shared
host reuses saved operation identities, verifies the canonical alias after
promotion, runs only missing native QA, advances the existing v2 Release Work,
checkpoints it, reads storage back and inspects final release state. The native
entry owns no DAG, journal, human approval, deployment or storage engine.

The native execution command is:

```sh
node scripts/production/publication-lifecycle.mjs --options FIXED_RUNTIME_OPTIONS.json
```

The options select the acquired Shared checkout and the existing immutable
plan/binding/profile/spec/root/work/observations/publication/checkpoint/runtime
paths. They are passed to Shared `createCliAdapters`. A pending Drive connector
request is executed by the connected host, then the same immutable Work is
resumed with its acquired storage proof.

The existing browser runner accepts `QA_PRODUCT_IDS` as a strict subset of its
existing declared product fixtures. Its default remains all eight products at
1280/768/390 pixels. The selected native profile is tested through:

```sh
node scripts/production/publication-lifecycle-qa.mjs --profile PROFILE --url URL --expect-commit SHA --output-dir OUTPUT
```

The wrapper executes existing release identity and browser commands. Original
reports, selected snapshots, XLSX/PDF bytes and screenshots are hashed and
retained; normalized product evidence includes these references. The browser
uses an isolated context and tests save/reopen. Its persistence guarantee is
`BROWSER_LOCAL_STORAGE`. Its print checks cover the print handler and CSS;
actual PDF visual acceptance remains separately evidenced. Deployment logs are
`NOT_EXECUTED` in browser evidence and must be supplied from the actual provider.

Prepare byte pins only after the shared implementation is committed:

```sh
python3 -B scripts/production/prepare-publication-lifecycle.py --central SHARED --shared-ref FIXED_SHARED_SHA
```

Preparation writes a V7 successor rooted in this consumer's own predecessor,
snapshots its exact profile/selector, refreshes the Git dependency carrier, and
checks the bounded native diff. It reports `PREPARED_NOT_ADOPTED`. Exact-head
native CI, reviewed adoption and remote readback are still required. Product
facts, unknown values, previous Human Decisions and terminal Work are unchanged.

Release records append new immutable files to existing Drive folder
`1l8BoCcT-rTh8x9vdpkO7gf1c0C7cKEmx`. Its live metadata name is
`ORDER5_BATCH2_RELEASE_CONTINUATION_20261010`; the folder was also used for the
previous Batch3 continuation. Each new record name includes its current Work ID
and infrastructure scope. Previous files and folders are retained in place.
