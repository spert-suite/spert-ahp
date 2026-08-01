// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { SAATY_SCALE } from '../../core/models/constants';
import type {
  CompletionTier,
  ConsistencyResult,
  RankedJudgment,
  StructuredItem,
  TransitivityViolation,
} from '../../types/ahp';

// Change with care — see v0.6.0 design notes. Marginal CR improvements are
// nonlinear; surfacing more rows tends to mislead users about post-fix behavior.
const ADVISOR_MAX_ROWS = 3;

type Mode = 'importance' | 'preference';

interface ConsistencyAdvisorProps {
  n: number;
  tier: CompletionTier;
  items: StructuredItem[];
  cr: ConsistencyResult | null;
  ranked: RankedJudgment[];
  violations: TransitivityViolation[];
  onReconsider: (i: number, j: number) => void;
  mode?: Mode;
}

function formatSaaty(value: number, mode: Mode): string {
  const fallback = mode === 'preference' ? 'Equally preferred' : 'Equally important';
  if (!Number.isFinite(value) || value <= 0) return fallback;

  const reciprocal = value < 1;
  const intensity = reciprocal ? 1 / value : value;
  const clamped = Math.max(1, Math.min(9, Math.round(intensity)));
  const entry = SAATY_SCALE.find((s) => s.value === clamped) ?? SAATY_SCALE[0]!;
  return mode === 'preference' ? entry.label.replace(/important/g, 'preferred') : entry.label;
}

function formatRatio(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '1x';
  if (value >= 1) return `${value.toFixed(0)}x`;
  return `1/${(1 / value).toFixed(0)}x`;
}

export default function ConsistencyAdvisor({
  n,
  tier,
  items,
  cr,
  ranked,
  violations,
  onReconsider,
  mode = 'importance',
}: ConsistencyAdvisorProps) {
  if (!cr || cr.cr === null || cr.cr <= 0.10) return null;

  const totalPairs = (n * (n - 1)) / 2;
  const rowCap = Math.max(1, Math.min(ADVISOR_MAX_ROWS, totalPairs - 1));
  const spotlightCount = Math.min(ranked.length, rowCap);
  const visibleRanked = ranked.slice(0, spotlightCount);

  const isEstimate = tier === 2 || tier === 3;
  const progressPct = Math.min(cr.cr / 0.10, 1) * 100;
  const moreX = mode === 'preference' ? 'more preferred than' : 'more important than';

  const topViolations = violations.slice(0, Math.min(2, violations.length));

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/20 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Consistency advisor — {spotlightCount} judgment{spotlightCount === 1 ? '' : 's'} may be driving your high Consistency Ratio
        </h3>
        {isEstimate && (
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            You haven&apos;t answered all comparisons, so this Consistency Ratio is an estimate. Completing more comparisons will improve accuracy.
          </p>
        )}
      </div>

      {visibleRanked.length > 0 && (
        <ol className="space-y-2">
          {visibleRanked.map((r) => {
            const labelA = items[r.i]?.label ?? `Item ${r.i}`;
            const labelB = items[r.j]?.label ?? `Item ${r.j}`;
            return (
              <li
                key={`${r.i},${r.j}`}
                className="flex items-start justify-between gap-3 rounded-md bg-white dark:bg-gray-800 p-3 text-sm"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {labelA} <span className="text-gray-400 dark:text-gray-500">vs</span> {labelB}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-gray-500 dark:text-gray-500">Your answer:</span>{' '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">{formatSaaty(r.currentValue, mode)}</span>
                    <span className="text-gray-400 dark:text-gray-600"> ({formatRatio(r.currentValue)})</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-gray-500 dark:text-gray-500">Implied by your other answers:</span>{' '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">{formatSaaty(r.impliedValue, mode)}</span>
                    <span className="text-gray-400 dark:text-gray-600"> ({formatRatio(r.impliedValue)})</span>
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    Expected Consistency Ratio drop if reconsidered: {(r.crDelta * 100).toFixed(1)}%
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onReconsider(r.i, r.j)}
                  className="shrink-0 text-xs px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  Reconsider
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {tier === 4 && topViolations.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-amber-900 dark:text-amber-200 hover:text-amber-700 dark:hover:text-amber-100">
            Show transitivity issues ({violations.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {topViolations.map((v) => {
              const labelI = items[v.i]?.label ?? `Item ${v.i}`;
              const labelJ = items[v.j]?.label ?? `Item ${v.j}`;
              const labelK = items[v.k]?.label ?? `Item ${v.k}`;
              return (
                <li
                  key={`${v.i},${v.j},${v.k}`}
                  className="rounded-md bg-white dark:bg-gray-800 p-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed"
                >
                  You said <span className="font-medium">{labelI}</span> is{' '}
                  <span className="font-medium">{formatRatio(v.iToJ)}</span> {moreX}{' '}
                  <span className="font-medium">{labelJ}</span>, and{' '}
                  <span className="font-medium">{labelJ}</span> is{' '}
                  <span className="font-medium">{formatRatio(v.jToK)}</span> {moreX}{' '}
                  <span className="font-medium">{labelK}</span>. This implies{' '}
                  <span className="font-medium">{labelI}</span> should be about{' '}
                  <span className="font-medium">{formatRatio(v.iToKImplied)}</span> {moreX}{' '}
                  <span className="font-medium">{labelK}</span>, but you said{' '}
                  <span className="font-medium">{formatRatio(v.iToKActual)}</span>.
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <div>
        <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 mb-1">
          <span>CR {(cr.cr * 100).toFixed(1)}% → target 10%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-amber-100 dark:bg-amber-950 overflow-hidden">
          <div
            className="h-full rounded-full bg-red-500 transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
