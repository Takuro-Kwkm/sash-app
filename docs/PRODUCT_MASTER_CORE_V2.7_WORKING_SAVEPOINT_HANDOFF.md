# Product Master Core v2.7 — Working Savepoint Handoff

## Purpose

This contract is the final common-control-plane boundary before an actual specific-series Product Master Working Savepoint operation.

It packages the exact Authoring STAGING candidate and Runtime candidate identities so that a later PRODUCT MASTER TASK can save the same artifacts to the Registry-derived `working_folder_id` without reconstructing them from chat history or guesses.

This contract **does not execute the Product Master HARD GATE**.

## Boundary

Common infrastructure flow:

`Authoring STAGING Provenance PASS -> Runtime Generation Provenance PASS -> Working Savepoint Handoff PASS`

Then, only inside an actual specific-series PRODUCT MASTER TASK:

`PRODUCT_MASTER_STARTUP_GATE PASS -> persist exact handoff artifacts to working_folder_id -> Drive re-read / parent verification -> WORKING_SAVEPOINT_GATE PASS -> NEXT_PHASE_GATE OPEN`

The handoff itself never skips or satisfies those Product Master gates.

## Record

Record type:

`PRODUCT_MASTER_WORKING_SAVEPOINT_HANDOFF`

Schema:

`1.1`

Stage:

`CONTROL_PLANE_HANDOFF`

The record binds:

- product id
- proposal id
- optional informational manufacturer / series labels
- Authoring STAGING Master fingerprint
- Authoring STAGING Provenance fingerprint
- Runtime candidate manifest fingerprint
- Runtime Generation Provenance fingerprint
- Runtime file-set fingerprint
- all Runtime file descriptors
- complete package fingerprint

No Drive folder id is stored or inferred here. The later Product Master task must obtain current folder ids from the canonical Registry during its Startup Gate.

## Required next action

A PASS handoff always records:

`EXECUTE_PRODUCT_MASTER_WORKING_SAVEPOINT_UNDER_ACTIVE_STARTUP_GATE`

It does not authorize the next Product Master Phase on its own.

## Authority boundary

The handoff fixes:

- `driveWritePerformed = false`
- `workingSavepointGate = NOT_EVALUATED`
- `nextPhaseGate = CLOSED`
- `canonicalMasterWritePerformed = false`
- `canonicalRuntimeWritePerformed = false`
- `registryWritePerformed = false`
- `formalPass = false`
- `appIntegrationReady = false`

Any record claiming stronger authority is invalid.

## Fail-closed behavior

The handoff is rejected if:

- Authoring STAGING provenance is invalid
- Runtime Generation Provenance is invalid
- Authoring and Runtime product/proposal identities differ
- Runtime manifest does not match Runtime provenance
- Authoring Master changed
- Authoring provenance changed
- Runtime provenance changed
- Runtime manifest or file set changed
- package fingerprint changed
- authority fields claim Drive, next-phase, canonical, Registry, Formal, or app-integration completion

## Append-only control-plane storage

The handoff descriptor may be persisted locally/control-plane-only as:

`savepoint-handoff/<proposalId>.working-package-handoff.json`

It is append-only and cannot overwrite an existing handoff.

This file is **not** a Product Master Drive SAVEPOINT. It is only the immutable input descriptor that the later Product Master task should consume after its own Startup Gate resolves the authoritative series folder ids.

## Operator surface

After the Authoring STAGING package and Runtime candidate package are present in the same control-plane root, the common CLI can build the immutable handoff descriptor:

```bash
npm run master:savepoint-handoff:v27 -- \
  --proposal-id=<proposalId> \
  --root=<control-plane-root> \
  --manufacturer=<informational-label> \
  --series=<informational-label>
```

The CLI loads both packages by `proposalId`; it does not accept arbitrary replacement Authoring or Runtime file paths.

Successful output still reports:

```text
WORKING_SAVEPOINT_GATE = NOT_EVALUATED
NEXT_PHASE_GATE = CLOSED
driveWritePerformed = false
formalPass = false
appIntegrationReady = false
```

The manufacturer/series flags are informational only. They are not authority for Drive folder ids. The later Product Master Startup Gate must fetch current canonical Registry data and resolve `working_folder_id` independently.

## Task classification

Creating or maintaining this common contract is a NON-PRODUCT-MASTER TASK because no specific series Master data or formal package is being changed.

Consuming the handoff to write a specific series Authoring/Runtime package into Drive is a PRODUCT MASTER TASK and must activate all applicable project gates at that point.
