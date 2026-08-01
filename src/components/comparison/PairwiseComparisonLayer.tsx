// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import ComparisonInput from './ComparisonInput';
import ComparisonMatrix from './ComparisonMatrix';
import ConsistencyBadge from './ConsistencyBadge';
import ConsistencyAdvisor from './ConsistencyAdvisor';
import type { useMatrix } from '../../hooks/useMatrix';
import { selectComparisonsForTier } from '../../core/math/matrix';
import { rankJudgments, findTransitivityViolations } from '../../core/math/consistency';
import type {
  CompletionTier,
  ComparisonMap,
  ConsistencyResult,
  RankedJudgment,
  StructuredItem,
  TransitivityViolation,
} from '../../types/ahp';

const FOCUS_CLEAR_MS = 2100;

interface AdvisorData {
  ranked: RankedJudgment[];
  violations: TransitivityViolation[];
  impliedMap: Map<string, number>;
}

function computeAdvisorData(
  n: number,
  tier: CompletionTier,
  comparisons: ComparisonMap,
  cr: ConsistencyResult | null,
): AdvisorData {
  const empty: AdvisorData = { ranked: [], violations: [], impliedMap: new Map() };
  if (!cr || cr.cr === null || cr.cr <= 0.10) return empty;
  const ranked = rankJudgments(n, comparisons, tier);
  const violations = findTransitivityViolations(n, comparisons, tier);
  const impliedMap = new Map<string, number>();
  for (const r of ranked) impliedMap.set(`${r.i},${r.j}`, r.impliedValue);
  return { ranked, violations, impliedMap };
}

export interface PairwiseComparisonLayerProps {
  items: StructuredItem[];
  tier: CompletionTier;
  matrix: ReturnType<typeof useMatrix>;
  banner: ReactNode;
  isOwner: boolean;
  mode?: 'importance' | 'preference';
  /** Forwarded to ComparisonInput for voice-over when comparing alternatives
   *  in the context of a specific criterion. */
  criterionLabel?: string;
}

/**
 * Shared render for a single pairwise-comparison layer — identical structure
 * for both the decision-factors layer and each per-criterion alternatives
 * layer. Owns its focus/ghost state; consumes a pre-built useMatrix result
 * so the caller controls persistence.
 */
export default function PairwiseComparisonLayer({
  items,
  tier,
  matrix,
  banner,
  isOwner,
  mode,
  criterionLabel,
}: PairwiseComparisonLayerProps) {
  const n = items.length;
  const pairs = selectComparisonsForTier(n, tier, 0);
  const completedCount = Object.keys(matrix.comparisons).length;
  const tierComplete = completedCount >= pairs.length;

  const [focusedPair, setFocusedPair] = useState<string | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const onReconsider = useCallback((i: number, j: number) => {
    if (focusTimer.current) clearTimeout(focusTimer.current);
    const key = `${i},${j}`;
    setFocusedPair(null);
    requestAnimationFrame(() => {
      setFocusedPair(key);
      focusTimer.current = setTimeout(() => setFocusedPair(null), FOCUS_CLEAR_MS);
    });
  }, []);

  const advisorData = useMemo(
    () => computeAdvisorData(n, tier, matrix.comparisons, matrix.cr),
    [n, tier, matrix.comparisons, matrix.cr],
  );

  return (
    <div className="space-y-6">
      {tierComplete && matrix.cr && <ConsistencyBadge cr={matrix.cr} tier={tier} />}

      {tierComplete && (
        <ConsistencyAdvisor
          n={n}
          tier={tier}
          items={items}
          cr={matrix.cr}
          ranked={advisorData.ranked}
          violations={advisorData.violations}
          onReconsider={onReconsider}
          mode={mode}
        />
      )}

      {!matrix.converged && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-400">
          Weight computation did not fully converge. Results may be approximate.
        </div>
      )}

      {!matrix.connectivity.connected &&
        Object.keys(matrix.comparisons).length >= pairs.length && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
            Not enough comparisons to connect all items. Add more comparisons.
          </div>
        )}

      {isOwner && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Show comparison matrix
          </summary>
          <div className="mt-2">
            <ComparisonMatrix
              items={items}
              comparisons={matrix.comparisons}
              onCellClick={() => {}}
            />
          </div>
        </details>
      )}

      <div className="space-y-3">
        {banner}
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Pairwise comparisons ({Object.keys(matrix.comparisons).length}/{pairs.length} completed)
        </h3>
        {pairs.map(([i, j]) => {
          const key = `${i},${j}`;
          return (
            <ComparisonInput
              key={key}
              itemA={items[i]?.label ?? `Item ${i}`}
              itemB={items[j]?.label ?? `Item ${j}`}
              value={matrix.comparisons[key]}
              onChange={(val) => matrix.setComparison(i, j, val)}
              mode={mode}
              criterionLabel={criterionLabel}
              isFocused={focusedPair === key}
              impliedValue={advisorData.impliedMap.get(key)}
              registerRef={(el) => {
                if (el) rowRefs.current.set(key, el);
                else rowRefs.current.delete(key);
              }}
            />
          );
        })}
      </div>

      {matrix.weights && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Current Weights
          </h3>
          <div className="space-y-1">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 w-48 shrink-0">
                  {item.label}
                </span>
                <div className="flex-1 min-w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-blue-500 h-4 rounded-full transition-all"
                    style={{ width: `${(matrix.weights![i] ?? 0) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                  {((matrix.weights![i] ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
