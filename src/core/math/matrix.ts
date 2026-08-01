// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import {
  EPSILON,
  RAS_TOLERANCE,
  RAS_MAX_ITERATIONS,
  COMPARISON_TIERS,
  ERROR_CODES,
} from '../models/constants';
import type { ComparisonMap, ComparisonPair, CompletionTier, ConnectivityResult, LLSMResult } from '../../types/ahp';

export class ConnectivityError extends Error {
  code: string;
  missingLinks: ComparisonPair[];

  constructor(message: string, missingLinks: ComparisonPair[]) {
    super(message);
    this.name = 'ConnectivityError';
    this.code = ERROR_CODES.CONNECTIVITY_ERROR;
    this.missingLinks = missingLinks;
  }
}

export function checkConnectivity(n: number, observedComparisons: ComparisonMap): ConnectivityResult {
  if (n <= 1) {
    return { connected: true, missingLinks: [] };
  }

  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const key of Object.keys(observedComparisons)) {
    const [i, j] = key.split(',').map(Number) as [number, number];
    adj[i]!.push(j);
    adj[j]!.push(i);
  }

  const visited = new Array<boolean>(n).fill(false);
  const queue: number[] = [0];
  visited[0] = true;

  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const neighbor of adj[node]!) {
      if (!visited[neighbor]) {
        visited[neighbor] = true;
        queue.push(neighbor);
      }
    }
  }

  const allVisited = visited.every(Boolean);
  if (allVisited) {
    return { connected: true, missingLinks: [] };
  }

  const componentAssigned = new Array<boolean>(n).fill(false);
  const missingLinks: ComparisonPair[] = [];

  for (let start = 0; start < n; start++) {
    if (visited[start] || componentAssigned[start]) continue;

    const compQueue: number[] = [start];
    componentAssigned[start] = true;

    while (compQueue.length > 0) {
      const node = compQueue.shift()!;
      for (const neighbor of adj[node]!) {
        if (!visited[neighbor] && !componentAssigned[neighbor]) {
          componentAssigned[neighbor] = true;
          compQueue.push(neighbor);
        }
      }
    }

    missingLinks.push([0, start]);
  }

  return { connected: false, missingLinks };
}

export function buildMatrix(n: number, comparisons: ComparisonMap): number[][] {
  for (const key of Object.keys(comparisons)) {
    const [i, j] = key.split(',').map(Number) as [number, number];
    if (j <= i) {
      throw new Error(`Invalid comparison key '${key}': j must be greater than i`);
    }
  }

  const matrix: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(1));

  for (let i = 0; i < n; i++) {
    matrix[i]![i] = 1.0;
    for (let j = i + 1; j < n; j++) {
      const key = `${i},${j}`;
      let value: number;
      if (key in comparisons) {
        value = comparisons[key]!;
      } else {
        console.warn(`buildMatrix: missing key '${key}', defaulting to 1.0`);
        value = 1.0;
      }
      value = Math.max(1 / 9, Math.min(9, value));
      matrix[i]![j] = value;
      matrix[j]![i] = 1 / value;
    }
  }

  return matrix;
}

export function selectComparisonsForTier(n: number, tier: CompletionTier, anchorIndex = 0): ComparisonPair[] {
  if (n <= 1) return [];

  const targetCount = Math.min(COMPARISON_TIERS[tier].comparisonsFor(n), (n * (n - 1)) / 2);

  const starPairs: ComparisonPair[] = [];
  for (let k = 0; k < n; k++) {
    if (k === anchorIndex) continue;
    const i = Math.min(anchorIndex, k);
    const j = Math.max(anchorIndex, k);
    starPairs.push([i, j]);
  }

  if (tier === 1 || targetCount <= starPairs.length) {
    return starPairs.slice(0, targetCount);
  }

  if (tier === 4) {
    const allPairs: ComparisonPair[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        allPairs.push([i, j]);
      }
    }
    return allPairs;
  }

  const starSet = new Set(starPairs.map(([i, j]) => `${i},${j}`));
  const extraPairs: ComparisonPair[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!starSet.has(`${i},${j}`)) {
        extraPairs.push([i, j]);
      }
    }
  }

  const needed = targetCount - starPairs.length;
  return [...starPairs, ...extraPairs.slice(0, needed)];
}

interface Neighbor {
  node: number;
  aij: number;
}

export function llsmWeights(n: number, observedComparisons: ComparisonMap): LLSMResult {
  if (n === 1) {
    return { weights: [1.0], converged: true };
  }

  const connectivity = checkConnectivity(n, observedComparisons);
  if (!connectivity.connected) {
    throw new ConnectivityError(
      'Comparison graph is not connected. Cannot compute weights.',
      connectivity.missingLinks,
    );
  }

  const neighbors: Neighbor[][] = Array.from({ length: n }, () => []);
  for (const [key, value] of Object.entries(observedComparisons)) {
    const [i, j] = key.split(',').map(Number) as [number, number];
    neighbors[i]!.push({ node: j, aij: value });
    neighbors[j]!.push({ node: i, aij: 1 / value });
  }

  let w = new Array<number>(n).fill(1 / n);
  let converged = false;

  for (let iter = 0; iter < RAS_MAX_ITERATIONS; iter++) {
    const wNew = new Array<number>(n);

    for (let i = 0; i < n; i++) {
      const d = neighbors[i]!.length;
      if (d === 0) {
        wNew[i] = w[i]!;
        continue;
      }
      let logSum = 0;
      for (const { node: j, aij } of neighbors[i]!) {
        logSum += Math.log(aij * w[j]!);
      }
      const raw = Math.exp(logSum / d);
      wNew[i] = Math.sqrt(w[i]! * raw);
    }

    let sum = 0;
    for (let i = 0; i < n; i++) sum += wNew[i]!;
    for (let i = 0; i < n; i++) wNew[i]! /= sum;

    for (let i = 0; i < n; i++) {
      wNew[i] = Math.max(wNew[i]!, EPSILON);
    }

    let partialSum = 0;
    for (let i = 0; i < n - 1; i++) partialSum += wNew[i]!;
    wNew[n - 1] = 1.0 - partialSum;

    let l1Diff = 0;
    for (let i = 0; i < n; i++) l1Diff += Math.abs(wNew[i]! - w[i]!);

    w = wNew as number[];

    if (l1Diff < RAS_TOLERANCE) {
      converged = true;
      break;
    }
  }

  return { weights: w, converged };
}
