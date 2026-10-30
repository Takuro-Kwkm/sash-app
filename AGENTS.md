# sash-app — Repository Instructions

共通工程の正本は中央 `Takuro-Kwkm/product-ui-contracts` のremote default branchにある
[`docs/architecture-v2/COMMON_HARNESS_INSTRUCTIONS.md`](https://github.com/Takuro-Kwkm/product-ui-contracts/blob/main/docs/architecture-v2/COMMON_HARNESS_INSTRUCTIONS.md)。開始時に取得して読む。
新規作業ではCurrentを取得し、同じ未完了Workは保存済みbindingで再開する。進行中・完了済み成果は書き換えない。

## このアプリ固有の責務

`README.md` と `docs/RECOVERY_BASELINE.md` の既存設計ルールを維持する。商品名によるif / switch / case、商品専用Form / Output / Mapper / AllowedValue Resolverを追加しない。商品差はProductMaster / SpecificationDefinition / RuleSet / Evidence / Selector / Dependencyのデータで表し、CommonRuleEngineとOutput Engineの共通性を保つ。Evidenceなしメーカー仕様を確定せず、内部Enumをユーザーへ露出しない。変更Scopeに応じてpackage.jsonのlint / typecheck / testと必要なBrowser QAを使う。

共通の作成・変更・再接続経路は `contracts/production/common-development.v1.json`。
この接続は隔離検証用候補であり、既存Workの実装・採用pinを変更しない。
共通基盤の反映時は進行中の商品作業の書込み先を確認する。
