import { appRuntimeIntegrationRegistry } from '../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {
  NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY,
  semanticSlotForNewConstructionField,
  semanticStageForNewConstructionSlot,
  shouldExposeNewConstructionRuntimeField,
  applyRuntimeUiCategoryOrder,
} from '../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
import {
  INNER_WINDOW_UI_CATEGORY,
  semanticSlotForInnerWindowField,
  semanticStageForInnerWindowSlot,
  shouldExposeInnerWindowRuntimeField,
} from '../src/catalog/runtime-master/inner-window-runtime-ui-contract.mjs';

const report = { model:'GLOBAL_WINDOW_FLOW_FIELD_INVENTORY_V2', integrations:[], unmapped:[], extensionResolved:[], excluded:[] };

for (const integration of appRuntimeIntegrationRegistry) {
  const runtime = await loadRegisteredRuntime(integration.manufacturer, integration.series);
  const definitions = runtime?.master?.fields ?? [];
  const rows = [];
  for (const [index, definition] of definitions.entries()) {
    const key = definition.field_name ?? definition.key;
    const field = {
      key,
      field_name:key,
      domain:definition.domain ?? null,
      displayOrder:Number(definition.display_order ?? definition.displayOrder ?? index + 1),
      runtimeIncluded:definition.runtime_included,
      runtime_included:definition.runtime_included,
      technical:definition.technical,
      internal:definition.internal,
      visibilityMode:definition.visibility_mode,
      visibility_mode:definition.visibility_mode,
      initialVisibility:definition.initial_visibility,
      initial_visibility:definition.initial_visibility,
      selectionMode:definition.selection_mode,
      selection_mode:definition.selection_mode,
      showReadOnly:definition.show_read_only,
      show_read_only:definition.show_read_only,
    };

    const exposed = integration.uiCategory === NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY
      ? shouldExposeNewConstructionRuntimeField(field)
      : integration.uiCategory === INNER_WINDOW_UI_CATEGORY
        ? shouldExposeInnerWindowRuntimeField(field)
        : false;
    if (!exposed) {
      report.excluded.push({ id:integration.id, key, reason:'NON_USER_FACING_RUNTIME_FIELD' });
      continue;
    }

    let slot = null;
    let stage = null;
    if (integration.uiCategory === NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY) {
      slot = semanticSlotForNewConstructionField(key);
      stage = slot ? semanticStageForNewConstructionSlot(slot) : null;
    } else if (integration.uiCategory === INNER_WINDOW_UI_CATEGORY) {
      slot = semanticSlotForInnerWindowField(key);
      stage = slot ? semanticStageForInnerWindowSlot(slot) : null;
    }

    if (!slot || !stage) {
      try {
        const [resolved] = applyRuntimeUiCategoryOrder([field], integration);
        if (resolved?.semanticSlot && resolved?.semanticStage) {
          report.extensionResolved.push({ id:integration.id, key, domain:field.domain, semanticSlot:resolved.semanticSlot, semanticStage:resolved.semanticStage });
          slot = resolved.semanticSlot;
          stage = resolved.semanticStage;
        } else {
          report.unmapped.push({ id:integration.id, key, domain:field.domain });
        }
      } catch (error) {
        report.unmapped.push({ id:integration.id, key, domain:field.domain, code:error.code ?? null, message:error.message });
      }
    }
    rows.push({ key, domain:field.domain, semanticSlot:slot, semanticStage:stage });
  }
  report.integrations.push({ id:integration.id, uiCategory:integration.uiCategory, fieldCount:rows.length, fields:rows });
}

report.integrationCount = report.integrations.length;
report.fieldCount = report.integrations.reduce((sum,row)=>sum+row.fieldCount,0);
report.unmappedCount = report.unmapped.length;
report.extensionResolvedCount = report.extensionResolved.length;
report.excludedCount = report.excluded.length;
console.log(JSON.stringify(report, null, 2));
if (report.unmappedCount) process.exitCode = 31;
