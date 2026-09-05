# Evidence Inbox

This directory is the persistent non-Canonical intake area for external Evidence Candidate batches.

Runtime/import layout:

```text
data/evidence-inbox/
├─ README.md
├─ manifest.json
└─ batches/
   └─ <batchId>.json
```

Rules:

- Raw transport batches are preserved before adjudication.
- `manifest.json` is generated/updated by `persistGeminiTransport`.
- Candidate / Issue IDs must be globally unique across persisted batches.
- Duplicate semantic source claims are rejected by default.
- Nothing in this directory is Canonical Evidence merely because it is persisted here.
- Canonical promotion requires separate ChatGPT/Human adjudication.
