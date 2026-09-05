// Generated from the formally approved Thermos L Product Master CR-SL-036 delta.
// Source of truth: Drive formal Master 06C_特注寸法範囲 row 39. Do not hand-edit the manufacturer boundary in generic Runtime code.

export const THERMOSL_RUNTIME_FORMAL_DIMENSION_DELTA_V19={
  schemaVersion:'1.0',
  recordType:'THERMOSL_RUNTIME_FORMAL_DIMENSION_DELTA',
  productId:'SER-LIX-SAMOSL',
  proposalId:'PMCP-LIX-SAMOSL-INNER-TILT-RANGE-20260903-001',
  proposalFingerprint:'sha256:bf89762cd1cf88be8620b93599d2987c23d50fcb335e6c2b525f5a14175184ee',
  formalMaster:{
    driveFileId:'17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL',
    revisionId:'0B1PsqngSohhlZVhYaTVRdUNPRFp4ZVB5Y05IdnJNYXI4YTlZPQ',
    modifiedTime:'2026-09-03T07:23:33.441Z',
    sizeBytes:678886,
    sha256:'cd6844218fcf0150a16cbbfa947f391aa08f5449b82ba6fc2249ccdb6894c3d3',
    preWriteSha256:'664a51bd5b9ded22e19780b1ce339338cba45f292438221b0a60fc3974e1abf9',
    backupDriveFileId:'1PQsjvO3lRRbFN1xX0NmfzHck4TU2vAnJ'
  },
  targetRuleId:'CR-SL-036',
  expectedRuleCount:50,
  sourceConfirmedBoundaryPoints:[
    [240,350],[240,943],[815,943],[815,755],
    [870,755],[870,500],[1690,500],[1690,350]
  ],
  interpolatedPointsAdded:false,
  rule:{
    id:'CR-SL-036',window:'WT-SL-UCHIDAOSHI',spec:'*',construction:'在来・204',leafConfiguration:'単窓',
    type:'COMPOUND_GATE',
    bounds:{minW:240,maxW:1690,minH:350,maxH:943},
    condition:'240<=W<=815:350<=H<=943; 815<W<=870:350<=H<=755; 870<W<=1690:350<=H<=500',
    regions:[],ratio:null,
    points:[[240,350],[240,943],[815,943],[815,755],[870,755],[870,500],[1690,500],[1690,350]],
    safeAutoPolygon:[[240,350],[240,943],[815,943],[815,755],[870,755],[870,500],[1690,500],[1690,350]],
    safeAutoExpression:'240<=W<=815:350<=H<=943; 815<W<=870:350<=H<=755; 870<W<=1690:350<=H<=500',
    conditionalRegionHandling:'RUNTIME_SAFETY_REVIEW_REQUIRED',
    automatic:false,
    special:'P221注記領域はガラス厚3-A-3限定かつガラス構成依存。W/HだけではAUTO PASSしない',
    glass:'価格表直接注記16503=3-A-3のみを保持',
    state:'本投入',page:'P221',source:'サーモスⅡ-H/L 商品カタログ',
    url:'https://webcatalog.lixil.co.jp/iportal/CatalogDetail.do?catalogID=15191910000&categoryID=1630000&designID=newinter&method=initial_screen&position=18&type=mc&volumeID=LXL13001',
    result:'REVIEW_REQUIRED',
    note:'v1.9 formal Master regeneration from approved CR-SL-036. Source-confirmed vertices only; no interpolation.',
    sourceRow:38
  }
};
