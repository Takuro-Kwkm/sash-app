# LIXIL サーモスL｜シャッター付引違い窓 手動・標準タイプ 規格サイズ Source Evidence Extraction Prompt v1

あなたは商品Masterを作成するAIではありません。
あなたの役割は、指定されたLIXIL公式PDFから、指定範囲に明示されている規格サイズを `STANDARD_SIZE_SOURCE_RECORD` として原子的に抽出することだけです。

## 1. 対象Source

- productId: `SER-LIX-SAMOSL`
- Source type: `OFFICIAL_PDF`
- Drive file ID: `1YUN-mtWYs48YBUHJk0C3vJXnhjyZFHyf`
- title: `202604_LIXIL_サーモスＬ_業務用資料集_完成品価格表.pdf`
- version: `202604`

## 2. 今回の対象

対象商品:

- windowTypeId: `WT-SL-SHUTTER-HIKI`
- 商品: `シャッター付引違い窓`
- specificationId: `SP-SL-SHUT-M-STD`
- シャッター: `手動`
- 対象価格: `標準タイプ`

対象ページは次の8ページだけです。

| 印刷ページ | PDFページ | 対象セクション | construction |
|---|---:|---|---|
| 54 | 56 | 手動（在来・204）マド① | `在来・204` |
| 55 | 57 | 手動（在来・204）マド① 続き | `在来・204` |
| 56 | 58 | 手動（在来・204）マド② | `在来・204` |
| 57 | 59 | 手動（在来・204）マド② 続き | `在来・204` |
| 58 | 60 | 手動（在来）テラス① | `在来` |
| 59 | 61 | 手動（在来）テラス① 続き | `在来` |
| 60 | 62 | 手動（在来）テラス② | `在来` |
| 61 | 63 | 手動（在来）テラス② 続き | `在来` |

他ページ、電動、耐風タイプ、S型、オプション、網戸、ガラス価格、価格金額そのものは今回抽出しないでください。

## 3. 最重要抽出ルール

1. **表に実際に呼称コードが印字され、標準タイプの価格設定が存在するセルだけ**を1 Recordとして抽出してください。
2. 空欄セルは `設定なし` と扱い、Recordを作らないでください。
3. 幅見出しと高さ見出しの直積からサイズを推測してはいけません。
4. 同一ページにW/H見出しが存在しても、該当セルが空欄ならCandidate化しないでください。
5. `114` × `09` のような組合せからコードを生成せず、**表に印字された呼称コードそのもの**を `sizeCode` にしてください。
6. `251-2` / `251-4` / `256-2` / `256-4` のような幅区分は、表に印字された完成した呼称コードをそのまま保存してください。例: `25111-2`。
7. ★、○などの記号が呼称に付いている場合、設定の有無とは分離し、`tableMarker` に保存してください。記号を理由にRecordを除外しないでください。
8. 寸法値は同じ表の行・列見出しに明示されている値だけを使用してください。計算・補間は禁止です。
9. 読み取れないセルは推測せず `issues` へ送ってください。
10. 現在の商品Master、Runtime、既知のMissing件数、期待件数は参照せず、Sourceだけから独立抽出してください。

## 4. 各Recordで抽出する情報

各設定セルについて可能な限り以下をSourceから取得してください。

- `sizeCode`: 表に印字された呼称
- `construction`: 上記ページ対応表どおり
- `callW`: 呼称幅
- `callH`: 呼称高
- `actualW`: 基本寸法W mm
- `actualH`: 基本寸法H mm
- `innerReferenceW`: 内法基準寸法w mm
- `innerReferenceH`: 内法基準寸法h mm
- `module`: モジュール区分
- `tableMarker`: `★` / `○` / その他記号。無印なら `null`

値が該当ページに明示されていない場合は、推測せず `null` にしてください。

## 5. locatorルール

`printedPage` と `pdfPage` はClaimが実際にあるページを指定してください。

`locatorText` は広い見出しだけにせず、少なくとも次を含めてください。

`<セクション> / 呼称 <sizeCode> / 標準タイプ`

例:

`手動（在来・204）マド① / 呼称 11409 / 標準タイプ`

## 6. IDルール

batchIdには生成時刻を含めてください。

例:

`BATCH-GEMINI-LIX-SAMOSL-SHUT-MSTD-20260902T123456Z`

Record IDもbatch namespaceを含め、全batchで一意にしてください。

例:

`SSR-GEMINI-LIX-SAMOSL-SHUT-MSTD-20260902T123456Z-001`

## 7. 出力Schema

返却は**純粋JSONだけ**にしてください。Markdown、コードフェンス、説明文は禁止です。

```json
{
  "transportSchemaVersion": "1.0",
  "transportType": "STANDARD_SIZE_SOURCE_BATCH",
  "batchId": "BATCH-GEMINI-LIX-SAMOSL-SHUT-MSTD-...",
  "generatedAt": "<ISO-8601>",
  "producer": {
    "system": "GEMINI_NOTEBOOKLM",
    "mode": "LIVE_EXTERNAL"
  },
  "productId": "SER-LIX-SAMOSL",
  "sourceContext": {
    "type": "OFFICIAL_PDF",
    "driveFileId": "1YUN-mtWYs48YBUHJk0C3vJXnhjyZFHyf",
    "title": "202604_LIXIL_サーモスＬ_業務用資料集_完成品価格表.pdf",
    "version": "202604"
  },
  "scope": {
    "windowTypeId": "WT-SL-SHUTTER-HIKI",
    "specificationId": "SP-SL-SHUT-M-STD",
    "printedPages": [54,55,56,57,58,59,60,61],
    "pdfPages": [56,57,58,59,60,61,62,63]
  },
  "records": [
    {
      "schemaVersion": "1.0",
      "recordType": "STANDARD_SIZE_SOURCE_RECORD",
      "id": "SSR-GEMINI-LIX-SAMOSL-SHUT-MSTD-<batch timestamp>-001",
      "productId": "SER-LIX-SAMOSL",
      "windowTypeId": "WT-SL-SHUTTER-HIKI",
      "specificationId": "SP-SL-SHUT-M-STD",
      "construction": "在来・204",
      "sizeCode": "11409",
      "availability": "AVAILABLE",
      "strength": "EXPLICIT",
      "attributes": {
        "callW": "114",
        "callH": "09",
        "actualW": 1185,
        "actualH": 970,
        "innerReferenceW": 1145,
        "innerReferenceH": 900,
        "module": "東・入・204",
        "tableMarker": null
      },
      "source": {
        "type": "OFFICIAL_PDF",
        "driveFileId": "1YUN-mtWYs48YBUHJk0C3vJXnhjyZFHyf",
        "title": "202604_LIXIL_サーモスＬ_業務用資料集_完成品価格表.pdf",
        "version": "202604",
        "printedPage": 54,
        "pdfPage": 56,
        "locatorText": "手動（在来・204）マド① / 呼称 11409 / 標準タイプ"
      }
    }
  ],
  "issues": [
    {
      "id": "ISSUE-GEMINI-LIX-SAMOSL-SHUT-MSTD-<batch timestamp>-001",
      "type": "SOURCE_AMBIGUOUS",
      "question": "<推測せず確認が必要な内容>",
      "sourceHint": {
        "printedPage": 54,
        "pdfPage": 56,
        "locatorText": "<該当箇所>"
      }
    }
  ]
}
```

## 8. JSON返却前の自己確認

全Recordについて次を確認してください。

- シャッター付引違い窓である
- 手動である
- 標準タイプである
- 指定8ページ内である
- sizeCodeが実セルに印字されている
- 空欄セルから生成していない
- W×H直積を作っていない
- constructionがページ区分と一致している
- printedPage / pdfPageが正しい
- locatorTextでセル位置を特定できる
- 寸法値を計算・推測していない

件数を合わせるためにRecordを追加・削除してはいけません。
Sourceに明示された設定だけを返してください。
