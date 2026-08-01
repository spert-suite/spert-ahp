// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// ─── Enumerations ─────────────────────────────────────────────

export type ModelStatus = 'setup' | 'open' | 'closed' | 'synthesized' | 'reopened';
export type CompletionTier = 1 | 2 | 3 | 4;
export type CRConfidence = 'none' | 'low' | 'moderate' | 'full';
export type CollaboratorRole = 'owner' | 'editor' | 'viewer';
export type ResponseStatus = 'in_progress' | 'submitted';
export type SynthesisStatus = 'current' | 'out_of_date' | 'computing';
export type DisagreementPresetName = 'strict' | 'standard' | 'exploratory';
export type DisagreementBand = 'agreement' | 'mild' | 'disagreement';
export type ConfidenceLevel = 'RED' | 'AMBER' | 'GREEN';
export type ConcordanceInterpretation = 'strong' | 'moderate' | 'weak';
export type PairCoverageDiagnostic = 'full' | 'partial' | 'low';

// ─── Core Data Structures ────────────────────────────────────

export interface StructuredItem {
  id: string;
  label: string;
  description: string;
}

/** Upper-triangle comparison map. Keys are "i,j" where i < j. */
export type ComparisonMap = Record<string, number>;

/** Pair coordinates [i, j] with i < j */
export type ComparisonPair = [number, number];

// ─── Disagreement Config ──────────────────────────────────────

export interface DisagreementThresholds {
  agreement: number;
  mild: number;
}

export interface DisagreementConfig {
  preset: DisagreementPresetName | 'custom';
  thresholds: DisagreementThresholds;
  configuredBy?: string;
  configuredAt?: number;
}

// ─── Document Types (storage layer) ──────────────────────────

export interface ChangeLogEntry {
  action: 'created' | 'uploaded' | string;
  timestamp: number;
  actor?: string;
}

export interface ModelDoc {
  title: string;
  goal: string;
  createdBy: string;
  createdAt: number;
  status: ModelStatus;
  completionTier: CompletionTier;
  synthesisStatus: SynthesisStatus | null;
  disagreementConfig: DisagreementConfig;
  publishedSynthesisId: string | null;
  /** Workspace UUID that first created the model (fingerprinting). */
  _originRef: string;
  /** Append-only provenance log. */
  _changeLog: ChangeLogEntry[];
  /** Owner controls for what non-owners see on the Results tab. */
  resultsVisibility?: {
    showAggregatedToVoters: boolean;
    showOwnRankingsToVoters: boolean;
  };
}

export interface StructureDoc {
  criteria: StructuredItem[];
  alternatives: StructuredItem[];
  structureVersion: number;
}

export interface CollaboratorDoc {
  userId: string;
  role: CollaboratorRole;
  isVoting: boolean;
}

export interface ResponseDoc {
  userId: string;
  status: ResponseStatus;
  criteriaMatrix: ComparisonMap;
  alternativeMatrices: Record<string, ComparisonMap>;
  cr: Record<string, unknown>;
  lastModifiedAt: number;
  structureVersionAtSubmission: number;
}

export interface ModelIndexEntry {
  modelId: string;
  title: string;
  status: ModelStatus;
  createdAt: number;
  /** 0-indexed display order. Optional for backwards compat with v0.9.x rows;
   *  entries without `order` sort to the bottom by createdAt. */
  order?: number;
  /** Current user's role for this model. Always 'owner' in local mode. */
  role: CollaboratorRole;
}

// ─── Math Results ────────────────────────────────────────────

export interface ConnectivityResult {
  connected: boolean;
  missingLinks: ComparisonPair[];
}

export interface LLSMResult {
  weights: number[];
  converged: boolean;
}

export interface ConsistencyResult {
  cr: number | null;
  isAcceptable: boolean | null;
  lambdaMax: number | null;
  ci: number | null;
  confidenceLabel: string;
}

export interface RepairSuggestion {
  i: number;
  j: number;
  currentValue: number;
  suggestedValue: number;
  expectedCRImprovement: number;
}

export interface RankedJudgment {
  i: number;
  j: number;
  currentValue: number;
  impliedValue: number;
  crIfChanged: number;
  crDelta: number;
}

export interface TransitivityViolation {
  i: number;
  j: number;
  k: number;
  iToJ: number;
  jToK: number;
  iToKActual: number;
  iToKImplied: number;
  violationMagnitude: number;
}

// ─── Aggregation ─────────────────────────────────────────────

export interface VoterComparisons {
  userId: string;
  comparisons: ComparisonMap;
}

export interface VotingMember {
  userId: string;
  isVoting: boolean;
}

export interface AIJResult {
  consensusComparisons: ComparisonMap;
  pairCoveragePercent: number;
  pairCoverageDiagnostic: PairCoverageDiagnostic;
}

export interface AIPResult {
  consensusWeights: number[];
  individualWeights: Record<string, number[]>;
}

export interface DisagreementItem {
  mean: number;
  sd: number;
  cv: number;
  normalizedMAD: number;
  cvReliable: boolean;
  band: DisagreementBand;
}

export interface DisagreementResult {
  items: DisagreementItem[];
}

export interface ConfidenceSignals {
  voterCount: number;
  avgCR: number;
  kendallW: number;
  maxCV: number;
  pairCoverage: number;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  signals: ConfidenceSignals;
}

// ─── Synthesis ───────────────────────────────────────────────

export interface SynthesisSummary {
  method: 'AIJ' | 'AIP';
  aggregatedWeights: number[];
  localPriorities: number[][];
  globalScores: number[];
  concordance: {
    kendallW: number;
    interpretation: ConcordanceInterpretation;
  };
  votersIncluded: string[];
  votersExcluded: Array<{ userId: string; reason: string }>;
  synthesizedAt: number;
  synthesisId: string;
  isVotingSnapshot: Record<string, boolean>;
  pairCoveragePercent: number;
  pairCoverageDiagnostic: PairCoverageDiagnostic;
  confidence: ConfidenceResult;
}

export interface SynthesisIndividual {
  individualPriorities: Record<string, number[]>;
  individualCR: Record<string, { criteria: ConsistencyResult }>;
  individualAlternativeScores: Record<string, number[]>;
  individualLocalPriorities: Record<string, number[][]>;
  individualIncompleteCriteria: Record<string, string[]>;
}

export interface SynthesisDiagnostics {
  disagreement: DisagreementResult;
  pairwiseAgreement: Record<string, number>;
}

/**
 * A published synthesis is a point-in-time snapshot. The voter set captured
 * in summary.votersIncluded and keyed into individual.individualPriorities /
 * individualAlternativeScores / individualCR / individualLocalPriorities /
 * individualIncompleteCriteria reflects collaborators as they were at
 * synthesis time. Removing a collaborator afterward does NOT retroactively
 * redact them from the stored bundle — their UID and computed priorities
 * remain visible until synthesis is re-run.
 */
export interface SynthesisBundle {
  summary: SynthesisSummary;
  individual: SynthesisIndividual;
  diagnostics: SynthesisDiagnostics;
}

// ─── Sensitivity ─────────────────────────────────────────────

export interface SweepPoint {
  t: number;
  weights: number[];
  scores: number[];
}

export interface CrossoverPoint {
  t: number;
  altA: number;
  altB: number;
  score: number;
}

// ─── Comparison Tier Config ──────────────────────────────────

export interface TierConfig {
  label: string;
  comparisonsFor: (n: number) => number;
  crConfidence: CRConfidence;
}

export interface SaatyScaleEntry {
  value: number;
  label: string;
}

export interface SynthesisConfidenceThreshold {
  maxVoters: number;
  maxAvgCR: number;
  minW: number;
  maxCV: number;
  minCoverage: number;
}

// ─── Export / Import ─────────────────────────────────────────

export interface AHPExportBundle {
  meta: ModelDoc;
  structure: StructureDoc;
  collaborators: CollaboratorDoc[];
  responses: Record<string, ResponseDoc>;
  synthesis: SynthesisBundle | null;
}

export interface AHPExportEnvelope {
  spertAhpExportVersion: 1;
  appVersion: string;
  exportedAt: number;
  sourceModelId: string;
  _exportedBy: { name: string; identifier: string } | null;
  _storageRef: string;
  meta: ModelDoc;
  structure: StructureDoc;
  collaborators: CollaboratorDoc[];
  responses: Record<string, ResponseDoc>;
  synthesis: SynthesisBundle | null;
}

// ─── Invitations (v0.11.0, suite-wide collection) ────────────

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

/**
 * Mirrors a spertsuite_invitations/{tokenId} document.
 * tokenId is the document id and is not redundantly stored on the doc itself.
 */
export interface PendingInvite {
  tokenId: string;
  appId: 'spertahp' | string;
  modelId: string;
  modelName: string;
  inviteeEmail: string;
  role: CollaboratorRole;
  isVoting: boolean;
  inviterUid: string;
  inviterName: string;
  inviterEmail: string;
  status: InvitationStatus;
  createdAt: number;
  expiresAt: number;
  lastEmailSentAt: number;
  emailSendCount: number;
  updatedAt: number;
  acceptedAt?: number;
  acceptedByUid?: string;
}

// ─── Storage Interface ───────────────────────────────────────

export interface StorageAdapter {
  createModel(modelId: string, metaDoc: ModelDoc, structureDoc: StructureDoc): Promise<void>;
  createModelFromBundle(modelId: string, bundle: AHPExportBundle): Promise<void>;
  /**
   * Overwrite an existing model's content in place. Preserves: display order,
   * identity fields (createdAt, _originRef, createdBy), and sharing config
   * (members, collaborators). For non-importer members, creates fresh empty
   * response slots — stale positional data from the old structure is not
   * preserved, as it would corrupt synthesis against new criteria/alternatives.
   * _changeLog is replaced by the bundle's provenance history.
   *
   * Caller responsibility: existingModelId must be owned by the current user.
   * FirestoreAdapter additionally enforces owner-only at the transaction layer
   * as defense-in-depth (v0.16.0).
   */
  replaceModelFromBundle(existingModelId: string, bundle: AHPExportBundle): Promise<void>;
  getModel(modelId: string): Promise<{ meta: ModelDoc; structure: StructureDoc } | null>;
  updateModel(modelId: string, partialMeta: Partial<ModelDoc>): Promise<void>;
  deleteModel(modelId: string): Promise<void>;
  listModels(): Promise<ModelIndexEntry[]>;
  getStructure(modelId: string): Promise<StructureDoc | null>;
  updateStructure(modelId: string, structureDoc: StructureDoc): Promise<void>;
  addCollaborator(modelId: string, collaboratorDoc: CollaboratorDoc): Promise<void>;
  getCollaborators(modelId: string): Promise<CollaboratorDoc[]>;
  updateCollaborator(modelId: string, userId: string, partial: Partial<CollaboratorDoc>): Promise<void>;
  /**
   * Remove a collaborator from a model. Updates both the embedded
   * collaborators array and the members map atomically. Replaces the
   * direct updateDoc bypass that previously lived in SharingSection.
   * Local-mode is a no-op stub (sharing is cloud-only).
   */
  removeCollaborator(modelId: string, userId: string): Promise<void>;
  getResponse(modelId: string, userId: string): Promise<ResponseDoc | null>;
  createResponse(modelId: string, responseDoc: ResponseDoc): Promise<void>;
  updateResponse(modelId: string, userId: string, partial: Partial<ResponseDoc>): Promise<void>;
  saveComparisons(modelId: string, userId: string, layer: string, comparisons: ComparisonMap): Promise<void>;
  getComparisons(modelId: string, userId: string, layer: string): Promise<ComparisonMap>;
  saveSynthesis(modelId: string, synthesisId: string, docs: Partial<SynthesisBundle>): Promise<void>;
  getSynthesis(modelId: string, synthesisId: string): Promise<SynthesisBundle | null>;
  // Subscription method stays sync-returning — returns the unsubscribe function.
  // Responses are delivered via the same model subscription (they're embedded in
  // the monolithic document), so subscribeResponses was removed in Phase 7.
  subscribeModel(modelId: string, callback: (data: unknown) => void): () => void;
  /** Persists user-defined display order for the saved-decisions list.
   *  `orderedIds` is the new ordering; each entry's index becomes its `order`. */
  reorderModels(orderedIds: string[]): Promise<void>;
  /**
   * List pending invitations for a model owned by the caller. Reads
   * spertsuite_invitations directly via the owner-branch security rule
   * (inviterUid == request.auth.uid). Returns only status === 'pending'.
   * Local-mode returns an empty array.
   */
  listPendingInvites(modelId: string): Promise<PendingInvite[]>;
  /**
   * Soft-revoke a pending invitation. Server marks status='revoked'
   * (no delete). Caller must be the inviter. Local-mode is a no-op.
   */
  revokeInvite(tokenId: string): Promise<void>;
  /**
   * Re-send a pending invitation email. Server enforces a hard cap of
   * 5 sends per invitation; bumping past the cap returns
   * resource-exhausted. Caller must be the inviter. Local-mode is a
   * no-op.
   */
  resendInvite(tokenId: string): Promise<void>;
  /**
   * Update the isVoting flag on a pending invitation. Caller must be
   * the inviter; only invitations with status='pending' can be updated.
   * Local-mode is a no-op. (v0.12.0)
   */
  updateInvite(tokenId: string, isVoting: boolean): Promise<void>;
  /**
   * Returns true when at least one project exists in the device's local
   * store (localStorage modelIndex), regardless of which adapter is
   * currently active. Used by useInvitationLanding to gate the
   * cloud-mode auto-flip on invite-link landing (Lesson 28): a user
   * with existing local projects must not be silently flipped to cloud
   * — that would orphan their local data path. Both adapter
   * implementations read localStorage, since "local projects" always
   * lives there.
   */
  hasLocalProjects(): Promise<boolean>;
}

// ─── useAHP State ────────────────────────────────────────────

export interface AHPState {
  modelId: string | null;
  model: ModelDoc | null;
  structure: StructureDoc | null;
  collaborators: CollaboratorDoc[];
  responses: Record<string, ResponseDoc>;
  synthesis: SynthesisBundle | null;
  loading: boolean;
  error: string | null;
}

export interface AHPActions {
  createModel: (title: string, goal: string) => Promise<string>;
  loadModel: (modelId: string) => Promise<void>;
  updateModel: (partialMeta: Partial<ModelDoc>) => Promise<void>;
  updateStructure: (newStructure: StructureDoc) => Promise<void>;
  saveComparisons: (layer: string, comparisons: ComparisonMap) => Promise<void>;
  runSynthesis: () => Promise<void>;
  closeModel: () => void;
  deleteModel: () => Promise<void>;
  storage: StorageAdapter;
}

export type UseAHPReturn = AHPState & AHPActions;

// ─── Reducer Actions ─────────────────────────────────────────

export type AHPAction =
  | { type: 'SET_MODEL'; payload: { modelId: string; meta: ModelDoc; structure: StructureDoc } }
  | { type: 'SET_STRUCTURE'; payload: StructureDoc }
  | { type: 'SET_COLLABORATORS'; payload: CollaboratorDoc[] }
  | { type: 'SET_RESPONSE'; payload: { userId: string; response: ResponseDoc } }
  | { type: 'SET_SYNTHESIS'; payload: SynthesisBundle }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'UPDATE_MODEL'; payload: Partial<ModelDoc> }
  | { type: 'RESET' };

// ─── Validation ──────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
