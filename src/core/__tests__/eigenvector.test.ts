// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect } from 'vitest';
import { principalEigenvector, computeLambdaMax } from '../math/eigenvector';
import { EPSILON } from '../models/constants';

describe('principalEigenvector', () => {
  it('3x3 identity → [1/3, 1/3, 1/3]', () => {
    const I = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
    const w = principalEigenvector(I);
    expect(w[0]).toBeCloseTo(1 / 3, 10);
    expect(w[1]).toBeCloseTo(1 / 3, 10);
    expect(w.reduce((a, b) => a + b, 0)).toBe(1.0);
  });

  it('3x3 consistent → weights ≈ [4/7, 2/7, 1/7]', () => {
    const m = [
      [1, 2, 4],
      [1 / 2, 1, 2],
      [1 / 4, 1 / 2, 1],
    ];
    const w = principalEigenvector(m);
    expect(w[0]).toBeCloseTo(4 / 7, 4);
    expect(w[1]).toBeCloseTo(2 / 7, 4);
    expect(w[2]).toBeCloseTo(1 / 7, 4);
    expect(w.reduce((a, b) => a + b, 0)).toBe(1.0);
  });

  it('2x2 matrix [[1,5],[1/5,1]] → weights ≈ [5/6, 1/6]', () => {
    const m = [[1, 5], [1 / 5, 1]];
    const w = principalEigenvector(m);
    expect(w[0]).toBeCloseTo(5 / 6, 4);
    expect(w[1]).toBeCloseTo(1 / 6, 4);
    expect(w.reduce((a, b) => a + b, 0)).toBe(1.0);
  });

  it('n=1 → [1.0]', () => {
    expect(principalEigenvector([[1]])).toEqual([1.0]);
  });

  it('all entries >= EPSILON', () => {
    const m = [
      [1, 9, 9],
      [1 / 9, 1, 1],
      [1 / 9, 1, 1],
    ];
    const w = principalEigenvector(m);
    for (const wi of w) expect(wi).toBeGreaterThanOrEqual(EPSILON);
  });
});

describe('computeLambdaMax', () => {
  it('consistent 3x3 → lambdaMax = 3.0', () => {
    const m = [
      [1, 2, 4],
      [1 / 2, 1, 2],
      [1 / 4, 1 / 2, 1],
    ];
    const w = principalEigenvector(m);
    const lm = computeLambdaMax(m, w);
    expect(lm).toBeCloseTo(3.0, 4);
  });

  it('inconsistent 3x3 → lambdaMax > 3.0', () => {
    const m = [
      [1, 9, 1],
      [1 / 9, 1, 9],
      [1, 1 / 9, 1],
    ];
    const w = principalEigenvector(m);
    const lm = computeLambdaMax(m, w);
    expect(lm).toBeGreaterThan(3.0);
  });
});
