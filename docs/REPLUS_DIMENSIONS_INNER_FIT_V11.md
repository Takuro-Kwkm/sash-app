# リプラス寸法併記・内はめ仕様 V11

先行完了V10（3a07439209065a4d1303d9302d3492e8fbf0f281）はINSPECT_ONLYとして保持。新しい候補bindingで、営業画面の寸法と内はめ仕様を接続した。

## 表示・依存関係

居室・TW・EW・浴室仕様では、最後の製品寸法で「採寸寸法から入力」「仕上がり寸法から入力」を選び、WS/HSとWD/HDを常に併記する。指定した側だけ編集・必須入力とし、反対側は確認表示にする。仕上がり値を既存のCommonRuleEngineへ渡し、寸法範囲と内部マド/テラス区分、障子等の条件を再評価する。入力を消すと換算値も消え、提出された換算値は入力側から再計算される。旧保存の仕上がり入力はその意味を保持する。

アタッチ枠2構成は、既存の採寸入力・公式変換にアタッチ枠出来寸WD/HDの確認表示を追加した。新設サッシ本体寸法とは区別する。汎用カットモールには根拠のない−10mm換算や内はめ仕様を追加していない。

ガラス直後の「内はめ仕様」で、標準用／内はめ用（既設内付・半外付）／内はめ用（既設外付）を選ぶ。直接4仕様の内はめでは既設上枠ベース材を必須部材として確認表示し、任意OPからの誤解除を防ぐ。アタッチ枠2構成は公式03A/03Bの標準用／既設単体内はめ用に連動する。旧「内嵌め用」は既設取付方式が不明のため、移行時に推測せず再選択を求める。

施工可否、内はめ網掛けの製作境界、部材数量・価格・BOM・発注コードは従来どおり個別確認。カバー色連動とV10で除外した7項目の非表示を維持する。メーカーの既存寸法境界・RuleSet・Dependency・原本テーブルを継承した。

## 公式Evidence

既存採用資料SN1200（2025-08）の実bytes hashを固定して図表を視覚確認した。PDF252/印刷248は居室・TW・浴室のWD=WS−10、HD=HS−10と標準/内はめ共通を明記。EWはPDF254/印刷250に同じ式。施工仕様はPDF231/233/247/249/251、アタッチ換算はPDF255/256、部材対応はPDF266/268。レビュー記録は flow/official-dimensions-inner-fit.v11.json。

公式WebのMAN-190G（2025-11、assets.lixil.com）でも内はめ時の既設上枠ベース材を照合した。資料の現行採用やFormal昇格を新たに行ったものではない。

中央remote mainを再取得し、f7759305a53ed206280a395c0fce166476f2327fのCurrent Architecture/Skill AuthorityとCanonical Skillsを確認。Current routerはNATIVE_ADAPTER_UNAVAILABLEを返す。candidateのローカル接続と正式native Workは区別し、Formal/Releaseは未実施。

## 共通実装

商品差はNUMERIC_INPUT_PAIRS、既存SELECTION_LINKS、SpecificationDefinition、Selector、Evidenceと表示契約に記述する。商品名によるUI/Resolver分岐は追加していない。共通Product Module adapterで入力基準を解決してから既存の分類・寸法Engineへ渡す。Generic UIは数値の確認表示を追加。空の数値入力が0扱いにならないようにし、合成結果では寸法BLOCKをINVALIDとして保持する。凍結したwork-managementの2ファイルは同じhash。

7冊の候補XLSXは01_入力フロー、14_UI選択契約、90_Evidenceを更新。その他のZIP memberとstyles.xmlは一致し、Artifact Toolで再読み込み・表示確認し、3表の全値をJSONと照合した。

## QA・保存

- lint/typecheck PASS、全692テスト、対象57テスト、失敗0。
- 1280/768/390pxの候補25ケースと寸法・内はめ3ケース PASS。7構成×3幅の保存・再表示、色連動、枠変更Clear、末尾寸法、横溢れなしを確認。
- 既存8商品×3幅の通常保存・再表示24ケース PASS。
- 共通出力7行で対象4仕様の採寸・仕上がり・内はめ・必須部材を確認。PDF2ページの内部ページ画像を含め視覚確認し、XLSXを生成。価格未確定のINCOMPLETEを保持。
- 実画面でもキー入力で1010×1810→1000×1800を確認。runtime-labの例であり、案件保存ではない。
- PersistenceはBROWSER_LOCAL_STORAGE。Live DB/複数端末は未実行。

ユーザーが新ファイル・非公開91_Savepointへの保存を明示承認した候補索引：1I2bA_jd4KeVR3IFDGB99JIH9rDn33yg7。260849bytes、SHA256 f26877ed855e0757b9bb70b0a957d4b4f125cc9fc16360eae307422f5afe3de7、実bytes読み戻しMATCH。V10の保存単位は上書きしていない。

中断で停止したレビューサーバーは、この保存済み索引に固定して再起動した。中断された保存再表示検証だけを実行し直し、完了済みテストの結果を保持した。レビューURLは http://127.0.0.1:4197/runtime-lab?product=CANDIDATE%3ARPL_ROOM 。
