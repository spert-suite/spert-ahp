// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { cloneElement, isValidElement, type ReactElement } from 'react';
import { sensitivitySweep, findCrossovers } from '../../../core/math/synthesis';
import type { StructuredItem } from '../../../types/ahp';

/**
 * The sensitivity chart's crossover markers (v0.21.1). Until then the chart's X axis had no `type`, so recharts made it
 * a CATEGORY axis of the 101 sweep points (t = 0, 0.01, … 1). A crossover falls at an exact weight that is almost never
 * one of those points, so its `ReferenceDot` could not be placed and recharts drew nothing: the markers the changelog
 * (v0.18.48, Notes) and the Quick Reference Guide describe were never shown. The axis is now a number line from 0 to 1.
 *
 * The data come from the app's own `sensitivitySweep` and `findCrossovers`, so the test sees what the Results tab sees.
 * jsdom has no layout, so `ResponsiveContainer` would measure 0 × 0 and draw nothing; it is replaced by a fixed
 * 600 × 300 chart. Everything inside it is the real component.
 */
vi.mock('recharts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('recharts')>();
  return {
    ...mod,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      isValidElement(children)
        ? cloneElement(children as ReactElement<{ width: number; height: number }>, { width: 600, height: 300 })
        : null,
  };
});

import SensitivityChart from '../SensitivityChart';

afterEach(() => cleanup());

function items(labels: string[]): StructuredItem[] {
  return labels.map((label, i) => ({ id: `alt-${i}`, label, description: '' }));
}

/** Renders the chart for factor 0 and returns the container plus the crossovers it was given. */
function renderChart(criteriaWeights: number[], localPriorities: number[][], labels: string[]) {
  const sweep = sensitivitySweep(criteriaWeights, localPriorities, 0);
  const crossovers = findCrossovers(criteriaWeights, localPriorities, 0);
  const { container } = render(
    <SensitivityChart sweep={sweep} crossovers={crossovers} alternatives={items(labels)} criterionName="Cost" />,
  );
  return { container, crossovers };
}

function markers(container: HTMLElement): SVGCircleElement[] {
  return [...container.querySelectorAll<SVGCircleElement>('.recharts-reference-dot circle')];
}

/** Whether t falls exactly on one of the sweep's 101 points, where even a category axis could place a marker. */
function onSweepGrid(t: number): boolean {
  return Array.from({ length: 101 }, (_, s) => s / 100).includes(t);
}

// Two alternatives whose lines cross at t = 1/3: A scores 0.3 + 0.6t, B scores 0.7 − 0.6t.
const OFF_GRID = { weights: [0.6, 0.4], priorities: [[0.9, 0.3], [0.1, 0.7]] };
// Two alternatives whose lines cross at t = 0.5, which IS a sweep point.
const ON_GRID = { weights: [0.6, 0.4], priorities: [[0.8, 0.2], [0.2, 0.8]] };
// Three alternatives: A = 0.1 + 0.6t, B = 0.5 − 0.3t, C = 0.4 − 0.3t. A crosses C at 1/3 and B at 4/9; B and C never meet.
const THREE = { weights: [0.5, 0.5], priorities: [[0.7, 0.1], [0.2, 0.5], [0.1, 0.4]] };

describe('the sensitivity chart marks each crossover', () => {
  it('T1: draws one marker for a crossover that falls between sweep points', () => {
    const { container, crossovers } = renderChart(OFF_GRID.weights, OFF_GRID.priorities, ['A', 'B']);
    expect(crossovers).toHaveLength(1);
    expect(crossovers[0]!.t).toBeCloseTo(1 / 3, 12);
    expect(onSweepGrid(crossovers[0]!.t)).toBe(false);
    expect(markers(container)).toHaveLength(1);
  });

  it('T2: draws that marker where the crossover is, not at the nearest sweep point', () => {
    const { container, crossovers } = renderChart(OFF_GRID.weights, OFF_GRID.priorities, ['A', 'B']);
    // The plot's horizontal extent, read from the chart itself: the X axis line runs from weight 0 to weight 1.
    const axisLine = container.querySelector('.recharts-xAxis .recharts-cartesian-axis-line');
    expect(axisLine).not.toBeNull();
    const left = Number(axisLine!.getAttribute('x'));
    const width = Number(axisLine!.getAttribute('width'));
    expect(width).toBeGreaterThan(0);

    const [dot] = markers(container);
    expect(dot).toBeDefined();
    const expected = left + width * crossovers[0]!.t;
    // 0.5 px: a marker snapped to the nearest sweep point (t = 0.33) would sit 1.67 px to the left.
    expect(Math.abs(Number(dot!.getAttribute('cx')) - expected)).toBeLessThan(0.5);
  });

  it('T3: draws one marker per crossover when there are several', () => {
    const { container, crossovers } = renderChart(THREE.weights, THREE.priorities, ['A', 'B', 'C']);
    expect(crossovers.length).toBeGreaterThanOrEqual(2);
    expect(crossovers.every((c) => !onSweepGrid(c.t))).toBe(true);
    expect(markers(container)).toHaveLength(crossovers.length);
  });

  it('T4 (control): draws one marker for a crossover that falls on a sweep point', () => {
    const { container, crossovers } = renderChart(ON_GRID.weights, ON_GRID.priorities, ['A', 'B']);
    expect(crossovers).toHaveLength(1);
    expect(crossovers[0]!.t).toBe(0.5);
    expect(markers(container)).toHaveLength(1);
  });

  it('T5: still draws one line per alternative', () => {
    const { container } = renderChart(THREE.weights, THREE.priorities, ['A', 'B', 'C']);
    expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(3);
  });
});
