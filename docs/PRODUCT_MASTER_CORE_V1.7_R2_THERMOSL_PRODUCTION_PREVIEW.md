# Product Master Core v1.7-R2｜サーモスL Production Preview

## Status

```text
Proposal                         PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001
STAGING                          APPLIED
Original Production Approval     INVALIDATED_BY_POST_WRITE_READBACK
Failed formal write              ROLLED_BACK
Formal Master current content    PRE-PRODUCTION RESTORED
Corrected Production Preview     READY
Fresh Production Approval        PENDING
Runtime Write                    0
```

## Post-write failure and rollback

The first v1.7 preview used an append start one Excel row too early. Mandatory post-write readback detected that `SZ-SL-001559` and `GSC-SL-001559` had been overwritten and the resulting inventory was 1,643 / 1,494 / 1,643 instead of 1,644 / 1,495 / 1,644.

The formal Drive file was immediately restored from the pre-write backup. The rolled-back workbook is byte-for-byte identical to the pre-production backup:

`sha256:eec989d1fd2e1ad4fc025e08c8b122c522e7811840b075f5b9eff2567ea4d4ac`

Current rollback revision:
`0B1PsqngSohhldjYycXpvcXp5VVlLSDQyUlBBUmJPTFZxbU1nPQ`

Rollback audit:
`data/master-change-control/production-rollbacks/PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001.v17-rollback.json`

Runtime was never changed.

## Corrected append boundary

Artifact-level workbook readback proved that the existing tail records occupy Excel row 1562. Therefore the first append row is 1563.

```text
06_サイズ
  current tail: SZ-SL-001559 at row 1562
  corrected append: A1563:V1647
  85 rows
  new records: SZ-SL-001560 ... SZ-SL-001644

08A_サイズ別ガラス条件
  current tail: GSC-SL-001559 at row 1562
  corrected append: A1563:N1647
  85 rows
  new records: GSC-SL-001560 ... GSC-SL-001644
```

## Corrected Preview fingerprint

`sha256:095880ed441afd4925fdcbe4c7933be92190a08d9120155d27f7a00d1ed11613`

Superseded fingerprints:
- `sha256:a057d745c8a3a93b06aebc20c98fba99dd121804d35985d074ed5764bdab9168`
- `sha256:47cda6534569bbd2c1deb5fb34ce62083e091db19ae26e1e6c941329dd286c3b`

The user's previous Production approval was bound to the first superseded preview and is therefore not valid for R2.

## Projected formal inventory

```text
06_サイズ total                    1,559 -> 1,644
06_サイズ selectable               1,410 -> 1,495
08A size-glass conditions          1,559 -> 1,644
Official source coverage                   97 / 97
Missing                                            0
```

## CI Gate

V2 Recovery CI Run #400 / Run ID `33627479229`:
- overall: SUCCESS
- product_master_production_preview_v17: SUCCESS
- npm test: SUCCESS
- Runtime smoke: SUCCESS
- Browser QA: SUCCESS

Artifact:
- ID `9845385299`
- digest `sha256:bb2d1fe5abec3c35edc295ca9b1d9f2285da072a7a4141d95d0f3576a05ffd95`

Persistent R2 manifest:
`data/master-change-control/production-previews/PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001.production-preview-r2.json`

## Final decision

`Thermos L v1.7-R2 = CORRECTED_PRODUCTION_WRITE_PREVIEW_READY / FRESH_HUMAN_PRODUCTION_APPROVAL_PENDING`
