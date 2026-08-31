import assert from "node:assert/strict";

const DIMENSION_TYPES=new Set(["AUTO_RECT","AUTO_RATIO","AUTO_PIECEWISE","AUTO_POLYGON","SOURCE_GRAPH_GATE","COMPOUND_GATE"]);

export function assertDimensionIntegrity(catalog,productId){
  const evidence=new Set(catalog.evidence.filter((row)=>row.productId===productId).map((row)=>row.id));
  const values=new Map();
  for(const row of catalog.allowedValues.filter((item)=>item.productId===productId)){
    if(!values.has(row.specificationKey))values.set(row.specificationKey,new Set());
    values.get(row.specificationKey).add(row.value);
  }
  const specificSpecs=new Set(catalog.allowedValues.filter((row)=>row.productId===productId).map((row)=>row.metadata?.specific_spec).filter(Boolean));
  const ruleSets=catalog.ruleSets.filter((row)=>row.productId===productId&&row.type==="DIMENSION_RULES");
  assert.equal(ruleSets.length,1);
  for(const set of ruleSets){
    for(const evidenceId of set.evidenceIds??[])assert.ok(evidence.has(evidenceId),evidenceId);
    for(const rule of set.payload){
      assert.equal(rule.productId,productId,rule.id);
      assert.ok(DIMENSION_TYPES.has(rule.type),`${rule.id}:${rule.type}`);
      for(const evidenceId of rule.evidenceIds??[])assert.ok(evidence.has(evidenceId),`${rule.id}:${evidenceId}`);
      assert.ok(values.get("window_type")?.has(rule.selector.window_type),`${rule.id}:window_type`);
      if(rule.selector.specific_spec)assert.ok(specificSpecs.has(rule.selector.specific_spec),`${rule.id}:specific_spec`);
      if(rule.selector.construction)assert.ok(values.get("construction")?.has(rule.selector.construction),`${rule.id}:construction`);
      if(rule.selector.leaf_configuration)assert.ok(values.get("leaf_configuration")?.has(rule.selector.leaf_configuration),`${rule.id}:leaf_configuration`);
      if(rule.type==="AUTO_POLYGON")assert.ok((rule.points??[]).length>=3,`${rule.id}:points`);
      if(rule.type==="AUTO_PIECEWISE")assert.ok((rule.regions??[]).length>=1,`${rule.id}:regions`);
      if(rule.type==="AUTO_RATIO")assert.ok(Number.isFinite(rule.ratio),`${rule.id}:ratio`);
    }
  }
}
