// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * E2E integration tests — full workflow through useAHP + LocalStorageAdapter.
 * No mocks: tests hit real localStorage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAHP } from '../hooks/useAHP';
import { useMatrix } from '../hooks/useMatrix';
import { useDisagreementLevelGuard } from '../hooks/useDisagreementLevelGuard';
import { TestProviders } from './test-utils';

const USER_ID = 'e2e-test-user';

describe('E2E: full AHP workflow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('create model → set structure → enter comparisons → verify state', async () => {
    const { result } = renderHook(() => useAHP(USER_ID), { wrapper: TestProviders });

    // 1. Create model
    let modelId: string | undefined;
    await act(async () => {
      modelId = await result.current.createModel('Best Laptop', 'Choose the best laptop for work');
    });
    expect(modelId).toBeTruthy();
    expect(result.current.model!.title).toBe('Best Laptop');
    expect(result.current.model!.status).toBe('setup');

    // 2. Set structure
    await act(async () => {
      await result.current.updateStructure({
        criteria: [
          { id: 'price', label: 'Price', description: '' },
          { id: 'performance', label: 'Performance', description: '' },
          { id: 'battery', label: 'Battery Life', description: '' },
        ],
        alternatives: [
          { id: 'macbook', label: 'MacBook Pro', description: '' },
          { id: 'thinkpad', label: 'ThinkPad X1', description: '' },
        ],
        structureVersion: 1,
      });
    });
    expect(result.current.structure!.criteria.length).toBe(3);
    expect(result.current.structure!.alternatives.length).toBe(2);

    // 3. Enter criteria comparisons
    await act(async () => {
      await result.current.saveComparisons('criteria', { '0,1': 3, '0,2': 5, '1,2': 2 });
    });

    // Verify comparisons stored
    const storedComp = await result.current.storage.getComparisons(modelId!, USER_ID, 'criteria');
    expect(storedComp['0,1']).toBe(3);
    expect(storedComp['0,2']).toBe(5);
    expect(storedComp['1,2']).toBe(2);

    // 4. Enter alternative comparisons per criterion
    await act(async () => {
      await result.current.saveComparisons('price', { '0,1': 1 / 3 });
      await result.current.saveComparisons('performance', { '0,1': 5 });
      await result.current.saveComparisons('battery', { '0,1': 3 });
    });

    const priceComp = await result.current.storage.getComparisons(modelId!, USER_ID, 'price');
    expect(priceComp['0,1']).toBeCloseTo(1 / 3, 10);
  });

  it('state restoration after simulated reload', async () => {
    // Create and populate
    const { result: r1 } = renderHook(() => useAHP(USER_ID), { wrapper: TestProviders });
    let modelId: string | undefined;

    await act(async () => {
      modelId = await r1.current.createModel('Restore Test', 'Goal');
    });

    await act(async () => {
      await r1.current.updateStructure({
        criteria: [
          { id: 'c1', label: 'Crit1', description: '' },
          { id: 'c2', label: 'Crit2', description: '' },
        ],
        alternatives: [
          { id: 'a1', label: 'Alt1', description: '' },
          { id: 'a2', label: 'Alt2', description: '' },
        ],
        structureVersion: 1,
      });
    });

    await act(async () => {
      await r1.current.saveComparisons('criteria', { '0,1': 7 });
    });

    // "Reload" — new hook instance, load model
    const { result: r2 } = renderHook(() => useAHP(USER_ID), { wrapper: TestProviders });

    await act(async () => {
      await r2.current.loadModel(modelId!);
    });

    expect(r2.current.model!.title).toBe('Restore Test');
    expect(r2.current.structure!.criteria.length).toBe(2);
    expect(r2.current.collaborators.length).toBe(1);

    // Verify comparisons persist
    const comp = await r2.current.storage.getComparisons(modelId!, USER_ID, 'criteria');
    expect(comp['0,1']).toBe(7);
  });

  it('useMatrix computes weights from initial comparisons', () => {
    const { result } = renderHook(() =>
      useMatrix({
        n: 3,
        tier: 4,
        layer: 'criteria',
        initialComparisons: { '0,1': 2, '0,2': 4, '1,2': 2 },
      }),
    );

    expect(result.current.weights).not.toBeNull();
    expect(result.current.weights!.length).toBe(3);
    expect(result.current.weights!.reduce((a: number, b: number) => a + b, 0)).toBe(1.0);
    expect(result.current.cr).not.toBeNull();
    expect(result.current.cr!.cr).toBeCloseTo(0, 4); // perfectly consistent
    expect(result.current.connectivity.connected).toBe(true);
  });

  it('useDisagreementLevelGuard returns false for single user', async () => {
    const { result } = renderHook(() => useAHP(USER_ID), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('Guard Test', 'Goal');
    });

    const { result: guardResult } = renderHook(() =>
      useDisagreementLevelGuard(result.current),
    );

    expect(guardResult.current.level3Allowed).toBe(false);
    expect(guardResult.current.voterCount).toBe(0);
  });

  it('model list persists across instances', async () => {
    const { result: r1 } = renderHook(() => useAHP(USER_ID), { wrapper: TestProviders });

    await act(async () => {
      await r1.current.createModel('Model A', 'Goal A');
    });

    const { result: r2 } = renderHook(() => useAHP(USER_ID), { wrapper: TestProviders });

    await act(async () => {
      await r2.current.createModel('Model B', 'Goal B');
    });

    const list = await r2.current.storage.listModels();
    expect(list.length).toBe(2);
    expect(list.map((m: { title: string }) => m.title)).toContain('Model A');
    expect(list.map((m: { title: string }) => m.title)).toContain('Model B');
  });
});

describe('E2E: component smoke tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('footer component exports default function', async () => {
    const mod = await import('../components/shell/AppFooter');
    expect(typeof mod.default).toBe('function');
  });

  // `CHANGELOG.md exists` used to live here as `expect(true).toBe(true)` with a
  // comment claiming the build verified it. Nothing verified it: the build never
  // reads that file, so the test asserted nothing while looking like a guard.
  // Real assertions on the changelog — that it exists, and that it agrees with
  // what the app renders — are in `changelog-surfaces.test.ts`.
});
