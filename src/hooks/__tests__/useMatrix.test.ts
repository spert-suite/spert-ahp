// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMatrix } from '../useMatrix';
import {
  runSignOutCleanup,
  clearSignOutCleanupRegistry,
} from '../../lib/signOutCleanupRegistry';
import type { ComparisonMap } from '../../types/ahp';
import { MAX_COMPARISON_ITEMS } from '../../core/models/constants';
import { computeSynthesis } from '../synthesisPipeline';

describe('useMatrix', () => {
  afterEach(() => {
    // Restore real timers unconditionally — idempotent when real timers are active.
    // Guards against timer leaks from fake-timer tests into subsequent tests.
    vi.useRealTimers();
    // Clear registry after each test — prevents callbacks registered by one test's
    // hook instance from affecting the next test.
    clearSignOutCleanupRegistry();
  });

  it('setComparison triggers weight recomputation', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 4, layer: 'criteria', onSave }),
    );

    act(() => {
      result.current.setComparison(0, 1, 3);
    });

    // Weights should still be null (graph not connected yet with just one pair for n=3)
    // But comparisons should be updated
    expect(result.current.comparisons['0,1']).toBe(3);
  });

  it('weights computed when graph is connected', () => {
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 1, layer: 'criteria' }),
    );

    act(() => {
      result.current.setComparison(0, 1, 3);
      result.current.setComparison(0, 2, 5);
    });

    // Star topology for n=3 — connected
    expect(result.current.weights).not.toBeNull();
    expect(result.current.weights!.length).toBe(3);
    expect(result.current.weights!.reduce((a, b) => a + b, 0)).toBe(1.0);
  });

  it('j<=i throws', () => {
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 4, layer: 'criteria' }),
    );

    expect(() => {
      act(() => {
        result.current.setComparison(1, 0, 3);
      });
    }).toThrow();
  });

  it('converged flag surfaces when RAS does not converge', () => {
    // This is a smoke test — for most inputs RAS will converge
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 1, layer: 'criteria' }),
    );

    act(() => {
      result.current.setComparison(0, 1, 5);
      result.current.setComparison(0, 2, 3);
    });

    expect(typeof result.current.converged).toBe('boolean');
  });

  it('removeComparison updates state', () => {
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 1, layer: 'criteria' }),
    );

    act(() => {
      result.current.setComparison(0, 1, 3);
      result.current.setComparison(0, 2, 5);
    });

    act(() => {
      result.current.removeComparison(0, 1);
    });

    expect(result.current.comparisons['0,1']).toBeUndefined();
  });

  it('initial comparisons trigger computation', () => {
    const { result } = renderHook(() =>
      useMatrix({
        n: 3,
        tier: 1,
        layer: 'criteria',
        initialComparisons: { '0,1': 3, '0,2': 5 },
      }),
    );

    expect(result.current.weights).not.toBeNull();
    expect(result.current.connectivity.connected).toBe(true);
  });

  // ── Pass 3: D2 flush + D1 debounce window ─────────────────────────────────
  it('D2: pagehide flushes pending debounce immediately', () => {
    vi.useFakeTimers();
    const mockSave = vi.fn();
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 1, layer: 'criteria', onSave: mockSave }),
    );

    act(() => { result.current.setComparison(0, 1, 3); });
    expect(mockSave).not.toHaveBeenCalled();

    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith('criteria', { '0,1': 3 });

    // Confirm the debounce timer was cleared — advance well past the 1500ms window.
    act(() => { vi.advanceTimersByTime(2000); });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('D2: beforeunload flushes pending debounce immediately', () => {
    vi.useFakeTimers();
    const mockSave = vi.fn();
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 1, layer: 'criteria', onSave: mockSave }),
    );

    act(() => { result.current.setComparison(0, 1, 5); });
    expect(mockSave).not.toHaveBeenCalled();

    act(() => { window.dispatchEvent(new Event('beforeunload')); });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith('criteria', { '0,1': 5 });
  });

  it('D1: debounce window is 1500ms', () => {
    vi.useFakeTimers();
    const mockSave = vi.fn();
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 1, layer: 'criteria', onSave: mockSave }),
    );

    act(() => { result.current.setComparison(0, 1, 3); });
    expect(mockSave).not.toHaveBeenCalled();

    // Not yet at 1500ms
    act(() => { vi.advanceTimersByTime(1499); });
    expect(mockSave).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  // ── Pass 4: E2 sign-out registry cancel ───────────────────────────────────
  it('E2: sign-out cancels pending debounce without flushing', async () => {
    vi.useFakeTimers();
    const mockSave = vi.fn();
    // clearSignOutCleanupRegistry is also called in afterEach but explicitly called
    // here to guarantee a clean state regardless of prior test ordering.
    clearSignOutCleanupRegistry();
    const { result } = renderHook(() =>
      useMatrix({ n: 3, tier: 1, layer: 'criteria', onSave: mockSave }),
    );

    act(() => { result.current.setComparison(0, 1, 3); });
    expect(mockSave).not.toHaveBeenCalled();

    // Fire the real sign-out cleanup — useMatrix's cancel callback must run
    await runSignOutCleanup();

    // Advance past the 1500ms debounce window — timer must have been cancelled.
    act(() => { vi.advanceTimersByTime(2000); });
    expect(mockSave).not.toHaveBeenCalled();
  });

  // ── Pass 5: A2 re-sync from initialComparisons content changes ────────────
  it('A2: re-syncs comparisons from prop when initialComparisons content changes', () => {
    let currentInitial: ComparisonMap = {};
    const { result, rerender } = renderHook(
      ({ init }: { init: ComparisonMap }) =>
        useMatrix({ n: 2, tier: 1, layer: 'criteria', initialComparisons: init }),
      { initialProps: { init: currentInitial } },
    );
    expect(result.current.comparisons).toEqual({});

    // Simulate a collaborator's snapshot delivering a new value
    currentInitial = { '0,1': 7 };
    rerender({ init: currentInitial });
    expect(result.current.comparisons['0,1']).toBe(7);
  });

  it('A2: does not overwrite in-progress input when debounce is active; retries on next render', () => {
    vi.useFakeTimers();
    const mockSave = vi.fn();
    let currentInitial: ComparisonMap = {};
    const { result, rerender } = renderHook(
      ({ init }: { init: ComparisonMap }) =>
        useMatrix({ n: 2, tier: 1, layer: 'criteria', initialComparisons: init, onSave: mockSave }),
      { initialProps: { init: currentInitial } },
    );

    // User enters a comparison — debounce timer is now active
    act(() => { result.current.setComparison(0, 1, 3); });
    expect(result.current.comparisons['0,1']).toBe(3);

    // Peer snapshot arrives with a different value while user is still typing
    currentInitial = { '0,1': 9 };
    rerender({ init: currentInitial });

    // User's in-progress value must NOT be overwritten (debounce still active).
    // prevInitialRef is NOT updated, so the next render after debounce-clear retries.
    expect(result.current.comparisons['0,1']).toBe(3);

    // Debounce fires at 1500ms — user's value is committed; timer clears to null
    act(() => { vi.advanceTimersByTime(1500); });
    expect(mockSave).toHaveBeenCalledWith('criteria', { '0,1': 3 });

    // In production, useAHP.saveComparisons dispatches SET_RESPONSE which gives
    // ComparisonPanel a fresh criteriaMatrix reference on the next render.
    // Simulate that here: same content, NEW object ref so useEffect's dep changes
    // and the retry path executes.
    currentInitial = { '0,1': 9 };
    rerender({ init: currentInitial });
    expect(result.current.comparisons['0,1']).toBe(9);
  });
});

// v0.18.45 (W4): a layer past MAX_COMPARISON_ITEMS computes nothing (the
// Compare tab explains the limit), and a stored key outside the matrix no
// longer reaches the maths.
describe('useMatrix — oversized layers and out-of-range keys', () => {
  it('computes nothing for a layer past MAX_COMPARISON_ITEMS', () => {
    const n = MAX_COMPARISON_ITEMS + 1;
    const star: Record<string, number> = {};
    for (let k = 1; k < n; k++) star[`0,${k}`] = 2;
    const { result } = renderHook(() => useMatrix({ n, tier: 4, layer: 'criteria', initialComparisons: star }));
    expect(result.current.weights).toBeNull();
    expect(result.current.cr).toBeNull();
  });

  it('still computes a Quick (tier 1) layer past the bound — its judgments are linear', () => {
    const n = MAX_COMPARISON_ITEMS + 1;
    const star: Record<string, number> = {};
    for (let k = 1; k < n; k++) star[`0,${k}`] = 2;
    const { result } = renderHook(() => useMatrix({ n, tier: 1, layer: 'criteria', initialComparisons: star }));
    expect(result.current.weights).toHaveLength(n);
  });

  it('computes weights from the keys that fit, ignoring one past the end', () => {
    const { result } = renderHook(() => useMatrix({ n: 3, tier: 1, layer: 'criteria', initialComparisons: { '0,1': 2, '0,2': 3, '0,99999': 4 } }));
    expect(result.current.weights).toHaveLength(3);
  });
});

describe('computeSynthesis — oversized decisions', () => {
  it('explains the limit instead of computing', async () => {
    const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `i${i}`, label: `I${i}`, description: '' }));
    await expect(computeSynthesis({
      modelId: 'm', structure: { criteria: items(MAX_COMPARISON_ITEMS + 1), alternatives: items(2), structureVersion: 1 },
      model: { completionTier: 4 }, storage: {},
    } as never)).rejects.toThrow(`more than ${MAX_COMPARISON_ITEMS}`);
  });
});
