# LIXIL インプラス Runtime UI Known Manual Checks

The following formal Runtime manual-check states are carried into app integration as non-PASS states:

- SZ-SL3W: 3枚建（障子W指定）の製作範囲
- ND-01..ND-06: 特殊ガラスND製作範囲
- GL-ORD-004: 障子重量によるアルミレール枠対象寸法
- FK-SA09: 特殊/不明納まり
- FK-R08: 「ふかし枠補助部材」正規item_id未マッピング
- FK-R14/FK-R15/FK-R18/FK-R19: 補強一体ふかし枠の製作範囲

App-side code must not infer these into PASS. Where the relevant selection enters one of these domains, the UI should surface MANUAL_CHECK or fail closed according to the Runtime contract.
