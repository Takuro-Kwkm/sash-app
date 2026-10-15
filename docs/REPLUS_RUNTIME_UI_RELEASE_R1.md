# リプラス v1.2-R1 Runtime/UI の正式接続と公開

商品マスターの採用済みv1.2-R1とその完了WorkをINSPECT_ONLYで保持する。Runtime/UIと公開は新しいWorkであり、Product Masterの再採用や再編集を行わない。

7仕様は共通のFORMAL_COMPOSED_RUNTIME_INDEX_V1から読み込み、既存COMPOSED_PRODUCT_MODULE_V1、Common Rule Engine、宣言型Window Flow、共通Form/Outputを使用する。商品名による分岐を追加しない。商品入口は「リプラス住宅用」1件、続いて7仕様を選ぶ。ガラス種類→ガラス種→Low-E詳細→追加機能、内はめ、室内外の仕上げ、最後の採寸／仕上がり寸法を保持する。両カバーの色と内はめ必要部材の内部処理も保持する。

元候補の7冊・JSON・Moduleを保護し、正式RuntimeではIDと採用状態のみを別Projectionに記録する。選択肢、依存、寸法、参照範囲、要確認、価格/BOM/Set Code NULLはそのまま。通常のRuntime読込は登録された索引・Module・Flow原本のSHAとパスを照合し、キャッシュ済みの場合も改変を拒否する。旧商品9件の36実行ケースを固定し、汎用metadata読込の追加による既存挙動の変化を検出する。

新しいRuntimeの7ファイルと索引はGoogle Drive「90_作業中」へ保存し、全bytesを読み戻して照合する。正式Runtime採用・台帳切替と公開は、Preview・CI・Browser/Output QAと固定Human Reviewを満たした後に行う。

公開先は既存 `sash-app-wave3-preview`、project `prj_4z0zqW6yKyPuFINODfGX8LPBuJRP`、team `team_AkuHacuJlCl8LuvaFpCzFmbv`、canonical URL `https://sash-app-wave3-preview.vercel.app`。Shared Release Engineは採用済みの固定実装a37a7b79160c1cf727a1e4d998da3bb723c3cd08を使い、live Currentは別途取得する。中央の登録ホストは同じ固定Product/Scopeだけを許可する。既存の段階配信・固定Deployment ID昇格・公開後QA・保存読み戻しを使用し、Release Engine/DAGを作り直さない。

新しいnative-change-scopeはa50dc9f732e6cb3da44c36a5317bf22b3293b527を基準に限定差分を保護する。以前のFormal接続、旧完了publication Work、既存のAuthority採用・Human判断は変更しない。案件保存の保証範囲はBROWSER_LOCAL_STORAGE。実機・多端末共有・自動発注を保証しない。
