# Product Master Core v1.6｜サーモスL 公式規格サイズ Gap Proposal

## 1. 判定

```text
v1.6 Size Source Gap Detection      PASS
v1.6 Change Proposal Generation     PASS
PROPOSAL STATUS                     PROPOSED
HUMAN APPROVAL                      PENDING
FORMAL WORKBOOK WRITE               0
RUNTIME WRITE                       0
```

本段階は正式Product Master反映完了ではない。
公式資料と現行正本の差分を確定し、Human Approval必須のChange Proposalを生成できた段階である。

## 2. 対象

Product:
`SER-LIX-SAMOSL` / LIXIL サーモスL

対象仕様:
- シャッター付引違い窓
- `WT-SL-SHUTTER-HIKI`
- 手動
- 標準タイプ
- `SP-SL-SHUT-M-STD`

正式Product Master:
- `サーモスL_商品マスター_v0.7_特注寸法発注アプリ投入完成版_QA確定.xlsx`
- Drive ID `17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL`
- `06_サイズ`: 1,559行 / selectable 1,410

公式Source:
- `202604_LIXIL_サーモスＬ_業務用資料集_完成品価格表.pdf`
- Drive ID `1YUN-mtWYs48YBUHJk0C3vJXnhjyZFHyf`
- 印刷 p.54–61 / PDF p.56–63

## 3. NotebookLM非依存化

NotebookLMは本対象表への質問を複数回拒否したため、Producer依存で作業を停止しない。
本v1.6ではChatGPTが公式PDFの該当8ページを直接確認し、表に実在する規格セルのみをSource Record化した。

禁止事項:
- W見出し×H見出しの直積生成
- 空欄からのサイズ推測
- 件数合わせ
- 現行Masterを正解として公式Sourceを補完すること

実装上も旧 `cross()` 生成を削除し、97件を明示Recordとして保持する。

## 4. 公式Source再抽出

直接確認した規格Size Record:

```text
printed p54 / PDF p56   12
printed p55 / PDF p57   19
printed p56 / PDF p58   12
printed p57 / PDF p59    8
printed p58 / PDF p60   10
printed p59 / PDF p61   12
printed p60 / PDF p62   12
printed p61 / PDF p63   12
--------------------------------
TOTAL                   97
```

各Recordは最低限、以下を公式表から保持する。
- sizeCode
- construction
- callW / callH
- actualW / actualH
- glassSymbol
- legendPrintedPage
- glassState
- windowClass
- printedPage / pdfPage
- locatorText

## 5. 現行正本との差分

```text
Official AVAILABLE             97
MATCH                          12
MISSING_IN_CANONICAL           85
CANONICAL_INACTIVE              0
EXTRA_IN_CANONICAL              0
DUPLICATE_CANONICAL_KEY         0
```

旧Size Coverageは `正式Master 1,410 == Runtime 1,410` を確認していたため、正式Master自体のSource omissionを検知できなかった。

v1.5以降は以下を別Gateとする。

```text
Official Source
→ Canonical Product Master
→ Runtime
```

## 6. Change Proposal

Proposal ID:
`PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001`

Status:
`PROPOSED`

Approval Policy:
`HUMAN_REQUIRED`

Proposal fingerprint:
`sha256:2dbccd2d22edd6b00d516fbadfc2788c2089f693f06112f4b2b6c811d3a34063`

Base Master fingerprint:
`sha256:77bd5043684ae0e55852b9728d5369336744fec7a233e2cf82042ba079b0461a`

Proposed changes:

```text
Verified page Evidence additions       8
Standard Size Record additions        85
Size Glass Condition additions        85
-----------------------------------------
TOTAL                                  178
```

新規Size ID予定:
`SZ-SL-001560` ～ `SZ-SL-001644`

各85 Size Recordには1対1の `sizeGlassCondition` を付与する。
サイズだけ追加してガラス凡例連動を欠落させる変更は禁止する。

## 7. Projected Gate

Proposalを現在の基準Masterへ適用した場合の投影結果:

```text
Official AVAILABLE             97
MATCH                          97
MISSING_IN_CANONICAL            0
CANONICAL_INACTIVE              0
EXTRA_IN_CANONICAL              0
DUPLICATE_CANONICAL_KEY         0

PROJECTED_OFFICIAL_SOURCE_SIZE_COVERAGE = PASS
```

これはSTAGING/Productionへ実適用したことを意味しない。

## 8. Human Approval Boundary

ChatGPT自身によるProduct Master変更承認は禁止されている。
テストでも `approverType=CHATGPT` は `MASTER_CHANGE_HUMAN_APPROVAL_REQUIRED` で拒否する。

次の処理にはユーザーの明示承認が必要:

```text
PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001
→ HUMAN APPROVAL
→ STAGING APPLY
→ STAGING Source Coverage 97/97
→ Runtime regeneration candidate
→ Production Preview
→ Production Approval
```

## 9. CI Gate

Code Gate:
- Workflow: `V2 Recovery CI`
- Run #344
- Run ID `33620908871`
- Head SHA `3431aaa1fdca267f9011a6c1d8555fc81b5babe1`
- Conclusion: `SUCCESS`

Tests:
- `npm test`: `205 / 205 PASS`
- v1.6 tests: `7 / 7 PASS`
- Runtime smoke: PASS
- Concord regression: PASS
- v1.5 official source audit: PASS
- v1.6 size gap proposal job: PASS
- Browser QA: PASS

v1.6 Artifact:
- ID `9842852053`
- Name `product-master-size-gap-proposal-v16-thermosl`
- Digest `sha256:fea63e7b7d301aedc817573e53ffb275bf55879751139de12bdb847841d3fa78`
- full `proposal.json` SHA256 `d894e68a6915525e3f743e5d5c832f1740f5d689c0cd6b1413f9f42afb285bce`

恒久manifest:
`data/master-change-control/proposals/PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001.manifest.json`

## 10. v1.6 Gate

```text
DIRECT_OFFICIAL_PDF_EXTRACTION        PASS
NO_CARTESIAN_SIZE_GENERATION          PASS
OFFICIAL_SIZE_RECORDS                 97
CURRENT_CANONICAL_MATCH               12
MISSING_IN_CANONICAL                  85
CHANGE_PROPOSAL                       PASS
VERIFIED_PAGE_EVIDENCE_ADD            8
SIZE_RECORD_ADD                       85
SIZE_GLASS_CONDITION_ADD              85
PROJECTED_SOURCE_COVERAGE              97/97 PASS
HUMAN_APPROVAL_REQUIRED               PASS
FORMAL_WORKBOOK_WRITE                  0
RUNTIME_WRITE                          0
NPM_TEST                               205/205 PASS
BROWSER_QA                             PASS
GITHUB_ACTIONS_RUN_344                 SUCCESS
```

Final decision:

`Product Master Core v1.6 Thermos L Standard Size Gap Proposal = PROPOSAL_READY / HUMAN_APPROVAL_PENDING`
