# サッシ固有の起動・検証

作成・変更・再接続・人間確認・公開・保存は中央の[共通開発工程](https://github.com/Takuro-Kwkm/product-ui-contracts/blob/main/docs/architecture-v2/COMMON_HARNESS_INSTRUCTIONS.md)を使用する。本書にはアプリ固有の接続だけを記載する。

## 正本の参照

| 用途 | 参照 |
| --- | --- |
| 商品経路・native Validator | [Current接続](../contracts/production/current-architecture.json)、[Validator索引](../contracts/production/validator-registry.v2.json) |
| マスターからUIへの共通接続 | [common-development.v1.json](../contracts/production/common-development.v1.json) |
| 新しい公開Workの設定・実装pin | [common-local-release.v1.json](../contracts/production/common-local-release.v1.json) |
| 公開先・保存先・元のQAと確認 | 選択したnative profileと、そのWorkの固定binding |
| アプリidentityの読戻し | [app-release.v1.json](../contracts/production/app-release.v1.json)、`npm run verify:app-release` |

公開設定の選択・実行は中央の[Release interface](https://github.com/Takuro-Kwkm/product-ui-contracts/blob/main/docs/architecture-v2/release-lifecycle.md#新しい商品公開のローカル検証)を使う。保存済みWorkは元の固定profile・実装を使う。

app-releaseの旧workflow記録は新規Workの実行指示にしない。

## ローカル起動とQA

Node.js 24とルートlockfileを使う。アプリ起動に追加の環境変数は不要。

```sh
npm ci
npm start
# http://127.0.0.1:4173
npm run lint
npm run typecheck
npm test
npm run verify:app-release
```

別PORTを使う場合は既存entrypointのHOST/PORTとQA_BASE_URL、検証の`--url`を同じ対象に合わせる。Browser QAは選択したnative profileの依存と検査範囲を使う。`npm run test:browser:release` は1280/768/390幅で案件→商品選択→保存→再読込→見積出力とRuntime回帰を確認し、成果は`artifacts/`へ出力する。

本番identityを読み戻すときは対象のmerge commitで次を実行する。公開全工程の判定は共通Releaseに委譲する。

```sh
npm run verify:app-release -- --url PRODUCTION_URL --require-release-commit
```

案件保存の保証範囲はBROWSER_LOCAL_STORAGE。Print変更は実Print Previewまたは保存PDFを視覚確認する。HTTP 401/403は取得失敗として扱い、既存認証とProtectionを保持する。

旧手順・当時の接続件数・配信経路はGit履歴に保持する。
