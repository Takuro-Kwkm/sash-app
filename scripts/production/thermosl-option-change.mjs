import { createHash } from 'node:crypto';
import { applyFormalRuntimeJsonTransform } from '../../src/catalog/runtime-master/formal-runtime-json-transform.mjs';

export const PRODUCT = 'SER-LIX-SAMOSL';
export const OPTION = 'OP-SL-EMERGENCY-SKIRT';
export const EVIDENCE = 'EV-SL-IS8900-EMERGENCY-SKIRT';
export const SOURCE_HASH = 'f9f6cdf5a86471fc634c9693ce5adc5bca47935c4ca9c4edcec2ab3061e5596c';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

// This produces an isolated Working candidate. The live inventory changes
// only after the Harness admits Human adoption and native Formal readback.
export function prepareThermosLCandidate(bytes, sourceEvidence) {
  const original = JSON.parse(bytes);
  if (original.product_id !== PRODUCT || original.package_version !== 'v0.7-R2') throw new Error('ThermosL baseline identity mismatch');
  if (sourceEvidence?.sha256 !== SOURCE_HASH || sourceEvidence?.sourceId !== '1nxDq-qDTb3Gi_s8qPT6d3WpT5MzahCSe') throw new Error('Official source identity mismatch');
  if (original.product_module.allowedValues.some((r) => r.value === OPTION)) throw new Error('Candidate already applied; resume its checkpoint');
  const option = {
    id: `${PRODUCT}:options:${OPTION}:${OPTION}`, productId: PRODUCT,
    specificationKey: 'options', value: OPTION, displayLabel: '代替進入口用幅木仕様',
    displayOrder: 190, status: 'MANUAL_CHECK',
    selector: { window_type: 'WT-SL-SHUTTER-HIKI', specific_spec: 'SP-SL-SHUT-M-STD' },
    evidenceIds: [EVIDENCE], metadata: {
      sourceFile: 'LIXIL_サーモスL_AUTHORING_MASTER_v0.7-R3-WORKING.xlsx',
      sourceSheet: '10_その他OP', sourceRow: 201, usage: '見積選択',
      manualCheck: '代替進入口用幅木仕様は手動・標準タイプのみ。製作可否・組合せ・価格は見積先へ確認してください。',
      state: 'OFFICIAL_EVIDENCE_REVIEWED_HUMAN_ADOPTION_PENDING',
    },
  };
  const evidence = {
    ...sourceEvidence, id: EVIDENCE, productId: PRODUCT, sourceType: 'OFFICIAL_CATALOG',
    title: 'サーモスL 業務用資料集（完成品価格表）IS8900', version: '2026-09 / 2026-10価格',
    pdfPages: [57, 61], printedPages: [55, 59], status: 'VERIFIED_SCOPED_SOURCE',
    claim: '手動シャッター付引違い窓の標準タイプに代替進入口用幅木仕様を追加。製作・組合せ・価格確認は継続。',
  };
  const transform = {
    format: 'formal-runtime-json-transform/1.0', source: { sha256: hash(bytes) },
    serialization: { indent: 2, trailing_newline: true }, operations: [
      { op: 'append', pointer: '/product_module/allowedValues', values: [option] },
      { op: 'append', pointer: '/product_module/evidence', values: [evidence] },
      { op: 'set', pointer: '/package_version', value: 'v0.7-R3-WORKING' },
      { op: 'set', pointer: '/formal_closure', value: { status: 'WORKING', human_adoption: 'PENDING', scope: OPTION } },
    ],
  };
  const candidate = applyFormalRuntimeJsonTransform(bytes, Buffer.from(JSON.stringify(transform)));
  transform.target = { sha256: hash(candidate), size_bytes: candidate.length };
  return { bytes: candidate, transform, option, evidence };
}
