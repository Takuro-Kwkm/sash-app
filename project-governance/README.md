# Project Governance authority

This lane is NON-PRODUCT-MASTER. Formal packages and Canonical Registry are read-only.

`project-state.json` is the checked-in project configuration, not current execution evidence. Current state is generated from the evaluated Git HEAD, live GitHub PR/branch/runs/status, Runtime snapshot, independent field verifier and gate outputs into `artifacts/governance/project-state.json`. Unknown QA populations remain null and are never converted to zero.

Only `project-governance-gate.yml` may run on push/PR. All 60 legacy workflows retain their test steps as reusable workflows and require the shared authorization job. Legacy success is not an app/release authority. Adding a workflow requires updating and passing `workflow-authority-policy.json` validation. The controller currently connects the guarded Global Flow workflow; other preserved diagnostics must be explicitly connected by a reviewed controller change. No legacy release pipeline is automatically selected.

The controller performs syntax/policy/governance checks, creates a full Human Review artifact, runs independent field coverage and negative tests, materializes state and verifies artifact hashes. Human approval remains mandatory; no browser/full coverage/regression/release job runs while it is absent.

Evidence is persisted on the separate `governance-evidence` branch under `heads/<evaluated-head>/runs/<run-id>-<attempt>/`. This avoids the impossible self-reference of writing a commit's own SHA into its tree. `current.json` is only an index: consumers must compare its head with live PR/branch and verify every hash. Old directories are preserved. Actions artifacts remain a transport copy, not the sole durable store.

Resume command:

```sh
node scripts/governance/reconstruct-current-state.mjs
```

The command requires a scoped GitHub read credential in GH_TOKEN and a Drive read-only credential in DRIVE_READONLY_ACCESS_TOKEN. It reads GitHub and Drive; it never modifies Drive. Missing Drive credentials yield BLOCKED_LIVE_DRIVE_READ_NOT_CONFIGURED, not a false current-state PASS. The checked-in Drive snapshot records connector observations and modified identities; it is not proof of a later live read. If Drive metadata changes, re-read the actual governing content through the connector and review/update the observation before proceeding. Do not put credentials in files, logs or chat.

Approval storage must be external to the evaluated source commit to avoid invalidating its Exact HEAD. No approval has been recorded in this change; until a verified approval reference is supplied through a controlled approval intake, Human Review stays BLOCKED. Source changes require a new artifact and approval. CI SUCCESS here means governance execution succeeded, not that all product/UI/release gates passed. Read the generated per-gate results and reconstruction status.
