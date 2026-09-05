import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateProductProfile, buildGeminiJobInputFromProductProfile } from '../src/product-master-core/product-profile.mjs';
import { createGeminiJob } from '../src/product-master-core/gemini-execution-bridge.mjs';
import { buildAiProScopedTextDelivery } from '../src/product-master-core/source-delivery-contract.mjs';
import { buildAiProGeminiExecutionAudit } from '../src/product-master-core/gemini-execution-contract.mjs';
import { runGovernedGeminiV11 } from '../src/product-master-core/governed-gemini-v11-runner.mjs';
import { createProductMasterChangeProposal } from '../src/product-master-core/master-change-control.mjs';
import { buildHumanApprovalProvenance } from '../src/product-master-core/human-approval-provenance.mjs';
import { buildHumanApprovalReviewGateBinding } from '../src/product-master-core/human-approval-review-gate-binding.mjs';
import { openGovernedChangeControl, applyGovernedApprovedProductMasterChangeProposal } from '../src/product-master-core/change-control-entry-gate.mjs';
import { buildRuntimeGenerationProvenance } from '../src/product-master-core/runtime-generation-provenance.mjs';
import { buildWorkingSavepointHandoff } from '../src/product-master-core/working-savepoint-handoff.mjs';

const PROFILE_PATH = path.resolve('config/product-master-profiles/lixil-thermosl.v1.json');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const tempRoot = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'thermosl-second-series-e2e-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
};

function loadProfile() {
  return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));
}

function buildAcquisition(profile) {
  const source = profile.source;
  return {
    schemaVersion: '1.1',
    recordType: 'PRODUCT_MASTER_SOURCE_ACQUISITION',
    status: 'PASS',
    manufacturer: profile.manufacturer,
    series: profile.series,
    productId: profile.productId,
    executionChannel: 'GEMINI_AI_PRO',
    source: {
      type: source.type,
      driveFileId: source.driveFileId,
      title: source.title,
      version: source.version,
      officialDownloadUrl: source.officialDownloadUrl,
      officialDetailUrl: source.officialDetailUrl,
      authoritativeSha256: source.authoritativeSha256,
      pageCount: source.pageCount
    },
    scope: {
      pdfPages: profile.extraction.pageScope,
      printedPages: profile.extraction.printedPageScope,
      canonicalFields: profile.extraction.canonicalFieldScope
    },
    retrieval: {
      method: 'OFFICIAL_DOWNLOAD_URL',
      requestedUrl: source.officialDownloadUrl,
      resolvedUrl: source.officialDownloadUrl,
      referer: source.officialDetailUrl,
      contentType: 'application/pdf',
      sizeBytes: 1000,
      acquiredSha256: source.authoritativeSha256
    },
    identity: {
      mode: 'FULL_BYTE_IDENTITY',
      fullDocumentByteIdentity: true,
      authoritativeSha256: source.authoritativeSha256,
      acquiredSha256: source.authoritativeSha256,
      scopedContentEquivalence: { mode: 'FULL_BYTE_IDENTITY' }
    },
    scopeValidation: {
      pdfScopeWithinAuthoritativePageCount: true,
      printedToPdfMappingComplete: true
    },
    localArtifact: { persisted: true, fileName: 'thermosl-official-source.pdf' },
    credentialMaterialPersisted: false
  };
}

function transportEnvelope(job, profile) {
  const source = { ...job.sourceContext, printedPage: 4, pdfPage: 6, locatorText: '単体引違い窓' };
  return {
    transportSchemaVersion: '1.0',
    transportType: 'EVIDENCE_CANDIDATE_BATCH',
    batchId: 'BATCH-LIXIL-THERMOSL-CURRENT-E2E-001',
    generatedAt: '2026-09-05T15:00:00Z',
    producer: { system: 'GEMINI_ANTIGRAVITY', mode: 'LIVE_EXTERNAL' },
    productId: profile.productId,
    sourceContext: job.sourceContext,
    candidates: [{
      recordType: 'EVIDENCE_CANDIDATE',
      candidateSchemaVersion: '1.0',
      id: 'CAND-LIXIL-THERMOSL-CURRENT-E2E-001',
      sourceSystem: 'GEMINI_ANTIGRAVITY',
      producerMode: 'LIVE_EXTERNAL',
      status: 'SUBMITTED',
      productId: profile.productId,
      title: 'Thermos L current-stack second-series E2E evidence',
      subjectField: 'window_type',
      claim: 'The scoped source explicitly identifies a Thermos L window type.',
      proposedStrength: 'EXPLICIT',
      productNodeIds: [],
      source
    }],
    issues: []
  };
}

test('v2.7 Thermos L second-series profile traverses governed AI Pro -> Review -> synthetic Human gate -> STAGING -> Runtime -> Savepoint Handoff without canonical authority', async (t) => {
  const profile = loadProfile();
  assert.equal(validateProductProfile(profile).pass, true);
  assert.equal(profile.manufacturer, 'LIXIL');
  assert.equal(profile.series, 'サーモスL');
  assert.equal(profile.registrySeriesKey, 'LIXIL::サーモスL');
  assert.equal(profile.productId, 'SER-LIXIL-THERMOSL');

  const builtJob = buildGeminiJobInputFromProductProfile(profile, {
    job_id: 'GJOB-LIXIL-THERMOSL-CURRENT-E2E-001',
    execution_mode: 'LIVE_EXTERNAL',
    execution_channel: 'GEMINI_AI_PRO',
    preferred_execution_channel: 'GEMINI_AI_PRO',
    fallback_execution_channel: 'GEMINI_API',
    fallback_allowed: false,
    execution_reference: 'CURRENT_STACK_E2E_FIXTURE:LIXIL:THERMOSL:001'
  });
  assert.equal(builtJob.pass, true, builtJob.errors?.[0]?.message);
  const createdJob = createGeminiJob(builtJob.jobInput);
  assert.equal(createdJob.pass, true, createdJob.errors?.[0]?.message);
  const job = createdJob.job;
  assert.equal(job.executionChannel, 'GEMINI_AI_PRO');
  assert.equal(job.preferredExecutionChannel, 'GEMINI_AI_PRO');
  assert.equal(job.fallbackExecutionChannel, 'GEMINI_API');
  assert.equal(job.fallbackAllowed, false);
  assert.equal(job.transportMethod, 'GEMINI_AI_PRO_STRUCTURED_HANDOFF');

  const acquisition = buildAcquisition(profile);
  const scopeAudit = {
    pageScope: profile.extraction.pageScope,
    scopeTextSha256: 'b'.repeat(64),
    scopeTextBytes: 140061,
    pageAudit: profile.extraction.pageScope.map((pdfPage, index) => ({ pdfPage, characters: 1000 + index, sha256: String(index + 1).repeat(64) })),
    extractor: 'pypdf',
    extractorVersion: '6.0.0'
  };
  const delivery = buildAiProScopedTextDelivery({
    sourceAcquisition: acquisition,
    executionReference: job.executionReference,
    scopeAudit
  });
  assert.equal(delivery.pass, true, delivery.errors?.[0]?.message);

  const envelope = transportEnvelope(job, profile);
  const raw = `${JSON.stringify(envelope)}\n`;
  const execution = buildAiProGeminiExecutionAudit({
    job,
    sourceAcquisition: acquisition,
    sourceDelivery: delivery.record,
    rawResponseSha256: sha256(raw),
    antigravityAudit: {
      status: 'SUCCESS',
      structured_output_sha256: sha256(raw),
      authenticationMode: 'GOOGLE_AI_PRO_OAUTH',
      producerSystem: 'GEMINI_ANTIGRAVITY',
      permissionDeniedActions: [],
      canonicalWritePerformed: false,
      runtimeWritePerformed: false,
      productionWritePerformed: false
    }
  });
  assert.equal(execution.pass, true, execution.errors?.[0]?.message);

  const root = tempRoot(t);
  const governed = await runGovernedGeminiV11(job, {
    sourceAcquisition: acquisition,
    sourceDelivery: delivery.record,
    geminiExecution: execution.record,
    externalResponse: raw,
    evidenceInboxDir: path.join(root, 'inbox'),
    changeControlDir: path.join(root, 'change')
  });
  assert.equal(governed.pass, true, governed.errors?.[0]?.message);
  assert.equal(governed.status, 'IMPORTED');
  assert.equal(governed.reviewQueueValidation.pass, true);
  assert.equal(governed.reviewQueueValidation.record.status, 'PASS');
  assert.equal(governed.transportProvenance.executionChannel, 'GEMINI_AI_PRO');
  assert.equal(governed.canonicalWritePerformed, false);
  assert.equal(governed.runtimeWritePerformed, false);
  assert.equal(governed.productionWritePerformed, false);

  const candidateId = envelope.candidates[0].id;
  const batchId = envelope.batchId;
  const reviewQueue = structuredClone(governed.reviewQueue);
  const queueItem = reviewQueue.items.find((row) => row.kind === 'EVIDENCE_CANDIDATE' && row.sourceId === candidateId);
  assert.ok(queueItem);
  const reviewProvenance = queueItem.refs.reviewProvenance;
  assert.equal(reviewProvenance.status, 'PASS');
  assert.equal(reviewProvenance.governed, true);
  queueItem.sourceStatus = 'ADJUDICATED';
  queueItem.sourceDecision = 'ACCEPT';
  queueItem.reviewStatus = 'APPROVED';
  queueItem.actionable = false;
  queueItem.authority = null;
  queueItem.nextAction = 'NONE';
  queueItem.refs.adjudicationId = 'ADJ-CAND-LIXIL-THERMOSL-CURRENT-E2E-001';

  const canonicalEvidence = {
    schemaVersion: '1.0',
    id: 'EVID-LIXIL-THERMOSL-CURRENT-E2E-001',
    productId: profile.productId,
    status: 'VERIFIED',
    strength: 'EXPLICIT',
    title: 'Thermos L current-stack second-series E2E Canonical Evidence fixture',
    subjectField: 'window_type',
    claim: envelope.candidates[0].claim,
    productNodeIds: [],
    source: envelope.candidates[0].source,
    adjudication: {
      extractedBy: 'GEMINI_ANTIGRAVITY',
      adjudicatedBy: 'CHATGPT',
      adjudicatorType: 'CHATGPT',
      status: 'ACCEPTED',
      reason: 'Deterministic CI fixture proving the authority boundary; not a real Product Master approval.',
      sourceCandidateId: candidateId
    },
    provenance: {
      candidateId,
      candidateSourceSystem: 'GEMINI_ANTIGRAVITY',
      producerMode: 'LIVE_EXTERNAL'
    }
  };
  const adjudicationStore = {
    canonicalEvidence: [canonicalEvidence],
    adjudications: [{
      id: queueItem.refs.adjudicationId,
      batchId,
      candidateId,
      decision: 'ACCEPT',
      adjudicatorType: 'CHATGPT',
      adjudicatedBy: 'CHATGPT',
      reviewProvenance
    }],
    candidateStates: [{
      batchId,
      candidateId,
      status: 'ADJUDICATED',
      adjudicationId: queueItem.refs.adjudicationId,
      reviewProvenance
    }],
    pending: []
  };

  const baseMaster = {
    product: { id: profile.productId },
    fields: [],
    productNodes: [],
    evidence: [],
    dependencyRules: [],
    pending: [],
    phases: []
  };
  const proposalBuilt = createProductMasterChangeProposal({
    id: 'PMCP-LIXIL-THERMOSL-CURRENT-E2E-001',
    productId: profile.productId,
    baseMaster,
    changes: [{ operation: 'ADD_RECORD', collection: 'evidence', record: canonicalEvidence }],
    evidenceIds: [canonicalEvidence.id],
    sourceBatchIds: [batchId],
    openBlockingPending: 0,
    createdBy: 'CHATGPT',
    at: '2026-09-05T15:01:00Z',
    summary: 'Synthetic second-series current-stack E2E staging fixture; never authoritative Product Master data.'
  });
  assert.equal(proposalBuilt.pass, true, proposalBuilt.errors?.[0]?.message);
  const proposal = proposalBuilt.proposal;

  // CI-only synthetic HUMAN fixture. This proves the contract; it is not user approval and grants no real Master authority.
  const approval = {
    approvalSchemaVersion: '1.1',
    recordType: 'PRODUCT_MASTER_CHANGE_APPROVAL',
    proposalId: proposal.id,
    proposalFingerprint: proposal.proposalFingerprint,
    baseMasterFingerprint: proposal.target.baseMasterFingerprint,
    approverType: 'HUMAN',
    approvedBy: 'CI_HUMAN_FIXTURE_ONLY',
    approvedAt: '2026-09-05T15:02:00Z',
    approvalSource: 'SIGNED_APPROVAL_RECORD',
    approvalReference: 'Synthetic deterministic CI fixture; not a real Product Master approval.',
    scope: 'APPROVE_AND_STAGE_ONLY',
    productionApproval: false
  };
  const reviewQueueValidations = [governed.reviewQueueValidation.record];
  const human = buildHumanApprovalProvenance({ proposal, approval, reviewQueue, adjudicationStore, baseMaster });
  assert.equal(human.pass, true, human.errors?.[0]?.message);
  const binding = buildHumanApprovalReviewGateBinding({
    proposal,
    humanApprovalProvenance: human.record,
    reviewQueueValidations
  });
  assert.equal(binding.pass, true, binding.errors?.[0]?.message);

  const opened = openGovernedChangeControl({
    proposal,
    approval,
    humanApprovalProvenance: human.record,
    humanApprovalReviewGateBinding: binding.record,
    reviewQueueValidations,
    reviewQueue,
    adjudicationStore,
    baseMaster
  });
  assert.equal(opened.pass, true, opened.errors?.[0]?.message);
  assert.equal(opened.status, 'CHANGE_CONTROL_OPEN');

  const applied = applyGovernedApprovedProductMasterChangeProposal({
    approvedProposal: opened.approvedProposal,
    approval,
    humanApprovalProvenance: human.record,
    humanApprovalReviewGateBinding: binding.record,
    reviewQueueValidations,
    humanApprovalGate: opened.humanApprovalGate,
    reviewQueue,
    adjudicationStore,
    baseMaster,
    mode: 'STAGING',
    openBlockingPending: 0,
    at: '2026-09-05T15:03:00Z',
    validateMaster: (master) => ({ pass: master.evidence.some((row) => row.id === canonicalEvidence.id) })
  });
  assert.equal(applied.pass, true, applied.errors?.[0]?.message);
  assert.equal(applied.authoringStagingGate, 'PASS');
  assert.equal(applied.productionMasterWritePerformed, false);
  assert.equal(applied.runtimeWritePerformed, false);

  const runtime = buildRuntimeGenerationProvenance({
    authoringMaster: applied.appliedMaster,
    authoringStagingProvenance: applied.authoringStagingProvenance,
    runtimeFiles: [{
      role: 'RUNTIME_REPRODUCIBILITY_E2E',
      name: 'lixil_thermosl_current_stack_e2e_runtime.json',
      content: { productId: profile.productId, evidenceIds: [canonicalEvidence.id], mode: 'CI_FIXTURE_ONLY' }
    }],
    generator: { id: 'GENERIC_PRODUCT_MASTER_RUNTIME_GENERATOR', version: '1.1.0' },
    validation: { pass: true, checks: ['PRODUCT_ID', 'AUTHORING_BINDING', 'JSON_SERIALIZABLE'] },
    generatedAt: '2026-09-05T15:04:00Z'
  });
  assert.equal(runtime.pass, true, runtime.errors?.[0]?.message);
  assert.equal(runtime.record.authority.canonicalRuntimeWritePerformed, false);
  assert.equal(runtime.record.authority.formalPass, false);
  assert.equal(runtime.record.authority.appIntegrationReady, false);

  const handoff = buildWorkingSavepointHandoff({
    authoringMaster: applied.appliedMaster,
    authoringStagingProvenance: applied.authoringStagingProvenance,
    runtimeManifest: runtime.manifest,
    runtimeFiles: runtime.files.map(({ role, name, content }) => ({ role, name, content })),
    runtimeGenerationProvenance: runtime.record,
    generator: { id: 'GENERIC_PRODUCT_MASTER_RUNTIME_GENERATOR', version: '1.1.0' },
    context: { manufacturer: profile.manufacturer, series: profile.series }
  });
  assert.equal(handoff.pass, true, handoff.errors?.[0]?.message);
  assert.equal(handoff.record.productId, profile.productId);
  assert.equal(handoff.record.manufacturer, 'LIXIL');
  assert.equal(handoff.record.series, 'サーモスL');
  assert.equal(handoff.record.authority.driveWritePerformed, false);
  assert.equal(handoff.record.authority.workingSavepointGate, 'NOT_EVALUATED');
  assert.equal(handoff.record.authority.nextPhaseGate, 'CLOSED');
  assert.equal(handoff.record.authority.formalPass, false);
  assert.equal(handoff.record.authority.appIntegrationReady, false);
});
