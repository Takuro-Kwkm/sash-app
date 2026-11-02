# サッシ商品の画像表示設定

新しく接続するサッシ商品の選択は通常のプルダウン／チェックボックスを維持する。
画像は通常画面へ並べず、各項目の「画像で確認」ボタンから選択用モーダルを開く。
画像モーダルの開閉だけでは選択値を変更しない。画像の選択は通常項目と同じ変更経路へ渡し、選択値・依存条件・確認事項・保存Snapshotを更新する。複数選択は画像ごとに追加・解除でき、更新後もモーダルで確認を続けられる。派生値の表示は読取専用を維持する。

新しいcandidateの既定値は `contracts/ui-common/choice-images.v1.mjs` の
`NEW_SASH_CHOICE_IMAGES = MODAL_ON_DEMAND`。candidate indexの各productに
`"imagePresentation": "MODAL_ON_DEMAND"` を明記して固定する。
省略時もcandidate登録入口がこの既定値を適用する。新規のrow-table UI接続とcomposed UI接続の両方へ渡す。
設定はRuntimeの `presentation.choiceImages.mode` へ伝え、共通Editorが解釈する。
採用用のintegrationを作るときも、この表示設定を同じ固定入力から引き継ぐ。
商品マスターのメーカー仕様や採用済み商品の設定を変更する設定ではない。

旧来のinline表示を明示的に確認する場合のみ `INLINE` を指定できる。
通常の新商品では `MODAL_ON_DEMAND` を使用し、実Browserで通常画像0件・モーダル内の画像読み込み・閉じる/Escape・フォーカス復帰・選択保持と画像内での単一・複数選択、依存値の保持/解除、保存・復元を検証する。
元資料・画像bytes・source refsと必要選択肢を保持し、既存画像不足チェックでは実モーダル内の表示を照合する。
