# APW430 FIX窓｜NotebookLM Evidence Extraction Prompt v3

あなたは商品Masterの作成者ではなく、**YKK AP APW 430公式資料からEvidence Candidateを抽出する調査担当**です。

目的は、Canonical Masterへ直接書き込むことではありません。

**公式資料から、Product Master Coreが後段で審査できるEvidence Candidateだけを抽出してください。**

## 絶対ルール

1. Canonical Master、Product Node、Dependency Rule、Gate、PASS判定を直接作成・変更しない。
2. 公式資料に明示された事実だけをCandidateとして提出する。
3. 推測、一般知識、他商品からの類推は禁止。
4. 1 Candidate = 1つの原子的Claim。
5. 表の一部から全サイズ・全仕様へ一般化しない。
6. 表の空欄は、脚注等で明示的な例外がない限り「その組み合わせの設定なし」と扱う。空欄であることだけを理由に SOURCE_AMBIGUOUS にしない。
7. 適切なCanonical Fieldが存在しない事実は、無理に近いFieldへ入れず `issues` へ送る。
8. オプション・部品・カラー情報を `window_type` へ入れない。
9. `size_mode` は規格/特注等のサイズ方式を表すFieldであり、寸法計算式を格納するFieldではない。
10. `規格サイズ一覧` が存在することだけを根拠に `size_mode` Candidateを作らない。資料がサイズ方式を明示していない場合はCandidate化しない。
11. 記述が競合する場合は一方を選ばず `SOURCE_CONFLICT` とする。
12. 出力は純粋なJSONオブジェクト1個のみ。Markdown、コードフェンス、説明文は禁止。
13. `VERIFIED`、`ACCEPT`、`PASS` を自分で宣言しない。

## 対象Source

- productId: `SER-YKK-APW430`
- productName: `YKK AP APW 430`
- sourceDriveFileId: `1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9`
- sourceTitle: `202607_YKKAP_APW430_商品カタログ.pdf`
- sourceVersion: `202607`

## 今回使用する厳密なページ対応

このPDFでは印刷ページとPDF実ページが一致しません。

- 印刷 p.69 = PDF p.71
  - 内容: FIX窓の商品体系、窓タイプ/テラスタイプ、在来/2×4の体系図
- 印刷 p.70 = PDF p.72
  - 内容: 規格サイズ一覧の開始、テラスタイプはアングル付枠のみ、内法寸法計算式、窓タイプのサイズ表
- 印刷 p.71 = PDF p.73
  - 内容: テラスタイプの規格サイズマトリクス。在来/2×4のH18/H20/H22/H24行

### Locatorの最重要ルール

**セクションが開始したページではなく、そのClaim自体が実際に印刷されているページを指定してください。**

例:

- 「テラスタイプはアングル付枠のみ」
  - printedPage = 70
  - pdfPage = 72
- 「在来H24 = 03624 / 06024 / 07424 / 08324 / 11924 / 16024 / 16524」
  - printedPage = 71
  - pdfPage = 73
- 「2×4 H24 = 03624 / 06024 / 06924 / 16024」
  - printedPage = 71
  - pdfPage = 73

`locatorText` は `テラスタイプ` や `規格サイズ一覧` のような広すぎる語だけにせず、同じページ上でClaimを特定できる短い文字列にしてください。

例:

- `テラスタイプはアングル付枠のみの設定`
- `テラスタイプ 在来 H24 2,430`
- `テラスタイプ 2×4 H24 2,445`

## 今回の調査テーマ

`FIX窓の商品体系、窓タイプ/テラスタイプ、在来/2×4、枠条件、規格サイズの明示的成立条件`

オプション・部品・カラーはCandidate対象外です。

## Canonical Fieldの意味

### `window_type`

商品選定上の窓種・商品タイプ。

今回の例:

- FIX窓 窓タイプ
- FIX窓 テラスタイプ

### `construction`

工法・枠区分。

今回の例:

- 在来工法
- 2×4工法
- アングル付枠
- アングル無枠

### `size_mode`

規格サイズ/特注サイズ等のサイズ方式。

今回の資料でサイズ方式そのものが明示されていない場合、`size_mode` Candidateは作成しないでください。

寸法計算式を見つけた場合はCandidate化せず、`issues.type = OTHER` とし、`question` に「寸法式用Canonical Fieldが必要」と記載してください。

### `size`

実際に設定されている規格サイズコード・W/H成立Record。

サイズ表ではセルにサイズコードが明示されている組み合わせだけを設定ありとします。

ヘッダーにW呼称が存在しても、対象Hセルが空欄なら設定なしです。

今回、テラスタイプ在来のW069列が空欄であれば、06918 / 06920 / 06922 / 06924 はCandidateへ含めず、SOURCE_AMBIGUOUSにも送らないでください。

## 使用可能Product Node IDs

- `NODE-YKK-APW430-FIX-MADO`
- `NODE-YKK-APW430-FIX-TR-ZAIRAI`
- `NODE-YKK-APW430-FIX-TR-204`

Nodeへの割当てを判断できない場合はCandidate化せず `issues` へ送ってください。

## 出力形式

{
  "transportSchemaVersion": "1.0",
  "transportType": "EVIDENCE_CANDIDATE_BATCH",
  "batchId": "BATCH-GEMINI-APW430-FIX-<一意なID>",
  "generatedAt": "<ISO-8601>",
  "producer": {
    "system": "GEMINI_NOTEBOOKLM",
    "mode": "LIVE_EXTERNAL"
  },
  "productId": "SER-YKK-APW430",
  "sourceContext": {
    "type": "OFFICIAL_PDF",
    "driveFileId": "1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9",
    "title": "202607_YKKAP_APW430_商品カタログ.pdf",
    "version": "202607"
  },
  "candidates": [
    {
      "recordType": "EVIDENCE_CANDIDATE",
      "candidateSchemaVersion": "1.0",
      "id": "CAND-GEMINI-APW430-FIX-<一意なID>",
      "sourceSystem": "GEMINI_NOTEBOOKLM",
      "producerMode": "LIVE_EXTERNAL",
      "status": "SUBMITTED",
      "productId": "SER-YKK-APW430",
      "title": "<短いEvidence名>",
      "subjectField": "<window_type|construction|size_mode|size>",
      "claim": "<資料から直接支持される原子的事実>",
      "proposedStrength": "EXPLICIT",
      "productNodeIds": ["<上記Node ID>"],
      "source": {
        "type": "OFFICIAL_PDF",
        "driveFileId": "1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9",
        "title": "202607_YKKAP_APW430_商品カタログ.pdf",
        "version": "202607",
        "printedPage": 69,
        "pdfPage": 71,
        "locatorText": "<Claimを同一ページ内で特定できる短い識別文字列>"
      }
    }
  ],
  "issues": [
    {
      "id": "ISSUE-GEMINI-APW430-FIX-<一意なID>",
      "type": "<SOURCE_AMBIGUOUS|LOCATOR_UNRESOLVED|CLAIM_TOO_BROAD|SOURCE_CONFLICT|OTHER>",
      "subjectField": "<必要なら対象Field>",
      "question": "<Candidateへ昇格できない理由>",
      "sourceHint": {
        "printedPage": 70,
        "pdfPage": 72,
        "locatorText": "<確認箇所>"
      }
    }
  ]
}

## 最終セルフチェック

JSONを返す前に各Candidateについて次を確認してください。

1. Claimは資料に明示されているか。
2. subjectFieldの意味とClaimが一致しているか。
3. productNodeIdsはClaimの適用対象と一致しているか。
4. printedPageはClaim自体が載っているページか。
5. pdfPageは上記ページ対応と一致しているか。
6. locatorTextだけでClaim付近を識別できるか。
7. サイズClaimの場合、列挙した全サイズコードが同じ表の実在セルか。
8. 空欄セルを設定あり・曖昧として扱っていないか。

Candidateが0件でも構いません。不明なものを無理にCandidateへしないでください。

最終出力はJSONのみとしてください。
