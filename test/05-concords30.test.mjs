import test from "node:test";
import assert from "node:assert/strict";
import { createCatalog, validateCatalog } from "../src/catalog/catalog-adapter.mjs";
import { stabilizeSelection } from "../src/catalog/catalog-resolver.mjs";
import { CURRENT_WINDOW_SERIES_MODULES } from "../src/catalog/modules/current-window-series.mjs";
import { CONCORDS30_MODULE } from "../src/catalog/modules/concords30-module.mjs";

const productId="SER-YKK-CONCORD-S30";
const catalog=createCatalog([...CURRENT_WINDOW_SERIES_MODULES,CONCORDS30_MODULE]);
const resolve=input=>stabilizeSelection(catalog,productId,input);
const codes=r=>r.validation.errors.map(e=>e.errorCode);

test("52 Concord S30 canonical v1.0 is runtime ready",()=>{
  const p=catalog.products.find(row=>row.id===productId);
  assert.equal(p.masterVersion,"1.0");
  assert.equal(p.runtimeReady,true);
  assert.equal(p.recoveryStatus,"MASTER_COMPLETE");
  validateCatalog(catalog);
});

test("53 non-fire sleeve manual resolves symbols and official standard dimensions",()=>{
  const r=resolve({
    fire_spec:"non_fire",panel_type:"insulated",design_code:"N05N",frame_type:"sleeve",handing:"right",
    size_type:"standard",size_module:"kanto",door_color:"PR",frame_color:"BE",
    lock_system:"manual",handle_color:"black",cylinder_type:"ps_miwa",closer_inclusion:"included",
    sleeve_glass_procurement:"ykk_unit",sleeve_glass_spec:"low_e_laminated_double"
  });
  assert.equal(r.validation.status,"VALID");
  assert.equal(r.resolvedFields.frame_width_mm,1690);
  assert.equal(r.resolvedFields.frame_height_mm,2235);
  assert.equal(r.resolvedFields.door_leaf_width_mm,896);
  assert.equal(r.resolvedFields.door_leaf_height_mm,2207);
  assert.equal(r.orderConfiguration.symbols["CONCORD-DOOR-SET"],"BE3EH-152N05NPR-R");
  assert.ok(r.orderConfiguration.components.some(x=>x.productSymbol==="YSKAG-H-S01C-D"));
  assert.ok(r.orderConfiguration.components.some(x=>x.productSymbol==="YSKAG-S-S1C2-D"));
});

test("54 fire pitatto battery resolves N/A, closer and K4 symbol",()=>{
  const r=resolve({
    fire_spec:"fire_door",design_code:"N05N",frame_type:"outside_retract",handing:"left",
    size_type:"standard",size_module:"kanto",door_color:"PR",frame_color:"BE",
    lock_system:"smart_control_key",smart_key_type:"pitatto_key",power_supply:"battery",handle_color:"silver"
  });
  assert.equal(r.validation.status,"VALID");
  assert.equal(r.resolvedFields.panel_type,"NOT_APPLICABLE");
  assert.equal(r.resolvedFields.closer_inclusion,"included");
  assert.equal(r.resolvedFields.sleeve_glass_procurement,"NOT_APPLICABLE");
  assert.equal(r.resolvedFields.key_code,"K4");
  assert.equal(r.orderConfiguration.symbols["CONCORD-DOOR-SET"],"BE3SL-911N05NPR-LK4");
  assert.ok(r.orderConfiguration.components.some(x=>x.productSymbol==="YSKAG-H-S51ALK-DV"));
});

test("55 raw invalid combinations keep stable Concord error codes",()=>{
  const r=resolve({
    fire_spec:"fire_door",panel_type:"aluminum",design_code:"A01N",frame_type:"sleeve",handing:"right",
    size_type:"standard",size_module:"kanto",door_color:"H2",frame_color:"H2",
    lock_system:"smart_control_key",smart_key_type:"face_recognition",power_supply:"battery",
    handle_color:"black",closer_inclusion:"omitted"
  });
  assert.equal(r.validation.status,"INVALID");
  for(const code of [
    "CONCORD_FIRE_SLEEVE_NOT_AVAILABLE","CONCORD_FIRE_FACE_KEY_NOT_AVAILABLE",
    "CONCORD_FACE_KEY_BATTERY_NOT_AVAILABLE","CONCORD_ALUMINUM_FIRE_NOT_AVAILABLE",
    "CONCORD_FIRE_CLOSER_REQUIRED"
  ])assert.ok(codes(r).includes(code),code);
  assert.equal(r.orderConfiguration.components.length,0);
});

test("56 special sleeve validates SW/SH and uses site-procured glass + individual order",()=>{
  const r=resolve({
    fire_spec:"non_fire",panel_type:"insulated",design_code:"N12N",frame_type:"sleeve",handing:"right",
    size_type:"special_order",frame_width_mm:1700,frame_height_mm:2200,door_leaf_width_mm:900,door_leaf_height_mm:2100,
    door_color:"PR",frame_color:"BE",lock_system:"manual",handle_color:"silver",
    cylinder_type:"wg_minebea_showa",closer_inclusion:"omitted"
  });
  assert.equal(r.validation.status,"VALID");
  assert.equal(r.resolvedFields.sleeve_glass_procurement,"site_procured");
  assert.equal(r.resolvedFields.order_strategy,"individual_components");
  assert.ok(r.orderConfiguration.components.some(x=>x.componentType==="frame_unit"&&x.productSymbol===null));
  assert.ok(r.orderConfiguration.components.some(x=>x.componentType==="door_leaf_unit"&&x.productSymbol===null));
  assert.ok(r.orderConfiguration.components.some(x=>x.productSymbol==="YSKAG-S-S3A2-D"));
});

test("57 XMD screen resolves official derived dimensions and sleeve restrictions",()=>{
  const r=resolve({
    fire_spec:"non_fire",panel_type:"insulated",design_code:"N05N",frame_type:"sleeve",handing:"right",
    size_type:"standard",size_module:"kanto",door_color:"PR",frame_color:"BE",
    lock_system:"manual",handle_color:"black",cylinder_type:"ps_miwa",closer_inclusion:"included",
    sleeve_glass_procurement:"ykk_unit",sleeve_glass_spec:"low_e_laminated_double",
    screen_type:"horizontal_roll_screen_xmd_flat_single",screen_body_color:"H2",screen_net_color:"black"
  });
  assert.equal(r.validation.status,"VALID");
  assert.equal(r.resolvedFields.screen_mw,851);
  assert.equal(r.resolvedFields.screen_mh,2215);
  assert.equal(r.resolvedFields.sleeve_mullion_aux_frame,"required");
  assert.ok(r.orderConfiguration.components.some(x=>x.componentType==="screen_unit"));
  assert.ok(r.orderConfiguration.components.some(x=>x.componentType==="sleeve_mullion_aux_frame"));
});

test("58 XMD and aluminum inner trim conflict is rejected even when stabilizer clears trim",()=>{
  const r=resolve({
    fire_spec:"non_fire",panel_type:"insulated",design_code:"N05N",frame_type:"outside_retract",handing:"right",
    size_type:"standard",size_module:"kanto",door_color:"PR",frame_color:"BE",
    lock_system:"manual",handle_color:"black",cylinder_type:"ps_miwa",closer_inclusion:"included",
    screen_type:"horizontal_roll_screen_xmd_flat_single",screen_body_color:"H2",screen_net_color:"black",
    interior_trim_type:"aluminum_inner_trim"
  });
  assert.equal(r.validation.status,"INVALID");
  assert.ok(codes(r).includes("CONCORD_SCREEN_ALUMINUM_TRIM_CONFLICT"));
});
