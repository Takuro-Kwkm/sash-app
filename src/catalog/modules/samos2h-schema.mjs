import { definition, specDefinitions, handingSelector } from './samos2h-base.mjs';
import { screenSelector } from './samos2h-features.mjs';

export const definitions = [
  definition('window_type','窓種',10,'WINDOWS'),
  ...specDefinitions,
  definition('handing','開き勝手（吊元）',25,'SIZE','ENUM',{ selector: handingSelector, description: 'LIXIL一次資料の吊元表記に従います。L=左吊元、R=右吊元。' }),
  definition('construction','工法区分',30,'SIZE','ENUM',{ autoSelectSingle: true }),
  definition('size_mode','サイズ方式',40,'SIZE','ENUM',{ autoSelectSingle: true }),
  definition('size','サイズ',50,'SIZE'),
  definition('exterior_color','外観色',60,'COLOR'),
  definition('interior_color','内観色',70,'INNER_COLOR'),
  definition('screen_presence','網戸',80,'SCREEN','ENUM',{ selector: screenSelector, autoSelectSingle: true }),
  definition('screen_form','網戸形式',90,'SCREEN','ENUM',{ selector: { screen_presence: 'あり' }, autoSelectSingle: true }),
  definition('screen_midrail','網戸中桟',100,'SCREEN','ENUM',{ selector: { screen_form: '引違い網戸' }, autoSelectSingle: true }),
  definition('screen_net','網戸ネット',110,'SCREEN','ENUM',{ selector: { screen_presence: 'あり' }, autoSelectSingle: true }),
  definition('glass_base','ガラス',120,'GLASS'),
  definition('glass_detail','ガラス詳細',130,'GLASS'),
  definition('glass_gas','中空層',135,'GLASS','ENUM',{ autoSelectSingle: true }),
  definition('glass_spacer','スペーサー',138,'GLASS','ENUM',{ autoSelectSingle: true }),
  definition('glass_additional','ガラス追加機能',140,'GLASS','ENUM',{ autoSelectSingle: true }),
  definition('glass_type','ガラス種',145,'GLASS','ENUM',{ autoSelectSingle: true }),
  definition('options','その他オプション',150,'OPTIONS','MULTI_ENUM'),
];
