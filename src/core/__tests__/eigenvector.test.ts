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

  /**
   * Replaces a test named `all entries >= EPSILON`, which asserted that the code
   * contains a floor rather than that anything depends on one. Its matrix had no
   * entry anywhere near zero, so it passed identically with the floor removed —
   * measured 2026-08-23, item 03 guard G1. It covered the guard without
   * discriminating it, which is the state all ten guards in that census were in.
   */
  it('gives an uncompared criterion a positive weight, so it still counts toward lambdaMax', () => {
    // Row 0 is all zeros: a criterion nobody compared against anything. Its weight
    // normalises to exactly 0 without the floor — and computeLambdaMax's own
    // `w[i] < EPSILON` skip then drops the row, so the criterion disappears from the
    // consistency calculation instead of contributing nothing to it. Those are
    // different results, and only the second is what the floor is for.
    const m = [
      [0, 0],
      [1, 1],
    ];
    const w = principalEigenvector(m);
    expect(w[0]!).toBeGreaterThan(0);
    expect(w[0]!).toBeLessThan(EPSILON * 10);

    // The behavioural consequence, and the assertion that discriminates: BOTH rows
    // are averaged. Row 0 contributes 0 and row 1 contributes 1, so the mean over
    // two rows is 0.5. Dropping row 0 would give 1.
    expect(computeLambdaMax(m, w)).toBeCloseTo(0.5, 9);
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

  it('excludes an unusable weight from the average instead of dividing by zero', () => {
    // A weight of exactly 0 supplied directly. principalEigenvector floors its own
    // output, so this state is only reachable through a direct call — which is why
    // no existing test reached it and the skip was non-discriminating.
    const m = [
      [1, 2, 3],
      [1 / 2, 1, 2],
      [1 / 3, 1 / 2, 1],
    ];
    const lm = computeLambdaMax(m, [0.5, 0.5, 0]);

    expect(Number.isFinite(lm)).toBe(true);
    // And the same state arrives from production, not only from a hand-made vector:
    // principalEigenvector applies its EPSILON floor at index 0..n-2 and then
    // OVERWRITES index n-1 with `1 - partialSum`, so the last component can come
    // back as exactly 0. consistencyRatio feeds that straight into computeLambdaMax.
    const degenerate = [
      [1, 1],
      [0, 0],
    ];
    const w = principalEigenvector(degenerate);
    expect(w[1]!).toBe(0);
    expect(Number.isFinite(computeLambdaMax(degenerate, w))).toBe(true);
    // Rows 0 and 1 only: (0.5 + 1 + 0) / 0.5 = 3 and (0.25 + 0.5 + 0) / 0.5 = 1.5,
    // so the mean is 2.25. Including row 2 divides by zero and gives Infinity.
    expect(lm).toBeCloseTo(2.25, 9);
  });

  it('yields lambdaMax = n when no weight is usable, rather than NaN', () => {
    // Every weight unusable, so nothing is summed and nothing is counted. n is the
    // lambdaMax of a perfectly consistent n x n matrix, so the consistency index
    // computed from it is 0 — the result degrades to "consistent" rather than to
    // NaN, which would propagate silently through CI and CR to the interface.
    const lm = computeLambdaMax(
      [
        [1, 2],
        [1 / 2, 1],
      ],
      [0, 0],
    );

    expect(Number.isNaN(lm)).toBe(false);
    expect(lm).toBe(2);
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
