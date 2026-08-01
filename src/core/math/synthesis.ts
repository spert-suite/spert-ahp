// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { EPSILON } from '../models/constants';
import type { SweepPoint, CrossoverPoint } from '../../types/ahp';

export function synthesize(criteriaWeights: number[], localPriorities: number[][]): number[] {
  const numAlts = localPriorities.length;
  const scores = new Array<number>(numAlts).fill(0);

  for (let a = 0; a < numAlts; a++) {
    for (let k = 0; k < criteriaWeights.length; k++) {
      scores[a]! += criteriaWeights[k]! * localPriorities[a]![k]!;
    }
  }

  let sum = 0;
  for (let a = 0; a < numAlts; a++) sum += scores[a]!;
  if (sum > EPSILON) {
    for (let a = 0; a < numAlts; a++) scores[a]! /= sum;
  }

  for (let a = 0; a < numAlts; a++) {
    scores[a] = Math.max(scores[a]!, EPSILON);
  }

  let partialSum = 0;
  for (let a = 0; a < numAlts - 1; a++) partialSum += scores[a]!;
  scores[numAlts - 1] = 1.0 - partialSum;

  return scores;
}

export function sensitivitySweep(
  criteriaWeights: number[],
  localPriorities: number[][],
  sweptIndex: number,
  steps = 100,
): SweepPoint[] {
  const numCriteria = criteriaWeights.length;
  const results: SweepPoint[] = [];

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;

    const weights = new Array<number>(numCriteria);
    weights[sweptIndex] = t;

    let otherSum = 0;
    for (let k = 0; k < numCriteria; k++) {
      if (k !== sweptIndex) otherSum += criteriaWeights[k]!;
    }

    const remaining = 1.0 - t;

    if (otherSum <= EPSILON) {
      for (let k = 0; k < numCriteria; k++) {
        weights[k] = k === sweptIndex ? 1.0 : 0;
      }
    } else {
      for (let k = 0; k < numCriteria; k++) {
        if (k !== sweptIndex) {
          weights[k] = (criteriaWeights[k]! / otherSum) * remaining;
        }
      }
    }

    for (let k = 0; k < numCriteria; k++) {
      weights[k] = Math.max(weights[k]!, 0);
    }

    let partialSum = 0;
    for (let k = 0; k < numCriteria - 1; k++) partialSum += weights[k]!;
    weights[numCriteria - 1] = 1.0 - partialSum;

    const scores = synthesize(weights as number[], localPriorities);
    results.push({ t, weights: [...weights] as number[], scores });
  }

  return results;
}

export function findCrossovers(
  criteriaWeights: number[],
  localPriorities: number[][],
  sweptIndex: number,
): CrossoverPoint[] {
  const numAlts = localPriorities.length;
  const numCriteria = criteriaWeights.length;
  const crossovers: CrossoverPoint[] = [];

  const cw = [...criteriaWeights];
  let cwPartial = 0;
  for (let k = 0; k < numCriteria - 1; k++) cwPartial += cw[k]!;
  cw[numCriteria - 1] = 1.0 - cwPartial;

  let otherSum = 0;
  for (let k = 0; k < numCriteria; k++) {
    if (k !== sweptIndex) otherSum += cw[k]!;
  }

  for (let a = 0; a < numAlts; a++) {
    for (let b = a + 1; b < numAlts; b++) {
      const dSwept = localPriorities[a]![sweptIndex]! - localPriorities[b]![sweptIndex]!;

      if (otherSum <= EPSILON) {
        continue;
      }

      let diffAt0 = 0;
      for (let k = 0; k < numCriteria; k++) {
        if (k === sweptIndex) continue;
        diffAt0 += (cw[k]! / otherSum) * (localPriorities[a]![k]! - localPriorities[b]![k]!);
      }

      const slope = dSwept - diffAt0;
      if (Math.abs(slope) < EPSILON) continue;

      const t = -diffAt0 / slope;

      if (t > EPSILON && t < 1.0 - EPSILON) {
        const weights = new Array<number>(numCriteria);
        weights[sweptIndex] = t;
        const remaining = 1.0 - t;
        for (let k = 0; k < numCriteria; k++) {
          if (k !== sweptIndex) {
            weights[k] = (cw[k]! / otherSum) * remaining;
          }
        }
        const scores = synthesize(weights as number[], localPriorities);
        crossovers.push({ t, altA: a, altB: b, score: scores[a]! });
      }
    }
  }

  return crossovers.sort((x, y) => x.t - y.t);
}
