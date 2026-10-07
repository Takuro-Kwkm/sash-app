# ローカル商品変更から本番確認まで

このcheckoutのCurrent入口は `contracts/production/current-architecture.json`。商品変更の実行・Evidence・Resume・正式採用は中央の既存Shared Harness v2に委譲する。ここで追加した設定は、採用済みアプリの起動・QA・既存配信先へのリリースと読み戻しを接続する。

## 開始時に保持するもの

`git status --short --branch`、HEAD、remote、既存Workの状態を記録する。未コミット変更と未追跡ファイルを削除・resetしない。対象外の変更をPRに含めない。完了WorkはINSPECT_ONLY、新規の差分は新しいimmutable binding。

中央 `Takuro-Kwkm/product-ui-contracts` のremote default branchからHEAD、`registries/current-architecture.v2.json`、`registries/skill-authority.v2.json`、Registryが選ぶCanonical Skillと実行依存を取得し、bytes hashを固定する。ローカルSkillのsymlinkや古いsnapshotだけでは取得完了としない。

DriveのGA Current terminal index（`1DnJflUJAIS5UfisxQa-AgTI6BPtZsoeI`）とmetadata、4 Repositoryのfresh Main responseを取得し、中央の `scripts/verify-ga-index.py` で検証する。GA後にMainが進んだ場合は `--checkouts` と `--authority-root` に取得済みcheckoutを渡す。terminal indexを書き換えない。GitHubとDriveは接続済みConnectorで取得できる。ローカルに `gh` があることを前提にしない。

## 商品マスター・Contract・Runtime・UI

中央の `work_skills/architecture-router/scripts/route-intent.py` と `scripts/architecture-work.py` に取得済みRepository→checkout mapと指示を渡す。新規はproduct-master-builder、変更はproduct-change-work、QAはapp-quality-review。実行Engineは中央 `scripts/production-work.py` のまま。

Native接続の確認:

```sh
python3 -B scripts/production/validate-architecture-connection.py
python3 -B scripts/production/validate-product-master-profile.py
```

2026-10-07の確認時点では35商品route中、EWとサーモスLの2routeがCONNECTED、33routeがFAIL_CLOSED。Runtime/UIで選択できる商品と、商品変更WorkのAdapterがREADYであることは別の条件。PENDING商品をfixture、legacy、商品専用UIで迂回しない。

Current Product Registry、Formal package、Source、選択Contract、Runtime integrationと保存されたResumeを照合する。Driveのreadable CSVは原本bytesの代用にしない。特に元資料のN/A等を補完しない。既存Formal/Evidence/採用履歴、価格・BOM・Set CodeのUnknownと確認要求を保持する。商品差は既存のデータ構成で表し、共通EngineとUIへ接続する。

`QA_READY` は正式採用の承認ではない。新しい商品差分ではnative review packetの候補版・Source/Scope・変更Field・未解決条件・入力hash・保存先・下流計画を人に提示し、Shared Harnessが要求するHuman Decisionを得てからFormal保存・Runtime/UI更新へ進む。商品Factを変えないアプリ変更でも、選択フローを変えればそのScopeのHuman Flow Reviewが必要。AIがHuman Decisionを書いて承認したことにしない。

## ローカル起動とQA

Node.js 24を使う。アプリ本体に追加の環境変数は不要。

```sh
npm start
# http://127.0.0.1:4173
npm run lint
npm run typecheck
npm test
npm run verify:app-release
```

PORT/HOSTを指定する場合は既存entrypointの環境変数を使う。ポート使用中なら別PORTを指定し、QA_BASE_URLと検証の `--url` を同じURLへ合わせる。サンドボックスがlistenやブラウザ起動を禁止した場合は、その実行権限を得て再試行する。これは商品QAのFAILとは別の実行制限。

既存Browser QAの依存を用意する場合:

```sh
npm install --no-save --ignore-scripts playwright@1.55.0
npx playwright install chromium
npm run test:browser:release
```

このセットは実ブラウザで1280/768/390pxの案件→商品選択→保存→再読込→見積出力とRuntime回帰を実行する。追加の変更Scopeに応じてnative商品QAを選ぶ。影響のない商品Evidenceは有効性を照合してCarry-Forwardする。生成されたJSONとスクリーンショットは `artifacts/`。Browserテストの `print` フラグだけでPrint PASSを発行しない。Print変更は実Print Preview、または保存したPDFの視覚確認が必要。

案件保存の現行保証はBROWSER_LOCAL_STORAGE。クラウドDB・多端末共有のE2Eは主張しない。

## PR・CI・マージ・既存本番配信

ターゲットの正本設定は `contracts/production/app-release.v1.json`。

- Repository: `Takuro-Kwkm/sash-app`、本番branch: `main`
- Vercel: `sash-app-wave3-preview` / `prj_4z0zqW6yKyPuFINODfGX8LPBuJRP`
- Team: `team_AkuHacuJlCl8LuvaFpCzFmbv`
- 本番URL: `https://sash-app-wave3-preview.vercel.app`
- 実行: 既存 `.github/workflows/app-production-hotfix.yml` → `scripts/vercel-rest-deploy.mjs`

ローカルの `.vercel/project.json` は不要。既存REST実行はこの固定targetと照合する。既存GitHub Actionsのproduction環境とVercel credentialを利用し、新しいVercel project・DBを作らない。認証値は出力・成果物・Repoへ保存しない。GitHub Connectorの権限とActionsのcredentialは別の接続。

1. `codex/` branchで差分だけをcommitしてPRを作る。PRのexact HEADで既存CIと `app-release-validation` が成功し、変更Scopeに必要なHuman Reviewを満たすことを確認する。
2. live Current Authorityを再取得し、採用済みimplementationとの互換性を照合する。HEADが動いた場合はその差分の再検証・承認条件を確認する。
3. 承認済みPRをexpected head指定でmergeする。本番同期を依頼された採用済みアプリの変更では、既存 `.release/app-production-hotfix-v1` をそのリリースScopeに更新し、mainへのmerge pushを既存配信契機にする。このmarkerは商品Formal採用を許可しない。
4. またはActionsの「Adopted App Production Release」をmainで手動実行し、レビュー済みmain SHAを `expected_sha`、実在の依頼・承認参照を `approval_reference` に指定する。参照文字列はHuman Decisionを検証する代用品ではなく、native承認とproduction環境のreview条件を別に満たす。SHAがmainと異なる場合は停止する。
5. 配信jobはテスト・ローカルBrowser QA・target照合後、実checkout SHAのfiles sourceで配信する。既存の429時Git source fallbackもexact SHAの検証を維持する。credential不足やenvironment reviewer待ちは、対象jobと不足条件をユーザーに具体的に提示する。
6. READY、production target、release commit、canonical aliasを確認し、本番の `/api/health`、全Runtime identity、UIファイルhashと実Browser QAを検証する。Deployment READYだけで完了としない。

本番読み戻しをローカルで再実行する場合は、検証対象のmerge commitをcheckoutした状態で:

```sh
npm run verify:app-release -- --url https://sash-app-wave3-preview.vercel.app --require-release-commit
QA_BASE_URL=https://sash-app-wave3-preview.vercel.app npm run test:browser:release
```

HTTP 401/403やVercel loginへ遷移した場合はProtectionによる取得失敗として扱う。既存の認証済みBrowserまたはVercel Connectorの一時アクセス機能を利用する。Protectionを無効化してPASSへ進めない。環境変数・Browser認証state・secretを証跡へ含めない。

## 人の判断を提示する対象

商品差分ならnativeの固定review packet、UIフロー差分なら操作できる画面と該当スクリーンショット、リリースならPR HEAD・配信するmain SHA・前回本番からのRuntime差分・既存本番URLを提示する。承認対象のhashやHEADが変われば旧承認を新候補へ流用しない。今回の環境整備では商品Fact/Contract/選択フローを変更せず、既に採用されたmainのRuntimeを配信する。新しい商品Formal/Human Decisionは発行しない。

復旧時は既存のimmutable Work/CI artifactとprevious deploymentをまず確認する。商品Work再開は保存bindingとfresh Current観測を中央Engineへ渡す。本番不具合は影響Scopeと戻すdeploymentを具体化し、既存Vercel rollback手順に従う。ローカル変更・Formal履歴をresetして復旧しない。
