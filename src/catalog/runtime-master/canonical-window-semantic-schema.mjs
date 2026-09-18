export const GLOBAL_WINDOW_STAGE_ORDER = Object.freeze([
  'PRODUCT','OPENING','CONFIGURATION','SIZE','FINISH','SCREEN','GLAZING','INSTALLATION_SURVEY','OPTION',
]);

export const FRAME_ANGLE_CANONICAL_VALUES = Object.freeze(['WITH_ANGLE','WITHOUT_ANGLE']);
export const FRAME_ANGLE_CLASSIFICATIONS = Object.freeze([
  'USER_SELECTABLE','CONDITIONAL_USER_SELECTABLE','FIXED','NOT_APPLICABLE',
]);

export const CANONICAL_WINDOW_SLOT_STAGE = Object.freeze({
  manufacturer:'PRODUCT', product:'PRODUCT',
  window_type:'OPENING',
  window_spec:'CONFIGURATION', handing:'CONFIGURATION', frame_angle:'CONFIGURATION',
  size_mode:'SIZE', panel_count:'SIZE', size:'SIZE',
  exterior_color:'FINISH', interior_color:'FINISH', finish_color:'FINISH',
  screen_presence:'SCREEN', screen_form:'SCREEN', screen_midrail:'SCREEN', screen_net:'SCREEN',
  glass_base:'GLAZING', glass_type:'GLAZING', glass_detail:'GLAZING', glass_function:'GLAZING', glass_spacer:'GLAZING', glass_air_layer:'GLAZING',
  installation:'INSTALLATION_SURVEY', option:'OPTION',
});

export const NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER = Object.freeze([
  'manufacturer','product','window_type','window_spec','handing','frame_angle','size_mode','panel_count','size',
  'exterior_color','interior_color','screen_presence','screen_form','screen_midrail','screen_net',
  'glass_base','glass_type','glass_detail','glass_function','glass_spacer','glass_air_layer','option',
]);

export function canonicalStageForSlot(slot) {
  return CANONICAL_WINDOW_SLOT_STAGE[slot] ?? null;
}

const normalize = (value) => String(value ?? '').normalize('NFKC').replace(/\s+/g,' ').trim();

export function classifyGlazingChoice(choice = {}) {
  const label = normalize(choice.displayLabel ?? choice.label ?? choice.value);
  if (!label) return 'UNKNOWN';
  if (/^(?:なし|標準|なし（標準）)$/.test(label)) return 'NEUTRAL';
  if (/(?:\d+(?:\.\d+)?-(?:Ar|A)\d+|LowE\d+|Low-E\d+|Ar\d+|中空層\s*\d+mm)/i.test(label)) return 'TECHNICAL_COMPOSITION';
  if (/フロスト.*(?:\/|／).*型板|型板.*(?:\/|／).*フロスト/.test(label)) return 'AMBIGUOUS_APPEARANCE';
  if (/(?:安全合わせ|防災|強化|格子入り|意匠格子|ブラインド|調光|合わせ|飛散防止)/.test(label)) return 'FUNCTION';
  if (/(?:Low-?E|高遮熱|遮熱|断熱|高日射取得|日射取得|グリーン|ブロンズ|クリア×|内外Low|混色)/i.test(label)) return 'DETAIL';
  if (/(?:透明|型板|フロスト|乳白|かすみ)/.test(label)) return 'APPEARANCE';
  return 'UNKNOWN';
}

const EXPECTED_GLAZING_SEMANTIC = Object.freeze({
  glass_type:'APPEARANCE',
  glass_detail:'DETAIL',
  glass_function:'FUNCTION',
});

export function auditCanonicalGlazingField(field = {}) {
  const slot = String(field.semanticSlot ?? field.semantic_slot ?? '').trim();
  const expected = EXPECTED_GLAZING_SEMANTIC[slot] ?? null;
  if (!expected) return Object.freeze({ slot, expected:null, recognized:[], unknown:[], issues:[] });

  const recognized = [];
  const unknown = [];
  const issues = [];
  for (const choice of field.values ?? []) {
    const semantic = classifyGlazingChoice(choice);
    const label = normalize(choice.displayLabel ?? choice.label ?? choice.value);
    if (semantic === 'UNKNOWN') {
      unknown.push(label);
      continue;
    }
    if (semantic === 'NEUTRAL') continue;
    recognized.push({ label, semantic });
    if (semantic === 'TECHNICAL_COMPOSITION') {
      issues.push({ code:'GLAZING_TECHNICAL_COMPOSITION_EXPOSED', label, slot });
      continue;
    }
    if (semantic === 'AMBIGUOUS_APPEARANCE') {
      issues.push({ code:'GLAZING_AMBIGUOUS_APPEARANCE_VALUE', label, slot });
      continue;
    }
    if (semantic !== expected) {
      issues.push({ code:'GLAZING_SLOT_SEMANTIC_MISMATCH', label, slot, expected, actual:semantic });
    }
  }

  const categories = [...new Set(recognized.map((row) => row.semantic).filter((value) => !['TECHNICAL_COMPOSITION','AMBIGUOUS_APPEARANCE'].includes(value)))];
  if (categories.length > 1) issues.push({ code:'GLAZING_MIXED_SEMANTICS', slot, categories });

  return Object.freeze({ slot, expected, recognized, unknown, issues });
}

export function assertCanonicalGlazingField(field = {}) {
  const audit = auditCanonicalGlazingField(field);
  if (!audit.issues.length) return audit;
  const error = new Error(`Canonical glazing semantic mismatch for ${field.key ?? field.field_name ?? audit.slot}`);
  error.code = 'CANONICAL_GLAZING_SEMANTIC_MISMATCH';
  error.audit = audit;
  throw error;
}
