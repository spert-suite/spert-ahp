// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type {
  CompletionTier,
  TierConfig,
  SaatyScaleEntry,
  DisagreementThresholds,
  SynthesisConfidenceThreshold,
} from '../../types/ahp';

export const EPSILON = 1e-12;
export const RAS_TOLERANCE = 1e-8;
export const RAS_MAX_ITERATIONS = 1000;
export const EIGENVECTOR_TOLERANCE = 1e-8;
export const EIGENVECTOR_MAX_ITER = 1000;
export const CURRENT_SCHEMA_VERSION = 1;
// Stamped into every exported model as `appVersion` (exportModel, exportAllModels).
// Must equal package.json's version — `npm run shipgate` enforces it.
export const APP_VERSION = '0.18.31';
export const VOTER_SOFT_LIMIT = 30;
export const VOTER_HARD_LIMIT = 50;
export const PAIR_COVERAGE_WARNING = 0.70;

// Saaty RI table: RI_TABLE[n] for n=0..10; use RI_TABLE[10] for n>10
export const RI_TABLE: readonly number[] = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

export const COMPARISON_TIERS: Record<CompletionTier, TierConfig> = {
  1: { label: 'Quick',    comparisonsFor: (n: number) => n - 1,             crConfidence: 'none' },
  2: { label: 'Balanced', comparisonsFor: (n: number) => Math.ceil(1.5 * n), crConfidence: 'low' },
  3: { label: 'Thorough', comparisonsFor: (n: number) => Math.ceil(2.0 * n), crConfidence: 'moderate' },
  4: { label: 'Complete', comparisonsFor: (n: number) => (n * (n - 1)) / 2,  crConfidence: 'full' },
};

export const SAATY_SCALE: readonly SaatyScaleEntry[] = [
  { value: 1, label: 'Equally important' },
  { value: 2, label: 'Equally to moderately more important' },
  { value: 3, label: 'Moderately more important' },
  { value: 4, label: 'Moderately to strongly more important' },
  { value: 5, label: 'Strongly more important' },
  { value: 6, label: 'Strongly to very strongly more important' },
  { value: 7, label: 'Very strongly more important' },
  { value: 8, label: 'Very strongly to extremely more important' },
  { value: 9, label: 'Extremely more important' },
];

export const DISAGREEMENT_PRESETS: Record<string, DisagreementThresholds> = {
  strict:      { agreement: 0.10, mild: 0.25 },
  standard:    { agreement: 0.15, mild: 0.35 },
  exploratory: { agreement: 0.25, mild: 0.50 },
};

export const SYNTHESIS_CONFIDENCE: Record<string, SynthesisConfidenceThreshold> = {
  RED:   { maxVoters: 3, maxAvgCR: 0.15, minW: 0.30, maxCV: 0.50, minCoverage: 0.50 },
  AMBER: { maxVoters: 5, maxAvgCR: 0.10, minW: 0.60, maxCV: 0.35, minCoverage: 0.70 },
};

export const ERROR_CODES = {
  CONNECTIVITY_ERROR:    'CONNECTIVITY_ERROR',
  INSUFFICIENT_OVERLAP:  'INSUFFICIENT_OVERLAP',
  EMPTY_VOTER_SET:       'EMPTY_VOTER_SET',
  TIER_LOCKED:           'TIER_LOCKED',
  INVALID_MATRIX_DATA:   'INVALID_MATRIX_DATA',
  STALE_SYNTHESIS:       'STALE_SYNTHESIS',
  PRIVACY_GUARD:         'PRIVACY_GUARD',
} as const;
