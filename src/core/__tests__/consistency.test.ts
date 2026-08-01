// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect } from 'vitest';
import {
  consistencyRatio,
  suggestRepair,
  rankJudgments,
  findTransitivityViolations,
} from '../math/consistency';

describe('consistencyRatio', () => {
  it('perfect consistency 3x3 tier=4 → CR ≈ 0', () => {
    // a12=2, a13=4, a23=2 → consistent: 2*2=4
    const comp = { '0,1': 2, '0,2': 4, '1,2': 2 };
    const result = consistencyRatio(3, comp, 4);
    expect(result.cr).toBeCloseTo(0, 4);
    expect(result.isAcceptable).toBe(true);
    expect(result.lambdaMax).toBeCloseTo(3.0, 4);
  });

  it('highly inconsistent 3x3 tier=4 → CR > 0.10', () => {
    // a12=9, a23=9, a13=1 → highly inconsistent
    const comp = { '0,1': 9, '0,2': 1, '1,2': 9 };
    const result = consistencyRatio(3, comp, 4);
    expect(result.cr).toBeGreaterThan(0.10);
    expect(result.isAcceptable).toBe(false);
  });

  it('tier=1 → CR=null, isAcceptable=null', () => {
    const comp = { '0,1': 3, '0,2': 5 };
    const result = consistencyRatio(3, comp, 1);
    expect(result.cr).toBeNull();
    expect(result.isAcceptable).toBeNull();
    expect(result.confidenceLabel).toContain('no redundant');
  });

  it('n=2 → CR=0, always acceptable', () => {
    const result = consistencyRatio(2, { '0,1': 5 }, 4);
    expect(result.cr).toBe(0);
    expect(result.isAcceptable).toBe(true);
  });

  it('n=1 → CR=0, always acceptable', () => {
    const result = consistencyRatio(1, {}, 4);
    expect(result.cr).toBe(0);
    expect(result.isAcceptable).toBe(true);
  });

  it('tier=2 with partial comparisons computes CR and labels it as an estimate', () => {
    // 4 items, tier 2 = ceil(1.5*4)=6 pairs. Provide a star + some extras.
    const comp = { '0,1': 3, '0,2': 5, '0,3': 2, '1,2': 2, '1,3': 4, '2,3': 1 };
    const result = consistencyRatio(4, comp, 2);
    // Should produce a numeric CR (not null)
    expect(typeof result.cr).toBe('number');
    expect(typeof result.isAcceptable).toBe('boolean');
    expect(result.confidenceLabel).toContain('estimate');
    expect(result.confidenceLabel).not.toContain('Harker');
  });

  it('tier=2 with truly incomplete matrix still computes CR via diagonal adjustment', () => {
    // Only star pairs for n=4 (3 pairs, but tier 2 expects 6)
    const comp = { '0,1': 3, '0,2': 5, '0,3': 7 };
    const result = consistencyRatio(4, comp, 2);
    expect(typeof result.cr).toBe('number');
    expect(result.confidenceLabel).toContain('estimate');
    expect(result.confidenceLabel).not.toContain('Harker');
  });

  it('tier=4 label has no "Harker" string', () => {
    const comp = { '0,1': 2, '0,2': 4, '1,2': 2 };
    const result = consistencyRatio(3, comp, 4);
    expect(result.confidenceLabel).toBe('Full confidence Consistency Ratio');
  });
});

describe('suggestRepair', () => {
  it('returns repair for inconsistent matrix', () => {
    const comp = { '0,1': 9, '0,2': 1, '1,2': 9 };
    const repair = suggestRepair(3, comp, 4);
    expect(repair).not.toBeNull();
    expect(typeof repair!.i).toBe('number');
    expect(typeof repair!.j).toBe('number');
    expect(typeof repair!.suggestedValue).toBe('number');
    expect(repair!.suggestedValue).toBeGreaterThan(0);
    expect(repair!.expectedCRImprovement).toBeGreaterThan(0);
  });

  it('returns null for consistent matrix', () => {
    const comp = { '0,1': 2, '0,2': 4, '1,2': 2 };
    const repair = suggestRepair(3, comp, 4);
    expect(repair).toBeNull();
  });

  it('returns null for n=2', () => {
    const repair = suggestRepair(2, { '0,1': 5 }, 4);
    expect(repair).toBeNull();
  });

  it('returns null for tier=1 (CR not computable)', () => {
    const comp = { '0,1': 9, '0,2': 1 };
    const repair = suggestRepair(3, comp, 1);
    expect(repair).toBeNull();
  });
});

describe('rankJudgments', () => {
  it('returns entries sorted descending by crDelta', () => {
    const comp = { '0,1': 9, '0,2': 1, '1,2': 9 };
    const ranked = rankJudgments(3, comp, 4);
    expect(ranked.length).toBe(3);
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i]!.crDelta).toBeGreaterThanOrEqual(ranked[i + 1]!.crDelta);
    }
  });

  it('the top-ranked judgment yields a positive CR improvement on an inconsistent matrix', () => {
    const comp = { '0,1': 9, '0,2': 1, '1,2': 9 };
    const ranked = rankJudgments(3, comp, 4);
    expect(ranked[0]!.crDelta).toBeGreaterThan(0);
    expect(ranked[0]!.crIfChanged).toBeLessThan(
      consistencyRatio(3, comp, 4).cr!,
    );
  });

  it('tier=1 returns []', () => {
    const comp = { '0,1': 9, '0,2': 1 };
    const ranked = rankJudgments(3, comp, 1);
    expect(ranked).toEqual([]);
  });

  it('n<=2 returns []', () => {
    expect(rankJudgments(2, { '0,1': 5 }, 4)).toEqual([]);
    expect(rankJudgments(1, {}, 4)).toEqual([]);
  });

  it('only observed pairs appear in output (tier 2/3 invariant)', () => {
    // n=4 tier 2: supply only some pairs (others are Harker-filled derived slots)
    const comp = { '0,1': 3, '0,2': 5, '0,3': 2, '1,2': 2, '1,3': 4, '2,3': 1 };
    const ranked = rankJudgments(4, comp, 2);
    const observedKeys = new Set(Object.keys(comp));
    for (const r of ranked) {
      expect(observedKeys.has(`${r.i},${r.j}`)).toBe(true);
    }
    // Star-only (3 pairs, rest missing) — ranked must not surface missing pairs.
    const sparse = { '0,1': 3, '0,2': 5, '0,3': 7 };
    const rankedSparse = rankJudgments(4, sparse, 2);
    const sparseKeys = new Set(Object.keys(sparse));
    for (const r of rankedSparse) {
      expect(sparseKeys.has(`${r.i},${r.j}`)).toBe(true);
    }
  });

  it('impliedValue is positive and finite for every entry', () => {
    const comp = { '0,1': 9, '0,2': 1, '1,2': 9 };
    const ranked = rankJudgments(3, comp, 4);
    for (const r of ranked) {
      expect(r.impliedValue).toBeGreaterThan(0);
      expect(Number.isFinite(r.impliedValue)).toBe(true);
    }
  });

  it('impliedValue is always clamped to the Saaty scale [1/9, 9]', () => {
    // Severely inconsistent matrices can produce unclamped eigenvector ratios
    // well outside [1/9, 9]. The advisor must never suggest out-of-scale targets.
    const comp = { '0,1': 9, '0,2': 1, '1,2': 9 };
    const ranked = rankJudgments(3, comp, 4);
    expect(ranked.length).toBeGreaterThan(0);
    for (const r of ranked) {
      expect(r.impliedValue).toBeGreaterThanOrEqual(1 / 9 - 1e-12);
      expect(r.impliedValue).toBeLessThanOrEqual(9 + 1e-12);
    }

    // Also verify on a 4x4 that forces a large eigenvector ratio
    const comp4 = { '0,1': 9, '0,2': 9, '0,3': 1, '1,2': 9, '1,3': 9, '2,3': 9 };
    const ranked4 = rankJudgments(4, comp4, 4);
    for (const r of ranked4) {
      expect(r.impliedValue).toBeGreaterThanOrEqual(1 / 9 - 1e-12);
      expect(r.impliedValue).toBeLessThanOrEqual(9 + 1e-12);
    }
  });
});

describe('findTransitivityViolations', () => {
  it('tier<4 returns []', () => {
    const comp = { '0,1': 9, '0,2': 1, '1,2': 9 };
    expect(findTransitivityViolations(3, comp, 1)).toEqual([]);
    expect(findTransitivityViolations(3, comp, 2)).toEqual([]);
    expect(findTransitivityViolations(3, comp, 3)).toEqual([]);
  });

  it('n<3 returns []', () => {
    expect(findTransitivityViolations(2, { '0,1': 5 }, 4)).toEqual([]);
  });

  it('perfectly consistent matrix yields no violations (magnitude filter)', () => {
    // Consistent: iToJ * jToK = iToKActual exactly
    const comp = { '0,1': 2, '0,2': 4, '1,2': 2 };
    const violations = findTransitivityViolations(3, comp, 4);
    expect(violations).toEqual([]);
  });

  it('detects a single violation with expected iToKImplied', () => {
    // iToJ=3, jToK=2 → implied iToK=6, but actual iToK=1
    const comp = { '0,1': 3, '1,2': 2, '0,2': 1 };
    const violations = findTransitivityViolations(3, comp, 4);
    expect(violations.length).toBe(1);
    expect(violations[0]!.i).toBe(0);
    expect(violations[0]!.j).toBe(1);
    expect(violations[0]!.k).toBe(2);
    expect(violations[0]!.iToKImplied).toBeCloseTo(6, 6);
    expect(violations[0]!.iToKActual).toBe(1);
    expect(violations[0]!.violationMagnitude).toBeGreaterThan(0);
  });

  it('sorts violations descending by magnitude', () => {
    // n=4: construct two triples with different violation magnitudes.
    // Triple (0,1,2): iToJ=3, jToK=3 → implied 9, actual=1 (big violation)
    // Triple (0,1,3): iToJ=3, jToK=2 → implied 6, actual=5 (small violation)
    // Other triples: keep ~consistent.
    const comp = {
      '0,1': 3,
      '1,2': 3,
      '0,2': 1,   // big violation in (0,1,2)
      '1,3': 2,
      '0,3': 5,   // small violation in (0,1,3): implied 6, actual 5
      '2,3': 1,
    };
    const violations = findTransitivityViolations(4, comp, 4);
    expect(violations.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < violations.length - 1; i++) {
      expect(violations[i]!.violationMagnitude).toBeGreaterThanOrEqual(
        violations[i + 1]!.violationMagnitude,
      );
    }
  });

  it('dedupes rotations: one entry per sorted triple (i<j<k)', () => {
    const comp = { '0,1': 3, '1,2': 2, '0,2': 1 };
    const violations = findTransitivityViolations(3, comp, 4);
    // n=3 has exactly one unordered triple
    expect(violations.length).toBeLessThanOrEqual(1);
    for (const v of violations) {
      expect(v.i).toBeLessThan(v.j);
      expect(v.j).toBeLessThan(v.k);
    }
  });

  it('skips triples whose implied value is outside [1/9, 9]', () => {
    // iToJ=9, jToK=9 → implied 81, out of scale. Should be skipped.
    // Single-triple n=3 case: that's the only triple, so result should be [].
    const comp = { '0,1': 9, '1,2': 9, '0,2': 9 };
    const violations = findTransitivityViolations(3, comp, 4);
    expect(violations).toEqual([]);
  });

  it('filters out near-zero violations (|log ratio| < 0.1)', () => {
    // iToJ=2, jToK=2 → implied 4, actual 4.2 → log(4.2/4) ≈ 0.049, below threshold
    const comp = { '0,1': 2, '1,2': 2, '0,2': 4.2 };
    const violations = findTransitivityViolations(3, comp, 4);
    expect(violations).toEqual([]);
  });
});
