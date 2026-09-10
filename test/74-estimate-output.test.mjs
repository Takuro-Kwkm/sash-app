import test from 'node:test';
import assert from 'node:assert/strict';
import { createEstimateOutputModel, EstimateOutputState } from '../src/estimate-output/model.mjs';
import { paginateEstimateOutput, buildPdfFromJpegPages } from '../src/estimate-output/pdf-renderer.mjs';
import { createEstimateXlsxBytes } from '../src/estimate-output/xlsx-renderer.mjs';

const project={
  project_id:'prj_test',project_name:'熊本モデルハウス',request_company:'青空工務店',
  request_company_contact:'山田',sales_person:'巧竜',customer_name:'施主A',postal_code:'8600801',
  prefecture:'熊本県',city:'熊本市中央区',street:'安政町1-1',building:null,
};
const estimate={estimate_id:'est_test',project_id:'prj_test',estimate_no:1,revision_no:2,status:'DRAFT',estimate_title:'本見積'};

function snapshot({manufacturer='LIXIL',series='TW',validation='VALID',price}={}){
  const value={
    manufacturer,series,package_version:'pkg-1',runtime_manifest_identity:'manifest-1',runtime_integrity_hash:'hash-1',
    validation_state:validation,source_mode:'CANONICAL_RUNTIME',product_id:`${manufacturer}-${series}`,
    configuration:{window_type:'FIX',size:'06005'},captured_at:'2026-09-10T00:00:00.000Z',
    display_summary:[
      {key:'window_type',label:'窓種類',value:'FIX窓'},
      {key:'glass',label:'ガラス',value:'Low-E複層ガラス'},
      {key:'size',label:'サイズ',value:'06005 ｜ W 640 × H 570'},
    ],
  };
  if(price!==undefined)value.price=price;
  return value;
}

function opening(index,{snap=snapshot(),status='COMPLETE'}={}){
  return {
    opening_id:`opn_${index}`,estimate_id:'est_test',opening_no:index,sort_order:index-1,status,
    room_name:index===1?'LDK':`洋室${index}`,location:index%2?'南面':'北面',opening_name:'窓',memo:null,
    product_configuration_snapshot:snap,
  };
}

test('stored Snapshot is the SSOT and missing price stays null / NEEDS_CONFIRMATION',()=>{
  const model=createEstimateOutputModel({project,estimate,openings:[opening(1)],generatedAt:'2026-09-10T01:00:00.000Z'});
  assert.equal(model.rows[0].price,null);
  assert.equal(model.rows[0].state,EstimateOutputState.NEEDS_CONFIRMATION);
  assert.equal(model.state,EstimateOutputState.NEEDS_CONFIRMATION);
  assert.deepEqual(model.counts,{total:1,complete:0,incomplete:0,needs_confirmation:1,invalid:0});
  assert.equal(model.rows[0].audit.runtime_manifest_identity,'manifest-1');
  assert.equal(model.project.address,'〒8600801 熊本県 熊本市中央区 安政町1-1');
});

test('explicit stored price allows COMPLETE while incomplete and invalid remain distinct',()=>{
  const rows=[
    opening(1,{snap:snapshot({price:123000})}),
    opening(2,{status:'DRAFT'}),
    opening(3,{snap:snapshot({validation:'INVALID'})}),
  ];
  const model=createEstimateOutputModel({project,estimate,openings:rows});
  assert.deepEqual(model.rows.map((row)=>row.state),['COMPLETE','INCOMPLETE','INVALID']);
  assert.deepEqual(model.counts,{total:3,complete:1,incomplete:1,needs_confirmation:0,invalid:1});
  assert.equal(model.state,'INVALID');
});

test('EW / TW / ウチリモ use the same generic Snapshot mapping',()=>{
  const openings=[
    opening(1,{snap:snapshot({manufacturer:'LIXIL',series:'EW'})}),
    opening(2,{snap:snapshot({manufacturer:'LIXIL',series:'TW'})}),
    opening(3,{snap:snapshot({manufacturer:'YKK AP',series:'ウチリモ 内窓'})}),
  ];
  const model=createEstimateOutputModel({project,estimate,openings});
  assert.deepEqual(model.rows.map((row)=>[row.manufacturer,row.series]),[
    ['LIXIL','EW'],['LIXIL','TW'],['YKK AP','ウチリモ 内窓'],
  ]);
  assert.ok(model.rows.every((row)=>row.opening_type==='FIX窓'));
  assert.ok(model.rows.every((row)=>row.size.includes('640')));
});

test('TW 30-opening case yields 30 confirmation rows and 3 PDF pages',()=>{
  const openings=Array.from({length:30},(_,index)=>opening(index+1));
  const model=createEstimateOutputModel({project,estimate,openings});
  assert.deepEqual(model.counts,{total:30,complete:0,incomplete:0,needs_confirmation:30,invalid:0});
  assert.equal(model.state,'NEEDS_CONFIRMATION');
  const pages=paginateEstimateOutput(model,{rowsPerPage:10});
  assert.equal(pages.length,3);
  assert.deepEqual(pages.map((page)=>page.length),[10,10,10]);
});

test('PDF builder emits one PDF page object per rendered JPEG page',()=>{
  const jpeg=Uint8Array.from([0xff,0xd8,0xff,0xd9]);
  const bytes=buildPdfFromJpegPages(Array.from({length:3},()=>({bytes:jpeg,width:10,height:10})));
  const text=new TextDecoder('latin1').decode(bytes);
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.equal((text.match(/\/Type \/Page \/Parent/g)??[]).length,3);
  assert.ok(text.includes('/Count 3'));
  assert.ok(text.endsWith('%%EOF\n'));
});

test('XLSX is an OOXML ZIP and does not synthesize a zero price',()=>{
  const model=createEstimateOutputModel({project,estimate,openings:[opening(1)]});
  const bytes=createEstimateXlsxBytes(model);
  assert.equal(bytes[0],0x50);assert.equal(bytes[1],0x4b);
  const text=new TextDecoder('utf-8').decode(bytes);
  assert.ok(text.includes('[Content_Types].xml'));
  assert.ok(text.includes('xl/worksheets/sheet1.xml'));
  assert.ok(text.includes('xl/sharedStrings.xml'));
  assert.ok(text.includes('要確認'));
  assert.equal(model.rows[0].price,null);
});
