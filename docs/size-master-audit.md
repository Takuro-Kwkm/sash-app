# Size Master Formalization — Baseline Audit

> Audit point: GitHub `feat/catalog-recovery-v2` head `58fe69a110ef79b1067e74e01002acf6d0230399` (2026-08-31).
> This is the pre-implementation baseline. Canonical sources are the Drive `PRODUCT_MASTER_CANONICAL_REGISTRY_v1.0` entries under `01_正本`.

## Active registry

| Series | Canonical file | File ID | Master rows | Selectable candidates | Inactive | Runtime rows | Coverage | Baseline |
|---|---|---|---:|---:|---:|---:|---:|---|
| サーモスⅡ-H | サーモスⅡH_商品マスター_v0.7_完全完成版.xlsx | `1zHi-XsMqJp0MKH-sDoTcnTqkLMGcuRdo` | 2,297 | 2,131 | 166 | 2,131 | 100.00% | existing formal size values |
| サーモスL | サーモスL_商品マスター_v0.7_特注寸法発注アプリ投入完成版_QA確定.xlsx | `17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL` | 1,559 | 1,410 | 149 | 1,410 | 100.00% | existing formal size values + 50 custom rules |
| APW 430 | 20260830_YKKAP_APW430_商品マスター_正本 | `1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo` | 718 | 718 | 0 | 0 | 0.00% | `WAVE1_SCAFFOLD`; size values absent |
| APW 431 | APW431_商品マスター_v1.0_最終QA正式固定版.xlsx | `1TBEn2tTbFjBLeIOeDs0fR3iIDcLEn3jI` | 332 base sizes | 538 integrated candidates | 0 | 0 | 0.00% | `WAVE1_SCAFFOLD`; size values absent; 29 custom rules absent |

TW, TW防火戸, EW, インプラス, APW330 and other series are not in the current GitHub `CURRENT_WINDOW_SERIES_MODULES` registry and are outside this audit wave.

## Architecture baseline

- Catalog has no first-class `standardSizeRecords` collection.
- Standard sizes are currently represented only as `AllowedValue(size)` rows.
- There is no reusable common Size Resolver for filtering records, searching codes, or calculating missing/extra/duplicate coverage.
- APW430/APW431 skeletons are marked ACTIVE but expose zero size candidates.
- Adapter change classification: **共通概念不足 / Sheet Role不足 / Size Resolver不足**.

## Window/specification coverage baseline

| Series | Window type | Specification | Canonical selectable | Runtime | Missing | Extra | Status |
|---|---|---|---:|---:|---:|---:|---|
| サーモスⅡ-H | 単体引違い窓 | * | 197 | 197 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | シャッター付引違い窓 | SP-S2H-SHUT-E-STD | 121 | 121 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | シャッター付引違い窓 | SP-S2H-SHUT-E-VENT | 103 | 103 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | シャッター付引違い窓 | SP-S2H-SHUT-E-WIND | 94 | 94 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | シャッター付引違い窓 | SP-S2H-SHUT-M-STD | 121 | 121 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | シャッター付引違い窓 | SP-S2H-SHUT-M-WIND | 92 | 92 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 雨戸付引違い窓 | SP-S2H-AMADO-ADJ | 52 | 52 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 雨戸付引違い窓 | SP-S2H-AMADO-DAN | 84 | 84 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 雨戸付引違い窓 | SP-S2H-AMADO-LOUVER | 84 | 84 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付引違い窓 | SP-S2H-GRILLE-ADJ | 69 | 69 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付引違い窓 | SP-S2H-GRILLE-DIA | 72 | 72 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付引違い窓 | SP-S2H-GRILLE-H | 41 | 41 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付引違い窓 | SP-S2H-GRILLE-HIGH-V | 51 | 51 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付引違い窓 | SP-S2H-GRILLE-IGETA | 72 | 72 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付引違い窓 | SP-S2H-GRILLE-V | 72 | 72 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 縦すべり出し窓 | SP-S2H-TATE-CAM-T | 33 | 33 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 縦すべり出し窓 | SP-S2H-TATE-CAM-TF-IN | 12 | 12 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 縦すべり出し窓 | SP-S2H-TATE-CAM-TF-OUT | 12 | 12 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 縦すべり出し窓 | SP-S2H-TATE-CAM-TFT-IN | 6 | 6 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 縦すべり出し窓 | SP-S2H-TATE-CAM-TFT-OUT | 6 | 6 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 縦すべり出し窓 | SP-S2H-TATE-OP-T | 33 | 33 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 縦すべり出し窓 | SP-S2H-TATE-OP-TF-IN | 12 | 12 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 縦すべり出し窓 | SP-S2H-TATE-OP-TF-OUT | 12 | 12 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 縦すべり出し窓 | SP-S2H-TATE-OP-TFT-IN | 6 | 6 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 縦すべり出し窓 | SP-S2H-TATE-OP-TFT-OUT | 6 | 6 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 横すべり出し窓 | SP-S2H-YOKO-CAM | 15 | 15 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 横すべり出し窓 | SP-S2H-YOKO-OP | 15 | 15 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 高所用横すべり出し窓 | SP-S2H-HIGH-CHAIN | 24 | 24 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 高所用横すべり出し窓 | SP-S2H-HIGH-ELECTRIC | 24 | 24 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 上げ下げ窓FS | * | 24 | 24 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付上げ下げ窓FS | SP-S2H-GRILLE-UP-ADJ | 20 | 20 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付上げ下げ窓FS | SP-S2H-GRILLE-UP-DIA | 20 | 20 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付上げ下げ窓FS | SP-S2H-GRILLE-UP-H | 20 | 20 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付上げ下げ窓FS | SP-S2H-GRILLE-UP-HIGH-V | 15 | 15 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付上げ下げ窓FS | SP-S2H-GRILLE-UP-IGETA | 20 | 20 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 面格子付上げ下げ窓FS | SP-S2H-GRILLE-UP-V | 20 | 20 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | FIX窓（外押縁タイプ） | * | 118 | 118 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | FIX窓（内押縁タイプ） | * | 118 | 118 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 内倒し窓 | * | 14 | 14 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 外倒し窓 | SP-S2H-OUTWARD-E | 8 | 8 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 外倒し窓 | SP-S2H-OUTWARD-EE | 8 | 8 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 装飾引違い窓 | SP-S2H-KAZARI-H | 51 | 51 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 装飾引違い窓 | SP-S2H-KAZARI-HK | 25 | 25 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 装飾引違い窓 | SP-S2H-KAZARI-HKK | 18 | 18 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | テラスドア | * | 28 | 28 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 採風勝手口ドアFS | * | 21 | 21 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 勝手口ドア | SP-S2H-KD-FULLGLASS | 21 | 21 | 0 | 0 | BASELINE PASS |
| サーモスⅡ-H | 勝手口ドア | SP-S2H-KD-WAIST | 21 | 21 | 0 | 0 | BASELINE PASS |
| サーモスL | 単体引違い窓 | * | 169 | 169 | 0 | 0 | BASELINE PASS |
| サーモスL | シャッター付引違い窓 | SP-SL-SHUT-E-STD | 101 | 101 | 0 | 0 | BASELINE PASS |
| サーモスL | シャッター付引違い窓 | SP-SL-SHUT-E-VENT | 88 | 88 | 0 | 0 | BASELINE PASS |
| サーモスL | シャッター付引違い窓 | SP-SL-SHUT-E-WIND | 53 | 53 | 0 | 0 | BASELINE PASS |
| サーモスL | シャッター付引違い窓 | SP-SL-SHUT-M-STD | 12 | 12 | 0 | 0 | BASELINE PASS |
| サーモスL | 雨戸付引違い窓 | * | 54 | 54 | 0 | 0 | BASELINE PASS |
| サーモスL | 面格子付引違い窓 | SP-SL-GRILLE-DIA | 73 | 73 | 0 | 0 | BASELINE PASS |
| サーモスL | 面格子付引違い窓 | SP-SL-GRILLE-H | 42 | 42 | 0 | 0 | BASELINE PASS |
| サーモスL | 面格子付引違い窓 | SP-SL-GRILLE-IGETA | 73 | 73 | 0 | 0 | BASELINE PASS |
| サーモスL | 面格子付引違い窓 | SP-SL-GRILLE-V | 73 | 73 | 0 | 0 | BASELINE PASS |
| サーモスL | 縦すべり出し窓 | SP-SL-TATE-CAM-T | 33 | 33 | 0 | 0 | BASELINE PASS |
| サーモスL | 縦すべり出し窓 | SP-SL-TATE-CAM-TF-IN | 12 | 12 | 0 | 0 | BASELINE PASS |
| サーモスL | 縦すべり出し窓 | SP-SL-TATE-CAM-TF-OUT | 12 | 12 | 0 | 0 | BASELINE PASS |
| サーモスL | 縦すべり出し窓 | SP-SL-TATE-CAM-TFT-IN | 6 | 6 | 0 | 0 | BASELINE PASS |
| サーモスL | 縦すべり出し窓 | SP-SL-TATE-CAM-TFT-OUT | 6 | 6 | 0 | 0 | BASELINE PASS |
| サーモスL | 縦すべり出し窓 | SP-SL-TATE-OP-T | 33 | 33 | 0 | 0 | BASELINE PASS |
| サーモスL | 縦すべり出し窓 | SP-SL-TATE-OP-TF-IN | 12 | 12 | 0 | 0 | BASELINE PASS |
| サーモスL | 縦すべり出し窓 | SP-SL-TATE-OP-TF-OUT | 12 | 12 | 0 | 0 | BASELINE PASS |
| サーモスL | 縦すべり出し窓 | SP-SL-TATE-OP-TFT-IN | 6 | 6 | 0 | 0 | BASELINE PASS |
| サーモスL | 縦すべり出し窓 | SP-SL-TATE-OP-TFT-OUT | 6 | 6 | 0 | 0 | BASELINE PASS |
| サーモスL | 横すべり出し窓 | SP-SL-YOKO-CAM | 20 | 20 | 0 | 0 | BASELINE PASS |
| サーモスL | 横すべり出し窓 | SP-SL-YOKO-OP | 22 | 22 | 0 | 0 | BASELINE PASS |
| サーモスL | 高所用横すべり出し窓 | * | 36 | 36 | 0 | 0 | BASELINE PASS |
| サーモスL | 上げ下げ窓FS | * | 19 | 19 | 0 | 0 | BASELINE PASS |
| サーモスL | 面格子付上げ下げ窓FS | SP-SL-AGE-GRILLE-DIA | 20 | 20 | 0 | 0 | BASELINE PASS |
| サーモスL | 面格子付上げ下げ窓FS | SP-SL-AGE-GRILLE-H | 20 | 20 | 0 | 0 | BASELINE PASS |
| サーモスL | 面格子付上げ下げ窓FS | SP-SL-AGE-GRILLE-IGETA | 20 | 20 | 0 | 0 | BASELINE PASS |
| サーモスL | 面格子付上げ下げ窓FS | SP-SL-AGE-GRILLE-V | 20 | 20 | 0 | 0 | BASELINE PASS |
| サーモスL | FIX窓（外押縁タイプ） | * | 123 | 123 | 0 | 0 | BASELINE PASS |
| サーモスL | FIX窓（内押縁タイプ） | * | 122 | 122 | 0 | 0 | BASELINE PASS |
| サーモスL | 内倒し窓 | * | 14 | 14 | 0 | 0 | BASELINE PASS |
| サーモスL | 外倒し窓 | * | 8 | 8 | 0 | 0 | BASELINE PASS |
| サーモスL | 装飾引違い窓 | SP-SL-KAZARI-H | 51 | 51 | 0 | 0 | BASELINE PASS |
| サーモスL | 装飾引違い窓 | SP-SL-KAZARI-HK | 4 | 4 | 0 | 0 | BASELINE PASS |
| サーモスL | 装飾引違い窓 | SP-SL-KAZARI-HKK | 5 | 5 | 0 | 0 | BASELINE PASS |
| サーモスL | テラスドア | * | 12 | 12 | 0 | 0 | BASELINE PASS |
| サーモスL | 採風勝手口ドアFS | * | 9 | 9 | 0 | 0 | BASELINE PASS |
| サーモスL | 勝手口ドア | * | 9 | 9 | 0 | 0 | BASELINE PASS |
| APW 430 | たてすべり出し窓（グレモンハンドル仕様）単窓 | * | 33 | 0 | 33 | 0 | BASELINE FAIL |
| APW 430 | たてすべり出し窓（グレモンハンドル仕様）＋FIX段窓 | * | 6 | 0 | 6 | 0 | BASELINE FAIL |
| APW 430 | たてすべり出し窓（グレモンハンドル仕様）＋FIX連窓 | * | 18 | 0 | 18 | 0 | BASELINE FAIL |
| APW 430 | たてすべり出し窓（グレモンハンドル仕様）ウインドキャッチ連窓 | * | 15 | 0 | 15 | 0 | BASELINE FAIL |
| APW 430 | たてすべり出し窓（オペレーターハンドル仕様）単窓 | * | 30 | 0 | 30 | 0 | BASELINE FAIL |
| APW 430 | たてすべり出し窓（オペレーターハンドル仕様）＋FIX段窓 | * | 6 | 0 | 6 | 0 | BASELINE FAIL |
| APW 430 | たてすべり出し窓（オペレーターハンドル仕様）＋FIX連窓 | * | 18 | 0 | 18 | 0 | BASELINE FAIL |
| APW 430 | たてすべり出し窓（オペレーターハンドル仕様）ウインドキャッチ連窓 | * | 15 | 0 | 15 | 0 | BASELINE FAIL |
| APW 430 | すべり出し窓（グレモンハンドル仕様）単窓 | * | 46 | 0 | 46 | 0 | BASELINE FAIL |
| APW 430 | すべり出し窓（グレモンハンドル仕様）＋FIX段窓 | * | 12 | 0 | 12 | 0 | BASELINE FAIL |
| APW 430 | すべり出し窓（グレモンハンドル仕様）＋FIX連窓 | * | 10 | 0 | 10 | 0 | BASELINE FAIL |
| APW 430 | すべり出し窓（オペレーターハンドル仕様）単窓 | * | 28 | 0 | 28 | 0 | BASELINE FAIL |
| APW 430 | すべり出し窓（オペレーターハンドル仕様）＋FIX段窓 | * | 12 | 0 | 12 | 0 | BASELINE FAIL |
| APW 430 | すべり出し窓（オペレーターハンドル仕様）＋FIX連窓 | * | 10 | 0 | 10 | 0 | BASELINE FAIL |
| APW 430 | 高所用すべり出し窓 単窓 | * | 30 | 0 | 30 | 0 | BASELINE FAIL |
| APW 430 | 高所用すべり出し窓（端部操作仕様）単窓 | * | 16 | 0 | 16 | 0 | BASELINE FAIL |
| APW 430 | ツーアクション窓 単窓 | * | 27 | 0 | 27 | 0 | BASELINE FAIL |
| APW 430 | ツーアクション窓＋FIX段窓 | * | 10 | 0 | 10 | 0 | BASELINE FAIL |
| APW 430 | ツーアクション窓＋FIX連窓 | * | 28 | 0 | 28 | 0 | BASELINE FAIL |
| APW 430 | 引違い窓 | * | 80 | 0 | 80 | 0 | BASELINE FAIL |
| APW 430 | 面格子付引違い窓 | * | 50 | 0 | 50 | 0 | BASELINE FAIL |
| APW 430 | シャッター付引違い窓 | * | 41 | 0 | 41 | 0 | BASELINE FAIL |
| APW 430 | FIX窓 窓タイプ | * | 133 | 0 | 133 | 0 | BASELINE FAIL |
| APW 430 | FIX窓 テラスタイプ（在来） | * | 28 | 0 | 28 | 0 | BASELINE FAIL |
| APW 430 | FIX窓 テラスタイプ（2×4） | * | 16 | 0 | 16 | 0 | BASELINE FAIL |
| APW 431 | 引違いテラス戸 | * | 110 | 0 | 110 | 0 | BASELINE FAIL |
| APW 431 | シャッター付引違いテラス戸 | * | 258 | 0 | 258 | 0 | BASELINE FAIL |
| APW 431 | 大開口スライディング | * | 56 | 0 | 56 | 0 | BASELINE FAIL |
| APW 431 | 開き窓テラス | * | 27 | 0 | 27 | 0 | BASELINE FAIL |
| APW 431 | テラスドア | * | 51 | 0 | 51 | 0 | BASELINE FAIL |
| APW 431 | 勝手口ドア | * | 36 | 0 | 36 | 0 | BASELINE FAIL |

## Baseline gate

- サーモスⅡ-H: canonical count matches runtime count; reachability and bidirectional set equality will be locked by new tests.
- サーモスL: canonical count matches runtime count; reachability and bidirectional set equality will be locked by new tests.
- APW430: **SIZE_FORMAL_PASS = false** (Missing 718).
- APW431: **SIZE_FORMAL_PASS = false** (Missing 538 integrated candidates; custom rules Missing 29).

## Final implementation result

The baseline above is retained as the pre-change audit. The final common `StandardSizeRecord` / Size Resolver result is:

| Series | Active windows | Specifications | Canonical base rows | Selectable runtime candidates | Inactive retained | Custom rules | Handing-sensitive | Construction-sensitive | Frame/config attributed | Coverage | Missing | Extra | Duplicate IDs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| サーモスⅡ-H | 17 | 41 | 2,297 | 2,131 | 166 | 0 | 278 | 2,131 | 1,325 | 100.00% | 0 | 0 | 0 |
| サーモスL | 17 | 39 | 1,559 | 1,410 | 149 | 50 | 184 | 1,410 | 0 | 100.00% | 0 | 0 | 0 |
| APW 430 | 25 | 11 | 718 | 718 | 0 | 0 | 35 | 718 | 141 | 100.00% | 0 | 0 | 0 |
| APW 431 | 6 | 41 | 332 | 538 integrated candidates | 0 | 29 | 0 | 538 | 538 | 100.00% | 0 | 0 | 0 |

Notes:

- APW 431 keeps 332 canonical base size IDs and 538 exact integrated candidate IDs after the formal shutter/configuration expansion; no W/H Cartesian generation is used.
- Inactive records remain in the catalog for evidence and coverage but are excluded by the common resolver.
- Every one of the 4,797 selectable candidates is exercised by the selector-reachability test.
- S2H/Thermos L specification rows are shown in the baseline matrix above. APW 430 specification gates are fixed at 50/50/50/35 (four grille types), 41 each (four shutter types), and 80/73/1 (standard/crescent-down/emergency). APW 431 retains all 41 canonical specification rows and resolves the exact integrated selector dimensions (region/configuration/variant/shutter/construction/frame/floor) from the 538 candidates.

### Final active-window coverage

| Series | Window type | Canonical | Runtime | Missing | Extra | Status |
|---|---|---:|---:|---:|---:|---|
| サーモスⅡ-H | 単体引違い窓 | 197 | 197 | 0 | 0 | PASS |
| サーモスⅡ-H | シャッター付引違い窓 | 531 | 531 | 0 | 0 | PASS |
| サーモスⅡ-H | 雨戸付引違い窓 | 220 | 220 | 0 | 0 | PASS |
| サーモスⅡ-H | 面格子付引違い窓 | 377 | 377 | 0 | 0 | PASS |
| サーモスⅡ-H | 縦すべり出し窓 | 138 | 138 | 0 | 0 | PASS |
| サーモスⅡ-H | 横すべり出し窓 | 30 | 30 | 0 | 0 | PASS |
| サーモスⅡ-H | 高所用横すべり出し窓 | 48 | 48 | 0 | 0 | PASS |
| サーモスⅡ-H | 上げ下げ窓FS | 24 | 24 | 0 | 0 | PASS |
| サーモスⅡ-H | 面格子付上げ下げ窓FS | 115 | 115 | 0 | 0 | PASS |
| サーモスⅡ-H | FIX窓（外押縁タイプ） | 118 | 118 | 0 | 0 | PASS |
| サーモスⅡ-H | FIX窓（内押縁タイプ） | 118 | 118 | 0 | 0 | PASS |
| サーモスⅡ-H | 内倒し窓 | 14 | 14 | 0 | 0 | PASS |
| サーモスⅡ-H | 外倒し窓 | 16 | 16 | 0 | 0 | PASS |
| サーモスⅡ-H | 装飾引違い窓 | 94 | 94 | 0 | 0 | PASS |
| サーモスⅡ-H | テラスドア | 28 | 28 | 0 | 0 | PASS |
| サーモスⅡ-H | 採風勝手口ドアFS | 21 | 21 | 0 | 0 | PASS |
| サーモスⅡ-H | 勝手口ドア | 42 | 42 | 0 | 0 | PASS |
| サーモスL | 単体引違い窓 | 169 | 169 | 0 | 0 | PASS |
| サーモスL | シャッター付引違い窓 | 254 | 254 | 0 | 0 | PASS |
| サーモスL | 雨戸付引違い窓 | 54 | 54 | 0 | 0 | PASS |
| サーモスL | 面格子付引違い窓 | 261 | 261 | 0 | 0 | PASS |
| サーモスL | 縦すべり出し窓 | 138 | 138 | 0 | 0 | PASS |
| サーモスL | 横すべり出し窓 | 42 | 42 | 0 | 0 | PASS |
| サーモスL | 高所用横すべり出し窓 | 36 | 36 | 0 | 0 | PASS |
| サーモスL | 上げ下げ窓FS | 19 | 19 | 0 | 0 | PASS |
| サーモスL | 面格子付上げ下げ窓FS | 80 | 80 | 0 | 0 | PASS |
| サーモスL | FIX窓（外押縁タイプ） | 123 | 123 | 0 | 0 | PASS |
| サーモスL | FIX窓（内押縁タイプ） | 122 | 122 | 0 | 0 | PASS |
| サーモスL | 内倒し窓 | 14 | 14 | 0 | 0 | PASS |
| サーモスL | 外倒し窓 | 8 | 8 | 0 | 0 | PASS |
| サーモスL | 装飾引違い窓 | 60 | 60 | 0 | 0 | PASS |
| サーモスL | テラスドア | 12 | 12 | 0 | 0 | PASS |
| サーモスL | 採風勝手口ドアFS | 9 | 9 | 0 | 0 | PASS |
| サーモスL | 勝手口ドア | 9 | 9 | 0 | 0 | PASS |
| APW 430 | たてすべり出し窓（グレモン）単窓 | 33 | 33 | 0 | 0 | PASS |
| APW 430 | たてすべり出し窓（グレモン）＋FIX段窓 | 6 | 6 | 0 | 0 | PASS |
| APW 430 | たてすべり出し窓（グレモン）＋FIX連窓 | 18 | 18 | 0 | 0 | PASS |
| APW 430 | たてすべり出し窓（グレモン）ウインドキャッチ | 15 | 15 | 0 | 0 | PASS |
| APW 430 | たてすべり出し窓（オペレーター）単窓 | 30 | 30 | 0 | 0 | PASS |
| APW 430 | たてすべり出し窓（オペレーター）＋FIX段窓 | 6 | 6 | 0 | 0 | PASS |
| APW 430 | たてすべり出し窓（オペレーター）＋FIX連窓 | 18 | 18 | 0 | 0 | PASS |
| APW 430 | たてすべり出し窓（オペレーター）ウインドキャッチ | 15 | 15 | 0 | 0 | PASS |
| APW 430 | すべり出し窓（グレモン）単窓 | 46 | 46 | 0 | 0 | PASS |
| APW 430 | すべり出し窓（グレモン）＋FIX段窓 | 12 | 12 | 0 | 0 | PASS |
| APW 430 | すべり出し窓（グレモン）＋FIX連窓 | 10 | 10 | 0 | 0 | PASS |
| APW 430 | すべり出し窓（オペレーター）単窓 | 28 | 28 | 0 | 0 | PASS |
| APW 430 | すべり出し窓（オペレーター）＋FIX段窓 | 12 | 12 | 0 | 0 | PASS |
| APW 430 | すべり出し窓（オペレーター）＋FIX連窓 | 10 | 10 | 0 | 0 | PASS |
| APW 430 | 高所用すべり出し窓 単窓 | 30 | 30 | 0 | 0 | PASS |
| APW 430 | 高所用すべり出し窓（端部操作）単窓 | 16 | 16 | 0 | 0 | PASS |
| APW 430 | ツーアクション窓 単窓 | 27 | 27 | 0 | 0 | PASS |
| APW 430 | ツーアクション窓＋FIX段窓 | 10 | 10 | 0 | 0 | PASS |
| APW 430 | ツーアクション窓＋FIX連窓 | 28 | 28 | 0 | 0 | PASS |
| APW 430 | 引違い窓 | 80 | 80 | 0 | 0 | PASS |
| APW 430 | 面格子付引違い窓 | 50 | 50 | 0 | 0 | PASS |
| APW 430 | シャッター付引違い窓 | 41 | 41 | 0 | 0 | PASS |
| APW 430 | FIX窓 窓タイプ | 133 | 133 | 0 | 0 | PASS |
| APW 430 | FIX窓 テラスタイプ（在来） | 28 | 28 | 0 | 0 | PASS |
| APW 430 | FIX窓 テラスタイプ（2×4） | 16 | 16 | 0 | 0 | PASS |
| APW 431 | 引違いテラス戸 | 110 | 110 | 0 | 0 | PASS |
| APW 431 | シャッター付引違いテラス戸 | 258 | 258 | 0 | 0 | PASS |
| APW 431 | 大開口スライディング | 56 | 56 | 0 | 0 | PASS |
| APW 431 | 開き窓テラス | 27 | 27 | 0 | 0 | PASS |
| APW 431 | テラスドア | 51 | 51 | 0 | 0 | PASS |
| APW 431 | 勝手口ドア | 36 | 36 | 0 | 0 | PASS |

### Final gate status

- Automated integration/regression: **78/78 PASS** (71 existing/size tests plus 7 concurrently added Concord S30 regression tests).
- Missing / Extra / duplicate ID / orphan / cross-product contamination: **0**.
- Common Size Resolver product-name and window-name tokens: **0**.
- Catalog version: `V4.5 SIZE-MASTER-FORMAL + CONCORD-S30` (the concurrently added non-sash entrance-door module is preserved but is outside this sash-size audit).
- Browser QA and CI identifiers are recorded in PR #1 after the branch-head checks complete.
