# Human Flow Review Artifact

- Exact HEAD: `4abf962ee7ada4bf2545348e7acf2ca45a4b0d15`
- Runtime Snapshot: `RUNTIME-SNAPSHOT-ad2603b8a64d026ffd0b`
- Artifact Identity: `HFR-0fbd0b194f9f7d698ad9c54b9afd82a89b961cda4e20ea6ed7fb149cd2a7c572`
- Review Completeness: **READY_FOR_HUMAN_REVIEW**
- HUMAN_FLOW_REVIEW_GATE: **BLOCKED_PENDING_EXPLICIT_APPROVAL**
- Series: **8**
- BASE_WINDOW_COUNT: **113**
- Field Mapping: mapped 270 / unmapped 0 / conflict 0
- Source Field Coverage: **PASS** / missing before repair 40 / missing after repair 0
- Runtime Snapshot Gaps: **0**
- Explicit Unverified Records: **8** / total unresolved slot properties 3263

## frame_angle Canonical Coverage

- Canonical values: WITH_ANGLE / WITHOUT_ANGLE
- Runtime present: **15 / 113**
- Absent / N/A-or-gap unverified: **98**
- Invalid canonical values: **0**
- UI inference used: **false**

## Series Field Coverage

| Series | Source | Source fields | Baseline union | Expected union | Before | After | Missing after |
|---|---|---:|---:|---:|---:|---:|---:|
| サーモスⅡ-H | FORMAL_PRODUCT_MODULE_DEFINITIONS | 31 | 27 | 32 | 11 | 32 | 0 |
| サーモスL | FORMAL_PRODUCT_MODULE_DEFINITIONS | 30 | 25 | 30 | 12 | 30 | 0 |
| EW | NORMALIZED_MASTER | 30 | 17 | 30 | 30 | 30 | 0 |
| TW | NORMALIZED_MASTER | 25 | 10 | 25 | 25 | 25 | 0 |
| APW430 | ADAPTER_LITERAL_FIELD_UNIVERSE | 17 | 6 | 18 | 17 | 18 | 0 |
| APW431 | ADAPTER_LITERAL_FIELD_UNIVERSE | 19 | 3 | 19 | 19 | 19 | 0 |
| ウチリモ 内窓 | NORMALIZED_MASTER | 92 | 14 | 92 | 92 | 92 | 0 |
| インプラス | NORMALIZED_MASTER | 24 | 9 | 24 | 24 | 24 | 0 |

## Series × Stage / Canonical Slot Matrix

| Series | PRODUCT | OPENING | CONFIGURATION | SIZE | FINISH | SCREEN | GLAZING | INSTALLATION_SURVEY | OPTION |
|---|---|---|---|---|---|---|---|---|---|
| サーモスⅡ-H | — | window_type | window_spec, handing | size_mode, panel_count, size | exterior_color, interior_color | screen_presence, screen_form, screen_midrail, screen_net | glass_base, glass_type, glass_detail, glass_function, glass_spacer, glass_air_layer | — | option |
| サーモスL | — | window_type | window_spec, handing | size_mode, panel_count, size | exterior_color, interior_color | screen_presence, screen_form, screen_midrail, screen_net | glass_base, glass_type, glass_detail, glass_function, glass_spacer, glass_air_layer | — | option |
| EW | — | window_type | window_spec, handing, frame_angle, ext.glass_configuration, ext.profile, ext.opening_class, ext.sill, ext.wall_finish | size_mode, panel_count, size | exterior_color, interior_color | screen_presence, screen_form, screen_midrail, screen_net | glass_base, glass_type, glass_detail, glass_function, glass_spacer, glass_air_layer | installation_environment | option |
| TW | — | window_type | window_spec, handing | size_mode, panel_count, size | exterior_color, interior_color | screen_presence, screen_form, screen_midrail, screen_net | glass_base, glass_type, glass_detail, glass_function, glass_spacer, glass_air_layer | — | option |
| APW430 | — | window_type | window_spec, handing | size_mode, panel_count, size | exterior_color, interior_color | screen_presence, screen_form, screen_net | glass_type, glass_detail, glass_function | — | option |
| APW431 | — | window_type | window_spec | size_mode, panel_count, size | exterior_color, interior_color | screen_presence, screen_form, screen_midrail, screen_net | glass_type, glass_detail, glass_function | — | option |
| ウチリモ 内窓 | — | window_type | room_specification, sash_configuration, reverse_handing, three_panel_layout, hinge_side | size_class, size_mode, size_w, size_h, sash_width_allocation, sash_w1, sash_w2, sash_w3, sash_w4 | frame_color | — | glass_family, glass_structure, low_e_type, glass_coating_color, glass_surface_type, safety_treatment, grille_type, grille_material, muntin_type, vacuum_glass_product, spacer_type, gas_fill, cavity_thickness_mm | frame_installation_mode, frame_projection, extension_frame_type, extension_frame_reinforcement, installation_environment, crescent_position, extension:installation:opening_w_top, extension:installation:opening_w_middle, extension:installation:opening_w_bottom, extension:installation:opening_h_left, extension:installation:opening_h_middle, extension:installation:opening_h_right, extension:installation:diagonal_1, extension:installation:diagonal_2, extension:installation:available_mounting_depth, extension:installation:existing_window_interference, extension:installation:existing_hardware_interference, extension:installation:structural_support_condition, extension:installation:floor_support_condition, extension:installation:construction, extension:installation:jamb_projection_a_mm, extension:installation:jamb_face_b_mm, extension:installation:jamb_height_h_mm, extension:installation:jamb_height_h1_mm, extension:installation:jamb_height_h2_mm, extension:installation:jamb_height_h3_mm, extension:installation:sill_upper_c_mm, extension:installation:sill_lower_d_mm, extension:installation:wall_surface_for_reinforcement_available, extension:installation:substrate_present, extension:installation:substrate_wall_gap_present, extension:installation:substrate_or_structure_present, extension:installation:substrate_or_structure_wall_gap_present, extension:installation:stud_spacing_condition_met, extension:installation:tool_floor_interference, extension:installation:floor_supports_load, extension:installation:floor_screw_holding, extension:installation:baseboard_interference, extension:installation:vertical_horizontal_jamb_step_e_mm, extension:installation:lower_mounting_surface_horizontal_or_adjustable, extension:installation:mounting_surface_flat, extension:installation:mounting_surface_damage_protection, extension:installation:resin_jamb_face_screw_fixed, extension:installation:lower_resin_jamb_space_mm, extension:installation:existing_lower_jamb_angle_present, extension:installation:lower_jamb_a_mm, extension:installation:lower_jamb_a_prime_mm, extension:installation:hardware_tip_mounting_depth_A_mm, extension:installation:existing_angle_height_mm, extension:installation:existing_angle_tip_mm, extension:installation:system_bath_component_screw_interference, extension:installation:existing_window_to_jamb_step_large | extension:option:crescent_presence, extension:option:crescent_type, extension:option:pull_handle_type, extension:option:pull_handle_position, extension:option:operating_handle_type, extension:option:middle_rail_option, extension:option:middle_rail_position, extension:option:ventilator_option, extension:option:bottom_rail_type, extension:option:arm_stopper_option, extension:option:outside_handle_option |
| インプラス | — | window_type | sash_configuration, reverse_handing, hinge_side | size_class, size_mode, order_width, order_height | body_color | — | glass_family, glass_type, supply_form, glass_detail, decorative_pattern, lowe_color, spacer, cavity_fill | upper_frame_spec, sash_midrail, crescent_position, frame_install_spec, fukashi_spec, joint_layout | option_items |

## Overrides

- Series-specific: 0
- Manufacturer-specific: 0
- productId-specific: 0

## UNVERIFIED

- LIXIL::サーモスⅡH: DYNAMIC_VISIBILITY_REQUIRED_DEPENDENCY_CLEAR_STANDARD_CUSTOM_PENDING_POST_HUMAN_QA [EXPECTED_POST_HUMAN_QA]
- LIXIL::サーモスL: DYNAMIC_VISIBILITY_REQUIRED_DEPENDENCY_CLEAR_STANDARD_CUSTOM_PENDING_POST_HUMAN_QA [EXPECTED_POST_HUMAN_QA]
- LIXIL::EW: DYNAMIC_VISIBILITY_REQUIRED_DEPENDENCY_CLEAR_STANDARD_CUSTOM_PENDING_POST_HUMAN_QA [EXPECTED_POST_HUMAN_QA]
- LIXIL::TW: DYNAMIC_VISIBILITY_REQUIRED_DEPENDENCY_CLEAR_STANDARD_CUSTOM_PENDING_POST_HUMAN_QA [EXPECTED_POST_HUMAN_QA]
- YKK AP::APW430: DYNAMIC_VISIBILITY_REQUIRED_DEPENDENCY_CLEAR_STANDARD_CUSTOM_PENDING_POST_HUMAN_QA [EXPECTED_POST_HUMAN_QA]
- YKK AP::APW431: DYNAMIC_VISIBILITY_REQUIRED_DEPENDENCY_CLEAR_STANDARD_CUSTOM_PENDING_POST_HUMAN_QA [EXPECTED_POST_HUMAN_QA]
- YKK AP::ウチリモ 内窓: DYNAMIC_VISIBILITY_REQUIRED_DEPENDENCY_CLEAR_STANDARD_CUSTOM_PENDING_POST_HUMAN_QA [EXPECTED_POST_HUMAN_QA]
- LIXIL::インプラス: DYNAMIC_VISIBILITY_REQUIRED_DEPENDENCY_CLEAR_STANDARD_CUSTOM_PENDING_POST_HUMAN_QA [EXPECTED_POST_HUMAN_QA]

## 全シリーズ × 全窓種

### LIXIL / サーモスⅡ-H

Runtime: `v0.9-R4` / manifest `1_yIaBpnfppnj36IcuRoX9FBJhtrNngin`
Adapter: `PRODUCT_MODULE_RUNTIME_V1` / field universe: `ADAPTER_LITERAL_FIELD_UNIVERSE+SOURCE_COVERAGE_V2`
Field coverage: **PASS** / expected 32 / artifact 32

#### 単体引違い窓 (`WT-S2H-HIKICHIGAI`)

- FLOW_SIGNATURE: `FLOW-d13162fb39f54b97d64be940`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### シャッター付引違い窓 (`WT-S2H-SHUTTER-HIKI`)

- FLOW_SIGNATURE: `FLOW-8e8844bec8e573899a616b7d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 雨戸付引違い窓 (`WT-S2H-AMADO-HIKI`)

- FLOW_SIGNATURE: `FLOW-971cfb5c3d905adaffff42fc`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 面格子付引違い窓 (`WT-S2H-MENKOSHI-HIKI`)

- FLOW_SIGNATURE: `FLOW-f16e0f742650b4d145cead89`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 縦すべり出し窓 (`WT-S2H-TATE-SUBERI`)

- FLOW_SIGNATURE: `FLOW-0dff17cef69f1e3869e3d483`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 横すべり出し窓 (`WT-S2H-YOKO-SUBERI`)

- FLOW_SIGNATURE: `FLOW-f9ff618db57e7dfd46eacc85`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 高所用横すべり出し窓 (`WT-S2H-KOSHO-YOKO`)

- FLOW_SIGNATURE: `FLOW-271b7cc2af89901a84469723`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 上げ下げ窓FS (`WT-S2H-AGE-SAGE-FS`)

- FLOW_SIGNATURE: `FLOW-b890a16a19d0d22df311fead`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 面格子付上げ下げ窓FS (`WT-S2H-MENKOSHI-AGE-FS`)

- FLOW_SIGNATURE: `FLOW-aeb6d10b2e4d49731cbcdeb8`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### FIX窓（外押縁タイプ） (`WT-S2H-FIX-OUT`)

- FLOW_SIGNATURE: `FLOW-401b8588700671377b1b2f21`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### FIX窓（内押縁タイプ） (`WT-S2H-FIX-IN`)

- FLOW_SIGNATURE: `FLOW-401b8588700671377b1b2f21`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 内倒し窓 (`WT-S2H-UCHIDAOSHI`)

- FLOW_SIGNATURE: `FLOW-b890a16a19d0d22df311fead`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 外倒し窓 (`WT-S2H-SOTODAOSHI`)

- FLOW_SIGNATURE: `FLOW-78f416a65582771332fe294b`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 装飾引違い窓 (`WT-S2H-KAZARI-HIKI`)

- FLOW_SIGNATURE: `FLOW-226b4d87924e1cbd367d4d0b`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### テラスドア (`WT-S2H-TERRACE-DOOR`)

- FLOW_SIGNATURE: `FLOW-e48fe089eff40cfbc279f74c`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 採風勝手口ドアFS (`WT-S2H-KATTEGUCHI-VENT-FS`)

- FLOW_SIGNATURE: `FLOW-b0e4e2566086e3cb7fb30bd0`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 勝手口ドア (`WT-S2H-KATTEGUCHI`)

- FLOW_SIGNATURE: `FLOW-e8edb8c2ea77c8883816379a`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_installation | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_variant | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_additional | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_gas | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

### LIXIL / サーモスL

Runtime: `v0.7-R2` / manifest `1c-VIgwTqPDTkas0apYqx30AN3PVa71p1`
Adapter: `PRODUCT_MODULE_RUNTIME_V1` / field universe: `ADAPTER_LITERAL_FIELD_UNIVERSE+SOURCE_COVERAGE_V2`
Field coverage: **PASS** / expected 30 / artifact 30

#### 単体引違い窓 (`WT-SL-HIKICHIGAI`)

- FLOW_SIGNATURE: `FLOW-019c34ae853bf2457a5afe21`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### シャッター付引違い窓 (`WT-SL-SHUTTER-HIKI`)

- FLOW_SIGNATURE: `FLOW-b48b2b6d6d6144ab3d8e809c`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 雨戸付引違い窓 (`WT-SL-AMADO-HIKI`)

- FLOW_SIGNATURE: `FLOW-55c415412257e699c28d64cc`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 面格子付引違い窓 (`WT-SL-MENKOSHI-HIKI`)

- FLOW_SIGNATURE: `FLOW-2c4b983b247fa7962fbed8f0`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 縦すべり出し窓 (`WT-SL-TATE-SUBERI`)

- FLOW_SIGNATURE: `FLOW-dc6d43613a3a23231d9694f6`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 横すべり出し窓 (`WT-SL-YOKO-SUBERI`)

- FLOW_SIGNATURE: `FLOW-cda78388f79f9f3eafc13194`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 高所用横すべり出し窓 (`WT-SL-KOSHO-YOKO`)

- FLOW_SIGNATURE: `FLOW-fb2ff7dc7317cd767c0b4536`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 上げ下げ窓FS (`WT-SL-AGE-SAGE-FS`)

- FLOW_SIGNATURE: `FLOW-019c34ae853bf2457a5afe21`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 面格子付上げ下げ窓FS (`WT-SL-MENKOSHI-AGE-FS`)

- FLOW_SIGNATURE: `FLOW-2c4b983b247fa7962fbed8f0`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### FIX窓（外押縁タイプ） (`WT-SL-FIX-OUT`)

- FLOW_SIGNATURE: `FLOW-3d3dcad84bb745eba44be232`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### FIX窓（内押縁タイプ） (`WT-SL-FIX-IN`)

- FLOW_SIGNATURE: `FLOW-3d3dcad84bb745eba44be232`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 内倒し窓 (`WT-SL-UCHIDAOSHI`)

- FLOW_SIGNATURE: `FLOW-019c34ae853bf2457a5afe21`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 外倒し窓 (`WT-SL-SOTODAOSHI`)

- FLOW_SIGNATURE: `FLOW-0de65f6b64840f2c70e3fb9d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 装飾引違い窓 (`WT-SL-KAZARI-HIKI`)

- FLOW_SIGNATURE: `FLOW-0c111c9b3fdcf62b164db7bc`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### テラスドア (`WT-SL-TERRACE-DOOR`)

- FLOW_SIGNATURE: `FLOW-f35fabbe066cfb9f376ace36`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 採風勝手口ドアFS (`WT-SL-KATTEGUCHI-VENT-FS`)

- FLOW_SIGNATURE: `FLOW-ba41eeb773ed6dda2d41ce3a`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 勝手口ドア (`WT-SL-KATTEGUCHI`)

- FLOW_SIGNATURE: `FLOW-c6d74fa666cebb9d1219eb3f`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | rain_shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handle_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_method | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | composition_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | joinery_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | leaf_configuration | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | options | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

### LIXIL / EW

Runtime: `v1.3` / manifest `140pCgz2uhukjOjd1wymuISuAMjhaBpCS`
Adapter: `CANONICAL_WORKBOOK_REFERENCE_V1` / field universe: `NORMALIZED_MASTER+SOURCE_COVERAGE_V2`
Field coverage: **PASS** / expected 30 / artifact 30

#### 縦すべり出し窓 (`WT-EW-TATE-SUBERI`)

- FLOW_SIGNATURE: `FLOW-6475f372a83c52c018d4b50c`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### 横すべり出し窓 (`WT-EW-YOKO-SUBERI`)

- FLOW_SIGNATURE: `FLOW-7d605b9f65175b59e7c27e4a`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### 高所用横すべり出し窓 (`WT-EW-KOSHO-YOKO`)

- FLOW_SIGNATURE: `FLOW-247606b032143c147095dcad`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### 大開口横すべり出し窓 (`WT-EW-DAIKAIKO-YOKO`)

- FLOW_SIGNATURE: `FLOW-8c8f7d61c013890e38f31cdb`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### 開き窓テラス (`WT-EW-HIRAKI-TERRACE`)

- FLOW_SIGNATURE: `FLOW-7d605b9f65175b59e7c27e4a`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### FIX窓 (`WT-EW-FIX`)

- FLOW_SIGNATURE: `FLOW-361dbca55508b4350ca2f16f`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### 上げ下げ窓FS (`WT-EW-AGE-SAGE-FS`)

- FLOW_SIGNATURE: `FLOW-7d605b9f65175b59e7c27e4a`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### ドレーキップ窓 (`WT-EW-DREHKIPP`)

- FLOW_SIGNATURE: `FLOW-2327366c75227b04a7c22ddc`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED / allowed=— / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### デザイン連段窓 (`WT-EW-DESIGN-REN-DAN`)

- FLOW_SIGNATURE: `FLOW-3112201cbf24ac73e2585309`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### 外倒し窓 (`WT-EW-SOTODAOSHI`)

- FLOW_SIGNATURE: `FLOW-a5e9bd38eb1bbb5be35d8317`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED / allowed=— / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### 突出し窓 (`WT-EW-TSUKIDASHI`)

- FLOW_SIGNATURE: `FLOW-a5e9bd38eb1bbb5be35d8317`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED / allowed=— / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### 単体引違い窓 (`WT-EW-HIKICHIGAI`)

- FLOW_SIGNATURE: `FLOW-4f6e0c01fc0bad48befd8f10`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### シャッター付引違い窓 (`WT-EW-SHUTTER-HIKI`)

- FLOW_SIGNATURE: `FLOW-d85993b395e3e7951b5039e3`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### テラスドア (`WT-EW-TERRACE-DOOR`)

- FLOW_SIGNATURE: `FLOW-6475f372a83c52c018d4b50c`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

#### 勝手口ドア (`WT-EW-KATTEGUCHI`)

- FLOW_SIGNATURE: `FLOW-6475f372a83c52c018d4b50c`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | variant | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | configuration_variant | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | frame_angle | frame_angle | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | glass_configuration | ext.glass_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | profile | ext.profile | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | opening_class | ext.opening_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sill | ext.sill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | wall_finish | ext.wall_finish | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_w | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_h | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","screen_presence","screen_form"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","window_spec","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["glass_base","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | installation_environment | installation_environment | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","frame_angle"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | ["window_type","window_spec"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=USER_SELECTABLE / visibility=VISIBLE_AFTER_WINDOW_TYPE_SELECTION / allowed=WITHOUT_ANGLE, WITH_ANGLE / fixed=— / dependency=["window_type","window_spec"] / clear=UNVERIFIED_POST_HUMAN_QA / STANDARD-CUSTOM=UNVERIFIED_POST_HUMAN_QA

### LIXIL / TW

Runtime: `integrated-v0.4` / manifest `13doEdTkUlQNu4Dm-SNwkeUg8RkrjS5G0`
Adapter: `TW_CANONICAL_WORKBOOK_REFERENCE_V2` / field universe: `NORMALIZED_MASTER+SOURCE_COVERAGE_V2`
Field coverage: **PASS** / expected 25 / artifact 25

#### 単体引違い窓（フラットタイプ） (`SWT-LIX-TW-UNIT-HIKI-FLAT`)

- FLOW_SIGNATURE: `FLOW-e23b921be17b121e393e034d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### シャッター付引違い窓（フラットタイプ） (`SWT-LIX-TW-SHUT-HIKI-FLAT`)

- FLOW_SIGNATURE: `FLOW-ccc2bc4271cb534d52eda5dd`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 単体引違い窓 (`SWT-LIX-TW-UNIT-HIKI`)

- FLOW_SIGNATURE: `FLOW-e23b921be17b121e393e034d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### シャッター付引違い窓 (`SWT-LIX-TW-SHUT-HIKI`)

- FLOW_SIGNATURE: `FLOW-ccc2bc4271cb534d52eda5dd`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 面格子付引違い窓 (`SWT-LIX-TW-GRILLE-HIKI`)

- FLOW_SIGNATURE: `FLOW-82bedf03d78fcf63b270551e`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 縦すべり出し窓 T（グレモン） (`SWT-LIX-TW-TATE-GREMON-T`)

- FLOW_SIGNATURE: `FLOW-b8cf272c3c9fe3212c8935ff`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 縦すべり出し窓 TF（グレモン） (`SWT-LIX-TW-TATE-GREMON-TF`)

- FLOW_SIGNATURE: `FLOW-b8cf272c3c9fe3212c8935ff`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 縦すべり出し窓 TFT（グレモン） (`SWT-LIX-TW-TATE-GREMON-TFT`)

- FLOW_SIGNATURE: `FLOW-de825c375c09d8744351aa78`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 縦すべり出し窓 T（オペレーター） (`SWT-LIX-TW-TATE-OP-T`)

- FLOW_SIGNATURE: `FLOW-b8cf272c3c9fe3212c8935ff`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 横すべり出し窓（グレモン） (`SWT-LIX-TW-YOKO-GREMON`)

- FLOW_SIGNATURE: `FLOW-de825c375c09d8744351aa78`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 横すべり出し窓（オペレーター） (`SWT-LIX-TW-YOKO-OP`)

- FLOW_SIGNATURE: `FLOW-de825c375c09d8744351aa78`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 高所用横すべり出し窓 (`SWT-LIX-TW-HIGH-YOKO`)

- FLOW_SIGNATURE: `FLOW-19fa6d1a0edf3444227872f6`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 上げ下げ窓 (`SWT-LIX-TW-AGE-SAGE`)

- FLOW_SIGNATURE: `FLOW-de825c375c09d8744351aa78`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 面格子付上げ下げ窓 (`SWT-LIX-TW-GRILLE-AGE`)

- FLOW_SIGNATURE: `FLOW-82bedf03d78fcf63b270551e`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### FIX窓（内押縁タイプ）マド (`SWT-LIX-TW-FIX-IN-MADO`)

- FLOW_SIGNATURE: `FLOW-de825c375c09d8744351aa78`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### FIX窓（内押縁タイプ）在来テラス (`SWT-LIX-TW-FIX-IN-TR-ZAIRAI`)

- FLOW_SIGNATURE: `FLOW-de825c375c09d8744351aa78`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### FIX窓（内押縁タイプ）204テラス (`SWT-LIX-TW-FIX-IN-TR-204`)

- FLOW_SIGNATURE: `FLOW-de825c375c09d8744351aa78`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### FIX窓（内押縁タイプ）204テラス単純段差 (`SWT-LIX-TW-FIX-IN-TR-204-STEP`)

- FLOW_SIGNATURE: `FLOW-de825c375c09d8744351aa78`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 引違い窓（フラットタイプ）HK (`SWT-LIX-TW-DECO-HIKI-FLAT-HK`)

- FLOW_SIGNATURE: `FLOW-b8cf272c3c9fe3212c8935ff`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 引違い窓（フラットタイプ）HKK (`SWT-LIX-TW-DECO-HIKI-FLAT-HKK`)

- FLOW_SIGNATURE: `FLOW-de825c375c09d8744351aa78`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 引違い窓 HK (`SWT-LIX-TW-DECO-HIKI-HK`)

- FLOW_SIGNATURE: `FLOW-b8cf272c3c9fe3212c8935ff`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 引違い窓 HKK (`SWT-LIX-TW-DECO-HIKI-HKK`)

- FLOW_SIGNATURE: `FLOW-de825c375c09d8744351aa78`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### テラスドア (`SWT-LIX-TW-TERRACE-DOOR`)

- FLOW_SIGNATURE: `FLOW-b8cf272c3c9fe3212c8935ff`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 採風勝手口ドア FS (`SWT-LIX-TW-SAIHU-KATTEGUCHI`)

- FLOW_SIGNATURE: `FLOW-e3aed586120ea19e0f16dd5d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 勝手口ドア (`SWT-LIX-TW-KATTEGUCHI`)

- FLOW_SIGNATURE: `FLOW-b8cf272c3c9fe3212c8935ff`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operation_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | door_grille_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | operator_position | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | ["window_type","size_mode","panel_count"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size_mode"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_type | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","screen_presence","screen_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_base | glass_base | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_spacer | glass_spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail"] | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_air_layer | glass_air_layer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","glass_base","glass_type","glass_detail","glass_spacer"] | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["window_type","size","exterior_color","interior_color","glass_base"] | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

### YKK AP / APW430

Runtime: `20260918-R3` / manifest `1hyX2Fgu1m28xmkM5I53GZ-xC3PX0b9Hk`
Adapter: `APW430_FORMAL_SPLIT_V1` / field universe: `ADAPTER_LITERAL_FIELD_UNIVERSE+SOURCE_COVERAGE_V2`
Field coverage: **PASS** / expected 18 / artifact 18

#### FIX窓 窓タイプ (`SWT-YKK-APW430-FIX-MADO`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### FIX窓 テラスタイプ（在来） (`SWT-YKK-APW430-FIX-TR-ZAIRAI`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### FIX窓 テラスタイプ（2×4） (`SWT-YKK-APW430-FIX-TR-204`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### たてすべり出し窓（グレモンハンドル仕様）単窓 (`SWT-YKK-APW430-TATE-GREMON-SINGLE`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### たてすべり出し窓（グレモンハンドル仕様）＋FIX段窓 (`SWT-YKK-APW430-TATE-GREMON-FIX-DAN`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### たてすべり出し窓（グレモンハンドル仕様）＋FIX連窓 (`SWT-YKK-APW430-TATE-GREMON-FIX-REN`)

- FLOW_SIGNATURE: `FLOW-0ff8b3bfda7474a5f6fd913d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### たてすべり出し窓（グレモンハンドル仕様）ウインドキャッチ連窓 (`SWT-YKK-APW430-TATE-GREMON-WINDCATCH`)

- FLOW_SIGNATURE: `FLOW-0ff8b3bfda7474a5f6fd913d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### たてすべり出し窓（オペレーターハンドル仕様）単窓 (`SWT-YKK-APW430-TATE-OP-SINGLE`)

- FLOW_SIGNATURE: `FLOW-16106b6101f5be5f8e75aa0e`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### たてすべり出し窓（オペレーターハンドル仕様）＋FIX段窓 (`SWT-YKK-APW430-TATE-OP-FIX-DAN`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### たてすべり出し窓（オペレーターハンドル仕様）＋FIX連窓 (`SWT-YKK-APW430-TATE-OP-FIX-REN`)

- FLOW_SIGNATURE: `FLOW-0ff8b3bfda7474a5f6fd913d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### たてすべり出し窓（オペレーターハンドル仕様）ウインドキャッチ連窓 (`SWT-YKK-APW430-TATE-OP-WINDCATCH`)

- FLOW_SIGNATURE: `FLOW-0ff8b3bfda7474a5f6fd913d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### すべり出し窓（グレモンハンドル仕様）単窓 (`SWT-YKK-APW430-SUBERI-GREMON-SINGLE`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### すべり出し窓（グレモンハンドル仕様）＋FIX段窓 (`SWT-YKK-APW430-SUBERI-GREMON-FIX-DAN`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### すべり出し窓（グレモンハンドル仕様）＋FIX連窓 (`SWT-YKK-APW430-SUBERI-GREMON-FIX-REN`)

- FLOW_SIGNATURE: `FLOW-0ff8b3bfda7474a5f6fd913d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### すべり出し窓（オペレーターハンドル仕様）単窓 (`SWT-YKK-APW430-SUBERI-OP-SINGLE`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### すべり出し窓（オペレーターハンドル仕様）＋FIX段窓 (`SWT-YKK-APW430-SUBERI-OP-FIX-DAN`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### すべり出し窓（オペレーターハンドル仕様）＋FIX連窓 (`SWT-YKK-APW430-SUBERI-OP-FIX-REN`)

- FLOW_SIGNATURE: `FLOW-0ff8b3bfda7474a5f6fd913d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### 高所用すべり出し窓 単窓 (`SWT-YKK-APW430-HIGH-SINGLE`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### 高所用すべり出し窓（端部操作仕様）単窓 (`SWT-YKK-APW430-HIGH-ENDOP-SINGLE`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### ツーアクション窓 単窓 (`SWT-YKK-APW430-TWOACTION-SINGLE`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### ツーアクション窓＋FIX段窓 (`SWT-YKK-APW430-TWOACTION-FIX-DAN`)

- FLOW_SIGNATURE: `FLOW-fad9d84a4feca5b90cf58235`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### ツーアクション窓＋FIX連窓 (`SWT-YKK-APW430-TWOACTION-FIX-REN`)

- FLOW_SIGNATURE: `FLOW-0ff8b3bfda7474a5f6fd913d`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### 引違い窓 (`SWT-YKK-APW430-HIKI`)

- FLOW_SIGNATURE: `FLOW-993539d8a2c6815c09de1c5f`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### 面格子付引違い窓 (`SWT-YKK-APW430-MENKOSHI-HIKI`)

- FLOW_SIGNATURE: `FLOW-993539d8a2c6815c09de1c5f`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

#### シャッター付引違い窓 (`SWT-YKK-APW430-SHUTTER-HIKI`)

- FLOW_SIGNATURE: `FLOW-993539d8a2c6815c09de1c5f`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_spec | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | [[]] | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | handing | handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED_FOR_SERIES_BASELINE | トリプルガラス |
| GLAZING | glass_spacer | — | FIXED | 樹脂 |
| GLAZING | gas | — | FIXED | アルゴン |
| GLAZING | glass_air_layer | — | DERIVED | window-group + glass composition; triple-glass air-layer thickness is not user-selectable |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | glass_manufacturability_rules |

### YKK AP / APW431

Runtime: `v1.2` / manifest `16-hPgdJYmkl30MvonP_natv3bPV1C-3x`
Adapter: `APW431_FORMAL_SPLIT_V1` / field universe: `ADAPTER_LITERAL_FIELD_UNIVERSE+SOURCE_COVERAGE_V2`
Field coverage: **PASS** / expected 19 / artifact 19

#### 引違いテラス戸 (`W431-001`)

- FLOW_SIGNATURE: `FLOW-0a9243b1cad62164df3b693b`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | region_standard | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED | TRIPLE_GLAZING |
| GLAZING | glass_low_e | — | FIXED | DOUBLE_LOW_E |
| GLAZING | glass_spacer | — | FIXED | RESIN |
| GLAZING | gas | — | FIXED | ARGON |
| GLAZING | glass_air_layer | — | DERIVED | BY_YKKAP_GLASS_CODE |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | BY_YKKAP_GLASS_CODE |

#### シャッター付引違いテラス戸 (`W431-002`)

- FLOW_SIGNATURE: `FLOW-f72b39c6fc74b6280728df62`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | region_standard | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED | TRIPLE_GLAZING |
| GLAZING | glass_low_e | — | FIXED | DOUBLE_LOW_E |
| GLAZING | glass_spacer | — | FIXED | RESIN |
| GLAZING | gas | — | FIXED | ARGON |
| GLAZING | glass_air_layer | — | DERIVED | BY_YKKAP_GLASS_CODE |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | BY_YKKAP_GLASS_CODE |

#### 大開口スライディング (`W431-003`)

- FLOW_SIGNATURE: `FLOW-0a9243b1cad62164df3b693b`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | region_standard | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED | TRIPLE_GLAZING |
| GLAZING | glass_low_e | — | FIXED | DOUBLE_LOW_E |
| GLAZING | glass_spacer | — | FIXED | RESIN |
| GLAZING | gas | — | FIXED | ARGON |
| GLAZING | glass_air_layer | — | DERIVED | BY_YKKAP_GLASS_CODE |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | BY_YKKAP_GLASS_CODE |

#### 開き窓テラス (`W431-004`)

- FLOW_SIGNATURE: `FLOW-f72b39c6fc74b6280728df62`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | region_standard | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED | TRIPLE_GLAZING |
| GLAZING | glass_low_e | — | FIXED | DOUBLE_LOW_E |
| GLAZING | glass_spacer | — | FIXED | RESIN |
| GLAZING | gas | — | FIXED | ARGON |
| GLAZING | glass_air_layer | — | DERIVED | BY_YKKAP_GLASS_CODE |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | BY_YKKAP_GLASS_CODE |

#### テラスドア (`W431-005`)

- FLOW_SIGNATURE: `FLOW-f72b39c6fc74b6280728df62`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | region_standard | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED | TRIPLE_GLAZING |
| GLAZING | glass_low_e | — | FIXED | DOUBLE_LOW_E |
| GLAZING | glass_spacer | — | FIXED | RESIN |
| GLAZING | gas | — | FIXED | ARGON |
| GLAZING | glass_air_layer | — | DERIVED | BY_YKKAP_GLASS_CODE |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | BY_YKKAP_GLASS_CODE |

#### 勝手口ドア (`W431-006`)

- FLOW_SIGNATURE: `FLOW-0a9243b1cad62164df3b693b`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → SCREEN → GLAZING → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | region_standard | window_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | window_configuration | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | shutter_type | window_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | panel_count | panel_count | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_width | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | custom_height | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size | size | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | exterior_color | exterior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | interior_color | interior_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_presence | screen_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_form | screen_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_midrail | screen_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SCREEN | screen_net | screen_net | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_function | glass_function | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option | option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

**Fixed / Derived Runtime Properties (not selectors)**

| Stage | Runtime property | Canonical Slot | classification | value / rule |
|---|---|---|---|---|
| GLAZING | glass_base | — | FIXED | TRIPLE_GLAZING |
| GLAZING | glass_low_e | — | FIXED | DOUBLE_LOW_E |
| GLAZING | glass_spacer | — | FIXED | RESIN |
| GLAZING | gas | — | FIXED | ARGON |
| GLAZING | glass_air_layer | — | DERIVED | BY_YKKAP_GLASS_CODE |
| GLAZING | glass_composition | — | DERIVED_TECHNICAL_METADATA | BY_YKKAP_GLASS_CODE |

### YKK AP / ウチリモ 内窓

Runtime: `v1.0-P7R1-R2` / manifest `1119yamXn21wLZd3C8LvamNWsTAx_1dt2`
Adapter: `UCHIRIMO_TABULAR_V1` / field universe: `NORMALIZED_MASTER+SOURCE_COVERAGE_V2`
Field coverage: **PASS** / expected 92 / artifact 92

#### 引違い窓 (`sliding_window`)

- FLOW_SIGNATURE: `FLOW-fed7b4dee1cb44cff99f30f7`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | room_specification | room_specification | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sash_configuration | sash_configuration | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | reverse_handing | reverse_handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | three_panel_layout | three_panel_layout | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | hinge_side | hinge_side | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_class | size_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_w | size_w | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_h | size_h | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_width_allocation | sash_width_allocation | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w1 | sash_w1 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w2 | sash_w2 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w3 | sash_w3 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w4 | sash_w4 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | frame_color | frame_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_family | glass_family | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_structure | glass_structure | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | low_e_type | low_e_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_coating_color | glass_coating_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_surface_type | glass_surface_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | safety_treatment | safety_treatment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | grille_type | grille_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | grille_material | grille_material | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | muntin_type | muntin_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | vacuum_glass_product | vacuum_glass_product | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | spacer_type | spacer_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | gas_fill | gas_fill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | cavity_thickness_mm | cavity_thickness_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_installation_mode | frame_installation_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_projection | frame_projection | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | extension_frame_type | extension_frame_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | extension_frame_reinforcement | extension_frame_reinforcement | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | bathroom_installation_type | installation_environment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | crescent_position | crescent_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_top | extension:installation:opening_w_top | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_middle | extension:installation:opening_w_middle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_bottom | extension:installation:opening_w_bottom | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_left | extension:installation:opening_h_left | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_middle | extension:installation:opening_h_middle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_right | extension:installation:opening_h_right | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | diagonal_1 | extension:installation:diagonal_1 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | diagonal_2 | extension:installation:diagonal_2 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | available_mounting_depth | extension:installation:available_mounting_depth | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_window_interference | extension:installation:existing_window_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_hardware_interference | extension:installation:existing_hardware_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | structural_support_condition | extension:installation:structural_support_condition | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_support_condition | extension:installation:floor_support_condition | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | construction | extension:installation:construction | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_projection_a_mm | extension:installation:jamb_projection_a_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_face_b_mm | extension:installation:jamb_face_b_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h_mm | extension:installation:jamb_height_h_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h1_mm | extension:installation:jamb_height_h1_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h2_mm | extension:installation:jamb_height_h2_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h3_mm | extension:installation:jamb_height_h3_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sill_upper_c_mm | extension:installation:sill_upper_c_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sill_lower_d_mm | extension:installation:sill_lower_d_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | wall_surface_for_reinforcement_available | extension:installation:wall_surface_for_reinforcement_available | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_present | extension:installation:substrate_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_wall_gap_present | extension:installation:substrate_wall_gap_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_or_structure_present | extension:installation:substrate_or_structure_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_or_structure_wall_gap_present | extension:installation:substrate_or_structure_wall_gap_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | stud_spacing_condition_met | extension:installation:stud_spacing_condition_met | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | tool_floor_interference | extension:installation:tool_floor_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_supports_load | extension:installation:floor_supports_load | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_screw_holding | extension:installation:floor_screw_holding | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | baseboard_interference | extension:installation:baseboard_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | vertical_horizontal_jamb_step_e_mm | extension:installation:vertical_horizontal_jamb_step_e_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_mounting_surface_horizontal_or_adjustable | extension:installation:lower_mounting_surface_horizontal_or_adjustable | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | mounting_surface_flat | extension:installation:mounting_surface_flat | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | mounting_surface_damage_protection | extension:installation:mounting_surface_damage_protection | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | resin_jamb_face_screw_fixed | extension:installation:resin_jamb_face_screw_fixed | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_resin_jamb_space_mm | extension:installation:lower_resin_jamb_space_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_lower_jamb_angle_present | extension:installation:existing_lower_jamb_angle_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_jamb_a_mm | extension:installation:lower_jamb_a_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_jamb_a_prime_mm | extension:installation:lower_jamb_a_prime_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | hardware_tip_mounting_depth_A_mm | extension:installation:hardware_tip_mounting_depth_A_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_angle_height_mm | extension:installation:existing_angle_height_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_angle_tip_mm | extension:installation:existing_angle_tip_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | system_bath_component_screw_interference | extension:installation:system_bath_component_screw_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_window_to_jamb_step_large | extension:installation:existing_window_to_jamb_step_large | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | crescent_presence | extension:option:crescent_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | crescent_type | extension:option:crescent_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | pull_handle_type | extension:option:pull_handle_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | pull_handle_position | extension:option:pull_handle_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | operating_handle_type | extension:option:operating_handle_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | middle_rail_option | extension:option:middle_rail_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | middle_rail_position | extension:option:middle_rail_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | ventilator_option | extension:option:ventilator_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | bottom_rail_type | extension:option:bottom_rail_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | arm_stopper_option | extension:option:arm_stopper_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | outside_handle_option | extension:option:outside_handle_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### FIX窓 (`fix_window`)

- FLOW_SIGNATURE: `FLOW-bbdbb04e28c9ef51af6f95b7`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | room_specification | room_specification | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sash_configuration | sash_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | reverse_handing | reverse_handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | three_panel_layout | three_panel_layout | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | hinge_side | hinge_side | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_class | size_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_w | size_w | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_h | size_h | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_width_allocation | sash_width_allocation | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w1 | sash_w1 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w2 | sash_w2 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w3 | sash_w3 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w4 | sash_w4 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | frame_color | frame_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_family | glass_family | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_structure | glass_structure | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | low_e_type | low_e_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_coating_color | glass_coating_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_surface_type | glass_surface_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | safety_treatment | safety_treatment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | grille_type | grille_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | grille_material | grille_material | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | muntin_type | muntin_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | vacuum_glass_product | vacuum_glass_product | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | spacer_type | spacer_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | gas_fill | gas_fill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | cavity_thickness_mm | cavity_thickness_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_installation_mode | frame_installation_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_projection | frame_projection | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | extension_frame_type | extension_frame_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | extension_frame_reinforcement | extension_frame_reinforcement | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | bathroom_installation_type | installation_environment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | crescent_position | crescent_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_top | extension:installation:opening_w_top | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_middle | extension:installation:opening_w_middle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_bottom | extension:installation:opening_w_bottom | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_left | extension:installation:opening_h_left | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_middle | extension:installation:opening_h_middle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_right | extension:installation:opening_h_right | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | diagonal_1 | extension:installation:diagonal_1 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | diagonal_2 | extension:installation:diagonal_2 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | available_mounting_depth | extension:installation:available_mounting_depth | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_window_interference | extension:installation:existing_window_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_hardware_interference | extension:installation:existing_hardware_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | structural_support_condition | extension:installation:structural_support_condition | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_support_condition | extension:installation:floor_support_condition | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | construction | extension:installation:construction | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_projection_a_mm | extension:installation:jamb_projection_a_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_face_b_mm | extension:installation:jamb_face_b_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h_mm | extension:installation:jamb_height_h_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h1_mm | extension:installation:jamb_height_h1_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h2_mm | extension:installation:jamb_height_h2_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h3_mm | extension:installation:jamb_height_h3_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sill_upper_c_mm | extension:installation:sill_upper_c_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sill_lower_d_mm | extension:installation:sill_lower_d_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | wall_surface_for_reinforcement_available | extension:installation:wall_surface_for_reinforcement_available | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_present | extension:installation:substrate_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_wall_gap_present | extension:installation:substrate_wall_gap_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_or_structure_present | extension:installation:substrate_or_structure_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_or_structure_wall_gap_present | extension:installation:substrate_or_structure_wall_gap_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | stud_spacing_condition_met | extension:installation:stud_spacing_condition_met | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | tool_floor_interference | extension:installation:tool_floor_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_supports_load | extension:installation:floor_supports_load | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_screw_holding | extension:installation:floor_screw_holding | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | baseboard_interference | extension:installation:baseboard_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | vertical_horizontal_jamb_step_e_mm | extension:installation:vertical_horizontal_jamb_step_e_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_mounting_surface_horizontal_or_adjustable | extension:installation:lower_mounting_surface_horizontal_or_adjustable | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | mounting_surface_flat | extension:installation:mounting_surface_flat | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | mounting_surface_damage_protection | extension:installation:mounting_surface_damage_protection | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | resin_jamb_face_screw_fixed | extension:installation:resin_jamb_face_screw_fixed | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_resin_jamb_space_mm | extension:installation:lower_resin_jamb_space_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_lower_jamb_angle_present | extension:installation:existing_lower_jamb_angle_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_jamb_a_mm | extension:installation:lower_jamb_a_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_jamb_a_prime_mm | extension:installation:lower_jamb_a_prime_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | hardware_tip_mounting_depth_A_mm | extension:installation:hardware_tip_mounting_depth_A_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_angle_height_mm | extension:installation:existing_angle_height_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_angle_tip_mm | extension:installation:existing_angle_tip_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | system_bath_component_screw_interference | extension:installation:system_bath_component_screw_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_window_to_jamb_step_large | extension:installation:existing_window_to_jamb_step_large | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | crescent_presence | extension:option:crescent_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | crescent_type | extension:option:crescent_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | pull_handle_type | extension:option:pull_handle_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | pull_handle_position | extension:option:pull_handle_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | operating_handle_type | extension:option:operating_handle_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | middle_rail_option | extension:option:middle_rail_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | middle_rail_position | extension:option:middle_rail_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | ventilator_option | extension:option:ventilator_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | bottom_rail_type | extension:option:bottom_rail_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | arm_stopper_option | extension:option:arm_stopper_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | outside_handle_option | extension:option:outside_handle_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 内開き窓 (`inward_opening_window`)

- FLOW_SIGNATURE: `FLOW-be22619f235740187eda49a3`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | room_specification | room_specification | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sash_configuration | sash_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | reverse_handing | reverse_handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | three_panel_layout | three_panel_layout | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | hinge_side | hinge_side | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_class | size_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_w | size_w | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_h | size_h | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_width_allocation | sash_width_allocation | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w1 | sash_w1 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w2 | sash_w2 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w3 | sash_w3 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w4 | sash_w4 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | frame_color | frame_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_family | glass_family | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_structure | glass_structure | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | low_e_type | low_e_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_coating_color | glass_coating_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_surface_type | glass_surface_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | safety_treatment | safety_treatment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | grille_type | grille_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | grille_material | grille_material | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | muntin_type | muntin_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | vacuum_glass_product | vacuum_glass_product | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | spacer_type | spacer_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | gas_fill | gas_fill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | cavity_thickness_mm | cavity_thickness_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_installation_mode | frame_installation_mode | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_projection | frame_projection | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | extension_frame_type | extension_frame_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | extension_frame_reinforcement | extension_frame_reinforcement | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | bathroom_installation_type | installation_environment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | crescent_position | crescent_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_top | extension:installation:opening_w_top | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_middle | extension:installation:opening_w_middle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_bottom | extension:installation:opening_w_bottom | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_left | extension:installation:opening_h_left | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_middle | extension:installation:opening_h_middle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_right | extension:installation:opening_h_right | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | diagonal_1 | extension:installation:diagonal_1 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | diagonal_2 | extension:installation:diagonal_2 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | available_mounting_depth | extension:installation:available_mounting_depth | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_window_interference | extension:installation:existing_window_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_hardware_interference | extension:installation:existing_hardware_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | structural_support_condition | extension:installation:structural_support_condition | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_support_condition | extension:installation:floor_support_condition | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | construction | extension:installation:construction | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_projection_a_mm | extension:installation:jamb_projection_a_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_face_b_mm | extension:installation:jamb_face_b_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h_mm | extension:installation:jamb_height_h_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h1_mm | extension:installation:jamb_height_h1_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h2_mm | extension:installation:jamb_height_h2_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h3_mm | extension:installation:jamb_height_h3_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sill_upper_c_mm | extension:installation:sill_upper_c_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sill_lower_d_mm | extension:installation:sill_lower_d_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | wall_surface_for_reinforcement_available | extension:installation:wall_surface_for_reinforcement_available | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_present | extension:installation:substrate_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_wall_gap_present | extension:installation:substrate_wall_gap_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_or_structure_present | extension:installation:substrate_or_structure_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_or_structure_wall_gap_present | extension:installation:substrate_or_structure_wall_gap_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | stud_spacing_condition_met | extension:installation:stud_spacing_condition_met | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | tool_floor_interference | extension:installation:tool_floor_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_supports_load | extension:installation:floor_supports_load | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_screw_holding | extension:installation:floor_screw_holding | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | baseboard_interference | extension:installation:baseboard_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | vertical_horizontal_jamb_step_e_mm | extension:installation:vertical_horizontal_jamb_step_e_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_mounting_surface_horizontal_or_adjustable | extension:installation:lower_mounting_surface_horizontal_or_adjustable | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | mounting_surface_flat | extension:installation:mounting_surface_flat | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | mounting_surface_damage_protection | extension:installation:mounting_surface_damage_protection | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | resin_jamb_face_screw_fixed | extension:installation:resin_jamb_face_screw_fixed | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_resin_jamb_space_mm | extension:installation:lower_resin_jamb_space_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_lower_jamb_angle_present | extension:installation:existing_lower_jamb_angle_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_jamb_a_mm | extension:installation:lower_jamb_a_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_jamb_a_prime_mm | extension:installation:lower_jamb_a_prime_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | hardware_tip_mounting_depth_A_mm | extension:installation:hardware_tip_mounting_depth_A_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_angle_height_mm | extension:installation:existing_angle_height_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_angle_tip_mm | extension:installation:existing_angle_tip_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | system_bath_component_screw_interference | extension:installation:system_bath_component_screw_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_window_to_jamb_step_large | extension:installation:existing_window_to_jamb_step_large | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | crescent_presence | extension:option:crescent_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | crescent_type | extension:option:crescent_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | pull_handle_type | extension:option:pull_handle_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | pull_handle_position | extension:option:pull_handle_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | operating_handle_type | extension:option:operating_handle_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | middle_rail_option | extension:option:middle_rail_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | middle_rail_position | extension:option:middle_rail_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | ventilator_option | extension:option:ventilator_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | bottom_rail_type | extension:option:bottom_rail_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | arm_stopper_option | extension:option:arm_stopper_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | outside_handle_option | extension:option:outside_handle_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 開き窓テラス (`opening_window_terrace`)

- FLOW_SIGNATURE: `FLOW-8dec0712b98117124625f421`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | room_specification | room_specification | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sash_configuration | sash_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | reverse_handing | reverse_handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | three_panel_layout | three_panel_layout | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | hinge_side | hinge_side | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_class | size_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_w | size_w | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_h | size_h | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_width_allocation | sash_width_allocation | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w1 | sash_w1 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w2 | sash_w2 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w3 | sash_w3 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | sash_w4 | sash_w4 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| FINISH | frame_color | frame_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_family | glass_family | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_structure | glass_structure | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | low_e_type | low_e_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_coating_color | glass_coating_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_surface_type | glass_surface_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | safety_treatment | safety_treatment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | grille_type | grille_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | grille_material | grille_material | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | muntin_type | muntin_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | vacuum_glass_product | vacuum_glass_product | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | spacer_type | spacer_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | gas_fill | gas_fill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | cavity_thickness_mm | cavity_thickness_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_installation_mode | frame_installation_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_projection | frame_projection | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | extension_frame_type | extension_frame_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | extension_frame_reinforcement | extension_frame_reinforcement | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | bathroom_installation_type | installation_environment | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | crescent_position | crescent_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_top | extension:installation:opening_w_top | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_middle | extension:installation:opening_w_middle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_w_bottom | extension:installation:opening_w_bottom | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_left | extension:installation:opening_h_left | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_middle | extension:installation:opening_h_middle | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | opening_h_right | extension:installation:opening_h_right | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | diagonal_1 | extension:installation:diagonal_1 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | diagonal_2 | extension:installation:diagonal_2 | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | available_mounting_depth | extension:installation:available_mounting_depth | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_window_interference | extension:installation:existing_window_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_hardware_interference | extension:installation:existing_hardware_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | structural_support_condition | extension:installation:structural_support_condition | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_support_condition | extension:installation:floor_support_condition | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | construction | extension:installation:construction | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_projection_a_mm | extension:installation:jamb_projection_a_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_face_b_mm | extension:installation:jamb_face_b_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h_mm | extension:installation:jamb_height_h_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h1_mm | extension:installation:jamb_height_h1_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h2_mm | extension:installation:jamb_height_h2_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | jamb_height_h3_mm | extension:installation:jamb_height_h3_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sill_upper_c_mm | extension:installation:sill_upper_c_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sill_lower_d_mm | extension:installation:sill_lower_d_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | wall_surface_for_reinforcement_available | extension:installation:wall_surface_for_reinforcement_available | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_present | extension:installation:substrate_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_wall_gap_present | extension:installation:substrate_wall_gap_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_or_structure_present | extension:installation:substrate_or_structure_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | substrate_or_structure_wall_gap_present | extension:installation:substrate_or_structure_wall_gap_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | stud_spacing_condition_met | extension:installation:stud_spacing_condition_met | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | tool_floor_interference | extension:installation:tool_floor_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_supports_load | extension:installation:floor_supports_load | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | floor_screw_holding | extension:installation:floor_screw_holding | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | baseboard_interference | extension:installation:baseboard_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | vertical_horizontal_jamb_step_e_mm | extension:installation:vertical_horizontal_jamb_step_e_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_mounting_surface_horizontal_or_adjustable | extension:installation:lower_mounting_surface_horizontal_or_adjustable | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | mounting_surface_flat | extension:installation:mounting_surface_flat | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | mounting_surface_damage_protection | extension:installation:mounting_surface_damage_protection | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | resin_jamb_face_screw_fixed | extension:installation:resin_jamb_face_screw_fixed | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_resin_jamb_space_mm | extension:installation:lower_resin_jamb_space_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_lower_jamb_angle_present | extension:installation:existing_lower_jamb_angle_present | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_jamb_a_mm | extension:installation:lower_jamb_a_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | lower_jamb_a_prime_mm | extension:installation:lower_jamb_a_prime_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | hardware_tip_mounting_depth_A_mm | extension:installation:hardware_tip_mounting_depth_A_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_angle_height_mm | extension:installation:existing_angle_height_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_angle_tip_mm | extension:installation:existing_angle_tip_mm | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | system_bath_component_screw_interference | extension:installation:system_bath_component_screw_interference | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | existing_window_to_jamb_step_large | extension:installation:existing_window_to_jamb_step_large | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | crescent_presence | extension:option:crescent_presence | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | crescent_type | extension:option:crescent_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | pull_handle_type | extension:option:pull_handle_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | pull_handle_position | extension:option:pull_handle_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | operating_handle_type | extension:option:operating_handle_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | middle_rail_option | extension:option:middle_rail_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | middle_rail_position | extension:option:middle_rail_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | ventilator_option | extension:option:ventilator_option | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | bottom_rail_type | extension:option:bottom_rail_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | arm_stopper_option | extension:option:arm_stopper_option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | outside_handle_option | extension:option:outside_handle_option | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

### LIXIL / インプラス

Runtime: `v0.4-R2` / manifest `1TokjIpcipm8TPxwrSO0FjyPxxvhCq5iZ`
Adapter: `SEMANTIC_TABLE_BUNDLE_V2` / field universe: `NORMALIZED_MASTER+SOURCE_COVERAGE_V2`
Field coverage: **PASS** / expected 24 / artifact 24

#### 引違い窓 (`引違い窓`)

- FLOW_SIGNATURE: `FLOW-638a3d0f609fb439f0c973c0`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sash_configuration | sash_configuration | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | reverse_handing | reverse_handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | hinge_side | hinge_side | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_class | size_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | order_width | order_width | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["size_mode","window_type","sash_configuration","size_class","upper_frame_spec","joint_layout","glass_family","glass_type","lowe_color","cavity_fill","supply_form","glass_detail","decorative_pattern"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | order_height | order_height | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["size_mode","window_type","sash_configuration","size_class","upper_frame_spec","joint_layout","glass_family","glass_type","lowe_color","cavity_fill","supply_form","glass_detail","decorative_pattern"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | body_color | body_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_family | glass_family | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | supply_form | supply_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | decorative_pattern | decorative_pattern | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | lowe_color | lowe_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | spacer | spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | cavity_fill | cavity_fill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | upper_frame_spec | upper_frame_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sash_midrail | sash_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | crescent_position | crescent_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_install_spec | frame_install_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | fukashi_spec | fukashi_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | joint_layout | joint_layout | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option_items | option_items | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### FIX窓 (`FIX窓`)

- FLOW_SIGNATURE: `FLOW-2732e155fe65b1d51de15649`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sash_configuration | sash_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | reverse_handing | reverse_handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | hinge_side | hinge_side | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_class | size_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | order_width | order_width | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["size_mode","window_type","sash_configuration","size_class","upper_frame_spec","joint_layout","glass_family","glass_type","lowe_color","cavity_fill","supply_form","glass_detail","decorative_pattern"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | order_height | order_height | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["size_mode","window_type","sash_configuration","size_class","upper_frame_spec","joint_layout","glass_family","glass_type","lowe_color","cavity_fill","supply_form","glass_detail","decorative_pattern"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | body_color | body_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_family | glass_family | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | supply_form | supply_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | decorative_pattern | decorative_pattern | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | lowe_color | lowe_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | spacer | spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | cavity_fill | cavity_fill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | upper_frame_spec | upper_frame_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sash_midrail | sash_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | crescent_position | crescent_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_install_spec | frame_install_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | fukashi_spec | fukashi_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | joint_layout | joint_layout | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option_items | option_items | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### 開き窓 (`開き窓`)

- FLOW_SIGNATURE: `FLOW-f4458d88c113286c5ec519ea`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sash_configuration | sash_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | reverse_handing | reverse_handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | hinge_side | hinge_side | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_class | size_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | order_width | order_width | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["size_mode","window_type","sash_configuration","size_class","upper_frame_spec","joint_layout","glass_family","glass_type","lowe_color","cavity_fill","supply_form","glass_detail","decorative_pattern"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | order_height | order_height | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["size_mode","window_type","sash_configuration","size_class","upper_frame_spec","joint_layout","glass_family","glass_type","lowe_color","cavity_fill","supply_form","glass_detail","decorative_pattern"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | body_color | body_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_family | glass_family | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | supply_form | supply_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | decorative_pattern | decorative_pattern | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | lowe_color | lowe_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | spacer | spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | cavity_fill | cavity_fill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | upper_frame_spec | upper_frame_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sash_midrail | sash_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | crescent_position | crescent_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_install_spec | frame_install_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | fukashi_spec | fukashi_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | joint_layout | joint_layout | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option_items | option_items | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

#### テラスドア (`テラスドア`)

- FLOW_SIGNATURE: `FLOW-f4458d88c113286c5ec519ea`
- Stage order: OPENING → CONFIGURATION → SIZE → FINISH → GLAZING → INSTALLATION_SURVEY → OPTION
- STANDARD: UNVERIFIED_UNTIL_SELECTOR_EXPANSION
- CUSTOM: VISIBLE_AFTER_WINDOW_TYPE_SELECTION
- Option: PRESENT_OR_CONDITIONAL
- Verification: HUMAN_REVIEW_BASELINE_WITH_EXPLICIT_UNVERIFIED_DYNAMIC_RULES

| Stage | Runtime field | Canonical Slot | visibility | required | dependency | downstream clear |
|---|---|---|---|---|---|---|
| OPENING | window_type | window_type | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | sash_configuration | sash_configuration | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | reverse_handing | reverse_handing | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| CONFIGURATION | hinge_side | hinge_side | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_class | size_class | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | size_mode | size_mode | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | true | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| SIZE | order_width | order_width | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["size_mode","window_type","sash_configuration","size_class","upper_frame_spec","joint_layout","glass_family","glass_type","lowe_color","cavity_fill","supply_form","glass_detail","decorative_pattern"] | UNVERIFIED_POST_HUMAN_QA |
| SIZE | order_height | order_height | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | ["size_mode","window_type","sash_configuration","size_class","upper_frame_spec","joint_layout","glass_family","glass_type","lowe_color","cavity_fill","supply_form","glass_detail","decorative_pattern"] | UNVERIFIED_POST_HUMAN_QA |
| FINISH | body_color | body_color | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_family | glass_family | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_type | glass_type | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | supply_form | supply_form | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | glass_detail | glass_detail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | decorative_pattern | decorative_pattern | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | lowe_color | lowe_color | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | spacer | spacer | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| GLAZING | cavity_fill | cavity_fill | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | upper_frame_spec | upper_frame_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | sash_midrail | sash_midrail | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | crescent_position | crescent_position | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | frame_install_spec | frame_install_spec | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | fukashi_spec | fukashi_spec | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| INSTALLATION_SURVEY | joint_layout | joint_layout | RUNTIME_CONDITIONAL_OR_NOT_APPLICABLE_UNVERIFIED | RUNTIME_DEPENDENT_OR_UNSPECIFIED | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
| OPTION | option_items | option_items | VISIBLE_AFTER_WINDOW_TYPE_SELECTION | false | none/unspecified | UNVERIFIED_POST_HUMAN_QA |
- frame_angle: classification=NOT_APPLICABLE_OR_PRODUCT_MASTER_GAP_UNVERIFIED / visibility=ABSENT_FROM_FORMAL_RUNTIME / allowed=— / fixed=— / dependency=[] / clear=NOT_APPLICABLE_OR_UNVERIFIED / STANDARD-CUSTOM=NO_RUNTIME_PROJECTION_TO_EVALUATE

## Review boundary

This artifact is built from the union of authoritative source field definitions and per-window baseline Runtime fields, then reconciled against the rendered Human Review field universe. Any authoritative or baseline-visible field omission is a blocking completeness failure. Selector-dependent visibility/required/dependency/downstream-clear and STANDARD/CUSTOM validity remain explicitly UNVERIFIED until post-Human Full Coverage QA.

