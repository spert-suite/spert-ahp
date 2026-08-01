// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { RI_TABLE } from '../models/constants';
import { buildMatrix } from './matrix';
import { principalEigenvector, computeLambdaMax } from './eigenvector';
import type {
  ComparisonMap,
  CompletionTier,
  ConsistencyResult,
  RepairSuggestion,
  RankedJudgment,
  TransitivityViolation,
} from '../../types/ahp';

export function consistencyRatio(n: number, comparisons: ComparisonMap, tier: CompletionTier): ConsistencyResult {
  if (n <= 2) {
    return {
      cr: 0,
      isAcceptable: true,
      lambdaMax: n,
      ci: 0,
      confidenceLabel: n === 1 ? 'Single item' : 'Pairwise — always consistent',
    };
  }

  if (tier === 1) {
    return {
      cr: null,
      isAcceptable: null,
      lambdaMax: null,
      ci: null,
      confidenceLabel: 'Quick mode — no redundant comparisons for consistency check',
    };
  }

  let matrix: number[][];
  if (tier === 4) {
    matrix = buildMatrix(n, comparisons);
  } else {
    matrix = buildHarkerMatrix(n, comparisons);
  }

  const w = principalEigenvector(matrix);
  const lambdaMax = computeLambdaMax(matrix, w);

  const ci = (lambdaMax - n) / (n - 1);
  const ri = n <= 10 ? (RI_TABLE[n] ?? RI_TABLE[10]!) : RI_TABLE[10]!;
  const cr = ri > 0 ? ci / ri : 0;

  const confidenceLabels: Record<number, string> = {
    2: 'Consistency Ratio estimate — based on partial comparisons',
    3: 'Consistency Ratio estimate — based on partial comparisons',
    4: 'Full confidence Consistency Ratio',
  };

  return {
    cr: Math.max(0, cr),
    isAcceptable: cr <= 0.10,
    lambdaMax,
    ci,
    confidenceLabel: confidenceLabels[tier] ?? '',
  };
}

/** @internal Used by consistencyRatio, suggestRepair, and rankJudgments. Not intended for external consumers. */
export function buildHarkerMatrix(n: number, comparisons: ComparisonMap): number[][] {
  const observed = new Set<string>();
  for (const key of Object.keys(comparisons)) {
    const [i, j] = key.split(',').map(Number) as [number, number];
    observed.add(`${i},${j}`);
  }

  const matrix: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  for (let i = 0; i < n; i++) {
    let missingCount = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const lo = Math.min(i, j);
      const hi = Math.max(i, j);
      const key = `${lo},${hi}`;
      if (observed.has(key)) {
        const value = comparisons[key]!;
        if (i < j) {
          matrix[i]![j] = value;
        } else {
          matrix[i]![j] = 1 / value;
        }
      } else {
        missingCount++;
      }
    }
    matrix[i]![i] = 1 + missingCount;
  }

  return matrix;
}

export function suggestRepair(n: number, comparisons: ComparisonMap, tier: CompletionTier): RepairSuggestion | null {
  if (n <= 2) return null;

  const crResult = consistencyRatio(n, comparisons, tier);
  if (crResult.cr === null || crResult.cr <= 0.10) return null;

  let matrix: number[][];
  if (tier === 4) {
    matrix = buildMatrix(n, comparisons);
  } else {
    matrix = buildHarkerMatrix(n, comparisons);
  }
  const w = principalEigenvector(matrix);

  let bestRepair: RepairSuggestion | null = null;
  let bestImprovement = -Infinity;

  for (const [key, currentValue] of Object.entries(comparisons)) {
    const [i, j] = key.split(',').map(Number) as [number, number];
    const suggestedValue = w[i]! / w[j]!;

    const modified = { ...comparisons, [key]: suggestedValue };
    const newCR = consistencyRatio(n, modified, tier);

    if (newCR.cr === null) continue;
    const improvement = crResult.cr - newCR.cr;

    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      bestRepair = {
        i,
        j,
        currentValue,
        suggestedValue,
        expectedCRImprovement: improvement,
      };
    }
  }

  return bestRepair;
}

/**
 * Ranks every observed judgment by how much replacing it with the eigenvector-implied
 * value would lower the current CR. Used by the Consistency Advisor to surface the
 * judgments most likely to be driving a high CR.
 *
 * Only observed judgments are considered — for tier 2/3, Harker-filled slots are not
 * user opinions and must not be ranked or surfaced.
 *
 * impliedValue is clamped to the Saaty scale [1/9, 9] because the user cannot enter
 * anything outside that range — buildMatrix also clamps internally, so crIfChanged
 * and crDelta reflect the improvement achievable at the Saaty bound. Surfacing the
 * raw (unclamped) w[i]/w[j] ratio would suggest an unreachable target and the ghost
 * marker would render off the slider track.
 */
export function rankJudgments(
  n: number,
  comparisons: ComparisonMap,
  tier: CompletionTier,
): RankedJudgment[] {
  if (n <= 2) return [];
  if (tier === 1) return [];

  const crResult = consistencyRatio(n, comparisons, tier);
  if (crResult.cr === null) return [];

  const matrix = tier === 4 ? buildMatrix(n, comparisons) : buildHarkerMatrix(n, comparisons);
  const w = principalEigenvector(matrix);

  const ranked: RankedJudgment[] = [];
  const SAATY_MIN = 1 / 9;
  const SAATY_MAX = 9;

  for (const [key, currentValue] of Object.entries(comparisons)) {
    const [i, j] = key.split(',').map(Number) as [number, number];
    const rawImplied = w[i]! / w[j]!;
    const impliedValue = Math.max(SAATY_MIN, Math.min(SAATY_MAX, rawImplied));

    const modified = { ...comparisons, [key]: impliedValue };
    const newCR = consistencyRatio(n, modified, tier);
    if (newCR.cr === null) continue;

    ranked.push({
      i,
      j,
      currentValue,
      impliedValue,
      crIfChanged: newCR.cr,
      crDelta: crResult.cr - newCR.cr,
    });
  }

  ranked.sort((a, b) => b.crDelta - a.crDelta);
  return ranked;
}

/**
 * For every unordered triple (i < j < k), computes the transitivity-implied i:k
 * ratio from iToJ × jToK and compares it to the stored iToK judgment. Returns
 * violations sorted descending by magnitude.
 *
 * Meaningful only for tier 4 (Complete). For tier < 4, some triples have missing
 * sides that Harker fills with derived values — surfacing those as "you said X"
 * would falsely attribute opinions to the user. The tier gate lives inside the
 * function so callers can invoke it unconditionally.
 *
 * Violations with magnitude < 0.1 (roughly a 10% ratio deviation on log scale)
 * are filtered out as below the threshold of perceptible inconsistency.
 * Violations whose implied value falls outside the Saaty bound [1/9, 9] are also
 * skipped — we cannot render honest prose for an out-of-scale implied value.
 */
export function findTransitivityViolations(
  n: number,
  comparisons: ComparisonMap,
  tier: CompletionTier,
): TransitivityViolation[] {
  if (tier !== 4) return [];
  if (n < 3) return [];

  const violations: TransitivityViolation[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const iToJ = comparisons[`${i},${j}`];
        const jToK = comparisons[`${j},${k}`];
        const iToKActual = comparisons[`${i},${k}`];
        if (iToJ === undefined || jToK === undefined || iToKActual === undefined) continue;

        const iToKImplied = iToJ * jToK;
        if (iToKImplied < 1 / 9 || iToKImplied > 9) continue;

        const violationMagnitude = Math.abs(Math.log(iToKActual / iToKImplied));
        if (violationMagnitude < 0.1) continue;

        violations.push({
          i,
          j,
          k,
          iToJ,
          jToK,
          iToKActual,
          iToKImplied,
          violationMagnitude,
        });
      }
    }
  }

  violations.sort((a, b) => b.violationMagnitude - a.violationMagnitude);
  return violations;
}
