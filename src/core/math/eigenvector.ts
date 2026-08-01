// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import {
  EPSILON,
  EIGENVECTOR_TOLERANCE,
  EIGENVECTOR_MAX_ITER,
} from '../models/constants';

export function principalEigenvector(matrix: number[][]): number[] {
  const n = matrix.length;
  if (n === 1) return [1.0];

  let v = new Array<number>(n).fill(1 / n);

  for (let iter = 0; iter < EIGENVECTOR_MAX_ITER; iter++) {
    const vNew = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        vNew[i]! += matrix[i]![j]! * v[j]!;
      }
    }

    let sum = 0;
    for (let i = 0; i < n; i++) sum += vNew[i]!;
    for (let i = 0; i < n; i++) vNew[i]! /= sum;

    for (let i = 0; i < n; i++) {
      vNew[i] = Math.max(vNew[i]!, EPSILON);
    }

    let partialSum = 0;
    for (let i = 0; i < n - 1; i++) partialSum += vNew[i]!;
    vNew[n - 1] = 1.0 - partialSum;

    let l1Diff = 0;
    for (let i = 0; i < n; i++) l1Diff += Math.abs(vNew[i]! - v[i]!);

    v = vNew;

    if (l1Diff < EIGENVECTOR_TOLERANCE) break;
  }

  return v;
}

export function computeLambdaMax(matrix: number[][], w: number[]): number {
  const n = matrix.length;
  let sum = 0;
  let count = 0;

  for (let i = 0; i < n; i++) {
    if (w[i]! < EPSILON) continue;
    let aw_i = 0;
    for (let j = 0; j < n; j++) {
      aw_i += matrix[i]![j]! * w[j]!;
    }
    sum += aw_i / w[i]!;
    count++;
  }

  return count > 0 ? sum / count : n;
}
