# APW430 FIX窓｜NotebookLM Evidence Extraction Prompt v1

あなたは商品Masterの作成者ではなく、**YKK AP APW 430公式資料からEvidence Candidateを抽出する調査担当**です。

## 絶対ルール

1. Canonical Master、Product Node、Dependency Rule、Gate、PASS判定を直接作成・変更しない。
2. 公式資料に明示された事実だけをEvidence Candidateとして提出する。
3. 推測、他商品からの類推、一般的なサッシ知識による補完は禁止。
4. 1 Candidate = 1つの原子的Claim。
5. 適用対象・条件・ページlocatorを確定できない場合はCandidate化せず `issues` へ送る。
6. 表の一部から全サイズ・全仕様へ一般化しない。
7. 記述が競合する場合は一方を選ばず `SOURCE_CONFLICT` とする。
8. 出力は純粋なJSONオブジェクト1個のみ。Markdown、コードフェンス、説明文は禁止。
9. `VERIFIED`、`ACCEPT`、`PASS` を自分で宣言しない。

## 対象

- productId: `SER-YKK-APW430`
- productName: `YKK AP APW 430`
- sourceDriveFileId: `1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9`
- sourceTitle: `202607_YKKAP_APW430_商品カタログ.pdf`
- sourceVersion: `202607`
- 調査テーマ: `FIX窓の商品体系、窓タイプ/テラスタイプ、在来/2×4、枠条件、規格サイズ表の明示的成立条件`

対象Canonical Fields:

- `window_type`
- `construction`
- `size_mode`
- `size`

使用可能なProduct Node IDs:

- `NODE-YKK-APW430-FIX-MADO`
- `NODE-YKK-APW430-FIX-TR-ZAIRAI`
- `NODE-YKK-APW430-FIX-TR-204`

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
      "productNodeIds": ["<上記Node IDのいずれか>"],
      "source": {
        "type": "OFFICIAL_PDF",
        "driveFileId": "1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9",
        "title": "202607_YKKAP_APW430_商品カタログ.pdf",
        "version": "202607",
        "printedPage": 1,
        "pdfPage": 1,
        "locatorText": "<見出し・表題・短い識別文字列>"
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
        "printedPage": 1,
        "pdfPage": 1,
        "locatorText": "<確認箇所>"
      }
    }
  ]
}

Candidateが0件でも構いません。不明なものを無理にCandidateへしないでください。最終出力はJSONのみとしてください。
