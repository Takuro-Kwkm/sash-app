import { classifyGlazingChoice } from './canonical-window-semantic-schema.mjs';

const ADDITIONAL_KEY = 'glass_additional';
const FUNCTION_KEY = 'glass_function';
const TYPE_KEY = 'glass_type';
const DETAIL_KEY = 'glass_detail';

const text = (value) => String(value ?? '').normalize('NFKC').trim();
const choiceLabel = (choice = {}) => text(choice.displayLabel ?? choice.label ?? choice.value);
const choiceToken = (choice = {}) => text(choice.value).toUpperCase();
const composition = (choice = {}) => text(choice.runtimeValueRow?.metadata?.composition ?? choice.metadata?.composition);

function additionalSemantic(choice = {}) {
  const token = choiceToken(choice);
  const source = `${token} ${choiceLabel(choice)} ${composition(choice)}`;
  if (token === 'NONE' || /(?:^|-)NONE$/.test(token)) return 'NEUTRAL';
  if (/(?:SAFE|DISASTER|MILKY|GRID|BLIND)/.test(token) || /(?:安全|防災|乳白|格子|ブラインド)/.test(source)) return 'FUNCTION';
  if (/(?:PATTERN|FROST)/.test(token) || /(?:型板|フロスト)/.test(source)) return 'APPEARANCE';
  return classifyGlazingChoice(choice);
}

function normalizedDetailLabel(choice = {}) {
  const token = choiceToken(choice);
  if (/(?:PAIR|GENERAL)/.test(token)) return '一般複層（標準）';
  if (/GREEN-HS|GREEN_HS/.test(token)) return 'Low-E グリーン（高遮熱仕様）';
  if (/GREEN/.test(token)) return 'Low-E グリーン';
  if (/BRONZE/.test(token)) return 'Low-E ブロンズ';
  if (/CLEAR/.test(token)) return 'Low-E クリア';
  return choiceLabel(choice).replace(/[｜|].*$/u, '').trim();
}

function normalizedFunctionLabel(choice = {}) {
  const token = choiceToken(choice);
  if (token === 'NONE' || /(?:^|-)NONE$/.test(token)) return 'なし（標準）';
  if (/DISASTER/.test(token)) return '防災安全合わせ';
  if (/MILKY/.test(token)) return '安全合わせ（乳白）';
  if (/SAFE/.test(token)) return '安全合わせ';
  if (/GRID/.test(token)) return '意匠格子入り';
  if (/BLIND/.test(token)) return '調光ブラインドイン';
  return choiceLabel(choice);
}

function normalizedAppearanceLabel(choice = {}) {
  const token = choiceToken(choice);
  if (/FROST/.test(token)) return 'フロスト';
  if (/PATTERN/.test(token)) return '型板';
  return choiceLabel(choice);
}

function withLabel(choice, displayLabel, runtimeSourceKey) {
  return { ...choice, displayLabel, runtimeSourceKey };
}

function dedupeByDisplayLabel(choices = []) {
  const seen = new Set();
  return choices.filter((choice) => {
    const label = choiceLabel(choice);
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}

export function createProductModuleGlazingBridge(module = {}) {
  const additionalRows = (module.allowedValues ?? []).filter((row) => row.specificationKey === ADDITIONAL_KEY);
  const additionalChoices = additionalRows.map((row) => ({
    value: row.value,
    displayLabel: row.displayLabel,
    runtimeValueRow: row,
  }));
  const appearanceValues = new Set(additionalChoices.filter((choice) => additionalSemantic(choice) === 'APPEARANCE').map((choice) => choice.value));
  const functionValues = new Set(additionalChoices.filter((choice) => ['FUNCTION','NEUTRAL'].includes(additionalSemantic(choice))).map((choice) => choice.value));
  const enabled = additionalRows.length > 0;

  function toSourceSelection(selection = {}) {
    if (!enabled) return { ...selection };
    const source = { ...selection };
    if (appearanceValues.has(source[TYPE_KEY]) && functionValues.has(source[FUNCTION_KEY]) && source[FUNCTION_KEY] !== 'NONE') {
      const error = new Error('A glass appearance sourced from the formal additional axis cannot be combined with a separate glass function.');
      error.code = 'CANONICAL_GLAZING_SELECTION_CONFLICT';
      error.fields = [TYPE_KEY, FUNCTION_KEY];
      throw error;
    }
    if (Object.prototype.hasOwnProperty.call(source, FUNCTION_KEY)) {
      source[ADDITIONAL_KEY] = source[FUNCTION_KEY];
      delete source[FUNCTION_KEY];
    }
    if (appearanceValues.has(source[TYPE_KEY])) {
      source[ADDITIONAL_KEY] = source[TYPE_KEY];
      delete source[TYPE_KEY];
    }
    return source;
  }

  function toCanonicalSelection(selection = {}) {
    if (!enabled) return { ...selection };
    const canonical = { ...selection };
    const additional = canonical[ADDITIONAL_KEY];
    delete canonical[ADDITIONAL_KEY];
    if (appearanceValues.has(additional)) canonical[TYPE_KEY] = additional;
    else if (functionValues.has(additional)) canonical[FUNCTION_KEY] = additional;
    return canonical;
  }

  function normalizeFields(fields = [], selection = {}) {
    if (!enabled) return fields.map((field) => field.key === DETAIL_KEY
      ? { ...field, values: field.values.map((choice) => withLabel(choice, normalizedDetailLabel(choice), DETAIL_KEY)) }
      : field);

    const additional = fields.find((field) => field.key === ADDITIONAL_KEY);
    if (!additional) return fields;
    const appearances = additional.values
      .filter((choice) => additionalSemantic(choice) === 'APPEARANCE')
      .map((choice) => withLabel(choice, normalizedAppearanceLabel(choice), ADDITIONAL_KEY));
    const functions = additional.values
      .filter((choice) => ['FUNCTION','NEUTRAL'].includes(additionalSemantic(choice)))
      .map((choice) => withLabel(choice, normalizedFunctionLabel(choice), ADDITIONAL_KEY));

    const normalized = [];
    let typeSeen = false;
    for (const field of fields) {
      if (field.key === ADDITIONAL_KEY) continue;
      if (field.key === DETAIL_KEY) {
        normalized.push({ ...field, values: field.values.map((choice) => withLabel(choice, normalizedDetailLabel(choice), DETAIL_KEY)) });
        continue;
      }
      if (field.key === TYPE_KEY) {
        typeSeen = true;
        const direct = field.values.map((choice) => withLabel(choice, normalizedAppearanceLabel(choice), TYPE_KEY));
        normalized.push({ ...field, values: dedupeByDisplayLabel([...direct, ...appearances]) });
        continue;
      }
      normalized.push(field);
    }
    if (!typeSeen && appearances.length) {
      normalized.push({
        ...additional,
        key: TYPE_KEY,
        displayLabel: 'ガラス種',
        values: dedupeByDisplayLabel(appearances),
      });
    }
    if (functions.length && !appearanceValues.has(selection[ADDITIONAL_KEY])) {
      normalized.push({
        ...additional,
        key: FUNCTION_KEY,
        displayLabel: 'ガラス追加機能',
        required: false,
        values: functions,
      });
    }
    return normalized;
  }

  return Object.freeze({ enabled, appearanceValues, functionValues, toSourceSelection, toCanonicalSelection, normalizeFields });
}
