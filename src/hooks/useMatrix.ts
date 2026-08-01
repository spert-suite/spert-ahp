// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useState, useCallback, useRef, useEffect } from 'react';
import { registerSignOutCleanup } from '../lib/signOutCleanupRegistry'; // Pass 4
import { llsmWeights, checkConnectivity, buildMatrix } from '../core/math/matrix';
import { consistencyRatio } from '../core/math/consistency';
import { principalEigenvector } from '../core/math/eigenvector';
import type { ComparisonMap, CompletionTier, ConnectivityResult, ConsistencyResult } from '../types/ahp';

// D2 (Pass 3): The pagehide/beforeunload flush handler eliminates data-loss risk
// on tab close. The debounce window is kept at 1500ms — reducing it would increase
// Firestore write frequency during normal deliberate evaluation without any
// correctness benefit.
const DEBOUNCE_MS = 1500;

interface UseMatrixOptions {
  n: number;
  tier: CompletionTier;
  layer: string;
  initialComparisons?: ComparisonMap;
  onSave?: (layer: string, comparisons: ComparisonMap) => void;
}

interface UseMatrixReturn {
  comparisons: ComparisonMap;
  weights: number[] | null;
  cr: ConsistencyResult | null;
  connectivity: ConnectivityResult;
  converged: boolean;
  setComparison: (i: number, j: number, value: number) => void;
  removeComparison: (i: number, j: number) => void;
}

export function useMatrix({
  n, tier, layer, initialComparisons = {}, onSave,
}: UseMatrixOptions): UseMatrixReturn {
  const [comparisons, setComparisonsState] = useState<ComparisonMap>(initialComparisons);
  const [weights, setWeights] = useState<number[] | null>(null);
  const [cr, setCR] = useState<ConsistencyResult | null>(null);
  const [connectivity, setConnectivity] = useState<ConnectivityResult>(
    { connected: true, missingLinks: [] },
  );
  const [converged, setConverged] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pass 5: sentinel for A2 resync — undefined = first mount, string = last seen sig
  const prevInitialRef = useRef<string | undefined>(undefined);

  // Stable refs for event listeners and cleanup — assigned during render.
  // This pattern (assigning to refs during render) is intentional for "stable
  // mutable container" use cases. Using useEffect instead would make these refs
  // stale in synchronous cleanup functions (unmount-commit, sign-out cancel).
  /* eslint-disable react-hooks/refs -- intentional stable-mutable-ref sync; see rationale above */
  const comparisonsRef = useRef<ComparisonMap>(comparisons);
  comparisonsRef.current = comparisons;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const layerRef = useRef(layer);
  layerRef.current = layer;
  /* eslint-enable react-hooks/refs */

  const recompute = useCallback((comp: ComparisonMap) => {
    if (n <= 1) {
      setWeights([1.0]);
      setCR({ cr: 0, isAcceptable: true, lambdaMax: 1, ci: 0, confidenceLabel: '' });
      setConnectivity({ connected: true, missingLinks: [] });
      setConverged(true);
      return;
    }

    const conn = checkConnectivity(n, comp);
    setConnectivity(conn);

    if (!conn.connected) {
      setWeights(null);
      setCR(null);
      setConverged(true);
      return;
    }

    try {
      if (tier === 4) {
        const totalPairs = (n * (n - 1)) / 2;
        const observedCount = Object.keys(comp).length;
        if (observedCount < totalPairs) {
          const result = llsmWeights(n, comp);
          setWeights(result.weights);
          setConverged(result.converged);
        } else {
          const matrix = buildMatrix(n, comp);
          setWeights(principalEigenvector(matrix));
          setConverged(true);
        }
      } else {
        const result = llsmWeights(n, comp);
        setWeights(result.weights);
        setConverged(result.converged);
      }

      const crResult = consistencyRatio(n, comp, tier);
      setCR(crResult);
    } catch {
      setWeights(null);
      setCR(null);
      setConverged(true);
    }
  }, [n, tier]);

  const setComparison = useCallback((i: number, j: number, value: number) => {
    if (j <= i) throw new Error(`setComparison: j (${j}) must be > i (${i})`);

    setComparisonsState((prev) => {
      const next = { ...prev, [`${i},${j}`]: value };
      recompute(next);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onSaveRef.current?.(layerRef.current, next);
        debounceTimer.current = null; // null after fire — required by A2 debounce guard
      }, DEBOUNCE_MS);

      return next;
    });
  }, [recompute]);

  const removeComparison = useCallback((i: number, j: number) => {
    setComparisonsState((prev) => {
      const next = { ...prev };
      delete next[`${i},${j}`];
      recompute(next);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onSaveRef.current?.(layerRef.current, next);
        debounceTimer.current = null; // null after fire — required by A2 debounce guard
      }, DEBOUNCE_MS);

      return next;
    });
  }, [recompute]);

  // D2 (Pass 3): Idempotent flush — fires onSave with current state if a timer
  // is pending, then clears the timer. No-op when nothing is pending.
  // NOTE: flush() is synchronous; the downstream onSave triggers an async Firestore
  // write. On pagehide/beforeunload, the browser may unload before that write
  // completes. This is best-effort durability — acceptable for AHP's use case.
  const flush = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
      onSaveRef.current?.(layerRef.current, comparisonsRef.current);
    }
  }, []); // empty deps — reads via refs

  // D2 (Pass 3): Flush on tab close or bfcache entry.
  // pagehide fires on both bfcache entry (event.persisted=true) and true unload.
  // Both handlers registered with distinct references for independent removeEventListener.
  useEffect(() => {
    const handlePageHide = () => flush();
    const handleBeforeUnload = () => flush();
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flush]);

  // Cancel (not flush) on unmount. Unmount may be triggered by sign-out (revoked
  // credentials) or tab switching (pagehide already handled that path).
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, []);

  // E2 (Pass 4): Explicit cancel via sign-out registry.
  // ComparisonPanel stays mounted when the user signs out on the Compare tab —
  // it renders an empty-state message rather than unmounting. The unmount-cleanup
  // above does not fire in that case. This registry callback guarantees
  // cancellation regardless of component lifecycle.
  useEffect(() => {
    const deregister = registerSignOutCleanup(() => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    });
    return deregister;
  }, []);

  // A2 (Pass 5): Re-sync comparisons from prop when initialComparisons content changes.
  // initialComparisons is a new object reference on every render (computed inline in
  // ComparisonPanel), so we fingerprint by JSON content, not reference identity.
  //
  // Guards:
  // (1) sig === prevInitialRef.current: no content change — no-op.
  // (2) isFirstRun: on first mount, skip setComparisonsState (useState already seeded
  //     it) but still call recompute (fixes the pre-v0.18.0 mount-time recompute gap).
  // (3) debounceTimer.current !== null: user has uncommitted input — defer the sync.
  //     IMPORTANT: prevInitialRef is NOT updated in this case, so the NEXT render
  //     (after debounce fires and timer clears) will retry the sync. This prevents
  //     permanent loss of a peer's snapshot value when the user is mid-input.
  useEffect(() => {
    const sig = JSON.stringify(initialComparisons);
    if (sig === prevInitialRef.current) return;
    const isFirstRun = prevInitialRef.current === undefined;
    if (!isFirstRun && debounceTimer.current !== null) return; // defer — don't update ref
    prevInitialRef.current = sig;
    if (!isFirstRun) setComparisonsState(initialComparisons);
    if (Object.keys(initialComparisons).length > 0) recompute(initialComparisons);
  }, [initialComparisons, recompute]);

  return { comparisons, weights, cr, connectivity, converged, setComparison, removeComparison };
}
