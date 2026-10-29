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
export const APP_VERSION = '0.18.45';
export const VOTER_SOFT_LIMIT = 30;
export const VOTER_HARD_LIMIT = 50;
export const PAIR_COVERAGE_WARNING = 0.70;

// Saaty RI table: RI_TABLE[n] for n=0..10; use RI_TABLE[10] for n>10
export const RI_TABLE: readonly number[] = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

/**
 * Most items one comparison layer (criteria, or alternatives under a criterion)
 * can hold at the Balanced, Thorough or Complete tier. Nothing caps the item
 * count at the write site, and a stored decision with thousands of items froze
 * the Compare tab (W4). Sized by measurement (2026-10-29, the developer's
 * machine): weights + consistency + pair list at n = 300 took 0.37 s (Complete),
 * 0.65 s (Thorough), 0.81 s (Balanced); at n = 400, 1.5–2.1 s. Quick (tier 1)
 * is exempt — its n − 1 judgments are linear and reachable by hand (23,000 items
 * took 1.3 s). Above the bound the Compare tab and synthesis explain the limit
 * instead of computing; no data is changed.
 */
export const MAX_COMPARISON_ITEMS = 300;

/**
 * Most judgments in a layer for which the consistency advisor (rankJudgments +
 * findTransitivityViolations) runs. Its cost grows far faster than the maths:
 * a complete layer of 30 items (435 judgments) took 0.5 s, of 40 items (780)
 * 2.5 s, of 70 more than 15 s. Above the bound the layer says the suggestions
 * are not shown; the weights and the consistency ratio are still computed.
 */
export const MAX_ADVISOR_JUDGMENTS = 450;

/** Whether a layer of `n` items is past MAX_COMPARISON_ITEMS for `tier` (Quick is exempt). */
export function exceedsComparisonLimit(n: number, tier: CompletionTier): boolean {
  return tier !== 1 && n > MAX_COMPARISON_ITEMS;
}

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
