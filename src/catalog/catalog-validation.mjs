import{COLLECTIONS}from'./catalog-roles.mjs';
export function validateCatalogModule(module){
 if(!module?.product?.id||!module.product.displayName||!module.product.manufacturer)throw new Error('invalid catalog module');
 const ids=new Set();for(const key of COLLECTIONS)for(const row of module[key]??[]){if(row.productId&&row.productId!==module.product.id)throw new Error(`product contamination in ${key}: ${row.productId}`);if(row.id){if(ids.has(row.id))throw new Error(`duplicate id in module: ${row.id}`);ids.add(row.id);}}
 return true;
}
export function validateCatalog(catalog){
 const ids=new Set(),products=new Set(catalog.products.map(p=>p.id));for(const key of COLLECTIONS)for(const row of catalog[key]){if(row.id){if(ids.has(row.id))throw new Error(`duplicate catalog id: ${row.id}`);ids.add(row.id);}if(row.productId&&!products.has(row.productId))throw new Error(`catalog product reference missing in ${key}: ${row.productId}`);}return true;
}
