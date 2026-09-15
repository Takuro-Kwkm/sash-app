import { FIELD_DEFS, normalizedValues } from './innovest-flat-json-v1-model.mjs';
import { createInnovestResolver } from './innovest-flat-json-v1-resolver.mjs';
import { createInnovestOptionRequirementAwareResolver } from './innovest-option-requirement-resolver.mjs';

export function adaptInnovestFlatJsonV1(runtimePackage) {
  const selectors = runtimePackage.files['selectors.json'];
  const masterData = runtimePackage.files['master_data.json'];
  const dependencies = runtimePackage.files['dependencies.json'];
  const options = runtimePackage.files['options.json'];
  const prices = runtimePackage.files['prices.json'];
  if (!selectors || !masterData || !dependencies || !options || !prices) {
    const error = new Error('イノベスト Runtime package entrypoints are incomplete');
    error.code = 'RUNTIME_ENTRYPOINT_MISSING';
    throw error;
  }
  const data = { selectors, masterData, dependencies, options, prices, manifest: runtimePackage.manifest };
  const master = Object.freeze({
    fields: FIELD_DEFS.map((row) => Object.freeze({ ...row })),
    values: normalizedValues(data).map((row) => Object.freeze(row)),
    capabilities: Object.freeze({
      orderReady: false,
      packageVersion: runtimePackage.manifest.package_version,
      structuredOptionPredicates: true,
      structuredOptionRequirements: true,
      customSize: true,
      standardSize: true,
      reviewRequired: true,
      lifecycle: true,
      sourceSchema: runtimePackage.manifest.schema,
    }),
    source: data,
  });
  const resolver=createInnovestOptionRequirementAwareResolver(data,createInnovestResolver);
  return Object.freeze({ master, resolver });
}
