// Optional configuration audit metadata; no product facts or defaults live here.
export function withConfigurationMigrationAudit(snapshot,previousSnapshot,migration){
  const previous=previousSnapshot?.product_id&&previousSnapshot.product_id===snapshot.product_id?previousSnapshot.configuration_migration:null;
  const audit=migration??previous;
  return audit?{...snapshot,configuration_migration:globalThis.structuredClone?globalThis.structuredClone(audit):JSON.parse(JSON.stringify(audit))}:snapshot;
}
