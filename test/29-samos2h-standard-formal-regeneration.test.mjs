import test from 'node:test';
import assert from 'node:assert/strict';
import {SAMOS2H_MODULE} from '../src/catalog/modules/samos2h-assembly.mjs';
import {SAMOS2H_STANDARD_FORMAL_DELTA_V11} from '../src/catalog/modules/samos2h-size.mjs';

test('Samos2H STANDARD v1.1 is regenerated from the approved formal Master without touching generic core',()=>{
  const regen=SAMOS2H_MODULE.standardRuntimeRegeneration;
  assert.equal(SAMOS2H_MODULE.product.source.id,'1zHi-XsMqJp0MKH-sDoTcnTqkLMGcuRdo');
  assert.equal(SAMOS2H_MODULE.product.source.version,'v0.7');
  assert.equal(regen.version,'v1.1');
  assert.equal(regen.proposalId,'PMCP-LIX-SAMOS2H-STANDARD-SOURCE-CORRECTION-20260904-001');
  assert.equal(regen.formalMaster.driveFileId,'1kTRcb7UdghZl7h3lYdmnZuB7fUVUAduU');
  assert.equal(regen.formalMaster.sha256,'9d4a0812cadc6d804a8e8db77ad0e4b042d674e62b9ef9edfcd2afcab9c9e5a6');
  assert.equal(regen.directManufacturerValueEditToGenericCore,false);
  assert.equal(Object.keys(SAMOS2H_STANDARD_FORMAL_DELTA_V11.hActualOverrides).length,310);
  assert.deepEqual(SAMOS2H_STANDARD_FORMAL_DELTA_V11.deactivatedIds,['SZ-S2H-01892','SZ-S2H-02010']);
  assert.equal(SAMOS2H_STANDARD_FORMAL_DELTA_V11.activeAdds.length,11);
  assert.equal(SAMOS2H_STANDARD_FORMAL_DELTA_V11.inactiveAdds.length,1);
});

test('Samos2H STANDARD current canonical inventory is exactly 2309 / 2140 / 169 and source corrections are visible',()=>{
  const rows=SAMOS2H_MODULE.standardSizeRecords;
  assert.equal(rows.length,2309);
  assert.equal(rows.filter((r)=>r.selectable).length,2140);
  assert.equal(rows.filter((r)=>!r.selectable).length,169);
  assert.equal(SAMOS2H_MODULE.product.sourceInventory.standardSizeRows,2309);
  assert.equal(SAMOS2H_MODULE.product.sourceInventory.selectableSizeRows,2140);
  assert.equal(SAMOS2H_MODULE.product.sourceInventory.inactiveSizeRows,169);
  const h=rows.find((r)=>r.id==='SZ-S2H-00001');assert.equal(h.actualH,1845);
  for(const id of ['SZ-S2H-01892','SZ-S2H-02010','SZ-S2H-02298']){const row=rows.find((r)=>r.id===id);assert.ok(row);assert.equal(row.selectable,false);assert.equal(row.status,'INACTIVE');}
  const added=rows.find((r)=>r.id==='SZ-S2H-02299');assert.ok(added);assert.equal(added.selectable,true);assert.equal(added.status,'ACTIVE');
});
