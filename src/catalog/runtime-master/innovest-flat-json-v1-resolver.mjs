import { clone, confirmed, uniq, split, has, filterAllowedRows, retainIfAllowed, canonicalContext, optionResult, fieldState, handleAllowed, sizeConstraint, applyStandardSize, sizeVerdict } from './innovest-flat-json-v1-model.mjs';

export function createInnovestResolver(data) {
  const { selectors, masterData, options } = data;
  return (input = {}) => {
    const selection = clone(input ?? {});
    const cleared = [];
    const errors = [];
    const warnings = [];
    const manualWarnings = [];

    const thermalAllowed = uniq(selectors.product_nodes.map((row) => row.thermal_grade));
    retainIfAllowed(selection, 'thermal_spec', thermalAllowed, cleared);

    const nodeRows1 = selectors.product_nodes.filter((row) => !selection.thermal_spec || row.thermal_grade === selection.thermal_spec);
    const fireAllowed = uniq(nodeRows1.map((row) => row.fire_classification));
    retainIfAllowed(selection, 'fire_classification', fireAllowed, cleared, { autoSingleton: Boolean(selection.thermal_spec) });

    const frameRowsBase = selectors.product_nodes.filter((row) => (!selection.thermal_spec || row.thermal_grade === selection.thermal_spec)
      && (!selection.fire_classification || row.fire_classification === selection.fire_classification));
    let frameAllowed = uniq(frameRowsBase.map((row) => row.frame_system));
    if (selection.design) {
      const whitelist = filterAllowedRows(masterData.Design_Frame_Fire_Whitelist, {
        thermal_grade: selection.thermal_spec,
        fire_classification: selection.fire_classification,
        design_id: selection.design,
      });
      frameAllowed = frameAllowed.filter((frame) => whitelist.some((row) => row.frame_system === frame));
    }
    retainIfAllowed(selection, 'frame_system', frameAllowed, cleared, { autoSingleton: Boolean(selection.fire_classification) });

    let configurationAllowed = uniq(selectors.product_nodes.filter((row) => (!selection.thermal_spec || row.thermal_grade === selection.thermal_spec)
      && (!selection.fire_classification || row.fire_classification === selection.fire_classification)
      && (!selection.frame_system || row.frame_system === selection.frame_system)).map((row) => row.opening_configuration));
    if (selection.design) {
      const whitelist = filterAllowedRows(masterData.Design_Opening_Whitelist, {
        thermal_grade: selection.thermal_spec,
        fire_classification: selection.fire_classification,
        frame_system: selection.frame_system,
        design_id: selection.design,
      });
      configurationAllowed = configurationAllowed.filter((configuration) => whitelist.some((row) => row.opening_configuration === configuration));
    }
    retainIfAllowed(selection, 'configuration', configurationAllowed, cleared);

    let designRows = filterAllowedRows(masterData.Design_Frame_Fire_Whitelist, {
      thermal_grade: selection.thermal_spec,
      fire_classification: selection.fire_classification,
      frame_system: selection.frame_system,
    });
    if (selection.configuration) {
      const openingRows = filterAllowedRows(masterData.Design_Opening_Whitelist, {
        thermal_grade: selection.thermal_spec,
        fire_classification: selection.fire_classification,
        frame_system: selection.frame_system,
        opening_configuration: selection.configuration,
      });
      const allowedDesigns = new Set(openingRows.map((row) => row.design_id));
      designRows = designRows.filter((row) => allowedDesigns.has(row.design_id));
    }
    const designAllowed = uniq(designRows.map((row) => row.design_id));
    retainIfAllowed(selection, 'design', designAllowed, cleared);

    const handingRows = filterAllowedRows(masterData.Design_Opening_Handing_Whitelist, {
      thermal_grade: selection.thermal_spec,
      fire_classification: selection.fire_classification,
      frame_system: selection.frame_system,
      design_id: selection.design,
      opening_configuration: selection.configuration,
    });
    const handingAllowed = uniq(handingRows.map((row) => row.handing));
    retainIfAllowed(selection, 'handing', handingAllowed, cleared);

    const colorRows = filterAllowedRows(masterData.Design_Color_Whitelist, {
      thermal_grade: selection.thermal_spec,
      fire_classification: selection.fire_classification,
      frame_system: selection.frame_system,
      design_id: selection.design,
    });
    const colorAllowed = uniq(colorRows.map((row) => row.color_variant_id));
    retainIfAllowed(selection, 'door_color', colorAllowed, cleared);

    const childVisible = ['PARENT_CHILD','PARENT_CHILD_RECESSED'].includes(selection.configuration);
    const childRows = childVisible ? masterData.Secondary_Leaf_Compatibility.filter((row) => confirmed(row)
      && row.thermal_grade === selection.thermal_spec
      && row.parent_design_id === selection.design
      && split(row.applicable_opening).includes(selection.configuration)) : [];
    const childAllowed = uniq(childRows.flatMap((row) => split(row.allowed_secondary_leaf)));
    if (!childVisible && has(selection.child_door)) { cleared.push({ field: 'child_door', reason: 'NOT_APPLICABLE', removed: selection.child_door }); delete selection.child_door; }
    else retainIfAllowed(selection, 'child_door', childAllowed, cleared, { autoSingleton: childVisible });

    const glassRow = masterData.Daylight_Glass_Master.find((row) => confirmed(row)
      && row.thermal_grade === selection.thermal_spec
      && row.design_id === selection.design
      && row.fire_classification === selection.fire_classification
      && (row.applicable_opening === 'REFER Design_Opening_Whitelist' || split(row.applicable_opening).includes(selection.configuration)));
    const glassVisible = glassRow?.glass_exists === 'YES';
    const glassAllowed = glassVisible ? [glassRow.glass_specification] : [];
    if (glassVisible) selection.glass = glassRow.glass_specification; else delete selection.glass;

    const installRowsBase = masterData.Frame_Installation_Master.filter((row) => confirmed(row) && row.allowed && (!selection.frame_system || row.frame_system === selection.frame_system));
    const installationAllowed = uniq(installRowsBase.map((row) => row.frame_installation_type));
    retainIfAllowed(selection, 'frame_installation_type', installationAllowed, cleared);
    const angleAllowed = uniq(installRowsBase.filter((row) => !selection.frame_installation_type || row.frame_installation_type === selection.frame_installation_type).map((row) => Boolean(row.angle_attached_frame)));
    if (has(selection.angle_attached_frame) && !angleAllowed.some((candidate) => eq(candidate, selection.angle_attached_frame))) {
      cleared.push({ field: 'angle_attached_frame', reason: 'DEPENDENCY', removed: selection.angle_attached_frame }); delete selection.angle_attached_frame;
    }
    if (!has(selection.angle_attached_frame) && angleAllowed.length === 1 && selection.frame_installation_type) selection.angle_attached_frame = angleAllowed[0];

    const hardwareRow = masterData.Design_Hardware_Dependency.find((row) => confirmed(row) && row.thermal_grade === selection.thermal_spec && row.design_id === selection.design);
    const manualAllowed = Boolean(hardwareRow?.manual_key_allowed) && !(selection.child_door === 'K61N');
    const electricAllowed = Boolean(hardwareRow?.smart_key_allowed);
    const lockTypeAllowed = [...(manualAllowed ? ['MANUAL'] : []), ...(electricAllowed ? ['ELECTRIC'] : [])];
    retainIfAllowed(selection, 'lock_type', lockTypeAllowed, cleared, { autoSingleton: Boolean(selection.design) });

    const lockSystemAllowed = selection.lock_type === 'ELECTRIC'
      ? masterData.Key_Package_Master.filter((row) => confirmed(row) && row.control_type === 'ELECTRIC' && split(row.applicable_thermal_grade).includes(selection.thermal_spec)).map((row) => row.key_package)
      : [];
    if (selection.lock_type !== 'ELECTRIC') delete selection.lock_system; else retainIfAllowed(selection, 'lock_system', uniq(lockSystemAllowed), cleared);

    const keyPackage = selection.lock_type === 'MANUAL' ? 'MANUAL' : selection.lock_system;
    const keyRow = masterData.Key_Package_Master.find((row) => row.key_package === keyPackage);
    let powerAllowed = keyRow ? split(keyRow.power_supply_allowed).filter((one) => one !== 'NOT_APPLICABLE') : [];
    if (selection.thermal_spec === 'D70' && keyPackage && keyPackage !== 'MANUAL') powerAllowed = powerAllowed.filter((one) => one === 'AC100V');
    if (keyPackage === 'FACE_RECOGNITION') powerAllowed = powerAllowed.filter((one) => one === 'AC100V');
    if (!keyPackage || selection.lock_type === 'MANUAL') delete selection.power_supply;
    else retainIfAllowed(selection, 'power_supply', powerAllowed, cleared, { autoSingleton: true });

    const handleRows = masterData.Handle_Master.filter((row) => confirmed(row) && handleAllowed(row, selection, hardwareRow));
    const handleAllowedIds = uniq(handleRows.map((row) => row.handle_id));
    retainIfAllowed(selection, 'handle', handleAllowedIds, cleared, { autoSingleton: Boolean(keyPackage) && handleAllowedIds.length === 1 });
    const handleColorAllowed = uniq(handleRows.filter((row) => !selection.handle || row.handle_id === selection.handle).map((row) => row.handle_color));
    retainIfAllowed(selection, 'handle_color', handleColorAllowed, cleared, { autoSingleton: Boolean(selection.handle) && handleColorAllowed.length === 1 });

    const constraint = sizeConstraint(data, selection);
    const sizeModeAllowed = constraint ? ['STANDARD', ...(constraint.actual_width_size_order_allowed || constraint.actual_height_size_order_allowed ? ['SIZE_ORDER'] : [])] : [];
    retainIfAllowed(selection, 'size_mode', sizeModeAllowed, cleared, { autoSingleton: Boolean(constraint) && sizeModeAllowed.length === 1 });
    applyStandardSize(selection, constraint);

    const context = canonicalContext(selection, data);
    if (constraint && selection.size_mode === 'STANDARD') {
      context.frame_width_mm = constraint.standard_frame_width_mm;
      context.frame_height_mm = constraint.standard_frame_height_mm;
    }
    const optionRows = options.options.filter((row) => row.runtime_selectable === true);
    const optionEvaluations = optionRows.map((row) => ({ row, result: optionResult(row, context, selection) }));
    const optionAllowed = optionEvaluations.filter(({ result }) => result.eligible).map(({ row }) => row.option_id);
    if (Array.isArray(selection.option)) {
      const retained = selection.option.filter((id) => optionAllowed.includes(id));
      const removed = selection.option.filter((id) => !optionAllowed.includes(id));
      if (removed.length) cleared.push({ field: 'option', reason: 'DEPENDENCY', removed });
      if (retained.length) selection.option = retained; else delete selection.option;
    }

    for (const selectedId of selection.option ?? []) {
      const evaluation = optionEvaluations.find(({ row }) => row.option_id === selectedId);
      if (evaluation?.result.review) manualWarnings.push(`${evaluation.row.name}: ${evaluation.result.review.reason}`);
    }

    const lifecycle = masterData.Lifecycle_Master.find((row) => confirmed(row) && row.thermal_grade === selection.thermal_spec && row.design_id === selection.design);
    if (lifecycle?.lifecycle_status === 'ACTIVE_END_SCHEDULED') warnings.push(`販売終了予定: ${lifecycle.sales_end_date ?? '時期要確認'}`);
    if (lifecycle?.order_deadline === 'REVIEW_REQUIRED' || lifecycle?.order_deadline === null) {
      if (lifecycle?.design_id === 'N66N') manualWarnings.push('N66Nの受注期限・後継はメーカー確認が必要です。');
    }

    const dimension = sizeVerdict(selection, constraint);
    if (dimension?.status === 'BLOCK') errors.push({ code: 'SIZE_OUT_OF_RANGE', field: 'size_mode', message: dimension.message });

    const fields = {};
    fields.thermal_spec = fieldState(selection.thermal_spec, thermalAllowed, { visible: true, required: true });
    fields.fire_classification = fieldState(selection.fire_classification, fireAllowed, { visible: Boolean(selection.thermal_spec) && fireAllowed.length > 1, required: fireAllowed.length > 1, resolved: fireAllowed.length === 1, readOnly: fireAllowed.length === 1 });
    fields.frame_system = fieldState(selection.frame_system, frameAllowed, { visible: Boolean(selection.fire_classification) && frameAllowed.length > 1, required: frameAllowed.length > 1, resolved: frameAllowed.length === 1, readOnly: frameAllowed.length === 1 });
    fields.configuration = fieldState(selection.configuration, configurationAllowed, { visible: Boolean(selection.frame_system), required: true });
    fields.design = fieldState(selection.design, designAllowed, { visible: Boolean(selection.configuration), required: true });
    fields.child_door = fieldState(selection.child_door, childAllowed, { visible: childVisible && Boolean(selection.design), required: childVisible, resolved: childAllowed.length === 1, readOnly: childAllowed.length === 1 });
    fields.glass = fieldState(selection.glass, glassAllowed, { visible: glassVisible, required: glassVisible, resolved: glassVisible, readOnly: glassVisible });
    fields.door_color = fieldState(selection.door_color, colorAllowed, { visible: Boolean(selection.design), required: true });
    fields.handing = fieldState(selection.handing, handingAllowed, { visible: Boolean(selection.design && selection.configuration), required: true });
    fields.frame_installation_type = fieldState(selection.frame_installation_type, installationAllowed, { visible: Boolean(selection.frame_system), required: true });
    fields.angle_attached_frame = fieldState(selection.angle_attached_frame, angleAllowed, { visible: Boolean(selection.frame_installation_type) && angleAllowed.length > 1, required: angleAllowed.length > 1, resolved: angleAllowed.length === 1, readOnly: angleAllowed.length === 1 });
    fields.handle = fieldState(selection.handle, handleAllowedIds, { visible: Boolean(keyPackage), required: Boolean(keyPackage), resolved: handleAllowedIds.length === 1, readOnly: handleAllowedIds.length === 1 });
    fields.handle_color = fieldState(selection.handle_color, handleColorAllowed, { visible: Boolean(selection.handle), required: Boolean(selection.handle), resolved: handleColorAllowed.length === 1, readOnly: handleColorAllowed.length === 1 });
    fields.lock_type = fieldState(selection.lock_type, lockTypeAllowed, { visible: Boolean(selection.design), required: true, resolved: lockTypeAllowed.length === 1, readOnly: lockTypeAllowed.length === 1 });
    fields.lock_system = fieldState(selection.lock_system, uniq(lockSystemAllowed), { visible: selection.lock_type === 'ELECTRIC', required: selection.lock_type === 'ELECTRIC' });
    fields.power_supply = fieldState(selection.power_supply, powerAllowed, { visible: selection.lock_type === 'ELECTRIC' && powerAllowed.length > 0, required: selection.lock_type === 'ELECTRIC', resolved: powerAllowed.length === 1, readOnly: powerAllowed.length === 1 });
    fields.size_mode = fieldState(selection.size_mode, sizeModeAllowed, { visible: Boolean(constraint), required: Boolean(constraint), resolved: sizeModeAllowed.length === 1, readOnly: sizeModeAllowed.length === 1 });
    fields.custom_width = fieldState(selection.size_mode === 'SIZE_ORDER' ? selection.custom_width : null, [], { visible: selection.size_mode === 'SIZE_ORDER', required: selection.size_mode === 'SIZE_ORDER', unit: 'mm', min: constraint?.actual_frame_width_min_mm ?? null, max: constraint?.actual_frame_width_max_mm ?? null });
    fields.custom_height = fieldState(selection.size_mode === 'SIZE_ORDER' ? selection.custom_height : null, [], { visible: selection.size_mode === 'SIZE_ORDER', required: selection.size_mode === 'SIZE_ORDER', unit: 'mm', min: constraint?.actual_frame_height_min_mm ?? null, max: constraint?.actual_frame_height_max_mm ?? null });
    const needsWallThickness = optionRows.some((row) => (row.predicates ?? []).some((predicate) => predicate.field === 'wall_thickness_mm')) && Boolean(selection.frame_system);
    const wallBands = masterData.Wall_Thickness_Band_Master.filter((row) => confirmed(row) && row.frame_system === selection.frame_system && (selection.fire_classification !== 'FIRE' || row.fire_allowed !== false));
    fields.wall_thickness_mm = fieldState(selection.wall_thickness_mm, [], { visible: needsWallThickness, required: false, unit: 'mm', min: wallBands.length ? Math.min(...wallBands.map((row) => row.min_mm)) : null, max: wallBands.length ? Math.max(...wallBands.map((row) => row.max_mm)) : null });
    fields.option = fieldState(selection.option ?? [], optionAllowed, { visible: Boolean(selection.design && selection.door_color), required: false });

    const missing = Object.entries(fields).filter(([, state]) => state.visible !== false && state.visibility !== 'HIDE' && state.required && !has(state.value)).map(([name]) => name);
    const review = manualWarnings.length > 0;
    const status = errors.length ? 'INVALID' : missing.length ? 'INCOMPLETE' : review ? 'MANUAL_CHECK' : 'VALID';

    return {
      fields,
      status,
      errors,
      warnings,
      manual_warnings: manualWarnings,
      missing_required_fields: missing,
      cleared_fields: cleared,
      derived_components: new Set(),
      derived_entities: [],
      derived_options: [],
      matched_invalid_rules: [],
      dimension_result: dimension,
      order_ready: false,
      option_code_results: [],
      option_code_linkage_count: 0,
      canonical_context: context,
      lifecycle,
    };
  };
}
