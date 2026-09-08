const at=(r,sheet,fields)=>({...fields,_sourceSheet:sheet,_sourceRow:r.row??null});
export function normalizeFeatureTables(raw){
  const screens=(raw.screens??[]).map(r=>at(r,'09_網戸',{screen_id:r.id,'窓種ID':r.windowTypeId,'固有仕様ID':r.specId,'網戸有無':r.presence,'網戸形式':r.form,'メーカー正式名称':r.officialName,'基本ネット':r.basicNet,'表示順':r.order}));
  const nets=(raw.nets??[]).map(r=>at(r,'09B_網戸ネット',{net_rule_id:r.id,'対象網戸形式':r.form,'ネット種類':r.type,'設定区分':r.setting,'選択条件':r.condition,'メッシュ':r.mesh,'材質':r.material,'カラー':r.color,'表示順':r.order,'出典':r.source}));
  const options=(raw.options??[]).map(r=>at(r,'10_その他OP',{option_id:r.id,'対象窓種/形式':r.target,'固有仕様ID':r.specTarget,'カテゴリ':r.category,'表示名':r.label,'適用条件':r.condition,'UI分類':r.uiClass,'表示条件':r.displayCondition,'表示順':r.order,'出典':r.source}));
  const optionRules=(raw.optionRules??[]).map(r=>at(r,'10A_有償品適用ルール',{rule_id:r.id,'対象ID':r.targetId,'条件項目':r.conditionField,'条件':r.condition,action:r.action,'結果':r.result,'出典':r.source,'備考':r.note,'優先順':r.priority}));
  const goldenTests=(raw.golden??[]).map(r=>at(r,'11_見積入力テスト',{test_id:r.id,'確認項目':r.item,'期待結果':r.expected,'判定':r.result,'備考':r.note}));
  const screenLimits=(raw.screenLimits??[]).map(r=>at(r,'09C_網戸サイズ制御',{...r}));
  const appControl=(raw.appControl??[]).map(r=>at(r,'14_APP_候補制御',{...r}));
  return{screens,nets,options,optionRules,goldenTests,screenLimits,appControl};
}
