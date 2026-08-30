# サッシ情報管理アプリ V2

このRepositoryは、2026-08-26時点で検証済みだった「サッシ情報管理アプリ V2」を、保存済みGate Report・Runtime監査・商品マスターから復元し、今後の正本として継続管理するためのRepositoryです。

## Status

- Specification baseline: 統合仕様書 Version 4.3
- Recovery status: `RECOVERING_FROM_VERIFIED_ARTIFACTS`
- Preserved verified runtime identity: `MOA-CF-R1-36f26118dd05`
- Preserved verified catalog: `V4.3 Phase1+Phase3+Phase4+Phase5`
- Preserved test evidence: `202 PASS / 0 FAIL`

> 注意: 旧Runtimeの実ソースファイル自体はChatGPT File Library / Google Driveに保存されていなかったため、このRepositoryは監査資料から復元する。旧Build IDを新実装のBuild IDとして偽装しない。

## Preserved architecture

- Frontend: `src/ui/web/` — Vanilla JavaScript + HTML + CSS
- Backend/API: Node.js `node:http` single process
- Database: Node.js `node:sqlite`
- Runtime DB: `data/runtime/sash-v2.sqlite`
- Entrypoint: `scripts/start-step8-ui.mjs`
- Backend: `src/ui/server.ts`
- Same-origin API: `/api`
- Composition Root: `scripts/start-step8-ui.mjs`

## Non-negotiable design rules

1. 商品名による `if / switch / case` を追加しない。
2. 商品専用Form / Output / Repository / Mapper / AllowedValue Resolverを作らない。
3. 商品差は `ProductMaster / SpecificationDefinition / AllowedValue / EstimateRequiredFieldRule / RuleSet / Evidence / Selector / Dependency` のデータで表現する。
4. Evidenceなしメーカー仕様を確定しない。
5. 内部Enumをユーザーへ露出させない。
6. Required Fieldを商品名分岐で決定しない。
7. CommonRuleEngine / Output Engineの共通性を維持する。

## Current recovery target

最初のReference Productは **LIXIL サーモスⅡ-H** とする。

同一Catalog Adapterを変更せず、次を順番に接続できることを最初のGateとする。

- LIXIL サーモスⅡ-H
- LIXIL サーモスL
- YKK AP APW 430
- YKK AP APW 431

その後、TW / TW防火戸 / EW / EW防火戸 / APW330 / APW331 等を同じ経路へ追加する。

## Recovery policy

旧Runtimeで確認済みだった挙動・契約は `docs/RECOVERY_BASELINE.md` に保存する。復元コードは新しいBuild IDを生成し、旧Buildと区別する。
