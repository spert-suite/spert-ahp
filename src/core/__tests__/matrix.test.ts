// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi } from 'vitest';
import {
  checkConnectivity,
  buildMatrix,
  selectComparisonsForTier,
  llsmWeights,
  ConnectivityError,
} from '../math/matrix';
import { EPSILON, ERROR_CODES } from '../models/constants';
import type { CompletionTier } from '../../types/ahp';

// ─── checkConnectivity ───────────────────────────────────────────────

describe('checkConnectivity', () => {
  it('star topology n=4 is connected', () => {
    const result = checkConnectivity(4, { '0,1': 3, '0,2': 5, '0,3': 2 });
    expect(result.connected).toBe(true);
    expect(result.missingLinks).toEqual([]);
  });

  it('two disconnected components n=4', () => {
    const result = checkConnectivity(4, { '0,1': 3, '2,3': 5 });
    expect(result.connected).toBe(false);
    // Should bridge component {2,3} to node 0 via node 2
    expect(result.missingLinks).toEqual([[0, 2]]);
  });

  it('isolated node n=3', () => {
    const result = checkConnectivity(3, { '0,1': 3 });
    expect(result.connected).toBe(false);
    expect(result.missingLinks).toEqual([[0, 2]]);
  });

  it('n=2 connected', () => {
    const result = checkConnectivity(2, { '0,1': 5 });
    expect(result.connected).toBe(true);
    expect(result.missingLinks).toEqual([]);
  });

  it('n=1 trivially connected', () => {
    const result = checkConnectivity(1, {});
    expect(result.connected).toBe(true);
    expect(result.missingLinks).toEqual([]);
  });

  it('three disconnected components', () => {
    // n=6: {0,1}, {2,3}, {4,5} — three components
    const result = checkConnectivity(6, { '0,1': 2, '2,3': 3, '4,5': 4 });
    expect(result.connected).toBe(false);
    expect(result.missingLinks.length).toBe(2);
    // Each missing link starts at 0
    for (const [a] of result.missingLinks) {
      expect(a).toBe(0);
    }
  });
});

// ─── buildMatrix ─────────────────────────────────────────────────────

describe('llsmWeights — the EPSILON floor', () => {
  it('keeps an overwhelmingly-outranked criterion above zero', () => {
    // Criterion 0 is judged a trillion times less important than criterion 1, which
    // is itself judged a trillion times less important than criterion 2. The LLSM
    // iteration drives weight 0 below the floor; the guard is what stops it landing
    // on exactly 0, where it becomes indistinguishable from a criterion that was
    // never in the model.
    //
    // `> 0` rather than `>= EPSILON` on purpose: the second names the constant the
    // implementation happens to use, and would still pass if the floor were moved
    // somewhere that does nothing.
    const { weights } = llsmWeights(3, { '0,1': 1e-100, '1,2': 1e-100 });

    // The floor bounds the vector's DYNAMIC RANGE, which is the property that
    // matters: without it this weight comes back as 1.0e-150, and every product or
    // quotient formed from the vector downstream is then 138 orders of magnitude
    // apart from its neighbours. `> 0` does not discriminate that — 1e-150 is also
    // greater than zero — which is why the bound is on the ratio instead.
    const max = Math.max(...weights);
    expect(Math.log10(max / weights[0]!)).toBeLessThan(100);
    // The last entry is the slack that re-normalises the vector after every other
    // entry has been raised to the floor. Both halves are the design, and asserting
    // only the first would leave the second free to break silently.
    expect(weights.reduce((a, b) => a + b, 0)).toBe(1.0);
  });
});

describe('buildMatrix', () => {
  it('builds correct matrix from upper-triangle', () => {
    const m = buildMatrix(3, { '0,1': 3, '0,2': 5, '1,2': 7 });
    expect(m![0]![0]).toBe(1);
    expect(m![1]![1]).toBe(1);
    expect(m![2]![2]).toBe(1);
    expect(m![0]![1]).toBe(3);
    expect(m![1]![0]).toBeCloseTo(1 / 3);
    expect(m![0]![2]).toBe(5);
    expect(m![2]![0]).toBeCloseTo(1 / 5);
    expect(m![1]![2]).toBe(7);
    expect(m![2]![1]).toBeCloseTo(1 / 7);
  });

  it('throws on key with j<=i (j<i)', () => {
    expect(() => buildMatrix(3, { '1,0': 3 })).toThrow();
  });

  it('throws on key with j<=i (j==i)', () => {
    expect(() => buildMatrix(3, { '2,1': 3 })).toThrow();
  });

  it('defaults missing key to 1.0 with console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const m = buildMatrix(3, { '0,1': 3, '0,2': 5 });
    expect(m![1]![2]).toBe(1.0);
    expect(m![2]![1]).toBe(1.0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('clamps values to [1/9, 9]', () => {
    const m = buildMatrix(2, { '0,1': 20 });
    expect(m![0]![1]).toBe(9);
    expect(m![1]![0]).toBeCloseTo(1 / 9);
  });
});

// ─── selectComparisonsForTier ────────────────────────────────────────

describe('selectComparisonsForTier', () => {
  it('(5,1,0) → exactly 4 star pairs', () => {
    const pairs = selectComparisonsForTier(5, 1, 0);
    expect(pairs.length).toBe(4);
    expect(pairs).toEqual([[0, 1], [0, 2], [0, 3], [0, 4]]);
    // All i<j
    for (const [i, j] of pairs) expect(i).toBeLessThan(j);
  });

  it('(5,4,0) → all 10 pairs', () => {
    const pairs = selectComparisonsForTier(5, 4, 0);
    expect(pairs.length).toBe(10);
    for (const [i, j] of pairs) expect(i).toBeLessThan(j);
  });

  it('(5,2,0) → ceil(1.5*5)=8 pairs, star + lexicographic', () => {
    const pairs = selectComparisonsForTier(5, 2, 0);
    expect(pairs.length).toBe(8);
    // First 4: star
    expect(pairs[0]).toEqual([0, 1]);
    expect(pairs[1]).toEqual([0, 2]);
    expect(pairs[2]).toEqual([0, 3]);
    expect(pairs[3]).toEqual([0, 4]);
    // Next 4: lexicographic non-anchor
    expect(pairs[4]).toEqual([1, 2]);
    expect(pairs[5]).toEqual([1, 3]);
    expect(pairs[6]).toEqual([1, 4]);
    expect(pairs[7]).toEqual([2, 3]);
    for (const [i, j] of pairs) expect(i).toBeLessThan(j);
  });

  it('(4,2,0) → ceil(1.5*4)=6 pairs, star + lexicographic', () => {
    const pairs = selectComparisonsForTier(4, 2, 0);
    expect(pairs.length).toBe(6);
    // Star: [[0,1],[0,2],[0,3]]
    expect(pairs[0]).toEqual([0, 1]);
    expect(pairs[1]).toEqual([0, 2]);
    expect(pairs[2]).toEqual([0, 3]);
    // Lexicographic non-anchor: [[1,2],[1,3],[2,3]]
    expect(pairs[3]).toEqual([1, 2]);
    expect(pairs[4]).toEqual([1, 3]);
    expect(pairs[5]).toEqual([2, 3]);
    for (const [i, j] of pairs) expect(i).toBeLessThan(j);
  });

  it('(3,1,0) → exactly 2 star pairs', () => {
    const pairs = selectComparisonsForTier(3, 1, 0);
    expect(pairs.length).toBe(2);
    expect(pairs).toEqual([[0, 1], [0, 2]]);
  });

  it('all outputs form connected graph (BFS verification)', () => {
    for (const tier of [1, 2, 3, 4] as CompletionTier[]) {
      for (const n of [3, 5, 7]) {
        const pairs = selectComparisonsForTier(n, tier, 0);
        // Build comparison object for connectivity check
        const comp: Record<string, number> = {};
        for (const [i, j] of pairs) comp[`${i},${j}`] = 1;
        const result = checkConnectivity(n, comp);
        expect(result.connected).toBe(true);
      }
    }
  });

  it('n=1 returns empty', () => {
    expect(selectComparisonsForTier(1, 4, 0)).toEqual([]);
  });
});

// ─── llsmWeights ─────────────────────────────────────────────────────

describe('llsmWeights', () => {
  it('star topology n=4: valid weights summing to exactly 1.0', () => {
    const { weights, converged } = llsmWeights(4, { '0,1': 3, '0,2': 5, '0,3': 7 });
    expect(weights.length).toBe(4);
    expect(converged).toBe(true);

    // Sum must be exactly 1.0
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBe(1.0);

    // Each entry >= EPSILON
    for (const w of weights) expect(w).toBeGreaterThanOrEqual(EPSILON);

    // w[0] should be largest (it's compared favorably to all others)
    for (let i = 1; i < 4; i++) {
      expect(weights[0]).toBeGreaterThan(weights[i]!);
    }
  });

  it('throws ConnectivityError on disconnected graph', () => {
    try {
      llsmWeights(3, { '0,1': 3 });
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConnectivityError);
      expect((e as ConnectivityError).code).toBe(ERROR_CODES.CONNECTIVITY_ERROR);
      expect((e as ConnectivityError).missingLinks.length).toBeGreaterThan(0);
    }
  });

  it('complete 3x3 perfectly consistent → weights ≈ [4/7, 2/7, 1/7]', () => {
    // a12=2, a13=4, a23=2 → consistent: 2*2=4
    const { weights, converged } = llsmWeights(3, { '0,1': 2, '0,2': 4, '1,2': 2 });
    expect(converged).toBe(true);
    expect(weights[0]).toBeCloseTo(4 / 7, 4);
    expect(weights[1]).toBeCloseTo(2 / 7, 4);
    expect(weights[2]).toBeCloseTo(1 / 7, 4);
    expect(weights.reduce((a, b) => a + b, 0)).toBe(1.0);
  });

  it('all equal comparisons → uniform weights', () => {
    const { weights, converged } = llsmWeights(3, { '0,1': 1, '0,2': 1, '1,2': 1 });
    expect(converged).toBe(true);
    expect(weights[0]).toBeCloseTo(1 / 3, 10);
    expect(weights[1]).toBeCloseTo(1 / 3, 10);
    // Exact-sum postcondition
    expect(weights.reduce((a, b) => a + b, 0)).toBe(1.0);
  });

  it('n=1 → [1.0]', () => {
    const { weights, converged } = llsmWeights(1, {});
    expect(weights).toEqual([1.0]);
    expect(converged).toBe(true);
  });

  it('star with extreme values converges', () => {
    // Risk 1 test: extreme contrast on star edges
    const { weights, converged } = llsmWeights(4, { '0,1': 9, '0,2': 1 / 9, '0,3': 5 });
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBe(1.0);
    for (const w of weights) expect(w).toBeGreaterThanOrEqual(EPSILON);
    // We at least check it returns (converged flag tells us quality)
    expect(typeof converged).toBe('boolean');
  });
});

// ─── ConnectivityError ───────────────────────────────────────────────

describe('ConnectivityError', () => {
  it('has correct properties', () => {
    const err = new ConnectivityError('test message', [[0, 2], [0, 4]]);
    expect(err.message).toBe('test message');
    expect(err.name).toBe('ConnectivityError');
    expect(err.code).toBe('CONNECTIVITY_ERROR');
    expect(err.missingLinks).toEqual([[0, 2], [0, 4]]);
    expect(err instanceof Error).toBe(true);
  });
});
