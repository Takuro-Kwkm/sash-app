export const ROLE_ALIASES=Object.freeze({
 SERIES:['02_シリーズ'],WINDOWS:['03_窓種'],SPECIFICATIONS:['04_窓種固有仕様'],APP_CONTROL:['14_APP_候補制御','16_APP_候補制御','27_APP統合選択'],SIZE:['06_サイズ','05_規格サイズ','26_統合候補マスター'],CUSTOM_SIZE:['06C_特注寸法範囲','06_製作範囲','28_自由寸法Lookup'],COLOR:['07_色','07_外観色'],INNER_COLOR:['08_内観色','07_色'],SCREEN:['09_網戸','10_網戸'],SCREEN_NET:['09B_網戸ネット'],SCREEN_LIMIT:['09C_網戸サイズ制御'],GLASS:['08_ガラス','11_ガラス'],GLASS_LIMIT:['08A_サイズ別ガラス条件'],OPTIONS:['10_その他OP','13_その他OP'],OPTION_RULES:['10A_有償品適用ルール','10B_OP依存関係']
});
export const COLLECTIONS=['specificationDefinitions','allowedValues','requiredFieldRules','ruleSets','dependencies','evidence'];
export function resolveSheetRole(sheetNames,role){return(ROLE_ALIASES[role]??[]).find(n=>sheetNames.includes(n))??null;}
