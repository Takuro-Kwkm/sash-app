export const appRuntimeIntegrationRegistry = Object.freeze([
  Object.freeze({
    id: 'SER-LIXIL-GIESTA2',
    manufacturer: 'LIXIL',
    series: 'ジエスタ2',
    displayName: 'ジエスタ2',
    productCategory: 'door',
    registrySeriesKey: 'LIXIL::ジエスタ2',
    canonicalRuntimeReference: Object.freeze({
      runtimeManifestDriveFileId: '1AEMf7ay34L5iIxFBT9fLh655yta2nWbC',
      canonicalFolderId: '1sR0e7FSgr6lVE8BHw0fXzYamC0nxCyXW',
    }),
    packageVersion: 'v0.8-R1',
    schemaVersion: '1.0',
    sourceHash: '9df554d2f4e2edc86c09db59646c56daabf5897751772a4ba1c0ccdff711d19c',
    adapterType: 'PHASE_MASTER_MAPS_V1',
  }),
]);

export function getAppRuntimeIntegrationMetadata(manufacturer, series) {
  return appRuntimeIntegrationRegistry.find((row) => row.manufacturer === manufacturer && row.series === series) ?? null;
}
