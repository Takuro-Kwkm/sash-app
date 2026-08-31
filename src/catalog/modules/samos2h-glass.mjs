import { source, master, ev, value } from './samos2h-base-core.mjs';
const base=source.glass.filter(r=>r['ガラス大分類']!=='追加機能');
export const glassBase=[value('glass_base','LOWE','Low-E複層ガラス',1,{evidenceIds:ev('EV-S2H-006')}),value('glass_base','PAIR','一般複層ガラス',2,{evidenceIds:ev('EV-S2H-006')})];
export const glassDetails=base.map((r,i)=>value('glass_detail',r.glass_id,r['ガラス大分類']==='Low-E複層ガラス'?`${r['Low-E区分']}｜${r['見え方']}`:r['ガラス大分類'],i+1,{selector:{glass_base:r['ガラス大分類']==='Low-E複層ガラス'?'LOWE':'PAIR'},evidenceIds:ev('EV-S2H-006'),metadata:{sourceFile:master.title,sourceSheet:r._sourceSheet,sourceRow:r._sourceRow}}));
export const glassGas=[value('glass_gas','DRY_AIR','乾燥空気',1,{selector:{glass_base:{$in:['LOWE','PAIR']}},evidenceIds:ev('EV-S2H-006')}),value('glass_gas','ARGON','アルゴンガス',2,{selector:{glass_base:'LOWE'},evidenceIds:ev('EV-S2H-006')})];
export const glassSpacer=[value('glass_spacer','ALUMINUM','アルミスペーサー',1,{selector:{glass_base:{$in:['LOWE','PAIR']}},evidenceIds:ev('EV-S2H-006')}),value('glass_spacer','RESIN','樹脂スペーサー',2,{selector:{glass_base:'LOWE'},evidenceIds:ev('EV-S2H-006')})];
export const glassAdditional=[value('glass_additional','NONE','なし',1,{evidenceIds:ev('EV-S2H-006')}),value('glass_additional','SAFE','安全合わせ',2,{evidenceIds:ev('EV-S2H-006')}),value('glass_additional','DISASTER_SAFE','防災安全合わせ',3,{evidenceIds:ev('EV-S2H-006')})];
export const glassTypes=[value('glass_type','CLEAR','透明',1,{evidenceIds:ev('EV-S2H-006')}),value('glass_type','PATTERN','型板',2,{selector:{patternAllowed:true},evidenceIds:ev('EV-S2H-006')})];
