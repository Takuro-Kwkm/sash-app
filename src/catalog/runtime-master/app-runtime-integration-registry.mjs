export const appRuntimeIntegrationRegistry = Object.freeze([
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
