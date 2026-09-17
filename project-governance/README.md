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

The command requires a scoped GitHub read credential in `GH_TOKEN`. Drive authority is resolved in two levels. A fresh `GOOGLE_DRIVE_CONNECTOR` observation may satisfy `CURRENT_STATE_RECONSTRUCTION_GATE`; its required files, content-read flags and freshness are defined by `drive-authority-policy.json`. This keeps a new ChatGPT session independent of prior chat memory: it must re-read Drive through the connector when the attestation is stale and update the snapshot before claiming current state. A configured `DRIVE_READONLY_ACCESS_TOKEN` or Workload Identity live read upgrades the observation to `LIVE_API_VERIFIED`.

Connector attestation does **not** authorize post-human execution. `post_human_drive_live_gate` requires a live read-only Drive API verification. Therefore Human Review approval plus a stale or connector-only Drive observation still cannot start Full Coverage / Browser / Regression / Release work. Missing live credentials are `BLOCKED` for that post-review path, never silently downgraded.

Approval storage is external to the evaluated source commit to avoid invalidating its Exact HEAD. No approval has been recorded in this change; until a verified approval reference is supplied through the GitHub human-comment intake, Human Review stays BLOCKED. Source changes require a new artifact and approval. CI SUCCESS here means governance execution succeeded, not that all product/UI/release gates passed. Read the generated per-gate results and reconstruction status.

## Human approval intake

An authorized human listed in `human-review-policy.json` may post a PR #24 comment beginning with `HUMAN_FLOW_REVIEW_APPROVAL` followed on the next line by JSON containing `decision: "APPROVE"`, `reviewed_exact_head`, and `review_artifact_identity`. The controller reads GitHub directly, rejects bots and old-head approvals, and stores the comment URL as the approval reference. A later matching comment with `decision: "REVOKE"` withdraws approval. No comment is posted automatically and no approval is inferred in this change.

## Drive automation setup

For ongoing CI live verification, configure a Google Workload Identity Provider restricted to this repository/workflow and a service account with viewer access only to the required Drive files. Set GitHub repository variables `GOOGLE_WORKLOAD_IDENTITY_PROVIDER` and `GOOGLE_DRIVE_READER_SERVICE_ACCOUNT`. The controller requests only `drive.readonly` and writes no credential file. Google setup requires an administrator; the connector's ChatGPT login is not an Actions credential. An existing scoped access-token secret is supported as a temporary alternative, but expired tokens must not be retried without renewed authorization.

The absence of Workload Identity does not erase a fresh connector observation or prevent governance-state reconstruction. It only keeps `post_human_drive_live_gate=BLOCKED`, so post-review execution remains closed until live read-only Drive verification exists.
