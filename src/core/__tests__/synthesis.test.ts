// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect } from 'vitest';
import { synthesize, sensitivitySweep, findCrossovers } from '../math/synthesis';
// synthesis tests

describe('synthesize', () => {
  it('computes correct global scores and sums to exactly 1.0', () => {
    const cw = [0.5, 0.3, 0.2];
    // localPriorities[alt][criterion]
    const lp = [
      [0.6, 0.3, 0.1], // alt0
      [0.2, 0.5, 0.3], // alt1
      [0.2, 0.2, 0.6], // alt2
    ];
    const scores = synthesize(cw, lp);
    // Manual: alt0=0.5*0.6+0.3*0.3+0.2*0.1=0.41
    //         alt1=0.5*0.2+0.3*0.5+0.2*0.3=0.31
    //         alt2=0.5*0.2+0.3*0.2+0.2*0.6=0.28
    expect(scores[0]).toBeCloseTo(0.41, 6);
    expect(scores[1]).toBeCloseTo(0.31, 6);
    expect(scores[2]).toBeCloseTo(0.28, 6);
    expect(scores.reduce((a, b) => a + b, 0)).toBe(1.0);
  });

  it('single alternative → [1.0]', () => {
    const scores = synthesize([0.5, 0.5], [[0.6, 0.4]]);
    expect(scores[0]).toBeCloseTo(1.0, 6);
    expect(scores.reduce((a, b) => a + b, 0)).toBe(1.0);
  });

  it('uniform weights → simple average of local priorities', () => {
    const cw = [0.5, 0.5];
    const lp = [
      [0.8, 0.2],
      [0.2, 0.8],
    ];
    const scores = synthesize(cw, lp);
    expect(scores[0]).toBeCloseTo(0.5, 6);
    expect(scores[1]).toBeCloseTo(0.5, 6);
  });
});

describe('sensitivitySweep', () => {
  it('2 criteria, 2 alternatives, steps=10 → 11 elements', () => {
    const cw = [0.6, 0.4];
    const lp = [
      [0.7, 0.3],
      [0.4, 0.8],
    ];
    const results = sensitivitySweep(cw, lp, 0, 10);
    expect(results.length).toBe(11);
    expect(results[0]!.t).toBe(0.0);
    expect(results[10]!.t).toBe(1.0);
  });

  it('at t=0 all weight on other criterion', () => {
    const cw = [0.6, 0.4];
    const lp = [
      [0.7, 0.3],
      [0.4, 0.8],
    ];
    const results = sensitivitySweep(cw, lp, 0, 10);
    // At t=0: w=[0, 1], scores should reflect only criterion 1
    expect(results[0]!.weights[0]).toBeCloseTo(0, 10);
    expect(results[0]!.weights[1]).toBeCloseTo(1, 10);
  });

  it('at t=1 all weight on swept criterion', () => {
    const cw = [0.6, 0.4];
    const lp = [
      [0.7, 0.3],
      [0.4, 0.8],
    ];
    const results = sensitivitySweep(cw, lp, 0, 10);
    // At t=1: w=[1, 0]
    expect(results[10]!.weights[0]).toBeCloseTo(1, 10);
  });

  it('scores sum to 1.0 at every step', () => {
    const cw = [0.5, 0.3, 0.2];
    const lp = [
      [0.6, 0.3, 0.1],
      [0.2, 0.5, 0.3],
      [0.2, 0.2, 0.6],
    ];
    const results = sensitivitySweep(cw, lp, 1, 20);
    for (const r of results) {
      expect(r.scores.reduce((a, b) => a + b, 0)).toBe(1.0);
    }
  });
});

describe('findCrossovers', () => {
  it('2 criteria, 2 alternatives → crossover at t≈0.625', () => {
    const cw = [0.6, 0.4];
    const lp = [
      [0.7, 0.3], // alt A
      [0.4, 0.8], // alt B
    ];
    const crossovers = findCrossovers(cw, lp, 0);
    expect(crossovers.length).toBe(1);
    // Algebraic: score_A(t) = t*0.7 + (1-t)*0.3 = 0.3 + 0.4t
    //            score_B(t) = t*0.4 + (1-t)*0.8 = 0.8 - 0.4t
    // Crossover: 0.3 + 0.4t = 0.8 - 0.4t → t = 0.625
    expect(crossovers[0]!.t).toBeCloseTo(0.625, 6);
  });

  it('no crossover when one alternative dominates', () => {
    const cw = [0.5, 0.5];
    const lp = [
      [0.9, 0.8], // alt A dominates in both criteria
      [0.1, 0.2], // alt B
    ];
    const crossovers = findCrossovers(cw, lp, 0);
    expect(crossovers.length).toBe(0);
  });

  it('crossover at boundary (t near 0 or 1) is excluded', () => {
    const cw = [0.5, 0.5];
    const lp = [
      [0.5, 0.5], // identical performances
      [0.5, 0.5],
    ];
    // Lines are identical (slope=0), no crossover
    const crossovers = findCrossovers(cw, lp, 0);
    expect(crossovers.length).toBe(0);
  });

  it('multiple crossovers with 3 alternatives', () => {
    const cw = [0.5, 0.5];
    const lp = [
      [0.8, 0.1], // A: strong on crit 0
      [0.1, 0.8], // B: strong on crit 1
      [0.4, 0.4], // C: balanced
    ];
    const crossovers = findCrossovers(cw, lp, 0);
    // There should be crossovers between (A,B), (A,C), (B,C)
    expect(crossovers.length).toBeGreaterThanOrEqual(2);
    // All crossovers within (0, 1)
    for (const c of crossovers) {
      expect(c.t).toBeGreaterThan(0);
      expect(c.t).toBeLessThan(1);
    }
  });
});
