# Product Master Core v1.7｜サーモスL Production Preview

## Status

```text
Proposal                         PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001
STAGING                          APPLIED
Production Preview               READY
Production Approval              PENDING
Formal Workbook Write            0
Runtime Write                    0
```

## Formal target

- Drive File ID: `17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL`
- File: `サーモスL_商品マスター_v0.7_特注寸法発注アプリ投入完成版_QA確定.xlsx`
- Bound revision: `0B1PsqngSohhlZ0dycXFVYTVFY3JzQWJLLzNkVGFVcFhsNHQ0PQ`
- Modified: `2026-08-30T09:28:18.039Z`
- Size: `666560` bytes

Live read confirmed the current formal tails:

```text
06_サイズ                    SZ-SL-001559
08A_サイズ別ガラス条件       GSC-SL-001559
```

## Exact write plan

```text
06_サイズ
  APPEND_ROWS
  A1562:V1646
  85 rows
  SZ-SL-001560 ... SZ-SL-001644

08A_サイズ別ガラス条件
  APPEND_ROWS
  A1562:N1646
  85 rows
  GSC-SL-001560 ... GSC-SL-001644
```

Formal Workbook mutation total: `170 rows`.

The 8 verified page Evidence records remain in the GitHub Control Plane; no new Evidence sheet is invented in the formal Workbook.

## Projected inventory after formal write

```text
06_サイズ total                    1,559 → 1,644
06_サイズ selectable               1,410 → 1,495
08A size-glass conditions          1,559 → 1,644
Official source coverage              97 → 97 MATCH
Missing in canonical                            0
```

## Fingerprints

Proposal:
`sha256:2dbccd2d22edd6b00d516fbadfc2788c2089f693f06112f4b2b6c811d3a34063`

STAGING result:
`sha256:668abb7e3bf1f7db248449cbdbf058a9e837b09b9e02e9c95ded8296b5337d76`

Production Preview:
`sha256:a057d745c8a3a93b06aebc20c98fba99dd121804d35985d074ed5764bdab9168`

## Production safety gate

Immediately before any formal write the adapter must re-check:

1. Drive file ID
2. exact Drive revision ID
3. `06_サイズ` tail = `SZ-SL-001559`
4. `08A_サイズ別ガラス条件` tail = `GSC-SL-001559`
5. exact Production Preview fingerprint
6. explicit HUMAN Production approval bound to that Preview fingerprint

If any item drifts, Production write must abort and a new Preview must be generated.

Backup/pre-write snapshot and post-write readback are mandatory. Runtime regeneration is not authorized by Production Master approval and must occur only after formal Master readback PASS.

## CI

Production Preview Code Gate:
- V2 Recovery CI Run #376
- Run ID `33625567911`
- Head SHA `04b74201b76224b3d72afae413290b0539852474`
- `product_master_production_preview_v17`: SUCCESS
- Artifact ID `9844628349`
- Artifact digest `sha256:d543dff3cb0cde21aa622117d61ee19bcfb55f4cbe7c6fafd36c0e53daa63af0`

Persistent manifest:
`data/master-change-control/production-previews/PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001.production-preview.json`

## Final decision

`Thermos L v1.7 = PRODUCTION_WRITE_PREVIEW_READY / HUMAN_PRODUCTION_APPROVAL_PENDING`
