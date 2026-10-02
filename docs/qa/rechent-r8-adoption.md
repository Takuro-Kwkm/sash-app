# リシェント玄関ドア3 非防火 — R8 downstream integration

NON-PRODUCT-MASTER TASK / 営業見積依頼Scope。PR #61はDraft / Openを維持。Human Flow Reviewは別Gate。Merge、Production Deploy、Production Releaseは未実施。

正式v0.8-R8を採用。Previous integration HEAD: `7584ed0a9e37f12e448e1d17303bd149200cb6b1`。Previous State `BLOCKED_PRODUCT_MASTER_DEFECT` / `RE3NF_FRAME_COLOR_THERMAL_SCOPE`は、正式R8でCLOSED。Product Master QA_READY / QA_PASS / FORMAL / Package / Storage / Registry PASSをcarry-forwardし、481構成の再QAは行わない。

## 正式Artifactのidentity

- Manifest: Drive `1D-mMuj98S5Iq9sHsXOkdJeUa185zlXjs`
- Manifest SHA256: `1da09541a4ddf234314d8f082b792c2fb2cbab90ef5c6d70b32ff39706e145db`
- Evidence Identity: `RE3NF-R8-FRAME-e87c32b30096671d`
- Authoring: `1qAtYHbKxlcE_lXLFUc60YSzgxtYh7r1e` / SHA256 `269572fc7434a54d1aa062adb1dfb7f6c3e2cc374b872e7ad25f9e970a7c9591`
- Canonical folder: `1wNyL_JFz4wMFfV4zRbcahqCbU24K-n_G`
- Formal Package ZIP: `1pWqeUWp_T-RlKHThspgT-vGO_-lq9JOp`
- App Product ID: `SER-LIXIL-RECHENT-D3-NF`

ZIP stream取得は403だったため、正式Manifestと正式Runtime 8ファイルをDrive connectorで直接取得。各file ID / decoded SHA256をManifestと照合して既存Brotli transportへ格納。メーカー商品事実は編集しない。Drive Product Master / Runtime / Canonical Registry mutation = 0。ローカルintegration registryのみ正式参照をR8へ切替。

## 検証Scopeと判定経路

`verify-rechent-r8-adoption.mjs`がManifestと8ファイルのidentity、旧HEADとの差分、他シリーズ・既存Adapter・旧package・data不変を検証。R7実行参照は0。R7 packageは履歴として保持し、過去QA reportとwindow-flowのinventory snapshotも履歴として保持する。新生成reviewとPreview metadataはR8。

Targeted regression: HIGH_INSULATION 8色 / K2・K4・ALUMINUM 15色、一般BG/FK除外、S14 AAのみ、M78 15色とrecommendation、thermal/design/body/model派生変更のclear/keep。Schema・Adapter・Canonical Contractは変更しない。未証明XE/FKは正式R8の隔離Scopeを保持。価格・BOM・発注可否と6件のManual Checkは正式資料からcarry-forward。

現行unit/integration suite 613件、lint、typecheck、build:release、既存Governance、他7シリーズ・浴室・案件管理・見積出力・theme browser suiteを実行する。実ブラウザQAは最終SHA PreviewでDesktop 1440 / Tablet 768 / Mobile 390、27営業構成×3viewport、frame ID・日本語表示・Save/Reload/Handoff、reset、外額縁8候補、Reader、Dark Modeを検証しスクリーンショットを保存する。

APP_INTEGRATION_READYの正式判定は同一HEADのRechent Estimate Integration workflow `integration-ready` jobと`rechent-integration-ready-{SHA}` artifactを参照。qa / preview成功後、実際のR8 identity report、最終SHA Deployment READY、deployed browser 81件PASSとconsole/HTTP error 0を照合してPASSを出す。CIのみでBrowser PASSを代用しない。Human Flow Reviewの実施・承認は含まない。

証拠は各SHAのGitHub Actions artifactとPR本文に記録する。Product Master Blocker=0。Integration Blockerは最終Gate実結果に従い、未実施はPASSにしない。
