// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import {
  aggregateIJ,
  kendallW,
  computeDisagreement,
  cosineSimilarity,
  computeSynthesisConfidenceLevel,
} from '../core/math/aggregation';
import { consistencyRatio } from '../core/math/consistency';
import { synthesize } from '../core/math/synthesis';
import { llsmWeights, buildMatrix } from '../core/math/matrix';
import { principalEigenvector } from '../core/math/eigenvector';
import { hashObject } from './hashObject';
import type {
  ComparisonMap,
  ConcordanceInterpretation,
  ConsistencyResult,
  ModelDoc,
  PairCoverageDiagnostic,
  StorageAdapter,
  StructureDoc,
  SynthesisBundle,
  VotingMember,
} from '../types/ahp';

export interface ComputeSynthesisInputs {
  modelId: string;
  structure: StructureDoc;
  model: ModelDoc;
  storage: StorageAdapter;
}

export interface ComputeSynthesisResult {
  synthesisId: string;
  bundle: SynthesisBundle;
}

/**
 * Orchestrates the synthesis math pipeline:
 *   1. Gathers every collaborator's comparisons from storage.
 *   2. Aggregates criteria and alternative judgments with AIJ.
 *   3. Computes criteria weights, per-criterion local priorities, and global
 *      scores.
 *   4. Computes per-voter priorities, alternative scores, and incomplete-
 *      criterion lists.
 *   5. Computes confidence signals: Kendall W, disagreement CVs, avg CR,
 *      pairwise cosine similarity.
 *   6. Hashes the voter set + timestamps into a stable synthesisId.
 *
 * Pure with respect to side effects beyond `storage.getCollaborators`,
 * `storage.getResponse`, and `storage.getComparisons`. Does NOT persist the
 * result — callers write via `storage.saveSynthesis` + `storage.updateModel`.
 */
export async function computeSynthesis(
  inputs: ComputeSynthesisInputs,
): Promise<ComputeSynthesisResult> {
  const { modelId, structure, model, storage } = inputs;
  const n = structure.criteria.length;
  const numAlts = structure.alternatives.length;
  const completionTier = model.completionTier;

  const collabs = await storage.getCollaborators(modelId);
  const votingMembers: VotingMember[] = collabs.map((c) => ({
    userId: c.userId,
    isVoting: c.isVoting,
  }));

  // ── Gather: per-voter comparisons across all layers ─────────────
  const allCriteriaComparisons: Array<{ userId: string; comparisons: ComparisonMap }> = [];
  const allAlternativeComparisons: Record<string, Array<{ userId: string; comparisons: ComparisonMap }>> = {};
  const individualCR: Record<string, { criteria: ConsistencyResult }> = {};
  const voterTimestamps: Record<string, number> = {};
  const isVotingSnapshot: Record<string, boolean> = {};

  for (const collab of collabs) {
    const response = await storage.getResponse(modelId, collab.userId);
    if (!response) continue;

    voterTimestamps[collab.userId] = response.lastModifiedAt;
    isVotingSnapshot[collab.userId] = collab.isVoting;

    const critComp = await storage.getComparisons(modelId, collab.userId, 'criteria');
    allCriteriaComparisons.push({ userId: collab.userId, comparisons: critComp });

    individualCR[collab.userId] = {
      criteria: consistencyRatio(n, critComp, completionTier),
    };

    for (const criterion of structure.criteria) {
      if (!allAlternativeComparisons[criterion.id]) {
        allAlternativeComparisons[criterion.id] = [];
      }
      const altComp = await storage.getComparisons(modelId, collab.userId, criterion.id);
      allAlternativeComparisons[criterion.id]!.push({
        userId: collab.userId,
        comparisons: altComp,
      });
    }
  }

  // ── Aggregate criteria ──────────────────────────────────────────
  const { consensusComparisons: critConsensus, pairCoveragePercent } = aggregateIJ(
    allCriteriaComparisons,
    null,
    votingMembers,
    n,
    completionTier,
  );

  const criteriaWeights = weightsFor(n, completionTier, critConsensus);

  // ── Aggregate alternatives per criterion ────────────────────────
  const localPriorities: number[][] = Array.from(
    { length: numAlts },
    () => new Array<number>(n).fill(0),
  );

  for (let k = 0; k < structure.criteria.length; k++) {
    const criterion = structure.criteria[k]!;
    const altComps = allAlternativeComparisons[criterion.id] ?? [];

    const { consensusComparisons: altConsensus } = aggregateIJ(
      altComps,
      null,
      votingMembers,
      numAlts,
      completionTier,
    );

    const altWeights = weightsFor(numAlts, completionTier, altConsensus);
    for (let a = 0; a < numAlts; a++) {
      localPriorities[a]![k] = altWeights[a]!;
    }
  }

  const globalScores = synthesize(criteriaWeights, localPriorities);

  // ── Per-voter priorities ────────────────────────────────────────
  // votingCollabs and criteriaVectors must share order — criteriaVectors[idx]
  // maps to votingCollabs[idx].
  const votingCollabs = allCriteriaComparisons.filter((c) =>
    votingMembers.find((m) => m.userId === c.userId && m.isVoting),
  );

  const criteriaVectors = votingCollabs.map((c) =>
    weightsFor(n, completionTier, c.comparisons),
  );

  const individualPriorities: Record<string, number[]> = {};
  votingCollabs.forEach((c, idx) => {
    individualPriorities[c.userId] = criteriaVectors[idx]!;
  });

  // Per-voter alternative rankings + global scores
  const individualAlternativeScores: Record<string, number[]> = {};
  const individualLocalPriorities: Record<string, number[][]> = {};
  const individualIncompleteCriteria: Record<string, string[]> = {};

  for (const collab of votingCollabs) {
    const voterLocalPriorities: number[][] = Array.from(
      { length: numAlts },
      () => new Array<number>(n).fill(0),
    );
    const incompleteCriteria: string[] = [];

    for (let k = 0; k < structure.criteria.length; k++) {
      const criterion = structure.criteria[k]!;
      const voterAltComps =
        allAlternativeComparisons[criterion.id]?.find((c) => c.userId === collab.userId)
          ?.comparisons ?? {};

      let voterAltWeights: number[];
      if (Object.keys(voterAltComps).length === 0) {
        voterAltWeights = new Array<number>(numAlts).fill(1 / numAlts);
        incompleteCriteria.push(criterion.id);
      } else {
        voterAltWeights = weightsFor(numAlts, completionTier, voterAltComps);
      }

      for (let a = 0; a < numAlts; a++) {
        voterLocalPriorities[a]![k] = voterAltWeights[a]!;
      }
    }

    individualLocalPriorities[collab.userId] = voterLocalPriorities;
    if (incompleteCriteria.length > 0) {
      individualIncompleteCriteria[collab.userId] = incompleteCriteria;
    }
    const voterWeights = individualPriorities[collab.userId];
    if (voterWeights) {
      individualAlternativeScores[collab.userId] = synthesize(voterWeights, voterLocalPriorities);
    }
  }

  // ── Confidence signals ──────────────────────────────────────────
  const voterWeightVectors = Object.values(individualPriorities);
  const W = voterWeightVectors.length > 1 ? kendallW(voterWeightVectors) : 1.0;

  const thresholds = model.disagreementConfig?.thresholds ?? { agreement: 0.15, mild: 0.35 };
  const disagreement = computeDisagreement(criteriaVectors, thresholds);
  const maxCV =
    disagreement.items.length > 0
      ? Math.max(...disagreement.items.map((d) => d.cv))
      : 0;

  const crValues = Object.values(individualCR)
    .map((cr) => cr.criteria?.cr)
    .filter((v): v is number => v !== null && v !== undefined);
  const avgCR = crValues.length > 0 ? crValues.reduce((a, b) => a + b, 0) / crValues.length : 0;

  const votingCount = votingMembers.filter((m) => m.isVoting).length;
  const confidence = computeSynthesisConfidenceLevel(
    votingCount,
    avgCR,
    W,
    maxCV,
    pairCoveragePercent,
  );

  const pairwiseAgreement: Record<string, number> = {};
  for (let i = 0; i < criteriaVectors.length; i++) {
    for (let j = i + 1; j < criteriaVectors.length; j++) {
      pairwiseAgreement[`${i},${j}`] = cosineSimilarity(criteriaVectors[i]!, criteriaVectors[j]!);
    }
  }

  const votingMemberIds = votingMembers
    .filter((m) => m.isVoting)
    .map((m) => m.userId)
    .sort();

  const synthesisId = await hashObject({
    votingMemberIds,
    voterTimestamps,
    isVotingSnapshot,
    structureVersion: structure.structureVersion,
    aggregationMethod: 'AIJ',
    completionTier,
  });

  const concordanceInterpretation: ConcordanceInterpretation =
    W > 0.7 ? 'strong' : W > 0.5 ? 'moderate' : 'weak';
  const pairCoverageDiagnostic: PairCoverageDiagnostic =
    pairCoveragePercent >= 1.0 ? 'full' : pairCoveragePercent >= 0.7 ? 'partial' : 'low';

  const summary: SynthesisBundle['summary'] = {
    method: 'AIJ',
    aggregatedWeights: criteriaWeights,
    localPriorities,
    globalScores,
    concordance: { kendallW: W, interpretation: concordanceInterpretation },
    votersIncluded: votingMemberIds,
    votersExcluded: votingMembers
      .filter((m) => !m.isVoting)
      .map((m) => ({ userId: m.userId, reason: 'not voting' })),
    synthesizedAt: Date.now(),
    synthesisId,
    isVotingSnapshot,
    pairCoveragePercent,
    pairCoverageDiagnostic,
    confidence,
  };

  const individual: SynthesisBundle['individual'] = {
    individualPriorities,
    individualCR,
    individualAlternativeScores,
    individualLocalPriorities,
    individualIncompleteCriteria,
  };

  const diagnostics: SynthesisBundle['diagnostics'] = {
    disagreement,
    pairwiseAgreement,
  };

  return { synthesisId, bundle: { summary, individual, diagnostics } };
}

/**
 * Derive weight vector for a matrix of size `n` from its upper-triangle
 * comparisons. Tier 4 uses the principal eigenvector; lower tiers use LLSM
 * (log-least-squares method).
 */
function weightsFor(n: number, tier: ModelDoc['completionTier'], comps: ComparisonMap): number[] {
  if (tier === 4) {
    return principalEigenvector(buildMatrix(n, comps));
  }
  return llsmWeights(n, comps).weights;
}
