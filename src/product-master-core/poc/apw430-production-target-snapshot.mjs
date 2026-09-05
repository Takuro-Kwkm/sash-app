import crypto from'node:crypto';
const Z_WIDTHS=['036','060','074','083','119','160','165'];
const F204_WIDTHS=['036','060','069','160'];
const HEIGHTS=['18','20','22','24'];
const sizes=(prefix,widths)=>HEIGHTS.flatMap((h)=>widths.map((w)=>({sizeCode:`${w}${h}`,seriesWindowId:prefix,active:true})));
const snapshot={
  snapshotSchemaVersion:'1.0',recordType:'PRODUCT_MASTER_PRODUCTION_TARGET_SNAPSHOT',
  productId:'SER-YKK-APW430',
  fileId:'1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo',
  title:'20260830_YKKAP_APW430_商品マスター_正本',version:'20260830',folder:'01_正本',
  mimeType:'application/vnd.google-apps.spreadsheet',modifiedTime:'2026-08-30T11:39:41.909Z',
  capturedAt:'2026-09-02T05:57:00Z',capturedBy:'CHATGPT_CONTROL_PLANE',
  formalRecords:[
    {recordType:'SERIES_WINDOW',sheet:'03A_シリーズ窓種設定',row:63,id:'SWT-YKK-APW430-FIX-MADO',label:'FIX窓 窓タイプ',selectable:true,active:true,status:'公式確認済',source:'202607_YKKAP_APW430_商品カタログ P.70／業務用資料集'},
    {recordType:'SERIES_WINDOW',sheet:'03A_シリーズ窓種設定',row:64,id:'SWT-YKK-APW430-FIX-TR-ZAIRAI',label:'FIX窓 テラスタイプ（在来）',selectable:true,active:true,status:'公式確認済',source:'202607_YKKAP_APW430_商品カタログ P.71／業務用資料集',note:'テラスタイプ・在来。アングル付のみ'},
    {recordType:'SERIES_WINDOW',sheet:'03A_シリーズ窓種設定',row:65,id:'SWT-YKK-APW430-FIX-TR-204',label:'FIX窓 テラスタイプ（2×4）',selectable:true,active:true,status:'公式確認済',source:'202607_YKKAP_APW430_商品カタログ P.71／業務用資料集',note:'テラスタイプ・2×4。アングル付のみ'},
    ...sizes('SWT-YKK-APW430-FIX-TR-ZAIRAI',Z_WIDTHS).map((row,index)=>({...row,recordType:'SIZE',sheet:'06_サイズ',row:1898+index,construction:'在来・アングル付'})),
    ...sizes('SWT-YKK-APW430-FIX-TR-204',F204_WIDTHS).map((row,index)=>({...row,recordType:'SIZE',sheet:'06_サイズ',row:1926+index,construction:'2×4・アングル付'}))
  ],
  evidenceStorageInFormalWorkbook:'NO_DEDICATED_EVIDENCE_TAB',
  snapshotBasis:{seriesWindowRows:[63,64,65],sizeRows:{zairai:[1898,1925],twoByFour:[1926,1941]},sizeRecordCount:44}
};
const stable=(value)=>JSON.stringify(value,Object.keys(value).sort());
const hash=crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
snapshot.snapshotFingerprint=`sha256:${hash}`;
export const APW430_PRODUCTION_TARGET_SNAPSHOT=Object.freeze(snapshot);
