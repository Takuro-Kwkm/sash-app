// Application recommendation policy. Manufacturer facts stay in Formal Runtime.
export const guidedSelectionContract = Object.freeze({
  version: '1.0.0', status: 'PR_CANDIDATE', maxCandidates: 3, questionsPerPage: 1,
  priorities: [
    { value: 'price', label: '価格を重視' },
    { value: 'balance', label: '価格と断熱性能のバランス' },
    { value: 'thermal', label: '断熱性能を重視' },
    { value: 'undecided', label: 'まだ決まっていない' },
  ],
  purposes: [
    { value: 'new_exterior', label: '新築の外窓を選びたい' },
    { value: 'other', label: 'リフォーム・内窓・その他' },
  ],
  products: {
    'SER-LIX-SAMOSL': {
      runtime: { packageVersion: 'v0.7-R3', sourceHash: '0fed18a4d317fa03cb0ef0463a0c17eb9f83e1bb84baa6628a6bdce73de62257' },
      purposes: ['new_exterior'],
      fields: { opening: 'window_type', sizeMode: 'size_mode', standardMode: 'STANDARD', size: 'size' },
      evidence: { kind: 'FORMAL_RUNTIME', label: '正式商品マスター v0.7-R3',
        url: 'https://drive.google.com/file/d/18OV2YEEaYCFBAlB6ZR-1uCulEuxYSfNu/view',
        source: 'SN1400 / SDC0003156 / SDC0003157（正式マスターに記録された根拠）' },
      recommendation: { id: 'GUIDED-NEW-EXTERIOR-001', origin: 'INTERNAL_RECOMMENDATION', version: '1.0',
        updatedAt: '2026-10-08', status: 'PR_CANDIDATE',
        reason: '希望した開閉形式が、正式商品マスターの選択肢に含まれます。',
        customerPoints: ['開閉形式と実寸を先に確認し、その後に色・ガラスを決めます。',
          '金額と断熱性能の比較は確認資料がそろってからご案内します。',
          '製作寸法が一致しても、現場の納まりは別途確認が必要です。'],
        learn: '呼称はサイズの識別名です。適合確認には正式マスターの実寸W・Hを使います。',
      },
      comparisons: { price: { status: 'UNKNOWN', label: '価格未確認' },
        thermal: { status: 'UNKNOWN', label: '比較用の断熱性能未確認' },
        installation: { status: 'MANUAL_CHECK', label: '納まりは現地確認が必要' } },
    },
  },
  learning: {
    OPENING: '開閉形式によって選べる仕様が変わります。使い方を顧客と確認しましょう。',
    SIZE: '呼称だけで決めず、表示された実寸W・Hと計画寸法を照合しましょう。',
    FINISH: '外観色と内観色は別の項目です。選べる組み合わせを確認しましょう。',
    GLAZING: 'ガラス仕様は組み合わせで決まります。候補の表示だけで性能順位を断定しないようにしましょう。',
    OPTION: '「要確認」の仕様は自動確定せず、メーカーへの確認事項として残しましょう。',
  },
  unresolved: ['価格比較', '断熱性能の数値比較', '現地の納まり', '特注寸法の候補検索', '他シリーズとの比較'],
});
