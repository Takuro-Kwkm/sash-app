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
  Object.freeze({
    id: 'SER-LIX-EW',
    manufacturer: 'LIXIL',
    series: 'EW',
    displayName: 'EW',
    productCategory: 'sash',
    uiCategory: 'NEW_CONSTRUCTION_EXTERIOR_WINDOW',
    registrySeriesKey: 'LIXIL::EW',
    canonicalRuntimeReference: Object.freeze({
      runtimeManifestDriveFileId: '139c0atou5LFz7EIHIdD7ZTYWddfSHf5_',
      runtimeDriveFileId: '1soPPTqP9LNKWFS1wxWhN8Lux6p9ZdyYf',
      canonicalFolderId: '1mDsi9amFdD5A9N8XrommExB_EMZDQiqu',
    }),
    packageVersion: 'v1.1',
    schemaVersion: '2.0',
    sourceHash: '082442f82f51c4a81050d8e16d5fe3b9cb142004deb371a3e2bbb21384ca37dd',
    adapterType: 'CANONICAL_WORKBOOK_REFERENCE_V1',
    uiStandardSpec: 'サッシ情報管理アプリ_UI実装標準仕様書_v1.5',
  }),
]);

export function getAppRuntimeIntegrationMetadata(manufacturer, series) {
  return appRuntimeIntegrationRegistry.find((row) => row.manufacturer === manufacturer && row.series === series) ?? null;
}
