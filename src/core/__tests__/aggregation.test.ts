// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi } from 'vitest';
import {
  aggregateIJ,
  aggregateIP,
  kendallW,
  computeDisagreement,
  cosineSimilarity,
  computeSynthesisConfidenceLevel,
} from '../math/aggregation';
import { ERROR_CODES, DISAGREEMENT_PRESETS } from '../models/constants';
import { llsmWeights } from '../math/matrix';
import { principalEigenvector } from '../math/eigenvector';

// ─── aggregateIJ ─────────────────────────────────────────────────────

describe('aggregateIJ', () => {
  const members = [{ userId: 'A', isVoting: true }];

  it('single voter: consensus === input', () => {
    const comp = { '0,1': 3, '0,2': 5, '1,2': 7 };
    const result = aggregateIJ(
      [{ userId: 'A', comparisons: comp }],
      null,
      members,
      3,
      4,
    );
    expect(result.consensusComparisons['0,1']).toBeCloseTo(3, 10);
    expect(result.consensusComparisons['0,2']).toBeCloseTo(5, 10);
    expect(result.consensusComparisons['1,2']).toBeCloseTo(7, 10);
    expect(result.pairCoveragePercent).toBe(1.0);
  });

  it('two voters: geometric mean of pairs', () => {
    const allComp = [
      { userId: 'A', comparisons: { '0,1': 4, '0,2': 2, '1,2': 3 } },
      { userId: 'B', comparisons: { '0,1': 9, '0,2': 8, '1,2': 3 } },
    ];
    const twoMembers = [
      { userId: 'A', isVoting: true },
      { userId: 'B', isVoting: true },
    ];
    const result = aggregateIJ(allComp, null, twoMembers, 3, 4);
    // Geometric mean: sqrt(4*9) = 6
    expect(result.consensusComparisons['0,1']).toBeCloseTo(6, 4);
    // sqrt(2*8) = 4
    expect(result.consensusComparisons['0,2']).toBeCloseTo(4, 4);
    // sqrt(3*3) = 3
    expect(result.consensusComparisons['1,2']).toBeCloseTo(3, 4);
  });

  it('throws INSUFFICIENT_OVERLAP when no voter has a required pair', () => {
    // Tier 4 requires pair 1,2 but no voter has it
    const allComp = [{ userId: 'A', comparisons: { '0,1': 3, '0,2': 5 } }];
    expect(() => aggregateIJ(allComp, null, members, 3, 4)).toThrow();
    try {
      aggregateIJ(allComp, null, members, 3, 4);
    } catch (e) {
      expect((e as Error & { code: string }).code).toBe(ERROR_CODES.INSUFFICIENT_OVERLAP);
    }
  });

  it('isVoting filter: non-voting voter excluded', () => {
    const allComp = [
      { userId: 'A', comparisons: { '0,1': 4, '0,2': 2, '1,2': 3 } },
      { userId: 'B', comparisons: { '0,1': 9, '0,2': 8, '1,2': 1 } },
    ];
    const mixedMembers = [
      { userId: 'A', isVoting: true },
      { userId: 'B', isVoting: false },
    ];
    const result = aggregateIJ(allComp, null, mixedMembers, 3, 4);
    // Should equal A's data alone
    expect(result.consensusComparisons['0,1']).toBeCloseTo(4, 10);
  });

  it('throws EMPTY_VOTER_SET when no voting members', () => {
    const allComp = [{ userId: 'A', comparisons: { '0,1': 3 } }];
    const noVoting = [{ userId: 'A', isVoting: false }];
    expect(() => aggregateIJ(allComp, null, noVoting, 2, 4)).toThrow();
  });
});

// ─── aggregateIP ─────────────────────────────────────────────────────

describe('aggregateIP', () => {
  it('single voter: consensus === llsmWeights output', () => {
    const comp = { '0,1': 2, '0,2': 4, '1,2': 2 };
    const members = [{ userId: 'A', isVoting: true }];
    const result = aggregateIP(
      [{ userId: 'A', comparisons: comp }],
      null,
      members,
      3,
    );
    const { weights: expected } = llsmWeights(3, comp);
    for (let i = 0; i < 3; i++) {
      expect(result.consensusWeights[i]).toBeCloseTo(expected[i]!, 8);
    }
    expect(result.consensusWeights.reduce((a, b) => a + b, 0)).toBe(1.0);
  });

  it('uses llsmWeights NOT principalEigenvector for incomplete matrix', async () => {
    // Star-only comparisons (tier 1, incomplete) — principalEigenvector requires
    // a full matrix; llsmWeights handles incomplete graphs via RAS.
    const comp = { '0,1': 3, '0,2': 5 }; // missing pair 1,2
    const members = [{ userId: 'A', isVoting: true }];
    const result = aggregateIP(
      [{ userId: 'A', comparisons: comp }],
      null,
      members,
      3,
    );

    // Must match llsmWeights output exactly
    const { weights: llsmResult } = llsmWeights(3, comp);
    for (let i = 0; i < 3; i++) {
      expect(result.consensusWeights[i]).toBeCloseTo(llsmResult[i]!, 8);
    }

    // Must NOT match principalEigenvector on a matrix where missing=1.0
    // (buildMatrix defaults missing keys to 1.0, giving different weights)
    const { buildMatrix } = await import('../math/matrix');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fullMatrix = buildMatrix(3, { '0,1': 3, '0,2': 5 }); // 1,2 defaults to 1.0
    warnSpy.mockRestore();
    const eigResult = principalEigenvector(fullMatrix);

    // At least one weight must differ (proving llsmWeights was used, not eigenvector)
    const allMatch = eigResult.every((v: number, i: number) =>
      Math.abs(v - result.consensusWeights[i]!) < 1e-6
    );
    expect(allMatch).toBe(false);
  });

  it('two voters identical comparisons → same weights', () => {
    const comp = { '0,1': 3, '0,2': 5, '1,2': 7 };
    const members = [
      { userId: 'A', isVoting: true },
      { userId: 'B', isVoting: true },
    ];
    const result = aggregateIP(
      [
        { userId: 'A', comparisons: comp },
        { userId: 'B', comparisons: comp },
      ],
      null,
      members,
      3,
    );
    const { weights: expected } = llsmWeights(3, comp);
    for (let i = 0; i < 3; i++) {
      expect(result.consensusWeights[i]).toBeCloseTo(expected[i]!, 8);
    }
  });
});

// ─── kendallW ────────────────────────────────────────────────────────

describe('kendallW', () => {
  it('all identical → W = 1.0', () => {
    const W = kendallW([
      [0.5, 0.3, 0.2],
      [0.5, 0.3, 0.2],
      [0.5, 0.3, 0.2],
    ]);
    expect(W).toBeCloseTo(1.0, 4);
  });

  it('two voters reversed rankings → W near 0', () => {
    const W = kendallW([
      [0.5, 0.3, 0.2],
      [0.2, 0.3, 0.5],
    ]);
    // Reversed rankings should yield low concordance
    expect(W).toBeLessThan(0.5);
  });

  it('average ranking: [0.5, 0.3, 0.3] → ranks [1, 2.5, 2.5]', () => {
    // Testing indirectly: with two voters having tied items,
    // verify W computation uses average ranks
    const W = kendallW([
      [0.5, 0.3, 0.3],
      [0.5, 0.3, 0.3],
    ]);
    expect(W).toBeCloseTo(1.0, 4);
  });

  it('anti-test: [0.5, 0.3, 0.3] does NOT produce competition ranks [1,2,2]', () => {
    // If competition ranking were used, this would produce different W
    // We verify by checking a case where average vs competition matters
    const vecs = [
      [0.5, 0.3, 0.3],
      [0.3, 0.5, 0.3],
    ];
    const W = kendallW(vecs);
    // With average ranks: voter1=[1, 2.5, 2.5], voter2=[2.5, 1, 2.5]
    // R_j = [3.5, 3.5, 5.0], mean=4.0
    // S = (3.5-4)^2 + (3.5-4)^2 + (5-4)^2 = 0.25 + 0.25 + 1 = 1.5
    // Tie correction: each voter has one group of 2 ties, T=6 each, total=12
    // W = 12*1.5 / (4*24 - 2*12) = 18/72 = 0.25
    expect(W).toBeCloseTo(0.25, 4);
  });

  it('EPSILON tie treated as tie', () => {
    const W = kendallW([
      [0.5, 0.3, 0.3 + 1e-13],
      [0.5, 0.3, 0.3 + 1e-13],
    ]);
    expect(W).toBeCloseTo(1.0, 4);
  });

  it('single voter → 1.0', () => {
    expect(kendallW([[0.5, 0.3, 0.2]])).toBe(1.0);
  });
});

// ─── computeDisagreement ─────────────────────────────────────────────

describe('computeDisagreement', () => {
  const thresholds = DISAGREEMENT_PRESETS.standard!;

  it('all identical vectors → cv=0, band=agreement', () => {
    const result = computeDisagreement(
      [
        [0.5, 0.3, 0.2],
        [0.5, 0.3, 0.2],
        [0.5, 0.3, 0.2],
      ],
      thresholds,
    );
    for (const item of result.items) {
      expect(item.cv).toBeCloseTo(0, 10);
      expect(item.sd).toBeCloseTo(0, 10);
      expect(item.band).toBe('agreement');
    }
  });

  it('mean < 0.01 → cvReliable=false, uses nMAD fallback', () => {
    const result = computeDisagreement(
      [
        [0.005, 0.995],
        [0.008, 0.992],
        [0.003, 0.997],
      ],
      thresholds,
    );
    // First item has mean < 0.01
    expect(result.items[0]!.cvReliable).toBe(false);
  });

  it('known CV: 3 voters with specific weights', () => {
    const vecs = [
      [0.5, 0.3, 0.2],
      [0.4, 0.4, 0.2],
      [0.6, 0.2, 0.2],
    ];
    const result = computeDisagreement(vecs, thresholds);
    // Item 0: mean = 0.5, values [0.5, 0.4, 0.6]
    expect(result.items[0]!.mean).toBeCloseTo(0.5, 10);
    const sd0 = Math.sqrt(((0) ** 2 + (-0.1) ** 2 + (0.1) ** 2) / 3);
    expect(result.items[0]!.sd).toBeCloseTo(sd0, 10);
    expect(result.items[0]!.cv).toBeCloseTo(sd0 / 0.5, 10);
  });

  it('empty input → empty items', () => {
    const result = computeDisagreement([], thresholds);
    expect(result.items).toEqual([]);
  });
});

// ─── cosineSimilarity ────────────────────────────────────────────────

describe('cosineSimilarity', () => {
  it('identical vectors → 1.0', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1.0, 10);
  });

  it('orthogonal vectors → 0.0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0, 10);
  });

  it('zero vector → 0.0', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('proportional vectors → 1.0', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1.0, 10);
  });
});

// ─── computeSynthesisConfidenceLevel ─────────────────────────────────

describe('computeSynthesisConfidenceLevel', () => {
  it('N=1 → RED regardless of other signals', () => {
    const result = computeSynthesisConfidenceLevel(1, 0.01, 0.99, 0.05, 1.0);
    expect(result.level).toBe('RED');
  });

  it('N=2 → RED', () => {
    const result = computeSynthesisConfidenceLevel(2, 0.01, 0.99, 0.05, 1.0);
    expect(result.level).toBe('RED');
  });

  it('N=6, good signals → GREEN', () => {
    const result = computeSynthesisConfidenceLevel(6, 0.05, 0.7, 0.2, 0.9);
    expect(result.level).toBe('GREEN');
  });

  it('N=4, avgCR=0.12 → AMBER (worst signal)', () => {
    const result = computeSynthesisConfidenceLevel(4, 0.12, 0.5, 0.4, 0.65);
    // avgCR=0.12 > AMBER.maxAvgCR=0.10 but <= RED.maxAvgCR=0.15
    // Actually: N=4 >= RED.maxVoters=3, avgCR=0.12 <= RED.maxAvgCR=0.15
    // W=0.5 >= RED.minW=0.30, maxCV=0.4 <= RED.maxCV=0.50, coverage=0.65 >= RED.minCoverage=0.50
    // So passes RED check. Check AMBER: avgCR=0.12 > AMBER.maxAvgCR=0.10 → AMBER
    expect(result.level).toBe('AMBER');
  });

  it('returns signal details', () => {
    const result = computeSynthesisConfidenceLevel(10, 0.03, 0.9, 0.1, 0.95);
    expect(result.signals.voterCount).toBe(10);
    expect(result.signals.avgCR).toBe(0.03);
  });
});
