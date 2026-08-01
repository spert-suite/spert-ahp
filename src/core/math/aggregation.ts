// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import {
  EPSILON,
  PAIR_COVERAGE_WARNING,
  SYNTHESIS_CONFIDENCE,
  ERROR_CODES,
} from '../models/constants';
import { selectComparisonsForTier, llsmWeights } from './matrix';
import type {
  ComparisonMap,
  CompletionTier,
  VoterComparisons,
  VotingMember,
  AIJResult,
  AIPResult,
  DisagreementThresholds,
  DisagreementResult,
  DisagreementBand,
  ConfidenceResult,
  ConfidenceLevel,
} from '../../types/ahp';

interface CodedError extends Error {
  code?: string;
}

export function aggregateIJ(
  allComparisons: VoterComparisons[],
  voterWeights: Record<string, number> | null,
  votingMembers: VotingMember[],
  n: number,
  completionTier: CompletionTier,
): AIJResult {
  const votingIds = new Set(votingMembers.filter((m) => m.isVoting).map((m) => m.userId));
  const voterData = allComparisons.filter((c) => votingIds.has(c.userId));

  if (voterData.length === 0) {
    const err: CodedError = new Error('No voting members with comparisons');
    err.code = ERROR_CODES.EMPTY_VOTER_SET;
    throw err;
  }

  const weights = normalizeWeights(voterData.map((d) => d.userId), voterWeights);

  const requiredPairs = selectComparisonsForTier(n, completionTier, 0);
  const requiredKeys = requiredPairs.map(([i, j]) => `${i},${j}`);

  const consensusComparisons: ComparisonMap = {};
  let coveredCount = 0;

  for (const key of requiredKeys) {
    const voterValues: number[] = [];
    const voterWts: number[] = [];

    for (let v = 0; v < voterData.length; v++) {
      if (key in voterData[v]!.comparisons) {
        voterValues.push(voterData[v]!.comparisons[key]!);
        voterWts.push(weights[v]!);
      }
    }

    if (voterValues.length === 0) {
      const err: CodedError = new Error(`No voters have comparison for pair ${key}`);
      err.code = ERROR_CODES.INSUFFICIENT_OVERLAP;
      throw err;
    }

    let wtSum = 0;
    for (const w of voterWts) wtSum += w;
    let logSum = 0;
    for (let k = 0; k < voterValues.length; k++) {
      logSum += (voterWts[k]! / wtSum) * Math.log(voterValues[k]!);
    }
    consensusComparisons[key] = Math.exp(logSum);
    coveredCount++;
  }

  const pairCoveragePercent = requiredKeys.length > 0 ? coveredCount / requiredKeys.length : 1.0;

  let pairCoverageDiagnostic: AIJResult['pairCoverageDiagnostic'] = 'full';
  if (pairCoveragePercent < PAIR_COVERAGE_WARNING) {
    pairCoverageDiagnostic = 'low';
  } else if (pairCoveragePercent < 1.0) {
    pairCoverageDiagnostic = 'partial';
  }

  return { consensusComparisons, pairCoveragePercent, pairCoverageDiagnostic };
}

export function aggregateIP(
  allComparisons: VoterComparisons[],
  voterWeights: Record<string, number> | null,
  votingMembers: VotingMember[],
  n: number,
): AIPResult {
  const votingIds = new Set(votingMembers.filter((m) => m.isVoting).map((m) => m.userId));
  const voterData = allComparisons.filter((c) => votingIds.has(c.userId));

  if (voterData.length === 0) {
    const err: CodedError = new Error('No voting members with comparisons');
    err.code = ERROR_CODES.EMPTY_VOTER_SET;
    throw err;
  }

  const weights = normalizeWeights(voterData.map((d) => d.userId), voterWeights);

  const individualWeights: Record<string, number[]> = {};
  const vectors: number[][] = [];

  for (const voter of voterData) {
    const { weights: w } = llsmWeights(n, voter.comparisons);
    individualWeights[voter.userId] = w;
    vectors.push(w);
  }

  const consensusWeights = new Array<number>(n).fill(0);
  for (let v = 0; v < vectors.length; v++) {
    for (let i = 0; i < n; i++) {
      consensusWeights[i]! += weights[v]! * vectors[v]![i]!;
    }
  }

  let sum = 0;
  for (let i = 0; i < n; i++) sum += consensusWeights[i]!;
  for (let i = 0; i < n; i++) consensusWeights[i]! /= sum;

  for (let i = 0; i < n; i++) {
    consensusWeights[i] = Math.max(consensusWeights[i]!, EPSILON);
  }

  let partialSum = 0;
  for (let i = 0; i < n - 1; i++) partialSum += consensusWeights[i]!;
  consensusWeights[n - 1] = 1.0 - partialSum;

  return { consensusWeights, individualWeights };
}

export function kendallW(priorityVectors: number[][]): number {
  const K = priorityVectors.length;
  if (K <= 1) return 1.0;

  const n = priorityVectors[0]!.length;
  if (n <= 1) return 1.0;

  const allRanks = priorityVectors.map((weights) => averageRanks(weights));

  const rankSums = new Array<number>(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < K; k++) {
      rankSums[j]! += allRanks[k]![j]!;
    }
  }

  const meanRankSum = (K * (n + 1)) / 2;

  let S = 0;
  for (let j = 0; j < n; j++) {
    S += (rankSums[j]! - meanRankSum) ** 2;
  }

  let tieCorrection = 0;
  for (let k = 0; k < K; k++) {
    tieCorrection += computeTieCorrection(priorityVectors[k]!);
  }

  const denom = K * K * (n * n * n - n) - K * tieCorrection;
  if (denom < EPSILON) return 1.0;

  const W = (12 * S) / denom;
  return Math.max(0, Math.min(1, W));
}

function averageRanks(weights: number[]): number[] {
  const n = weights.length;
  const indexed = weights.map((w, i) => ({ index: i, weight: w }));
  indexed.sort((a, b) => b.weight - a.weight);

  const ranks = new Array<number>(n);
  let pos = 0;
  while (pos < n) {
    let end = pos + 1;
    while (end < n && Math.abs(indexed[end]!.weight - indexed[pos]!.weight) < EPSILON) {
      end++;
    }
    const avgRank = (pos + 1 + end) / 2;
    for (let k = pos; k < end; k++) {
      ranks[indexed[k]!.index] = avgRank;
    }
    pos = end;
  }

  return ranks as number[];
}

export function computeDisagreement(
  weightVectors: number[][],
  thresholds: DisagreementThresholds,
): DisagreementResult {
  if (weightVectors.length === 0) return { items: [] };

  const K = weightVectors.length;
  const n = weightVectors[0]!.length;
  const items: DisagreementResult['items'] = [];

  for (let j = 0; j < n; j++) {
    const values: number[] = [];
    for (let k = 0; k < K; k++) {
      values.push(weightVectors[k]![j]!);
    }

    const mean = values.reduce((a, b) => a + b, 0) / K;

    let variance = 0;
    for (const v of values) variance += (v - mean) ** 2;
    variance /= K;
    const sd = Math.sqrt(variance);

    let cv = 0;
    let cvReliable = true;
    if (mean < 0.01) {
      cvReliable = false;
    }
    if (mean > EPSILON) {
      cv = sd / mean;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const median = sortedMedian(sorted);
    const absDevs = values.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = sortedMedian(absDevs);
    const normalizedMAD = median > EPSILON ? mad / median : 0;

    const metric = cvReliable ? cv : normalizedMAD;
    let band: DisagreementBand;
    if (metric <= thresholds.agreement) {
      band = 'agreement';
    } else if (metric <= thresholds.mild) {
      band = 'mild';
    } else {
      band = 'disagreement';
    }

    items.push({ mean, sd, cv, normalizedMAD, cvReliable, band });
  }

  return { items };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom < EPSILON) return 0;

  return Math.max(0, Math.min(1, dot / denom));
}

export function computeSynthesisConfidenceLevel(
  N: number,
  avgCR: number,
  W: number,
  maxCV: number,
  coverage: number,
): ConfidenceResult {
  const signals = {
    voterCount: N,
    avgCR,
    kendallW: W,
    maxCV,
    pairCoverage: coverage,
  };

  const red = SYNTHESIS_CONFIDENCE['RED']!;
  if (
    N < red.maxVoters ||
    avgCR > red.maxAvgCR ||
    W < red.minW ||
    maxCV > red.maxCV ||
    coverage < red.minCoverage
  ) {
    return { level: 'RED' as ConfidenceLevel, signals };
  }

  const amber = SYNTHESIS_CONFIDENCE['AMBER']!;
  if (
    N < amber.maxVoters ||
    avgCR > amber.maxAvgCR ||
    W < amber.minW ||
    maxCV > amber.maxCV ||
    coverage < amber.minCoverage
  ) {
    return { level: 'AMBER' as ConfidenceLevel, signals };
  }

  return { level: 'GREEN' as ConfidenceLevel, signals };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function normalizeWeights(userIds: string[], voterWeights: Record<string, number> | null): number[] {
  if (!voterWeights) {
    const w = 1 / userIds.length;
    return userIds.map(() => w);
  }

  const raw = userIds.map((id) => voterWeights[id] ?? 1);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

function computeTieCorrection(weights: number[]): number {
  const sorted = [...weights].sort((a, b) => b - a);
  let T = 0;
  let pos = 0;
  while (pos < sorted.length) {
    let end = pos + 1;
    while (end < sorted.length && Math.abs(sorted[end]! - sorted[pos]!) < EPSILON) {
      end++;
    }
    const t = end - pos;
    if (t > 1) {
      T += t * t * t - t;
    }
    pos = end;
  }
  return T;
}

function sortedMedian(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}
