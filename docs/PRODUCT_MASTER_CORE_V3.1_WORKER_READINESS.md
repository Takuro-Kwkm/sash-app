# Product Master Core v3.1 — Gemini AI Pro Worker Readiness

## Purpose

This common-infrastructure contract makes the self-hosted Gemini AI Pro execution surface diagnosable before a LIVE job is trusted.

It is not a Product Master package gate and it has no authority to mutate Authoring Master, Runtime, Registry, Canonical storage, or Production.

## Operational model

`GEMINI_AI_PRO` currently runs on the dedicated self-hosted macOS worker:

- GitHub runner labels: `self-hosted / macOS / ARM64 / gemini-worker`
- execution surface: `ANTIGRAVITY_CLI`
- authentication: Google AI Pro OAuth from the local user session / Keychain

The worker Mac may turn its display off. The Mac itself must remain awake while connected to AC power.

Required local conditions:

1. platform is macOS / Darwin on arm64;
2. GitHub runner service is running;
3. Antigravity CLI is available;
4. LaunchAgent uses `SessionCreate=false`;
5. LaunchAgent is limited to `Aqua` session type;
6. AC `machine sleep` is disabled (`pmset` sleep = 0).

`displaysleep` is intentionally not a blocker. A dark display does not prevent the worker from accepting jobs.

## Readiness levels

The common record is `PRODUCT_MASTER_WORKER_READINESS`, schema `3.1`.

- `PASS_LOCAL`: local execution surface is ready; AI Pro auth has not necessarily been exercised.
- `PASS_LIVE`: local checks pass and an explicit AI Pro auth preflight has also passed.
- `BLOCKED`: one or more required local/LIVE conditions failed.

The diagnostic command is:

```bash
npm run gemini:worker-readiness:v31
```

For a real Google AI Pro session check:

```bash
npm run gemini:worker-readiness:v31 -- --live-auth
```

The LIVE auth check requests only the fixed response `PRODUCT_MASTER_ANTIGRAVITY_PREFLIGHT_OK`. Credential values are never written to the readiness artifact.

## Sleep behavior

Correct dedicated-worker behavior:

```text
MacBook Air power: ON
macOS: awake
GitHub runner service: running
display: may sleep / turn off
AC machine sleep: disabled
network: connected
```

If the Mac is powered off or the machine enters system sleep, GitHub cannot assign the matching self-hosted job. The workflow can remain `queued` or `pending` until a compatible runner becomes available.

The Phase9-R2 Thermos L incident demonstrated this behavior directly: Run `33966494545` remained pending while the worker surface was unavailable and completed successfully after `sash-gemini-worker-mac` returned.

## Fail Closed and fallback

Runner readiness never changes execution channel automatically.

If `GEMINI_AI_PRO` is selected and the worker is unavailable, the job remains blocked. `GEMINI_API` may be selected only when the Job explicitly allows fallback (`fallback_allowed=true`) or when API is selected as the original execution channel.

There is no silent AI Pro -> API fallback.

## Authority boundary

Readiness output always keeps these authorities false:

- Canonical write
- Authoring write
- Runtime write
- Registry write
- Production write

This diagnostic can be used by smoke tests and future monitoring, but a readiness PASS is not Evidence approval, Human approval, Working Savepoint PASS, Product Master Formal Pass, or APP_INTEGRATION_READY.
