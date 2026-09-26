import { GLOBAL_WINDOW_STAGE_ORDER } from './canonical-window-semantic-schema.mjs';

export { GLOBAL_WINDOW_STAGE_ORDER } from './canonical-window-semantic-schema.mjs';

const STAGE_INDEX = new Map(GLOBAL_WINDOW_STAGE_ORDER.map((stage, index) => [stage, index]));

const fieldKey = (field = {}) => String(field.key ?? field.field_name ?? '').trim();

function unmappedFieldError(key, category) {
  const error = new Error(`Window UI field is not mapped to a canonical semantic slot: ${category}:${key}`);
  error.code = 'WINDOW_UI_FIELD_UNMAPPED';
  error.fieldKey = key;
  error.uiCategory = category;
  return error;
}

function unmappedStageError(slot, category) {
  const error = new Error(`Window UI semantic slot is not mapped to a canonical stage: ${category}:${slot}`);
  error.code = 'WINDOW_UI_STAGE_UNMAPPED';
  error.semanticSlot = slot;
  error.uiCategory = category;
  return error;
}

export function applyGlobalWindowSelectionFlow(fields = [], contract = {}) {
  const {
    uiCategory = 'WINDOW',
    canonicalSlotOrder = [],
    semanticSlotForField,
    semanticStageForSlot,
    approvedExtensionForField,
    shouldExposeField = () => true,
    standardLabelForField = (_key, fallback) => fallback,
  } = contract;

  if (typeof semanticSlotForField !== 'function' || typeof semanticStageForSlot !== 'function') {
    throw new TypeError('Global Window Selection Flow requires semantic slot and stage resolvers.');
  }

  const SLOT_INDEX = new Map(canonicalSlotOrder.map((slot, index) => [slot, index]));

  return fields
    .filter((field) => shouldExposeField(field))
    .map((field, inputIndex) => {
      const key = fieldKey(field);
      let semanticSlot = semanticSlotForField(key, field);
      let semanticStage = semanticSlot ? semanticStageForSlot(semanticSlot, field) : null;
      let extensionOrder = null;

      if (!semanticSlot || !semanticStage) {
        const extension = typeof approvedExtensionForField === 'function'
          ? approvedExtensionForField(key, field)
          : null;
        if (!extension?.slot || !extension?.stage) throw unmappedFieldError(key, uiCategory);
        semanticSlot = extension.slot;
        semanticStage = extension.stage;
        extensionOrder = Number(extension.order ?? field.displayOrder ?? 1000 + inputIndex);
      }

      const stageIndex = STAGE_INDEX.get(semanticStage);
      if (stageIndex === undefined) throw unmappedStageError(semanticSlot, uiCategory);

      const slotIndex = SLOT_INDEX.has(semanticSlot)
        ? SLOT_INDEX.get(semanticSlot)
        : canonicalSlotOrder.length + Number(extensionOrder ?? field.displayOrder ?? 1000 + inputIndex) / 100000;

      return {
        ...field,
        semanticStage,
        semanticSlot,
        displayLabel: standardLabelForField(key, field.displayLabel),
        __stageIndex: stageIndex,
        __slotIndex: slotIndex,
        __runtimeOrder: Number(field.displayOrder ?? 1000 + inputIndex),
        __inputIndex: inputIndex,
      };
    })
    .sort((a, b) =>
      a.__stageIndex - b.__stageIndex
      || a.__slotIndex - b.__slotIndex
      || a.__runtimeOrder - b.__runtimeOrder
      || a.__inputIndex - b.__inputIndex
    )
    .map((field, index) => {
      const { __stageIndex, __slotIndex, __runtimeOrder, __inputIndex, ...rest } = field;
      return { ...rest, displayOrder: (index + 1) * 10 };
    });
}
